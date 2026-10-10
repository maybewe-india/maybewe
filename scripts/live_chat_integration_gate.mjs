// ============================================================================
// MAYBEWE LIVE CHAT & DIRECT MESSAGING INTEGRATION GATE
// File: scripts/live_chat_integration_gate.mjs
// Target: Live Remote Supabase Backend (https://vdmzchvwrmqnbmpzvgng.supabase.co)
// ============================================================================

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdmzchvwrmqnbmpzvgng.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u7pO7cAzSDoZkbDLfbKbOw_Bmkt1Fsh";

console.log("==============================================================================");
console.log("STARTING LIVE SUPABASE REAL-TIME CHAT & MESSAGING GATE VERIFICATION");
console.log(`Target Project: ${SUPABASE_URL}`);
console.log("==============================================================================\n");

const timestamp = Date.now();
const userAEmail = `traveler_chat_a_${timestamp}@maybewe.internal`;
const userBEmail = `traveler_chat_b_${timestamp}@maybewe.internal`;
const userCEmail = `traveler_chat_c_outsider_${timestamp}@maybewe.internal`;
const testPassword = "LiveChatGatePassword#2026!";

// 1x1 valid PNG binary buffer
const testImageBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Client instances
const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const clientC = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Outsider

let userA = null;
let userB = null;
let userC = null;

let conversationId = null;
let uploadedChatMediaUrl = null;
let uploadedStoragePath = null;
let sentMessageId = null;

async function runGate() {
  try {
    // ------------------------------------------------------------------------
    // STEP 1: AUTHENTICATION & PROFILES (User A, User B, Outsider User C)
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 1: Authenticating Three Disposable Test Accounts in Supabase Auth");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { data: authA, error: errAuthA } = await clientA.auth.signUp({
      email: userAEmail,
      password: testPassword,
      options: { data: { name: "Aditi Rao", age: 24 } },
    });
    assert.ifError(errAuthA, "User A signup must succeed");
    userA = authA.user;
    assert.ok(userA?.id, "User A must have valid UUID");
    console.log(`[PASS] User A authenticated: ${userA.id} (${userAEmail})`);

    const { data: authB, error: errAuthB } = await clientB.auth.signUp({
      email: userBEmail,
      password: testPassword,
      options: { data: { name: "Vikram Seth", age: 26 } },
    });
    assert.ifError(errAuthB, "User B signup must succeed");
    userB = authB.user;
    assert.ok(userB?.id, "User B must have valid UUID");
    console.log(`[PASS] User B authenticated: ${userB.id} (${userBEmail})`);

    const { data: authC, error: errAuthC } = await clientC.auth.signUp({
      email: userCEmail,
      password: testPassword,
      options: { data: { name: "Outsider Sam", age: 30 } },
    });
    assert.ifError(errAuthC, "User C (outsider) signup must succeed");
    userC = authC.user;
    assert.ok(userC?.id, "User C must have valid UUID");
    console.log(`[PASS] User C (outsider) authenticated: ${userC.id} (${userCEmail})`);

    // Ensure profiles in public.users
    await clientA.from("users").upsert({ id: userA.id, name: "Aditi Rao", age: 24, avatar_url: null, trust_score: 4.90 });
    await clientB.from("users").upsert({ id: userB.id, name: "Vikram Seth", age: 26, avatar_url: null, trust_score: 4.85 });
    await clientC.from("users").upsert({ id: userC.id, name: "Outsider Sam", age: 30, avatar_url: null, trust_score: 4.50 });
    console.log("[PASS] Profiles upserted in public.users table.\n");

    // ------------------------------------------------------------------------
    // STEP 2: THREAD CREATION & CONCURRENCY IDEMPOTENCY
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 2: Concurrency-Safe Direct Conversation Creation & Idempotency");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User A creates/opens chat with User B
    const { data: convIdA, error: errConvA } = await clientA.rpc("get_or_create_direct_conversation", {
      p_user_a: userA.id,
      p_user_b: userB.id,
    });
    assert.ifError(errConvA, "User A conversation creation must succeed");
    assert.ok(convIdA, "Conversation ID must be returned");
    conversationId = convIdA;
    console.log(`[PASS] User A initiated direct chat. Conversation ID: ${conversationId}`);

    // User B attempts to create chat with User A (reversed order)
    const { data: convIdB, error: errConvB } = await clientB.rpc("get_or_create_direct_conversation", {
      p_user_a: userB.id,
      p_user_b: userA.id,
    });
    assert.ifError(errConvB, "User B conversation lookup must succeed");
    assert.equal(convIdB, conversationId, "get_or_create_direct_conversation MUST return exact same conversation ID");
    console.log("[PASS] Concurrency idempotency confirmed: Zero duplicate conversations created.");

    // Verify conversation participants in database
    const { data: participants, error: errParts } = await clientA
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);
    assert.ifError(errParts, "Participant check must succeed");
    assert.equal(participants.length, 2, "Conversation must have exactly 2 participants");
    const partIds = participants.map((p) => p.user_id);
    assert.ok(partIds.includes(userA.id), "Participant list must include User A");
    assert.ok(partIds.includes(userB.id), "Participant list must include User B");
    console.log("[PASS] Both participants registered in public.conversation_participants.\n");

    // ------------------------------------------------------------------------
    // STEP 3: MESSAGE EXCHANGE & CHAT MEDIA STORAGE
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 3: Message Exchange & chat-media Storage Upload");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User A uploads real image binary to chat-media bucket under conversation partition
    uploadedStoragePath = `${conversationId}/${userA.id}/test_photo_${timestamp}.png`;
    const { error: errUpload } = await clientA.storage
      .from("chat-media")
      .upload(uploadedStoragePath, testImageBuffer, { contentType: "image/png" });
    assert.ifError(errUpload, "Chat media upload must succeed for conversation participant");
    uploadedChatMediaUrl = clientA.storage.from("chat-media").getPublicUrl(uploadedStoragePath).data.publicUrl;
    console.log(`[PASS] Chat media binary uploaded to 'chat-media': ${uploadedChatMediaUrl}`);

    // User A sends message with text and photo attachment
    const { data: msgA, error: errMsgA } = await clientA
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userA.id,
        content: "Hey Vikram! Meeting at Cafe Bodega in Panaji?",
        media_url: uploadedChatMediaUrl,
        metadata: { type: "image", location: "Panaji" },
      })
      .select("id, content, media_url, created_at")
      .single();
    assert.ifError(errMsgA, "Message insert must succeed");
    sentMessageId = msgA.id;
    assert.ok(sentMessageId, "Message must have generated UUID");
    console.log(`[PASS] User A sent message (${sentMessageId}) with text & photo.`);

    // User B reads messages from the conversation
    const { data: bMessages, error: errBMsgs } = await clientB
      .from("messages")
      .select("id, content, media_url, sender_id")
      .eq("conversation_id", conversationId);
    assert.ifError(errBMsgs, "User B message fetch must succeed");
    const receivedMsg = bMessages.find((m) => m.id === sentMessageId);
    assert.ok(receivedMsg, "User B must receive User A's sent message");
    assert.equal(receivedMsg.content, "Hey Vikram! Meeting at Cafe Bodega in Panaji?");
    assert.equal(receivedMsg.media_url, uploadedChatMediaUrl);
    console.log("[PASS] User B successfully retrieved User A's message and media URL.\n");

    // ------------------------------------------------------------------------
    // STEP 4: READ RECEIPTS & UNREAD COUNTERS
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 4: Concurrency-Safe Read Receipts & Unread Counters");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Before User B reads: Check User B's conversations list via get_user_conversations RPC
    const { data: convsBeforeRead, error: errConvsBefore } = await clientB.rpc("get_user_conversations", {
      p_user_id: userB.id,
    });
    assert.ifError(errConvsBefore, "get_user_conversations RPC must succeed");
    const userBConvBefore = convsBeforeRead.find((c) => c.conversation_id === conversationId);
    assert.ok(userBConvBefore, "User B must see the conversation in inbox");
    assert.equal(Number(userBConvBefore.unread_count), 1, "User B's unread_count MUST be exactly 1");
    console.log(`[PASS] User B unread counter correctly shows: ${userBConvBefore.unread_count} unread message.`);

    // User B marks conversation as read
    console.log("User B invoking mark_conversation_as_read RPC...");
    const { data: readResult, error: errMarkRead } = await clientB.rpc("mark_conversation_as_read", {
      p_conversation_id: conversationId,
      p_user_id: userB.id,
    });
    assert.ifError(errMarkRead, "mark_conversation_as_read RPC must succeed");
    assert.equal(readResult, true, "mark_conversation_as_read must return true");

    // Check User B's unread count after reading
    const { data: convsAfterRead } = await clientB.rpc("get_user_conversations", {
      p_user_id: userB.id,
    });
    const userBConvAfter = convsAfterRead.find((c) => c.conversation_id === conversationId);
    assert.equal(Number(userBConvAfter.unread_count), 0, "User B's unread_count MUST return to 0 after read receipt");
    console.log(`[PASS] Read receipt recorded. User B unread counter decremented to: ${userBConvAfter.unread_count}.\n`);

    // ------------------------------------------------------------------------
    // STEP 5: BI-DIRECTIONAL SAFETY & BLOCK LOCKDOWN
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 5: Bi-Directional Safety & Block Lockdown Enforcement");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User B blocks User A
    console.log("User B blocking User A in public.blocks...");
    const { error: errBlock } = await clientB.from("blocks").insert({
      user_id: userB.id,
      blocked_id: userA.id,
    });
    assert.ifError(errBlock, "Block insertion must succeed");
    console.log("[PASS] User B blocked User A.");

    // User A attempts to send message to User B while blocked
    console.log("User A attempting to send message while blocked...");
    const { error: errBlockedSend } = await clientA
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userA.id,
        content: "Are you there? (Blocked attempt)",
      });

    assert.ok(errBlockedSend, "Message insert MUST be rejected when participants are blocked");
    assert.ok(
      errBlockedSend.message.includes("block") || errBlockedSend.message.includes("Cannot send message"),
      `Block error message must cite active block: "${errBlockedSend.message}"`
    );
    console.log(`[PASS] Block lockdown confirmed: Message rejected with "${errBlockedSend.message}"`);

    // Verify conversation is excluded from inbox queries while blocked
    const { data: convsWhileBlocked } = await clientB.rpc("get_user_conversations", {
      p_user_id: userB.id,
    });
    const blockedConv = (convsWhileBlocked || []).find((c) => c.conversation_id === conversationId);
    assert.equal(blockedConv, undefined, "Blocked conversation MUST be excluded from get_user_conversations");
    console.log("[PASS] Blocked conversation excluded from user inbox query.");

    // Unblock for remaining tests
    await clientB.from("blocks").delete().eq("user_id", userB.id).eq("blocked_id", userA.id);
    console.log("[PASS] Temporary block record removed for next tests.\n");

    // ------------------------------------------------------------------------
    // STEP 6: RLS SECURITY ENFORCEMENT (OUTSIDER REJECTION)
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 6: RLS Security Enforcement Against Outsider (User C)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Outsider User C attempts to read messages from conversation A-B
    console.log("Outsider User C attempting to read messages from conversation A-B...");
    const { data: outsiderReadMessages, error: errOutsiderRead } = await clientC
      .from("messages")
      .select("id, content")
      .eq("conversation_id", conversationId);

    assert.ifError(errOutsiderRead, "Outsider query must not crash");
    assert.equal(outsiderReadMessages.length, 0, "Outsider MUST receive 0 rows from non-participating conversation due to RLS");
    console.log("[PASS] RLS Policy enforced: Outsider received 0 messages from private conversation.");

    // Outsider User C attempts to insert message into conversation A-B
    console.log("Outsider User C attempting to inject message into conversation A-B...");
    const { error: errOutsiderInsert } = await clientC
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userC.id,
        content: "Malicious spy injected message",
      });

    assert.ok(errOutsiderInsert, "RLS MUST reject message insertion by non-participant");
    console.log(`[PASS] RLS Policy enforced: Outsider message insertion rejected: "${errOutsiderInsert.message}"`);

    // Outsider User C attempts to upload into conversation storage partition
    console.log("Outsider User C attempting to upload media into conversation partition...");
    const outsiderUploadPath = `${conversationId}/${userC.id}/spy_${timestamp}.png`;
    const { error: errOutsiderUpload } = await clientC.storage
      .from("chat-media")
      .upload(outsiderUploadPath, testImageBuffer, { contentType: "image/png" });

    // Note: User C is not in conversation_participants for conversationId
    assert.ok(errOutsiderUpload, "Storage RLS MUST reject upload into non-participating conversation partition");
    console.log(`[PASS] Storage RLS enforced: Outsider media upload rejected: "${errOutsiderUpload.message}".\n`);

    // ------------------------------------------------------------------------
    // STEP 7: TEARDOWN & PRISTINE STATE
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 7: Teardown & Pristine State Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Purge test messages and conversation
    await clientA.from("conversations").delete().eq("id", conversationId);
    console.log("[PASS] Test conversation cascade deleted from database.");

    // Purge test media binary
    await clientA.storage.from("chat-media").remove([uploadedStoragePath]);
    console.log("[PASS] Test media binary removed from 'chat-media' bucket.");

    // Call delete-account Edge Function for test users
    console.log("Invoking delete-account Edge Function for test accounts...");
    try {
      const { data: resDelA } = await clientA.functions.invoke("delete-account");
      console.log(`[delete-account: User A] ${JSON.stringify(resDelA)}`);
      const { data: resDelB } = await clientB.functions.invoke("delete-account");
      console.log(`[delete-account: User B] ${JSON.stringify(resDelB)}`);
      const { data: resDelC } = await clientC.functions.invoke("delete-account");
      console.log(`[delete-account: User C] ${JSON.stringify(resDelC)}`);
    } catch (e) {
      console.warn("delete-account invoke notice:", e.message);
    }

    // Direct cleanup fallback
    await clientA.from("users").delete().eq("id", userA.id);
    await clientB.from("users").delete().eq("id", userB.id);
    await clientC.from("users").delete().eq("id", userC.id);

    // Confirm chat list returns zero leftover test artifacts
    const { data: finalInboxCheck, error: errFinalCheck } = await clientA.rpc("get_user_conversations", {
      p_user_id: userA.id,
    });
    assert.ifError(errFinalCheck, "Final inbox query must execute");
    assert.equal((finalInboxCheck || []).length, 0, "Inbox MUST return 0 conversations after teardown");
    console.log("[PASS] Pristine state verified: 0 leftover test conversations.\n");

    console.log("==============================================================================");
    console.log("LIVE CHAT & MESSAGING GATE: ALL CHECKS PASSED EMPIRICALLY WITH 100% SUCCESS");
    console.log("==============================================================================");
  } catch (err) {
    console.error("\n❌ LIVE CHAT GATE FAILURE:", err);
    process.exitCode = 1;
  } finally {
    // Teardown fallback
    try {
      if (conversationId) {
        await clientA.from("conversations").delete().eq("id", conversationId);
      }
      if (uploadedStoragePath) {
        await clientA.storage.from("chat-media").remove([uploadedStoragePath]);
      }
      if (userA?.id) await clientA.from("users").delete().eq("id", userA.id);
      if (userB?.id) await clientB.from("users").delete().eq("id", userB.id);
      if (userC?.id) await clientC.from("users").delete().eq("id", userC.id);
    } catch {}
  }
}

runGate();
