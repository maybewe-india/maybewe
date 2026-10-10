// ============================================================================
// MAYBEWE EPHEMERAL STORIES — FULL PRODUCTION TEST SUITE
// File: tests/stories_production.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const migrationPath1 = path.join(rootDir, "supabase", "migrations", "17_ephemeral_stories_system.sql");
const migrationPath2 = path.join(rootDir, "backend", "supabase", "migrations", "17_ephemeral_stories_system.sql");
const storiesJsPath = path.join(rootDir, "frontend", "lib", "stories.js");
const storyTrayPath = path.join(rootDir, "frontend", "components", "stories", "StoryTray.jsx");
const storyViewerPath = path.join(rootDir, "frontend", "components", "stories", "StoryViewerModal.jsx");
const createStoryModalPath = path.join(rootDir, "frontend", "components", "stories", "CreateStoryModal.jsx");
const socialTabPath = path.join(rootDir, "frontend", "app", "(tabs)", "social.jsx");

const migrationSql1 = fs.readFileSync(migrationPath1, "utf8");
const migrationSql2 = fs.readFileSync(migrationPath2, "utf8");
const storiesJs = fs.readFileSync(storiesJsPath, "utf8");
const storyTray = fs.readFileSync(storyTrayPath, "utf8");
const storyViewer = fs.readFileSync(storyViewerPath, "utf8");
const createStoryModal = fs.readFileSync(createStoryModalPath, "utf8");
const socialTab = fs.readFileSync(socialTabPath, "utf8");

// ----------------------------------------------------------------------------
// 1. EPHEMERAL STORIES DATABASE SCHEMA & 24-HOUR EXPIRATION
// ----------------------------------------------------------------------------
test("1. Stories Schema & 24-Hour Expiration Definition", () => {
  // Parity between migrations
  assert.equal(migrationSql1, migrationSql2, "Migration 17 files in both locations must match exactly");

  // Table definition
  assert.ok(migrationSql1.includes("CREATE TABLE IF NOT EXISTS public.stories"), "Must create public.stories table");
  assert.ok(migrationSql1.includes("INTERVAL '24 hours'"), "Must enforce 24-hour expiration column");
  assert.ok(migrationSql1.includes("views_count INT DEFAULT 0"), "Must have views_count default 0");
  assert.ok(migrationSql1.includes("media_url TEXT NOT NULL"), "Must require media_url");
  assert.ok(migrationSql1.includes("user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE"), "Must reference public.users with cascade delete");

  // Story views table
  assert.ok(migrationSql1.includes("CREATE TABLE IF NOT EXISTS public.story_views"), "Must create public.story_views table");
  assert.ok(migrationSql1.includes("CONSTRAINT uq_story_viewer UNIQUE (story_id, viewer_id)"), "Must enforce unique view per viewer per story");
});

// ----------------------------------------------------------------------------
// 2. DEDICATED STORAGE BUCKET ISOLATION (story-media)
// ----------------------------------------------------------------------------
test("2. Dedicated story-media Storage Bucket and Security Policies", () => {
  assert.ok(migrationSql1.includes("'story-media'"), "Migration must create story-media bucket");
  assert.ok(migrationSql1.includes("10485760"), "Must enforce 10MB limit in storage configuration");
  assert.ok(migrationSql1.includes("image/jpeg") && migrationSql1.includes("image/png"), "Must restrict to allowed image types");

  // Storage RLS
  assert.ok(migrationSql1.includes("Authenticated Users Upload Story Media"), "Must have RLS policy for story-media uploads");
  assert.ok(migrationSql1.includes("Authenticated Users Delete Own Story Media"), "Must have RLS policy for story-media deletes");
});

// ----------------------------------------------------------------------------
// 3. CONCURRENCY-SAFE POSTGRES TRIGGER & RPC VIEWS
// ----------------------------------------------------------------------------
test("3. Postgres View Counter Trigger and RPC Functions", () => {
  assert.ok(migrationSql1.includes("CREATE OR REPLACE FUNCTION public.sync_story_views_count()"), "Must define sync_story_views_count function");
  assert.ok(migrationSql1.includes("trg_story_views_count"), "Must attach trigger to story_views table");
  assert.ok(migrationSql1.includes("CREATE OR REPLACE FUNCTION public.record_story_view"), "Must define record_story_view RPC");
  assert.ok(migrationSql1.includes("CREATE OR REPLACE FUNCTION public.get_active_stories"), "Must define get_active_stories RPC");
  assert.ok(migrationSql1.includes("CREATE OR REPLACE FUNCTION public.delete_expired_stories()"), "Must define delete_expired_stories cleanup RPC");
});

// ----------------------------------------------------------------------------
// 4. ROW-LEVEL SECURITY (RLS) & PRIVACY BOUNDARIES
// ----------------------------------------------------------------------------
test("4. Row-Level Security (RLS) Policies and Block Isolation", () => {
  assert.ok(migrationSql1.includes("ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY"), "stories table must enable RLS");
  assert.ok(migrationSql1.includes("ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY"), "story_views table must enable RLS");
  assert.ok(migrationSql1.includes("Active stories viewable by everyone"), "Must have policy for active stories");
  assert.ok(migrationSql1.includes("expires_at > TIMEZONE('utc', NOW())"), "RLS must filter out expired stories");

  // Bi-directional block checks in RPC
  assert.ok(migrationSql1.includes("public.blocks"), "get_active_stories RPC must check public.blocks");
  assert.ok(migrationSql1.includes("b.user_id = p_viewer_id AND b.blocked_id = s.user_id"), "Must exclude stories if viewer blocked author");
  assert.ok(migrationSql1.includes("b.user_id = s.user_id AND b.blocked_id = p_viewer_id"), "Must exclude stories if author blocked viewer");
});

// ----------------------------------------------------------------------------
// 5. FRONTEND SERVICE LAYER (lib/stories.js)
// ----------------------------------------------------------------------------
test("5. Frontend Stories Service API and Binary Upload", () => {
  assert.ok(storiesJs.includes("export async function fetchActiveStories"), "Must export fetchActiveStories");
  assert.ok(storiesJs.includes("export async function createStory"), "Must export createStory");
  assert.ok(storiesJs.includes("export async function uploadStoryMedia"), "Must export uploadStoryMedia");
  assert.ok(storiesJs.includes("export async function recordStoryView"), "Must export recordStoryView");
  assert.ok(storiesJs.includes("export async function deleteStory"), "Must export deleteStory");
  assert.ok(storiesJs.includes("export async function fetchStoryViewers"), "Must export fetchStoryViewers");

  // Storage cleanup on delete
  assert.ok(storiesJs.includes("story-media/"), "deleteStory must parse and purge story-media storage path");

  // Expiration calculation
  assert.ok(storiesJs.includes("STORY_EXPIRATION_HOURS * 60 * 60 * 1000"), "createStory must calculate 24h expiration timestamp");
});

// ----------------------------------------------------------------------------
// 6. STORY TRAY & MULTIPLATFORM COMPONENTS
// ----------------------------------------------------------------------------
test("6. Story Tray, Viewer Modal, and Create Modal UI Architecture", () => {
  // StoryTray
  assert.ok(storyTray.includes("fetchActiveStories"), "StoryTray must fetch active stories");
  assert.ok(storyTray.includes("active_stories_tray_channel"), "StoryTray must set up Supabase realtime channel");
  assert.ok(storyTray.includes("StoryViewerModal"), "StoryTray must embed StoryViewerModal");
  assert.ok(storyTray.includes("CreateStoryModal"), "StoryTray must embed CreateStoryModal");
  assert.ok(storyTray.includes("ringUnseen"), "StoryTray must distinguish unseen stories with luxury ring");

  // StoryViewerModal
  assert.ok(storyViewer.includes("STORY_DURATION = 5000"), "StoryViewerModal must auto-advance with 5-second timer");
  assert.ok(storyViewer.includes("recordStoryView"), "StoryViewerModal must record views automatically");
  assert.ok(storyViewer.includes("handleNext"), "StoryViewerModal must support right-tap next navigation");
  assert.ok(storyViewer.includes("handlePrev"), "StoryViewerModal must support left-tap prev navigation");
  assert.ok(storyViewer.includes("handlePressIn") && storyViewer.includes("handlePressOut"), "StoryViewerModal must pause on hold");
  assert.ok(storyViewer.includes("deleteStory"), "StoryViewerModal must support story deletion for owner");

  // CreateStoryModal
  assert.ok(createStoryModal.includes("ImagePicker.launchImageLibraryAsync"), "CreateStoryModal must support gallery upload");
  assert.ok(createStoryModal.includes("ImagePicker.launchCameraAsync"), "CreateStoryModal must support camera capture");
  assert.ok(createStoryModal.includes("createStory"), "CreateStoryModal must invoke createStory API");

  // Integration into social.jsx
  assert.ok(socialTab.includes("import StoryTray"), "Social screen must import StoryTray");
  assert.ok(socialTab.includes("<StoryTray"), "Social screen must render StoryTray");
});

// ----------------------------------------------------------------------------
// 7. ZERO MOCK DATA / ZERO PLACEHOLDER GUARANTEE
// ----------------------------------------------------------------------------
test("7. Zero Mock Data / Real Data Integrity Guarantee", () => {
  assert.ok(!storiesJs.includes("mockStories"), "stories.js must contain zero mock stories");
  assert.ok(!storiesJs.includes("dummyStories"), "stories.js must contain zero dummy stories");
  assert.ok(!storyTray.includes("MOCK_STORIES"), "StoryTray must contain zero mock story data");
  assert.ok(!storyViewer.includes("MOCK_VIEWERS"), "StoryViewerModal must contain zero mock viewers");
});
