-- ============================================================================
-- Fix: get_discover_hangouts and get_user_hangouts record ordering
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_discover_hangouts(
    p_viewer_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_results JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(h_row) ORDER BY h_row.start_time ASC), '[]'::jsonb)
    INTO v_results
    FROM (
        SELECT 
            h.id,
            h.creator_id,
            h.title,
            h.description,
            h.place_id,
            h.place_name,
            h.place_address,
            h.start_time,
            h.end_time,
            h.timezone,
            h.max_travelers,
            h.current_travelers_count,
            h.visibility,
            h.join_policy,
            h.status,
            h.cover_url,
            h.conversation_id,
            h.created_at,
            jsonb_build_object(
                'id', u.id,
                'name', u.name,
                'avatar_url', u.avatar_url,
                'trust_score', u.trust_score
            ) AS creator,
            (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', hp.id,
                    'user_id', hp.user_id,
                    'role', hp.role,
                    'name', pu.name,
                    'avatar_url', pu.avatar_url
                )), '[]'::jsonb)
                FROM public.hangout_participants hp
                JOIN public.users pu ON pu.id = hp.user_id
                WHERE hp.hangout_id = h.id
            ) AS participants
        FROM public.hangouts h
        JOIN public.users u ON u.id = h.creator_id
        WHERE (p_status IS NULL OR p_status = 'all' OR h.status = p_status)
          AND (
            p_viewer_id IS NULL OR NOT public.is_user_blocked(p_viewer_id, h.creator_id)
          )
          AND (
            h.visibility = 'public' 
            OR (p_viewer_id IS NOT NULL AND (h.creator_id = p_viewer_id OR public.is_hangout_participant(h.id, p_viewer_id)))
          )
    ) h_row;

    RETURN v_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_hangouts(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_results JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(h_row) ORDER BY h_row.start_time ASC), '[]'::jsonb)
    INTO v_results
    FROM (
        SELECT 
            h.id,
            h.creator_id,
            h.title,
            h.description,
            h.place_id,
            h.place_name,
            h.place_address,
            h.start_time,
            h.end_time,
            h.timezone,
            h.max_travelers,
            h.current_travelers_count,
            h.visibility,
            h.join_policy,
            h.status,
            h.cover_url,
            h.conversation_id,
            h.created_at,
            hp_self.role AS viewer_role,
            jsonb_build_object(
                'id', u.id,
                'name', u.name,
                'avatar_url', u.avatar_url,
                'trust_score', u.trust_score
            ) AS creator,
            (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', hp.id,
                    'user_id', hp.user_id,
                    'role', hp.role,
                    'name', pu.name,
                    'avatar_url', pu.avatar_url
                )), '[]'::jsonb)
                FROM public.hangout_participants hp
                JOIN public.users pu ON pu.id = hp.user_id
                WHERE hp.hangout_id = h.id
            ) AS participants
        FROM public.hangouts h
        JOIN public.hangout_participants hp_self ON hp_self.hangout_id = h.id AND hp_self.user_id = p_user_id
        JOIN public.users u ON u.id = h.creator_id
        WHERE NOT public.is_user_blocked(p_user_id, h.creator_id)
    ) h_row;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_discover_hangouts TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_hangouts TO authenticated, anon, service_role;
