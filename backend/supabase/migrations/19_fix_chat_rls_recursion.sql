-- ============================================================================
-- MAYBEWE MIGRATION 19: FIX CHAT RLS RECURSION VIA SECURITY DEFINER HELPER
-- File: supabase/migrations/19_fix_chat_rls_recursion.sql
-- ============================================================================

-- 1. SECURITY DEFINER HELPER: IS CONVERSATION PARTICIPANT (Eliminates RLS recursion)
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

-- 2. RECREATE CONVERSATIONS RLS
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
    public.is_conversation_participant(id, auth.uid())
);

-- 3. RECREATE CONVERSATION PARTICIPANTS RLS
DROP POLICY IF EXISTS "Participants can view member lists" ON public.conversation_participants;
CREATE POLICY "Participants can view member lists"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (
    public.is_conversation_participant(conversation_id, auth.uid())
);

-- 4. RECREATE MESSAGES RLS
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

-- 5. RECREATE STORAGE RLS ON CHAT-MEDIA
DROP POLICY IF EXISTS "Participant Upload Chat Media" ON storage.objects;
CREATE POLICY "Participant Upload Chat Media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_conversation_participant((storage.foldername(name))[1]::uuid, auth.uid())
);
