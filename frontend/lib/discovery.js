import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { resolveDestinationImageUri } from './destinationImageResolver.js';

const BLOCKED_USERS_KEY = '@solo_traveler_blocked_users';

/**
 * Calculates a dynamic compatibility percentage based on matching travel styles and dates.
 * Clearly presented as an app-generated matching indicator based on selected criteria.
 */
export function calculateCompatibility(userStyles = [], targetStyles = [], dateOverlap = true) {
  let score = 70; // baseline compatibility

  if (userStyles && targetStyles && userStyles.length > 0 && targetStyles.length > 0) {
    const shared = userStyles.filter(style => targetStyles.includes(style));
    score += shared.length * 7;
  }

  if (dateOverlap) {
    score += 8;
  }

  return Math.min(Math.max(score, 65), 98);
}

/**
 * Returns list of blocked user IDs from local storage and DB
 */
export async function getBlockedUserIds() {
  try {
    const data = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Blocks a user and stores in local exclusion list
 */
export async function blockUser(userId) {
  try {
    const blocked = await getBlockedUserIds();
    if (!blocked.includes(userId)) {
      blocked.push(userId);
      await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blocked));
    }

    // Also remove or archive matches involving this user from local storage
    try {
      const MATCHES_STORAGE_KEY = '@solo_traveler_stored_matches';
      const stored = await AsyncStorage.getItem(MATCHES_STORAGE_KEY);
      if (stored) {
        const matches = JSON.parse(stored);
        const filtered = matches.filter(
          (m) => m.user?.id !== userId && m.user_a_id !== userId && m.user_b_id !== userId
        );
        await AsyncStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {}

    // Update match status in Supabase if configured
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('matches')
          .update({ status: 'declined' })
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
      } catch {}
    }

    return true;
  } catch (err) {
    console.warn('Error blocking user:', err);
    return false;
  }
}

/**
 * Discovers overlapping travelers matching criteria
 */
export async function discoverTravelers({
  userId,
  destination = '',
  dateFrom = null,
  dateTo = null,
  minAge = 18,
  maxAge = null,
  gender = 'All',
  travelStyle = 'All',
  userStyles = [],
}) {
  const blockedIds = await getBlockedUserIds();

  if (isSupabaseConfigured && userId) {
    try {
      const rpcPromise = supabase.rpc('find_overlapping_trips', {
        p_user_id: userId,
        p_destination: destination || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_min_age: minAge || 18,
        p_max_age: maxAge || null,
        p_gender: gender === 'All' ? null : gender,
        p_travel_style: travelStyle === 'All' ? null : travelStyle,
      });
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ error: new Error('Discovery RPC timeout'), data: null }), 3000)
      );
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      if (!error && Array.isArray(data)) {
        return data
          .filter(t => !blockedIds.includes(t.user_id))
          .map(t => ({
            id: t.user_id,
            name: t.user_name,
            age: t.user_age,
            gender: t.user_gender,
            bio: t.user_bio,
            avatar_url: t.user_avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            cover_url: t.user_cover_url || t.cover_url || resolveDestinationImageUri(t.destination),
            travel_styles: t.user_travel_styles || [],
            languages: t.user_languages || [],
            verification_status: t.user_verification_status,
            trust_score: t.user_trust_score,
            subscription_tier: t.user_subscription_tier,
            destination: t.destination,
            trip_id: t.trip_id,
            trip_date_from: t.trip_date_from,
            trip_date_to: t.trip_date_to,
            trip_travel_style: t.trip_travel_style,
            looking_for: t.looking_for,
            compatibility: calculateCompatibility(userStyles, t.user_travel_styles || [], true),
            travel_history: [],
          }));
      }
    } catch (err) {
      console.warn('Supabase discovery RPC error:', err);
    }
  }

  // Pure production empty state — never manufacture or return synthetic/fake profiles
  return [];
}

/**
 * Format distance in meters to clean human-readable text
 */
export function formatDistance(distanceMeters) {
  if (distanceMeters === null || distanceMeters === undefined || isNaN(distanceMeters)) {
    return 'Nearby';
  }
  const m = Number(distanceMeters);
  if (m < 50) return 'Right here (< 50 m)';
  if (m < 1000) return `${Math.round(m)} m away`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

/**
 * Validates latitude and longitude within WGS84 world bounds
 */
export function isValidCoordinate(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

/**
 * Publishes or updates the caller's nearby presence with authoritative device GPS
 */
export async function updateNearbyPresence({ coords, accuracy = null, isVisible = true }) {
  if (!coords || !isValidCoordinate(coords.latitude, coords.longitude)) {
    throw new Error('Valid device GPS coordinates (latitude and longitude) are required.');
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('update_nearby_presence', {
        p_lat: coords.latitude,
        p_lng: coords.longitude,
        p_accuracy: accuracy,
        p_is_visible: isVisible,
      });

      if (error) {
        console.warn('update_nearby_presence RPC error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      console.warn('updateNearbyPresence exception:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: true, localOnly: true };
}

/**
 * Toggles user visibility in nearby discovery without transmitting new coordinates
 */
export async function setNearbyVisibility(isVisible) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('set_nearby_visibility', {
        p_is_visible: isVisible,
      });
      if (error) {
        console.warn('set_nearby_visibility error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: true };
}

/**
 * Removes user from nearby presence entirely when they opt out or log off
 */
export async function clearNearbyPresence() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('clear_nearby_presence');
      if (error) {
        console.warn('clear_nearby_presence error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: true };
}

/**
 * Discovers real location-active travelers nearby using PostGIS ST_DWithin & ST_Distance
 * NEVER returns or fabricates synthetic/fake profiles.
 * NEVER exposes other users' raw GPS coordinates.
 */
export async function findNearbyTravelers({
  lat,
  lng,
  radiusKm = 25,
  limit = 30,
  userStyles = [],
}) {
  if (!isValidCoordinate(lat, lng)) {
    throw new Error('Valid device GPS coordinates are required for nearby discovery.');
  }

  const blockedIds = await getBlockedUserIds();

  if (isSupabaseConfigured) {
    try {
      const rpcPromise = supabase.rpc('find_nearby_travelers', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
        p_limit: limit,
      });

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ error: new Error('Nearby discovery RPC timeout'), data: null }), 3500)
      );

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      if (!error && Array.isArray(data)) {
        return data
          .filter((t) => !blockedIds.includes(t.user_id))
          .map((t) => ({
            id: t.user_id,
            name: t.user_name,
            bio: t.user_bio,
            avatar_url: t.user_avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            cover_url: resolveDestinationImageUri(t.user_travel_styles?.[0] || 'Goa'),
            travel_styles: t.user_travel_styles || [],
            languages: t.user_languages || [],
            verification_status: t.user_verification_status,
            trust_score: t.user_trust_score,
            distance_meters: t.distance_meters,
            distance_text: formatDistance(t.distance_meters),
            last_seen_at: t.last_seen_at,
            is_nearby: true,
            destination: 'Nearby Now',
            compatibility: calculateCompatibility(userStyles, t.user_travel_styles || [], false),
            travel_history: [],
          }));
      }
    } catch (err) {
      console.warn('Supabase find_nearby_travelers error:', err);
    }
  }

  // Pure production empty state
  return [];
}

export default {
  discoverTravelers,
  findNearbyTravelers,
  updateNearbyPresence,
  setNearbyVisibility,
  clearNearbyPresence,
  formatDistance,
  isValidCoordinate,
  calculateCompatibility,
  getBlockedUserIds,
  blockUser,
};
