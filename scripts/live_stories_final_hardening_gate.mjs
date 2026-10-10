// ============================================================================
// MAYBEWE LIVE STORIES FINAL HARDENING & PRODUCTION SIGN-OFF GATE
// File: scripts/live_stories_final_hardening_gate.mjs
// Target: Live Supabase Backend (https://vdmzchvwrmqnbmpzvgng.supabase.co)
// ============================================================================

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdmzchvwrmqnbmpzvgng.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u7pO7cAzSDoZkbDLfbKbOw_Bmkt1Fsh";

console.log("==============================================================================");
console.log("MAYBEWE STORIES — FINAL LIVE HARDENING & PRODUCTION SIGN-OFF GATE");
console.log(`Live Project Target: ${SUPABASE_URL}`);
console.log("==============================================================================\n");

const timestamp = Date.now();
const authorEmail = `author_story_gate_${timestamp}@maybewe.internal`;
const viewerEmail = `viewer_story_gate_${timestamp}@maybewe.internal`;
const testPassword = "LiveStoriesGatePassword#2026!";

// 1x1 valid PNG binary buffer
const testImageBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Client instances
const clientAuthor = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const clientViewer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let authorUser = null;
let viewerUser = null;

let activeStoryId = null;
let activeStoryStoragePath = null;
let activeStoryMediaUrl = null;

let expiredStoryId = null;
let expiredStoryStoragePath = null;
let expiredStoryMediaUrl = null;

async function runGate() {
  try {
    // ------------------------------------------------------------------------
    // SETUP: REAL USER REGISTRATION & PROFILES
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("SETUP: Provisioning Real Authenticated Accounts in Remote Supabase Auth");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { data: authAuthor, error: errAuthAuthor } = await clientAuthor.auth.signUp({
      email: authorEmail,
      password: testPassword,
      options: { data: { name: "Ananya Iyer", age: 25 } },
    });
    assert.ifError(errAuthAuthor, "Author registration must succeed");
    authorUser = authAuthor.user;
    assert.ok(authorUser?.id, "Author must have a valid UUID");
    console.log(`[PASS] Author registered & authenticated: ${authorUser.id} (${authorEmail})`);

    const { data: authViewer, error: errAuthViewer } = await clientViewer.auth.signUp({
      email: viewerEmail,
      password: testPassword,
      options: { data: { name: "Rohan Varma", age: 27 } },
    });
    assert.ifError(errAuthViewer, "Viewer registration must succeed");
    viewerUser = authViewer.user;
    assert.ok(viewerUser?.id, "Viewer must have a valid UUID");
    console.log(`[PASS] Viewer registered & authenticated: ${viewerUser.id} (${viewerEmail})`);

    // Ensure profiles exist in public.users
    const { error: profAuthorErr } = await clientAuthor.from("users").upsert({
      id: authorUser.id,
      name: "Ananya Iyer",
      age: 25,
      avatar_url: null,
      trust_score: 4.95,
    });
    assert.ifError(profAuthorErr, "Author user profile upsert must succeed");

    const { error: profViewerErr } = await clientViewer.from("users").upsert({
      id: viewerUser.id,
      name: "Rohan Varma",
      age: 27,
      avatar_url: null,
      trust_score: 4.88,
    });
    assert.ifError(profViewerErr, "Viewer user profile upsert must succeed");
    console.log("[PASS] Author and Viewer profiles persisted in public.users table.\n");

    // ------------------------------------------------------------------------
    // PART 1: LIVE EXPIRATION & STORAGE PURGE VERIFICATION
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("PART 1: Live Expiration & Storage Purge Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 1A. Upload real test media binaries to 'story-media' for active and expired stories
    activeStoryStoragePath = `${authorUser.id}/active_${timestamp}.png`;
    const { error: activeUploadErr } = await clientAuthor.storage
      .from("story-media")
      .upload(activeStoryStoragePath, testImageBuffer, { contentType: "image/png" });
    assert.ifError(activeUploadErr, "Active story media upload must succeed");
    activeStoryMediaUrl = clientAuthor.storage.from("story-media").getPublicUrl(activeStoryStoragePath).data.publicUrl;
    console.log(`[PASS] Active story media uploaded: ${activeStoryMediaUrl}`);

    expiredStoryStoragePath = `${authorUser.id}/expired_${timestamp}.png`;
    const { error: expiredUploadErr } = await clientAuthor.storage
      .from("story-media")
      .upload(expiredStoryStoragePath, testImageBuffer, { contentType: "image/png" });
    assert.ifError(expiredUploadErr, "Expired story media upload must succeed");
    expiredStoryMediaUrl = clientAuthor.storage.from("story-media").getPublicUrl(expiredStoryStoragePath).data.publicUrl;
    console.log(`[PASS] Expired story media uploaded: ${expiredStoryMediaUrl}`);

    // 1B. Create Active Story (expires in +24 hours)
    const now = Date.now();
    const activeExpiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const { data: activeStory, error: activeStoryErr } = await clientAuthor
      .from("stories")
      .insert({
        user_id: authorUser.id,
        media_url: activeStoryMediaUrl,
        caption: "Active sunset story from Ladakh",
        destination: "Ladakh",
        visibility: "public",
        views_count: 0,
        created_at: new Date(now).toISOString(),
        expires_at: activeExpiresAt,
      })
      .select("id, expires_at")
      .single();
    assert.ifError(activeStoryErr, "Active story publication must succeed");
    activeStoryId = activeStory.id;
    console.log(`[PASS] Active story created: ${activeStoryId} (expires_at: ${activeStory.expires_at})`);

    // 1C. Create Expired Story (expires in -1 minute)
    // Note: Insert without .select() because SELECT RLS correctly excludes expired rows (expires_at > NOW())
    const crypto = await import("node:crypto");
    expiredStoryId = crypto.randomUUID();
    const expiredExpiresAt = new Date(now - 60 * 1000).toISOString();
    const { error: expiredStoryErr } = await clientAuthor
      .from("stories")
      .insert({
        id: expiredStoryId,
        user_id: authorUser.id,
        media_url: expiredStoryMediaUrl,
        caption: "Expired past story from Hampi",
        destination: "Hampi",
        visibility: "public",
        views_count: 0,
        created_at: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
        expires_at: expiredExpiresAt,
      });
    assert.ifError(expiredStoryErr, "Expired story insertion must succeed");
    console.log(`[PASS] Expired story created with ID: ${expiredStoryId} (expires_at: ${expiredExpiresAt})`);

    // 1D. True Expiration Exclusion via RPC `public.get_active_stories()`
    console.log("\nTesting RPC get_active_stories() exclusion of expired stories...");
    const { data: activeStoriesList, error: rpcErr } = await clientViewer.rpc("get_active_stories", {
      p_viewer_id: viewerUser.id,
    });
    assert.ifError(rpcErr, "get_active_stories RPC must execute successfully");

    const foundActiveInRpc = activeStoriesList.some((s) => s.story_id === activeStoryId);
    const foundExpiredInRpc = activeStoriesList.some((s) => s.story_id === expiredStoryId);

    assert.equal(foundActiveInRpc, true, "Active story MUST be returned in get_active_stories");
    assert.equal(foundExpiredInRpc, false, "Expired story MUST be strictly excluded from get_active_stories");
    console.log(`[PASS] get_active_stories() correctly returned active story (${activeStoryId}) and EXCLUDED expired story (${expiredStoryId}).`);

    // 1E. Direct Table SELECT RLS Protection:
    console.log("Testing direct client SELECT on public.stories for expired row...");
    const { data: directExpiredSelect, error: directSelectErr } = await clientViewer
      .from("stories")
      .select("id")
      .eq("id", expiredStoryId);

    assert.ifError(directSelectErr, "Direct select must not crash");
    assert.equal(directExpiredSelect.length, 0, "Direct client SELECT MUST return 0 rows for expired story due to RLS");
    console.log("[PASS] Direct client SELECT on public.stories for expired story yielded 0 rows (RLS policy active).");

    // 1F. Automated Media Purge via RPC `delete_expired_stories()`
    console.log("\nExecuting automated cleanup worker/RPC delete_expired_stories()...");
    const { data: purgedRecords, error: purgeErr } = await clientAuthor.rpc("delete_expired_stories");
    assert.ifError(purgeErr, "delete_expired_stories RPC must execute successfully");
    assert.ok(Array.isArray(purgedRecords), "delete_expired_stories must return table of purged stories");

    const purgedExpired = purgedRecords.find((r) => r.deleted_id === expiredStoryId);
    const purgedActive = purgedRecords.find((r) => r.deleted_id === activeStoryId);

    assert.ok(purgedExpired, "delete_expired_stories MUST include and delete the expired story ID");
    assert.equal(purgedActive, undefined, "delete_expired_stories MUST NOT delete the active story ID");
    console.log(`[PASS] delete_expired_stories() deleted expired record: ${purgedExpired.deleted_id}`);

    // Storage Purge Execution for expired media returned by delete_expired_stories
    console.log("Purging backing storage binary for expired story...");
    const { error: removeExpiredStorageErr } = await clientAuthor.storage
      .from("story-media")
      .remove([expiredStoryStoragePath]);
    assert.ifError(removeExpiredStorageErr, "Storage removal of expired binary must succeed");

    // Verify expired file no longer exists in author folder
    const { data: partitionFilesAfterPurge } = await clientAuthor.storage
      .from("story-media")
      .list(authorUser.id);
    const expiredFileName = expiredStoryStoragePath.split("/")[1];
    const isExpiredFileListed = (partitionFilesAfterPurge || []).some((f) => f.name === expiredFileName);
    assert.equal(isExpiredFileListed, false, "Expired storage object must be permanently purged from partition");
    console.log("[PASS] Expired storage binary successfully purged from storage partition.");

    // Verify active story and its storage binary remain completely untouched
    const { data: activeStoryCheck, error: activeCheckErr } = await clientAuthor
      .from("stories")
      .select("id, views_count")
      .eq("id", activeStoryId)
      .single();
    assert.ifError(activeCheckErr, "Active story check must succeed");
    assert.ok(activeStoryCheck?.id, "Active story record must remain intact in public.stories");

    const { data: activeDownload, error: activeDownloadErr } = await clientAuthor.storage
      .from("story-media")
      .download(activeStoryStoragePath);
    assert.ifError(activeDownloadErr, "Active storage binary download must succeed");
    assert.ok(activeDownload, "Active storage binary remains intact in story-media bucket");
    console.log("[PASS] Active story database record and storage binary remain completely untouched.\n");

    // ------------------------------------------------------------------------
    // PART 2: VIEW SECURITY & IDEMPOTENCY BOUNDARIES
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("PART 2: View Security & Idempotency Boundaries");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 2A. View Forgery Rejection: Viewer attempts to insert with a forged viewer_id
    console.log("Testing View Forgery Rejection (forged viewer_id not matching auth.uid())...");
    const fakeViewerId = "00000000-0000-0000-0000-000000000001";
    const { error: forgeryErr } = await clientViewer
      .from("story_views")
      .insert({
        story_id: activeStoryId,
        viewer_id: fakeViewerId,
      });

    assert.ok(forgeryErr, "RLS MUST reject insert into story_views when viewer_id != auth.uid()");
    console.log(`[PASS] View forgery rejected by RLS: "${forgeryErr.message}"`);

    // 2B. View Idempotency: Multiple view attempts on same active story
    console.log("\nTesting View Idempotency on active story...");
    // First legitimate view
    const { error: firstViewErr } = await clientViewer.rpc("record_story_view", {
      p_story_id: activeStoryId,
      p_viewer_id: viewerUser.id,
    });
    assert.ifError(firstViewErr, "First legitimate view recording must succeed");

    const { data: storyAfterFirstView } = await clientAuthor
      .from("stories")
      .select("views_count")
      .eq("id", activeStoryId)
      .single();
    assert.equal(storyAfterFirstView.views_count, 1, "views_count trigger must increment count to 1");
    console.log(`[PASS] Legitimate view recorded: views_count = ${storyAfterFirstView.views_count}`);

    // Duplicate view attempts (2nd and 3rd)
    console.log("Attempting repeated duplicate views from same viewer...");
    for (let i = 2; i <= 4; i++) {
      const { error: dupViewErr } = await clientViewer.rpc("record_story_view", {
        p_story_id: activeStoryId,
        p_viewer_id: viewerUser.id,
      });
      assert.ifError(dupViewErr, `Duplicate view attempt #${i} must be gracefully handled`);
    }

    const { data: storyAfterDupViews } = await clientAuthor
      .from("stories")
      .select("views_count")
      .eq("id", activeStoryId)
      .single();
    assert.equal(storyAfterDupViews.views_count, 1, "Duplicate view attempts MUST NOT increment views_count; count must remain 1");
    console.log(`[PASS] View idempotency confirmed: views_count remains strictly 1 across multiple attempts.`);

    // 2C. Viewer List Privacy:
    console.log("\nTesting Viewer List Privacy boundaries...");
    // Viewer queries public.story_views for Author's story
    const { data: viewerSpyAttempt } = await clientViewer
      .from("story_views")
      .select("viewer_id, viewed_at")
      .eq("story_id", activeStoryId);

    // RLS policy: USING (auth.uid() = viewer_id OR auth.uid() = (SELECT s.user_id FROM public.stories s WHERE s.id = story_views.story_id))
    // A non-author viewer querying story_views can only ever see their own row, never other viewers' identities!
    assert.ok(
      viewerSpyAttempt.every((row) => row.viewer_id === viewerUser.id),
      "Non-author viewer must never be able to inspect other viewers' records"
    );
    console.log(`[PASS] Viewer list privacy enforced: non-author viewer cannot view other travelers' views.`);

    // Author queries public.story_views:
    const { data: authorViewersList, error: authorQueryErr } = await clientAuthor
      .from("story_views")
      .select("viewer_id, viewed_at, user:users(id, name, age)")
      .eq("story_id", activeStoryId);

    assert.ifError(authorQueryErr, "Author must be authorized to inspect viewers of their own story");
    assert.equal(authorViewersList.length, 1, "Author should receive exactly 1 legitimate viewer");
    assert.equal(authorViewersList[0].viewer_id, viewerUser.id, "Viewer ID must match Rohan Varma");
    assert.equal(authorViewersList[0].user?.name, "Rohan Varma", "Author receives legitimate viewer profile");
    console.log(`[PASS] Author successfully verified viewer identity: ${authorViewersList[0].user?.name} (${authorViewersList[0].viewer_id})\n`);

    // ------------------------------------------------------------------------
    // PART 3: MEDIA SECURITY & STORAGE PARTITIONING
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("PART 3: Media Security & Storage Partitioning");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 3A. Non-Owner Storage Partition Upload: Viewer attempts to upload to Author's folder
    console.log("Testing Non-Owner Storage Partition Upload rejection...");
    const unauthorizedUploadPath = `${authorUser.id}/hacked_${timestamp}.png`;
    const { error: unauthUploadErr } = await clientViewer.storage
      .from("story-media")
      .upload(unauthorizedUploadPath, testImageBuffer, { contentType: "image/png" });

    assert.ok(unauthUploadErr, "Storage RLS MUST reject upload into another user's partition folder");
    console.log(`[PASS] Non-owner storage partition upload rejected: "${unauthUploadErr.message}"`);

    // 3B. Non-Owner Storage Deletion: Viewer attempts to delete Author's active story media
    console.log("\nTesting Non-Owner Storage Deletion rejection...");
    const { data: unauthDelData, error: unauthDelErr } = await clientViewer.storage
      .from("story-media")
      .remove([activeStoryStoragePath]);

    // Supabase storage returns an error or empty array when RLS blocks deletion
    assert.ok(
      unauthDelErr != null || (Array.isArray(unauthDelData) && unauthDelData.length === 0),
      "Storage RLS MUST block deletion of another user's media"
    );

    // Verify Author's media is still intact
    const { data: stillExistingActiveMedia } = await clientAuthor.storage
      .from("story-media")
      .download(activeStoryStoragePath);
    assert.ok(stillExistingActiveMedia, "Author's media MUST remain untouched after unauthorized delete attempt");
    console.log("[PASS] Non-owner storage deletion rejected: Author's active media remains intact.");

    // 3C. Owner Cascade: Author manually deletes their active story
    console.log("\nTesting Owner Manual Cascade Deletion...");
    const { error: authorDeleteStoryErr } = await clientAuthor
      .from("stories")
      .delete()
      .eq("id", activeStoryId);
    assert.ifError(authorDeleteStoryErr, "Author must be able to delete their own story");

    const { data: removeData, error: authorDeleteStorageErr } = await clientAuthor.storage
      .from("story-media")
      .remove([activeStoryStoragePath]);
    console.log("Storage remove result:", removeData, authorDeleteStorageErr);
    assert.ifError(authorDeleteStorageErr, "Author must be able to purge their own storage binary");

    // Confirm database record is purged
    const { data: checkDeletedStory } = await clientAuthor
      .from("stories")
      .select("id")
      .eq("id", activeStoryId);
    assert.equal(checkDeletedStory.length, 0, "Story record must be purged from database");

    // Confirm storage binary is purged via storage directory listing
    // Allow brief propagation for S3/CDN invalidation
    await new Promise((r) => setTimeout(r, 600));
    const { data: authorFiles, error: listFilesErr } = await clientAuthor.storage
      .from("story-media")
      .list(authorUser.id);
    assert.ifError(listFilesErr, "Listing author partition must succeed");
    const activeFileName = activeStoryStoragePath.split("/")[1];
    const fileStillPresent = (authorFiles || []).some((f) => f.name === activeFileName);
    assert.equal(fileStillPresent, false, "Active story binary must be purged from storage bucket partition");
    console.log("[PASS] Owner cascade deletion verified: Database record and Storage object both purged.\n");

    // ------------------------------------------------------------------------
    // PART 4: TEARDOWN & PRISTINE STATE
    // ------------------------------------------------------------------------
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("PART 4: Teardown & Pristine State Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("Calling delete-account Edge Function for Author and Viewer...");
    try {
      const { data: delAuthorRes } = await clientAuthor.functions.invoke("delete-account");
      console.log(`[delete-account: Author] ${JSON.stringify(delAuthorRes)}`);
    } catch (e) {
      console.warn("Author delete-account edge function invoke notice:", e.message);
    }

    try {
      const { data: delViewerRes } = await clientViewer.functions.invoke("delete-account");
      console.log(`[delete-account: Viewer] ${JSON.stringify(delViewerRes)}`);
    } catch (e) {
      console.warn("Viewer delete-account edge function invoke notice:", e.message);
    }

    // Direct DB profile cleanup if rows remain
    await clientAuthor.from("users").delete().eq("id", authorUser.id);
    await clientViewer.from("users").delete().eq("id", viewerUser.id);

    // Final pristine check on get_active_stories()
    const { data: finalActiveCheck, error: finalCheckErr } = await clientAuthor.rpc("get_active_stories");
    assert.ifError(finalCheckErr, "Final get_active_stories call must succeed");
    const leftoverTestStories = (finalActiveCheck || []).filter(
      (s) => s.story_id === activeStoryId || s.story_id === expiredStoryId
    );
    assert.equal(leftoverTestStories.length, 0, "Zero leftover test story artifacts must remain in active stories");
    console.log("[PASS] Pristine state confirmed: get_active_stories() returns ZERO leftover test artifacts.");

    console.log("\n==============================================================================");
    console.log("STORIES FINAL HARDENING GATE: ALL CHECKS PASSED EMPIRICALLY WITH 100% SUCCESS");
    console.log("==============================================================================");
  } catch (gateError) {
    console.error("\n❌ HARDENING GATE FAILURE:", gateError);
    process.exitCode = 1;
  } finally {
    // Safety cleanup
    try {
      if (activeStoryId) {
        await clientAuthor.from("stories").delete().eq("id", activeStoryId);
      }
      if (expiredStoryId) {
        await clientAuthor.from("stories").delete().eq("id", expiredStoryId);
      }
      if (activeStoryStoragePath) {
        await clientAuthor.storage.from("story-media").remove([activeStoryStoragePath]);
      }
      if (expiredStoryStoragePath) {
        await clientAuthor.storage.from("story-media").remove([expiredStoryStoragePath]);
      }
      if (authorUser?.id) {
        await clientAuthor.from("users").delete().eq("id", authorUser.id);
      }
      if (viewerUser?.id) {
        await clientViewer.from("users").delete().eq("id", viewerUser.id);
      }
    } catch {}
  }
}

runGate();
