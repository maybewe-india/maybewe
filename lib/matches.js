import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { DEMO_MATCHES } from './demoData.js';

const MATCHES_STORAGE_KEY = '@solo_traveler_stored_matches';

/**
 * Loads matches and connection requests
 */
export async function getMatches(userId) {
  if (isSupabaseConfigured && userId) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          created_at,
          user_a_id,
          user_b_id,
          trip:trips(id, destination, date_from, date_to),
          user_a:users!user_a_id(*),
          user_b:users!user_b_id(*)
        `)
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(m => {
          const partner = m.user_a_id === userId ? m.user_b : m.user_a;
          return {
            id: m.id,
            status: m.status,
            user: partner,
            trip: m.trip,
            created_at: m.created_at,
            lastMessage: 'Connected on MaybeWe',
            lastMessageTime: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: 0,
          };
        });
      }
    } catch (err) {
      console.warn('Error fetching Supabase matches, falling back to local demo:', err);
    }
  }

  // Local storage demo fallback
  try {
    const stored = await AsyncStorage.getItem(MATCHES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}

  // Initialize with curated demo matches
  await AsyncStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(DEMO_MATCHES));
  return DEMO_MATCHES;
}

/**
 * Sends a connection request to a traveler
 */
export async function sendConnectionRequest({ currentUserId, targetUser, tripId, note = '' }) {
  if (!targetUser || !targetUser.id) {
    return { success: false, error: 'Target traveler information is required.' };
  }

  if (isSupabaseConfigured && currentUserId) {
    try {
      // Check if match already exists in Supabase
      const { data: existingMatches } = await supabase
        .from('matches')
        .select('id, status')
        .or(
          `and(user_a_id.eq.${currentUserId},user_b_id.eq.${targetUser.id}),and(user_a_id.eq.${targetUser.id},user_b_id.eq.${currentUserId})`
        );

      if (existingMatches && existingMatches.length > 0) {
        return {
          success: false,
          error: 'A connection request is already active with this traveler.',
          match: existingMatches[0],
        };
      }

      const { data, error } = await supabase
        .from('matches')
        .insert([
          {
            user_a_id: currentUserId,
            user_b_id: targetUser.id,
            trip_id: tripId || null,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return { success: true, match: data };
      }
    } catch (err) {
      console.warn('Error sending Supabase match request:', err);
    }
  }

  // Demo fallback
  try {
    const current = await getMatches(currentUserId);
    // Duplicate match check for local storage
    const isDuplicate = current.some(
      (m) => m.user?.id === targetUser.id || (m.user?.name && m.user?.name === targetUser.name)
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `You already have an active connection or pending request with ${targetUser.name}.`,
      };
    }

    const newMatch = {
      id: `match-demo-${Date.now()}`,
      status: 'pending',
      user: targetUser,
      trip: {
        destination: targetUser.destination || 'Upcoming Trip',
        dates: `${targetUser.trip_date_from || 'Dates'} – ${targetUser.trip_date_to || 'TBD'}`,
      },
      initialNote: note || `Hi ${targetUser.name}! I noticed our travel plans overlap. Would love to connect!`,
      lastMessageTime: 'Just now',
      unreadCount: 0,
    };

    const updated = [newMatch, ...current];
    await AsyncStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(updated));
    return { success: true, match: newMatch };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Updates match status to 'accepted' or 'declined'
 */
export async function updateMatchStatus(matchId, newStatus) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .update({ status: newStatus })
        .eq('id', matchId)
        .select()
        .single();

      if (!error && data) {
        return { success: true, match: data };
      }
    } catch (err) {
      console.warn('Error updating Supabase match status:', err);
    }
  }

  // Demo fallback
  try {
    const current = await getMatches();
    const updated = current.map(m => {
      if (m.id === matchId) {
        return { ...m, status: newStatus };
      }
      return m;
    });
    await AsyncStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(updated));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  getMatches,
  sendConnectionRequest,
  updateMatchStatus,
};
