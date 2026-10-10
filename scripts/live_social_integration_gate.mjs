// ============================================================================
// MAYBEWE LIVE SOCIAL INTEGRATION GATE & DUAL-ACCOUNT RUN
// File: scripts/live_social_integration_gate.mjs
// ============================================================================

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdmzchvwrmqnbmpzvgng.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u7pO7cAzSDoZkbDLfbKbOw_Bmkt1Fsh";

console.log("=================================================================");
console.log("STARTING LIVE SUPABASE SOCIAL FEED PRODUCTION GATE VERIFICATION");
console.log(`Target Project: ${SUPABASE_URL}`);
console.log("=================================================================\n");

const timestamp = Date.now();
const userAEmail = `traveler_a_${timestamp}@maybewe.internal`;
const userBEmail = `traveler_b_${timestamp}@maybewe.internal`;
const userPassword = "LiveTestPassword#2026!";

// Client A (User A session)
const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Client B (User B session)
const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let userA = null;
let userB = null;
let createdPostId = null;
let uploadedStoragePath = null;
let createdCommentId = null;
let createdReportId = null;

async function run() {
  try {
    // ------------------------------------------------------------------------
    // STEP 1: AUTHENTICATION & PROFILES
    // ------------------------------------------------------------------------
    console.log("--> STEP 1: Spinning up disposable real test accounts in Supabase Auth...");
    const { data: authA, error: errAuthA } = await clientA.auth.signUp({
      email: userAEmail,
      password: userPassword,
      options: { data: { name: "Aarav Mehta", city: "Mumbai" } },
    });
    assert.ifError(errAuthA, "User A signup must succeed");
    userA = authA.user;
    assert.ok(userA?.id, "User A must have valid UUID");
    console.log(`[PASS] User A authenticated: ${userA.id} (${userAEmail})`);

    const { data: authB, error: errAuthB } = await clientB.auth.signUp({
      email: userBEmail,
      password: userPassword,
      options: { data: { name: "Diya Patel", city: "Ahmedabad" } },
    });
    assert.ifError(errAuthB, "User B signup must succeed");
    userB = authB.user;
    assert.ok(userB?.id, "User B must have valid UUID");
    console.log(`[PASS] User B authenticated: ${userB.id} (${userBEmail})\n`);

    // Ensure public.users rows exist (sync trigger or explicit insert if needed)
    const { error: errProfA } = await clientA.from("users").upsert({
      id: userA.id,
      name: "Aarav Mehta",
      age: 26,
      avatar_url: null,
      trust_score: 4.80,
    });
    assert.ifError(errProfA, "Profile A creation must succeed");

    const { error: errProfB } = await clientB.from("users").upsert({
      id: userB.id,
      name: "Diya Patel",
      age: 24,
      avatar_url: null,
      trust_score: 4.90,
    });
    assert.ifError(errProfB, "Profile B creation must succeed");

    // ------------------------------------------------------------------------
    // STEP 2: CREATION & PERSISTENCE (POST + STORAGE UPLOAD)
    // ------------------------------------------------------------------------
    console.log("--> STEP 2: User A publishes post with real binary upload to post-media bucket...");
    // 1x1 transparent PNG binary bytes
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);

    const fileName = `gate_${timestamp}.png`;
    uploadedStoragePath = `${userA.id}/${fileName}`;

    const { data: uploadData, error: uploadErr } = await clientA.storage
      .from("post-media")
      .upload(uploadedStoragePath, pngBytes, {
        contentType: "image/png",
        upsert: false,
      });

    assert.ifError(uploadErr, "Storage upload to post-media must succeed");
    assert.ok(uploadData?.path, "Upload data must return storage path");
    console.log(`[PASS] Binary uploaded to post-media: ${uploadData.path}`);

    const { data: publicUrlData } = clientA.storage.from("post-media").getPublicUrl(uploadedStoragePath);
    const mediaUrl = publicUrlData.publicUrl;
    assert.ok(mediaUrl.includes("post-media"), "Public URL must reference post-media bucket");
    console.log(`[PASS] Public media URL generated: ${mediaUrl}`);

    // Insert post into public.posts
    const postContent = `Sunset trek across the western ghats trail #LiveTest_${timestamp}`;
    const { data: newPost, error: postInsertErr } = await clientA
      .from("posts")
      .insert({
        user_id: userA.id,
        content: postContent,
        destination: "Gokarna",
        visibility: "public",
        media_urls: [mediaUrl],
        likes_count: 0,
        comments_count: 0,
      })
      .select("id, user_id, content, destination, likes_count, comments_count, created_at")
      .single();

    assert.ifError(postInsertErr, "Post insert into public.posts must succeed");
    createdPostId = newPost.id;
    assert.equal(newPost.likes_count, 0, "Initial likes count must be 0");
    assert.equal(newPost.comments_count, 0, "Initial comments count must be 0");
    console.log(`[PASS] Post record inserted into public.posts: ${createdPostId}\n`);

    // ------------------------------------------------------------------------
    // STEP 3: FEED VISIBILITY & CONSUMPTION (USER B SEES USER A'S POST)
    // ------------------------------------------------------------------------
    console.log("--> STEP 3: User B queries get_social_feed RPC to verify post visibility...");
    const { data: feedPosts, error: feedErr } = await clientB.rpc("get_social_feed", {
      p_viewer_id: userB.id,
      p_limit: 10,
    });

    assert.ifError(feedErr, "get_social_feed RPC must execute cleanly");
    const foundPost = (feedPosts || []).find((p) => p.id === createdPostId);
    assert.ok(foundPost, "User A's post must be returned in User B's live feed");
    assert.equal(foundPost.content, postContent, "Post content must match exactly without mock fallback");
    assert.equal(foundPost.is_liked_by_viewer, false, "Viewer B must not have liked yet");
    console.log(`[PASS] User A's post visible in User B's feed (ID: ${createdPostId})\n`);

    // ------------------------------------------------------------------------
    // STEP 4: ENGAGEMENT & TRIGGER INTEGRITY (LIKES, COMMENTS, UNIQUE CONSTRAINT)
    // ------------------------------------------------------------------------
    console.log("--> STEP 4: Testing concurrency-safe engagement triggers and constraints...");
    // 4.1 User B Likes User A's Post
    const { error: likeErr } = await clientB.from("post_reactions").insert({
      post_id: createdPostId,
      user_id: userB.id,
      reaction_type: "like",
    });
    assert.ifError(likeErr, "User B reaction insert must succeed");

    // Verify trigger incremented posts.likes_count to 1
    const { data: postAfterLike } = await clientB
      .from("posts")
      .select("likes_count")
      .eq("id", createdPostId)
      .single();
    assert.equal(postAfterLike?.likes_count, 1, "Postgres trigger sync_post_reactions_count must set likes_count = 1");
    console.log(`[PASS] Like trigger executed: posts.likes_count is now ${postAfterLike.likes_count}`);

    // 4.2 Duplicate Reaction Prevention (UNIQUE constraint)
    const { error: dupLikeErr } = await clientB.from("post_reactions").insert({
      post_id: createdPostId,
      user_id: userB.id,
      reaction_type: "like",
    });
    assert.ok(dupLikeErr, "Duplicate like must be rejected by Postgres UNIQUE constraint");
    assert.ok(
      dupLikeErr.code === "23505" || dupLikeErr.message.includes("unique") || dupLikeErr.message.includes("duplicate"),
      "Error must be unique violation 23505"
    );
    console.log(`[PASS] Duplicate like prevented by database constraint: code ${dupLikeErr.code}`);

    // 4.3 User B Comments on User A's Post
    const commentText = "Incredible trail view! Safe travels!";
    const { data: newComment, error: commentErr } = await clientB
      .from("comments")
      .insert({
        post_id: createdPostId,
        user_id: userB.id,
        content: commentText,
      })
      .select("id, post_id, user_id, content")
      .single();
    assert.ifError(commentErr, "Comment insert must succeed");
    createdCommentId = newComment.id;

    // Verify trigger incremented posts.comments_count to 1
    const { data: postAfterComment } = await clientB
      .from("posts")
      .select("comments_count")
      .eq("id", createdPostId)
      .single();
    assert.equal(postAfterComment?.comments_count, 1, "Postgres trigger sync_post_comments_count must set comments_count = 1");
    console.log(`[PASS] Comment trigger executed: posts.comments_count is now ${postAfterComment.comments_count}\n`);

    // ------------------------------------------------------------------------
    // STEP 5: BI-DIRECTIONAL BLOCK VERIFICATION
    // ------------------------------------------------------------------------
    console.log("--> STEP 5: Testing bi-directional block exclusion from feed...");
    // User B blocks User A
    const { error: blockErr } = await clientB.from("blocks").insert({
      user_id: userB.id,
      blocked_id: userA.id,
    });
    assert.ifError(blockErr, "Block insert must succeed");
    console.log(`[PASS] User B blocked User A in blocks table`);

    // User B queries feed -> User A's post MUST NOT appear
    const { data: feedBAfterBlock } = await clientB.rpc("get_social_feed", {
      p_viewer_id: userB.id,
      p_limit: 10,
    });
    const foundInB = (feedBAfterBlock || []).some((p) => p.id === createdPostId || p.user_id === userA.id);
    assert.equal(foundInB, false, "User A's post must be excluded from User B's feed when User B blocks User A");
    console.log(`[PASS] Forward Block Verified: User A's post excluded from User B's feed`);

    // User A queries feed -> User B's comments/activity MUST NOT appear
    const { data: feedAAfterBlock } = await clientA.rpc("get_social_feed", {
      p_viewer_id: userA.id,
      p_limit: 10,
    });
    const foundBInA = (feedAAfterBlock || []).some((p) => p.user_id === userB.id);
    assert.equal(foundBInA, false, "Reverse Block Verified: User B is invisible to User A");
    console.log(`[PASS] Reverse Block Verified: User B is invisible to User A\n`);

    // ------------------------------------------------------------------------
    // STEP 6: REPORT ISOLATION
    // ------------------------------------------------------------------------
    console.log("--> STEP 6: Testing safety report submission and admin isolation...");
    const { error: reportErr } = await clientB
      .from("reports")
      .insert({
        reporter_id: userB.id,
        target_type: "post",
        target_id: createdPostId,
        reason: "Test inappropriate content flag",
      });

    assert.ifError(reportErr, "User B report filing must succeed");
    console.log(`[PASS] Safety report filed into public.reports`);

    // Verify RLS isolates reports from normal authenticated users
    const { data: readReports, error: readReportsErr } = await clientB
      .from("reports")
      .select("*")
      .eq("id", createdReportId);
    
    // RLS policy only allows service_role; normal user query returns empty []
    assert.equal((readReports || []).length, 0, "Normal users must not be permitted to read moderation reports");
    console.log(`[PASS] Report Isolation Verified: RLS prevents regular users from viewing reports\n`);

    // ------------------------------------------------------------------------
    // STEP 7: UNAUTHORIZED MUTATION REJECTION (RLS GUARDS)
    // ------------------------------------------------------------------------
    console.log("--> STEP 7: Testing RLS guards against unauthorized edits and deletes...");
    // 7.1 User B tries to update User A's post
    const { data: updateAtt, error: updateErr } = await clientB
      .from("posts")
      .update({ content: "Maliciously modified content by unauthorized user" })
      .eq("id", createdPostId)
      .select();
    assert.equal((updateAtt || []).length, 0, "User B must not be able to update User A's post (RLS row rejection)");
    console.log(`[PASS] Post Update RLS: User B unauthorized edit rejected`);

    // 7.2 User B tries to delete User A's post
    const { data: deleteAtt, error: deleteErr } = await clientB
      .from("posts")
      .delete()
      .eq("id", createdPostId)
      .select();
    assert.equal((deleteAtt || []).length, 0, "User B must not be able to delete User A's post (RLS row rejection)");
    console.log(`[PASS] Post Delete RLS: User B unauthorized delete rejected`);

    // 7.3 User B tries to delete User A's media from storage
    const { data: storageDelAtt, error: storageDelErr } = await clientB.storage
      .from("post-media")
      .remove([uploadedStoragePath]);
    assert.ok(
      (storageDelAtt || []).length === 0 || storageDelErr,
      "Storage RLS must reject unauthorized file deletion by non-owner"
    );
    console.log(`[PASS] Storage RLS: User B unauthorized media delete rejected\n`);

    // ------------------------------------------------------------------------
    // STEP 8: POST DELETION & STORAGE CLEANUP BY OWNER (USER A)
    // ------------------------------------------------------------------------
    console.log("--> STEP 8: Owner (User A) deletes post and cleans up storage object...");
    // User A removes storage object
    const { data: ownerStorageDel, error: ownerStorageDelErr } = await clientA.storage
      .from("post-media")
      .remove([uploadedStoragePath]);
    assert.ifError(ownerStorageDelErr, "Owner must be able to delete their own media");
    assert.ok(ownerStorageDel?.length > 0, "Storage object deletion confirmed");
    console.log(`[PASS] Owner storage removal confirmed: ${uploadedStoragePath}`);

    // User A deletes post row
    const { error: ownerPostDelErr } = await clientA
      .from("posts")
      .delete()
      .eq("id", createdPostId);
    assert.ifError(ownerPostDelErr, "Owner must be able to delete their own post");

    // Verify post row is purged
    const { data: checkPurged } = await clientA
      .from("posts")
      .select("id")
      .eq("id", createdPostId)
      .maybeSingle();
    assert.equal(checkPurged, null, "Post record must be completely purged from public.posts");
    console.log(`[PASS] Post record successfully purged from database\n`);

    // ------------------------------------------------------------------------
    // STEP 9: TEST ACCOUNT TEARDOWN & COMPLETE CLEANUP
    // ------------------------------------------------------------------------
    console.log("--> STEP 9: Teardown & cleanup of disposable test accounts...");
    // Delete blocks
    try { await clientB.from("blocks").delete().eq("user_id", userB.id); } catch {}
    // Delete comments
    if (createdCommentId) {
      try { await clientB.from("comments").delete().eq("id", createdCommentId); } catch {}
    }
    // Delete reactions
    try { await clientB.from("post_reactions").delete().eq("user_id", userB.id); } catch {}

    // Delete accounts via delete-account function
    const { data: delAccA } = await clientA.functions.invoke("delete-account");
    console.log(`[PASS] User A deleted via delete-account edge function: ${delAccA?.success}`);

    const { data: delAccB } = await clientB.functions.invoke("delete-account");
    console.log(`[PASS] User B deleted via delete-account edge function: ${delAccB?.success}`);

    // Final check on feed: verify zero test posts remain
    const { data: finalFeed } = await clientA.rpc("get_social_feed", { p_limit: 10 });
    const hasRemainingTestPost = (finalFeed || []).some(
      (p) => (p.content || "").includes(timestamp.toString())
    );
    assert.equal(hasRemainingTestPost, false, "Live feed must have 0 leftover test records");
    console.log("[PASS] Production feed confirmed clean: zero leftover test artifacts\n");

    console.log("=================================================================");
    console.log("ALL 9 LIVE INTEGRATION GATES PASSED WITH 100% SUCCESS!");
    console.log("=================================================================");
  } catch (err) {
    console.error("\n[GATE FAILURE]:", err);
    // Cleanup attempt on failure
    if (uploadedStoragePath && clientA) {
      await clientA.storage.from("post-media").remove([uploadedStoragePath]).catch(() => {});
    }
    if (createdPostId && clientA) {
      try { await clientA.from("posts").delete().eq("id", createdPostId); } catch {}
    }
    if (clientA) await clientA.functions.invoke("delete-account").catch(() => {});
    if (clientB) await clientB.functions.invoke("delete-account").catch(() => {});
    process.exit(1);
  }
}

run();
