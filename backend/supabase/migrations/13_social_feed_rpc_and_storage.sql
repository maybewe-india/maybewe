-- ============================================================================
-- Migration: 13_social_feed_rpc_and_storage.sql
-- Description: Fix get_social_feed enum casting and ensure storage bucket access
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_social_feed(UUID, INT, TIMESTAMPTZ, UUID);

-- 1. FIX RPC get_social_feed
CREATE OR REPLACE FUNCTION public.get_social_feed(
    p_viewer_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    destination TEXT,
    place_id UUID,
    trip_id UUID,
    likes_count INT,
    like_count INT,
    comments_count INT,
    save_count INT,
    visibility TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_name TEXT,
    user_avatar_url TEXT,
    user_trust_score NUMERIC,
    user_verification_status TEXT,
    is_liked_by_viewer BOOLEAN,
    is_saved_by_viewer BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.destination,
        p.place_id,
        p.trip_id,
        p.likes_count,
        p.like_count,
        p.comments_count,
        p.save_count,
        p.visibility,
        p.created_at,
        p.updated_at,
        COALESCE(u.name, 'Traveler')::TEXT AS user_name,
        u.avatar_url::TEXT AS user_avatar_url,
        COALESCE(u.trust_score, 5.0)::NUMERIC AS user_trust_score,
        COALESCE(u.verification_status::TEXT, 'not_started')::TEXT AS user_verification_status,
        CASE 
            WHEN p_viewer_id IS NOT NULL THEN
                EXISTS (SELECT 1 FROM public.post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = p_viewer_id)
                OR EXISTS (SELECT 1 FROM public.post_likes pl WHERE pl.post_id = p.id AND pl.user_id = p_viewer_id)
            ELSE FALSE
        END AS is_liked_by_viewer,
        CASE 
            WHEN p_viewer_id IS NOT NULL THEN
                EXISTS (SELECT 1 FROM public.post_saves ps WHERE ps.post_id = p.id AND ps.user_id = p_viewer_id)
            ELSE FALSE
        END AS is_saved_by_viewer
    FROM public.posts p
    JOIN public.users u ON u.id = p.user_id
    WHERE 
        p.visibility = 'public'
        -- Bi-Directional Block Exclusion:
        AND (
            p_viewer_id IS NULL OR (
                -- Viewer has not blocked author
                NOT EXISTS (
                    SELECT 1 FROM public.blocks b 
                    WHERE b.user_id = p_viewer_id AND b.blocked_id = p.user_id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM public.user_blocks ub 
                    WHERE ub.blocker_user_id = p_viewer_id AND ub.blocked_user_id = p.user_id
                )
                -- Author has not blocked viewer
                AND NOT EXISTS (
                    SELECT 1 FROM public.blocks b 
                    WHERE b.user_id = p.user_id AND b.blocked_id = p_viewer_id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM public.user_blocks ub 
                    WHERE ub.blocker_user_id = p.user_id AND ub.blocked_user_id = p_viewer_id
                )
            )
        )
        -- Keyset / Cursor Pagination on (created_at, id)
        AND (
            p_cursor_created_at IS NULL OR 
            (p.created_at < p_cursor_created_at) OR 
            (p.created_at = p_cursor_created_at AND p.id < p_cursor_id)
        )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_social_feed TO authenticated, anon;

-- 2. ENSURE STORAGE BUCKET post-media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'post-media',
    'post-media',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Allow reading public buckets metadata
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'buckets' AND policyname = 'Public bucket read access'
    ) THEN
        CREATE POLICY "Public bucket read access" ON storage.buckets FOR SELECT USING (public = true);
    END IF;
END $$;

-- 3. ENSURE STORAGE OBJECT POLICIES
DROP POLICY IF EXISTS "Public Read Post Media" ON storage.objects;
CREATE POLICY "Public Read Post Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated Users Upload Post Media" ON storage.objects;
CREATE POLICY "Authenticated Users Upload Post Media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'post-media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated Users Delete Own Post Media" ON storage.objects;
CREATE POLICY "Authenticated Users Delete Own Post Media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'post-media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
