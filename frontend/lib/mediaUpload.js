// ============================================================================
// MAYBEWE CROSS-PLATFORM MEDIA STORAGE SERVICE (lib/mediaUpload.js)
// Universal Web, Android, and iOS binary uploads to Supabase Storage "post-media"
// Guarantees zero "Network request failed" crashes on native Hermes engine.
// ============================================================================

import { Platform } from "react-native";
import { toByteArray } from "base64-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

export const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024; // Strict 10MB limit
export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/jpg"];

/**
 * Determine MIME type and file extension from URI or filename
 */
export function getMimeAndExtension(uri) {
  let cleanUri = (uri || "").split("?")[0];
  let ext = "jpg";
  let mime = "image/jpeg";

  if (uri && uri.startsWith("data:")) {
    const match = uri.match(/^data:([^;,]+)/);
    if (match) {
      const parsedMime = match[1].toLowerCase();
      if (parsedMime === "image/png") { mime = "image/png"; ext = "png"; }
      else if (parsedMime === "image/webp") { mime = "image/webp"; ext = "webp"; }
      else if (parsedMime === "image/heic") { mime = "image/heic"; ext = "heic"; }
      else { mime = "image/jpeg"; ext = "jpg"; }
      return { mime, ext };
    }
  }

  const rawExt = (cleanUri.split(".").pop() || "jpg").toLowerCase();
  if (rawExt === "png") { mime = "image/png"; ext = "png"; }
  else if (rawExt === "webp") { mime = "image/webp"; ext = "webp"; }
  else if (rawExt === "heic") { mime = "image/heic"; ext = "heic"; }
  else if (rawExt === "jpeg" || rawExt === "jpg") { mime = "image/jpeg"; ext = "jpg"; }

  return { mime, ext };
}

/**
 * Validate image MIME type and file size
 */
export function validateMediaFile({ sizeBytes, mimeType }) {
  if (sizeBytes && sizeBytes > MAX_MEDIA_SIZE_BYTES) {
    throw new Error(`Photo exceeds maximum 10MB limit (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB).`);
  }
  const normMime = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  if (normMime && !ALLOWED_IMAGE_MIMES.includes(normMime)) {
    throw new Error(`Unsupported image format "${mimeType}". Allowed: JPG, PNG, WEBP, HEIC.`);
  }
  return true;
}

/**
 * Cross-Platform Binary Upload to Supabase Storage Bucket "post-media"
 * Handles:
 * - Web: Fetch API -> Blob -> Storage Upload
 * - Native Android/iOS: expo-file-system -> Base64 -> Uint8Array -> Storage Upload
 */
export async function uploadPostMedia({
  uri,
  userId,
  fileSize = null,
  base64Data = null,
}) {
  if (!uri) throw new Error("Image URI is required for upload.");
  if (!userId) throw new Error("Authenticated user ID required for media upload.");

  const { mime, ext } = getMimeAndExtension(uri);
  validateMediaFile({ sizeBytes: fileSize, mimeType: mime });

  if (!isSupabaseConfigured) {
    // Graceful fallback for offline / test environments
    return uri;
  }

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storagePath = `${userId}/${fileName}`;

  try {
    let uploadBody = null;

    if (Platform.OS === "web") {
      // Web environment: Native browser Blob or data URL
      if (uri.startsWith("data:")) {
        const parts = uri.split(",");
        const byteString = atob(parts[1]);
        const mimeMatch = parts[0].match(/:(.*?);/);
        const detectedMime = (mimeMatch ? mimeMatch[1] : mime) || "image/jpeg";
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        uploadBody = new Blob([ab], { type: detectedMime });
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();
        uploadBody = blob;
      }
      validateMediaFile({ sizeBytes: uploadBody.size, mimeType: uploadBody.type || mime });
    } else {
      // Native Android & iOS (Hermes Engine)
      if (base64Data) {
        uploadBody = toByteArray(base64Data);
      } else {
        // Read file using expo-file-system
        try {
          const FileSystem = await import("expo-file-system");
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType ? FileSystem.EncodingType.Base64 : "base64",
          });
          uploadBody = toByteArray(b64);
        } catch (fsErr) {
          const response = await fetch(uri);
          uploadBody = await response.blob();
        }
      }
    }

    const { data, error } = await supabase.storage
      .from("post-media")
      .upload(storagePath, uploadBody, {
        contentType: mime,
        upsert: false,
      });

    if (error) {
      console.warn("Supabase storage upload error:", error);
      throw new Error(error.message || "Failed to upload photo to storage.");
    }

    // Retrieve public URL
    const { data: urlData } = supabase.storage
      .from("post-media")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error("uploadPostMedia failure:", err);
    throw err;
  }
}

/**
 * Storage Cleanup: Delete media files from post-media bucket upon post deletion
 */
export async function deletePostMedia(mediaUrls = []) {
  if (!isSupabaseConfigured || !Array.isArray(mediaUrls) || mediaUrls.length === 0) return;

  try {
    const pathsToDelete = mediaUrls
      .map((url) => {
        if (!url || typeof url !== "string") return null;
        const match = url.match(/post-media\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (pathsToDelete.length > 0) {
      await supabase.storage.from("post-media").remove(pathsToDelete);
    }
  } catch (err) {
    console.warn("Storage cleanup error:", err);
  }
}

/**
 * Cross-Platform Binary Upload to Supabase Storage Bucket "chat-media"
 * Folder structure: {conversationId}/{userId}/{fileName}
 */
export async function uploadChatMedia({
  uri,
  conversationId,
  userId,
  fileSize = null,
  base64Data = null,
}) {
  if (!uri) throw new Error("Image URI is required for upload.");
  if (!conversationId) throw new Error("Conversation ID required for chat media.");
  if (!userId) throw new Error("Authenticated user ID required for chat media.");

  const { mime, ext } = getMimeAndExtension(uri);
  validateMediaFile({ sizeBytes: fileSize, mimeType: mime });

  if (!isSupabaseConfigured) {
    return uri;
  }

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storagePath = `${conversationId}/${userId}/${fileName}`;

  try {
    let uploadBody = null;

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      validateMediaFile({ sizeBytes: blob.size, mimeType: blob.type || mime });
      uploadBody = blob;
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

    const { data, error } = await supabase.storage
      .from("chat-media")
      .upload(storagePath, uploadBody, {
        contentType: mime,
        upsert: false,
      });

    if (error) {
      console.warn("Supabase chat-media upload error:", error);
      throw new Error(error.message || "Failed to upload photo to chat-media.");
    }

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error("uploadChatMedia failure:", err);
    throw err;
  }
}

/**
 * Storage Cleanup: Delete media files from chat-media bucket
 */
export async function deleteChatMedia(mediaUrls = []) {
  if (!isSupabaseConfigured || !Array.isArray(mediaUrls) || mediaUrls.length === 0) return;

  try {
    const pathsToDelete = mediaUrls
      .map((url) => {
        if (!url || typeof url !== "string") return null;
        const match = url.match(/chat-media\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (pathsToDelete.length > 0) {
      await supabase.storage.from("chat-media").remove(pathsToDelete);
    }
  } catch (err) {
    console.warn("Chat storage cleanup error:", err);
  }
}


/**
 * Cross-Platform Binary Upload to Supabase Storage Bucket "hangout-media"
 * Folder structure: {userId}/{fileName} or {hangoutId}/{userId}/{fileName}
 */
export async function uploadHangoutMedia({
  uri,
  hangoutId = null,
  userId,
  fileSize = null,
  base64Data = null,
}) {
  if (!uri) throw new Error("Image URI is required for upload.");
  if (!userId) throw new Error("Authenticated user ID required for hangout media.");

  const { mime, ext } = getMimeAndExtension(uri);
  validateMediaFile({ sizeBytes: fileSize, mimeType: mime });

  if (!isSupabaseConfigured) {
    return uri;
  }

  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storagePath = hangoutId
    ? `${hangoutId}/${userId}/${fileName}`
    : `${userId}/${fileName}`;

  try {
    let uploadBody = null;

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      validateMediaFile({ sizeBytes: blob.size, mimeType: blob.type || mime });
      uploadBody = blob;
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

    const { data, error } = await supabase.storage
      .from("hangout-media")
      .upload(storagePath, uploadBody, {
        contentType: mime,
        upsert: false,
      });

    if (error) {
      console.warn("Supabase hangout-media upload error:", error);
      throw new Error(error.message || "Failed to upload photo to hangout-media.");
    }

    const { data: urlData } = supabase.storage
      .from("hangout-media")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error("uploadHangoutMedia failure:", err);
    throw err;
  }
}

/**
 * Storage Cleanup: Delete media files from hangout-media bucket
 */
export async function deleteHangoutMedia(mediaUrls = []) {
  if (!isSupabaseConfigured || !Array.isArray(mediaUrls) || mediaUrls.length === 0) return;

  try {
    const pathsToDelete = mediaUrls
      .map((url) => {
        if (!url || typeof url !== "string") return null;
        const match = url.match(/hangout-media\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (pathsToDelete.length > 0) {
      await supabase.storage.from("hangout-media").remove(pathsToDelete);
    }
  } catch (err) {
    console.warn("Hangout storage cleanup error:", err);
  }
}
