// ============================================================================
// MAYBEWE PRODUCTION SOCIAL GRAPH & MODERATION (lib/social.js)
// Follows, Bi-Directional Blocks, and Moderation Reports.
// ============================================================================

import AsyncStorage from "./safeStorage.js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { logNotificationEvent } from "./notifications.js";

const FOLLOWS_STORAGE_KEY = "@maybewe_social_follows_v1";
const BLOCKS_STORAGE_KEY = "@maybewe_social_blocks_v1";

/**
 * Follow a traveler
 * Rules:
 * 1. Cannot follow yourself (chk_no_self_follow).
 * 2. Cannot follow twice (uq_follow_pair).
 */
export async function followUser(followerId, followingId, followerName = "Traveler") {
  if (!followerId || !followingId) {
    throw new Error("Both follower and following IDs are required.");
  }

  if (String(followerId) === String(followingId)) {
    throw new Error("You cannot follow your own travel profile.");
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("follows")
        .insert([{ follower_id: followerId, following_id: followingId }]);

      if (error && error.code !== "23505") {
        throw new Error(error.message || "Failed to follow user.");
      }

      // Send notification
      logNotificationEvent({
        userId: followingId,
        actorId: followerId,
        type: "follow",
        title: "New Companion Follower",
        message: `${followerName} started following your travel journey.`,
      }).catch(() => {});

      return { success: true, isFollowing: true };
    } catch (err) {
      console.warn("followUser error:", err);
      throw err;
    }
  }

  return { success: true, isFollowing: true };
}

/**
 * Unfollow a traveler
 */
export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) return { success: false };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId);

      if (error) throw new Error(error.message);
      return { success: true, isFollowing: false };
    } catch (err) {
      console.warn("unfollowUser error:", err);
      throw err;
    }
  }

  return { success: true, isFollowing: false };
}

/**
 * Check if followerId follows followingId
 */

/**
 * Get follower and following counts for a user
 */
export async function getFollowCounts(userId) {
  if (!userId || !isSupabaseConfigured) {
    return { followersCount: 0, followingCount: 0 };
  }

  try {
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ]);

    return {
      followersCount: followersRes?.count || 0,
      followingCount: followingRes?.count || 0,
    };
  } catch (err) {
    console.warn('getFollowCounts error:', err);
    return { followersCount: 0, followingCount: 0 };
  }
}

export async function getFollowStatus(followerId, followingId) {
  if (!followerId || !followingId) return false;

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .maybeSingle();

      return Boolean(data);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Block a user (Bi-Directional Safety Barrier)
 * Guarantees viewer and target cannot see each other's posts, comments, or presence.
 */
export async function blockUser(viewerId, targetId) {
  if (!viewerId || !targetId) throw new Error("Both user IDs required for block action.");
  if (String(viewerId) === String(targetId)) throw new Error("You cannot block yourself.");

  if (isSupabaseConfigured) {
    try {
      // 1. Insert into blocks table
      await supabase
        .from("blocks")
        .insert([{ user_id: viewerId, blocked_id: targetId }])
        .catch(() => {});

      // 2. Insert into user_blocks table (compatibility)
      await supabase
        .from("user_blocks")
        .insert([{ blocker_user_id: viewerId, blocked_user_id: targetId }])
        .catch(() => {});

      // 3. Remove any active follow links between them
      await supabase
        .from("follows")
        .delete()
        .or(`and(follower_id.eq.${viewerId},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${viewerId})`)
        .catch(() => {});

      return { success: true, isBlocked: true };
    } catch (err) {
      console.warn("blockUser error:", err);
      throw err;
    }
  }

  return { success: true, isBlocked: true };
}

/**
 * Unblock a user
 */
export async function unblockUser(viewerId, targetId) {
  if (!viewerId || !targetId) return { success: false };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("blocks")
        .delete()
        .eq("user_id", viewerId)
        .eq("blocked_id", targetId);

      await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_user_id", viewerId)
        .eq("blocked_user_id", targetId);

      return { success: true, isBlocked: false };
    } catch (err) {
      console.warn("unblockUser error:", err);
      throw err;
    }
  }

  return { success: true, isBlocked: false };
}

/**
 * Check if a bi-directional block exists between two users
 */
export async function isUserBlocked(viewerId, targetId) {
  if (!viewerId || !targetId || !isSupabaseConfigured) return false;

  try {
    const { data: b1 } = await supabase
      .from("blocks")
      .select("id")
      .or(`and(user_id.eq.${viewerId},blocked_id.eq.${targetId}),and(user_id.eq.${targetId},blocked_id.eq.${viewerId})`)
      .limit(1);

    if (Array.isArray(b1) && b1.length > 0) return true;

    const { data: b2 } = await supabase
      .from("user_blocks")
      .select("id")
      .or(`and(blocker_user_id.eq.${viewerId},blocked_user_id.eq.${targetId}),and(blocker_user_id.eq.${targetId},blocked_user_id.eq.${viewerId})`)
      .limit(1);

    return Boolean(Array.isArray(b2) && b2.length > 0);
  } catch {
    return false;
  }
}

/**
 * Submit a moderation report against a post, comment, or user
 */
export async function submitReport({
  reporterId,
  targetType = "post",
  targetId,
  reportedId = null,
  reason,
  details = "",
}) {
  if (!reporterId) throw new Error("Reporter ID is required.");
  if (!targetId) throw new Error("Target ID is required.");
  if (!reason) throw new Error("Please select a reason for the report.");

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("reports")
        .insert([
          {
            reporter_id: reporterId,
            target_type: targetType,
            target_id: String(targetId),
            reported_id: reportedId || null,
            reason,
            details,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error) {
        console.warn("submitReport error:", error);
        throw new Error(error.message || "Failed to submit safety report.");
      }

      return { success: true, reportId: data?.id };
    } catch (err) {
      console.warn("submitReport error:", err);
      throw err;
    }
  }

  return { success: true, reportId: `rep-${Date.now()}` };
}
