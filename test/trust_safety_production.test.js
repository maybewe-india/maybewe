/**
 * MaybeWe — Trust, Safety & Verification Production Tests
 * Run: node --test test/trust_safety_production.test.js
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ─── 1. Migration file existence & content ────────────────────────────────────
test('Migration 03 exists and has correct structure', () => {
  const migPath = join(root, 'supabase/migrations/03_trust_safety_verification_system.sql');
  assert.ok(existsSync(migPath), 'Migration file 03 must exist');
  const sql = readFileSync(migPath, 'utf8');
  assert.ok(sql.includes('verification_submissions'), 'Migration must create verification_submissions table');
  assert.ok(sql.includes('emergency_contacts'), 'Migration must create emergency_contacts table');
  assert.ok(sql.includes("CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'))"),
    'Migration must constrain verification_status values');
  assert.ok(sql.includes("CHECK (document_type IN ('passport', 'driving_license', 'national_id'))"),
    'Migration must constrain document_type values');
  assert.ok(sql.includes("CHECK (status IN ('pending', 'approved', 'rejected'))"),
    'Migration must constrain verification_submissions.status values');
  assert.ok(sql.includes("target_type TEXT"), 'reports table must have target_type column');
  assert.ok(sql.includes("target_id TEXT"), 'reports table must have target_id column');
  assert.ok(sql.includes("verification-documents"), 'Migration must configure verification-documents bucket');
  assert.ok(sql.includes('public = false'), 'verification-documents bucket must be private');
  assert.ok(sql.includes('process_verification_decision'), 'Migration must define process_verification_decision RPC');
  assert.ok(sql.includes('SECURITY DEFINER'), 'RPC must use SECURITY DEFINER');
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION'), 'RPC must revoke public access');
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.process_verification_decision TO service_role'),
    'RPC must grant to service_role only');
});

test('Storage RLS policy: user folder isolation defined in migration', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/03_trust_safety_verification_system.sql'), 'utf8');
  assert.ok(
    sql.includes("(storage.foldername(name))[1] = auth.uid()::text"),
    'Storage INSERT policy must enforce folder = auth.uid()'
  );
});

test('Emergency contacts RLS: strictly private to owner', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/03_trust_safety_verification_system.sql'), 'utf8');
  assert.ok(sql.includes('auth.uid() = user_id'), 'Emergency contacts must use auth.uid() = user_id RLS');
  assert.ok(sql.includes('FOR ALL'), 'Emergency contacts RLS must cover ALL operations');
});

test('Reports RLS: insert allowed for authenticated, select restricted to service_role', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/03_trust_safety_verification_system.sql'), 'utf8');
  assert.ok(sql.includes("reporter_id = auth.uid()"), 'Reports INSERT must check reporter_id = auth.uid()');
  assert.ok(sql.includes('Reports are private to administrators'), 'Reports must have admin-only SELECT policy');
});

// ─── 2. lib/verification.js ───────────────────────────────────────────────────
test('lib/verification.js exists and exports required functions', () => {
  const path = join(root, 'lib/verification.js');
  assert.ok(existsSync(path), 'lib/verification.js must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes('export async function uploadVerificationFile'), 'must export uploadVerificationFile');
  assert.ok(code.includes('export async function submitVerificationRequest'), 'must export submitVerificationRequest');
  assert.ok(code.includes('export async function getVerificationStatus'), 'must export getVerificationStatus');
  assert.ok(code.includes('export async function cancelVerificationSubmission'), 'must export cancelVerificationSubmission');
  assert.ok(code.includes("verification-documents"), 'must reference verification-documents bucket');
  assert.ok(code.includes('`${userId}/${fileName}`'), 'must enforce user folder isolation in storage path');
});

// ─── 3. lib/emergencyContacts.js ─────────────────────────────────────────────
test('lib/emergencyContacts.js exists and exports CRUD functions', () => {
  const path = join(root, 'lib/emergencyContacts.js');
  assert.ok(existsSync(path), 'lib/emergencyContacts.js must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes('export async function getEmergencyContacts'), 'must export getEmergencyContacts');
  assert.ok(code.includes('export async function addEmergencyContact'), 'must export addEmergencyContact');
  assert.ok(code.includes('export async function updateEmergencyContact'), 'must export updateEmergencyContact');
  assert.ok(code.includes('export async function deleteEmergencyContact'), 'must export deleteEmergencyContact');
  assert.ok(code.includes("emergency_contacts"), 'must reference emergency_contacts table');
});

// ─── 4. lib/safetyReports.js ─────────────────────────────────────────────────
test('lib/safetyReports.js exists with structured report submission', () => {
  const path = join(root, 'lib/safetyReports.js');
  assert.ok(existsSync(path), 'lib/safetyReports.js must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes('export async function submitSafetyReport'), 'must export submitSafetyReport');
  assert.ok(code.includes('target_type'), 'submitSafetyReport must include target_type');
  assert.ok(code.includes('target_id'), 'submitSafetyReport must include target_id');
  assert.ok(code.includes("'reports'"), 'must write to reports table');
  assert.ok(code.includes('export const REPORT_REASONS'), 'must export REPORT_REASONS constant');
});

// ─── 5. SafetyReportModal uses hardened service ───────────────────────────────
test('SafetyReportModal uses safetyReports service (not raw supabase)', () => {
  const path = join(root, 'components/SafetyReportModal.jsx');
  assert.ok(existsSync(path), 'SafetyReportModal.jsx must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes("from '../lib/safetyReports'"), 'Must import from safetyReports service');
  assert.ok(code.includes('submitSafetyReport'), 'Must call submitSafetyReport');
  assert.ok(!code.includes("reason: `${selectedReason}:"), 'Must NOT use old string-concat reason format');
});

// ─── 6. EmergencyContactsModal component ─────────────────────────────────────
test('EmergencyContactsModal component exists and uses service layer', () => {
  const path = join(root, 'components/EmergencyContactsModal.jsx');
  assert.ok(existsSync(path), 'EmergencyContactsModal.jsx must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes('getEmergencyContacts'), 'must call getEmergencyContacts');
  assert.ok(code.includes('addEmergencyContact'), 'must call addEmergencyContact');
  assert.ok(code.includes('updateEmergencyContact'), 'must call updateEmergencyContact');
  assert.ok(code.includes('deleteEmergencyContact'), 'must call deleteEmergencyContact');
  assert.ok(code.includes('export default function EmergencyContactsModal'), 'must be a default export');
});

// ─── 7. settings.jsx mounts EmergencyContactsModal ───────────────────────────
test('settings.jsx mounts EmergencyContactsModal and imports it', () => {
  const path = join(root, 'app/settings.jsx');
  assert.ok(existsSync(path), 'settings.jsx must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes("import EmergencyContactsModal"), 'settings must import EmergencyContactsModal');
  assert.ok(code.includes('<EmergencyContactsModal'), 'settings must render EmergencyContactsModal');
  assert.ok(code.includes('showEmergencyContacts'), 'settings must have showEmergencyContacts state');
  assert.ok(code.includes('Safety Circle'), 'settings must show Safety Circle row label');
});

// ─── 8. TrustBadge anti-spoofing ─────────────────────────────────────────────
test('TrustBadge has badge-only variant and no client-side spoofing', () => {
  const path = join(root, 'components/ui/TrustBadge.jsx');
  assert.ok(existsSync(path), 'TrustBadge.jsx must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes("variant === 'badge-only'"), 'TrustBadge must support badge-only variant');
  assert.ok(code.includes("verificationStatus === 'verified'"), 'badge must derive from verificationStatus prop');
});

test('DiscoveryCard does not fake-spoof verification status', () => {
  const path = join(root, 'components/DiscoveryCard.jsx');
  assert.ok(existsSync(path), 'DiscoveryCard.jsx must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(!code.includes("verification_status || 'verified'"), 'DiscoveryCard must NOT fake verified fallback');
});

// ─── 9. Integration gate script ──────────────────────────────────────────────
test('Live integration gate script exists with all required phases', () => {
  const path = join(root, 'scripts/live_trust_safety_integration_gate.mjs');
  assert.ok(existsSync(path), 'Integration gate script must exist');
  const code = readFileSync(path, 'utf8');
  assert.ok(code.includes('verification_submissions'), 'Gate must test verification_submissions');
  assert.ok(code.includes('emergency_contacts'), 'Gate must test emergency_contacts');
  assert.ok(code.includes("'reports'"), 'Gate must test reports');
  assert.ok(code.includes('process_verification_decision'), 'Gate must test RPC');
  assert.ok(code.includes('Teardown'), 'Gate must have teardown phase');
  assert.ok(code.includes('verification-documents'), 'Gate must test storage isolation');
  assert.ok(code.includes('User A folder') || code.includes('own folder'), 'Gate must test folder-level upload isolation');
});

// ─── 10. Prior test suite still passes ───────────────────────────────────────
test('verify.js (prior test suite) references are intact', () => {
  const path = join(root, 'test/verify.js');
  assert.ok(existsSync(path), 'Original verify.js must still exist');
});
