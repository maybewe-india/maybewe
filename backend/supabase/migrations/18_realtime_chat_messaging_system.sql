-- ============================================================================
-- MAYBEWE MIGRATION 18: REAL-TIME CHAT & DIRECT MESSAGING SYSTEM
-- File: supabase/migrations/18_realtime_chat_messaging_system.sql
-- ============================================================================

-- 1. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    title TEXT,
    direct_key TEXT UNIQUE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_direct_key ON public.conversations(direct_key);

-- 2. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_conversation_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);

-- 3. SECURITY DEFINER HELPER: IS CONVERSATION PARTICIPANT (Eliminates RLS recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
    p_conv_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = p_conv_id AND user_id = p_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated, anon, service_role;

-- 4. MESSAGES TABLE (ENSURE SCHEMA & UPGRADE)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'match_id'
    ) THEN
        ALTER TABLE public.messages ALTER COLUMN match_id DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 5. MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_message_user_reaction UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_msg_reactions_msg ON public.message_reactions(message_id);

-- 6. TRIGGER: UPDATE CONVERSATION LAST_MESSAGE_AT
CREATE OR REPLACE FUNCTION public.sync_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE public.conversations
        SET last_message_at = NEW.created_at,
            updated_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conversation_last_message ON public.messages;
CREATE TRIGGER trg_sync_conversation_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_conversation_last_message();

-- 7. BI-DIRECTIONAL BLOCK ENFORCEMENT TRIGGER ON MESSAGES
CREATE OR REPLACE FUNCTION public.check_message_block_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_blocked BOOLEAN := FALSE;
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        -- Check if sender is blocked by ANY other participant in the conversation, or if sender blocked them
        SELECT EXISTS (
            SELECT 1
            FROM public.conversation_participants cp
            JOIN public.blocks b 
              ON (b.user_id = cp.user_id AND b.blocked_id = NEW.sender_id)
              OR (b.user_id = NEW.sender_id AND b.blocked_id = cp.user_id)
            WHERE cp.conversation_id = NEW.conversation_id
              AND cp.user_id <> NEW.sender_id
        ) INTO v_blocked;

        IF v_blocked THEN
            RAISE EXCEPTION 'Cannot send message: An active block is in place between participants.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_message_block_status ON public.messages;
CREATE TRIGGER trg_check_message_block_status
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.check_message_block_status();

-- 8. STORAGE BUCKET: chat-media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-media',
    'chat-media',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- Storage RLS Policies:
DROP POLICY IF EXISTS "Public or Participant Read Chat Media" ON storage.objects;
CREATE POLICY "Public or Participant Read Chat Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Participant Upload Chat Media" ON storage.objects;
CREATE POLICY "Participant Upload Chat Media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_conversation_participant((storage.foldername(name))[1]::uuid, auth.uid())
);

DROP POLICY IF EXISTS "Participant Delete Own Chat Media" ON storage.objects;
CREATE POLICY "Participant Delete Own Chat Media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 9. ROW LEVEL SECURITY (RLS) ON CHAT TABLES
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Conversations RLS:
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
    public.is_conversation_participant(id, auth.uid())
);

-- Conversation Participants RLS:
DROP POLICY IF EXISTS "Participants can view member lists" ON public.conversation_participants;
CREATE POLICY "Participants can view member lists"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (
    public.is_conversation_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own last_read_at" ON public.conversation_participants;
CREATE POLICY "Users can update their own last_read_at"
ON public.conversation_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Messages RLS:
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT
TO authenticated
USING (
    conversation_id IS NOT NULL AND public.is_conversation_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Participants can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IS NOT NULL
    AND public.is_conversation_participant(conversation_id, auth.uid())
);

-- Message Reactions RLS:
DROP POLICY IF EXISTS "Participants can view message reactions" ON public.message_reactions;
CREATE POLICY "Participants can view message reactions"
ON public.message_reactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = message_reactions.message_id
          AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Participants can react to messages" ON public.message_reactions;
CREATE POLICY "Participants can react to messages"
ON public.message_reactions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = message_reactions.message_id
          AND public.is_conversation_participant(m.conversation_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.message_reactions;
CREATE POLICY "Users can delete own reactions"
ON public.message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 10. STORED PROCEDURES / RPCS
-- 10A. GET OR CREATE DIRECT CONVERSATION
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
    p_user_a UUID,
    p_user_b UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_direct_key TEXT;
    v_conv_id UUID;
    v_is_blocked BOOLEAN := FALSE;
BEGIN
    IF p_user_a IS NULL OR p_user_b IS NULL OR p_user_a = p_user_b THEN
        RAISE EXCEPTION 'Invalid participant UUIDs for direct conversation';
    END IF;

    -- Bi-directional block check
    SELECT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (user_id = p_user_a AND blocked_id = p_user_b)
           OR (user_id = p_user_b AND blocked_id = p_user_a)
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
        RAISE EXCEPTION 'Cannot create conversation: An active block is in place between users';
    END IF;

    -- Canonical deterministic key
    v_direct_key := LEAST(p_user_a, p_user_b)::text || ':' || GREATEST(p_user_a, p_user_b)::text;

    -- Check existing
    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE direct_key = v_direct_key;

    IF v_conv_id IS NOT NULL THEN
        RETURN v_conv_id;
    END IF;

    -- Create new conversation atomically
    INSERT INTO public.conversations (type, direct_key)
    VALUES ('direct', v_direct_key)
    ON CONFLICT (direct_key) DO UPDATE
    SET updated_at = TIMEZONE('utc', NOW())
    RETURNING id INTO v_conv_id;

    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, p_user_a)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, p_user_b)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    RETURN v_conv_id;
END;
$$;

-- 10B. MARK CONVERSATION AS READ
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.conversation_participants
    SET last_read_at = TIMEZONE('utc', NOW())
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;

    RETURN TRUE;
END;
$$;

-- 10C. GET USER CONVERSATIONS (With unread count & block filtering)
CREATE OR REPLACE FUNCTION public.get_user_conversations(
    p_user_id UUID
)
RETURNS TABLE (
    conversation_id UUID,
    type TEXT,
    title TEXT,
    last_message_at TIMESTAMPTZ,
    other_user_id UUID,
    other_user_name TEXT,
    other_user_avatar TEXT,
    last_message_content TEXT,
    last_message_sender_id UUID,
    unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH my_convs AS (
        SELECT cp.conversation_id, cp.last_read_at
        FROM public.conversation_participants cp
        WHERE cp.user_id = p_user_id
    ),
    partner_info AS (
        SELECT 
            cp2.conversation_id,
            cp2.user_id AS p_id,
            COALESCE(u.name, 'Traveler')::TEXT AS p_name,
            u.avatar_url::TEXT AS p_avatar
        FROM public.conversation_participants cp2
        JOIN public.users u ON u.id = cp2.user_id
        WHERE cp2.user_id <> p_user_id
    ),
    latest_messages AS (
        SELECT DISTINCT ON (m.conversation_id)
            m.conversation_id,
            m.content,
            m.media_url,
            m.sender_id
        FROM public.messages m
        WHERE m.conversation_id IS NOT NULL
        ORDER BY m.conversation_id, m.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            m.conversation_id,
            COUNT(m.id) AS cnt
        FROM public.messages m
        JOIN my_convs mc ON mc.conversation_id = m.conversation_id
        WHERE m.created_at > mc.last_read_at
          AND m.sender_id <> p_user_id
        GROUP BY m.conversation_id
    )
    SELECT 
        c.id AS conversation_id,
        c.type,
        c.title,
        c.last_message_at,
        pi.p_id AS other_user_id,
        pi.p_name AS other_user_name,
        pi.p_avatar AS other_user_avatar,
        COALESCE(lm.content, CASE WHEN lm.media_url IS NOT NULL THEN '📷 Photo' ELSE '' END)::TEXT AS last_message_content,
        lm.sender_id AS last_message_sender_id,
        COALESCE(uc.cnt, 0)::BIGINT AS unread_count
    FROM public.conversations c
    JOIN my_convs mc ON mc.conversation_id = c.id
    LEFT JOIN partner_info pi ON pi.conversation_id = c.id
    LEFT JOIN latest_messages lm ON lm.conversation_id = c.id
    LEFT JOIN unread_counts uc ON uc.conversation_id = c.id
    WHERE 
        -- Bi-directional block exclusion:
        (
            pi.p_id IS NULL OR (
                NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.user_id = p_user_id AND b.blocked_id = pi.p_id)
                AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.user_id = pi.p_id AND b.blocked_id = p_user_id)
            )
        )
    ORDER BY c.last_message_at DESC;
END;
$$;

-- 11. GRANTS
GRANT ALL ON TABLE public.conversations TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.conversation_participants TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.messages TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.message_reactions TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(UUID) TO authenticated, anon, service_role;
