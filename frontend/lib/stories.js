// ============================================================================
// MAYBEWE EPHEMERAL STORIES SERVICE (lib/stories.js)
// Production 24-Hour Ephemeral Stories across Web, Android, and iOS.
// Strictly authentic Supabase backend, storage, RLS, and 24h expiration.
// ============================================================================

import { Platform } from "react-native";
import { toByteArray } from "base64-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

export const MAX_STORY_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
export const STORY_EXPIRATION_HOURS = 24;

/**
 * Determine MIME type and file extension from URI
 */
function getMimeAndExtension(uri) {
  const cleanUri = (uri || "").split("?")[0];
  const ext = (cleanUri.split(".").pop() || "jpg").toLowerCase();
  let mime = "image/jpeg";
  if (ext === "png") mime = "image/png";
  else if (ext === "webp") mime = "image/webp";
  else if (ext === "heic") mime = "image/heic";
  return { mime, ext };
}

/**
 * Upload Story Binary to "story-media" Storage Bucket
 * Web (Blob) vs Native Hermes (expo-file-system -> Base64 -> Uint8Array)
 */
export async function uploadStoryMedia({ uri, userId, fileSize = null, base64Data = null }) {
  if (!uri) throw new Error("Story image URI is required.");
  if (!userId) throw new Error("Authenticated user ID required for story upload.");

  if (fileSize && fileSize > MAX_STORY_SIZE_BYTES) {
    throw new Error(`Story image exceeds 10MB limit (${(fileSize / (1024 * 1024)).toFixed(1)}MB).`);
  }

  const { mime, ext } = getMimeAndExtension(uri);
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storagePath = `${userId}/${fileName}`;

  let uploadBody = null;
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    uploadBody = await response.blob();
  } else {
    if (base64Data) {
      uploadBody = toByteArray(base64Data);
    } else {
      try {
        const FileSystem = await import("expo-file-system");
        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType ? FileSystem.EncodingType.Base64 : "base64",
        });
        uploadBody = toByteArray(b64);
      } catch {
        const response = await fetch(uri);
        uploadBody = await response.blob();
      }
    }
  }

  const { error: uploadError } = await supabase.storage
    .from("story-media")
    .upload(storagePath, uploadBody, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    console.error("Story storage upload error:", uploadError);
    throw new Error(uploadError.message || "Failed to upload story image.");
  }

  const { data: urlData } = supabase.storage.from("story-media").getPublicUrl(storagePath);
  return {
    publicUrl: urlData.publicUrl,
    storagePath,
  };
}

/**
 * Fetch Active (Unexpired) Stories Grouped by User
 * Excludes expired stories (expires_at <= NOW()) and bi-directional blocks.
 */
export async function fetchActiveStories({ viewerId = null } = {}) {
  if (!isSupabaseConfigured) {
    return [];
  }

  let rawStories = [];

  try {
    // 1. Primary: high-performance get_active_stories RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_active_stories", {
      p_viewer_id: viewerId || null,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      rawStories = rpcData;
    } else {
      throw rpcError || new Error("RPC returned no data");
    }
  } catch (rpcErr) {
    console.warn("get_active_stories RPC fallback to direct query:", rpcErr);

    // 2. Direct PostgREST query fallback
    try {
      const nowIso = new Date().toISOString();
      let query = supabase
        .from("stories")
        .select(`
          id,
          user_id,
          media_url,
          caption,
          destination,
          place_id,
          views_count,
          created_at,
          expires_at,
          user:users(id, name, avatar_url)
        `)
        .gt("expires_at", nowIso)
        .eq("visibility", "public")
        .order("created_at", { ascending: true });

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        rawStories = data.map((s) => ({
          story_id: s.id,
          user_id: s.user_id,
          user_name: s.user?.name || "Traveler",
          user_avatar_url: s.user?.avatar_url || null,
          media_url: s.media_url,
          caption: s.caption,
          destination: s.destination,
          place_id: s.place_id,
          views_count: s.views_count || 0,
          created_at: s.created_at,
          expires_at: s.expires_at,
          has_viewed: false,
        }));
      }
    } catch (queryErr) {
      console.error("fetchActiveStories query error:", queryErr);
      return [];
    }
  }

  // Group stories by User for the Story Tray
  const userMap = new Map();

  for (const story of rawStories) {
    const uid = story.user_id;
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        userId: uid,
        userName: story.user_name || "Traveler",
        userAvatar: story.user_avatar_url || null,
        hasUnseen: false,
        stories: [],
      });
    }

    const group = userMap.get(uid);
    const storyItem = {
      id: story.story_id,
      userId: story.user_id,
      mediaUrl: story.media_url,
      caption: story.caption,
      destination: story.destination,
      placeId: story.place_id,
      viewsCount: story.views_count || 0,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      hasViewed: Boolean(story.has_viewed),
    };

    if (!storyItem.hasViewed) {
      group.hasUnseen = true;
    }

    group.stories.push(storyItem);
  }

  return Array.from(userMap.values());
}

/**
 * Publish a New 24-Hour Ephemeral Story
 */
export async function createStory({
  mediaFile, // { uri, size, base64 } or string URI
  caption = "",
  destination = null,
  placeId = null,
  visibility = "public",
}) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Authentication required to publish a travel story.");
  }

  const uri = typeof mediaFile === "object" ? mediaFile.uri : mediaFile;
  const fileSize = typeof mediaFile === "object" ? mediaFile.size : null;
  const base64Data = typeof mediaFile === "object" ? mediaFile.base64 : null;

  if (!uri) {
    throw new Error("Story image is required.");
  }

  // 1. Upload binary to story-media bucket
  const { publicUrl, storagePath } = await uploadStoryMedia({
    uri,
    userId: user.id,
    fileSize,
    base64Data,
  });

  // 2. Insert into public.stories with 24-hour expiration
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STORY_EXPIRATION_HOURS * 60 * 60 * 1000).toISOString();

  const { data: newStory, error: insertError } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      media_url: publicUrl,
      caption: caption ? caption.trim() : null,
      destination: destination ? destination.trim() : null,
      place_id: placeId || null,
      visibility,
      views_count: 0,
      created_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .select("id, user_id, media_url, caption, destination, place_id, views_count, created_at, expires_at")
    .single();

  if (insertError) {
    console.error("createStory DB insert error:", insertError);
    // Cleanup orphaned storage object
    await supabase.storage.from("story-media").remove([storagePath]).catch(() => {});
    throw new Error(insertError.message || "Failed to publish story.");
  }

  return newStory;
}

/**
 * Record a Story View (Idempotent)
 */
export async function recordStoryView(storyId, viewerId) {
  if (!storyId || !viewerId || !isSupabaseConfigured) return;

  try {
    await supabase.rpc("record_story_view", {
      p_story_id: storyId,
      p_viewer_id: viewerId,
    });
  } catch (err) {
    // Fallback direct insert
    try {
      await supabase.from("story_views").insert({
        story_id: storyId,
        viewer_id: viewerId,
      });
    } catch {}
  }
}

/**
 * Delete a Story by Owner (Purges DB row & Storage file)
 */
export async function deleteStory(storyId, mediaUrl = null) {
  if (!storyId) return { success: false };

  // 1. Delete DB row
  const { error: delError } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId);

  if (delError) {
    throw new Error(delError.message || "Could not delete story.");
  }

  // 2. Clean up storage object
  if (mediaUrl && mediaUrl.includes("story-media/")) {
    try {
      const parts = mediaUrl.split("story-media/");
      if (parts[1]) {
        const path = decodeURIComponent(parts[1].split("?")[0]);
        await supabase.storage.from("story-media").remove([path]);
      }
    } catch (storageErr) {
      console.warn("Storage deletion error for story:", storageErr);
    }
  }

  return { success: true, deletedId: storyId };
}

/**
 * Fetch List of Viewers for a Story (Author only)
 */
export async function fetchStoryViewers(storyId) {
  if (!storyId || !isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("story_views")
    .select(`
      viewer_id,
      viewed_at,
      user:users(id, name, avatar_url)
    `)
    .eq("story_id", storyId)
    .order("viewed_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((v) => ({
    userId: v.viewer_id,
    name: v.user?.name || "Traveler",
    avatarUrl: v.user?.avatar_url || null,
    viewedAt: v.viewed_at,
  }));
}
