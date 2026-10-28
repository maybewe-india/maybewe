import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

test('1. Issue #1: Password Recovery Link Parsing & Session Exchange Contract', () => {
  const resetSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/reset-password.jsx'), 'utf8');
  const callbackSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/auth/callback.jsx'), 'utf8');

  // Must support both query params and hash fragment tokens
  assert.ok(resetSrc.includes('extractTokensFromUrl'), 'reset-password.jsx must include extractTokensFromUrl');
  assert.ok(resetSrc.includes('Linking.addEventListener'), 'reset-password.jsx must listen for native deep links via addEventListener');
  assert.ok(resetSrc.includes('setSession'), 'reset-password.jsx must establish session with access_token and refresh_token');
  assert.ok(resetSrc.includes('exchangeCodeForSession'), 'reset-password.jsx must handle PKCE exchangeCodeForSession');

  // Callback screen must also support deep link listening and session exchange
  assert.ok(callbackSrc.includes('extractTokensFromUrl'), 'auth/callback.jsx must include extractTokensFromUrl');
  assert.ok(callbackSrc.includes('Linking.addEventListener'), 'auth/callback.jsx must listen to Linking.addEventListener');
});

test('2. Issue #2: Signup Collision & Pending Email Confirmation Interactive UI Contract', () => {
  const signupSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/signup.jsx'), 'utf8');

  // Must handle already registered collision state with dedicated resolution actions
  assert.ok(signupSrc.includes('isAlreadyRegistered'), 'signup.jsx must track isAlreadyRegistered state');
  assert.ok(signupSrc.includes('Account Already Exists'), 'signup.jsx must render clear Account Already Exists UI');
  assert.ok(signupSrc.includes('Sign In to Your Account') || signupSrc.includes('Sign In with this Email'), 'signup.jsx must provide direct navigation to Sign In');
  assert.ok(signupSrc.includes('Forgot your password? Reset here'), 'signup.jsx must provide direct navigation to Forgot Password');
  assert.ok(signupSrc.includes('Use a different email address'), 'signup.jsx must allow changing email without losing profile data');

  // Must handle awaiting confirmation state with resend button
  assert.ok(signupSrc.includes('isAwaitingConfirmation'), 'signup.jsx must track isAwaitingConfirmation state');
  assert.ok(signupSrc.includes('handleResendConfirmation'), 'signup.jsx must provide resend confirmation handler');
});

test('3. Issue #3: Home Screen Expedition Card & Destination Travelers Honesty Contract', () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(tabs)/index.jsx'), 'utf8');

  // Must NOT contain synthetic hardcoded date range or synthetic traveler count on the featured card
  assert.ok(!indexSrc.includes('Oct 14 – 24'), 'index.jsx must NOT hardcode "Oct 14 – 24"');
  assert.ok(
    !indexSrc.includes('4 Verified Solo Travelers planning departures this month'),
    'index.jsx must NOT hardcode synthetic "4 Verified Solo Travelers..."'
  );

  // Must NOT display "undefined travelers on MaybeWe"
  assert.ok(
    !indexSrc.includes('{place.travelersCount} travelers on MaybeWe'),
    'index.jsx must NOT render {place.travelersCount} which produces "undefined travelers on MaybeWe"'
  );
  assert.ok(
    indexSrc.includes('place.tag'),
    'index.jsx destination cards must render place.tag'
  );
});

test('4. Issue #4: GlassCard Android Elevation & Double Outline Remediation Contract', () => {
  const glassCardSrc = fs.readFileSync(path.join(ROOT, 'frontend/components/ui/GlassCard.jsx'), 'utf8');

  // Must normalize Android background to prevent muddy shadow bleed-through
  assert.ok(
    glassCardSrc.includes('Platform.select') && glassCardSrc.includes("android: '#FFFFFF'"),
    'GlassCard.jsx must use solid backing on Android for pearl material to avoid murky shadow bleed'
  );
  // Must avoid colliding topInnerHighlight on Android
  assert.ok(
    glassCardSrc.includes("Platform.OS === 'web'"),
    'GlassCard.jsx must only render topInnerHighlight on web to prevent doubled top border on Android'
  );
});

test('5. Issue #5: Destination Photograph Proportion & Safe Asset Resolution Contract', () => {
  const modalSrc = fs.readFileSync(path.join(ROOT, 'frontend/components/PlaceDetailModal.jsx'), 'utf8');

  // Must safely resolve both string URIs and numeric require IDs without breaking
  assert.ok(
    modalSrc.includes("typeof rawImage === 'string' ? { uri: rawImage } : rawImage"),
    'PlaceDetailModal.jsx must handle both string URLs and local require IDs safely'
  );
});

test('6. Issue #6: Profile Photo Cloud Upload to Supabase Storage Contract', () => {
  const mediaSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/mediaUpload.js'), 'utf8');
  const editProfileSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/edit-profile.jsx'), 'utf8');

  // mediaUpload must export uploadAvatarMedia
  assert.ok(
    mediaSrc.includes('export async function uploadAvatarMedia'),
    'mediaUpload.js must export uploadAvatarMedia'
  );
  assert.ok(
    mediaSrc.includes('travel-photos'),
    'mediaUpload.js uploadAvatarMedia must support fallback to travel-photos bucket'
  );

  // edit-profile must use uploadAvatarMedia before saving
  assert.ok(
    editProfileSrc.includes('uploadAvatarMedia'),
    'edit-profile.jsx must import and use uploadAvatarMedia'
  );
  assert.ok(
    editProfileSrc.includes("file://"),
    'edit-profile.jsx must detect local file:// URIs and upload them'
  );
});

test('7. Issue #7: Verification Status Backend Alignment & Anti-Split-Brain Contract', () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/authContext.jsx'), 'utf8');

  // When backend edge verification does not succeed, status must remain pending (NOT verified)
  assert.ok(
    authContextSrc.includes("verification_status: 'pending'"),
    'authContext.jsx submitVerification must set pending when edge verification does not approve'
  );
});
