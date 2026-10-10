-- ============================================================================
-- Migration: 17_ephemeral_stories_system.sql
-- Description: Production 24-Hour Ephemeral Stories, Story Views, RLS & Storage
-- ============================================================================

-- 1. STORIES TABLE (24-Hour Ephemeral Visual Moments)
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    caption TEXT,
    destination TEXT,
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')) NOT NULL,
    views_count INT DEFAULT 0 CHECK (views_count >= 0) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '24 hours') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);

-- 2. STORY VIEWS TABLE (Unique Viewer Tracking)
CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_story_viewer UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON public.story_views(viewer_id);

-- 3. CONCURRENCY-SAFE STORY VIEWS COUNTER TRIGGER
CREATE OR REPLACE FUNCTION public.sync_story_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_story_id UUID;
    actual_count INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        target_story_id := NEW.story_id;
    ELSE
        target_story_id := OLD.story_id;
    END IF;

    SELECT COUNT(*) INTO actual_count FROM public.story_views WHERE story_id = target_story_id;

    UPDATE public.stories
    SET views_count = actual_count
    WHERE id = target_story_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_story_views_count ON public.story_views;
CREATE TRIGGER trg_story_views_count
AFTER INSERT OR DELETE ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.sync_story_views_count();

-- 4. STORAGE BUCKET: story-media (Strict 10MB limit and MIME validation)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'story-media',
    'story-media',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Storage RLS: Public Read, Authenticated Owner Upload & Delete
DROP POLICY IF EXISTS "Public Read Story Media" ON storage.objects;
CREATE POLICY "Public Read Story Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-media');

DROP POLICY IF EXISTS "Authenticated Users Upload Story Media" ON storage.objects;
CREATE POLICY "Authenticated Users Upload Story Media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'story-media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated Users Delete Own Story Media" ON storage.objects;
CREATE POLICY "Authenticated Users Delete Own Story Media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'story-media' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES ON STORIES & VIEWS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Stories Select: Unexpired, Public, and Non-Blocked
DROP POLICY IF EXISTS "Active stories viewable by everyone" ON public.stories;
CREATE POLICY "Active stories viewable by everyone"
ON public.stories FOR SELECT
USING (
    expires_at > TIMEZONE('utc', NOW())
    AND visibility = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM public.blocks b 
        WHERE (b.user_id = auth.uid() AND b.blocked_id = stories.user_id)
           OR (b.user_id = stories.user_id AND b.blocked_id = auth.uid())
    )
);

-- Stories Mutation: Owner Only
DROP POLICY IF EXISTS "Users can insert their own stories" ON public.stories;
CREATE POLICY "Users can insert their own stories"
ON public.stories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
CREATE POLICY "Users can delete their own stories"
ON public.stories FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Story Views Policies:
DROP POLICY IF EXISTS "Users can record their own story views" ON public.story_views;
CREATE POLICY "Users can record their own story views"
ON public.story_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Story author or viewer can select views" ON public.story_views;
CREATE POLICY "Story author or viewer can select views"
ON public.story_views FOR SELECT
TO authenticated
USING (
    auth.uid() = viewer_id
    OR auth.uid() = (SELECT s.user_id FROM public.stories s WHERE s.id = story_views.story_id)
);

-- 6. RPC: GET ACTIVE STORIES (Grouped by User with Unseen Flags & Bi-Directional Blocks)
DROP FUNCTION IF EXISTS public.get_active_stories(UUID);
CREATE OR REPLACE FUNCTION public.get_active_stories(
    p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE (
    story_id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    media_url TEXT,
    caption TEXT,
    destination TEXT,
    place_id UUID,
    views_count INT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    has_viewed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS story_id,
        s.user_id,
        COALESCE(u.name, 'Traveler')::TEXT AS user_name,
        u.avatar_url::TEXT AS user_avatar_url,
        s.media_url,
        s.caption,
        s.destination,
        s.place_id,
        s.views_count,
        s.created_at,
        s.expires_at,
        CASE 
            WHEN p_viewer_id IS NOT NULL THEN
                EXISTS (SELECT 1 FROM public.story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = p_viewer_id)
            ELSE FALSE
        END AS has_viewed
    FROM public.stories s
    JOIN public.users u ON u.id = s.user_id
    WHERE 
        s.expires_at > TIMEZONE('utc', NOW())
        AND s.visibility = 'public'
        -- Bi-Directional Block Exclusion:
        AND (
            p_viewer_id IS NULL OR (
                NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.user_id = p_viewer_id AND b.blocked_id = s.user_id)
                AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.user_id = s.user_id AND b.blocked_id = p_viewer_id)
            )
        )
    ORDER BY s.created_at ASC;
END;
$$;

-- 7. RPC: RECORD STORY VIEW (Idempotent)
CREATE OR REPLACE FUNCTION public.record_story_view(
    p_story_id UUID,
    p_viewer_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_story_id IS NULL OR p_viewer_id IS NULL THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.story_views (story_id, viewer_id)
    VALUES (p_story_id, p_viewer_id)
    ON CONFLICT (story_id, viewer_id) DO NOTHING;

    RETURN TRUE;
END;
$$;

-- 8. RPC: PURGE EXPIRED STORIES (Clean database + returns media URLs for storage cleanup)
CREATE OR REPLACE FUNCTION public.delete_expired_stories()
RETURNS TABLE (
    deleted_id UUID,
    deleted_media_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    DELETE FROM public.stories
    WHERE expires_at <= TIMEZONE('utc', NOW())
    RETURNING id AS deleted_id, media_url AS deleted_media_url;
END;
$$;

-- 9. PERMISSIONS
GRANT ALL ON TABLE public.stories TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.story_views TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_stories(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.record_story_view(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.delete_expired_stories() TO authenticated, service_role;
