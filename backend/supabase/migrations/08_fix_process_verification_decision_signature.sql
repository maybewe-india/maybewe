-- ============================================================================
-- 08_fix_process_verification_decision_signature.sql
-- Safely transitions process_verification_decision RPC from custom enum parameter
-- to TEXT parameter to support PostgREST JSON-RPC dispatch without ambiguity.
-- ============================================================================

-- 1. Drop the legacy enum-signature function to prevent ambiguous overloads
DROP FUNCTION IF EXISTS public.process_verification_decision(UUID, verification_status_type, TEXT);

-- 2. Create the exact single replacement function with TEXT parameter & internal enum cast
CREATE OR REPLACE FUNCTION public.process_verification_decision(
    p_user_id UUID,
    p_status TEXT,
    p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_status verification_status_type;
    v_verified_at TIMESTAMPTZ := NULL;
    v_updated_user UUID;
BEGIN
    -- Only allow verified, failed, or rejected decisions
    IF p_status NOT IN ('verified', 'failed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid verification decision status: %. Must be verified, failed, or rejected.', p_status;
    END IF;

    v_status := p_status::verification_status_type;

    IF v_status = 'verified'::verification_status_type THEN
        v_verified_at := TIMEZONE('utc', NOW());
    END IF;

    -- 1. Update private user_verifications record
    UPDATE public.user_verifications
    SET 
        status = v_status,
        reviewed_at = TIMEZONE('utc', NOW())
    WHERE user_id = p_user_id;

    -- 2. Update public users table verification_status and verified_at
    UPDATE public.users
    SET 
        verification_status = v_status,
        verified_at = v_verified_at
    WHERE id = p_user_id
    RETURNING id INTO v_updated_user;

    IF v_updated_user IS NULL THEN
        RAISE EXCEPTION 'User with ID % not found.', p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'status', p_status,
        'verified_at', v_verified_at
    );
END;
$$;

-- 3. Security hardening: Revoke execution from public, anon, and authenticated.
-- Only service_role can execute this trusted decision RPC.
REVOKE ALL ON FUNCTION public.process_verification_decision(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_verification_decision(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.process_verification_decision(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_verification_decision(UUID, TEXT, TEXT) TO service_role;
