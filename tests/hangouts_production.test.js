// ============================================================================
// MAYBEWE REAL HANGOUTS & MEETUPS — FULL PRODUCTION TEST SUITE
// File: tests/hangouts_production.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const migration20Path1 = path.join(rootDir, "supabase", "migrations", "20_real_hangouts_system.sql");
const migration20Path2 = path.join(rootDir, "backend", "supabase", "migrations", "20_real_hangouts_system.sql");

const hangoutsJsPath = path.join(rootDir, "frontend", "lib", "hangouts.js");
const mediaUploadJsPath = path.join(rootDir, "frontend", "lib", "mediaUpload.js");
const hangoutsListPath = path.join(rootDir, "frontend", "components", "HangoutsListView.jsx");
const createHangoutModalPath = path.join(rootDir, "frontend", "components", "CreateHangoutModal.jsx");
const hangoutDetailModalPath = path.join(rootDir, "frontend", "components", "HangoutDetailModal.jsx");

const migration20Sql1 = fs.readFileSync(migration20Path1, "utf8");
const migration20Sql2 = fs.readFileSync(migration20Path2, "utf8");
const hangoutsJs = fs.readFileSync(hangoutsJsPath, "utf8");
const mediaUploadJs = fs.readFileSync(mediaUploadJsPath, "utf8");
const hangoutsList = fs.readFileSync(hangoutsListPath, "utf8");
const createHangoutModal = fs.readFileSync(createHangoutModalPath, "utf8");
const hangoutDetailModal = fs.readFileSync(hangoutDetailModalPath, "utf8");

// ----------------------------------------------------------------------------
// 1. HANGOUTS DATABASE SCHEMA & CONCURRENCY PARITY
// ----------------------------------------------------------------------------
test("1. Hangouts Database Schema & Parity Verification", () => {
  assert.equal(migration20Sql1, migration20Sql2, "Migration 20 files in both locations must match exactly");

  // Table public.hangouts
  assert.ok(migration20Sql1.includes("CREATE TABLE IF NOT EXISTS public.hangouts"), "Must create hangouts table");
  assert.ok(migration20Sql1.includes("creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE"), "Must link creator to public.users");
  assert.ok(migration20Sql1.includes("char_length(trim(title)) >= 3 AND char_length(title) <= 120"), "Must enforce title length 3-120");
  assert.ok(migration20Sql1.includes("place_id UUID REFERENCES public.places(id) ON DELETE SET NULL"), "Must link place_id to public.places");
  assert.ok(migration20Sql1.includes("coordinates extensions.geography(Point, 4326)"), "Must use PostGIS Point 4326 coordinates");
  assert.ok(migration20Sql1.includes("max_travelers INT NOT NULL DEFAULT 6 CHECK (max_travelers >= 2 AND max_travelers <= 50)"), "Must constrain max_travelers 2-50");
  assert.ok(migration20Sql1.includes("current_travelers_count INT NOT NULL DEFAULT 1 CHECK (current_travelers_count >= 1)"), "Must track current_travelers_count >= 1");
  assert.ok(migration20Sql1.includes("status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))"), "Must constrain status");
  assert.ok(migration20Sql1.includes("conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL"), "Must link to group conversation");
  assert.ok(migration20Sql1.includes("chk_hangout_start_after_created"), "Must check start_time after created_at");

  // Table public.hangout_participants
  assert.ok(migration20Sql1.includes("CREATE TABLE IF NOT EXISTS public.hangout_participants"), "Must create hangout_participants table");
  assert.ok(migration20Sql1.includes("CONSTRAINT uq_hangout_participant UNIQUE (hangout_id, user_id)"), "Must enforce unique participant per hangout");
  assert.ok(migration20Sql1.includes("role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member', 'pending'))"), "Must constrain participant role");

  // Table public.hangout_invitations
  assert.ok(migration20Sql1.includes("CREATE TABLE IF NOT EXISTS public.hangout_invitations"), "Must create hangout_invitations table");
  assert.ok(migration20Sql1.includes("CONSTRAINT uq_hangout_invitation UNIQUE (hangout_id, invitee_id)"), "Must enforce unique invitation per hangout and invitee");
  assert.ok(migration20Sql1.includes("CONSTRAINT chk_no_self_invite CHECK (inviter_id <> invitee_id)"), "Must prevent self invitations");
});

// ----------------------------------------------------------------------------
// 2. CONCURRENCY-SAFE CAPACITY TRIGGER
// ----------------------------------------------------------------------------
test("2. Concurrency-Safe Capacity Trigger Verification", () => {
  assert.ok(migration20Sql1.includes("FUNCTION public.sync_hangout_travelers_count"), "Must define sync_hangout_travelers_count function");
  assert.ok(migration20Sql1.includes("FOR UPDATE"), "Must use row-level FOR UPDATE lock to serialize concurrent joins");
  assert.ok(migration20Sql1.includes("RAISE EXCEPTION 'Hangout is at full capacity'"), "Must raise exception on capacity breach");
  assert.ok(migration20Sql1.includes("CREATE TRIGGER trg_sync_hangout_travelers_count"), "Must attach trigger to hangout_participants");
  assert.ok(migration20Sql1.includes("AFTER INSERT OR UPDATE OR DELETE ON public.hangout_participants"), "Must trigger on insert, update, delete");
});

// ----------------------------------------------------------------------------
// 3. STORED PROCEDURES & ATOMIC RPCS
// ----------------------------------------------------------------------------
test("3. Stored Procedures & Atomic RPCs Verification", () => {
  // create_hangout RPC
  assert.ok(migration20Sql1.includes("FUNCTION public.create_hangout"), "Must define create_hangout RPC");
  assert.ok(migration20Sql1.includes("INSERT INTO public.conversations (type, title, direct_key)"), "Must provision group conversation atomically");
  assert.ok(migration20Sql1.includes("INSERT INTO public.hangout_participants"), "Must insert creator as organizer");

  // join_hangout RPC
  assert.ok(migration20Sql1.includes("FUNCTION public.join_hangout"), "Must define join_hangout RPC");
  assert.ok(migration20Sql1.includes("public.is_user_blocked"), "Must verify block status before join");
  assert.ok(migration20Sql1.includes("INSERT INTO public.conversation_participants"), "Must enroll joiner in group conversation");

  // leave_hangout RPC
  assert.ok(migration20Sql1.includes("FUNCTION public.leave_hangout"), "Must define leave_hangout RPC");
  assert.ok(migration20Sql1.includes("DELETE FROM public.hangout_participants"), "Must remove user from hangout");

  // invite_to_hangout RPC
  assert.ok(migration20Sql1.includes("FUNCTION public.invite_to_hangout"), "Must define invite_to_hangout RPC");

  // respond_to_invitation RPC
  assert.ok(migration20Sql1.includes("FUNCTION public.respond_to_invitation"), "Must define respond_to_invitation RPC");

  // cancel_hangout RPC
  assert.ok(migration20Sql1.includes("FUNCTION public.cancel_hangout"), "Must define cancel_hangout RPC");
});

// ----------------------------------------------------------------------------
// 4. BI-DIRECTIONAL BLOCK ISOLATION & STORAGE
// ----------------------------------------------------------------------------
test("4. Bi-Directional Safety & Storage Verification", () => {
  // Block trigger on invitations
  assert.ok(migration20Sql1.includes("FUNCTION public.check_invitation_block_status"), "Must define invitation block check trigger");
  assert.ok(migration20Sql1.includes("Cannot invite user: An active block exists between participants."), "Must raise block exception");

  // Non-recursive helper functions
  assert.ok(migration20Sql1.includes("FUNCTION public.is_hangout_participant"), "Must define non-recursive is_hangout_participant");
  assert.ok(migration20Sql1.includes("FUNCTION public.is_hangout_creator"), "Must define non-recursive is_hangout_creator");
  assert.ok(migration20Sql1.includes("FUNCTION public.is_user_blocked"), "Must define non-recursive is_user_blocked");

  // Storage bucket hangout-media
  assert.ok(migration20Sql1.includes("'hangout-media'"), "Must configure hangout-media bucket");
  assert.ok(migration20Sql1.includes("10485760"), "Must enforce 10MB limit on storage");
  assert.ok(migration20Sql1.includes("Public Read Hangout Media"), "Must define read policy");
  assert.ok(migration20Sql1.includes("Authenticated Upload Hangout Media"), "Must define upload policy");

  // Media upload service
  assert.ok(mediaUploadJs.includes("export async function uploadHangoutMedia"), "mediaUpload.js must export uploadHangoutMedia");
  assert.ok(mediaUploadJs.includes("export async function deleteHangoutMedia"), "mediaUpload.js must export deleteHangoutMedia");
  assert.ok(mediaUploadJs.includes('"hangout-media"'), "mediaUpload.js must reference hangout-media bucket");
});

// ----------------------------------------------------------------------------
// 5. FRONTEND HANGOUTS SERVICE INTEGRATION
// ----------------------------------------------------------------------------
test("5. Frontend Service Layer Verification", () => {
  // Zero mock/demo hangouts
  assert.ok(hangoutsJs.includes("export const DEMO_HANGOUTS = [];"), "Must not seed synthetic demo hangouts");
  assert.ok(hangoutsJs.includes("return [];"), "getDemoHangouts must return empty array");

  // Service RPCs
  assert.ok(hangoutsJs.includes('supabase.rpc("create_hangout"'), "Must call create_hangout RPC");
  assert.ok(hangoutsJs.includes('supabase.rpc("join_hangout"'), "Must call join_hangout RPC");
  assert.ok(hangoutsJs.includes('supabase.rpc("leave_hangout"'), "Must call leave_hangout RPC");
  assert.ok(hangoutsJs.includes('supabase.rpc("invite_to_hangout"'), "Must call invite_to_hangout RPC");
  assert.ok(hangoutsJs.includes('supabase.rpc("respond_to_invitation"'), "Must call respond_to_invitation RPC");
  assert.ok(hangoutsJs.includes('supabase.rpc("cancel_hangout"'), "Must call cancel_hangout RPC");
  assert.ok(hangoutsJs.includes('supabase.rpc("get_discover_hangouts"'), "Must call get_discover_hangouts RPC");
  assert.ok(hangoutsJs.includes('supabase.rpc("get_user_hangouts"'), "Must call get_user_hangouts RPC");

  // Scoped realtime subscriptions with teardown
  assert.ok(hangoutsJs.includes("export function subscribeToHangoutUpdates"), "Must export subscribeToHangoutUpdates");
  assert.ok(hangoutsJs.includes("export function subscribeToHangoutsFeed"), "Must export subscribeToHangoutsFeed");
  assert.ok(hangoutsJs.includes("supabase.removeChannel(channel)"), "Must clean up channel to prevent leaks");
});

// ----------------------------------------------------------------------------
// 6. FRONTEND COMPONENTS PURITY & ACTION INTEGRATION
// ----------------------------------------------------------------------------
test("6. Frontend Components & Modals Verification", () => {
  // HangoutsListView
  assert.ok(hangoutsList.includes("subscribeToHangoutsFeed"), "HangoutsListView must subscribe to realtime feed");
  assert.ok(hangoutsList.includes("unsubscribe()"), "HangoutsListView must clean up subscription on unmount");
  assert.ok(hangoutsList.includes("fetchDiscoverHangouts"), "HangoutsListView must load discover hangouts");
  assert.ok(hangoutsList.includes("fetchUserHangouts"), "HangoutsListView must load user hangouts");

  // CreateHangoutModal
  assert.ok(!createHangoutModal.includes("COMPANIONS_PRESET"), "CreateHangoutModal must NOT include synthetic companion presets");
  assert.ok(createHangoutModal.includes("uploadHangoutMedia"), "CreateHangoutModal must support real media upload");
  assert.ok(createHangoutModal.includes("maxTravelers"), "CreateHangoutModal must support capacity configuration");

  // HangoutDetailModal
  assert.ok(hangoutDetailModal.includes("handleJoinHangout"), "HangoutDetailModal must support Join Meetup");
  assert.ok(hangoutDetailModal.includes("handleLeaveHangout"), "HangoutDetailModal must support Leave Meetup");
  assert.ok(hangoutDetailModal.includes("handleCancelHangout"), "HangoutDetailModal must support Cancel Meetup");
  assert.ok(!hangoutDetailModal.includes("'user-demo-priya'"), "HangoutDetailModal must NOT contain hardcoded user-demo-priya");
  assert.ok(hangoutDetailModal.includes("subscribeToHangoutUpdates"), "HangoutDetailModal must subscribe to room updates");
});


const migration23Path1 = path.join(rootDir, "supabase", "migrations", "23_hangout_database_notifications.sql");
const migration23Path2 = path.join(rootDir, "backend", "supabase", "migrations", "23_hangout_database_notifications.sql");
const migration23Sql1 = fs.readFileSync(migration23Path1, "utf8");
const migration23Sql2 = fs.readFileSync(migration23Path2, "utf8");

// ----------------------------------------------------------------------------
// 7. DATABASE-DRIVEN NOTIFICATIONS INTEGRATION & RECIPIENT ISOLATION
// ----------------------------------------------------------------------------
test("7. Hangouts Database-Driven Notifications & Security Verification", () => {
  assert.equal(migration23Sql1, migration23Sql2, "Migration 23 files in both locations must match exactly");

  // Schema & Recipient sync
  assert.ok(migration23Sql1.includes("recipient_id UUID REFERENCES public.users(id)"), "Must support recipient_id column");
  assert.ok(migration23Sql1.includes("trg_sync_notification_recipient"), "Must synchronize user_id and recipient_id");

  // Supported event types
  assert.ok(migration23Sql1.includes("hangout_invitation"), "Must allow hangout_invitation type");
  assert.ok(migration23Sql1.includes("hangout_invitation_accepted"), "Must allow hangout_invitation_accepted type");
  assert.ok(migration23Sql1.includes("hangout_cancelled"), "Must allow hangout_cancelled type");

  // RLS recipient isolation
  assert.ok(migration23Sql1.includes("auth.uid() = user_id OR auth.uid() = recipient_id"), "RLS must strictly isolate to recipient");

  // Authoritative notifications inside stored procedures with deduplication & block safety
  assert.ok(migration23Sql1.includes("type = 'hangout_invitation'"), "invite_to_hangout must create hangout_invitation row");
  assert.ok(migration23Sql1.includes("type = 'hangout_invitation_accepted'"), "respond_to_invitation must create hangout_invitation_accepted row");
  assert.ok(migration23Sql1.includes("type = 'hangout_cancelled'"), "cancel_hangout must create hangout_cancelled row");
  assert.ok(migration23Sql1.includes("NOT public.is_user_blocked"), "Must enforce block safety on notification creation");
  assert.ok(migration23Sql1.includes("NOT EXISTS"), "Must enforce deduplication check before notification insert");

  // Notifications alias view
  assert.ok(migration23Sql1.includes("CREATE OR REPLACE VIEW public.notifications"), "Must provide notifications alias view");
  assert.ok(migration23Sql1.includes("security_invoker = true"), "Notifications view must enforce security_invoker");
});
