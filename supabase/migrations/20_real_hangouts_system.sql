-- ============================================================================
-- MILESTONE #8: REAL HANGOUTS & MEETUPS PRODUCTION ENGINE
-- File: supabase/migrations/20_real_hangouts_system.sql
-- ============================================================================

-- Ensure PostGIS extensions schema is accessible
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 1. TABLE: public.hangouts
CREATE TABLE IF NOT EXISTS public.hangouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) >= 3 AND char_length(title) <= 120),
    description TEXT CHECK (char_length(description) <= 2000),
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    place_name TEXT NOT NULL,
    place_address TEXT,
    coordinates extensions.geography(Point, 4326),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    max_travelers INT NOT NULL DEFAULT 6 CHECK (max_travelers >= 2 AND max_travelers <= 50),
    current_travelers_count INT NOT NULL DEFAULT 1 CHECK (current_travelers_count >= 1),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    join_policy TEXT NOT NULL DEFAULT 'open' CHECK (join_policy IN ('open', 'approval_required')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    cover_url TEXT,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_hangout_start_after_created CHECK (start_time > created_at),
    CONSTRAINT chk_hangout_end_after_start CHECK (end_time IS NULL OR end_time > start_time)
);

-- Indexes for fast discovery and geospatial queries
CREATE INDEX IF NOT EXISTS idx_hangouts_creator ON public.hangouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_hangouts_status_start ON public.hangouts(status, start_time ASC);
CREATE INDEX IF NOT EXISTS idx_hangouts_coords ON public.hangouts USING gist(coordinates);
CREATE INDEX IF NOT EXISTS idx_hangouts_conversation ON public.hangouts(conversation_id);

-- 2. TABLE: public.hangout_participants
CREATE TABLE IF NOT EXISTS public.hangout_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hangout_id UUID NOT NULL REFERENCES public.hangouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member', 'pending')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_hangout_participant UNIQUE (hangout_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hangout_participants_hangout ON public.hangout_participants(hangout_id);
CREATE INDEX IF NOT EXISTS idx_hangout_participants_user ON public.hangout_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_hangout_participants_role ON public.hangout_participants(role);

-- 3. TABLE: public.hangout_invitations
CREATE TABLE IF NOT EXISTS public.hangout_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hangout_id UUID NOT NULL REFERENCES public.hangouts(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_hangout_invitation UNIQUE (hangout_id, invitee_id),
    CONSTRAINT chk_no_self_invite CHECK (inviter_id <> invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_hangout_invitations_hangout ON public.hangout_invitations(hangout_id);
CREATE INDEX IF NOT EXISTS idx_hangout_invitations_invitee ON public.hangout_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_hangout_invitations_inviter ON public.hangout_invitations(inviter_id);

-- 4. NON-RECURSIVE SECURITY DEFINER HELPERS (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_hangout_participant(p_hangout_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.hangout_participants
        WHERE hangout_id = p_hangout_id
          AND user_id = p_user_id
          AND role IN ('organizer', 'member')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_hangout_creator(p_hangout_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.hangouts
        WHERE id = p_hangout_id
          AND creator_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_user_blocked(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.blocks
        WHERE (user_id = p_user_a AND blocked_id = p_user_b)
           OR (user_id = p_user_b AND blocked_id = p_user_a)
    );
$$;

-- 5. CONCURRENCY-SAFE CAPACITY TRIGGER
CREATE OR REPLACE FUNCTION public.sync_hangout_travelers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hangout_id UUID;
    v_max INT;
    v_count INT;
BEGIN
    v_hangout_id := COALESCE(NEW.hangout_id, OLD.hangout_id);

    -- Row-level lock on the hangout to serialize concurrent attendees
    SELECT max_travelers INTO v_max
    FROM public.hangouts
    WHERE id = v_hangout_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Count active travelers (organizer + members)
    SELECT COUNT(*) INTO v_count
    FROM public.hangout_participants
    WHERE hangout_id = v_hangout_id
      AND role IN ('organizer', 'member');

    -- Enforce capacity limit on insert or update
    IF TG_OP IN ('INSERT', 'UPDATE') AND v_count > v_max THEN
        RAISE EXCEPTION 'Hangout is at full capacity';
    END IF;

    -- Update canonical count
    UPDATE public.hangouts
    SET current_travelers_count = GREATEST(v_count, 1),
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = v_hangout_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_hangout_travelers_count ON public.hangout_participants;
CREATE TRIGGER trg_sync_hangout_travelers_count
AFTER INSERT OR UPDATE OR DELETE ON public.hangout_participants
FOR EACH ROW
EXECUTE FUNCTION public.sync_hangout_travelers_count();

-- 6. BI-DIRECTIONAL INVITATION BLOCK TRIGGER
CREATE OR REPLACE FUNCTION public.check_invitation_block_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_blocked BOOLEAN := FALSE;
BEGIN
    SELECT public.is_user_blocked(NEW.inviter_id, NEW.invitee_id) INTO v_blocked;

    IF v_blocked THEN
        RAISE EXCEPTION 'Cannot invite user: An active block exists between participants.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_invitation_block_status ON public.hangout_invitations;
CREATE TRIGGER trg_check_invitation_block_status
BEFORE INSERT ON public.hangout_invitations
FOR EACH ROW
EXECUTE FUNCTION public.check_invitation_block_status();

-- 7. STORAGE BUCKET: hangout-media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'hangout-media',
    'hangout-media',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Storage RLS Policies:
DROP POLICY IF EXISTS "Public Read Hangout Media" ON storage.objects;
CREATE POLICY "Public Read Hangout Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'hangout-media');

DROP POLICY IF EXISTS "Authenticated Upload Hangout Media" ON storage.objects;
CREATE POLICY "Authenticated Upload Hangout Media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'hangout-media'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "User Delete Own Hangout Media" ON storage.objects;
CREATE POLICY "User Delete Own Hangout Media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'hangout-media'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[2] = auth.uid()::text
    )
);

-- 8. ROW LEVEL SECURITY (RLS) ON HANGOUTS TABLES
ALTER TABLE public.hangouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_invitations ENABLE ROW LEVEL SECURITY;

-- Hangouts Select: Exclude blocked creators and enforce visibility
DROP POLICY IF EXISTS "Users can view accessible hangouts" ON public.hangouts;
CREATE POLICY "Users can view accessible hangouts"
ON public.hangouts FOR SELECT
USING (
    (auth.uid() IS NULL OR NOT public.is_user_blocked(auth.uid(), creator_id))
    AND (
        visibility = 'public'
        OR (auth.uid() IS NOT NULL AND (creator_id = auth.uid() OR public.is_hangout_participant(id, auth.uid())))
    )
);

-- Hangouts Insert: Creator must be authenticated
DROP POLICY IF EXISTS "Creators can insert hangouts" ON public.hangouts;
CREATE POLICY "Creators can insert hangouts"
ON public.hangouts FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Hangouts Update: Host only
DROP POLICY IF EXISTS "Creators can update hangouts" ON public.hangouts;
CREATE POLICY "Creators can update hangouts"
ON public.hangouts FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Hangouts Delete: Host only
DROP POLICY IF EXISTS "Creators can delete hangouts" ON public.hangouts;
CREATE POLICY "Creators can delete hangouts"
ON public.hangouts FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

-- Participants Select
DROP POLICY IF EXISTS "View hangout participants" ON public.hangout_participants;
CREATE POLICY "View hangout participants"
ON public.hangout_participants FOR SELECT
USING (
    auth.uid() IS NULL OR NOT public.is_user_blocked(auth.uid(), user_id)
);

-- Participants Insert: User self-join or organizer add
DROP POLICY IF EXISTS "Insert hangout participants" ON public.hangout_participants;
CREATE POLICY "Insert hangout participants"
ON public.hangout_participants FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR public.is_hangout_creator(hangout_id, auth.uid())
);

-- Participants Update: Self or organizer
DROP POLICY IF EXISTS "Update hangout participants" ON public.hangout_participants;
CREATE POLICY "Update hangout participants"
ON public.hangout_participants FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid() OR public.is_hangout_creator(hangout_id, auth.uid())
);

-- Participants Delete: Self leave or organizer kick
DROP POLICY IF EXISTS "Delete hangout participants" ON public.hangout_participants;
CREATE POLICY "Delete hangout participants"
ON public.hangout_participants FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR public.is_hangout_creator(hangout_id, auth.uid())
);

-- Invitations Select: Inviter or Invitee
DROP POLICY IF EXISTS "View hangout invitations" ON public.hangout_invitations;
CREATE POLICY "View hangout invitations"
ON public.hangout_invitations FOR SELECT
TO authenticated
USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- Invitations Insert: Inviter must be caller, no block
DROP POLICY IF EXISTS "Insert hangout invitations" ON public.hangout_invitations;
CREATE POLICY "Insert hangout invitations"
ON public.hangout_invitations FOR INSERT
TO authenticated
WITH CHECK (
    inviter_id = auth.uid()
    AND NOT public.is_user_blocked(auth.uid(), invitee_id)
);

-- Invitations Update: Invitee accept/decline or inviter cancel
DROP POLICY IF EXISTS "Update hangout invitations" ON public.hangout_invitations;
CREATE POLICY "Update hangout invitations"
ON public.hangout_invitations FOR UPDATE
TO authenticated
USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- Invitations Delete
DROP POLICY IF EXISTS "Delete hangout invitations" ON public.hangout_invitations;
CREATE POLICY "Delete hangout invitations"
ON public.hangout_invitations FOR DELETE
TO authenticated
USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- 9. STORED PROCEDURES (RPCs)

-- 9a. Atomic Create Hangout with Group Chat
CREATE OR REPLACE FUNCTION public.create_hangout(
    p_creator_id UUID,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_place_id UUID DEFAULT NULL,
    p_place_name TEXT DEFAULT 'Destination',
    p_place_address TEXT DEFAULT NULL,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_lng DOUBLE PRECISION DEFAULT NULL,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_timezone TEXT DEFAULT 'UTC',
    p_max_travelers INT DEFAULT 6,
    p_visibility TEXT DEFAULT 'public',
    p_join_policy TEXT DEFAULT 'open',
    p_cover_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_conv_id UUID;
    v_hangout_id UUID;
    v_geom extensions.geography(Point, 4326) := NULL;
    v_hangout RECORD;
BEGIN
    -- Validate title length
    IF char_length(trim(COALESCE(p_title, ''))) < 3 OR char_length(p_title) > 120 THEN
        RAISE EXCEPTION 'Title must be between 3 and 120 characters';
    END IF;

    -- Default start_time to 24 hours in future if omitted
    IF p_start_time IS NULL THEN
        v_start_time := TIMEZONE('utc', NOW()) + INTERVAL '1 day';
    ELSE
        v_start_time := p_start_time;
    END IF;

    -- Validate start_time > created_at
    IF v_start_time <= TIMEZONE('utc', NOW()) THEN
        RAISE EXCEPTION 'Start time must be in the future';
    END IF;

    -- Build spatial coordinates if passed
    IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        v_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography;
    END IF;

    -- 1. Provision linked group chat in public.conversations
    INSERT INTO public.conversations (type, title, direct_key)
    VALUES ('group', trim(p_title), NULL)
    RETURNING id INTO v_conv_id;

    -- 2. Enroll creator in group conversation
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, p_creator_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    -- 3. Insert canonical hangout record
    INSERT INTO public.hangouts (
        creator_id,
        title,
        description,
        place_id,
        place_name,
        place_address,
        coordinates,
        start_time,
        end_time,
        timezone,
        max_travelers,
        current_travelers_count,
        visibility,
        join_policy,
        status,
        cover_url,
        conversation_id
    ) VALUES (
        p_creator_id,
        trim(p_title),
        p_description,
        p_place_id,
        p_place_name,
        p_place_address,
        v_geom,
        v_start_time,
        p_end_time,
        COALESCE(p_timezone, 'UTC'),
        COALESCE(p_max_travelers, 6),
        1,
        COALESCE(p_visibility, 'public'),
        COALESCE(p_join_policy, 'open'),
        'active',
        p_cover_url,
        v_conv_id
    )
    RETURNING id INTO v_hangout_id;

    -- 4. Insert creator as organizer in hangout_participants
    INSERT INTO public.hangout_participants (hangout_id, user_id, role)
    VALUES (v_hangout_id, p_creator_id, 'organizer')
    ON CONFLICT (hangout_id, user_id) DO UPDATE SET role = 'organizer';

    -- Fetch and return full record
    SELECT * INTO v_hangout FROM public.hangouts WHERE id = v_hangout_id;

    RETURN to_jsonb(v_hangout);
END;
$$;

-- 9b. Join Hangout (with capacity, block, status, and conversation enrollment)
CREATE OR REPLACE FUNCTION public.join_hangout(
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
    v_is_blocked BOOLEAN;
    v_participant_id UUID;
BEGIN
    SELECT * INTO v_hangout
    FROM public.hangouts
    WHERE id = p_hangout_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hangout not found';
    END IF;

    IF v_hangout.status <> 'active' THEN
        RAISE EXCEPTION 'Cannot join hangout: status is %', v_hangout.status;
    END IF;

    IF v_hangout.start_time <= NOW() THEN
        RAISE EXCEPTION 'Cannot join past or ongoing hangout';
    END IF;

    -- Block verification
    SELECT public.is_user_blocked(v_hangout.creator_id, p_user_id) INTO v_is_blocked;
    IF v_is_blocked THEN
        RAISE EXCEPTION 'Action blocked due to safety restrictions';
    END IF;

    -- Capacity check before insert
    IF v_hangout.current_travelers_count >= v_hangout.max_travelers THEN
        RAISE EXCEPTION 'Hangout is at full capacity';
    END IF;

    -- Atomically insert participant
    INSERT INTO public.hangout_participants (hangout_id, user_id, role)
    VALUES (p_hangout_id, p_user_id, 'member')
    ON CONFLICT (hangout_id, user_id) DO UPDATE SET role = 'member'
    RETURNING id INTO v_participant_id;

    -- Enroll in linked group chat
    IF v_hangout.conversation_id IS NOT NULL THEN
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (v_hangout.conversation_id, p_user_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'hangout_id', p_hangout_id,
        'participant_id', v_participant_id,
        'role', 'member'
    );
END;
$$;

-- 9c. Leave Hangout
CREATE OR REPLACE FUNCTION public.leave_hangout(
    p_hangout_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT;
    v_conv_id UUID;
BEGIN
    SELECT role INTO v_role
    FROM public.hangout_participants
    WHERE hangout_id = p_hangout_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Participant not found in hangout';
    END IF;

    IF v_role = 'organizer' THEN
        RAISE EXCEPTION 'Organizer cannot leave the hangout. Cancel the hangout instead.';
    END IF;

    -- Remove from hangout_participants (trigger syncs current_travelers_count)
    DELETE FROM public.hangout_participants
    WHERE hangout_id = p_hangout_id AND user_id = p_user_id;

    -- Remove from linked group conversation
    SELECT conversation_id INTO v_conv_id FROM public.hangouts WHERE id = p_hangout_id;
    IF v_conv_id IS NOT NULL THEN
        DELETE FROM public.conversation_participants
        WHERE conversation_id = v_conv_id AND user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 9d. Invite User to Hangout
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

    SELECT * INTO v_hangout FROM public.hangouts WHERE id = p_hangout_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hangout not found';
    END IF;

    IF v_hangout.status <> 'active' THEN
        RAISE EXCEPTION 'Cannot invite to % hangout', v_hangout.status;
    END IF;

    IF v_hangout.current_travelers_count >= v_hangout.max_travelers THEN
        RAISE EXCEPTION 'Hangout is at full capacity';
    END IF;

    IF public.is_user_blocked(p_inviter_id, p_invitee_id) THEN
        RAISE EXCEPTION 'Cannot invite user: An active block exists between participants.';
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

-- 9e. Respond to Invitation (Accept / Decline)
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

        UPDATE public.hangout_invitations
        SET status = 'accepted', updated_at = TIMEZONE('utc', NOW())
        WHERE id = p_invitation_id;

        INSERT INTO public.hangout_participants (hangout_id, user_id, role)
        VALUES (v_inv.hangout_id, v_inv.invitee_id, 'member')
        ON CONFLICT (hangout_id, user_id) DO UPDATE SET role = 'member';

        IF v_hangout.conversation_id IS NOT NULL THEN
            INSERT INTO public.conversation_participants (conversation_id, user_id)
            VALUES (v_hangout.conversation_id, v_inv.invitee_id)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
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

-- 9f. Host-Only Hangout Cancellation
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
    v_creator_id UUID;
BEGIN
    SELECT creator_id INTO v_creator_id
    FROM public.hangouts
    WHERE id = p_hangout_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hangout not found';
    END IF;

    IF v_creator_id <> p_user_id THEN
        RAISE EXCEPTION 'Only the organizer can cancel this hangout';
    END IF;

    UPDATE public.hangouts
    SET status = 'cancelled',
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_hangout_id;

    RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

-- 9g. Discovery Query: Excludes Blocked Users
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
    SELECT COALESCE(jsonb_agg(h_row ORDER BY (h_row->>'start_time') ASC), '[]'::jsonb)
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
        WHERE (p_status IS NULL OR h.status = p_status)
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

-- 9h. User Hangouts Query
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
    SELECT COALESCE(jsonb_agg(h_row ORDER BY (h_row->>'start_time') ASC), '[]'::jsonb)
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

-- 10. REALTIME PUBLICATION REGISTRATION
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hangouts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_invitations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11. GRANT PERMISSIONS
GRANT ALL ON public.hangouts TO authenticated, anon, service_role;
GRANT ALL ON public.hangout_participants TO authenticated, anon, service_role;
GRANT ALL ON public.hangout_invitations TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.is_hangout_participant TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_hangout_creator TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_blocked TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.sync_hangout_travelers_count TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.check_invitation_block_status TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_hangout TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.join_hangout TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.leave_hangout TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.invite_to_hangout TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_invitation TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_hangout TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_discover_hangouts TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_hangouts TO authenticated, anon, service_role;
