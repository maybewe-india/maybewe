import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { isUserBlocked } from './safetyBlocks.js';

const PRIVACY_STORAGE_KEY = '@maybewe_privacy_settings_v1';
const NOTIF_PREF_STORAGE_KEY = '@maybewe_notif_pref_v1';

export const DEFAULT_PRIVACY_SETTINGS = {
  profile_visibility: 'public', // 'public' | 'verified_only' | 'connections_only'
  discovery_visibility: true,
  who_can_message: 'all', // 'all' | 'matches_only' | 'verified_only'
  who_can_request: 'all', // 'all' | 'verified_only'
  live_location_default_mode: 'approximate', // 'approximate' | 'precise'
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  messages_enabled: true,
  connections_enabled: true,
  hangouts_enabled: true,
  trips_enabled: true,
  social_enabled: true,
  trust_enabled: true,
};

/**
 * Get user privacy settings with fallback
 */
export async function getUserPrivacySettings(userId = 'user-demo-priya') {
  if (!userId) return { ...DEFAULT_PRIVACY_SETTINGS };

  try {
    const raw = await AsyncStorage.getItem(`${PRIVACY_STORAGE_KEY}_${userId}`);
    if (raw) {
      return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading local privacy settings:', e);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        const merged = { ...DEFAULT_PRIVACY_SETTINGS, ...data };
        await AsyncStorage.setItem(`${PRIVACY_STORAGE_KEY}_${userId}`, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn('Supabase privacy settings fetch error:', e);
    }
  }

  return { ...DEFAULT_PRIVACY_SETTINGS };
}

/**
 * Update user privacy settings
 */
export async function updateUserPrivacySettings(userId, newSettings) {
  if (!userId) return { success: false, error: 'User ID required' };

  const current = await getUserPrivacySettings(userId);
  const updated = {
    ...current,
    ...newSettings,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(`${PRIVACY_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error persisting local privacy settings:', e);
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: userId,
          profile_visibility: updated.profile_visibility,
          discovery_visibility: updated.discovery_visibility,
          who_can_message: updated.who_can_message,
          who_can_request: updated.who_can_request,
          live_location_default_mode: updated.live_location_default_mode,
          updated_at: updated.updated_at,
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Supabase privacy settings update error:', e);
    }
  }

  return { success: true, settings: updated };
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(userId = 'user-demo-priya') {
  if (!userId) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

  try {
    const raw = await AsyncStorage.getItem(`${NOTIF_PREF_STORAGE_KEY}_${userId}`);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading local notification preferences:', e);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data };
        await AsyncStorage.setItem(`${NOTIF_PREF_STORAGE_KEY}_${userId}`, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn('Supabase notification preferences fetch error:', e);
    }
  }

  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(userId, newPrefs) {
  if (!userId) return { success: false, error: 'User ID required' };

  const current = await getUserNotificationPreferences(userId);
  const updated = {
    ...current,
    ...newPrefs,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(`${NOTIF_PREF_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error persisting local notification preferences:', e);
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          messages_enabled: updated.messages_enabled,
          connections_enabled: updated.connections_enabled,
          hangouts_enabled: updated.hangouts_enabled,
          trips_enabled: updated.trips_enabled,
          social_enabled: updated.social_enabled,
          trust_enabled: updated.trust_enabled,
          updated_at: updated.updated_at,
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Supabase notification preferences update error:', e);
    }
  }

  return { success: true, preferences: updated };
}

/**
 * Check if a sender can message a recipient according to privacy controls and blocks
 */
export async function canUserMessage(senderId, recipientId, isMatch = false, isVerifiedSender = false) {
  if (!senderId || !recipientId) return { allowed: false, reason: 'Invalid user parameters' };
  if (senderId === recipientId) return { allowed: true };

  // 1. Mutual safety block check
  const blocked = await isUserBlocked(senderId, recipientId);
  if (blocked) {
    return { allowed: false, reason: 'User communication is blocked for safety' };
  }

  // 2. Privacy settings check
  const settings = await getUserPrivacySettings(recipientId);
  if (settings.who_can_message === 'matches_only' && !isMatch) {
    return { allowed: false, reason: 'Traveler only accepts messages from confirmed connections' };
  }
  if (settings.who_can_message === 'verified_only' && !isVerifiedSender) {
    return { allowed: false, reason: 'Traveler only accepts messages from verified travelers' };
  }

  return { allowed: true };
}

/**
 * Check if a sender can send a connection request to recipient
 */
export async function canUserSendRequest(senderId, recipientId, isVerifiedSender = false) {
  if (!senderId || !recipientId) return { allowed: false, reason: 'Invalid user parameters' };
  if (senderId === recipientId) return { allowed: false, reason: 'Cannot connect with self' };

  // 1. Block check
  const blocked = await isUserBlocked(senderId, recipientId);
  if (blocked) {
    return { allowed: false, reason: 'User is blocked' };
  }

  // 2. Privacy settings check
  const settings = await getUserPrivacySettings(recipientId);
  if (!settings.discovery_visibility) {
    return { allowed: false, reason: 'Traveler has paused discovery requests' };
  }
  if (settings.who_can_request === 'verified_only' && !isVerifiedSender) {
    return { allowed: false, reason: 'Traveler only accepts requests from verified profiles' };
  }

  return { allowed: true };
}
