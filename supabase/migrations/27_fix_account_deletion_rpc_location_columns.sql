-- ============================================================================
-- Migration: 27_fix_account_deletion_rpc_location_columns.sql
-- Description: Corrects schema mismatch in delete_user_account and
--              delete_user_account_by_admin functions for public.live_location_sessions.
--              Replaces non-existent 'user_id' column filter with fully qualified
--              'owner_user_id' and 'target_user_id' conditions.
--              Disambiguates parameter naming (p_target_user_id) and enforces
--              explicit table aliases across all deletion statements to eliminate
--              PL/pgSQL parameter collision and safely isolate unrelated sessions.
-- ============================================================================

DROP FUNCTION IF EXISTS public.delete_user_account();

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. Only authenticated users can delete their own account.';
    END IF;

    -- Schema-accurate cleanup on live_location_sessions (initiator or direct recipient)
    DELETE FROM public.live_location_sessions AS lls
    WHERE lls.owner_user_id = v_user_id
       OR lls.target_user_id = v_user_id;

    DELETE FROM public.active_location_shares AS als WHERE als.user_id = v_user_id;
    DELETE FROM public.user_privacy_settings AS ups WHERE ups.user_id = v_user_id;
    DELETE FROM public.user_notification_preferences AS unp WHERE unp.user_id = v_user_id;
    DELETE FROM public.user_blocks AS ub WHERE ub.blocker_user_id = v_user_id OR ub.blocked_user_id = v_user_id;
    DELETE FROM public.user_verifications AS uv WHERE uv.user_id = v_user_id;
    DELETE FROM public.verification_submissions AS vs WHERE vs.user_id = v_user_id;
    DELETE FROM public.emergency_contacts AS ec WHERE ec.user_id = v_user_id;
    DELETE FROM public.reports AS r WHERE r.reporter_id = v_user_id OR r.reported_id = v_user_id;
    DELETE FROM public.app_notifications AS an WHERE an.user_id = v_user_id;

    DELETE FROM public.users AS u WHERE u.id = v_user_id;
    DELETE FROM auth.users AS au WHERE au.id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account and associated database records deleted successfully.',
        'user_id', v_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Revoke all public privileges and grant execution exclusively to authenticated users
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

DROP FUNCTION IF EXISTS public.delete_user_account_by_admin(UUID);

CREATE OR REPLACE FUNCTION public.delete_user_account_by_admin(p_target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_target_user_id UUID;
BEGIN
    IF p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'p_target_user_id cannot be null.';
    END IF;

    v_target_user_id := p_target_user_id;

    -- Schema-accurate cleanup on live_location_sessions:
    -- Table aliases and local variable eliminate PL/pgSQL variable collision
    DELETE FROM public.live_location_sessions AS lls
    WHERE lls.owner_user_id = v_target_user_id
       OR lls.target_user_id = v_target_user_id;

    DELETE FROM public.active_location_shares AS als WHERE als.user_id = v_target_user_id;
    DELETE FROM public.user_privacy_settings AS ups WHERE ups.user_id = v_target_user_id;
    DELETE FROM public.user_notification_preferences AS unp WHERE unp.user_id = v_target_user_id;
    DELETE FROM public.user_blocks AS ub WHERE ub.blocker_user_id = v_target_user_id OR ub.blocked_user_id = v_target_user_id;
    DELETE FROM public.user_verifications AS uv WHERE uv.user_id = v_target_user_id;
    DELETE FROM public.verification_submissions AS vs WHERE vs.user_id = v_target_user_id;
    DELETE FROM public.emergency_contacts AS ec WHERE ec.user_id = v_target_user_id;
    DELETE FROM public.reports AS r WHERE r.reporter_id = v_target_user_id OR r.reported_id = v_target_user_id;
    DELETE FROM public.app_notifications AS an WHERE an.user_id = v_target_user_id;

    DELETE FROM public.users AS u WHERE u.id = v_target_user_id;
    DELETE FROM auth.users AS au WHERE au.id = v_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account and associated database records deleted successfully by admin.',
        'user_id', v_target_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Restrict delete_user_account_by_admin to service_role only
REVOKE ALL ON FUNCTION public.delete_user_account_by_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account_by_admin(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account_by_admin(UUID) TO service_role;
