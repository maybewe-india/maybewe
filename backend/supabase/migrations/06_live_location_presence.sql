-- ============================================================================
-- MAYBEWE MIGRATION 06: LIVE LOCATION SESSIONS, SAFETY BLOCKS & TRUST FOUNDATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LIVE LOCATION SESSIONS TABLE
-- Ephemeral foreground live location sharing between authorized travelers only.
-- Strictly decoupled from public.users to ensure zero public exposure.
-- No permanent location history is recorded.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_location_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    chat_group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    accuracy_meters NUMERIC,
    privacy_mode TEXT NOT NULL DEFAULT 'precise' CHECK (privacy_mode IN ('precise', 'approximate')),
    duration_type TEXT NOT NULL DEFAULT '1h' CHECK (duration_type IN ('15m', '1h', '4h', 'until_stopped')),
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    stopped_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'expired')),
    last_updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_live_target CHECK (target_user_id IS NOT NULL OR chat_group_id IS NOT NULL OR match_id IS NOT NULL)
);

-- Performance and expiry indexes
CREATE INDEX IF NOT EXISTS idx_live_loc_owner ON public.live_location_sessions(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_live_loc_target ON public.live_location_sessions(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_live_loc_group ON public.live_location_sessions(chat_group_id, status);
CREATE INDEX IF NOT EXISTS idx_live_loc_match ON public.live_location_sessions(match_id, status);
CREATE INDEX IF NOT EXISTS idx_live_loc_expires ON public.live_location_sessions(expires_at) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.live_location_sessions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. USER BLOCKS TABLE
-- Mutual protection against unwanted messages, connection requests, and location
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_user_block UNIQUE (blocker_user_id, blocked_user_id),
    CONSTRAINT chk_no_self_block CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_user_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS: Block policies
CREATE POLICY "Users can view their own blocked users"
ON public.user_blocks FOR SELECT
TO authenticated
USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can block other users"
ON public.user_blocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_user_id AND auth.uid() <> blocked_user_id);

CREATE POLICY "Users can unblock other users"
ON public.user_blocks FOR DELETE
TO authenticated
USING (auth.uid() = blocker_user_id);

-- ----------------------------------------------------------------------------
-- 3. USER TRUST EVENTS TABLE
-- Immutable record of authentic trust milestones (verification, reviews, safety)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_trust_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'verification_completed',
        'review_received',
        'report_resolved',
        'successful_hangout',
        'successful_connection'
    )),
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trust_events_user ON public.user_trust_events(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_events_type ON public.user_trust_events(event_type);

ALTER TABLE public.user_trust_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trust events"
ON public.user_trust_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Actors can insert legitimate trust events"
ON public.user_trust_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id OR auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. EXPAND REPORTS TABLE FOR CHAT & HANGOUT REPORTING
-- ----------------------------------------------------------------------------
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS hangout_id UUID REFERENCES public.hangout_groups(id) ON DELETE SET NULL;

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS details TEXT;

-- ----------------------------------------------------------------------------
-- 5. RLS: LIVE LOCATION SESSIONS
-- Rigorous server-side authorization:
-- 1. Owner can access and manage their own sessions.
-- 2. Authorized recipients can view ACTIVE, NON-EXPIRED sessions only.
-- 3. Blocked users receive zero rows.
-- 4. Expired or stopped sessions are unreadable by recipients.
-- ----------------------------------------------------------------------------
CREATE POLICY "Live location sessions readable by owner or authorized recipient"
ON public.live_location_sessions FOR SELECT
TO authenticated
USING (
    auth.uid() = owner_user_id
    OR (
        status = 'active'
        AND expires_at > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks b
            WHERE (b.blocker_user_id = auth.uid() AND b.blocked_user_id = owner_user_id)
               OR (b.blocker_user_id = owner_user_id AND b.blocked_user_id = auth.uid())
        )
        AND (
            (target_user_id IS NOT NULL AND target_user_id = auth.uid())
            OR
            (chat_group_id IS NOT NULL AND public.is_chat_group_member(chat_group_id, auth.uid()))
            OR
            (match_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.matches m
                WHERE m.id = match_id
                  AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
                  AND m.status = 'accepted'
            ))
        )
    )
);

CREATE POLICY "Owners can start their own live location session"
ON public.live_location_sessions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = owner_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks b
        WHERE (b.blocker_user_id = auth.uid() AND b.blocked_user_id = target_user_id)
           OR (b.blocker_user_id = target_user_id AND b.blocked_user_id = auth.uid())
    )
    AND (
        (target_user_id IS NOT NULL)
        OR (chat_group_id IS NOT NULL AND public.is_chat_group_member(chat_group_id, auth.uid()))
        OR (match_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
              AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
              AND m.status = 'accepted'
        ))
    )
);

CREATE POLICY "Owners can update their own active live location"
ON public.live_location_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can delete or stop their own live location"
ON public.live_location_sessions FOR DELETE
TO authenticated
USING (auth.uid() = owner_user_id);

-- ----------------------------------------------------------------------------
-- 6. REALTIME REPLICATION FOR LIVE LOCATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'live_location_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_location_sessions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 7. RPC: STOP LIVE LOCATION SESSION
-- Immediately terminates session server-side
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stop_live_location_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    UPDATE public.live_location_sessions
    SET 
        status = 'stopped',
        stopped_at = TIMEZONE('utc', NOW()),
        last_updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_session_id AND owner_user_id = auth.uid();

    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stop_live_location_session(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. EXPAND CHAT MESSAGE TYPES FOR LIVE LOCATION SHARE
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN (
    'text', 
    'image', 
    'location_share', 
    'live_location_share',
    'place_share', 
    'trip_share', 
    'activity_share', 
    'hangout_share', 
    'system'
));
