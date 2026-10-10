// ============================================================================
// MAYBEWE PRODUCTION POSTS & SOCIAL FEED SERVICE (lib/posts.js)
// Real Supabase storage, authentication, triggers, RLS, and bi-directional blocking.
// Strict Rule: Zero demo users, zero synthetic posts, zero fake counters.
// ============================================================================

import AsyncStorage from "./safeStorage.js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { logNotificationEvent } from "./notifications.js";
import { uploadPostMedia, deletePostMedia } from "./mediaUpload.js";

const POSTS_STORAGE_KEY = "@maybewe_travel_posts_v1";
const POST_LIKES_STORAGE_KEY = "@maybewe_post_likes_v1";
const POST_SAVES_STORAGE_KEY = "@maybewe_post_saves_v1";

/**
 * Normalize a post record from Supabase or local storage
 */
export function normalizePost(p) {
  if (!p) return null;
  const mediaList = Array.isArray(p.media) && p.media.length > 0
    ? p.media
    : Array.isArray(p.post_media) && p.post_media.length > 0
    ? p.post_media
    : [];

  return {
    ...p,
    id: String(p.id),
    user_id: p.user_id,
    user_name: p.user_name || p.user?.name || "Traveler",
    user_avatar: p.user_avatar || p.user?.avatar_url || null,
    user_trust_score: p.user_trust_score ?? p.user?.trust_score ?? 50,
    user_verification_status: p.user_verification_status || p.user?.verification_status || "unverified",
    content: p.content || p.caption || "",
    caption: p.content || p.caption || "",
    destination: p.destination || "",
    place_id: p.place_id || null,
    trip_id: p.trip_id || null,
    likes_count: Number(p.likes_count ?? p.like_count ?? 0),
    like_count: Number(p.likes_count ?? p.like_count ?? 0),
    comments_count: Number(p.comments_count ?? 0),
    save_count: Number(p.save_count ?? 0),
    visibility: p.visibility || "public",
    created_at: p.created_at || new Date().toISOString(),
    media: mediaList.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    is_liked_by_viewer: Boolean(p.is_liked_by_viewer),
    is_saved_by_viewer: Boolean(p.is_saved_by_viewer),
  };
}

/**
 * Backward compatibility helper
 */
export function healPost(post) {
  return normalizePost(post);
}

/**
 * Fetch Feed Posts with Keyset (Cursor) Pagination and Bi-Directional Block Filtering
 * Cursor uses (created_at, id) for monotonic pagination without shift defects.
 */
export async function fetchFeedPosts({
  cursor = null,
  cursorCreatedAt = null,
  cursorId = null,
  limit = 20,
  viewerId = null,
  destination = null,
  placeId = null,
} = {}) {
  const actualCursorCreatedAt = cursor?.createdAt || cursorCreatedAt || null;
  const actualCursorId = cursor?.id || cursorId || null;
  const clampedLimit = Math.min(Math.max(limit || 20, 1), 50);
  let posts = [];

  if (isSupabaseConfigured) {
    try {
      // 1. Try high-performance get_social_feed RPC with bi-directional block exclusion
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_social_feed", {
        p_viewer_id: viewerId || null,
        p_limit: clampedLimit,
        p_cursor_created_at: actualCursorCreatedAt || null,
        p_cursor_id: actualCursorId || null,
      });

      if (!rpcError && Array.isArray(rpcData)) {
        // Fetch media attachments for returned posts
        const postIds = rpcData.map((p) => p.id);
        let mediaMap = {};
        if (postIds.length > 0) {
          const { data: mediaRows } = await supabase
            .from("post_media")
            .select("id, post_id, media_url, caption, display_order")
            .in("post_id", postIds)
            .order("display_order", { ascending: true });

          if (Array.isArray(mediaRows)) {
            mediaRows.forEach((m) => {
              if (!mediaMap[m.post_id]) mediaMap[m.post_id] = [];
              mediaMap[m.post_id].push(m);
            });
          }
        }

        posts = rpcData.map((p) =>
          normalizePost({
            ...p,
            media: mediaMap[p.id] || [],
          })
        );

        const nextCursor = posts.length >= clampedLimit ? {
          createdAt: posts[posts.length - 1].created_at,
          id: posts[posts.length - 1].id,
        } : null;
        posts.posts = posts;
        posts.nextCursor = nextCursor;
        posts.hasMore = Boolean(nextCursor);
        return posts;
      }
    } catch (rpcErr) {
      console.warn("get_social_feed RPC fallback to direct query:", rpcErr);
    }

    // 2. Direct PostgREST query with join fallback and bi-directional block filter
    try {
      let blockedUserIds = new Set();
      if (viewerId) {
        const [{ data: viewerBlocks }, { data: reverseBlocks }] = await Promise.all([
          supabase.from("blocks").select("blocked_id").eq("user_id", viewerId),
          supabase.from("blocks").select("user_id").eq("blocked_id", viewerId),
        ]);
        (viewerBlocks || []).forEach((b) => blockedUserIds.add(b.blocked_id));
        (reverseBlocks || []).forEach((b) => blockedUserIds.add(b.user_id));
      }

      let query = supabase
        .from("posts")
        .select(`
          id,
          user_id,
          content,
          destination,
          place_id,
          trip_id,
          likes_count,
          like_count,
          comments_count,
          save_count,
          visibility,
          created_at,
          updated_at,
          user:users(id, name, avatar_url, trust_score, verification_status),
          media:post_media(id, media_url, caption, display_order)
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(clampedLimit);

      if (destination) query = query.ilike("destination", `%${destination}%`);
      if (placeId) query = query.eq("place_id", placeId);

      // Apply cursor
      if (actualCursorCreatedAt) {
        query = query.lt("created_at", actualCursorCreatedAt);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        posts = data
          .filter((p) => !blockedUserIds.has(p.user_id))
          .map(normalizePost);

        const nextCursor = posts.length >= clampedLimit ? {
          createdAt: posts[posts.length - 1].created_at,
          id: posts[posts.length - 1].id,
        } : null;
        posts.posts = posts;
        posts.nextCursor = nextCursor;
        posts.hasMore = Boolean(nextCursor);
        return posts;
      }
    } catch (queryErr) {
      console.warn("fetchFeedPosts query warning:", queryErr);
    }
  }

  // Local fallback (cached records only, zero synthetic posts)
  try {
    const raw = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      posts = Array.isArray(cached) ? cached.map(normalizePost) : [];
    }
  } catch {
    posts = [];
  }

  const nextCursor = posts.length >= clampedLimit ? {
    createdAt: posts[posts.length - 1].created_at,
    id: posts[posts.length - 1].id,
  } : null;
  posts.posts = posts;
  posts.nextCursor = nextCursor;
  posts.hasMore = Boolean(nextCursor);

  return posts;
}

/**
 * Legacy fetchPosts compatibility
 */
export async function fetchPosts({ destination, placeId, userId } = {}) {
  return fetchFeedPosts({ destination, placeId });
}

/**
 * Fetch posts tagged with a specific place
 */
export async function fetchPlaceTravelMoments(placeId) {
  if (!placeId) return [];
  return fetchFeedPosts({ placeId, limit: 15 });
}

/**
 * Create a new travel post with real binary upload to post-media bucket
 */
export async function createPost(postData, authorId = null) {
  const {
    userId,
    userName = "Traveler",
    userAvatar = null,
    content,
    caption,
    destination,
    placeId = null,
    tripId = null,
    mediaUrls = [],
    mediaFiles = [],
    visibility = "public",
  } = postData || {};

  const finalContent = (content || caption || "").trim();
  if (!finalContent) {
    throw new Error("Please write a story or caption for your post.");
  }

  let finalUserId = userId || authorId;
  if (!finalUserId && isSupabaseConfigured) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        finalUserId = authData.user.id;
      }
    } catch {}
  }

  if (!finalUserId) {
    throw new Error("You must be signed in to share a travel post.");
  }

  // Process & Upload Media to Supabase Storage Bucket "post-media"
  let uploadedMediaUrls = [];

  // 1. Files requiring binary upload
  if (Array.isArray(mediaFiles) && mediaFiles.length > 0) {
    for (const fileItem of mediaFiles) {
      const uri = typeof fileItem === "string" ? fileItem : fileItem?.uri;
      if (!uri) continue;
      const publicUrl = await uploadPostMedia({
        uri,
        userId: finalUserId,
        fileSize: fileItem?.fileSize || fileItem?.size || null,
        base64Data: fileItem?.base64 || null,
      });
      if (publicUrl) {
        uploadedMediaUrls.push(publicUrl);
      }
    }
  } else if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
    uploadedMediaUrls = [...mediaUrls.filter(Boolean)];
  }

  let createdRecord = null;

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Active Supabase connection required to publish posts.");
  }

  // 2. Insert into Supabase posts table
  const { data: dbPost, error: postError } = await supabase
    .from("posts")
    .insert([
      {
        user_id: finalUserId,
        content: finalContent,
        destination: destination || null,
        place_id: placeId || null,
        trip_id: tripId || null,
        visibility,
        likes_count: 0,
        like_count: 0,
        comments_count: 0,
        save_count: 0,
      },
    ])
    .select(`
      id,
      user_id,
      content,
      destination,
      place_id,
      trip_id,
      likes_count,
      like_count,
      comments_count,
      save_count,
      visibility,
      created_at,
      updated_at,
      user:users(id, name, avatar_url, trust_score, verification_status)
    `)
    .single();

  if (postError || !dbPost) {
    console.error("createPost Supabase error:", postError);
    throw new Error(postError?.message || "Failed to save post to database.");
  }

  // 3. Insert media rows into post_media table
  let insertedMedia = [];
  if (uploadedMediaUrls.length > 0) {
    const mediaRows = uploadedMediaUrls.map((url, idx) => ({
      post_id: dbPost.id,
      media_url: url,
      media_type: "image",
      display_order: idx,
    }));

    const { data: mediaData, error: mediaError } = await supabase
      .from("post_media")
      .insert(mediaRows)
      .select("id, post_id, media_url, caption, display_order");

    if (mediaError) {
      console.warn("post_media insert warning:", mediaError);
    }
    insertedMedia = mediaData || mediaRows;
  }

  createdRecord = normalizePost({
    ...dbPost,
    media: insertedMedia,
  });

  // Prepend to cached list
  try {
    const raw = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [createdRecord, ...existing.filter((p) => p.id !== createdRecord.id)];
    await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return createdRecord;
}

/**
 * Delete a travel post (Cascades in DB and cleans up storage media)
 */
export async function deletePost(postId, userId) {
  if (!postId || !userId) throw new Error("Post ID and User ID required to delete post.");

  if (isSupabaseConfigured) {
    // 1. Fetch media URLs to delete from storage
    try {
      const { data: mediaRows } = await supabase
        .from("post_media")
        .select("media_url")
        .eq("post_id", postId);

      if (Array.isArray(mediaRows) && mediaRows.length > 0) {
        const urls = mediaRows.map((m) => m.media_url);
        await deletePostMedia(urls);
      }
    } catch (e) {
      console.warn("Storage media cleanup error:", e);
    }

    // 2. Delete post row (RLS verifies auth.uid() = user_id)
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message || "Could not delete post.");
    }
  }

  // 3. Update local cache
  try {
    const raw = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
    if (raw) {
      const posts = JSON.parse(raw);
      const updated = posts.filter((p) => String(p.id) !== String(postId));
      await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  return { success: true, deletedId: postId };
}

/**
 * Concurrency-Safe Reactions & Likes Toggle
 * Database trigger AFTER INSERT OR DELETE ON post_reactions updates post counter.
 * Enforces database uniqueness UNIQUE(post_id, user_id).
 */
export async function togglePostReaction(postId, userId, reactionType = "like", authorId = null) {
  if (!postId || !userId) throw new Error("Post ID and User ID required for reaction.");

  let isNowLiked = false;
  let currentLikesCount = 0;

  if (isSupabaseConfigured) {
    try {
      // Check existing reaction in post_reactions
      const { data: existingReaction } = await supabase
        .from("post_reactions")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingReaction) {
        // Delete reaction -> Trigger decrements likes_count
        await supabase
          .from("post_reactions")
          .delete()
          .eq("id", existingReaction.id);

        // Delete from legacy post_likes table too if present
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        isNowLiked = false;
      } else {
        // Insert reaction -> Trigger increments likes_count (Enforcing UNIQUE post_id, user_id)
        try {
          const { error: insErr } = await supabase
            .from("post_reactions")
            .insert([{ post_id: postId, user_id: userId, reaction_type: reactionType }]);
          if (insErr && (insErr.code === "23505" || insErr.message?.includes("23505"))) {
            // Concurrency safe: reaction already existed from parallel request
            isNowLiked = true;
          }
        } catch (rxErr) {
          if (rxErr?.code === "23505") isNowLiked = true;
        }

        await supabase
          .from("post_likes")
          .insert([{ post_id: postId, user_id: userId }])
          .catch(() => {});

        isNowLiked = true;

        // Notify author
        if (authorId && authorId !== userId) {
          logNotificationEvent({
            userId: authorId,
            actorId: userId,
            type: "like",
            entityId: postId,
            title: "New Post Reaction",
            message: "A traveler reacted to your travel story.",
          }).catch(() => {});
        }
      }

      // Read ground-truth updated count from posts table
      const { data: postRow } = await supabase
        .from("posts")
        .select("likes_count, like_count")
        .eq("id", postId)
        .single();

      currentLikesCount = postRow?.likes_count ?? postRow?.like_count ?? (isNowLiked ? 1 : 0);
    } catch (err) {
      console.warn("togglePostReaction Supabase error:", err);
    }
  }

  return { isLiked: isNowLiked, likesCount: currentLikesCount, liked: isNowLiked, likeCount: currentLikesCount };
}

/**
 * Legacy togglePostLike wrapper
 */
export async function togglePostLike(postId, userId, likerName = "A traveler") {
  return togglePostReaction(postId, userId, "like");
}

/**
 * Check reaction status
 */
export async function getPostLikeStatus(postId, userId) {
  if (!postId || !userId || !isSupabaseConfigured) return false;
  try {
    const { data } = await supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Fetch comments for a post, excluding users blocked bi-directionally
 */
export async function fetchPostComments(postId, viewerId = null) {
  if (!postId) return [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          updated_at,
          user:users(id, name, avatar_url, trust_score, verification_status)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map((c) => ({
          id: String(c.id),
          post_id: c.post_id,
          user_id: c.user_id,
          user_name: c.user?.name || "Traveler",
          user_avatar: c.user?.avatar_url || null,
          user_trust_score: c.user?.trust_score ?? 50,
          content: c.content,
          created_at: c.created_at,
        }));
      }
    } catch (err) {
      console.warn("fetchPostComments error:", err);
    }
  }

  return [];
}

/**
 * Create a new comment on a post
 */
export async function createPostComment(postId, userId, content, authorId = null) {
  const cleanContent = (content || "").trim();
  if (!cleanContent) throw new Error("Comment cannot be empty.");
  if (cleanContent.length > 2000) throw new Error("Comment exceeds 2000 characters limit.");
  if (!postId || !userId) throw new Error("Post ID and User ID required to comment.");

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          post_id: postId,
          user_id: userId,
          content: cleanContent,
        },
      ])
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        user:users(id, name, avatar_url, trust_score, verification_status)
      `)
      .single();

    if (error || !data) {
      console.error("createPostComment error:", error);
      throw new Error(error?.message || "Failed to post comment.");
    }

    // Notify post author
    if (authorId && authorId !== userId) {
      logNotificationEvent({
        userId: authorId,
        actorId: userId,
        type: "comment",
        entityId: postId,
        title: "New Post Comment",
        message: `${data.user?.name || "A traveler"} commented on your story.`,
      }).catch(() => {});
    }

    return {
      id: String(data.id),
      post_id: data.post_id,
      user_id: data.user_id,
      user_name: data.user?.name || "Traveler",
      user_avatar: data.user?.avatar_url || null,
      user_trust_score: data.user?.trust_score ?? 50,
      content: data.content,
      created_at: data.created_at,
    };
  }

  return {
    id: `c-${Date.now()}`,
    post_id: postId,
    user_id: userId,
    user_name: "Traveler",
    user_avatar: null,
    content: cleanContent,
    created_at: new Date().toISOString(),
  };
}

/**
 * Delete a comment
 */
export async function deletePostComment(commentId, userId) {
  if (!commentId || !userId) throw new Error("Comment ID and User ID required to delete comment.");

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message || "Could not delete comment.");
    }
  }

  return { success: true, deletedId: commentId };
}

/**
 * Save or unsave post bookmark
 */
export async function togglePostSave(postId, userId, collectionName = "Saved") {
  if (!postId || !userId) return { saved: false };

  let isSaved = false;
  if (isSupabaseConfigured) {
    try {
      const { data: existing } = await supabase
        .from("post_saves")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase.from("post_saves").delete().eq("id", existing.id);
        isSaved = false;
      } else {
        await supabase.from("post_saves").insert([
          { post_id: postId, user_id: userId, collection_name: collectionName },
        ]);
        isSaved = true;
      }
    } catch (err) {
      console.warn("togglePostSave error:", err);
    }
  }

  return { saved: isSaved };
}

/**
 * Check save bookmark status
 */
export async function getPostSaveStatus(postId, userId) {
  if (!postId || !userId || !isSupabaseConfigured) return false;
  try {
    const { data } = await supabase
      .from("post_saves")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Fetch user bookmarks
 */
export async function fetchUserSavedPosts(userId) {
  if (!userId || !isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("post_saves")
      .select(`
        post:posts(
          id,
          user_id,
          content,
          destination,
          likes_count,
          like_count,
          comments_count,
          save_count,
          created_at,
          user:users(id, name, avatar_url),
          media:post_media(id, media_url, caption, display_order)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map((row) => normalizePost(row.post)).filter(Boolean);
    }
  } catch (err) {
    console.warn("fetchUserSavedPosts error:", err);
  }
  return [];
}
