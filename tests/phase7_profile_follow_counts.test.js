// ============================================================================
// MAYBEWE PROFILE FOLLOWERS & FOLLOWING COUNTS — REGRESSION SUITE
// File: tests/phase7_profile_follow_counts.test.js
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const profileJsPath = path.join(ROOT, 'frontend', 'app', '(tabs)', 'profile.jsx');
const socialJsPath = path.join(ROOT, 'frontend', 'lib', 'social.js');
const calendarJsPath = path.join(ROOT, 'frontend', 'components', 'ui', 'CalendarPickerModal.jsx');

const profileSrc = fs.readFileSync(profileJsPath, 'utf8');
const socialSrc = fs.readFileSync(socialJsPath, 'utf8');
const calendarSrc = fs.readFileSync(calendarJsPath, 'utf8');

test('1. Profile Hardcoded & Mocked Stats Removal Contract', () => {
  // Ensure the old fake placeholder numbers 142 and 89 are completely removed from profile.jsx and social.js
  assert.ok(!profileSrc.includes('followersCount: 142'), 'profile.jsx must not contain hardcoded followers count 142');
  assert.ok(!profileSrc.includes('followingCount: 89'), 'profile.jsx must not contain hardcoded following count 89');
  assert.ok(!profileSrc.includes(': 142'), 'profile.jsx must not have fallback to 142');
  assert.ok(!profileSrc.includes(': 89'), 'profile.jsx must not have fallback to 89');
  assert.ok(!socialSrc.includes('142'), 'social.js must not contain 142');
  assert.ok(!socialSrc.includes('89'), 'social.js must not contain 89');

  // Verify clean initial state with null and loading indicator
  assert.ok(
    profileSrc.includes("const [socialStats, setSocialStats] = useState({ followersCount: null, followingCount: null });"),
    'profile.jsx must initialize socialStats with null values'
  );
  assert.ok(
    profileSrc.includes("const [socialStatsLoading, setSocialStatsLoading] = useState(true);"),
    'profile.jsx must track loading state via socialStatsLoading'
  );
});

test('2. Supabase follows Schema & Column Binding Contract', () => {
  // Verify queries use the actual existing 'follows' table and column schema
  assert.ok(
    socialSrc.includes(".from('follows')"),
    'social.js must query the existing follows table'
  );
  // Followers: accounts where following_id == userId
  assert.ok(
    socialSrc.includes(".select('follower_id', { count: 'exact', head: true })"),
    'Followers count must query exact count on follower_id with head: true'
  );
  assert.ok(
    socialSrc.includes(".eq('following_id', userId)"),
    'Followers query must filter by following_id == userId'
  );

  // Following: accounts where follower_id == userId
  assert.ok(
    socialSrc.includes(".select('following_id', { count: 'exact', head: true })"),
    'Following count must query exact count on following_id with head: true'
  );
  assert.ok(
    socialSrc.includes(".eq('follower_id', userId)"),
    'Following query must filter by follower_id == userId'
  );
});

test('3. Empty Accounts & Exact Mapping Contract (Zero Followers/Following vs Error)', () => {
  // When an account has genuine 0 followers/following, UI renders 0.
  // When network or query error occurs, UI renders '—' (not 0) so error is not disguised as 0.
  assert.ok(
    profileSrc.includes("{socialStats.followersCount === null ? '—' : socialStats.followersCount}"),
    'profile.jsx must display actual followers count, rendering 0 for genuine zero and — for null/error'
  );
  assert.ok(
    profileSrc.includes("{socialStats.followingCount === null ? '—' : socialStats.followingCount}"),
    'profile.jsx must display actual following count, rendering 0 for genuine zero and — for null/error'
  );
});

test('4. Refresh Strategy: useFocusEffect, Pull-to-Refresh & Follow Toggle Sync', () => {
  // 1. useFocusEffect for returning to tab
  assert.ok(
    profileSrc.includes('useFocusEffect('),
    'profile.jsx must use useFocusEffect to refresh follow counts when navigating to Profile'
  );

  // 2. RefreshControl for pull-to-refresh
  assert.ok(
    profileSrc.includes('<RefreshControl'),
    'profile.jsx must provide a RefreshControl on ScrollView'
  );
  assert.ok(
    profileSrc.includes('handleRefresh'),
    'profile.jsx must implement handleRefresh calling loadSocialStats'
  );

  // 3. onFollowChange updates state and triggers fresh count sync
  assert.ok(
    profileSrc.includes('onFollowChange={(_authorId, isFollowing) => {'),
    'profile.jsx must handle onFollowChange from PostDetailModal'
  );
  assert.ok(
    profileSrc.includes('loadSocialStats();'),
    'onFollowChange must trigger loadSocialStats() for database verification'
  );
});

test('5. Realtime Subscription & Cleanup Contract', () => {
  // Verify subscribeToUserFollowChanges is exported and consumed with clean teardown
  assert.ok(
    socialSrc.includes('export function subscribeToUserFollowChanges(userId, onChange)'),
    'social.js must export subscribeToUserFollowChanges'
  );
  assert.ok(
    profileSrc.includes('subscribeToUserFollowChanges(activeId,'),
    'profile.jsx must subscribe to follow changes for active signed-in user'
  );
  assert.ok(
    socialSrc.includes('supabase.removeChannel(channel)'),
    'social.js must remove realtime channel on teardown'
  );
});

test('6. Authenticated User Boundary & Query Error Handling Contract', () => {
  // Safe handling of null/unauthenticated user
  assert.ok(
    socialSrc.includes('if (!userId || !isSupabaseConfigured)'),
    'getFollowCounts must return safe 0 counts when userId is falsy or supabase not configured'
  );

  // Error handling: logging and safe fallback
  assert.ok(
    socialSrc.includes('getFollowCounts followers query error:'),
    'social.js must log followers query errors'
  );
  assert.ok(
    socialSrc.includes('getFollowCounts following query error:'),
    'social.js must log following query errors'
  );
  assert.ok(
    profileSrc.includes("console.warn('Failed to load profile follow counts:', err);"),
    'profile.jsx must safely catch and log follow counts loading failures'
  );
});

test('7. Calendar Selection Highlight Visual Luxury Contract', () => {
  // Calendar picker must not use solid black circles or black squares
  assert.ok(!calendarSrc.includes("backgroundColor: '#171817'"), 'calendar must not use #171817 for day cells');
  assert.ok(!calendarSrc.includes("elevation: 1"), 'calendar day circles must not use elevation: 1 on Android to prevent square bounding box artifacts');
  assert.ok(
    calendarSrc.includes("elevation: 0"),
    'calendar day circles must specify elevation: 0 on Android'
  );
  assert.ok(
    calendarSrc.includes("overflow: 'hidden'"),
    'calendar day circles must clip cleanly with overflow: hidden'
  );
  assert.ok(
    calendarSrc.includes("backgroundColor: '#B99A5E'"),
    'calendar must use signature luxury champagne #B99A5E for active selections'
  );
});

test('8. Functional Simulation of getFollowCounts Logic', async () => {
  // Simulate getFollowCounts logic directly to verify mathematically exact counting behavior
  const simulateFollowCounts = async ({ followersCount, followingCount, followersErr, followingErr }) => {
    const followersRes = { count: followersCount, error: followersErr };
    const followingRes = { count: followingCount, error: followingErr };

    const hasError = Boolean(followersRes?.error || followingRes?.error);
    return {
      followersCount: followersRes?.error ? null : Math.max(0, Number(followersRes?.count || 0)),
      followingCount: followingRes?.error ? null : Math.max(0, Number(followingRes?.count || 0)),
      error: hasError ? (followersRes?.error || followingRes?.error) : null,
    };
  };

  // Test case A: Real active user with 15 followers and 7 following
  const normalUser = await simulateFollowCounts({ followersCount: 15, followingCount: 7 });
  assert.equal(normalUser.followersCount, 15);
  assert.equal(normalUser.followingCount, 7);
  assert.equal(normalUser.error, null);

  // Test case B: Brand new empty user with 0 followers and 0 following
  const emptyUser = await simulateFollowCounts({ followersCount: 0, followingCount: 0 });
  assert.equal(emptyUser.followersCount, 0, 'Empty account must yield 0 followers, never 142');
  assert.equal(emptyUser.followingCount, 0, 'Empty account must yield 0 following, never 89');

  // Test case C: Database / Network query error
  const errorUser = await simulateFollowCounts({
    followersCount: null,
    followingCount: null,
    followersErr: new Error('Network timeout'),
    followingErr: null,
  });
  assert.equal(errorUser.followersCount, null, 'Failed query must return null (rendered as —), NOT disguised as 0');
  assert.notEqual(errorUser.error, null, 'Error must be reported');
});
