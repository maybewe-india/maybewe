-- ============================================================================
-- MAYBEWE — TRUST, SAFETY & VERIFICATION SYSTEM
-- Migration: 03_trust_safety_verification_system.sql
-- ============================================================================

-- ============================================================================
-- SECTION 1: MIGRATE verification_status FROM ENUM -> TEXT
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.users;
DROP POLICY IF EXISTS "Service role can update verification status" ON public.users;

ALTER TABLE public.users
  ALTER COLUMN verification_status TYPE TEXT USING verification_status::TEXT;

ALTER TABLE public.users
  ALTER COLUMN verification_status SET DEFAULT 'unverified';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_users_verification_status' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_users_verification_status
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can update verification status"
  ON public.users FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SECTION 2: VERIFICATION SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.verification_submissions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type       TEXT        NOT NULL CHECK (document_type IN ('passport', 'driving_license', 'national_id')),
  document_front_url  TEXT        NOT NULL,
  selfie_url          TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT
);

CREATE INDEX IF NOT EXISTS idx_verification_submissions_user_id
  ON public.verification_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_verification_submissions_status
  ON public.verification_submissions(status);

ALTER TABLE public.verification_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit their own verification"
  ON public.verification_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own verification submissions"
  ON public.verification_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can review verification submissions"
  ON public.verification_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SECTION 3: EMERGENCY CONTACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_name  TEXT        NOT NULL,
  phone_number  TEXT        NOT NULL,
  relationship  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id
  ON public.emergency_contacts(user_id);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their emergency contacts"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SECTION 4: HARDEN reports TABLE
-- ============================================================================

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_type TEXT
    CHECK (target_type IN ('user', 'post', 'comment', 'story', 'hangout', 'message'));

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_id TEXT;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS details TEXT;

ALTER TABLE public.reports
  ALTER COLUMN reported_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_reports_status' AND conrelid = 'public.reports'::regclass
  ) THEN
    ALTER TABLE public.reports
      ALTER COLUMN status TYPE TEXT USING status::TEXT;
    ALTER TABLE public.reports
      ADD CONSTRAINT chk_reports_status
      CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
DROP POLICY IF EXISTS "Reports are private to administrators" ON public.reports;
DROP POLICY IF EXISTS "Service role can manage reports" ON public.reports;

CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reports are private to administrators"
  ON public.reports FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage reports"
  ON public.reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SECTION 5: STORAGE BUCKET — verification-documents
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

DROP POLICY IF EXISTS "Users can upload verification docs to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access to verification documents" ON storage.objects;

CREATE POLICY "Users can upload verification docs to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Service role has full access to verification documents"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'verification-documents')
  WITH CHECK (bucket_id = 'verification-documents');

-- ============================================================================
-- SECTION 6: RPC — process_verification_decision
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_verification_decision(
  p_submission_id    UUID,
  p_decision         TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision: must be approved or rejected';
  END IF;

  SELECT user_id INTO v_user_id
    FROM public.verification_submissions
   WHERE id = p_submission_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id;
  END IF;

  UPDATE public.verification_submissions
     SET status           = p_decision,
         reviewed_at      = TIMEZONE('utc', NOW()),
         rejection_reason = p_rejection_reason
   WHERE id = p_submission_id;

  IF p_decision = 'approved' THEN
    UPDATE public.users
       SET verification_status             = 'verified',
           verified_at                     = TIMEZONE('utc', NOW()),
           verification_rejection_reason   = NULL
     WHERE id = v_user_id;
  ELSE
    UPDATE public.users
       SET verification_status             = 'rejected',
           verification_rejection_reason   = p_rejection_reason
     WHERE id = v_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.process_verification_decision FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_verification_decision TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.verification_submissions IS
  'Stores identity document uploads for the Verified Traveler program.';

COMMENT ON TABLE public.emergency_contacts IS
  'Private safety circle contacts. Strictly visible only to the owning user.';

COMMENT ON COLUMN public.users.verification_status IS
  'Verification lifecycle: unverified -> pending -> verified | rejected';

COMMENT ON COLUMN public.users.verified_at IS
  'Timestamp when verification was approved by admin.';

COMMENT ON COLUMN public.users.verification_rejection_reason IS
  'Admin-provided reason when verification is rejected.';
