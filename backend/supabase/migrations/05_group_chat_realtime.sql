-- ============================================================================
-- MAYBEWE MIGRATION 05: GROUP CHAT, REALTIME, REPLIES & REACTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND CHAT MESSAGES SCHEMA
-- Add replies, hangout sharing, activity references, and flexible metadata
-- ----------------------------------------------------------------------------

-- Add reply reference
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Add hangout reference
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS shared_hangout_id UUID REFERENCES public.hangout_groups(id) ON DELETE SET NULL;

-- Add shared activity reference / title
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS shared_activity_id TEXT;

-- Add flexible metadata JSONB for rich travel cards
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Extend message_type check constraint
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN (
    'text', 
    'image', 
    'location_share', 
    'place_share', 
    'trip_share', 
    'activity_share', 
    'hangout_share', 
    'system'
));

-- Index for reply tree lookup
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON public.chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_hangout ON public.chat_messages(shared_hangout_id);

-- ----------------------------------------------------------------------------
-- 2. MESSAGE REACTIONS TABLE
-- Join structure for restrained travel reactions (❤️, 👍, 😂, 🔥, ✈️, 📍)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL CHECK (reaction IN ('❤️', '👍', '😂', '🔥', '✈️', '📍')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_chat_message_user_reaction UNIQUE (message_id, user_id, reaction)
);

-- Reaction performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON public.chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_user ON public.chat_message_reactions(user_id);

-- Enable RLS on reactions
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions readable strictly by group members of the message
CREATE POLICY "Reactions readable by group members"
ON public.chat_message_reactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chat_messages m
        WHERE m.id = chat_message_reactions.message_id 
        AND public.is_chat_group_member(m.group_id, auth.uid())
    )
);

-- Reactions insertable strictly by group members for themselves
CREATE POLICY "Group members can add own reactions"
ON public.chat_message_reactions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.chat_messages m
        WHERE m.id = message_id 
        AND public.is_chat_group_member(m.group_id, auth.uid())
    )
);

-- Users can delete only their own reactions
CREATE POLICY "Users can remove own reaction"
ON public.chat_message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. EXTEND NOTIFICATIONS TYPES FOR CHAT EVENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.app_notifications DROP CONSTRAINT IF EXISTS app_notifications_type_check;
ALTER TABLE public.app_notifications ADD CONSTRAINT app_notifications_type_check CHECK (type IN (
    'follow',
    'like',
    'comment',
    'hangout_invite',
    'hangout_join',
    'hangout_vote',
    'hangout_finalized',
    'trip_share',
    'chat_message',
    'chat_mention',
    'chat_reply',
    'chat_invite'
));

-- ----------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION REGISTRATION
-- Enable Supabase Realtime replication for messaging, reactions, and reads
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_group_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_reads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Publication may not exist in pure local unit test environments
        NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 5. RPC: MARK CHAT GROUP READ
-- Updates member last_read_at timestamp safely under RLS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_chat_group_read(p_group_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := TIMEZONE('utc', NOW());
BEGIN
    UPDATE public.chat_group_members
    SET last_read_at = v_now
    WHERE group_id = p_group_id AND user_id = auth.uid();

    RETURN v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_chat_group_read(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPC: GET OR CREATE HANGOUT CHAT GROUP
-- Links a hangout to a dedicated chat group and adds members
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_hangout_chat(p_hangout_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_group_id UUID;
    v_hangout RECORD;
BEGIN
    -- Check if hangout exists and caller is a member
    SELECT * INTO v_hangout FROM public.hangout_groups WHERE id = p_hangout_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hangout not found';
    END IF;

    IF NOT public.is_hangout_member(p_hangout_id, auth.uid()) AND v_hangout.creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: not a hangout member';
    END IF;

    -- Check if chat group already exists for this hangout
    SELECT id INTO v_group_id FROM public.chat_groups WHERE hangout_id = p_hangout_id LIMIT 1;

    IF v_group_id IS NULL THEN
        -- Create new chat group
        INSERT INTO public.chat_groups (
            name,
            description,
            creator_id,
            hangout_id,
            is_direct
        ) VALUES (
            v_hangout.title,
            v_hangout.description,
            v_hangout.creator_id,
            p_hangout_id,
            false
        ) RETURNING id INTO v_group_id;

        -- Add all current hangout members to chat group
        INSERT INTO public.chat_group_members (group_id, user_id, role, last_read_at)
        SELECT 
            v_group_id, 
            m.user_id, 
            CASE WHEN m.user_id = v_hangout.creator_id THEN 'admin' ELSE 'member' END,
            TIMEZONE('utc', NOW())
        FROM public.hangout_group_members m
        WHERE m.hangout_id = p_hangout_id
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;

    RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_hangout_chat(UUID) TO authenticated;
