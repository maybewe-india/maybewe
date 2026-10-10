-- ============================================================================
-- Migration: 09_account_deletion.sql
-- Description: Provides secure, atomic, user-initiated account deletion RPC.
-- Enforces:
--   1. Only the authenticated caller (auth.uid()) can delete their own account.
--   2. Storage objects are managed via the Supabase Storage API (not direct table deletes).
--   3. Database records cascade delete across all user tables.
--   4. auth.users record is permanently removed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Identify the authenticated caller from verified JWT
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. Only authenticated users can delete their own account.';
    END IF;

    -- 2. Explicit cleanup of user-specific operational tables before cascading
    DELETE FROM public.live_location_sessions WHERE user_id = v_user_id;
    DELETE FROM public.active_location_shares WHERE user_id = v_user_id;
    DELETE FROM public.user_privacy_settings WHERE user_id = v_user_id;
    DELETE FROM public.user_notification_preferences WHERE user_id = v_user_id;
    DELETE FROM public.user_blocks WHERE blocker_user_id = v_user_id OR blocked_user_id = v_user_id;
    DELETE FROM public.user_verifications WHERE user_id = v_user_id;
    DELETE FROM public.app_notifications WHERE user_id = v_user_id;

    -- 3. Delete from public.users (triggers foreign key cascades across trips, posts, chats, etc.)
    DELETE FROM public.users WHERE id = v_user_id;

    -- 4. Delete from auth.users (permanently removes login identity and credentials)
    DELETE FROM auth.users WHERE id = v_user_id;

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

-- Admin helper RPC for Edge Function deletion flow
CREATE OR REPLACE FUNCTION public.delete_user_account_by_admin(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'target_user_id cannot be null.';
    END IF;

    -- 1. Explicit cleanup of user-specific operational tables
    DELETE FROM public.live_location_sessions WHERE user_id = target_user_id;
    DELETE FROM public.active_location_shares WHERE user_id = target_user_id;
    DELETE FROM public.user_privacy_settings WHERE user_id = target_user_id;
    DELETE FROM public.user_notification_preferences WHERE user_id = target_user_id;
    DELETE FROM public.user_blocks WHERE blocker_user_id = target_user_id OR blocked_user_id = target_user_id;
    DELETE FROM public.user_verifications WHERE user_id = target_user_id;
    DELETE FROM public.app_notifications WHERE user_id = target_user_id;

    -- 2. Delete from public.users
    DELETE FROM public.users WHERE id = target_user_id;

    -- 3. Delete from auth.users
    DELETE FROM auth.users WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Account and associated database records deleted successfully by admin.',
        'user_id', target_user_id
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
