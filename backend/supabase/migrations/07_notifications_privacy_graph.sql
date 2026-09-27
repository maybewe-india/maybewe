-- ============================================================================
-- MAYBEWE MIGRATION 07: NOTIFICATIONS, PRIVACY SETTINGS & TRAVEL GRAPH INTEGRATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND APP_NOTIFICATIONS TYPE CHECK FOR PHASE E
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. REALTIME PUBLICATION FOR NOTIFICATIONS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'app_notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
        END IF;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. USER PRIVACY SETTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(30) NOT NULL DEFAULT 'public' 
        CHECK (profile_visibility IN ('public', 'verified_only', 'connections_only')),
    discovery_visibility BOOLEAN NOT NULL DEFAULT true,
    who_can_message VARCHAR(30) NOT NULL DEFAULT 'all' 
        CHECK (who_can_message IN ('all', 'matches_only', 'verified_only')),
    who_can_request VARCHAR(30) NOT NULL DEFAULT 'all' 
        CHECK (who_can_request IN ('all', 'verified_only')),
    live_location_default_mode VARCHAR(20) NOT NULL DEFAULT 'approximate' 
        CHECK (live_location_default_mode IN ('approximate', 'precise')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_user_id ON public.user_privacy_settings(user_id);

ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own privacy settings
CREATE POLICY "Users can view own privacy settings"
ON public.user_privacy_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: Users can insert own privacy settings
CREATE POLICY "Users can insert own privacy settings"
ON public.user_privacy_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS: Users can update own privacy settings
CREATE POLICY "Users can update own privacy settings"
ON public.user_privacy_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. USER NOTIFICATION PREFERENCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    messages_enabled BOOLEAN NOT NULL DEFAULT true,
    connections_enabled BOOLEAN NOT NULL DEFAULT true,
    hangouts_enabled BOOLEAN NOT NULL DEFAULT true,
    trips_enabled BOOLEAN NOT NULL DEFAULT true,
    social_enabled BOOLEAN NOT NULL DEFAULT true,
    trust_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_user_id ON public.user_notification_preferences(user_id);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view own notification preferences
CREATE POLICY "Users can view own notification preferences"
ON public.user_notification_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: Users can insert own notification preferences
CREATE POLICY "Users can insert own notification preferences"
ON public.user_notification_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS: Users can update own notification preferences
CREATE POLICY "Users can update own notification preferences"
ON public.user_notification_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. SAVED TRIPS FOUNDATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_saved_trip UNIQUE (user_id, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_trips_user_id ON public.saved_trips(user_id);

ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved trips"
ON public.saved_trips FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can save trips"
ON public.saved_trips FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved trips"
ON public.saved_trips FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
