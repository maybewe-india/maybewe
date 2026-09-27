// ============================================================================
// MAYBEWE LIVE LOCATION & REAL-TIME PRESENCE ENGINE (lib/liveLocation.js)
// Zero TypeScript, Pure JavaScript/JSX
// Scoped Realtime + Dual-Mode Storage Adapter + RLS Safe
// Foreground device location only — NO background tracking, NO permanent history
// ============================================================================

import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { isUserBlocked } from './safetyBlocks.js';

const LIVE_LOCATION_STORAGE_KEY = '@maybewe_live_location_sessions_v1';

export const DURATION_OPTIONS = [
  { id: '15m', label: '15 minutes', minutes: 15 },
  { id: '1h', label: '1 hour', minutes: 60 },
  { id: '4h', label: '4 hours', minutes: 240 },
  { id: 'until_stopped', label: 'Until I stop', minutes: 1440 }, // 24-hr safety cap
];

export const PRIVACY_MODES = [
  { id: 'precise', label: 'Precise Location', description: 'Shares exact GPS coordinates for easy navigation' },
  { id: 'approximate', label: 'Approximate Location', description: 'Approximate location hides your exact position (~1 km)' },
];

/**
 * Reduce coordinate precision for approximate privacy mode
 * Rounds to 2 decimal places (~1.1 km accuracy) without artificial jitter
 */
export function applyPrivacyMode(coordinate, mode = 'precise') {
  if (coordinate === null || coordinate === undefined) return null;
  const num = Number(coordinate);
  if (isNaN(num)) return null;

  if (mode === 'approximate') {
    return Math.round(num * 100) / 100;
  }
  return Number(num.toFixed(7));
}

// Helper: load stored sessions
async function getStoredSessions() {
  try {
    const raw = await AsyncStorage.getItem(LIVE_LOCATION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading live location sessions from storage:', err);
  }
  return [];
}

// Helper: save stored sessions
async function saveStoredSessions(sessions) {
  try {
    await AsyncStorage.setItem(LIVE_LOCATION_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Error saving live location sessions to storage:', err);
  }
}

/**
 * 1. Start a live location session
 * Explicit foreground activation only.
 */
export async function startLiveLocationSession({
  ownerId = 'user-demo-priya',
  targetUserId = null,
  chatGroupId = null,
  matchId = null,
  coords = { latitude: 15.5801, longitude: 73.7432 },
  duration = '1h',
  privacyMode = 'precise',
  accuracy = 12,
}) {
  if (!ownerId) throw new Error('Owner ID is required to start live location');
  if (!targetUserId && !chatGroupId && !matchId) {
    throw new Error('An authorized target (user, chat group, or match) is required');
  }

  // Safety check: verify recipient is not blocked
  if (targetUserId) {
    const blocked = await isUserBlocked(ownerId, targetUserId);
    if (blocked) {
      throw new Error('Cannot share location with a blocked user');
    }
  }

  const durationConfig = DURATION_OPTIONS.find((d) => d.id === duration) || DURATION_OPTIONS[1];
  const durationMs = durationConfig.minutes * 60 * 1000;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMs).toISOString();

  const finalLat = applyPrivacyMode(coords.latitude, privacyMode);
  const finalLng = applyPrivacyMode(coords.longitude, privacyMode);

  const sessionId = `loc-session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const session = {
    id: sessionId,
    owner_user_id: ownerId,
    target_user_id: targetUserId,
    chat_group_id: chatGroupId,
    match_id: matchId,
    latitude: finalLat,
    longitude: finalLng,
    accuracy_meters: privacyMode === 'approximate' ? 1000 : (accuracy || 10),
    privacy_mode: privacyMode,
    duration_type: duration,
    started_at: now.toISOString(),
    expires_at: expiresAt,
    stopped_at: null,
    status: 'active',
    last_updated_at: now.toISOString(),
    created_at: now.toISOString(),
  };

  // If Supabase is connected
  if (isSupabaseConfigured && ownerId) {
    try {
      const { data, error } = await supabase
        .from('live_location_sessions')
        .insert([
          {
            owner_user_id: ownerId,
            target_user_id: targetUserId,
            chat_group_id: chatGroupId,
            match_id: matchId,
            latitude: session.latitude,
            longitude: session.longitude,
            accuracy_meters: session.accuracy_meters,
            privacy_mode: session.privacy_mode,
            duration_type: session.duration_type,
            started_at: session.started_at,
            expires_at: session.expires_at,
            status: 'active',
          },
        ])
        .select()
        .single();

      if (!error && data) {
        session.id = data.id;
      }
    } catch (err) {
      console.warn('Supabase start live location session error, saving locally:', err);
    }
  }

  // Update local store: mark any previous active session by this owner for this target as stopped
  const sessions = await getStoredSessions();
  for (const s of sessions) {
    if (s.owner_user_id === ownerId && s.status === 'active' && (
      (targetUserId && s.target_user_id === targetUserId) ||
      (chatGroupId && s.chat_group_id === chatGroupId) ||
      (matchId && s.match_id === matchId)
    )) {
      s.status = 'stopped';
      s.stopped_at = now.toISOString();
    }
  }

  sessions.unshift(session);
  await saveStoredSessions(sessions);

  return session;
}

/**
 * 2. Update coordinates of an active session
 * Throttled to prevent excessive database writes
 */
let lastUpdateTimestamp = 0;
const THROTTLE_INTERVAL_MS = 6000; // 6-second throttle for foreground travel use

export async function updateLiveLocationCoordinates(sessionId, coords, accuracy = null, privacyMode = null) {
  const now = Date.now();
  if (now - lastUpdateTimestamp < THROTTLE_INTERVAL_MS) {
    return { throttled: true };
  }
  lastUpdateTimestamp = now;

  const sessions = await getStoredSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session || session.status !== 'active') {
    return { error: 'Session not active' };
  }

  // Check expiration
  if (new Date(session.expires_at) <= new Date()) {
    session.status = 'expired';
    await saveStoredSessions(sessions);
    return { error: 'Session expired' };
  }

  const mode = privacyMode || session.privacy_mode;
  session.latitude = applyPrivacyMode(coords.latitude, mode);
  session.longitude = applyPrivacyMode(coords.longitude, mode);
  session.accuracy_meters = mode === 'approximate' ? 1000 : (accuracy || session.accuracy_meters);
  session.last_updated_at = new Date().toISOString();

  await saveStoredSessions(sessions);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('live_location_sessions')
        .update({
          latitude: session.latitude,
          longitude: session.longitude,
          accuracy_meters: session.accuracy_meters,
          last_updated_at: session.last_updated_at,
        })
        .eq('id', sessionId)
        .eq('status', 'active');
    } catch (err) {
      console.warn('Supabase update live location error:', err);
    }
  }

  return { success: true, session };
}

/**
 * 3. Stop a live location session immediately
 */
export async function stopLiveLocationSession(sessionId, userId) {
  const sessions = await getStoredSessions();
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.owner_user_id !== userId) {
    throw new Error('Unauthorized: only session owner can stop live location');
  }

  session.status = 'stopped';
  session.stopped_at = new Date().toISOString();
  session.last_updated_at = new Date().toISOString();

  await saveStoredSessions(sessions);

  if (isSupabaseConfigured) {
    try {
      await supabase.rpc('stop_live_location_session', { p_session_id: sessionId });
    } catch (err) {
      console.warn('Supabase stop live location error:', err);
    }
  }

  return { success: true, session };
}

/**
 * 4. Fetch the current active live location session for a conversation/companion
 * Server-side expiration semantics: status === 'active' AND expires_at > now()
 */
export async function getActiveLiveLocationSession({
  chatGroupId = null,
  matchId = null,
  targetUserId = null,
  currentUserId = 'user-demo-priya',
}) {
  // If target user is blocked, return null immediately
  if (targetUserId) {
    const blocked = await isUserBlocked(currentUserId, targetUserId);
    if (blocked) return null;
  }

  if (isSupabaseConfigured && currentUserId) {
    try {
      let query = supabase
        .from('live_location_sessions')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('last_updated_at', { ascending: false })
        .limit(1);

      if (chatGroupId) query = query.eq('chat_group_id', chatGroupId);
      else if (matchId) query = query.eq('match_id', matchId);
      else if (targetUserId) {
        query = query.or(`and(owner_user_id.eq.${currentUserId},target_user_id.eq.${targetUserId}),and(owner_user_id.eq.${targetUserId},target_user_id.eq.${currentUserId})`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data[0];
      }
    } catch (err) {
      console.warn('Supabase getActiveLiveLocationSession fallback to local:', err);
    }
  }

  // Local / Demo mode fallback
  const sessions = await getStoredSessions();
  const now = new Date();

  return sessions.find((s) => {
    if (s.status !== 'active') return false;
    if (new Date(s.expires_at) <= now) return false;

    // Check target matching
    if (chatGroupId && s.chat_group_id === chatGroupId) return true;
    if (matchId && s.match_id === matchId) return true;
    if (targetUserId) {
      const isOwner = s.owner_user_id === currentUserId && s.target_user_id === targetUserId;
      const isRecipient = s.owner_user_id === targetUserId && (s.target_user_id === currentUserId || !s.target_user_id);
      return isOwner || isRecipient;
    }
    return false;
  }) || null;
}

/**
 * 5. Scoped Realtime Subscription
 * Listens only to updates for this specific authorized session
 */
export function subscribeToLiveLocation(sessionId, onLocationUpdate) {
  if (isSupabaseConfigured && sessionId) {
    const channelName = `live_loc_${sessionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_location_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new && onLocationUpdate) {
            onLocationUpdate(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {}
    };
  }

  return () => {};
}

/**
 * 6. Calculate distance between two GPS coordinates using Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  if (d < 1) {
    return `${Math.round(d * 1000)} m away`;
  }
  return `${d.toFixed(1)} km away`;
}

/**
 * 7. Human-friendly countdown formatter
 */
export function formatRemainingTime(expiresAt) {
  if (!expiresAt) return 'Ended';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Location expired';

  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) {
    return `Ends in ${diffMins} min`;
  }
  const hours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `Ends in ${hours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`.trim();
}
