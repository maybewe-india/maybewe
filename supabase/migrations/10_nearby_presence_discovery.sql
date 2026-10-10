-- ============================================================================
-- MAYBEWE MIGRATION 10: SECURE EPHEMERAL NEARBY PRESENCE & GEOSPATIAL DISCOVERY
-- ============================================================================
-- Real Device GPS -> Real Location-Active Users -> Real Distance -> Real Nearby People
-- WGS84 Geodetic Coordinates (EPSG:4326) Worldwide
-- PostGIS ST_DWithin & ST_Distance
-- Privacy Rules:
--   1. Precise GPS is NEVER exposed in the public directory or RPC output.
--   2. Distance in meters/km is returned, NOT another user's raw lat/long.
--   3. Mutual block safety (public.user_blocks) is strictly enforced in both directions.
--   4. Stale presence (> 15 minutes) is automatically excluded from all searches.
--   5. Ephemeral opt-in: users must explicitly enable nearby discoverability.
-- ============================================================================

-- 1. ENABLE POSTGIS EXTENSION SAFELY
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. CREATE USER NEARBY PRESENCE TABLE
CREATE TABLE IF NOT EXISTS public.user_nearby_presence (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    geom extensions.geography(Point, 4326) NOT NULL,
    accuracy_meters NUMERIC,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 3. GIST & PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_nearby_presence_geom 
    ON public.user_nearby_presence USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_user_nearby_presence_last_seen 
    ON public.user_nearby_presence(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_user_nearby_presence_active 
    ON public.user_nearby_presence(is_visible, last_seen_at) 
    WHERE is_visible = true;

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.user_nearby_presence ENABLE ROW LEVEL SECURITY;

-- Raw table rows containing precise coordinates are readable ONLY by their owner
DROP POLICY IF EXISTS "Users can view own nearby presence" ON public.user_nearby_presence;
CREATE POLICY "Users can view own nearby presence"
ON public.user_nearby_presence FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own nearby presence" ON public.user_nearby_presence;
CREATE POLICY "Users can insert own nearby presence"
ON public.user_nearby_presence FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own nearby presence" ON public.user_nearby_presence;
CREATE POLICY "Users can update own nearby presence"
ON public.user_nearby_presence FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own nearby presence" ON public.user_nearby_presence;
CREATE POLICY "Users can delete own nearby presence"
ON public.user_nearby_presence FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_nearby_presence TO authenticated;

-- 5. RPC: UPDATE / PUBLISH NEARBY PRESENCE
CREATE OR REPLACE FUNCTION public.update_nearby_presence(
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL,
    p_is_visible BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_now TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to publish nearby presence.';
    END IF;

    -- Strict WGS84 coordinate bounds validation
    IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90.0 OR p_lat > 90.0 OR p_lng < -180.0 OR p_lng > 180.0 THEN
        RAISE EXCEPTION 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.';
    END IF;

    v_now := TIMEZONE('utc', NOW());

    INSERT INTO public.user_nearby_presence (user_id, geom, accuracy_meters, is_visible, last_seen_at)
    VALUES (
        v_user_id,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
        p_accuracy,
        p_is_visible,
        v_now
    )
    ON CONFLICT (user_id) DO UPDATE SET
        geom = extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
        accuracy_meters = p_accuracy,
        is_visible = p_is_visible,
        last_seen_at = v_now;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'is_visible', p_is_visible,
        'last_seen_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_nearby_presence(NUMERIC, NUMERIC, NUMERIC, BOOLEAN) TO authenticated;

-- 6. RPC: TOGGLE NEARBY VISIBILITY
CREATE OR REPLACE FUNCTION public.set_nearby_visibility(p_is_visible BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    UPDATE public.user_nearby_presence
    SET is_visible = p_is_visible,
        last_seen_at = CASE WHEN p_is_visible THEN TIMEZONE('utc', NOW()) ELSE last_seen_at END
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'is_visible', p_is_visible);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_nearby_visibility(BOOLEAN) TO authenticated;

-- 7. RPC: CLEAR / REMOVE NEARBY PRESENCE
CREATE OR REPLACE FUNCTION public.clear_nearby_presence()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    DELETE FROM public.user_nearby_presence WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_nearby_presence() TO authenticated;

-- 8. RPC: PURGE STALE PRESENCE (> 24 HOURS)
CREATE OR REPLACE FUNCTION public.purge_stale_nearby_presence()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted INT;
BEGIN
    DELETE FROM public.user_nearby_presence
    WHERE last_seen_at < TIMEZONE('utc', NOW()) - INTERVAL '24 hours';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_stale_nearby_presence() TO authenticated;

-- 9. RPC: SECURE GEOSPATIAL DISCOVERY (find_nearby_travelers)
CREATE OR REPLACE FUNCTION public.find_nearby_travelers(
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_radius_km NUMERIC DEFAULT 25.0,
    p_limit INT DEFAULT 30
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    user_bio TEXT,
    user_travel_styles TEXT[],
    user_languages TEXT[],
    user_verification_status verification_status_type,
    user_trust_score NUMERIC,
    distance_meters NUMERIC,
    last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_origin extensions.geography;
    v_radius_meters NUMERIC;
    v_limit INT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to discover nearby travelers.';
    END IF;

    -- Strict coordinate validation
    IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90.0 OR p_lat > 90.0 OR p_lng < -180.0 OR p_lng > 180.0 THEN
        RAISE EXCEPTION 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180.';
    END IF;

    -- Clamp radius between 0.5 km and 300 km
    v_radius_meters := LEAST(GREATEST(COALESCE(p_radius_km, 25.0), 0.5), 300.0) * 1000.0;
    -- Clamp limit between 1 and 50
    v_limit := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);

    v_origin := extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography;

    RETURN QUERY
    SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.avatar_url AS user_avatar_url,
        u.bio AS user_bio,
        u.travel_styles AS user_travel_styles,
        u.languages AS user_languages,
        u.verification_status AS user_verification_status,
        u.trust_score AS user_trust_score,
        ROUND(extensions.ST_Distance(p.geom, v_origin))::NUMERIC AS distance_meters,
        p.last_seen_at
    FROM public.user_nearby_presence p
    JOIN public.users u ON u.id = p.user_id
    WHERE 
        -- Exclude the requesting user
        p.user_id <> v_caller_id
        -- User must be visible
        AND p.is_visible = true
        -- Ephemeral: seen within the last 15 minutes
        AND p.last_seen_at > TIMEZONE('utc', NOW()) - INTERVAL '15 minutes'
        -- Mutual block exclusion: neither blocker nor blocked can see each other
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks b
            WHERE (b.blocker_user_id = v_caller_id AND b.blocked_user_id = p.user_id)
               OR (b.blocker_user_id = p.user_id AND b.blocked_user_id = v_caller_id)
        )
        -- PostGIS spatial filter within radius
        AND extensions.ST_DWithin(p.geom, v_origin, v_radius_meters)
    ORDER BY distance_meters ASC
    LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearby_travelers(NUMERIC, NUMERIC, NUMERIC, INT) TO authenticated;
