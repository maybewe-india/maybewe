-- ============================================================================
-- MILESTONE #8: HANGOUT DATABASE-DRIVEN NOTIFICATIONS INTEGRATION
-- File: supabase/migrations/23_hangout_database_notifications.sql
-- ============================================================================

-- 1. Ensure recipient_id exists on public.app_notifications
ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
UPDATE public.app_notifications SET recipient_id = user_id WHERE recipient_id IS NULL;

-- Trigger to keep user_id and recipient_id in sync
CREATE OR REPLACE FUNCTION public.sync_notification_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.recipient_id := COALESCE(NEW.recipient_id, NEW.user_id);
    NEW.user_id := COALESCE(NEW.user_id, NEW.recipient_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_notification_recipient ON public.app_notifications;
CREATE TRIGGER trg_sync_notification_recipient
BEFORE INSERT OR UPDATE ON public.app_notifications
FOR EACH ROW
EXECUTE FUNCTION public.sync_notification_recipient();

-- 2. Update allowed types constraint on app_notifications
ALTER TABLE public.app_notifications DROP CONSTRAINT IF EXISTS app_notifications_type_check;
ALTER TABLE public.app_notifications ADD CONSTRAINT app_notifications_type_check CHECK (type IN (
    'chat_message',
    'new_message',
    'chat_reply',
    'chat_mention',
    'chat_invite',
    'match_request',
    'connection_accepted',
    'hangout_invitation',
    'hangout_invitation_accepted',
    'hangout_cancelled',
    'hangout_invite',
    'hangout_join',
    'hangout_vote',
    'hangout_finalized',
    'hangout_schedule_update',
    'place_suggestion',
    'trip_collaboration',
    'trip_share',
    'post_interaction',
    'like',
    'comment',
    'follow',
    'review_trust',
    'live_location'
));

-- 3. RLS Policies on app_notifications
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own notifications" ON public.app_notifications;
CREATE POLICY "Users can read their own notifications"
ON public.app_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Authenticated users can create notifications for others" ON public.app_notifications;
CREATE POLICY "Authenticated users can create notifications for others"
ON public.app_notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id OR auth.uid() = user_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.app_notifications;
CREATE POLICY "Users can update their own notifications"
ON public.app_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.app_notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.app_notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

-- 4. Create public.notifications alias view with security_invoker = true
CREATE OR REPLACE VIEW public.notifications 
WITH (security_invoker = true)
AS 
SELECT 
    id,
    user_id,
    recipient_id,
    actor_id,
    type,
    entity_id,
    title,
    message,
    data,
    is_read,
    created_at
FROM public.app_notifications;

-- 5. Authoritative Notification Integration in invite_to_hangout
CREATE OR REPLACE FUNCTION public.invite_to_hangout(
    p_hangout_id UUID,
    p_inviter_id UUID,
    p_invitee_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hangout RECORD;
    v_inv_id UUID;
    v_inviter_name TEXT;
BEGIN
    IF p_inviter_id = p_invitee_id THEN
        RAISE EXCEPTION 'Cannot invite yourself';
    END IF;

    -- 1. Prioritize Bi-Directional Block Safety Check
    IF public.is_user_blocked(p_inviter_id, p_invitee_id) THEN
        RAISE EXCEPTION 'Cannot invite user: An active block exists between participants.';
    END IF;

    SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hangout not found';
    END IF;

    IF v_hangout.status <> 'active' THEN
        RAISE EXCEPTION 'Cannot invite to % hangout', v_hangout.status;
    END IF;

    -- 2. Capacity Check
    IF v_hangout.current_travelers_count >= v_hangout.max_travelers THEN
        RAISE EXCEPTION 'Hangout is at full capacity';
    END IF;

    -- 3. Upsert Invitation
    INSERT INTO public.hangout_invitations (hangout_id, inviter_id, invitee_id, status)
    VALUES (p_hangout_id, p_inviter_id, p_invitee_id, 'pending')
    ON CONFLICT (hangout_id, invitee_id) DO UPDATE SET status = 'pending', updated_at = TIMEZONE('utc', NOW())
    RETURNING id INTO v_inv_id;

    -- 4. Authoritative Database-Driven Notification (with Deduplication & Block Safety)
    SELECT COALESCE(name, 'Traveler') INTO v_inviter_name FROM public.users WHERE id = p_inviter_id;

    IF NOT public.is_user_blocked(p_inviter_id, p_invitee_id) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.app_notifications
            WHERE (user_id = p_invitee_id OR recipient_id = p_invitee_id)
              AND entity_id = p_hangout_id
              AND type = 'hangout_invitation'
        ) THEN
            INSERT INTO public.app_notifications (
                user_id,
                recipient_id,
                actor_id,
                type,
                entity_id,
                title,
                message,
                data,
                is_read,
                created_at
            ) VALUES (
                p_invitee_id,
                p_invitee_id,
                p_inviter_id,
                'hangout_invitation',
                p_hangout_id,
                'Hangout Invitation',
                v_inviter_name || ' invited you to "' || v_hangout.title || '" in ' || v_hangout.place_name,
                jsonb_build_object(
                    'hangout_id', p_hangout_id,
                    'invitation_id', v_inv_id,
                    'title', v_hangout.title,
                    'place_name', v_hangout.place_name
                ),
                false,
                TIMEZONE('utc', NOW())
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', v_inv_id,
        'status', 'pending'
    );
END;
$$;

-- 6. Authoritative Notification Integration in respond_to_invitation
CREATE OR REPLACE FUNCTION public.respond_to_invitation(
    p_invitation_id UUID,
    p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv RECORD;
    v_hangout RECORD;
    v_invitee_name TEXT;
BEGIN
    SELECT * INTO v_inv
    FROM public.hangout_invitations
    WHERE id = p_invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    IF v_inv.status <> 'pending' THEN
        RAISE EXCEPTION 'Invitation is no longer pending (current status: %)', v_inv.status;
    END IF;

    IF p_action = 'accept' THEN
        SELECT * INTO v_hangout
        FROM public.hangouts
        WHERE id = v_inv.hangout_id;

        IF v_hangout.status <> 'active' THEN
            RAISE EXCEPTION 'Cannot accept invitation: hangout is %', v_hangout.status;
        END IF;

        IF v_hangout.current_travelers_count >= v_hangout.max_travelers THEN
            RAISE EXCEPTION 'Hangout is at full capacity';
        END IF;

        -- Update invitation
        UPDATE public.hangout_invitations
        SET status = 'accepted', updated_at = TIMEZONE('utc', NOW())
        WHERE id = p_invitation_id;

        -- Enroll participant
        INSERT INTO public.hangout_participants (hangout_id, user_id, role)
        VALUES (v_inv.hangout_id, v_inv.invitee_id, 'member')
        ON CONFLICT (hangout_id, user_id) DO UPDATE SET role = 'member';

        -- Enroll in conversation
        IF v_hangout.conversation_id IS NOT NULL THEN
            INSERT INTO public.conversation_participants (conversation_id, user_id)
            VALUES (v_hangout.conversation_id, v_inv.invitee_id)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;

        -- Authoritative Database-Driven Notification to Host (User A)
        SELECT COALESCE(name, 'Traveler') INTO v_invitee_name FROM public.users WHERE id = v_inv.invitee_id;

        IF NOT public.is_user_blocked(v_hangout.creator_id, v_inv.invitee_id) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.app_notifications
                WHERE (user_id = v_hangout.creator_id OR recipient_id = v_hangout.creator_id)
                  AND entity_id = v_hangout.id
                  AND actor_id = v_inv.invitee_id
                  AND type = 'hangout_invitation_accepted'
            ) THEN
                INSERT INTO public.app_notifications (
                    user_id,
                    recipient_id,
                    actor_id,
                    type,
                    entity_id,
                    title,
                    message,
                    data,
                    is_read,
                    created_at
                ) VALUES (
                    v_hangout.creator_id,
                    v_hangout.creator_id,
                    v_inv.invitee_id,
                    'hangout_invitation_accepted',
                    v_hangout.id,
                    'Invitation Accepted',
                    v_invitee_name || ' accepted your invitation to "' || v_hangout.title || '"',
                    jsonb_build_object(
                        'hangout_id', v_hangout.id,
                        'user_id', v_inv.invitee_id,
                        'title', v_hangout.title
                    ),
                    false,
                    TIMEZONE('utc', NOW())
                );
            END IF;
        END IF;

        RETURN jsonb_build_object('success', true, 'status', 'accepted');
    ELSIF p_action = 'decline' THEN
        UPDATE public.hangout_invitations
        SET status = 'declined', updated_at = TIMEZONE('utc', NOW())
        WHERE id = p_invitation_id;

        RETURN jsonb_build_object('success', true, 'status', 'declined');
    ELSE
        RAISE EXCEPTION 'Invalid action: % (must be accept or decline)', p_action;
    END IF;
END;
$$;

-- 7. Authoritative Notification Integration in cancel_hangout
CREATE OR REPLACE FUNCTION public.cancel_hangout(
    p_hangout_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hangout RECORD;
    v_member RECORD;
BEGIN
    SELECT * INTO v_hangout
    FROM public.hangouts
    WHERE id = p_hangout_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hangout not found';
    END IF;

    IF v_hangout.creator_id <> p_user_id THEN
        RAISE EXCEPTION 'Only the organizer can cancel this hangout';
    END IF;

    -- Update status
    UPDATE public.hangouts
    SET status = 'cancelled',
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_hangout_id;

    -- Authoritative Database-Driven Notification to All Accepted Attendees
    FOR v_member IN (
        SELECT user_id 
        FROM public.hangout_participants
        WHERE hangout_id = p_hangout_id
          AND user_id <> p_user_id
          AND role IN ('member', 'organizer')
    ) LOOP
        IF NOT public.is_user_blocked(p_user_id, v_member.user_id) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.app_notifications
                WHERE (user_id = v_member.user_id OR recipient_id = v_member.user_id)
                  AND entity_id = p_hangout_id
                  AND type = 'hangout_cancelled'
            ) THEN
                INSERT INTO public.app_notifications (
                    user_id,
                    recipient_id,
                    actor_id,
                    type,
                    entity_id,
                    title,
                    message,
                    data,
                    is_read,
                    created_at
                ) VALUES (
                    v_member.user_id,
                    v_member.user_id,
                    p_user_id,
                    'hangout_cancelled',
                    p_hangout_id,
                    'Hangout Cancelled',
                    'The meetup "' || v_hangout.title || '" has been cancelled by the host.',
                    jsonb_build_object(
                        'hangout_id', p_hangout_id,
                        'title', v_hangout.title
                    ),
                    false,
                    TIMEZONE('utc', NOW())
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

-- 8. Realtime publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Grants
GRANT ALL ON public.app_notifications TO authenticated, anon, service_role;
GRANT ALL ON public.notifications TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.invite_to_hangout TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_invitation TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_hangout TO authenticated, anon, service_role;
