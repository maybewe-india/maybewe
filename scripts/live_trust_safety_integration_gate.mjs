/**
 * MaybeWe - Trust, Safety & Verification Live Integration Gate
 * Run: node scripts/live_trust_safety_integration_gate.mjs
 *
 * Env vars required:
 *   SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD
 *   TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env if present
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function failExit(msg) { console.error('\n' + msg); process.exit(1); }

if (!SUPABASE_URL || SUPABASE_URL.includes('demo-solo-traveler')) failExit('SUPABASE_URL not configured.');
if (!SERVICE_KEY) failExit('SUPABASE_SERVICE_ROLE_KEY not configured.');
if (!ANON_KEY || ANON_KEY === 'demo-anon-key-placeholder') failExit('SUPABASE_ANON_KEY not configured.');

const UA_EMAIL = process.env.TEST_USER_A_EMAIL;
const UA_PASS  = process.env.TEST_USER_A_PASSWORD;
const UB_EMAIL = process.env.TEST_USER_B_EMAIL;
const UB_PASS  = process.env.TEST_USER_B_PASSWORD;

if (!UA_EMAIL || !UA_PASS || !UB_EMAIL || !UB_PASS)
  failExit('Test credentials missing. Set TEST_USER_A_EMAIL/PASSWORD and TEST_USER_B_EMAIL/PASSWORD.');

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const clientA     = createClient(SUPABASE_URL, ANON_KEY,    { auth: { autoRefreshToken: true,  persistSession: false } });
const clientB     = createClient(SUPABASE_URL, ANON_KEY,    { auth: { autoRefreshToken: true,  persistSession: false } });

let userAId = null, userBId = null;
let testContactId = null, testReportId = null, testSubId = null;
const storagePaths = [];
let passed = 0, failed = 0;

function assert(cond, label) {
  if (cond) { console.log(`  PASS ${label}`); passed++; }
  else       { console.error(`  FAIL ${label}`); failed++; }
}

async function run() {
  console.log('\n=== MaybeWe Trust & Safety Integration Gate ===');
  console.log('Target: ' + SUPABASE_URL + '\n');

  // 1. Auth
  console.log('1. Authenticating test users...');
  const { data: authA, error: eA } = await clientA.auth.signInWithPassword({ email: UA_EMAIL, password: UA_PASS });
  assert(!eA, 'User A auth: ' + UA_EMAIL);
  if (eA) console.error('   Auth error A:', eA.message);
  userAId = authA?.user?.id;

  const { data: authB, error: eB } = await clientB.auth.signInWithPassword({ email: UB_EMAIL, password: UB_PASS });
  assert(!eB, 'User B auth: ' + UB_EMAIL);
  if (eB) console.error('   Auth error B:', eB.message);
  userBId = authB?.user?.id;

  if (!userAId || !userBId) failExit('Auth failed. Cannot continue.');

  // 2. Users schema
  console.log('\n2. Verifying users schema has verification columns...');
  const { data: uRow, error: uErr } = await adminClient.from('users')
    .select('id,verification_status,verified_at,verification_rejection_reason').eq('id', userAId).single();
  assert(!uErr && uRow, 'users row accessible with verification columns');
  assert(['unverified','pending','verified','rejected'].includes(uRow?.verification_status),
    'verification_status is valid: ' + uRow?.verification_status);

  // 3. Verification submission & storage isolation
  console.log('\n3. Verification submission & storage RLS...');

  // User A uploads
  const blob = new TextEncoder().encode('MAYBEWE_GATE_TEST_DOC');
  const storagePath = userAId + '/doc_gate_' + Date.now() + '.jpg';
  const { data: upData, error: upErr } = await clientA.storage
    .from('verification-documents').upload(storagePath, blob, { contentType: 'image/jpeg' });
  assert(!upErr, 'User A uploads to own folder in verification-documents');
  if (upErr) console.error('   Upload error:', upErr.message);
  if (upData) storagePaths.push(storagePath);

  // User A inserts submission
  const { data: sub, error: subErr } = await clientA.from('verification_submissions').insert([{
    user_id: userAId, document_type: 'passport',
    document_front_url: storagePath, selfie_url: storagePath, status: 'pending',
  }]).select('id,status').single();
  assert(!subErr && sub, 'User A inserts verification_submission');
  assert(sub?.status === 'pending', 'Submission status = pending');
  testSubId = sub?.id;

  // User A reads own submission
  const { data: ownSub } = await clientA.from('verification_submissions').select('id').eq('user_id', userAId);
  assert(ownSub?.length > 0, 'User A can read own submission');

  // User B CANNOT read User A submissions
  const { data: bSub } = await clientB.from('verification_submissions').select('id').eq('user_id', userAId);
  assert(!bSub || bSub.length === 0, 'User B cannot read User A submissions (RLS isolation)');

  // User B CANNOT download User A storage file
  const { data: bFile, error: bFileErr } = await clientB.storage
    .from('verification-documents').download(storagePath);
  assert(bFileErr && !bFile, 'User B cannot download User A verification file (Storage RLS)');

  // User B CANNOT upload to User A folder
  const { error: illegalErr } = await clientB.storage
    .from('verification-documents').upload(userAId + '/injected_' + Date.now() + '.jpg', blob, { contentType: 'image/jpeg' });
  assert(illegalErr, 'User B cannot upload to User A folder (Storage RLS folder isolation)');

  // 4. Emergency contacts
  console.log('\n4. Emergency contacts privacy...');
  const { data: ec, error: ecErr } = await clientA.from('emergency_contacts').insert([{
    user_id: userAId, contact_name: 'Gate Test Contact', phone_number: '+91-0000000000', relationship: 'Test',
  }]).select('id').single();
  assert(!ecErr && ec, 'User A inserts emergency contact');
  testContactId = ec?.id;

  const { data: ownEc } = await clientA.from('emergency_contacts').select('id').eq('user_id', userAId);
  assert(ownEc?.length > 0, 'User A can read own emergency contacts');

  const { data: bEc } = await clientB.from('emergency_contacts').select('id').eq('user_id', userAId);
  assert(!bEc || bEc.length === 0, 'User B cannot read User A emergency contacts (RLS isolation)');

  const { error: bEcInsert } = await clientB.from('emergency_contacts').insert([{
    user_id: userAId, contact_name: 'Injected', phone_number: '0000',
  }]);
  assert(bEcInsert, 'User B cannot insert contact under User A (RLS rejects)');

  // 5. Reports
  console.log('\n5. Safety report submission & admin isolation...');
  const { data: rep, error: repErr } = await clientB.from('reports').insert([{
    reporter_id: userBId, reported_id: userAId,
    target_type: 'user', target_id: userAId,
    reason: 'spam', details: 'Gate test report', status: 'pending',
  }]).select('id').single();
  assert(!repErr && rep, 'User B submits safety report against User A');
  testReportId = rep?.id;

  const { data: aReads } = await clientA.from('reports').select('id');
  assert(!aReads || aReads.length === 0, 'User A cannot SELECT reports (admin isolation)');

  const { data: bReads } = await clientB.from('reports').select('id');
  assert(!bReads || bReads.length === 0, 'User B cannot SELECT reports (admin isolation)');

  const { data: adminRep, error: adminRepErr } = await adminClient.from('reports')
    .select('id,status,reason').eq('id', testReportId).single();
  assert(!adminRepErr && adminRep, 'Admin can read submitted report');
  assert(adminRep?.reason === 'spam', 'Report reason correctly stored: spam');

  // 6. Verification decision RPC
  console.log('\n6. process_verification_decision RPC...');
  if (testSubId) {
    const { error: rpcErr } = await adminClient.rpc('process_verification_decision', {
      p_submission_id: testSubId, p_decision: 'approved', p_rejection_reason: null,
    });
    assert(!rpcErr, 'process_verification_decision RPC call succeeds');

    const { data: vUser } = await adminClient.from('users')
      .select('verification_status,verified_at').eq('id', userAId).single();
    assert(vUser?.verification_status === 'verified', 'User A status updated to verified by RPC');
    assert(vUser?.verified_at != null, 'User A verified_at timestamp set');

    // Reset
    await adminClient.from('users').update({ verification_status: 'unverified', verified_at: null }).eq('id', userAId);
  }

  // 7. Teardown
  console.log('\n7. Teardown...');
  if (testReportId)  { const {error} = await adminClient.from('reports').delete().eq('id', testReportId); assert(!error, 'Deleted test report'); }
  if (testContactId) { const {error} = await clientA.from('emergency_contacts').delete().eq('id', testContactId); assert(!error, 'Deleted test emergency contact'); }
  if (testSubId)     { const {error} = await adminClient.from('verification_submissions').delete().eq('id', testSubId); assert(!error, 'Deleted test submission'); }
  if (storagePaths.length) { const {error} = await adminClient.storage.from('verification-documents').remove(storagePaths); assert(!error, 'Deleted test storage files'); }

  await clientA.auth.signOut();
  await clientB.auth.signOut();

  // Summary
  console.log('\n=================================================');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed === 0) console.log('ALL GATES PASSED - Trust & Safety LIVE VERIFIED');
  else              console.log('GATE FAILURES - review errors above');
  console.log('=================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Unhandled error:', e); process.exit(1); });
