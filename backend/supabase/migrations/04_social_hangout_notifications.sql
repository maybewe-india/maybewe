-- ============================================================================
-- MAYBEWE MIGRATION 04: SOCIAL GRAPH, NOTIFICATIONS FOUNDATION & HANGOUT RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NOTIFICATIONS FOUNDATION
-- Clean event/data foundation for future notifications (follow, like, hangout, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN (
        'follow',
        'like',
        'comment',
        'hangout_invite',
        'hangout_join',
        'hangout_vote',
        'hangout_finalized',
        'trip_share'
    )),
    entity_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for fast notification retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.app_notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.app_notifications(created_at DESC);

-- Enable RLS on app_notifications
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Recipients can read their own notifications
CREATE POLICY "Users can read their own notifications"
ON public.app_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: Authenticated actors or system can create notifications
CREATE POLICY "Authenticated users can create notifications for others"
ON public.app_notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id OR auth.uid() = user_id);

-- RLS: Recipients can update (e.g. mark as read) their notifications
CREATE POLICY "Users can update their own notifications"
ON public.app_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS: Recipients can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.app_notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. SOCIAL STATS RPC
-- Efficiently get post count, follower count, and following count for a user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_social_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_posts_count BIGINT;
    v_followers_count BIGINT;
    v_following_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_posts_count
    FROM public.posts
    WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_followers_count
    FROM public.follows
    WHERE following_id = p_user_id;

    SELECT COUNT(*) INTO v_following_count
    FROM public.follows
    WHERE follower_id = p_user_id;

    RETURN jsonb_build_object(
        'posts_count', COALESCE(v_posts_count, 0),
        'followers_count', COALESCE(v_followers_count, 0),
        'following_count', COALESCE(v_following_count, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_social_stats TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. HANGOUT VOTE TALLY RPC
-- Computes aggregated vote totals for hangout place suggestions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hangout_suggestion_votes(p_hangout_id UUID)
RETURNS TABLE (
    suggestion_id UUID,
    place_id UUID,
    custom_place_name TEXT,
    upvotes BIGINT,
    downvotes BIGINT,
    score BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is a member of the hangout
    IF NOT public.is_hangout_member(p_hangout_id, auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: caller is not a member of this hangout.';
    END IF;

    RETURN QUERY
    SELECT
        s.id AS suggestion_id,
        s.place_id,
        s.custom_place_name,
        COUNT(v.id) FILTER (WHERE v.vote_value = 1) AS upvotes,
        COUNT(v.id) FILTER (WHERE v.vote_value = -1) AS downvotes,
        COALESCE(SUM(v.vote_value), 0)::BIGINT AS score
    FROM public.hangout_place_suggestions s
    LEFT JOIN public.hangout_votes v ON v.suggestion_id = s.id
    WHERE s.hangout_id = p_hangout_id
    GROUP BY s.id, s.place_id, s.custom_place_name
    ORDER BY score DESC, upvotes DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hangout_suggestion_votes TO authenticated;
