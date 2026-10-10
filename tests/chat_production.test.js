// ============================================================================
// MAYBEWE REAL-TIME CHAT & MESSAGING — FULL PRODUCTION TEST SUITE
// File: tests/chat_production.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const migration18Path1 = path.join(rootDir, "supabase", "migrations", "18_realtime_chat_messaging_system.sql");
const migration18Path2 = path.join(rootDir, "backend", "supabase", "migrations", "18_realtime_chat_messaging_system.sql");
const migration19Path1 = path.join(rootDir, "supabase", "migrations", "19_fix_chat_rls_recursion.sql");
const migration19Path2 = path.join(rootDir, "backend", "supabase", "migrations", "19_fix_chat_rls_recursion.sql");

const groupChatJsPath = path.join(rootDir, "frontend", "lib", "groupChat.js");
const messagesJsPath = path.join(rootDir, "frontend", "lib", "messages.js");
const mediaUploadJsPath = path.join(rootDir, "frontend", "lib", "mediaUpload.js");
const chatInboxPath = path.join(rootDir, "frontend", "components", "ChatInboxView.jsx");
const chatScreenPath = path.join(rootDir, "frontend", "app", "chat", "[id].jsx");
const chatSharePickerPath = path.join(rootDir, "frontend", "components", "ChatSharePickerModal.jsx");

const migration18Sql1 = fs.readFileSync(migration18Path1, "utf8");
const migration18Sql2 = fs.readFileSync(migration18Path2, "utf8");
const migration19Sql1 = fs.readFileSync(migration19Path1, "utf8");
const migration19Sql2 = fs.readFileSync(migration19Path2, "utf8");

const groupChatJs = fs.readFileSync(groupChatJsPath, "utf8");
const messagesJs = fs.readFileSync(messagesJsPath, "utf8");
const mediaUploadJs = fs.readFileSync(mediaUploadJsPath, "utf8");
const chatInbox = fs.readFileSync(chatInboxPath, "utf8");
const chatScreen = fs.readFileSync(chatScreenPath, "utf8");
const chatSharePicker = fs.readFileSync(chatSharePickerPath, "utf8");

// ----------------------------------------------------------------------------
// 1. CHAT DATABASE SCHEMA & CONCURRENCY PARITY
// ----------------------------------------------------------------------------
test("1. Chat Database Schema & Parity Verification", () => {
  assert.equal(migration18Sql1, migration18Sql2, "Migration 18 files in both locations must match exactly");
  assert.equal(migration19Sql1, migration19Sql2, "Migration 19 files in both locations must match exactly");

  // Conversations table
  assert.ok(migration18Sql1.includes("CREATE TABLE IF NOT EXISTS public.conversations"), "Must create conversations table");
  assert.ok(migration18Sql1.includes("direct_key TEXT UNIQUE"), "Must enforce unique direct_key for 1:1 threads");
  assert.ok(migration18Sql1.includes("last_message_at TIMESTAMPTZ"), "Must track last_message_at");

  // Participants table
  assert.ok(migration18Sql1.includes("CREATE TABLE IF NOT EXISTS public.conversation_participants"), "Must create conversation_participants table");
  assert.ok(migration18Sql1.includes("CONSTRAINT uq_conversation_participant UNIQUE (conversation_id, user_id)"), "Must enforce unique participant per thread");
  assert.ok(migration18Sql1.includes("last_read_at TIMESTAMPTZ"), "Must track last_read_at for read receipts");

  // Messages table
  assert.ok(migration18Sql1.includes("CREATE TABLE IF NOT EXISTS public.messages"), "Must create messages table");
  assert.ok(migration18Sql1.includes("conversation_id UUID"), "Must link to conversation_id");
  assert.ok(migration18Sql1.includes("sender_id UUID"), "Must link to sender_id");
  assert.ok(migration18Sql1.includes("media_url TEXT"), "Must support media_url");
});

// ----------------------------------------------------------------------------
// 2. IDEMPOTENT CONVERSATION CREATION & UNREAD RECEIPT RPCS
// ----------------------------------------------------------------------------
test("2. Stored Procedures: get_or_create_direct_conversation and mark_conversation_as_read", () => {
  assert.ok(migration18Sql1.includes("CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation"), "Must define get_or_create_direct_conversation RPC");
  assert.ok(migration18Sql1.includes("LEAST(p_user_a, p_user_b)::text || ':' || GREATEST(p_user_a, p_user_b)::text"), "Must use deterministic canonical key");
  assert.ok(migration18Sql1.includes("CREATE OR REPLACE FUNCTION public.mark_conversation_as_read"), "Must define mark_conversation_as_read RPC");
  assert.ok(migration18Sql1.includes("CREATE OR REPLACE FUNCTION public.get_user_conversations"), "Must define get_user_conversations RPC");
  assert.ok(migration18Sql1.includes("m.created_at > mc.last_read_at"), "get_user_conversations must compute unread_count based on last_read_at");
});

// ----------------------------------------------------------------------------
// 3. BI-DIRECTIONAL SAFETY & BLOCK LOCKDOWN
// ----------------------------------------------------------------------------
test("3. Bi-Directional Safety & Block Lockdown Enforcement", () => {
  assert.ok(migration18Sql1.includes("CREATE OR REPLACE FUNCTION public.check_message_block_status()"), "Must define check_message_block_status trigger function");
  assert.ok(migration18Sql1.includes("trg_check_message_block_status"), "Must attach trigger to messages table");
  assert.ok(migration18Sql1.includes("An active block is in place between participants"), "Trigger must reject messages if participants are blocked");
  assert.ok(migration18Sql1.includes("NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.user_id = p_user_id AND b.blocked_id = pi.p_id)"), "get_user_conversations must exclude blocked users");
});

// ----------------------------------------------------------------------------
// 4. STORAGE BUCKET ISOLATION (chat-media)
// ----------------------------------------------------------------------------
test("4. Storage Bucket Configuration & chat-media RLS Policies", () => {
  assert.ok(migration18Sql1.includes("'chat-media'"), "Migration must create chat-media bucket");
  assert.ok(migration18Sql1.includes("10485760"), "chat-media must enforce 10MB file limit");
  assert.ok(migration19Sql1.includes("Participant Upload Chat Media"), "Storage RLS must restrict uploads to conversation participants");
  assert.ok(mediaUploadJs.includes("export async function uploadChatMedia"), "mediaUpload.js must export uploadChatMedia");
});

// ----------------------------------------------------------------------------
// 5. RLS SECURITY & RECURSION PREVENTION
// ----------------------------------------------------------------------------
test("5. RLS Security Enforcement & Non-Recursive Helper", () => {
  assert.ok(migration19Sql1.includes("CREATE OR REPLACE FUNCTION public.is_conversation_participant"), "Migration 19 must define is_conversation_participant SECURITY DEFINER helper");
  assert.ok(migration19Sql1.includes("public.is_conversation_participant(id, auth.uid())"), "Conversations RLS must use non-recursive participant helper");
  assert.ok(migration19Sql1.includes("public.is_conversation_participant(conversation_id, auth.uid())"), "Messages RLS must use non-recursive participant helper");
});

// ----------------------------------------------------------------------------
// 6. FRONTEND SERVICE LAYER & LIFECYCLE CHANNELS
// ----------------------------------------------------------------------------
test("6. Frontend Chat Services & Scoped Realtime Lifecycle", () => {
  assert.ok(groupChatJs.includes("export async function fetchConversations"), "groupChat.js must export fetchConversations");
  assert.ok(groupChatJs.includes("export async function getOrCreateDirectChat"), "groupChat.js must export getOrCreateDirectChat");
  assert.ok(groupChatJs.includes("export async function fetchGroupMessages"), "groupChat.js must export fetchGroupMessages");
  assert.ok(groupChatJs.includes("export async function sendChatMessage"), "groupChat.js must export sendChatMessage");
  assert.ok(groupChatJs.includes("export async function markConversationRead"), "groupChat.js must export markConversationRead");
  assert.ok(groupChatJs.includes("export function subscribeToChatGroup"), "groupChat.js must export subscribeToChatGroup");
  assert.ok(groupChatJs.includes("supabase.removeChannel"), "subscribeToChatGroup must return cleanup removing realtime channel");
  assert.ok(messagesJs.includes("getMessages"), "messages.js must export getMessages");
  assert.ok(messagesJs.includes("sendMessage"), "messages.js must export sendMessage");
});

// ----------------------------------------------------------------------------
// 7. COMPONENT INTEGRATION & ZERO MOCK DATA INVARIANT
// ----------------------------------------------------------------------------
test("7. Zero Mock Data Invariant in Chat Inbox, Screen, and Media Pickers", () => {
  // ChatInboxView must not hardcode demo user
  assert.ok(!chatInbox.includes("userId = 'user-demo-priya'"), "ChatInboxView must not hardcode demo user priya");
  assert.ok(chatInbox.includes("useAuth"), "ChatInboxView must integrate with useAuth");

  // ChatScreen must handle safety block banner and real uploads
  assert.ok(chatScreen.includes("uploadChatMedia"), "ChatScreen must use uploadChatMedia");
  assert.ok(chatScreen.includes("isBlocked"), "ChatScreen must track isBlocked state");
  assert.ok(!chatSharePicker.includes("DEMO_PHOTO_OPTIONS"), "ChatSharePickerModal must contain zero DEMO_PHOTO_OPTIONS");
  assert.ok(chatSharePicker.includes("ImagePicker.launchImageLibraryAsync"), "ChatSharePickerModal must use real image picker");
});
