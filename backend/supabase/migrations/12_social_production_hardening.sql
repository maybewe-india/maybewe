-- ============================================================================
-- 12. SOCIAL PRODUCTION HARDENING (MIGRATION 12)
-- Posts, Comments, Post Reactions, Bi-Directional Blocks, Reports, Triggers,
-- and Storage Policies for MaybeWe Social Feed
-- ============================================================================

-- 1. POSTS TABLE EXTENSIONS & INDEXES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'likes_count'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN likes_count INT DEFAULT 0 CHECK (likes_count >= 0) NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'comments_count'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN comments_count INT DEFAULT 0 CHECK (comments_count >= 0) NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_created_at_id ON public.posts(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_destination ON public.posts(destination);

-- 2. POST REACTIONS TABLE (Concurrency-Safe Likes & Reactions)
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'like' NOT NULL CHECK (reaction_type IN ('like', 'love', 'celebrate', 'insightful')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_post_reaction UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON public.post_reactions(user_id);

-- 3. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 2000),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);

-- 4. BLOCKS TABLE (Bi-Directional Blocking Specification)
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_block_pair UNIQUE (user_id, blocked_id),
    CONSTRAINT chk_no_self_block CHECK (user_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_user ON public.blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);

-- 4b. FOLLOWS TABLE (Self-Follow Prevention & Mechanics)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_follows_follower_following UNIQUE (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- 4c. REPORTS TABLE (Moderation & Safety Tracking)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_type TEXT DEFAULT 'user' NOT NULL,
    target_id UUID,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Ensure target_type and target_id exist if table was created by older migration
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'target_type'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN target_type TEXT DEFAULT 'user';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'target_id'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN target_id UUID;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'reported_id'
        ) THEN
            UPDATE public.reports SET target_id = reported_id WHERE target_id IS NULL;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'reported_id'
    ) THEN
        ALTER TABLE public.reports ALTER COLUMN reported_id DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);

-- 5. CONCURRENCY-SAFE COUNTER TRIGGERS
-- Trigger for post_reactions -> posts.likes_count and posts.like_count
CREATE OR REPLACE FUNCTION public.fn_post_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.sync_post_reactions_count();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_reactions_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_post_id UUID;
    actual_count INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        target_post_id := NEW.post_id;
    ELSE
        target_post_id := OLD.post_id;
    END IF;

    SELECT COUNT(*) INTO actual_count FROM public.post_reactions WHERE post_id = target_post_id;

    UPDATE public.posts
    SET likes_count = actual_count,
        like_count = actual_count,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = target_post_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_reactions_count ON public.post_reactions;
CREATE TRIGGER trg_post_reactions_count
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_reactions_count();

-- Trigger for post_likes -> posts.likes_count (compatibility with existing schema)
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_post_id UUID;
    actual_count INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        target_post_id := NEW.post_id;
    ELSE
        target_post_id := OLD.post_id;
    END IF;

    SELECT COUNT(*) INTO actual_count FROM public.post_likes WHERE post_id = target_post_id;

    UPDATE public.posts
    SET likes_count = actual_count,
        like_count = actual_count,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = target_post_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_likes_count();

-- Trigger for comments -> posts.comments_count
CREATE OR REPLACE FUNCTION public.fn_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.sync_post_comments_count();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_post_id UUID;
    actual_count INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        target_post_id := NEW.post_id;
    ELSE
        target_post_id := OLD.post_id;
    END IF;

    SELECT COUNT(*) INTO actual_count FROM public.comments WHERE post_id = target_post_id;

    UPDATE public.posts
    SET comments_count = actual_count,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = target_post_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_count ON public.comments;
CREATE TRIGGER trg_post_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_comments_count();

-- 6. BI-DIRECTIONAL BLOCKING FEED RPC
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
    user_trust_score INT,
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
        COALESCE(u.trust_score, 50)::INT AS user_trust_score,
        COALESCE(u.verification_status, 'unverified')::TEXT AS user_verification_status,
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

-- 7. STORAGE BUCKET: post-media (Strict 10MB limit and MIME validation)
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

-- Storage RLS: Public Read, Authenticated Owner Upload & Delete
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

-- 8. ROW LEVEL SECURITY POLICIES ON SOCIAL TABLES
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Posts RLS Policies
DROP POLICY IF EXISTS "Public posts viewable by everyone" ON public.posts;
CREATE POLICY "Public posts viewable by everyone"
ON public.posts FOR SELECT
USING (
    visibility = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM public.blocks b 
        WHERE (b.user_id = auth.uid() AND b.blocked_id = posts.user_id)
           OR (b.user_id = posts.user_id AND b.blocked_id = auth.uid())
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub 
        WHERE (ub.blocker_user_id = auth.uid() AND ub.blocked_user_id = posts.user_id)
           OR (ub.blocker_user_id = posts.user_id AND ub.blocked_user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "Users can create their own posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Post Reactions RLS Policies
DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.post_reactions;
CREATE POLICY "Reactions viewable by everyone"
ON public.post_reactions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can add their own reaction" ON public.post_reactions;
CREATE POLICY "Users can add their own reaction"
ON public.post_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own reaction" ON public.post_reactions;
CREATE POLICY "Users can remove their own reaction"
ON public.post_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Comments RLS Policies
DROP POLICY IF EXISTS "Comments viewable by everyone on unblocked posts" ON public.comments;
CREATE POLICY "Comments viewable by everyone on unblocked posts"
ON public.comments FOR SELECT
USING (
    NOT EXISTS (
        SELECT 1 FROM public.blocks b 
        WHERE (b.user_id = auth.uid() AND b.blocked_id = comments.user_id)
           OR (b.user_id = comments.user_id AND b.blocked_id = auth.uid())
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub 
        WHERE (ub.blocker_user_id = auth.uid() AND ub.blocked_user_id = comments.user_id)
           OR (ub.blocker_user_id = comments.user_id AND ub.blocked_user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can post comments" ON public.comments;
CREATE POLICY "Users can post comments"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Blocks RLS Policies
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocks;
CREATE POLICY "Users can view their own blocks"
ON public.blocks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own blocks" ON public.blocks;
CREATE POLICY "Users can insert their own blocks"
ON public.blocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocks;
CREATE POLICY "Users can delete their own blocks"
ON public.blocks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Reports RLS Policies
DROP POLICY IF EXISTS "Authenticated users submit reports" ON public.reports;
CREATE POLICY "Authenticated users submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Reports strictly private to administrators" ON public.reports;
CREATE POLICY "Reports strictly private to administrators"
ON public.reports FOR SELECT
TO service_role
USING (true);
