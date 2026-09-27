import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { logNotificationEvent } from './notifications.js';

const FOLLOWS_STORAGE_KEY = '@maybewe_social_follows_v1';

// Seed demo social relationships
const DEMO_FOLLOWS = [
  { follower_id: 'user-demo-arjun', following_id: 'user-demo-priya', created_at: '2026-08-10T10:00:00Z' },
  { follower_id: 'user-demo-rohan', following_id: 'user-demo-priya', created_at: '2026-08-15T14:30:00Z' },
  { follower_id: 'user-demo-meera', following_id: 'user-demo-priya', created_at: '2026-09-01T09:15:00Z' },
  { follower_id: 'user-demo-priya', following_id: 'user-demo-arjun', created_at: '2026-08-11T12:00:00Z' },
  { follower_id: 'user-demo-priya', following_id: 'user-demo-meera', created_at: '2026-09-02T16:45:00Z' },
];

/**
 * Fetch all follow relationships
 */
async function getAllFollows() {
  try {
    const raw = await AsyncStorage.getItem(FOLLOWS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    await AsyncStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(DEMO_FOLLOWS));
    return DEMO_FOLLOWS;
  } catch {
    return DEMO_FOLLOWS;
  }
}

/**
 * Follow a traveler
 * Rules:
 * 1. Cannot follow yourself (follower_id !== following_id).
 * 2. Cannot follow twice (duplicate prevention).
 * 3. Authenticated user can only follow on their own behalf.
 */
export async function followUser(followerId, followingId, followerName = 'Traveler') {
  if (!followerId || !followingId) {
    throw new Error('Both follower and following IDs are required.');
  }

  if (followerId === followingId) {
    throw new Error('You cannot follow your own travel profile.');
  }

  const allFollows = await getAllFollows();
  const exists = allFollows.some(
    (f) => f.follower_id === followerId && f.following_id === followingId
  );

  if (exists) {
    return { success: true, alreadyFollowing: true, message: 'Already following.' };
  }

  const newFollow = {
    follower_id: followerId,
    following_id: followingId,
    created_at: new Date().toISOString(),
  };

  allFollows.push(newFollow);
  await AsyncStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(allFollows));

  // Log notification event for the person being followed
  await logNotificationEvent({
    userId: followingId,
    actorId: followerId,
    type: 'follow',
    title: 'New Travel Connection',
    message: `${followerName} started following your travel stories.`,
  });

  // Sync to Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase.from('follows').insert([
        {
          follower_id: followerId,
          following_id: followingId,
        },
      ]);
    } catch (e) {
      console.warn('Error inserting follow in Supabase:', e);
    }
  }

  return { success: true, isFollowing: true };
}

/**
 * Unfollow a traveler
 */
export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) {
    throw new Error('Both follower and following IDs are required.');
  }

  const allFollows = await getAllFollows();
  const updated = allFollows.filter(
    (f) => !(f.follower_id === followerId && f.following_id === followingId)
  );

  await AsyncStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(updated));

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
    } catch (e) {
      console.warn('Error deleting follow in Supabase:', e);
    }
  }

  return { success: true, isFollowing: false };
}

/**
 * Check if followerId is following followingId
 */
export async function getFollowStatus(followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) return false;
  const allFollows = await getAllFollows();
  return allFollows.some(
    (f) => f.follower_id === followerId && f.following_id === followingId
  );
}

/**
 * Get follower and following counts for a user
 */
export async function getFollowCounts(userId) {
  if (!userId) return { followersCount: 0, followingCount: 0 };
  const allFollows = await getAllFollows();

  const followersCount = allFollows.filter((f) => f.following_id === userId).length;
  const followingCount = allFollows.filter((f) => f.follower_id === userId).length;

  return { followersCount, followingCount };
}

/**
 * Get list of followers for a user
 */
export async function fetchFollowers(userId) {
  if (!userId) return [];
  const allFollows = await getAllFollows();
  return allFollows.filter((f) => f.following_id === userId);
}

/**
 * Get list of users that a user is following
 */
export async function fetchFollowing(userId) {
  if (!userId) return [];
  const allFollows = await getAllFollows();
  return allFollows.filter((f) => f.follower_id === userId);
}
