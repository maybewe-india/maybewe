-- ============================================================================
-- SOLO TRAVELER — DATABASE SCHEMA & SECURITY POLICIES
-- Migration: 01_initial_schema.sql
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_type') THEN
        CREATE TYPE verification_status_type AS ENUM ('pending', 'verified', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_type') THEN
        CREATE TYPE trip_status_type AS ENUM ('active', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status_type') THEN
        CREATE TYPE match_status_type AS ENUM ('pending', 'accepted', 'declined');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier_type') THEN
        CREATE TYPE subscription_tier_type AS ENUM ('free', 'premium');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_type') THEN
        CREATE TYPE report_status_type AS ENUM ('pending', 'reviewed', 'dismissed');
    END IF;
END $$;

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INT NOT NULL CHECK (age >= 18),
    gender TEXT,
    bio TEXT,
    avatar_url TEXT,
    travel_styles TEXT[] DEFAULT '{}'::TEXT[],
    languages TEXT[] DEFAULT '{}'::TEXT[],
    verification_status verification_status_type DEFAULT 'pending'::verification_status_type,
    trust_score NUMERIC(3, 2) DEFAULT 5.00 CHECK (trust_score >= 0.00 AND trust_score <= 5.00),
    subscription_tier subscription_tier_type DEFAULT 'free'::subscription_tier_type,
    theme_preference TEXT CHECK (theme_preference IN ('dark', 'light')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. TRAVEL HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.travel_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place TEXT NOT NULL,
    date_from DATE,
    date_to DATE,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    looking_for TEXT,
    travel_style TEXT,
    status trip_status_type DEFAULT 'active'::trip_status_type,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_trip_dates CHECK (date_to >= date_from)
);

-- 6. MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    status match_status_type DEFAULT 'pending'::match_status_type,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_match_users_different CHECK (user_a_id <> user_b_id)
);

-- Prevent duplicate matches in either direction (user_a -> user_b OR user_b -> user_a)
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique_pair 
ON public.matches (
    LEAST(user_a_id, user_b_id), 
    GREATEST(user_a_id, user_b_id), 
    COALESCE(trip_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

-- 7. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_review_users_different CHECK (reviewer_id <> reviewed_id),
    CONSTRAINT uq_review_per_trip UNIQUE (reviewer_id, reviewed_id, trip_id)
);

-- 9. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status report_status_type DEFAULT 'pending'::report_status_type,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_report_users_different CHECK (reporter_id <> reported_id)
);

-- ============================================================================
-- 10. DATABASE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_destination ON public.trips(destination);
CREATE INDEX IF NOT EXISTS idx_trips_date_range ON public.trips(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);

CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON public.reports(reported_id);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- TRAVEL HISTORY POLICIES
CREATE POLICY "Travel history is readable by authenticated users"
ON public.travel_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own travel history"
ON public.travel_history FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- TRIPS POLICIES
CREATE POLICY "Active trips are readable by authenticated users"
ON public.trips FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own trips"
ON public.trips FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- MATCHES POLICIES
CREATE POLICY "Participants can view their matches"
ON public.matches FOR SELECT
TO authenticated
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "User A can initiate a match request"
ON public.matches FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_a_id);

CREATE POLICY "Participants can update their match status"
ON public.matches FOR UPDATE
TO authenticated
USING (auth.uid() = user_a_id OR auth.uid() = user_b_id)
WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- MESSAGES POLICIES
-- Messages only allowed when user is participant AND match status is 'accepted'
CREATE POLICY "Participants of accepted match can view messages"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = messages.match_id
          AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
          AND m.status = 'accepted'
    )
);

CREATE POLICY "Participants of accepted match can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = messages.match_id
          AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
          AND m.status = 'accepted'
    )
);

-- REVIEWS POLICIES
CREATE POLICY "Reviews are viewable by authenticated users"
ON public.reviews FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Connected travelers can leave reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE (
            (m.user_a_id = auth.uid() AND m.user_b_id = reviews.reviewed_id)
            OR
            (m.user_b_id = auth.uid() AND m.user_a_id = reviews.reviewed_id)
        )
        AND m.status = 'accepted'
    )
);

-- REPORTS POLICIES
CREATE POLICY "Authenticated users can submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Normal users CANNOT read reports (Admin / service role only)
CREATE POLICY "Reports are private to administrators"
ON public.reports FOR SELECT
TO service_role
USING (true);

-- ============================================================================
-- 12. AUTOMATIC TRUST SCORE RECALCULATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_user_id UUID;
    calculated_avg NUMERIC(3, 2);
    review_count INT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.reviewed_id;
    ELSE
        target_user_id := NEW.reviewed_id;
    END IF;

    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 5.00), COUNT(*)
    INTO calculated_avg, review_count
    FROM public.reviews
    WHERE reviewed_id = target_user_id;

    -- If no reviews, default base trust score is 5.00
    IF review_count = 0 THEN
        calculated_avg := 5.00;
    END IF;

    UPDATE public.users
    SET trust_score = calculated_avg
    WHERE id = target_user_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalculate_trust_score ON public.reviews;
CREATE TRIGGER trigger_recalculate_trust_score
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recalculate_trust_score();

-- ============================================================================
-- 13. DISCOVERY RPC: find_overlapping_trips
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_overlapping_trips(
    p_user_id UUID,
    p_destination TEXT DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_min_age INT DEFAULT NULL,
    p_max_age INT DEFAULT NULL,
    p_gender TEXT DEFAULT NULL,
    p_travel_style TEXT DEFAULT NULL
)
RETURNS TABLE (
    trip_id UUID,
    destination TEXT,
    trip_date_from DATE,
    trip_date_to DATE,
    trip_travel_style TEXT,
    looking_for TEXT,
    user_id UUID,
    user_name TEXT,
    user_age INT,
    user_gender TEXT,
    user_bio TEXT,
    user_avatar_url TEXT,
    user_travel_styles TEXT[],
    user_languages TEXT[],
    user_verification_status verification_status_type,
    user_trust_score NUMERIC(3, 2),
    user_subscription_tier subscription_tier_type
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        t.id AS trip_id,
        t.destination,
        t.date_from AS trip_date_from,
        t.date_to AS trip_date_to,
        t.travel_style AS trip_travel_style,
        t.looking_for,
        u.id AS user_id,
        u.name AS user_name,
        u.age AS user_age,
        u.gender AS user_gender,
        u.bio AS user_bio,
        u.avatar_url AS user_avatar_url,
        u.travel_styles AS user_travel_styles,
        u.languages AS user_languages,
        u.verification_status AS user_verification_status,
        u.trust_score AS user_trust_score,
        u.subscription_tier AS user_subscription_tier
    FROM public.trips t
    JOIN public.users u ON u.id = t.user_id
    WHERE 
        -- Exclude the current user
        t.user_id <> p_user_id
        -- Only active trips
        AND t.status = 'active'
        -- Match destination (if specified)
        AND (
            p_destination IS NULL 
            OR p_destination = '' 
            OR t.destination ILIKE '%' || p_destination || '%'
        )
        -- Match overlapping dates: t.date_from <= p_date_to AND t.date_to >= p_date_from
        AND (
            p_date_from IS NULL 
            OR p_date_to IS NULL 
            OR (t.date_from <= p_date_to AND t.date_to >= p_date_from)
        )
        -- Age filter
        AND (
            (p_min_age IS NULL OR u.age >= p_min_age)
            AND
            (p_max_age IS NULL OR u.age <= p_max_age)
        )
        -- Gender filter
        AND (
            p_gender IS NULL 
            OR p_gender = '' 
            OR p_gender = 'All' 
            OR u.gender ILIKE p_gender
        )
        -- Travel style filter
        AND (
            p_travel_style IS NULL 
            OR p_travel_style = '' 
            OR p_travel_style = 'All'
            OR t.travel_style ILIKE p_travel_style 
            OR p_travel_style = ANY(u.travel_styles)
        )
        -- Exclude users reported by the current user
        AND NOT EXISTS (
            SELECT 1 FROM public.reports r 
            WHERE r.reporter_id = p_user_id AND r.reported_id = u.id
        )
        -- Exclude users who reported the current user
        AND NOT EXISTS (
            SELECT 1 FROM public.reports r 
            WHERE r.reporter_id = u.id AND r.reported_id = p_user_id
        )
    ORDER BY t.date_from ASC, u.trust_score DESC;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.find_overlapping_trips TO authenticated;

-- ============================================================================
-- 14. SUPABASE STORAGE BUCKET: travel-photos
-- ============================================================================
-- Create the travel-photos storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-photos', 'travel-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bucket policies for public read and authenticated write
CREATE POLICY "Public Read Access for Travel Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'travel-photos');

CREATE POLICY "Authenticated users can upload travel photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'travel-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own travel photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'travel-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own travel photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'travel-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
