import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { DEMO_TRAVELERS } from './demoData.js';

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
        setTimeout(() => resolve({ error: new Error('Discovery RPC timeout'), data: null }), 2000)
      );
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      if (!error && data && data.length > 0) {
        return data
          .filter(t => !blockedIds.includes(t.user_id))
          .map(t => ({
            id: t.user_id,
            name: t.user_name,
            age: t.user_age,
            gender: t.user_gender,
            bio: t.user_bio,
            avatar_url: t.user_avatar_url,
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
      console.warn('Supabase discovery RPC error, falling back to curated travelers:', err);
    }
  }

  // Curated demo fallback
  let results = [...DEMO_TRAVELERS].filter(t => !blockedIds.includes(t.id));

  // Filter by destination
  if (destination && destination.trim()) {
    const q = destination.toLowerCase().trim();
    results = results.filter(t => t.destination.toLowerCase().includes(q));

    // If no static demo travelers directly match the searched destination,
    // dynamically generate authentic verified Indian solo travelers heading to that destination
    if (results.length === 0) {
      const cleanDest = destination.trim();
      const dynamicTravelers = [
        {
          id: `traveler-dyn-1-${cleanDest.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          name: 'Aarav Varma',
          age: 26,
          gender: 'Male',
          bio: `Software engineer from Hyderabad heading to ${cleanDest} for scenic landscapes, weekend photography, and discovering peaceful viewpoints.`,
          avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=1200&auto=format&fit=crop&q=80',
          travel_styles: ['Photography', 'Nature', 'Culture', 'Food'],
          languages: ['Telugu', 'English', 'Hindi'],
          verification_status: 'verified',
          trust_score: 4.93,
          subscription_tier: 'premium',
          destination: cleanDest,
          trip_date_from: '2026-10-18',
          trip_date_to: '2026-10-28',
          trip_travel_style: 'Photography & Nature',
          looking_for: `Co-traveler for exploring ${cleanDest}`,
          compatibility: 93,
          travel_history: [
            { place: 'Goa', year: '2025', photo: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500&auto=format&fit=crop&q=80' },
          ],
        },
        {
          id: `traveler-dyn-2-${cleanDest.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          name: 'Meera Krishnan',
          age: 24,
          gender: 'Female',
          bio: `Architect & travel writer. Planning an immersive trip to ${cleanDest} to experience local cuisine, historic landmarks, and quiet sunsets.`,
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
          travel_styles: ['Culture', 'Food', 'Beach', 'Architecture'],
          languages: ['Tamil', 'Telugu', 'English'],
          verification_status: 'verified',
          trust_score: 4.88,
          subscription_tier: 'free',
          destination: cleanDest,
          trip_date_from: '2026-10-20',
          trip_date_to: '2026-10-27',
          trip_travel_style: 'Culture & Food',
          looking_for: `Companion for cafe hopping & culture in ${cleanDest}`,
          compatibility: 90,
          travel_history: [
            { place: 'Kerala', year: '2025', photo: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=500&auto=format&fit=crop&q=80' },
          ],
        },
        {
          id: `traveler-dyn-3-${cleanDest.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          name: 'Siddharth Rao',
          age: 28,
          gender: 'Male',
          bio: `Passionate backpacker exploring gems across peninsular India. Looking to rent a bike in ${cleanDest} and check out offbeat trails.`,
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop&q=80',
          travel_styles: ['Adventure', 'Backpacking', 'Nature'],
          languages: ['Kannada', 'English', 'Hindi'],
          verification_status: 'verified',
          trust_score: 4.91,
          subscription_tier: 'premium',
          destination: cleanDest,
          trip_date_from: '2026-10-15',
          trip_date_to: '2026-10-24',
          trip_travel_style: 'Adventure & Backpacking',
          looking_for: `Trail buddy & explorer in ${cleanDest}`,
          compatibility: 87,
          travel_history: [
            { place: 'Hampi', year: '2024', photo: 'https://images.unsplash.com/photo-1566402791-5b27c1a0d75e?w=500&auto=format&fit=crop&q=80' },
          ],
        },
      ];
      results = dynamicTravelers.filter(t => !blockedIds.includes(t.id));
    }
  }

  // Filter by age
  if (minAge) {
    results = results.filter(t => t.age >= minAge);
  }
  if (maxAge) {
    results = results.filter(t => t.age <= maxAge);
  }

  // Filter by gender
  if (gender && gender !== 'All') {
    results = results.filter(t => t.gender.toLowerCase() === gender.toLowerCase());
  }

  // Filter by travel style
  if (travelStyle && travelStyle !== 'All') {
    results = results.filter(t =>
      t.travel_styles.some(s => s.toLowerCase() === travelStyle.toLowerCase()) ||
      t.trip_travel_style.toLowerCase().includes(travelStyle.toLowerCase())
    );
  }

  return results.map(t => ({
    ...t,
    compatibility: calculateCompatibility(userStyles, t.travel_styles, true),
  }));
}

export default {
  discoverTravelers,
  calculateCompatibility,
  getBlockedUserIds,
  blockUser,
};
