-- ============================================================================
-- Migration: 24_trust_safety_verification_system.sql (Milestone #9)
-- Description: Trust, Safety & Verification Production Architecture
-- 1. Identity Verification Schema (users columns & verification_submissions)
-- 2. Strict Storage Isolation for Sensitive Verification Media (verification-documents bucket)
-- 3. Emergency Contacts & Safety Circle (emergency_contacts table & RLS)
-- 4. Comprehensive Reporting & Moderation Queue (reports schema hardening & admin RLS)
-- 5. Safe Account Deletion & Cleanup cascades
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. IDENTITY VERIFICATION SCHEMA (public.users & public.verification_submissions)
-- ----------------------------------------------------------------------------

-- Temporarily drop dependent RLS policies on public.users to allow column type transition
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Add or normalize verification columns on public.users
DO $$
BEGIN
    -- Ensure verification_status is TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN verification_status TYPE TEXT USING verification_status::TEXT;
        ALTER TABLE public.users ALTER COLUMN verification_status SET DEFAULT 'unverified';
    ELSE
        ALTER TABLE public.users ADD COLUMN verification_status TEXT DEFAULT 'unverified';
    END IF;

    -- Add verified_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;

    -- Add verification_rejection_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'verification_rejection_reason'
    ) THEN
        ALTER TABLE public.users ADD COLUMN verification_rejection_reason TEXT;
    END IF;
END $$;

-- Enforce verification_status check constraint
-- Normalize existing rows to match allowed set
UPDATE public.users 
SET verification_status = CASE 
    WHEN verification_status = 'failed' THEN 'rejected'
    WHEN verification_status IN ('pending', 'verified', 'rejected') THEN verification_status
    ELSE 'unverified'
END;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_verification_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_verification_status_check 
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Re-create hardened anti-spoofing policies on public.users
CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id
    AND (verification_status IS NULL OR verification_status IN ('unverified', 'pending'))
    AND verified_at IS NULL
);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND (
        -- Client can ONLY set status to 'pending', 'unverified' or keep unchanged
        verification_status IN ('pending', 'unverified')
        OR verification_status = (SELECT u.verification_status FROM public.users u WHERE u.id = auth.uid())
    )
    AND (
        -- Normal client CANNOT alter or forge verified_at
        verified_at IS NOT DISTINCT FROM (SELECT u.verified_at FROM public.users u WHERE u.id = auth.uid())
    )
);

-- Create verification_submissions table
CREATE TABLE IF NOT EXISTS public.verification_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'driving_license', 'national_id')),
    document_front_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_verification_submissions_user_id ON public.verification_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_submissions_status ON public.verification_submissions(status);

ALTER TABLE public.verification_submissions ENABLE ROW LEVEL SECURITY;

-- Verification submissions RLS:
-- Authenticated users can view their own submissions
DROP POLICY IF EXISTS "Users can view own verification submissions" ON public.verification_submissions;
CREATE POLICY "Users can view own verification submissions"
ON public.verification_submissions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can insert their own verification submissions
DROP POLICY IF EXISTS "Users can insert own verification submissions" ON public.verification_submissions;
CREATE POLICY "Users can insert own verification submissions"
ON public.verification_submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. STRICT STORAGE ISOLATION FOR SENSITIVE VERIFICATION MEDIA
-- ----------------------------------------------------------------------------

-- Dedicated private bucket: verification-documents (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'verification-documents',
    'verification-documents',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage RLS:
-- Authenticated users can INSERT strictly into their own folder: (storage.foldername(name))[1] = auth.uid()::text
DROP POLICY IF EXISTS "Authenticated Upload Verification Documents" ON storage.objects;
CREATE POLICY "Authenticated Upload Verification Documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: SELECT, UPDATE, DELETE strictly restricted to service_role (admin moderation).
-- By granting NO SELECT, UPDATE, or DELETE policy on 'verification-documents' to authenticated or anon,
-- regular users cannot view, scrape, or tamper with any sensitive files in this bucket.

-- ----------------------------------------------------------------------------
-- 3. EMERGENCY CONTACTS & SAFETY CIRCLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    relationship TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Strictly private to the owning user (auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can view own emergency contacts"
ON public.emergency_contacts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert own emergency contacts"
ON public.emergency_contacts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can update own emergency contacts"
ON public.emergency_contacts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete own emergency contacts"
ON public.emergency_contacts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. COMPREHENSIVE REPORTING & MODERATION QUEUE
-- ----------------------------------------------------------------------------

-- Harden public.reports schema
DO $$
BEGIN
    -- Ensure target_id is TEXT
    ALTER TABLE public.reports ALTER COLUMN target_id TYPE TEXT USING target_id::TEXT;
    ALTER TABLE public.reports ALTER COLUMN target_id SET NOT NULL;

    -- Ensure target_type is TEXT
    ALTER TABLE public.reports ALTER COLUMN target_type TYPE TEXT USING target_type::TEXT;
    ALTER TABLE public.reports ALTER COLUMN target_type SET NOT NULL;

    -- Ensure reason is TEXT
    ALTER TABLE public.reports ALTER COLUMN reason TYPE TEXT USING reason::TEXT;
    ALTER TABLE public.reports ALTER COLUMN reason SET NOT NULL;

    -- Ensure status is TEXT
    ALTER TABLE public.reports ALTER COLUMN status TYPE TEXT USING status::TEXT;
    ALTER TABLE public.reports ALTER COLUMN status SET DEFAULT 'pending';
    ALTER TABLE public.reports ALTER COLUMN status SET NOT NULL;
END $$;

-- Normalize existing reports rows
UPDATE public.reports SET target_type = 'user' WHERE target_type NOT IN ('user', 'post', 'comment', 'story', 'hangout', 'message');
UPDATE public.reports SET reason = 'other' WHERE reason NOT IN ('harassment', 'spam', 'inappropriate_content', 'safety_concern', 'scam', 'other');
UPDATE public.reports SET status = 'pending' WHERE status NOT IN ('pending', 'reviewed', 'resolved', 'dismissed');

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_target_type_check 
    CHECK (target_type IN ('user', 'post', 'comment', 'story', 'hangout', 'message'));

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_reason_check 
    CHECK (reason IN ('harassment', 'spam', 'inappropriate_content', 'safety_concern', 'scam', 'other'));

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check 
    CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT their own report
DROP POLICY IF EXISTS "Authenticated users submit reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- SELECT/UPDATE/DELETE restricted strictly to service_role (administrators).
-- No SELECT policy is granted to authenticated or anon, guaranteeing complete privacy for reports.
DROP POLICY IF EXISTS "Users can view reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users view reports" ON public.reports;

-- ----------------------------------------------------------------------------
-- 5. GRANTS & ACCOUNT DELETION CLEANUP
-- ----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_submissions TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated, anon, service_role;

-- Update delete_user_account RPCs to guarantee pristine deletion of safety records
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. Only authenticated users can delete their own account.';
    END IF;

    DELETE FROM public.live_location_sessions WHERE user_id = v_user_id;
    DELETE FROM public.active_location_shares WHERE user_id = v_user_id;
    DELETE FROM public.user_privacy_settings WHERE user_id = v_user_id;
    DELETE FROM public.user_notification_preferences WHERE user_id = v_user_id;
    DELETE FROM public.user_blocks WHERE blocker_user_id = v_user_id OR blocked_user_id = v_user_id;
    DELETE FROM public.user_verifications WHERE user_id = v_user_id;
    DELETE FROM public.verification_submissions WHERE user_id = v_user_id;
    DELETE FROM public.emergency_contacts WHERE user_id = v_user_id;
    DELETE FROM public.reports WHERE reporter_id = v_user_id OR reported_id = v_user_id;
    DELETE FROM public.app_notifications WHERE user_id = v_user_id;

    DELETE FROM public.users WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account and associated database records deleted successfully.',
        'user_id', v_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account_by_admin(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'target_user_id cannot be null.';
    END IF;

    DELETE FROM public.live_location_sessions WHERE user_id = target_user_id;
    DELETE FROM public.active_location_shares WHERE user_id = target_user_id;
    DELETE FROM public.user_privacy_settings WHERE user_id = target_user_id;
    DELETE FROM public.user_notification_preferences WHERE user_id = target_user_id;
    DELETE FROM public.user_blocks WHERE blocker_user_id = target_user_id OR blocked_user_id = target_user_id;
    DELETE FROM public.user_verifications WHERE user_id = target_user_id;
    DELETE FROM public.verification_submissions WHERE user_id = target_user_id;
    DELETE FROM public.emergency_contacts WHERE user_id = target_user_id;
    DELETE FROM public.reports WHERE reporter_id = target_user_id OR reported_id = target_user_id;
    DELETE FROM public.app_notifications WHERE user_id = target_user_id;

    DELETE FROM public.users WHERE id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account and associated database records deleted successfully by admin.',
        'user_id', target_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
