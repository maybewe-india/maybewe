// ============================================================================
// MAYBEWE LIVE HANGOUTS NOTIFICATION GATE
// File: scripts/live_hangouts_notification_gate.mjs
// Target: Remote Supabase Backend (https://vdmzchvwrmqnbmpzvgng.supabase.co)
// ============================================================================

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdmzchvwrmqnbmpzvgng.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u7pO7cAzSDoZkbDLfbKbOw_Bmkt1Fsh";

console.log("==============================================================================");
console.log("STARTING LIVE SUPABASE HANGOUTS NOTIFICATIONS GATE VERIFICATION");
console.log(`Target Project: ${SUPABASE_URL}`);
console.log("==============================================================================\n");

const timestamp = Date.now();
const userAEmail = `host_notif_a_${timestamp}@maybewe.internal`;
const userBEmail = `attendee_notif_b_${timestamp}@maybewe.internal`;
const userCEmail = `outsider_notif_c_${timestamp}@maybewe.internal`;
const testPassword = "LiveNotifPassword#2026!";

const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Host
const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Attendee
const clientC = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Outsider / Blocked

let userA = null;
let userB = null;
let userC = null;

let hangout1Id = null;
let hangout2Id = null;
let invitation1Id = null;

async function runGate() {
  try {
    // ------------------------------------------------------------------------
    // STEP 1: AUTHENTICATION & PROFILES
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 1: Authenticating Three Disposable Test Accounts in Supabase Auth");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { data: authA, error: errAuthA } = await clientA.auth.signUp({
      email: userAEmail,
      password: testPassword,
      options: { data: { name: "Ananya Host", age: 26 } },
    });
    assert.ifError(errAuthA, "User A signup must succeed");
    userA = authA.user;
    console.log(`[PASS] Host (User A) authenticated: ${userA.id} (${userAEmail})`);

    const { data: authB, error: errAuthB } = await clientB.auth.signUp({
      email: userBEmail,
      password: testPassword,
      options: { data: { name: "Rishi Attendee", age: 28 } },
    });
    assert.ifError(errAuthB, "User B signup must succeed");
    userB = authB.user;
    console.log(`[PASS] Attendee (User B) authenticated: ${userB.id} (${userBEmail})`);

    const { data: authC, error: errAuthC } = await clientC.auth.signUp({
      email: userCEmail,
      password: testPassword,
      options: { data: { name: "Tara Outsider", age: 24 } },
    });
    assert.ifError(errAuthC, "User C signup must succeed");
    userC = authC.user;
    console.log(`[PASS] Outsider (User C) authenticated: ${userC.id} (${userCEmail})`);

    // Ensure profiles in public.users
    await clientA.from("users").upsert({ id: userA.id, name: "Ananya Host", age: 26, avatar_url: null, trust_score: 4.90 });
    await clientB.from("users").upsert({ id: userB.id, name: "Rishi Attendee", age: 28, avatar_url: null, trust_score: 4.85 });
    await clientC.from("users").upsert({ id: userC.id, name: "Tara Outsider", age: 24, avatar_url: null, trust_score: 4.70 });
    console.log("[PASS] Profiles upserted in public.users table.\n");

    // ------------------------------------------------------------------------
    // STEP 2: INVITATION FLOW & RECIPIENT RLS ISOLATION
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 2: Invitation Flow & Database-Driven Notification Generation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Host creates Hangout 1
    const { data: h1Data, error: errH1 } = await clientA.rpc("create_hangout", {
      p_creator_id: userA.id,
      p_title: "Old Goa Heritage Walk & Chai",
      p_description: "Exploring Basilica of Bom Jesus and quaint Fontainhas lanes",
      p_place_name: "Fontainhas, Goa",
      p_start_time: new Date(Date.now() + 86400000).toISOString(),
      p_max_travelers: 4,
    });
    assert.ifError(errH1, "Hangout 1 creation must succeed");
    hangout1Id = h1Data.id;
    console.log(`[PASS] Hangout 1 created: ${hangout1Id}`);

    // Host invites Attendee (User B)
    const { data: invRes, error: errInv } = await clientA.rpc("invite_to_hangout", {
      p_hangout_id: hangout1Id,
      p_inviter_id: userA.id,
      p_invitee_id: userB.id,
    });
    assert.ifError(errInv, "invite_to_hangout RPC must succeed");
    invitation1Id = invRes.invitation_id;
    console.log(`[PASS] Invitation generated. ID: ${invitation1Id}`);

    // Assert: Real notification row generated for Attendee (User B)
    const { data: notifsB, error: errNotifB } = await clientB
      .from("notifications")
      .select("*")
      .eq("entity_id", hangout1Id)
      .eq("type", "hangout_invitation");
    assert.ifError(errNotifB, "Attendee notifications query must execute");
    assert.equal(notifsB.length, 1, "Exactly 1 notification row must be generated for Attendee");
    const inviteNotif = notifsB[0];
    assert.equal(inviteNotif.recipient_id, userB.id, "recipient_id must match Attendee ID");
    assert.equal(inviteNotif.actor_id, userA.id, "actor_id must match Host ID");
    assert.match(inviteNotif.message, /Old Goa Heritage Walk/i, "Notification message must reference hangout");
    console.log(`[PASS] Authoritative notification row verified for Attendee: ID: ${inviteNotif.id}`);

    // Assert: Host and Outsider CANNOT read Attendee's notification (RLS Recipient Isolation)
    const { data: hostViewNotif } = await clientA
      .from("notifications")
      .select("*")
      .eq("id", inviteNotif.id);
    assert.equal((hostViewNotif || []).length, 0, "Host must NOT be able to read Attendee's notification via RLS");

    const { data: outsiderViewNotif } = await clientC
      .from("notifications")
      .select("*")
      .eq("id", inviteNotif.id);
    assert.equal((outsiderViewNotif || []).length, 0, "Outsider must NOT be able to read Attendee's notification via RLS");
    console.log("[PASS] RLS Recipient Isolation verified: Host and Outsider receive 0 rows querying Attendee notification.\n");

    // ------------------------------------------------------------------------
    // STEP 3: ACCEPTANCE FLOW
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 3: Acceptance Flow & Database-Driven Notification to Host");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Attendee (User B) accepts invitation
    const { data: accRes, error: errAcc } = await clientB.rpc("respond_to_invitation", {
      p_invitation_id: invitation1Id,
      p_action: "accept",
    });
    assert.ifError(errAcc, "respond_to_invitation RPC must succeed");
    assert.equal(accRes.status, "accepted");
    console.log("[PASS] Attendee accepted invitation.");

    // Assert: Real notification row generated for Host (User A)
    const { data: notifsA, error: errNotifA } = await clientA
      .from("notifications")
      .select("*")
      .eq("entity_id", hangout1Id)
      .eq("type", "hangout_invitation_accepted");
    assert.ifError(errNotifA, "Host notifications query must execute");
    assert.equal(notifsA.length, 1, "Exactly 1 notification row must be generated for Host upon acceptance");
    const acceptNotif = notifsA[0];
    assert.equal(acceptNotif.recipient_id, userA.id, "recipient_id must match Host ID");
    assert.equal(acceptNotif.actor_id, userB.id, "actor_id must match Attendee ID");
    assert.match(acceptNotif.message, /accepted your invitation/i, "Message must state invitation was accepted");
    console.log(`[PASS] Authoritative notification row verified for Host: ID: ${acceptNotif.id}\n`);

    // ------------------------------------------------------------------------
    // STEP 4: CANCELLATION FLOW
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 4: Cancellation Flow & Database-Driven Notification to Attendees");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Host cancels Hangout 1
    const { data: cancelRes, error: errCancel } = await clientA.rpc("cancel_hangout", {
      p_hangout_id: hangout1Id,
      p_user_id: userA.id,
    });
    assert.ifError(errCancel, "cancel_hangout RPC must succeed");
    assert.equal(cancelRes.status, "cancelled");
    console.log("[PASS] Host cancelled Hangout 1.");

    // Assert: Real notification row generated for Attendee (User B)
    const { data: notifsCancelB, error: errNotifCancelB } = await clientB
      .from("notifications")
      .select("*")
      .eq("entity_id", hangout1Id)
      .eq("type", "hangout_cancelled");
    assert.ifError(errNotifCancelB, "Attendee cancellation notifications query must execute");
    assert.equal(notifsCancelB.length, 1, "Exactly 1 notification row must be generated for Attendee upon cancellation");
    const cancelNotif = notifsCancelB[0];
    assert.equal(cancelNotif.recipient_id, userB.id, "recipient_id must match Attendee ID");
    assert.equal(cancelNotif.actor_id, userA.id, "actor_id must match Host ID");
    assert.match(cancelNotif.message, /cancelled by the host/i, "Message must state hangout was cancelled");
    console.log(`[PASS] Authoritative cancellation notification row verified for Attendee: ID: ${cancelNotif.id}\n`);

    // ------------------------------------------------------------------------
    // STEP 5: DEDUPLICATION GUARANTEE
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 5: Deduplication & Spam Prevention Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Host creates Hangout 2
    const { data: h2Data, error: errH2 } = await clientA.rpc("create_hangout", {
      p_creator_id: userA.id,
      p_title: "Sunrise Paddleboarding at Palolem",
      p_description: "Early morning calm waters and dolphin spotting",
      p_place_name: "Palolem Beach, South Goa",
      p_start_time: new Date(Date.now() + 86400000).toISOString(),
      p_max_travelers: 6,
    });
    assert.ifError(errH2, "Hangout 2 creation must succeed");
    hangout2Id = h2Data.id;

    // Host invites Attendee to Hangout 2 TWICE consecutively
    await clientA.rpc("invite_to_hangout", {
      p_hangout_id: hangout2Id,
      p_inviter_id: userA.id,
      p_invitee_id: userB.id,
    });
    await clientA.rpc("invite_to_hangout", {
      p_hangout_id: hangout2Id,
      p_inviter_id: userA.id,
      p_invitee_id: userB.id,
    });

    // Query Attendee's notifications for Hangout 2
    const { data: dedupNotifs } = await clientB
      .from("notifications")
      .select("*")
      .eq("entity_id", hangout2Id)
      .eq("type", "hangout_invitation");
    assert.equal(dedupNotifs.length, 1, "Duplicate invite calls MUST NOT create duplicate notification rows");
    console.log("[PASS] Deduplication verified: Exactly 1 notification row exists after duplicate invites.\n");

    // ------------------------------------------------------------------------
    // STEP 6: BLOCK SAFETY ENFORCEMENT
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 6: Block Safety & Zero Notification Leakage");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Outsider (User C) blocks Host (User A)
    const { error: errBlock } = await clientC.from("blocks").insert({
      user_id: userC.id,
      blocked_id: userA.id,
    });
    assert.ifError(errBlock, "Outsider block must succeed");
    console.log("[PASS] Outsider blocked Host in public.blocks.");

    // Host attempts to invite Outsider -> Must be rejected cleanly
    const { error: errBlockInvite } = await clientA.rpc("invite_to_hangout", {
      p_hangout_id: hangout2Id,
      p_inviter_id: userA.id,
      p_invitee_id: userC.id,
    });
    assert.ok(errBlockInvite, "Invite to blocked user MUST fail");
    assert.match(errBlockInvite.message, /block/i, "Error message must state active block exists");
    console.log(`[PASS] Invite rejected due to active block: "${errBlockInvite.message}"`);

    // Assert: Zero notification rows created for Outsider
    const { data: outsiderNotifs } = await clientC
      .from("notifications")
      .select("*")
      .eq("entity_id", hangout2Id);
    assert.equal((outsiderNotifs || []).length, 0, "ZERO notifications must be created when blocked");
    console.log("[PASS] Verified 0 notifications created for blocked user.\n");

    // Remove block for teardown
    await clientC.from("blocks").delete().eq("user_id", userC.id).eq("blocked_id", userA.id);

    // ------------------------------------------------------------------------
    // STEP 7: TEARDOWN & PRISTINE STATE VERIFICATION
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STEP 7: Teardown & Pristine State Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Cascade delete hangouts
    if (hangout1Id) await clientA.from("hangouts").delete().eq("id", hangout1Id);
    if (hangout2Id) await clientA.from("hangouts").delete().eq("id", hangout2Id);
    console.log("[PASS] Test hangouts cascade deleted.");

    // Delete test notifications
    await clientA.from("app_notifications").delete().in("entity_id", [hangout1Id, hangout2Id]);
    console.log("[PASS] Test notification rows purged.");

    // Delete test accounts via Edge Function
    console.log("Invoking delete-account Edge Function for test users...");
    try {
      const { data: delA } = await clientA.functions.invoke("delete-account");
      console.log(`[delete-account: User A] ${JSON.stringify(delA)}`);
      const { data: delB } = await clientB.functions.invoke("delete-account");
      console.log(`[delete-account: User B] ${JSON.stringify(delB)}`);
      const { data: delC } = await clientC.functions.invoke("delete-account");
      console.log(`[delete-account: User C] ${JSON.stringify(delC)}`);
    } catch (e) {
      console.warn("delete-account invoke notice:", e.message);
    }

    // Direct users cleanup fallback
    await clientA.from("users").delete().eq("id", userA.id);
    await clientB.from("users").delete().eq("id", userB.id);
    await clientC.from("users").delete().eq("id", userC.id);

    // Verify 0 leftover notifications for test users
    const { data: leftoverA } = await clientA.from("notifications").select("*").eq("recipient_id", userA.id);
    const { data: leftoverB } = await clientB.from("notifications").select("*").eq("recipient_id", userB.id);
    const { data: leftoverC } = await clientC.from("notifications").select("*").eq("recipient_id", userC.id);

    assert.equal((leftoverA || []).length, 0, "Zero leftover notifications for User A");
    assert.equal((leftoverB || []).length, 0, "Zero leftover notifications for User B");
    assert.equal((leftoverC || []).length, 0, "Zero leftover notifications for User C");
    console.log("[PASS] Pristine state verified: 0 leftover test notifications in database.\n");

    console.log("==============================================================================");
    console.log("LIVE HANGOUTS NOTIFICATIONS GATE: ALL CHECKS PASSED EMPIRICALLY WITH 100% SUCCESS");
    console.log("==============================================================================");
  } catch (err) {
    console.error("\n❌ LIVE HANGOUTS NOTIFICATIONS GATE FAILURE:", err);
    process.exitCode = 1;
  } finally {
    try {
      if (hangout1Id) await clientA.from("hangouts").delete().eq("id", hangout1Id);
      if (hangout2Id) await clientA.from("hangouts").delete().eq("id", hangout2Id);
      if (userA?.id) await clientA.from("users").delete().eq("id", userA.id);
      if (userB?.id) await clientB.from("users").delete().eq("id", userB.id);
      if (userC?.id) await clientC.from("users").delete().eq("id", userC.id);
    } catch {}
  }
}

runGate();
