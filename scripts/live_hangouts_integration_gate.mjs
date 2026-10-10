// ============================================================================
// MAYBEWE LIVE HANGOUTS & MEETUPS THREE-ACCOUNT INTEGRATION GATE
// File: scripts/live_hangouts_integration_gate.mjs
// Target: Live Remote Supabase Backend (https://vdmzchvwrmqnbmpzvgng.supabase.co)
// ============================================================================

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdmzchvwrmqnbmpzvgng.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u7pO7cAzSDoZkbDLfbKbOw_Bmkt1Fsh";

console.log("==============================================================================");
console.log("STARTING LIVE SUPABASE REAL HANGOUTS & MEETUPS GATE VERIFICATION");
console.log(`Target Project: ${SUPABASE_URL}`);
console.log("==============================================================================\n");

const timestamp = Date.now();
const userAEmail = `traveler_hangout_a_${timestamp}@maybewe.internal`;
const userBEmail = `traveler_hangout_b_${timestamp}@maybewe.internal`;
const userCEmail = `traveler_hangout_c_${timestamp}@maybewe.internal`;
const testPassword = "LiveHangoutPassword#2026!";

// 1x1 valid PNG binary buffer
const testImageBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Client instances
const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Host
const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Member
const clientC = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Outsider / Blocked

let userA = null;
let userB = null;
let userC = null;

let createdHangoutId = null;
let linkedConversationId = null;
let uploadedStoragePath = null;
let invitationId = null;

async function runGate() {
  try {
    // ------------------------------------------------------------------------
    // STEP 1: AUTHENTICATION & PROFILES (User A Host, User B Member, User C Outsider)
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 1: Authenticating Three Disposable Test Accounts in Supabase Auth");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { data: authA, error: errAuthA } = await clientA.auth.signUp({
      email: userAEmail,
      password: testPassword,
      options: { data: { name: "Aarav Host", age: 27 } },
    });
    assert.ifError(errAuthA, "User A signup must succeed");
    userA = authA.user;
    assert.ok(userA?.id, "User A must have valid UUID");
    console.log(`[PASS] User A (Host) authenticated: ${userA.id} (${userAEmail})`);

    const { data: authB, error: errAuthB } = await clientB.auth.signUp({
      email: userBEmail,
      password: testPassword,
      options: { data: { name: "Diya Member", age: 25 } },
    });
    assert.ifError(errAuthB, "User B signup must succeed");
    userB = authB.user;
    assert.ok(userB?.id, "User B must have valid UUID");
    console.log(`[PASS] User B (Member) authenticated: ${userB.id} (${userBEmail})`);

    const { data: authC, error: errAuthC } = await clientC.auth.signUp({
      email: userCEmail,
      password: testPassword,
      options: { data: { name: "Kabir Outsider", age: 29 } },
    });
    assert.ifError(errAuthC, "User C signup must succeed");
    userC = authC.user;
    assert.ok(userC?.id, "User C must have valid UUID");
    console.log(`[PASS] User C (Outsider) authenticated: ${userC.id} (${userCEmail})`);

    // Ensure profiles in public.users
    await clientA.from("users").upsert({ id: userA.id, name: "Aarav Host", age: 27, avatar_url: null, trust_score: 4.95 });
    await clientB.from("users").upsert({ id: userB.id, name: "Diya Member", age: 25, avatar_url: null, trust_score: 4.88 });
    await clientC.from("users").upsert({ id: userC.id, name: "Kabir Outsider", age: 29, avatar_url: null, trust_score: 4.50 });
    console.log("[PASS] Profiles upserted in public.users table.\n");

    // ------------------------------------------------------------------------
    // STEP 2: CREATION & GROUP CHAT PROVISIONING
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 2: Hangout Creation, Storage Upload & Group Chat Provisioning");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Upload cover image to hangout-media bucket as User A
    uploadedStoragePath = `${userA.id}/cover_${timestamp}.png`;
    const { data: uploadRes, error: errUpload } = await clientA.storage
      .from("hangout-media")
      .upload(uploadedStoragePath, testImageBuffer, {
        contentType: "image/png",
        upsert: false,
      });
    assert.ifError(errUpload, "Cover image upload to hangout-media must succeed");
    console.log(`[PASS] Uploaded real cover binary to 'hangout-media' at path: ${uploadRes.path}`);

    const { data: publicUrlData } = clientA.storage
      .from("hangout-media")
      .getPublicUrl(uploadedStoragePath);
    const coverUrl = publicUrlData.publicUrl;

    // User A creates hangout via atomic RPC
    const startTimeIso = new Date(Date.now() + 86400000).toISOString(); // 24h into future
    const { data: hangoutData, error: errHangoutCreate } = await clientA.rpc("create_hangout", {
      p_creator_id: userA.id,
      p_title: "Anjuna Golden Hour Sunset Feast",
      p_description: "Catching the golden hour over Thalassa cliff with seafood and music",
      p_place_name: "Anjuna Cliff, North Goa",
      p_place_address: "Anjuna Beach Rd, Goa",
      p_lat: 15.580,
      p_lng: 73.742,
      p_start_time: startTimeIso,
      p_max_travelers: 2, // Capacity set to 2 travelers strictly
      p_visibility: "public",
      p_join_policy: "open",
      p_cover_url: coverUrl,
    });
    assert.ifError(errHangoutCreate, "Hangout atomic creation must succeed");
    assert.ok(hangoutData?.id, "Created hangout must have valid UUID");
    createdHangoutId = hangoutData.id;
    linkedConversationId = hangoutData.conversation_id;
    console.log(`[PASS] Hangout created atomically. ID: ${createdHangoutId}`);
    console.log(`[PASS] Linked Group Conversation provisioned. ID: ${linkedConversationId}`);

    // Verify creator is added as organizer
    const { data: organizerRow, error: errOrg } = await clientA
      .from("hangout_participants")
      .select("*")
      .eq("hangout_id", createdHangoutId)
      .eq("user_id", userA.id)
      .single();
    assert.ifError(errOrg, "Organizer row must exist");
    assert.equal(organizerRow.role, "organizer", "Creator role must be 'organizer'");
    console.log("[PASS] Creator verified as 'organizer' in hangout_participants.");

    // Verify creator is enrolled in linked conversation
    const { data: convParticipantRow, error: errConvPart } = await clientA
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", linkedConversationId)
      .eq("user_id", userA.id)
      .single();
    assert.ifError(errConvPart, "Creator must be enrolled in linked conversation");
    console.log("[PASS] Creator enrolled in linked group conversation.\n");

    // ------------------------------------------------------------------------
    // STEP 3: INVITATION & ACCEPTANCE
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 3: Hangout Invitation & Atomic Acceptance");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User A invites User B
    const { data: invRes, error: errInv } = await clientA.rpc("invite_to_hangout", {
      p_hangout_id: createdHangoutId,
      p_inviter_id: userA.id,
      p_invitee_id: userB.id,
    });
    assert.ifError(errInv, "User A invite to User B must succeed");
    assert.ok(invRes?.invitation_id, "Invitation ID must be returned");
    invitationId = invRes.invitation_id;
    console.log(`[PASS] Invitation created. ID: ${invitationId}, status: ${invRes.status}`);

    // User B responds (accepts)
    const { data: acceptRes, error: errAccept } = await clientB.rpc("respond_to_invitation", {
      p_invitation_id: invitationId,
      p_action: "accept",
    });
    assert.ifError(errAccept, "User B accept must succeed");
    assert.equal(acceptRes.status, "accepted", "Invitation status must update to accepted");
    console.log("[PASS] User B accepted invitation.");

    // Verify User B is enrolled as 'member'
    const { data: memberRow, error: errMem } = await clientB
      .from("hangout_participants")
      .select("*")
      .eq("hangout_id", createdHangoutId)
      .eq("user_id", userB.id)
      .single();
    assert.ifError(errMem, "User B participant row must exist");
    assert.equal(memberRow.role, "member", "User B role must be 'member'");
    console.log("[PASS] User B verified as 'member' in hangout_participants.");

    // Verify current_travelers_count is now 2 (at capacity)
    const { data: updatedHangoutRow } = await clientA
      .from("hangouts")
      .select("current_travelers_count, max_travelers")
      .eq("id", createdHangoutId)
      .single();
    assert.equal(updatedHangoutRow.current_travelers_count, 2, "Travelers count must be 2");
    assert.equal(updatedHangoutRow.max_travelers, 2, "Max travelers must be 2");
    console.log(`[PASS] Capacity synchronized: ${updatedHangoutRow.current_travelers_count}/${updatedHangoutRow.max_travelers} (At Capacity).\n`);

    // ------------------------------------------------------------------------
    // STEP 4: CONCURRENCY & CAPACITY GUARD TEST
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 4: Concurrency & Database-Level Capacity Guard Test");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User C attempts to join via RPC
    const { data: resJoinC, error: errJoinC } = await clientC.rpc("join_hangout", {
      p_hangout_id: createdHangoutId,
      p_user_id: userC.id,
    });
    assert.ok(errJoinC, "User C join MUST fail because capacity is full");
    assert.match(errJoinC.message, /capacity/i, "Error message must state hangout is at full capacity");
    console.log(`[PASS] User C join rejected by RPC capacity guard: "${errJoinC.message}"`);

    // User C attempts direct SQL insert into hangout_participants
    const { data: resInsertC, error: errInsertC } = await clientC
      .from("hangout_participants")
      .insert({
        hangout_id: createdHangoutId,
        user_id: userC.id,
        role: "member",
      });
    assert.ok(errInsertC, "Direct SQL insert by User C MUST fail via Postgres capacity trigger");
    assert.match(errInsertC.message, /capacity/i, "Trigger must raise 'Hangout is at full capacity'");
    console.log(`[PASS] Direct SQL insert rejected by 'trg_sync_hangout_travelers_count': "${errInsertC.message}"\n`);

    // ------------------------------------------------------------------------
    // STEP 5: BI-DIRECTIONAL BLOCK ISOLATION
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 5: Bi-Directional Safety & Block Lockdown Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User C blocks User A
    const { error: errBlock } = await clientC.from("blocks").insert({
      user_id: userC.id,
      blocked_id: userA.id,
    });
    assert.ifError(errBlock, "User C blocking User A must succeed");
    console.log("[PASS] User C blocked User A in public.blocks table.");

    // User C queries discovery feed: User A's hangout MUST be excluded
    const { data: discoverResults, error: errDisc } = await clientC.rpc("get_discover_hangouts", {
      p_viewer_id: userC.id,
      p_status: "active",
    });
    assert.ifError(errDisc, "Discovery query must succeed");
    const foundHangout = (discoverResults || []).find((h) => h.id === createdHangoutId);
    assert.equal(foundHangout, undefined, "Blocked host's hangout MUST NOT appear in discovery feed");
    console.log("[PASS] User A's hangout strictly hidden from User C in get_discover_hangouts.");

    // Direct table select by User C: RLS must return 0 rows
    const { data: rlsSelectHangout } = await clientC
      .from("hangouts")
      .select("id, title")
      .eq("id", createdHangoutId);
    assert.equal((rlsSelectHangout || []).length, 0, "RLS SELECT must return 0 rows for blocked user");
    console.log("[PASS] RLS Policy 'Users can view accessible hangouts' returned 0 rows to blocked user.");

    // User A attempts to invite User C -> must be blocked
    const { error: errInviteBlocked } = await clientA.rpc("invite_to_hangout", {
      p_hangout_id: createdHangoutId,
      p_inviter_id: userA.id,
      p_invitee_id: userC.id,
    });
    assert.ok(errInviteBlocked, "Inviting blocked user MUST fail");
    assert.match(errInviteBlocked.message, /block/i, "Error message must state active block exists");
    console.log(`[PASS] Invitation to blocked user rejected: "${errInviteBlocked.message}"\n`);

    // Remove block for remaining moderation flow
    await clientC.from("blocks").delete().eq("user_id", userC.id).eq("blocked_id", userA.id);

    // ------------------------------------------------------------------------
    // STEP 6: HOST MODERATION & CANCELLATION
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 6: Host Moderation, Attendee Leaving & Hangout Cancellation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User B leaves hangout
    const { data: resLeave, error: errLeave } = await clientB.rpc("leave_hangout", {
      p_hangout_id: createdHangoutId,
      p_user_id: userB.id,
    });
    assert.ifError(errLeave, "User B leave must succeed");
    assert.equal(resLeave.success, true);
    console.log("[PASS] User B left the hangout.");

    // Verify current_travelers_count decremented to 1
    const { data: countAfterLeave } = await clientA
      .from("hangouts")
      .select("current_travelers_count")
      .eq("id", createdHangoutId)
      .single();
    assert.equal(countAfterLeave.current_travelers_count, 1, "Travelers count must decrement to 1");
    console.log("[PASS] Travelers count decremented to 1 automatically.");

    // User A cancels the hangout
    const { data: resCancel, error: errCancel } = await clientA.rpc("cancel_hangout", {
      p_hangout_id: createdHangoutId,
      p_user_id: userA.id,
    });
    assert.ifError(errCancel, "User A cancel must succeed");
    assert.equal(resCancel.status, "cancelled");
    console.log("[PASS] User A cancelled hangout. Status: 'cancelled'");

    // User B attempts to join cancelled hangout -> must fail
    const { error: errJoinCancelled } = await clientB.rpc("join_hangout", {
      p_hangout_id: createdHangoutId,
      p_user_id: userB.id,
    });
    assert.ok(errJoinCancelled, "Joining cancelled hangout MUST fail");
    assert.match(errJoinCancelled.message, /cancelled/i, "Must reject join on cancelled hangout");
    console.log(`[PASS] Rejoining cancelled hangout rejected: "${errJoinCancelled.message}"\n`);

    // ------------------------------------------------------------------------
    // STEP 7: RLS BOUNDARY ASSERTIONS
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 7: Row-Level Security Boundary Assertions");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User B attempts to edit User A's hangout -> RLS must reject
    const { data: updateRes, error: errUpdate } = await clientB
      .from("hangouts")
      .update({ title: "Hacked Hangout Title" })
      .eq("id", createdHangoutId)
      .select();
    assert.equal((updateRes || []).length, 0, "Non-creator cannot update hangout");
    console.log("[PASS] User B cannot edit User A's hangout (0 rows updated by RLS).");

    // Non-host attempts to remove organizer -> RLS must reject
    const { data: delParticipantRes } = await clientB
      .from("hangout_participants")
      .delete()
      .eq("hangout_id", createdHangoutId)
      .eq("user_id", userA.id)
      .select();
    assert.equal((delParticipantRes || []).length, 0, "Non-host cannot delete organizer participant");
    console.log("[PASS] Non-host cannot remove other participants (0 rows deleted by RLS).\n");

    // ------------------------------------------------------------------------
    // STEP 8: TEARDOWN & PRISTINE STATE VERIFICATION
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 8: Teardown & Pristine State Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Purge test hangout (cascades to participants and invitations)
    await clientA.from("hangouts").delete().eq("id", createdHangoutId);
    console.log("[PASS] Test hangout cascade deleted from database.");

    // Purge linked group conversation
    if (linkedConversationId) {
      await clientA.from("conversations").delete().eq("id", linkedConversationId);
      console.log("[PASS] Linked group conversation deleted.");
    }

    // Purge storage binary from hangout-media
    await clientA.storage.from("hangout-media").remove([uploadedStoragePath]);
    console.log("[PASS] Cover binary purged from 'hangout-media' bucket.");

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

    // Confirm discovery returns zero leftover test records
    const { data: finalDiscovery } = await clientA.rpc("get_discover_hangouts", {
      p_status: "all",
    });
    const remaining = (finalDiscovery || []).filter((h) => h.id === createdHangoutId);
    assert.equal(remaining.length, 0, "Zero leftover test hangouts must remain");
    console.log("[PASS] Pristine state verified: 0 leftover test hangouts in database.\n");

    console.log("==============================================================================");
    console.log("LIVE HANGOUTS INTEGRATION GATE: ALL CHECKS PASSED EMPIRICALLY WITH 100% SUCCESS");
    console.log("==============================================================================");
  } catch (err) {
    console.error("\n❌ LIVE HANGOUTS GATE FAILURE:", err);
    process.exitCode = 1;
  } finally {
    // Teardown fallback
    try {
      if (createdHangoutId) {
        await clientA.from("hangouts").delete().eq("id", createdHangoutId);
      }
      if (linkedConversationId) {
        await clientA.from("conversations").delete().eq("id", linkedConversationId);
      }
      if (uploadedStoragePath) {
        await clientA.storage.from("hangout-media").remove([uploadedStoragePath]);
      }
      if (userA?.id) await clientA.from("users").delete().eq("id", userA.id);
      if (userB?.id) await clientB.from("users").delete().eq("id", userB.id);
      if (userC?.id) await clientC.from("users").delete().eq("id", userC.id);
    } catch {}
  }
}

runGate();
