-- ============================================================================
-- Prioritize block safety check before capacity in invite_to_hangout
-- ============================================================================

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

    INSERT INTO public.hangout_invitations (hangout_id, inviter_id, invitee_id, status)
    VALUES (p_hangout_id, p_inviter_id, p_invitee_id, 'pending')
    ON CONFLICT (hangout_id, invitee_id) DO UPDATE SET status = 'pending', updated_at = TIMEZONE('utc', NOW())
    RETURNING id INTO v_inv_id;

    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', v_inv_id,
        'status', 'pending'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_to_hangout TO authenticated, anon, service_role;
