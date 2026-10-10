// ============================================================================
// MAYBEWE SOCIAL FEED — FULL PRODUCTION TEST SUITE
// File: tests/social_production.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const migrationPath1 = path.join(rootDir, "supabase", "migrations", "12_social_production_hardening.sql");
const migrationPath2 = path.join(rootDir, "backend", "supabase", "migrations", "12_social_production_hardening.sql");
const postsJsPath = path.join(rootDir, "frontend", "lib", "posts.js");
const socialJsPath = path.join(rootDir, "frontend", "lib", "social.js");
const mediaUploadJsPath = path.join(rootDir, "frontend", "lib", "mediaUpload.js");
const socialTabPath = path.join(rootDir, "frontend", "app", "(tabs)", "social.jsx");
const socialLayoutPath = path.join(rootDir, "frontend", "app", "(tabs)", "_layout.jsx");
const postCardPath = path.join(rootDir, "frontend", "components", "social", "SocialPostCard.jsx");
const commentModalPath = path.join(rootDir, "frontend", "components", "social", "CommentSheetModal.jsx");
const createPostModalPath = path.join(rootDir, "frontend", "components", "social", "CreatePostModal.jsx");

const migrationSql1 = fs.readFileSync(migrationPath1, "utf8");
const migrationSql2 = fs.readFileSync(migrationPath2, "utf8");
const postsJs = fs.readFileSync(postsJsPath, "utf8");
const socialJs = fs.readFileSync(socialJsPath, "utf8");
const mediaUploadJs = fs.readFileSync(mediaUploadJsPath, "utf8");
const socialTab = fs.readFileSync(socialTabPath, "utf8");
const socialLayout = fs.readFileSync(socialLayoutPath, "utf8");
const postCard = fs.readFileSync(postCardPath, "utf8");
const commentModal = fs.readFileSync(commentModalPath, "utf8");
const createPostModal = fs.readFileSync(createPostModalPath, "utf8");

// ----------------------------------------------------------------------------
// 1. POST CREATION, MEDIA URL ATTACHMENT, AND DELETION
// ----------------------------------------------------------------------------
test("1. Post Creation, Media URL Attachment, and Deletion Mechanics", () => {
  // DB schema columns
  assert.ok(migrationSql1.includes("likes_count INT DEFAULT 0"), "Migration must add likes_count");
  assert.ok(migrationSql1.includes("comments_count INT DEFAULT 0"), "Migration must add comments_count");
  assert.ok(migrationSql1.includes("post-media"), "Migration must support post media");

  // posts.js operations
  assert.ok(postsJs.includes("export async function createPost"), "posts.js must export createPost");
  assert.ok(postsJs.includes("uploadPostMedia"), "createPost must handle media uploads via uploadPostMedia");
  assert.ok(postsJs.includes("export async function deletePost"), "posts.js must export deletePost");
  assert.ok(postsJs.includes("deletePostMedia"), "deletePost must invoke deletePostMedia for storage cleanup");

  // Deletion cascade verification in SQL
  assert.ok(migrationSql1.includes("ON DELETE CASCADE"), "Foreign keys must cascade deletion from posts to comments/reactions");

  // Parity between both migration locations
  assert.equal(migrationSql1, migrationSql2, "Frontend and backend migration 12 must be identical");
});

// ----------------------------------------------------------------------------
// 2. CONCURRENCY & DUPLICATE REACTION PREVENTION
// ----------------------------------------------------------------------------
test("2. Concurrency & Duplicate Reaction Prevention", () => {
  // Unique constraint on reactions
  assert.ok(
    migrationSql1.includes("CONSTRAINT uq_post_reactions_post_user UNIQUE (post_id, user_id)") ||
    migrationSql1.includes("UNIQUE (post_id, user_id)"),
    "post_reactions must enforce UNIQUE(post_id, user_id)"
  );

  // Counter triggers
  assert.ok(
    migrationSql1.includes("sync_post_reactions_count") || migrationSql1.includes("fn_post_reaction_count"),
    "Must define post reaction counter trigger function"
  );
  assert.ok(migrationSql1.includes("AFTER INSERT OR DELETE ON public.post_reactions"), "Trigger must fire AFTER INSERT OR DELETE on post_reactions");
  assert.ok(migrationSql1.includes("UPDATE public.posts"), "Trigger must update posts.likes_count directly in DB");

  // Client code safety
  assert.ok(postsJs.includes("export async function togglePostReaction"), "posts.js must export togglePostReaction");
  assert.ok(postsJs.includes("23505"), "togglePostReaction must handle unique violation 23505 gracefully");
  assert.ok(!postsJs.includes("likes_count + 1"), "Client must not compute naive client-side increment drift");
});

// ----------------------------------------------------------------------------
// 3. COMMENT CREATION, DELETION, AND AUTHORIZATION BOUNDARIES
// ----------------------------------------------------------------------------
test("3. Comment Creation, Deletion, and Authorization Boundaries", () => {
  // Comments schema constraints
  assert.ok(
    migrationSql1.includes("char_length(trim(content)) > 0"),
    "comments table must reject empty or whitespace-only content"
  );
  assert.ok(
    migrationSql1.includes("sync_post_comments_count") || migrationSql1.includes("fn_post_comment_count"),
    "Must define post comment counter trigger function"
  );
  assert.ok(migrationSql1.includes("AFTER INSERT OR DELETE ON public.comments"), "Trigger must fire AFTER INSERT OR DELETE on comments");

  // RLS policies on comments
  assert.ok(migrationSql1.includes("Users can post comments") || migrationSql1.includes("Users can insert their own comments"), "Must have comment insert RLS policy");
  assert.ok(migrationSql1.includes("Users can delete their own comments"), "Must have comment delete RLS policy");
  assert.ok(migrationSql1.includes("auth.uid() = user_id"), "Comment policies must bind to auth.uid()");

  // Frontend API
  assert.ok(postsJs.includes("export async function createPostComment"), "posts.js must export createPostComment");
  assert.ok(postsJs.includes("export async function deletePostComment"), "posts.js must export deletePostComment");
  assert.ok(postsJs.includes("export async function fetchPostComments"), "posts.js must export fetchPostComments");
});

// ----------------------------------------------------------------------------
// 4. FOLLOW / UNFOLLOW MECHANICS & SELF-FOLLOW PREVENTION
// ----------------------------------------------------------------------------
test("4. Follow/Unfollow Mechanics & Self-Follow Prevention", () => {
  // DB self-follow constraint
  assert.ok(
    migrationSql1.includes("chk_no_self_follow") && (migrationSql1.includes("follower_id <> following_id") || migrationSql1.includes("follower_id != following_id")),
    "follows table must enforce CHECK(follower_id <> following_id)"
  );
  assert.ok(
    migrationSql1.includes("uq_follows_follower_following") || migrationSql1.includes("UNIQUE (follower_id, following_id)"),
    "follows table must enforce UNIQUE(follower_id, following_id)"
  );

  // Frontend API
  assert.ok(socialJs.includes("export async function followUser"), "social.js must export followUser");
  assert.ok(socialJs.includes("export async function unfollowUser"), "social.js must export unfollowUser");
  assert.ok(socialJs.includes("String(followerId) === String(followingId)"), "social.js must prevent self-follow at client layer as well");
});

// ----------------------------------------------------------------------------
// 5. BI-DIRECTIONAL BLOCK EXCLUSION FROM FEED AND COMMENTS
// ----------------------------------------------------------------------------
test("5. Bi-Directional Block Exclusion from Feed Queries", () => {
  // DB blocks schema
  assert.ok(
    migrationSql1.includes("chk_no_self_block") && (migrationSql1.includes("user_id <> blocked_id") || migrationSql1.includes("user_id != blocked_id")),
    "blocks table must enforce CHECK(user_id <> blocked_id)"
  );
  assert.ok(
    migrationSql1.includes("uq_block_pair") || migrationSql1.includes("UNIQUE (user_id, blocked_id)"),
    "blocks table must enforce UNIQUE(user_id, blocked_id)"
  );

  // RPC get_social_feed bidirectional logic
  assert.ok(migrationSql1.includes("CREATE OR REPLACE FUNCTION public.get_social_feed"), "Must define get_social_feed RPC");
  assert.ok(migrationSql1.includes("blocks b") || migrationSql1.includes("blocks.user_id"), "Feed RPC must query blocks");
  assert.ok(migrationSql1.includes("b.user_id = p_viewer_id AND b.blocked_id = p.user_id"), "Feed RPC must exclude when viewer blocked author");
  assert.ok(migrationSql1.includes("b.user_id = p.user_id AND b.blocked_id = p_viewer_id"), "Feed RPC must exclude when author blocked viewer");

  // Client-side fallback also implements bidirectional block join
  assert.ok(postsJs.includes("blocks"), "posts.js client fallback must query blocks");
  assert.ok(postsJs.includes("blockedUserIds"), "posts.js must filter blockedUserIds");

  // social.js block APIs
  assert.ok(socialJs.includes("export async function blockUser"), "social.js must export blockUser");
  assert.ok(socialJs.includes("export async function unblockUser"), "social.js must export unblockUser");
  assert.ok(socialJs.includes("export async function isUserBlocked"), "social.js must export isUserBlocked");
});

// ----------------------------------------------------------------------------
// 6. RLS VIOLATION ASSERTIONS & REPORT MODERATION
// ----------------------------------------------------------------------------
test("6. RLS Violation Assertions & Report Moderation Boundaries", () => {
  // Posts RLS
  assert.ok(migrationSql1.includes("ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY"), "posts must have RLS enabled");
  assert.ok(migrationSql1.includes("Users can delete their own posts"), "posts delete policy");

  // Reports RLS: normal users cannot read moderation reports
  assert.ok(migrationSql1.includes("ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY"), "reports must have RLS enabled");
  assert.ok(migrationSql1.includes("Authenticated users submit reports") || migrationSql1.includes("Users can insert reports"), "Users can insert reports");
  assert.ok(migrationSql1.includes("Reports strictly private to administrators") || migrationSql1.includes("Admins can view reports"), "Only admins/service role can view reports");

  // social.js submitReport
  assert.ok(socialJs.includes("export async function submitReport"), "social.js must export submitReport");
  assert.ok(socialJs.includes("target_type: targetType"), "submitReport must populate target_type");
});

// ----------------------------------------------------------------------------
// 7. STORAGE BUCKET CONFIGURATION & CROSS-PLATFORM BINARY HANDLING
// ----------------------------------------------------------------------------
test("7. Storage Bucket Configuration & Cross-Platform Binary Handling", () => {
  // Bucket configuration in migration
  assert.ok(migrationSql1.includes("'post-media'"), "Migration must insert 'post-media' bucket");
  assert.ok(migrationSql1.includes("10485760"), "Migration must configure 10MB limit (10485760 bytes)");
  assert.ok(migrationSql1.includes("image/jpeg") && migrationSql1.includes("image/png") && migrationSql1.includes("image/webp"), "Bucket must restrict to valid image MIME types");

  // Storage RLS
  assert.ok(migrationSql1.includes("Public Read Post Media") || migrationSql1.includes("Public read access for post-media"), "Storage public read policy");
  assert.ok(migrationSql1.includes("Authenticated Users Upload Post Media") || migrationSql1.includes("Authenticated users can upload post-media"), "Storage authenticated insert policy");
  assert.ok(migrationSql1.includes("Authenticated Users Delete Own Post Media") || migrationSql1.includes("Users can delete own post-media"), "Storage delete own media policy");

  // Cross-platform upload in mediaUpload.js
  assert.ok(mediaUploadJs.includes("Platform.OS"), "mediaUpload.js must bifurcate Web vs Native");
  assert.ok(mediaUploadJs.includes("readAsStringAsync"), "Native must use expo-file-system");
  assert.ok(mediaUploadJs.includes("toByteArray"), "Native must decode base64 to Uint8Array for Hermes");
  assert.ok(mediaUploadJs.includes("10 * 1024 * 1024"), "mediaUpload.js must enforce 10MB client check");
});

// ----------------------------------------------------------------------------
// 8. FEED ARCHITECTURE, KEYSET PAGINATION, DEDUPLICATION & REALTIME
// ----------------------------------------------------------------------------
test("8. Keyset Cursor Pagination, In-Memory Deduplication, and Scoped Realtime", () => {
  // Keyset cursor in migration get_social_feed
  assert.ok(
    migrationSql1.includes("p.created_at < p_cursor_created_at") && migrationSql1.includes("p.id < p_cursor_id"),
    "RPC must use composite keyset cursor on (created_at, id)"
  );

  // Keyset cursor in posts.js fetchFeedPosts
  assert.ok(postsJs.includes("actualCursorCreatedAt") || postsJs.includes("cursorCreatedAt"), "posts.js must handle keyset cursor");
  assert.ok(postsJs.includes("nextCursor"), "posts.js must return nextCursor for infinite scroll");

  // FlatList deduplication in social.jsx
  assert.ok(socialTab.includes("seenIdsRef"), "social.jsx must use seenIdsRef Set for key deduplication");
  assert.ok(socialTab.includes("uniquePosts"), "social.jsx must filter incoming pages against seenIds");

  // Granular UI states
  assert.ok(socialTab.includes("FeedSkeleton"), "social.jsx must import and use FeedSkeleton");
  assert.ok(socialTab.includes("FeedEmptyState"), "social.jsx must import and use FeedEmptyState");
  assert.ok(socialTab.includes("errorBanner"), "social.jsx must render error/retry banner");

  // Scoped realtime channel
  assert.ok(socialTab.includes('supabase.channel("social_feed_active_screen")'), "social.jsx must establish scoped realtime channel");
  assert.ok(socialTab.includes("cleanupRealtimeSubscription"), "social.jsx must clean up realtime channel on unmount");

  // Tab registration in _layout.jsx
  assert.ok(socialLayout.includes("name: 'social'"), "_layout.jsx must register social in TABS array");
  assert.ok(socialLayout.includes("<Tabs.Screen name=\"social\""), "_layout.jsx must declare social Tabs.Screen");
});

// ----------------------------------------------------------------------------
// 9. STRICT RULE: ZERO DEMO USERS, ZERO SYNTHETIC POSTS, ZERO FAKE DATA
// ----------------------------------------------------------------------------
test("9. Zero Synthetic Posts, No Demo Users, No Fake Counters Invariant", () => {
  // Check posts.js
  assert.ok(!postsJs.includes("post-${Date.now()}"), "posts.js must not contain synthetic post ID generators");
  assert.ok(!postsJs.includes("Priya Sharma"), "posts.js must not contain hardcoded demo user Priya Sharma");
  assert.ok(!postsJs.includes("demo-user"), "posts.js must not contain fake demo-user");

  // Check CreatePostModal.jsx
  assert.ok(!createPostModal.includes("Priya Sharma"), "CreatePostModal must not fallback to synthetic user Priya Sharma");

  // Check FeedEmptyState.jsx
  assert.ok(fs.existsSync(path.join(rootDir, "frontend", "components", "social", "FeedEmptyState.jsx")), "FeedEmptyState component must exist");
  const emptyState = fs.readFileSync(path.join(rootDir, "frontend", "components", "social", "FeedEmptyState.jsx"), "utf8");
  assert.ok(emptyState.includes("No posts yet. Follow travelers or create your first post!"), "Empty state must show authentic prompt without synthetic posts");
});
