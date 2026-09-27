-- ============================================================================
-- MAYBEWE — DATABASE SCHEMA MIGRATION: 03_feature_foundation.sql
-- Modules:
--   1. Trip Planner (trip_days, trip_activities, saved_trips)
--   2. Place Discovery & Budget-Based Filtering (places, place_categories, place_category_mappings, place_images)
--   3. Hangout Planning (hangout_groups, hangout_group_members, hangout_place_suggestions, hangout_votes, hangout_schedules)
--   4. Profile Posts & Social Graph (posts, post_media, post_likes, post_saves, follows)
--   5. Group Chat (chat_groups, chat_group_members, chat_messages, chat_message_reads)
--   6. Live Location Coordination (active_location_shares)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND EXISTING TRIPS TABLE (Migration-safe backward compatibility)
-- ----------------------------------------------------------------------------
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(10, 2) CHECK (estimated_budget IS NULL OR estimated_budget >= 0),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR' NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. PLACE DISCOVERY & BUDGET-BASED FILTERING
-- ----------------------------------------------------------------------------

-- Place Categories (Heritage, Beaches, Treks, Cafes, Spiritual, etc.)
CREATE TABLE IF NOT EXISTS public.place_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Places Table with strict budget bounds and India-first localization
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    destination TEXT NOT NULL,
    state TEXT,
    description TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    address TEXT,
    min_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (min_price >= 0),
    max_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (max_price >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
    review_count INT DEFAULT 0 CHECK (review_count >= 0) NOT NULL,
    highlights TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    best_time_to_visit TEXT,
    opening_hours TEXT,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_place_price_range CHECK (max_price >= min_price)
);

-- Place Category Mappings (M:N junction)
CREATE TABLE IF NOT EXISTS public.place_category_mappings (
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.place_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (place_id, category_id)
);

-- Place Images (Curated galleries for visual discovery)
CREATE TABLE IF NOT EXISTS public.place_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    is_cover BOOLEAN DEFAULT false NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. TRIP PLANNER & ITINERARY MODEL
-- ----------------------------------------------------------------------------

-- Trip Days / Itinerary Days
CREATE TABLE IF NOT EXISTS public.trip_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    day_number INT NOT NULL CHECK (day_number >= 1),
    date DATE,
    title TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_trip_day_number UNIQUE (trip_id, day_number)
);

-- Trip Activities (Planned stops, landmarks, budget, timings)
CREATE TABLE IF NOT EXISTS public.trip_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_day_id UUID NOT NULL REFERENCES public.trip_days(id) ON DELETE CASCADE,
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    time_slot TEXT CHECK (time_slot IS NULL OR time_slot IN ('morning', 'afternoon', 'evening', 'night')),
    start_time TIME,
    end_time TIME,
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00 CHECK (estimated_cost >= 0) NOT NULL,
    currency TEXT DEFAULT 'INR' NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_activity_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

-- Saved / Bookmarked Trips
CREATE TABLE IF NOT EXISTS public.saved_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_user_saved_trip UNIQUE (user_id, trip_id)
);

-- ----------------------------------------------------------------------------
-- 4. HANGOUT PLANNING
-- ----------------------------------------------------------------------------

-- Hangout Groups (Spontaneous meetups in destinations)
CREATE TABLE IF NOT EXISTS public.hangout_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'scheduled', 'completed', 'cancelled')),
    target_date DATE,
    target_time TIME,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Hangout Members
CREATE TABLE IF NOT EXISTS public.hangout_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hangout_id UUID NOT NULL REFERENCES public.hangout_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
    status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('invited', 'joined', 'declined', 'left')),
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_hangout_member UNIQUE (hangout_id, user_id)
);

-- Hangout Place Suggestions (Collaborative voting on places to go)
CREATE TABLE IF NOT EXISTS public.hangout_place_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hangout_id UUID NOT NULL REFERENCES public.hangout_groups(id) ON DELETE CASCADE,
    suggested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    custom_place_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_hangout_suggestion_place CHECK (place_id IS NOT NULL OR (custom_place_name IS NOT NULL AND length(trim(custom_place_name)) > 0))
);

-- Hangout Votes (+1 upvote or -1 downvote per member per suggestion)
CREATE TABLE IF NOT EXISTS public.hangout_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES public.hangout_place_suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vote_value INT NOT NULL DEFAULT 1 CHECK (vote_value IN (-1, 1)),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_hangout_vote UNIQUE (suggestion_id, user_id)
);

-- Hangout Schedule / Finalized Plans
CREATE TABLE IF NOT EXISTS public.hangout_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hangout_id UUID NOT NULL REFERENCES public.hangout_groups(id) ON DELETE CASCADE,
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    activity_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    meeting_point TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_hangout_schedule_times CHECK (end_time IS NULL OR end_time >= start_time)
);

-- ----------------------------------------------------------------------------
-- 5. PROFILE POSTS & SOCIAL GRAPH
-- ----------------------------------------------------------------------------

-- Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    destination TEXT,
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    like_count INT DEFAULT 0 CHECK (like_count >= 0) NOT NULL,
    save_count INT DEFAULT 0 CHECK (save_count >= 0) NOT NULL,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Post Media (Photos / Videos)
CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Post Likes (Prevents duplicate likes)
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_post_like UNIQUE (post_id, user_id)
);

-- Post Saves / Bookmarks (Prevents duplicate saves)
CREATE TABLE IF NOT EXISTS public.post_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    collection_name TEXT DEFAULT 'Saved' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_post_save UNIQUE (post_id, user_id)
);

-- Follows / Social Graph (Prevents self-follow and duplicate follows)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_follow_pair UNIQUE (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

-- ----------------------------------------------------------------------------
-- 6. GROUP CHAT & REALTIME MESSAGING
-- ----------------------------------------------------------------------------

-- Chat Groups (Hangout chats, trip chats, or general travel circles)
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hangout_id UUID REFERENCES public.hangout_groups(id) ON DELETE SET NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    is_direct BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Chat Group Members (Tracks membership and per-user read watermark)
CREATE TABLE IF NOT EXISTS public.chat_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    last_read_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_chat_group_member UNIQUE (group_id, user_id)
);

-- Chat Messages (Supports text, image, place sharing, trip sharing, and location coordinates)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location_share', 'place_share', 'trip_share', 'system')),
    shared_place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    shared_trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS public.chat_message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT uq_chat_message_read UNIQUE (message_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 7. EPHEMERAL ACTIVE LOCATION SHARING
-- (Strictly decoupled from public.users to ensure user location privacy)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.active_location_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chat_group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_location_target CHECK (chat_group_id IS NOT NULL OR match_id IS NOT NULL)
);

-- ============================================================================
-- 8. INDEXES FOR HIGH-PERFORMANCE DISCOVERY & FILTERING
-- ============================================================================

-- Places & Budget Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_places_destination ON public.places(destination);
CREATE INDEX IF NOT EXISTS idx_places_budget_range ON public.places(min_price, max_price, currency);
CREATE INDEX IF NOT EXISTS idx_places_min_price ON public.places(min_price);
CREATE INDEX IF NOT EXISTS idx_places_max_price ON public.places(max_price);
CREATE INDEX IF NOT EXISTS idx_places_rating ON public.places(rating DESC);
CREATE INDEX IF NOT EXISTS idx_place_categories_slug ON public.place_categories(slug);
CREATE INDEX IF NOT EXISTS idx_place_category_mappings_cat ON public.place_category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_place_images_place_id ON public.place_images(place_id);

-- Trip Planner Indexes
CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id ON public.trip_days(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_trip_activities_day_id ON public.trip_activities(trip_day_id, order_index);
CREATE INDEX IF NOT EXISTS idx_trip_activities_place_id ON public.trip_activities(place_id);
CREATE INDEX IF NOT EXISTS idx_saved_trips_user_id ON public.saved_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trips_trip_id ON public.saved_trips(trip_id);

-- Hangout Planning Indexes
CREATE INDEX IF NOT EXISTS idx_hangout_groups_destination ON public.hangout_groups(destination, target_date);
CREATE INDEX IF NOT EXISTS idx_hangout_groups_creator ON public.hangout_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_hangout_group_members_user ON public.hangout_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hangout_group_members_group ON public.hangout_group_members(hangout_id);
CREATE INDEX IF NOT EXISTS idx_hangout_suggestions_hangout ON public.hangout_place_suggestions(hangout_id);
CREATE INDEX IF NOT EXISTS idx_hangout_votes_suggestion ON public.hangout_votes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_hangout_schedules_hangout ON public.hangout_schedules(hangout_id, start_time);

-- Posts & Social Graph Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_destination ON public.posts(destination);
CREATE INDEX IF NOT EXISTS idx_posts_place_id ON public.posts(place_id);
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id, display_order);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_user ON public.post_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- Chat Indexes
CREATE INDEX IF NOT EXISTS idx_chat_groups_creator ON public.chat_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON public.chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group ON public.chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created ON public.chat_messages(group_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_active_location_shares_group ON public.active_location_shares(chat_group_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_active_location_shares_match ON public.active_location_shares(match_id, expires_at);

-- ============================================================================
-- 9. HELPER FUNCTIONS FOR CLEAN RLS MEMBERSHIP CHECKS
-- ============================================================================

-- Function to check if a user is an active member of a chat group (avoids RLS self-recursion)
CREATE OR REPLACE FUNCTION public.is_chat_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
$$;

-- Function to check if a user is an active member of a hangout group (avoids RLS self-recursion)
CREATE OR REPLACE FUNCTION public.is_hangout_member(p_hangout_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.hangout_group_members
        WHERE hangout_id = p_hangout_id AND user_id = p_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_chat_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hangout_member(UUID, UUID) TO authenticated;

-- ============================================================================
-- 10. POST ENGAGEMENT COUNTER TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_post_engagement_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (TG_TABLE_NAME = 'post_likes') THEN
            UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        ELSIF (TG_TABLE_NAME = 'post_saves') THEN
            UPDATE public.posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (TG_TABLE_NAME = 'post_likes') THEN
            UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
        ELSIF (TG_TABLE_NAME = 'post_saves') THEN
            UPDATE public.posts SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_post_likes_count ON public.post_likes;
CREATE TRIGGER trigger_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_post_engagement_counts();

DROP TRIGGER IF EXISTS trigger_post_saves_count ON public.post_saves;
CREATE TRIGGER trigger_post_saves_count
AFTER INSERT OR DELETE ON public.post_saves
FOR EACH ROW EXECUTE FUNCTION public.handle_post_engagement_counts();

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all new tables
ALTER TABLE public.place_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_place_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hangout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_location_shares ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS: Place Discovery & Categories (Publicly discoverable directory)
-- ----------------------------------------------------------------------------
CREATE POLICY "Place categories are readable by authenticated users"
ON public.place_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Places are readable by authenticated users"
ON public.places FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Place category mappings are readable by authenticated users"
ON public.place_category_mappings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Place images are readable by authenticated users"
ON public.place_images FOR SELECT
TO authenticated
USING (true);

-- ----------------------------------------------------------------------------
-- RLS: Trip Days & Activities (Scoped to trip owner or public trips)
-- ----------------------------------------------------------------------------
CREATE POLICY "Trip days are readable by authenticated users for visible trips"
ON public.trip_days FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.id = trip_days.trip_id
          AND (t.user_id = auth.uid() OR t.is_public = true)
    )
);

CREATE POLICY "Users can manage their own trip days"
ON public.trip_days FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.id = trip_days.trip_id AND t.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.id = trip_days.trip_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Trip activities are readable by authenticated users for visible trips"
ON public.trip_activities FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.trip_days td
        JOIN public.trips t ON t.id = td.trip_id
        WHERE td.id = trip_activities.trip_day_id
          AND (t.user_id = auth.uid() OR t.is_public = true)
    )
);

CREATE POLICY "Users can manage their own trip activities"
ON public.trip_activities FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.trip_days td
        JOIN public.trips t ON t.id = td.trip_id
        WHERE td.id = trip_activities.trip_day_id AND t.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.trip_days td
        JOIN public.trips t ON t.id = td.trip_id
        WHERE td.id = trip_activities.trip_day_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their saved trips"
ON public.saved_trips FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark and manage their saved trips"
ON public.saved_trips FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- RLS: Hangout Planning
-- ----------------------------------------------------------------------------
CREATE POLICY "Hangouts are viewable by members, creator, or open planning"
ON public.hangout_groups FOR SELECT
TO authenticated
USING (
    creator_id = auth.uid()
    OR public.is_hangout_member(id, auth.uid())
    OR status = 'planning'
);

CREATE POLICY "Authenticated users can create hangouts"
ON public.hangout_groups FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators or organizers can update hangouts"
ON public.hangout_groups FOR UPDATE
TO authenticated
USING (
    creator_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.hangout_group_members m
        WHERE m.hangout_id = id AND m.user_id = auth.uid() AND m.role = 'organizer'
    )
)
WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.hangout_group_members m
        WHERE m.hangout_id = id AND m.user_id = auth.uid() AND m.role = 'organizer'
    )
);

CREATE POLICY "Creators can delete their hangouts"
ON public.hangout_groups FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Hangout members are viewable by participants or creators"
ON public.hangout_group_members FOR SELECT
TO authenticated
USING (
    public.is_hangout_member(hangout_id, auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.hangout_groups h
        WHERE h.id = hangout_id AND h.creator_id = auth.uid()
    )
);

CREATE POLICY "Users can join or creators can add hangout members"
ON public.hangout_group_members FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.hangout_groups h
        WHERE h.id = hangout_id AND h.creator_id = auth.uid()
    )
);

CREATE POLICY "Members can update their own hangout membership status"
ON public.hangout_group_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave or organizers can remove members"
ON public.hangout_group_members FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.hangout_groups h
        WHERE h.id = hangout_id AND h.creator_id = auth.uid()
    )
);

CREATE POLICY "Suggestions are readable by hangout members"
ON public.hangout_place_suggestions FOR SELECT
TO authenticated
USING (public.is_hangout_member(hangout_id, auth.uid()));

CREATE POLICY "Hangout members can suggest places"
ON public.hangout_place_suggestions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = suggested_by
    AND public.is_hangout_member(hangout_id, auth.uid())
);

CREATE POLICY "Suggestion authors or creators can delete suggestions"
ON public.hangout_place_suggestions FOR DELETE
TO authenticated
USING (
    auth.uid() = suggested_by
    OR EXISTS (
        SELECT 1 FROM public.hangout_groups h
        WHERE h.id = hangout_id AND h.creator_id = auth.uid()
    )
);

CREATE POLICY "Votes are readable by hangout members"
ON public.hangout_votes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.hangout_place_suggestions s
        WHERE s.id = suggestion_id AND public.is_hangout_member(s.hangout_id, auth.uid())
    )
);

CREATE POLICY "Hangout members can cast votes"
ON public.hangout_votes FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.hangout_place_suggestions s
        WHERE s.id = suggestion_id AND public.is_hangout_member(s.hangout_id, auth.uid())
    )
);

CREATE POLICY "Users can change their own votes"
ON public.hangout_votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes"
ON public.hangout_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Hangout schedules are readable by members"
ON public.hangout_schedules FOR SELECT
TO authenticated
USING (public.is_hangout_member(hangout_id, auth.uid()));

CREATE POLICY "Organizers can manage hangout schedules"
ON public.hangout_schedules FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.hangout_groups h
        WHERE h.id = hangout_id
          AND (
              h.creator_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.hangout_group_members m
                  WHERE m.hangout_id = h.id AND m.user_id = auth.uid() AND m.role = 'organizer'
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.hangout_groups h
        WHERE h.id = hangout_id
          AND (
              h.creator_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.hangout_group_members m
                  WHERE m.hangout_id = h.id AND m.user_id = auth.uid() AND m.role = 'organizer'
              )
          )
    )
);

-- ----------------------------------------------------------------------------
-- RLS: Profile Posts & Social Graph
-- ----------------------------------------------------------------------------
CREATE POLICY "Posts viewable according to visibility setting"
ON public.posts FOR SELECT
TO authenticated
USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (
        visibility = 'followers'
        AND EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.following_id = posts.user_id AND f.follower_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can create their own posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Post media is readable for visible posts"
ON public.post_media FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id = post_media.post_id
          AND (
              p.visibility = 'public'
              OR p.user_id = auth.uid()
              OR (
                  p.visibility = 'followers'
                  AND EXISTS (
                      SELECT 1 FROM public.follows f
                      WHERE f.following_id = p.user_id AND f.follower_id = auth.uid()
                  )
              )
          )
    )
);

CREATE POLICY "Users can manage media for their own posts"
ON public.post_media FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id = post_media.post_id AND p.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id = post_media.post_id AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Post likes are readable by authenticated users"
ON public.post_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can like posts"
ON public.post_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
ON public.post_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Post saves are private to owner"
ON public.post_saves FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
ON public.post_saves FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved posts"
ON public.post_saves FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Follows are viewable by authenticated users"
ON public.follows FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can follow other travelers"
ON public.follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow travelers"
ON public.follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- ----------------------------------------------------------------------------
-- RLS: Group Chat & Realtime Messaging
-- ----------------------------------------------------------------------------
CREATE POLICY "Chat groups are readable by members or creator"
ON public.chat_groups FOR SELECT
TO authenticated
USING (
    creator_id = auth.uid()
    OR public.is_chat_group_member(id, auth.uid())
);

CREATE POLICY "Users can create chat groups"
ON public.chat_groups FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Group creators or admins can update chat group settings"
ON public.chat_groups FOR UPDATE
TO authenticated
USING (
    creator_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.chat_group_members m
        WHERE m.group_id = id AND m.user_id = auth.uid() AND m.role = 'admin'
    )
)
WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.chat_group_members m
        WHERE m.group_id = id AND m.user_id = auth.uid() AND m.role = 'admin'
    )
);

CREATE POLICY "Creators can delete chat groups"
ON public.chat_groups FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Chat group members viewable by members or group creator"
ON public.chat_group_members FOR SELECT
TO authenticated
USING (
    public.is_chat_group_member(group_id, auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.chat_groups g
        WHERE g.id = group_id AND g.creator_id = auth.uid()
    )
);

CREATE POLICY "Users can join or creators can add chat members"
ON public.chat_group_members FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.chat_groups g
        WHERE g.id = group_id AND g.creator_id = auth.uid()
    )
);

CREATE POLICY "Members can update their own read watermark"
ON public.chat_group_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave or admins can remove chat members"
ON public.chat_group_members FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.chat_groups g
        WHERE g.id = group_id AND g.creator_id = auth.uid()
    )
);

CREATE POLICY "Messages readable strictly by group members"
ON public.chat_messages FOR SELECT
TO authenticated
USING (public.is_chat_group_member(group_id, auth.uid()));

CREATE POLICY "Messages writable strictly by group members"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND public.is_chat_group_member(group_id, auth.uid())
);

CREATE POLICY "Senders can edit their own messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders or group admins can delete messages"
ON public.chat_messages FOR DELETE
TO authenticated
USING (
    auth.uid() = sender_id
    OR EXISTS (
        SELECT 1 FROM public.chat_group_members m
        WHERE m.group_id = chat_messages.group_id AND m.user_id = auth.uid() AND m.role = 'admin'
    )
);

CREATE POLICY "Message read receipts viewable by group members"
ON public.chat_message_reads FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chat_messages m
        WHERE m.id = message_id AND public.is_chat_group_member(m.group_id, auth.uid())
    )
);

CREATE POLICY "Users can mark messages as read"
ON public.chat_message_reads FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.chat_messages m
        WHERE m.id = message_id AND public.is_chat_group_member(m.group_id, auth.uid())
    )
);

-- ----------------------------------------------------------------------------
-- RLS: Ephemeral Active Location Shares
-- ----------------------------------------------------------------------------
CREATE POLICY "Active location shares readable by authorized group or match"
ON public.active_location_shares FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR (
        chat_group_id IS NOT NULL
        AND public.is_chat_group_member(chat_group_id, auth.uid())
        AND expires_at > NOW()
    )
    OR (
        match_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
              AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
              AND m.status = 'accepted'
        )
        AND expires_at > NOW()
    )
);

CREATE POLICY "Users can share their own ephemeral active location"
ON public.active_location_shares FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND (
        (chat_group_id IS NOT NULL AND public.is_chat_group_member(chat_group_id, auth.uid()))
        OR
        (match_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
              AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
              AND m.status = 'accepted'
        ))
    )
);

CREATE POLICY "Users can update their own active location"
ON public.active_location_shares FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can stop sharing their active location"
ON public.active_location_shares FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- 12. REALTIME PUBLICATION COMPATIBILITY
-- ============================================================================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_votes;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_place_suggestions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.active_location_shares;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
