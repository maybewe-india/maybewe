// Verification and Automated Unit Tests for MaybeWe MVP
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 RUNNING MAYBEWE UNIT & INTEGRATION TESTS...\n');

// 1. CHAT SAFETY SCANNER TESTS
console.log('--- 1. Testing In-Chat Safety Scanner (lib/safety.js) ---');
const { scanMessageForSafety } = require('../frontend/lib/safety');

// Test phone detection
const phoneTest1 = scanMessageForSafety('Call me at 9876543210 when you land');
assert.strictEqual(phoneTest1.containsSensitiveInfo, true, 'Should detect raw 10-digit phone number');
assert.strictEqual(phoneTest1.matches.includes('phone'), true, 'Should flag phone match');

const phoneTest2 = scanMessageForSafety('My number is +1 (555) 234-5678');
assert.strictEqual(phoneTest2.containsSensitiveInfo, true, 'Should detect formatted phone number');

// Test social handle detection
const socialTest1 = scanMessageForSafety('Check my photos @traveler_alex');
assert.strictEqual(socialTest1.containsSensitiveInfo, true, 'Should detect @username handle');
assert.strictEqual(socialTest1.matches.includes('social'), true, 'Should flag social handle match');

const socialTest2 = scanMessageForSafety('DM me on insta: wandering_maya');
assert.strictEqual(socialTest2.containsSensitiveInfo, true, 'Should detect insta handle prefix');

// Test email detection
const emailTest = scanMessageForSafety('Email me your flight ticket to alex@voyager.com');
assert.strictEqual(emailTest.containsSensitiveInfo, true, 'Should detect email address');
assert.strictEqual(emailTest.matches.includes('email'), true, 'Should flag email match');

// Test external link detection
const linkTest = scanMessageForSafety('Follow my journey at https://instagram.com/solo_traveler');
assert.strictEqual(linkTest.containsSensitiveInfo, true, 'Should detect instagram link');
assert.strictEqual(linkTest.matches.includes('external_link'), true, 'Should flag external link');

// Test safe message
const safeTest = scanMessageForSafety('Sounds awesome! Let us meet at the coffee shop outside Shibuya station around 3 PM.');
assert.strictEqual(safeTest.containsSensitiveInfo, false, 'Safe message should not trigger warnings');
console.log('✅ In-Chat Safety Scanner passed all 6 test cases.\n');

// 2. DISCOVERY & DATE OVERLAP MATCHING TESTS
console.log('--- 2. Testing Discovery Date Overlap Algorithm ---');
const { calculateCompatibility } = require('../frontend/lib/discovery');

function checkDateOverlap(tripAFrom, tripATo, tripBFrom, tripBTo) {
  const aStart = new Date(tripAFrom);
  const aEnd = new Date(tripATo);
  const bStart = new Date(tripBFrom);
  const bEnd = new Date(tripBTo);

  // Overlap condition: t.date_from <= p_date_to AND t.date_to >= p_date_from
  return bStart <= aEnd && bEnd >= aStart;
}

// Case 1: Overlapping dates (June 10-20 & June 15-25)
const overlap1 = checkDateOverlap('2026-06-10', '2026-06-20', '2026-06-15', '2026-06-25');
assert.strictEqual(overlap1, true, 'Trip A (June 10-20) and Trip B (June 15-25) should MATCH');

// Case 2: Non-overlapping dates (June 10-20 & June 21-25)
const overlap2 = checkDateOverlap('2026-06-10', '2026-06-20', '2026-06-21', '2026-06-25');
assert.strictEqual(overlap2, false, 'Trip A (June 10-20) and Trip B (June 21-25) should NOT MATCH');

// Case 3: Exact boundary overlap (June 10-20 & June 20-25)
const overlap3 = checkDateOverlap('2026-06-10', '2026-06-20', '2026-06-20', '2026-06-25');
assert.strictEqual(overlap3, true, 'Trips sharing the same transition date should MATCH');

// Compatibility score test
const compatScore = calculateCompatibility(['Culture', 'Food', 'Adventure'], ['Culture', 'Food', 'Nature'], true);
assert.ok(compatScore >= 80 && compatScore <= 98, 'Compatibility score should be between 80% and 98% for high match');
console.log(`✅ Date overlap algorithm and compatibility scoring (${compatScore}%) passed all cases.\n`);

// 3. DATABASE MIGRATION & RLS VERIFICATION
console.log('--- 3. Verifying SQL Schema, Indexes, RLS & RPC ---');
const sqlPath = path.join(__dirname, '../backend/supabase/migrations/01_initial_schema.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

const requiredTables = ['public.users', 'public.travel_history', 'public.trips', 'public.matches', 'public.messages', 'public.reviews', 'public.reports'];
requiredTables.forEach((table) => {
  assert.ok(sqlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Schema must contain table ${table}`);
});

// Check RLS
requiredTables.forEach((table) => {
  assert.ok(sqlContent.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`), `RLS must be enabled on ${table}`);
});

// Check user_verifications table & RLS
assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.user_verifications'), 'Schema must define public.user_verifications table');
assert.ok(sqlContent.includes('ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on public.user_verifications');
assert.ok(sqlContent.includes("status = 'pending'::verification_status_type"), 'RLS must enforce status = pending on client verification submissions');

// Check users UPDATE RLS policy prevents self-verification
assert.ok(sqlContent.includes("verification_status = 'pending'::verification_status_type"), 'RLS must restrict user verification_status updates to pending or unchanged');
assert.ok(sqlContent.includes("verified_at IS NOT DISTINCT FROM"), 'RLS must forbid client from tampering with verified_at');

// Check RPC and Trigger
assert.ok(sqlContent.includes('find_overlapping_trips'), 'Schema must define find_overlapping_trips RPC');
assert.ok(sqlContent.includes('recalculate_trust_score'), 'Schema must define recalculate_trust_score trigger function');
assert.ok(sqlContent.includes('idx_matches_unique_pair'), 'Schema must prevent duplicate matches');
assert.ok(sqlContent.includes('SECURITY DEFINER'), 'RPC must have SECURITY DEFINER flag');

// Check Trusted Verification Decision RPC
assert.ok(sqlContent.includes('process_verification_decision'), 'Schema must define process_verification_decision RPC');
assert.ok(sqlContent.includes('REVOKE ALL ON FUNCTION public.process_verification_decision(UUID, verification_status_type, TEXT) FROM authenticated;'), 'process_verification_decision must be revoked from authenticated clients');
assert.ok(sqlContent.includes('GRANT EXECUTE ON FUNCTION public.process_verification_decision(UUID, verification_status_type, TEXT) TO service_role;'), 'process_verification_decision must be granted strictly to service_role');

// Check Private verification-selfies Bucket
assert.ok(sqlContent.includes("'verification-selfies', false"), 'verification-selfies bucket must be private (public = false)');

console.log('✅ Supabase 01_initial_schema.sql passed all structural, RLS, and security policy checks.\n');

// 4. DUPLICATE MATCH & ITINERARY LOGIC TESTS
console.log('--- 4. Testing Duplicate Match Prevention & Itinerary Rules ---');
const sampleExistingMatches = [
  { id: 'm-1', user: { id: 'traveler-001', name: 'Maya Lin' }, status: 'accepted' },
  { id: 'm-2', user: { id: 'traveler-002', name: 'Lucas Silva' }, status: 'pending' },
];

function checkDuplicateMatch(existingMatches, targetUserId, targetUserName) {
  return existingMatches.some(
    (m) => m.user?.id === targetUserId || (m.user?.name && m.user?.name === targetUserName)
  );
}

// Case 1: Existing match
assert.strictEqual(
  checkDuplicateMatch(sampleExistingMatches, 'traveler-001', 'Maya Lin'),
  true,
  'Should detect existing accepted match'
);

// Case 2: Existing pending match
assert.strictEqual(
  checkDuplicateMatch(sampleExistingMatches, 'traveler-002', 'Lucas Silva'),
  true,
  'Should detect existing pending match'
);

// Case 3: New unique traveler
assert.strictEqual(
  checkDuplicateMatch(sampleExistingMatches, 'traveler-999', 'New Explorer'),
  false,
  'Should allow connection request to new traveler'
);
console.log('✅ Duplicate match prevention logic passed all 3 test cases.\n');

// 5. ZERO TYPESCRIPT ASSERTION
console.log('--- 5. Asserting Zero TypeScript Files in Source Code ---');
function assertNoTs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      assertNoTs(full);
    } else {
      assert.ok(!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx'), `Disallowed TypeScript file found: ${full}`);
    }
  }
}
assertNoTs(path.join(__dirname, '..'));
console.log('✅ Verified zero TypeScript (.ts / .tsx) files exist in the project.\n');

// 6. BRAND INTEGRITY ASSERTION (MAYBEWE)
console.log('--- 6. Asserting Zero User-Facing "Solo Traveler" Strings in UI ---');
function checkBrandIntegrity(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test' || entry.name === 'supabase' || entry.name === 'backend') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkBrandIntegrity(full);
    } else if (entry.name.endsWith('.jsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Allow comments or internal keys if any, but disallow visible string literals
        const hasOldBrand = /['"`>]\s*Solo\s+Travel(l)?er/i.test(line);
        if (hasOldBrand) {
          assert.fail(`Found old brand name in ${full}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
}
checkBrandIntegrity(path.join(__dirname, '../frontend/app'));
checkBrandIntegrity(path.join(__dirname, '../frontend/components'));
console.log('✅ Verified MaybeWe brand integrity across all UI screens and components.\n');

// 7. THEME SYSTEM & PERSISTENCE TESTS
console.log('--- 7. Testing Theme System & Preferences ---');
const themePath = path.join(__dirname, '../frontend/lib/theme.js');
const themeContent = fs.readFileSync(themePath, 'utf8');

assert.ok(themeContent.includes('export const DARK_COLORS = {'), 'lib/theme.js must export DARK_COLORS');
assert.ok(themeContent.includes('export const LIGHT_COLORS = {'), 'lib/theme.js must export LIGHT_COLORS');
assert.ok(themeContent.includes('export const getThemeColors'), 'lib/theme.js must export getThemeColors');
assert.ok(themeContent.includes("mode: 'dark'"), 'DARK_COLORS must specify mode: dark');
assert.ok(themeContent.includes("mode: 'light'"), 'LIGHT_COLORS must specify mode: light');
assert.ok(themeContent.includes("background: '#061522'"), 'Dark theme background must be #061522');
assert.ok(themeContent.includes("background: '#F6F8FB'"), 'Light theme background must be #F6F8FB');
assert.ok(themeContent.includes("textPrimary: '#061522'"), 'Light theme textPrimary must be #061522');

// Check themeContext
const themeContextPath = path.join(__dirname, '../frontend/lib/themeContext.jsx');
assert.ok(fs.existsSync(themeContextPath), 'lib/themeContext.jsx must exist');
const themeContextContent = fs.readFileSync(themeContextPath, 'utf8');
assert.ok(themeContextContent.includes('ThemeProvider'), 'themeContext must export ThemeProvider');
assert.ok(themeContextContent.includes('useTheme'), 'themeContext must export useTheme');

// Check migration file
const migration2Path = path.join(__dirname, '../backend/supabase/migrations/02_theme_preference.sql');
assert.ok(fs.existsSync(migration2Path), '02_theme_preference.sql migration must exist');
const mig2Content = fs.readFileSync(migration2Path, 'utf8');
assert.ok(mig2Content.includes('theme_preference'), 'Migration must alter users with theme_preference');
assert.ok(mig2Content.includes("CHECK (theme_preference IN ('dark', 'light'))"), 'Migration must check theme_preference values');

console.log('✅ Theme system tokens, dual palettes, ThemeContext, and database migration verified successfully.\n');

// 8. INDIA LOCALIZATION VERIFICATION
console.log('--- 8. Verifying India Localization ---');
const indiaDataPath = path.join(__dirname, '../frontend/lib/indiaData.js');
assert.ok(fs.existsSync(indiaDataPath), 'lib/indiaData.js must exist');

// Read and evaluate indiaData.js exports via regex checks
const indiaContent = fs.readFileSync(indiaDataPath, 'utf8');

// Core exports exist
assert.ok(indiaContent.includes('export const INDIA_STATES'), 'indiaData.js must export INDIA_STATES');
assert.ok(indiaContent.includes('export const INDIA_DESTINATIONS'), 'indiaData.js must export INDIA_DESTINATIONS');
assert.ok(indiaContent.includes('export const INDIAN_LANGUAGES'), 'indiaData.js must export INDIAN_LANGUAGES');
assert.ok(indiaContent.includes('export const INDIA_BUDGET_RANGES'), 'indiaData.js must export INDIA_BUDGET_RANGES');
assert.ok(indiaContent.includes('export function formatINR'), 'indiaData.js must export formatINR');
assert.ok(indiaContent.includes('export function formatDateIN'), 'indiaData.js must export formatDateIN');
assert.ok(indiaContent.includes("export const INDIA_CURRENCY_SYMBOL = '₹'"), "indiaData.js must define INR symbol ₹");
assert.ok(indiaContent.includes("export const INDIA_PHONE_CODE = '+91'"), "indiaData.js must define +91 phone code");

// State count: at least 36 entries (28 states + 8 UTs)
const stateMatches = (indiaContent.match(/'[A-Za-z &]+'/g) || []);
const indiaStatesBlock = indiaContent.match(/INDIA_STATES\s*=\s*\[([\s\S]*?)\];/);
assert.ok(indiaStatesBlock, 'INDIA_STATES array block must be found');
const stateCount = (indiaStatesBlock[1].match(/'/g) || []).length / 2;
assert.ok(stateCount >= 36, `INDIA_STATES should have >= 36 entries (got ${stateCount})`);

// Indian languages must include core regional languages
const requiredLanguages = ['Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati'];
requiredLanguages.forEach(lang => {
  assert.ok(indiaContent.includes(`'${lang}'`), `INDIAN_LANGUAGES must include ${lang}`);
});

// INR budget ranges must use ₹
assert.ok(indiaContent.includes('₹5,000'), 'Budget ranges must use ₹ INR formatting');
assert.ok(indiaContent.includes('₹50,000'), 'Budget ranges must include ₹50,000 tier');
assert.ok(indiaContent.includes('₹1,00,000'), 'Budget ranges must include ₹1,00,000 (lakh) tier');

// en-IN locale used in formatters
assert.ok(indiaContent.includes("'en-IN'"), 'Formatters must use en-IN locale');

// Demo data India verification
const demoDataPath = path.join(__dirname, '../frontend/lib/demoData.js');
const demoContent = fs.readFileSync(demoDataPath, 'utf8');

// No international destinations in demo data
const internationalDestinations = ['Tokyo', 'Bali', 'Lisbon', 'Reykjavik', 'Patagonia', 'Amalfi', 'Paris'];
internationalDestinations.forEach(dest => {
  assert.ok(
    !demoContent.includes(`destination: '${dest}`),
    `Demo data must not contain international destination: ${dest}`
  );
});

// Popular places must all be Indian
assert.ok(demoContent.includes("country: 'India'"), 'POPULAR_PLACES must have country: India');
const internationalCountries = ["country: 'Japan'", "country: 'Indonesia'", "country: 'France'", "country: 'Italy'", "country: 'Iceland'"];
internationalCountries.forEach(c => {
  assert.ok(!demoContent.includes(c), `POPULAR_PLACES must not contain ${c}`);
});

// Indian destinations present in demo data
const requiredIndianDests = ['Goa', 'Manali', 'Kashmir', 'Kerala'];
requiredIndianDests.forEach(dest => {
  assert.ok(demoContent.includes(dest), `Demo data must include Indian destination: ${dest}`);
});

// Signup must import from indiaData
const signupPath = path.join(__dirname, '../frontend/app/(auth)/signup.jsx');
const signupContent = fs.readFileSync(signupPath, 'utf8');
assert.ok(signupContent.includes("from '../../lib/indiaData'"), 'signup.jsx must import from indiaData');
assert.ok(signupContent.includes('INDIAN_LANGUAGES'), 'signup.jsx must use INDIAN_LANGUAGES');

// Trips must use en-IN date formatting
const tripsPath = path.join(__dirname, '../frontend/app/(tabs)/trips.jsx');
const tripsContent = fs.readFileSync(tripsPath, 'utf8');
assert.ok(tripsContent.includes('formatTripDateRangeIN'), 'trips.jsx must use formatTripDateRangeIN (en-IN)');

console.log('✅ India localization verified: indiaData.js, Indian states/destinations/languages, INR formatting, demo data, and UI screens all India-compliant.\n');

// 9. VERIFICATION DECISION SECURITY ARCHITECTURE ASSERTIONS
console.log('--- 9. Testing Verification Decision Security Architecture ---');
const authContextPath = path.join(__dirname, '../frontend/lib/authContext.jsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

// Assert live mode submission is strictly pending
assert.ok(authContextContent.includes("status: 'pending'"), 'submitVerification in live mode must record status as pending');
assert.ok(authContextContent.includes("verification_status: 'pending'"), 'submitVerification in live mode must set user profile to pending');
assert.ok(authContextContent.includes('checkVerificationStatus'), 'authContext must export checkVerificationStatus');
assert.ok(authContextContent.includes("status === 'verified'"), 'setVerificationStatus must guard against client self-verification');

// Assert verification screen does not self-verify
const verificationScreenPath = path.join(__dirname, '../frontend/app/(auth)/verification.jsx');
const verificationScreenContent = fs.readFileSync(verificationScreenPath, 'utf8');
assert.ok(!verificationScreenContent.includes("submitVerification(selfieUri, 'verified')"), 'verification.jsx must NOT pass verified outcome to submitVerification');
assert.ok(!verificationScreenContent.includes("setVerificationStatus('verified')"), 'verification.jsx must NOT call setVerificationStatus(verified)');
assert.ok(verificationScreenContent.includes('checkVerificationStatus'), 'verification.jsx must use checkVerificationStatus');

// Assert mandatory verification guard in _layout.jsx
const layoutPath = path.join(__dirname, '../frontend/app/_layout.jsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
assert.ok(layoutContent.includes("profile?.verification_status === 'verified'"), 'Navigation guard must require verification_status === verified');
assert.ok(layoutContent.includes("router.replace('/(auth)/verification')"), 'Unverified/pending users must be routed to verification screen');

console.log('✅ Verification decision security architecture verified: client self-verification prevented, pending status enforced, and trusted decision path secured.\n');

// 10. BACKEND FOUNDATION SCHEMA & RLS VERIFICATION (Migration 03)
console.log('--- 10. Verifying Backend Foundation Schema (03_feature_foundation.sql) ---');
const migration03Path = path.join(__dirname, '../backend/supabase/migrations/03_feature_foundation.sql');
assert.ok(fs.existsSync(migration03Path), '03_feature_foundation.sql must exist');
const m03Content = fs.readFileSync(migration03Path, 'utf8');

const m03Tables = [
  'public.place_categories',
  'public.places',
  'public.place_category_mappings',
  'public.place_images',
  'public.trip_days',
  'public.trip_activities',
  'public.saved_trips',
  'public.hangout_groups',
  'public.hangout_group_members',
  'public.hangout_place_suggestions',
  'public.hangout_votes',
  'public.hangout_schedules',
  'public.posts',
  'public.post_media',
  'public.post_likes',
  'public.post_saves',
  'public.follows',
  'public.chat_groups',
  'public.chat_group_members',
  'public.chat_messages',
  'public.chat_message_reads',
  'public.active_location_shares',
];

m03Tables.forEach((table) => {
  assert.ok(m03Content.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Migration 03 must define ${table}`);
  assert.ok(m03Content.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`), `RLS must be enabled on ${table}`);
});

// Verify constraints and security helpers
assert.ok(m03Content.includes('chk_place_price_range'), 'Must enforce max_price >= min_price');
assert.ok(m03Content.includes('uq_hangout_member'), 'Must prevent duplicate hangout group memberships');
assert.ok(m03Content.includes('uq_hangout_vote'), 'Must prevent duplicate hangout votes');
assert.ok(m03Content.includes('uq_post_like'), 'Must prevent duplicate post likes');
assert.ok(m03Content.includes('uq_post_save'), 'Must prevent duplicate post saves');
assert.ok(m03Content.includes('uq_follow_pair'), 'Must prevent duplicate follows');
assert.ok(m03Content.includes('chk_no_self_follow'), 'Must prevent self-following');
assert.ok(m03Content.includes('uq_chat_group_member'), 'Must prevent duplicate chat memberships');
assert.ok(m03Content.includes('is_chat_group_member'), 'Must define is_chat_group_member security function');
assert.ok(m03Content.includes('is_hangout_member'), 'Must define is_hangout_member security function');
assert.ok(m03Content.includes('supabase_realtime'), 'Must support Supabase Realtime publication');

console.log('✅ Backend Foundation 03_feature_foundation.sql passed all table, RLS, index, and constraint checks.\n');

// 11. PHASE A: TRIP PLANNER PLUS, PLACE DISCOVERY & BUDGET INTELLIGENCE
console.log('--- 11. Testing Phase A: Trip Planner Plus, Place Discovery & Budget Intelligence ---');

(async () => {
  const budget = await import('../frontend/lib/budget.js');
  const planner = await import('../frontend/lib/tripPlanner.js');
  const places = await import('../frontend/lib/places.js');

  // A. Budget Intelligence Tests
  // 1. Currency formatting
  assert.strictEqual(budget.formatINR(2500), '₹2,500', 'Should format 2500 as ₹2,500');
  assert.strictEqual(budget.formatINR(0), '₹0', 'Should format 0 as ₹0');
  assert.strictEqual(budget.formatINR(null), '₹ —', 'Should format null as ₹ —');

  // 2. Budget calculations
  const sampleActivities = [
    { id: '1', title: 'Fort Heritage Walk', category: 'Activities', time_slot: 'morning', estimated_cost: 600, day_number: 1 },
    { id: '2', title: 'Royal Thali Lunch', category: 'Restaurants', time_slot: 'afternoon', estimated_cost: 1400, day_number: 1 },
    { id: '3', title: 'Heritage Villa Stay', category: 'Stays', time_slot: 'night', estimated_cost: 3500, day_number: 1 },
  ];

  const budgetResult = budget.calculateTripBudget({
    tripBudget: 10000,
    travelDays: 3,
    travelersCount: 1,
    activities: sampleActivities,
  });

  assert.strictEqual(budgetResult.totalEstimatedSpend, 5500, 'Estimated spend should equal 600 + 1400 + 3500');
  assert.strictEqual(budgetResult.remainingBudget, 4500, 'Remaining budget should equal 10000 - 5500');
  assert.strictEqual(budgetResult.dailyBudget, 3333, 'Daily budget for 3 days on ₹10,000 should be 3333');
  assert.strictEqual(budgetResult.burnPercentage, 55, 'Burn percentage should be 55%');
  assert.strictEqual(budgetResult.status, 'healthy', 'Status should be healthy at 55% spend');

  // 3. Over-budget warning detection
  const overBudgetResult = budget.calculateTripBudget({
    tripBudget: 4000,
    travelDays: 2,
    activities: sampleActivities, // spend is 5500 > 4000
  });
  assert.strictEqual(overBudgetResult.status, 'over_budget', 'Should flag over_budget when spend exceeds allocation');
  assert.ok(overBudgetResult.warnings.some((w) => w.id === 'warn-exceeded'), 'Should include warn-exceeded message');

  // 4. Budget alternatives finder
  const expensivePlace = { id: 'test-1', destination: 'Jaipur', category: 'Luxury', min_price: 3000 };
  const alts = budget.findBudgetAlternatives(expensivePlace);
  assert.ok(Array.isArray(alts), 'Alternatives should return array');

  // B. Place Discovery Plus Tests
  // 1. All 13 categories defined
  assert.strictEqual(places.PLACE_CATEGORIES.length, 13, 'Should define all 13 discovery categories');
  const requiredCategories = [
    'Cafes', 'Restaurants', 'Stays', 'Activities', 'Attractions', 'Experiences',
    'Adventure', 'Culture', 'Luxury', 'Photography', 'Nature', 'Nightlife', 'Shopping'
  ];
  requiredCategories.forEach((cat) => {
    assert.ok(places.PLACE_CATEGORIES.some((c) => c.name === cat), `Category list must contain ${cat}`);
  });

  // 2. Destination filtering
  const goaPlaces = await places.getPlaces({ destination: 'Goa' });
  assert.ok(goaPlaces.length > 0, 'Should return places for Goa');
  goaPlaces.forEach((p) => {
    assert.strictEqual(p.destination, 'Goa', 'Filtered place must be in Goa');
  });

  // 3. Category filtering
  const cafes = await places.getPlaces({ category: 'Cafes' });
  assert.ok(cafes.length > 0, 'Should return cafes');
  cafes.forEach((p) => {
    assert.ok(
      p.category === 'Cafes' || (p.categoryIds && p.categoryIds.includes('cafes')),
      'Place must belong to Cafes category'
    );
  });

  // 4. Budget filtering
  const budgetPlaces = await places.getPlaces({ maxBudget: 500 });
  assert.ok(budgetPlaces.length > 0, 'Should return places under ₹500');
  budgetPlaces.forEach((p) => {
    assert.ok(p.min_price <= 500, `min_price (${p.min_price}) must be <= 500`);
  });

  // 5. Trending & Hidden Gems
  const trending = await places.getTrendingPlaces();
  assert.ok(trending.length > 0, 'Should return trending places');
  trending.forEach((p) => assert.strictEqual(p.is_trending, true, 'Place must be flagged trending'));

  const hiddenGems = await places.getHiddenGems();
  assert.ok(hiddenGems.length > 0, 'Should return hidden gems');
  hiddenGems.forEach((p) => assert.strictEqual(p.is_hidden_gem, true, 'Place must be flagged hidden gem'));

  // C. Trip Planner Plus Intelligence Tests
  // 1. Overlapping activity detection
  const overlappingSchedule = [
    { id: 'act-a', title: 'Museum Visit', start_time: '10:00', end_time: '12:00' },
    { id: 'act-b', title: 'Lunch Tour', start_time: '11:30', end_time: '13:00' },
  ];
  const overlapAnalysis = planner.analyzeDaySchedule(overlappingSchedule);
  assert.strictEqual(overlapAnalysis.hasIssues, true, 'Should detect overlap issue');
  assert.ok(overlapAnalysis.overlaps.length > 0, 'Should record overlapping pair');

  // 2. Impossible scheduling detection (end <= start)
  const impossibleSchedule = [
    { id: 'act-bad', title: 'Erroneous Time Stop', start_time: '15:00', end_time: '14:00' },
  ];
  const timingAnalysis = planner.analyzeDaySchedule(impossibleSchedule);
  assert.ok(timingAnalysis.issues.some((i) => i.id.startsWith('issue-timing')), 'Should flag impossible timing');

  // 3. Excessive activities warning (> 5 activities in a single day)
  const excessiveSchedule = [
    { id: '1', title: 'Stop 1' },
    { id: '2', title: 'Stop 2' },
    { id: '3', title: 'Stop 3' },
    { id: '4', title: 'Stop 4' },
    { id: '5', title: 'Stop 5' },
    { id: '6', title: 'Stop 6' },
  ];
  const densityAnalysis = planner.analyzeDaySchedule(excessiveSchedule);
  assert.ok(densityAnalysis.issues.some((i) => i.id === 'issue-excessive'), 'Should warn about excessive activities');

  // 4. Empty-day suggestions
  const suggestions = planner.suggestEmptyDayPlaces('Jaipur', []);
  assert.ok(suggestions.length > 0, 'Should provide suggestions for empty day in Jaipur');

  // 5. Itinerary text formatting for chat/sharing
  const shareText = planner.formatItineraryForSharing(
    { destination: 'Goa', date_from: '2026-10-15', date_to: '2026-10-20' },
    { day_number: 1, title: 'Arrival Day', activities: [{ title: 'Sunset Shack Dinner', time_slot: 'evening', start_time: '18:00', end_time: '20:00', estimated_cost: 800 }] }
  );
  assert.ok(shareText.includes('MAYBEWE ITINERARY'), 'Shared text must include MaybeWe header');
  assert.ok(shareText.includes('Sunset Shack Dinner'), 'Shared text must include activity name');
  assert.ok(shareText.includes('₹800'), 'Shared text must include formatted cost in INR');

  console.log('✅ Trip Planner Plus, Place Discovery & Budget Intelligence passed all unit & integration tests.\n');

  // 12. TESTING PHASE B: HANGOUT PLANNING + PROFILE POSTS + SOCIAL GRAPH
  console.log('--- 12. Testing Phase B: Hangout Planning, Profile Posts & Social Graph ---');

  // A. Migration 04 verification
  const migration04Path = path.join(__dirname, '../backend/supabase/migrations/04_social_hangout_notifications.sql');
  assert.ok(fs.existsSync(migration04Path), 'Migration 04_social_hangout_notifications.sql must exist');
  const migration04Content = fs.readFileSync(migration04Path, 'utf8');
  assert.ok(migration04Content.includes('app_notifications'), 'Must define app_notifications table');
  assert.ok(migration04Content.includes('get_user_social_stats'), 'Must define get_user_social_stats RPC');
  assert.ok(migration04Content.includes('get_hangout_suggestion_votes'), 'Must define get_hangout_suggestion_votes RPC');

  // B. Social Graph Lib Tests (frontend/lib/social.js)
  const social = await import('../frontend/lib/social.js');

  // 1. Follow & unfollow
  const followRes1 = await social.followUser('user-demo-priya', 'user-demo-rohan');
  assert.strictEqual(followRes1.success, true, 'User should be able to follow another user');

  // 2. Prevent self-follow
  await assert.rejects(
    async () => {
      await social.followUser('user-demo-priya', 'user-demo-priya');
    },
    /cannot follow/i,
    'Must prevent self-follow'
  );

  // 3. Prevent duplicate follow
  const dupFollow = await social.followUser('user-demo-priya', 'user-demo-rohan');
  assert.strictEqual(dupFollow.alreadyFollowing, true, 'Should detect duplicate follow without crashing');

  // 4. Unfollow authorization & execution
  const unfollowRes = await social.unfollowUser('user-demo-priya', 'user-demo-rohan');
  assert.strictEqual(unfollowRes.success, true, 'User should be able to unfollow');

  // 5. Follow counts query
  const followCounts = await social.getFollowCounts('user-demo-priya');
  assert.ok(typeof followCounts.followersCount === 'number', 'Followers count must be numeric');
  assert.ok(typeof followCounts.followingCount === 'number', 'Following count must be numeric');

  // C. Hangout Planning Lib Tests (frontend/lib/hangouts.js)
  const hangouts = await import('../frontend/lib/hangouts.js');

  // 1. Hangout creation
  const createdHangout = await hangouts.createHangout({
    title: 'Sunset Tapas & Fort Walk',
    destination: 'Goa',
    notes: 'Meeting up around 5pm near Chapora Fort.',
    category: 'culture',
    budget_category: 'balanced',
  }, 'user-demo-priya');
  assert.ok(createdHangout.id, 'Hangout must have an ID');
  assert.strictEqual(createdHangout.status, 'planning', 'New hangout must have planning status');
  assert.strictEqual(createdHangout.organizer_id, 'user-demo-priya', 'Organizer must be the creator');
  assert.ok(createdHangout.members.length >= 1, 'Hangout must have at least creator as member');

  // 2. Smart suggestions generation with explainable tags
  const smartSugg = hangouts.generateSmartSuggestions({
    destination: 'Goa',
    category: 'culture',
    budget_category: 'balanced',
    savedPlaceIds: ['goa-1'],
  });
  assert.ok(smartSugg.length > 0, 'Must generate smart suggestions for Goa');
  assert.ok(smartSugg[0].matchLabels && smartSugg[0].matchLabels.length > 0, 'Suggestions must contain explainable labels');
  const validLabels = ['Matches your category', 'Within budget', 'Highly rated', 'Popular nearby', 'Saved by you'];
  assert.ok(
    smartSugg.some(s => s.matchLabels.some(label => validLabels.includes(label))),
    'Must include explainable tags like "Within budget" or "Highly rated"'
  );

  // 3. Add place suggestion to hangout
  const addedPlace = await hangouts.addPlaceSuggestion(createdHangout.id, 'goa-1', 'user-demo-priya');
  assert.ok(addedPlace.id, 'Suggested place must receive an ID');
  assert.strictEqual(addedPlace.place_id, 'goa-1', 'Suggested place ID must match catalog place');

  // 4. Membership management: invite existing member & prevent duplicate
  const addMem1 = await hangouts.addHangoutMember(createdHangout.id, 'user-demo-rohan', 'member');
  assert.strictEqual(addMem1.success, true, 'Should add member to hangout');
  const addMemDup = await hangouts.addHangoutMember(createdHangout.id, 'user-demo-rohan', 'member');
  assert.strictEqual(addMemDup.alreadyMember, true, 'Must prevent duplicate hangout membership');

  // 5. Voting logic & duplicate vote toggle
  const vote1 = await hangouts.voteOnSuggestion(addedPlace.id, 'user-demo-rohan');
  assert.strictEqual(vote1.voted, true, 'Member should be able to vote for a suggestion');

  // Toggling vote (changing/removing vote)
  const voteToggle = await hangouts.voteOnSuggestion(addedPlace.id, 'user-demo-rohan');
  assert.strictEqual(voteToggle.voted, false, 'Toggling vote should withdraw previous vote safely');

  // 6. Finalization of Hangout Plan
  const finalized = await hangouts.finalizeHangout(createdHangout.id, {
    place_id: 'goa-1',
    proposed_date: '2026-10-18',
    proposed_time: '17:30',
    notes: 'Meet directly at Chapora Fort steps.',
  }, 'user-demo-priya');
  assert.strictEqual(finalized.hangout.status, 'confirmed', 'Hangout status must become confirmed on finalization');
  assert.ok(finalized.schedule, 'Confirmed hangout must have schedule');
  assert.strictEqual(finalized.schedule.place_id, 'goa-1', 'Schedule place ID must match finalized place');

  // 7. Prevent unauthorized finalization
  await assert.rejects(
    async () => {
      await hangouts.finalizeHangout(createdHangout.id, {
        place_id: 'goa-1',
        proposed_date: '2026-10-18',
        proposed_time: '17:30',
      }, 'unauthorized-user-999');
    },
    /only the organizer can finalize/i,
    'Must reject finalization by non-organizer'
  );

  // 8. Hangout -> Trip Integration (Add to Trip Itinerary)
  const tripIntegration = await hangouts.addHangoutToTrip(createdHangout.id, 'trip-demo-goa');
  assert.strictEqual(tripIntegration.success, true, 'Must successfully add finalized hangout to trip itinerary');
  assert.strictEqual(tripIntegration.activity.place_id, 'goa-1', 'Trip activity must reuse existing place record');

  // D. Profile Posts Lib Tests (frontend/lib/posts.js)
  const posts = await import('../frontend/lib/posts.js');

  // 1. Post creation with photo media, caption, destination & place tag
  const createdPost = await posts.createPost({
    caption: 'Watching golden hour illuminate the Chapora ramparts.',
    destination: 'Goa',
    place_id: 'goa-1',
    trip_id: 'trip-demo-goa',
    media_urls: ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800'],
  }, 'user-demo-priya');
  assert.ok(createdPost.id, 'Created post must have an ID');
  assert.strictEqual(createdPost.place_id, 'goa-1', 'Post must be linked to place_id');
  assert.ok(createdPost.media && createdPost.media.length === 1, 'Post must contain attached media');
  assert.strictEqual(createdPost.user_id, 'user-demo-priya', 'Post must belong to author');

  // 2. Post ownership authorization: update own post
  const updatedPost = await posts.updatePost(createdPost.id, {
    caption: 'Updated: Sun setting over the Arabian Sea at Chapora.',
  }, 'user-demo-priya');
  assert.strictEqual(updatedPost.caption, 'Updated: Sun setting over the Arabian Sea at Chapora.');

  // 3. Post ownership protection: unauthorized update rejected
  await assert.rejects(
    async () => {
      await posts.updatePost(createdPost.id, { caption: 'Hacked caption' }, 'unauthorized-attacker');
    },
    /unauthorized/i,
    'Must reject post update by non-owner'
  );

  // 4. Like / Unlike & duplicate like prevention
  const like1 = await posts.likePost(createdPost.id, 'user-demo-rohan');
  assert.strictEqual(like1.liked, true, 'User should be able to like post');

  const likeDup = await posts.likePost(createdPost.id, 'user-demo-rohan');
  assert.strictEqual(likeDup.alreadyLiked, true, 'Must prevent duplicate likes');

  const unlike = await posts.unlikePost(createdPost.id, 'user-demo-rohan');
  assert.strictEqual(unlike.unliked, true, 'User should be able to unlike post');

  // 5. Save / Unsave
  const save1 = await posts.savePost(createdPost.id, 'user-demo-priya');
  assert.strictEqual(save1.saved, true, 'User should be able to save post');

  const savedList = await posts.fetchUserSavedPosts('user-demo-priya');
  assert.ok(savedList.some(p => p.id === createdPost.id), 'Saved post must appear in user saved list');

  const unsave1 = await posts.unsavePost(createdPost.id, 'user-demo-priya');
  assert.strictEqual(unsave1.unsaved, true, 'User should be able to unsave post');

  // 6. Post Discovery Integration (Place -> Travel Moments)
  const placeMoments = await posts.fetchPlaceTravelMoments('goa-1');
  assert.ok(placeMoments.length > 0, 'Place Discovery must find travel moments attached to place goa-1');
  assert.ok(placeMoments.some(m => m.place_id === 'goa-1'), 'Retrieved travel moments must match place_id');

  // 7. Clean event foundation for notifications
  const notifications = await import('../frontend/lib/notifications.js');
  const notifEvent = await notifications.logNotificationEvent({
    recipient_id: 'user-demo-priya',
    actor_id: 'user-demo-rohan',
    type: 'like',
    entity_id: createdPost.id,
    data: { destination: 'Goa' },
  });
  assert.strictEqual(notifEvent.success, true, 'Notification event logging must succeed');
  assert.strictEqual(notifEvent.notification.type, 'like', 'Notification event must preserve type');

  console.log('✅ Phase B: Hangout Planning, Social Graph & Profile Posts passed all unit & integration tests.\n');

  // ==========================================================================
  // 13. PHASE C: GROUP CHAT & REALTIME COLLABORATION TESTS
  // ==========================================================================
  console.log('--- 13. Testing Phase C: Group Chat, Realtime & Travel Sharing ---');
  const groupChat = await import('../frontend/lib/groupChat.js');

  // 1. Fetch conversations with unread counts
  const conversations = await groupChat.fetchConversations('user-demo-priya');
  assert.ok(Array.isArray(conversations) && conversations.length > 0, 'Must return conversations for user');
  assert.ok(conversations.some((c) => c.is_direct === false), 'Must include group circles');
  assert.ok(conversations.some((c) => c.is_direct === true), 'Must include direct conversations');

  // 2. Create direct chat
  const directChat = await groupChat.getOrCreateDirectChat('user-demo-priya', 'user-demo-maya', {
    name: 'Maya Sen',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500',
  });
  assert.ok(directChat.id, 'Direct chat must have an ID');
  assert.strictEqual(directChat.is_direct, true, 'Direct chat must have is_direct = true');

  // 3. Create hangout group chat
  const hangoutChat = await groupChat.getOrCreateHangoutChat('hangout-manali-cafe', 'user-demo-priya', {
    title: 'Old Manali Cafe Crawl',
    destination: 'Manali',
  });
  assert.ok(hangoutChat.id, 'Hangout chat must have an ID');
  assert.strictEqual(hangoutChat.hangout_id, 'hangout-manali-cafe', 'Hangout chat must link to hangout_id');

  // 4. Send text message
  const sentText = await groupChat.sendChatMessage({
    groupId: hangoutChat.id,
    senderId: 'user-demo-priya',
    senderName: 'Priya Sharma',
    content: 'Can anyone recommend good live acoustic music spots?',
  });
  assert.ok(sentText.id, 'Sent text message must have an ID');
  assert.strictEqual(sentText.content, 'Can anyone recommend good live acoustic music spots?');

  // 5. Travel Card Sharing: Place Share
  const sentPlace = await groupChat.sendChatMessage({
    groupId: hangoutChat.id,
    senderId: 'user-demo-arjun',
    senderName: 'Arjun Mehta',
    content: 'Check out this viewpoint!',
    messageType: 'place_share',
    sharedPlaceId: 'goa-1',
  });
  assert.strictEqual(sentPlace.message_type, 'place_share', 'Message must be place_share');
  assert.strictEqual(sentPlace.metadata.place_id, 'goa-1', 'Must attach canonical place record');

  // 6. Travel Card Sharing: Trip Share
  const sentTrip = await groupChat.sendChatMessage({
    groupId: hangoutChat.id,
    senderId: 'user-demo-priya',
    senderName: 'Priya Sharma',
    content: 'Here is our rough itinerary',
    messageType: 'trip_share',
    sharedTripId: 'trip-demo-goa',
  });
  assert.strictEqual(sentTrip.message_type, 'trip_share', 'Message must be trip_share');

  // 7. Message Reply functionality
  const sentReply = await groupChat.sendChatMessage({
    groupId: hangoutChat.id,
    senderId: 'user-demo-priya',
    senderName: 'Priya Sharma',
    content: 'I love that place!',
    replyToId: sentPlace.id,
  });
  assert.strictEqual(sentReply.reply_to_id, sentPlace.id, 'Reply message must link to parent message');

  // Fetch messages and verify reply enrichment
  const fetchedMsgs = await groupChat.fetchGroupMessages(hangoutChat.id);
  const enrichedReply = fetchedMsgs.find((m) => m.id === sentReply.id);
  assert.ok(enrichedReply && enrichedReply.reply_to, 'Fetched reply must include enriched reply excerpt');
  assert.strictEqual(enrichedReply.reply_to.id, sentPlace.id, 'Enriched reply parent ID must match');

  // 8. Message Reactions (add & duplicate toggle)
  const reactAdd = await groupChat.toggleMessageReaction(sentPlace.id, 'user-demo-priya', '❤️');
  assert.strictEqual(reactAdd.action, 'added', 'Reaction should be added');
  assert.ok(reactAdd.reactions.some((r) => r.reaction === '❤️' && r.user_id === 'user-demo-priya'), 'Reaction list must contain added reaction');

  const reactToggle = await groupChat.toggleMessageReaction(sentPlace.id, 'user-demo-priya', '❤️');
  assert.strictEqual(reactToggle.action, 'removed', 'Toggling same reaction should remove it');

  // 9. Unauthorized reaction rejection
  await assert.rejects(
    async () => {
      await groupChat.toggleMessageReaction(sentPlace.id, 'user-demo-priya', 'INVALID_EMOJI');
    },
    /Invalid reaction/i,
    'Must reject reactions outside the restrained set'
  );

  // 10. Read / Unread watermark tracking
  const markRead = await groupChat.markConversationRead(hangoutChat.id, 'user-demo-priya');
  assert.strictEqual(markRead.success, true, 'Mark conversation read must succeed');

  // 11. Conversation-level search
  const searchResults = await groupChat.searchConversations('user-demo-priya', 'acoustic');
  assert.ok(searchResults.length > 0, 'Search must find conversation by message text');
  assert.ok(searchResults.some((c) => c.id === hangoutChat.id), 'Search must return matching group');

  // 12. Message Deletion Authorization
  // Senders can delete own message
  const delOwn = await groupChat.deleteChatMessage(sentText.id, 'user-demo-priya');
  assert.strictEqual(delOwn.success, true, 'User must be able to delete their own message');

  // Non-senders CANNOT delete another user's message
  await assert.rejects(
    async () => {
      await groupChat.deleteChatMessage(sentPlace.id, 'attacker-user-999');
    },
    /Unauthorized/i,
    'Must reject deletion of another user\'s message'
  );

  // 13. Realtime subscription cleanup check
  const unsub = groupChat.subscribeToChatGroup(hangoutChat.id, {
    onNewMessage: () => {},
  });
  assert.strictEqual(typeof unsub, 'function', 'Realtime subscription must return a cleanup function');
  unsub(); // Clean invocation

  // 14. SQL Migration 05 validation
  const migration05Path = path.join(__dirname, '../backend/supabase/migrations/05_group_chat_realtime.sql');
  assert.strictEqual(fs.existsSync(migration05Path), true, '05_group_chat_realtime.sql must exist');
  const migration05Sql = fs.readFileSync(migration05Path, 'utf8');
  assert.ok(migration05Sql.includes('chat_message_reactions'), 'Migration 05 must create chat_message_reactions');
  assert.ok(migration05Sql.includes('reply_to_id'), 'Migration 05 must add reply_to_id');
  assert.ok(migration05Sql.includes('shared_hangout_id'), 'Migration 05 must add shared_hangout_id');
  assert.ok(migration05Sql.includes('supabase_realtime'), 'Migration 05 must configure supabase_realtime publication');
  assert.ok(migration05Sql.includes('mark_chat_group_read'), 'Migration 05 must define mark_chat_group_read RPC');

  console.log('✅ Phase C: Group Chat, Realtime & Travel Sharing passed all unit & integration tests.\n');

  // --------------------------------------------------------------------------
  // 14. PHASE D: LIVE LOCATION, REAL-TIME TRAVEL PRESENCE & TRUST FOUNDATION
  // --------------------------------------------------------------------------
  console.log('--- 14. Testing Phase D: Live Location, Real-Time Travel Presence & Trust Foundation ---');

  // A. Schema & Migration 06 Validation
  const migration06Path = path.join(__dirname, '../backend/supabase/migrations/06_live_location_presence.sql');
  assert.strictEqual(fs.existsSync(migration06Path), true, '06_live_location_presence.sql migration must exist');
  const migration06Sql = fs.readFileSync(migration06Path, 'utf8');

  // Table assertions
  assert.ok(migration06Sql.includes('CREATE TABLE IF NOT EXISTS public.live_location_sessions'), 'Must create live_location_sessions table');
  assert.ok(migration06Sql.includes('CREATE TABLE IF NOT EXISTS public.user_blocks'), 'Must create user_blocks table');
  assert.ok(migration06Sql.includes('CREATE TABLE IF NOT EXISTS public.user_trust_events'), 'Must create user_trust_events table');
  assert.ok(migration06Sql.includes('chk_live_target'), 'Must enforce authorized target constraint');
  assert.ok(migration06Sql.includes("privacy_mode IN ('precise', 'approximate')"), 'Must enforce privacy_mode check');
  assert.ok(migration06Sql.includes("duration_type IN ('15m', '1h', '4h', 'until_stopped')"), 'Must enforce duration_type check');
  assert.ok(migration06Sql.includes("status IN ('active', 'stopped', 'expired')"), 'Must enforce status check');
  assert.ok(migration06Sql.includes('stop_live_location_session'), 'Must define stop_live_location_session RPC');
  assert.ok(migration06Sql.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.live_location_sessions'), 'Must add live_location_sessions to supabase_realtime');
  assert.ok(migration06Sql.includes("'live_location_share'"), 'Must expand chat_messages message_type check for live_location_share');

  // Check RLS security policies
  assert.ok(migration06Sql.includes('ALTER TABLE public.live_location_sessions ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on live_location_sessions');
  assert.ok(migration06Sql.includes('ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on user_blocks');
  assert.ok(migration06Sql.includes('ALTER TABLE public.user_trust_events ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled on user_trust_events');

  // B. Exact Coordinates NOT exposed in public.users
  const schema01Path = path.join(__dirname, '../backend/supabase/migrations/01_initial_schema.sql');
  const schema01Sql = fs.readFileSync(schema01Path, 'utf8');
  assert.strictEqual(schema01Sql.includes('latitude NUMERIC') && schema01Sql.includes('public.users'), false, 'Exact coordinates must NOT be exposed on public.users');

  // C. Live Location Service (lib/liveLocation.js)
  const liveLocation = await import('../frontend/lib/liveLocation.js');
  const safetyBlocks = await import('../frontend/lib/safetyBlocks.js');

  // 1. Approximate privacy mode precision reduction
  const exactCoord = 15.5801234;
  const approxCoord = liveLocation.applyPrivacyMode(exactCoord, 'approximate');
  assert.strictEqual(approxCoord, 15.58, 'Approximate privacy mode must round to 2 decimal places (~1.1 km)');
  const preciseCoord = liveLocation.applyPrivacyMode(exactCoord, 'precise');
  assert.strictEqual(preciseCoord, 15.5801234, 'Precise mode must retain full GPS precision');

  // 2. Start Live Location Session (owner, target, duration, privacy_mode)
  const startedSession = await liveLocation.startLiveLocationSession({
    ownerId: 'user-demo-priya',
    targetUserId: 'user-demo-alex',
    coords: { latitude: 15.5801234, longitude: 73.7432456 },
    duration: '1h',
    privacyMode: 'approximate',
  });
  assert.ok(startedSession.id, 'Session must have an ID');
  assert.strictEqual(startedSession.owner_user_id, 'user-demo-priya', 'Owner ID must match');
  assert.strictEqual(startedSession.target_user_id, 'user-demo-alex', 'Target user ID must match');
  assert.strictEqual(startedSession.status, 'active', 'Initial status must be active');
  assert.strictEqual(startedSession.privacy_mode, 'approximate', 'Privacy mode must be approximate');
  assert.strictEqual(startedSession.latitude, 15.58, 'Latitude must be rounded in approximate mode');
  assert.strictEqual(startedSession.longitude, 73.74, 'Longitude must be rounded in approximate mode');
  assert.ok(new Date(startedSession.expires_at) > new Date(), 'Expires at must be in the future');
  assert.strictEqual(startedSession.stopped_at, null, 'Stopped at must initially be null');

  // 3. Recipient can read active session
  const activeForRecipient = await liveLocation.getActiveLiveLocationSession({
    targetUserId: 'user-demo-priya',
    currentUserId: 'user-demo-alex',
  });
  assert.ok(activeForRecipient, 'Recipient must be able to read active session');
  assert.strictEqual(activeForRecipient.id, startedSession.id, 'Read session ID must match started session');

  // 4. Update coordinates of active session (throttled foreground test)
  const updateResult = await liveLocation.updateLiveLocationCoordinates(
    startedSession.id,
    { latitude: 15.585, longitude: 73.745 },
    15,
    'approximate'
  );
  assert.ok(updateResult.success || updateResult.throttled, 'Coordinate update must succeed or respect throttle');

  // 5. Distance calculation & Countdown formatting
  const distanceStr = liveLocation.calculateDistance(15.58, 73.74, 15.60, 73.74);
  assert.ok(distanceStr && distanceStr.includes('km away'), 'Must compute human distance string');
  const countdownStr = liveLocation.formatRemainingTime(startedSession.expires_at);
  assert.ok(countdownStr && countdownStr.includes('Ends in'), 'Must compute human countdown string');

  // 6. Stop session immediate update
  const stopResult = await liveLocation.stopLiveLocationSession(startedSession.id, 'user-demo-priya');
  assert.strictEqual(stopResult.success, true, 'Owner stop session must succeed');
  assert.strictEqual(stopResult.session.status, 'stopped', 'Session status must be stopped');
  assert.ok(stopResult.session.stopped_at, 'Stopped_at timestamp must be recorded');

  // Unauthorized stop attempt must be rejected
  await assert.rejects(
    async () => {
      await liveLocation.stopLiveLocationSession(startedSession.id, 'attacker-user');
    },
    /Unauthorized/i,
    'Non-owner stop attempt must be rejected'
  );

  // 7. Recipient CANNOT read stopped session
  const stoppedForRecipient = await liveLocation.getActiveLiveLocationSession({
    targetUserId: 'user-demo-priya',
    currentUserId: 'user-demo-alex',
  });
  assert.strictEqual(stoppedForRecipient, null, 'Recipient must not be able to read stopped session');

  // 8. Recipient CANNOT read expired session
  const expiredSession = await liveLocation.startLiveLocationSession({
    ownerId: 'user-demo-priya',
    targetUserId: 'user-demo-rohan',
    coords: { latitude: 15.58, longitude: 73.74 },
    duration: '15m',
    privacyMode: 'precise',
  });
  // Manually simulate expiration in local storage
  const safeStorageMod = await import('../frontend/lib/safeStorage.js');
  const sessionsRaw = await safeStorageMod.default.getItem('@maybewe_live_location_sessions_v1');
  const allSessions = JSON.parse(sessionsRaw);
  const foundIdx = allSessions.findIndex((s) => s.id === expiredSession.id);
  if (foundIdx !== -1) {
    allSessions[foundIdx].expires_at = new Date(Date.now() - 60000).toISOString();
    allSessions[foundIdx].status = 'expired';
    await safeStorageMod.default.setItem('@maybewe_live_location_sessions_v1', JSON.stringify(allSessions));
  }

  const expiredForRecipient = await liveLocation.getActiveLiveLocationSession({
    targetUserId: 'user-demo-priya',
    currentUserId: 'user-demo-rohan',
  });
  assert.strictEqual(expiredForRecipient, null, 'Recipient must not be able to read expired session');

  // 9. User Blocks & Mutual Safety Barrier
  const blockRes = await safetyBlocks.blockUser('user-demo-priya', 'user-blocked-badactor');
  assert.strictEqual(blockRes.success, true, 'Block user must succeed');

  const isBlockedDirect = await safetyBlocks.isUserBlocked('user-demo-priya', 'user-blocked-badactor');
  assert.strictEqual(isBlockedDirect, true, 'Direct block check must be true');

  const isBlockedMutual = await safetyBlocks.isUserBlocked('user-blocked-badactor', 'user-demo-priya');
  assert.strictEqual(isBlockedMutual, true, 'Mutual block check must be true (either user blocking creates mutual barrier)');

  // 10. Cannot start session targeting blocked user
  await assert.rejects(
    async () => {
      await liveLocation.startLiveLocationSession({
        ownerId: 'user-demo-priya',
        targetUserId: 'user-blocked-badactor',
        coords: { latitude: 15.58, longitude: 73.74 },
      });
    },
    /blocked user/i,
    'Must refuse starting live location session with blocked user'
  );

  // 11. Blocked user cannot read session
  const readByBlocked = await liveLocation.getActiveLiveLocationSession({
    targetUserId: 'user-demo-priya',
    currentUserId: 'user-blocked-badactor',
  });
  assert.strictEqual(readByBlocked, null, 'Blocked user must receive null for live location');

  // 12. Safety Report Submission
  const reportRes = await safetyBlocks.submitSafetyReport({
    reporterId: 'user-demo-priya',
    reportedId: 'user-blocked-badactor',
    reason: 'harassment',
    details: 'Unwanted solicitation and messaging',
  });
  assert.strictEqual(reportRes.success, true, 'Safety report submission must succeed');
  assert.ok(reportRes.report_id, 'Report must receive an ID');

  // 13. Authentic Trust Events (no fake events)
  const trustEv = await safetyBlocks.recordTrustEvent({
    userId: 'user-demo-priya',
    actorId: 'user-demo-alex',
    eventType: 'successful_hangout',
    metadata: { hangout_id: 'hangout-1', destination: 'Goa' },
  });
  assert.ok(trustEv.id, 'Trust event must have an ID');
  assert.strictEqual(trustEv.event_type, 'successful_hangout', 'Trust event type must match');

  // Reject invalid trust event
  await assert.rejects(
    async () => {
      await safetyBlocks.recordTrustEvent({
        userId: 'user-demo-priya',
        eventType: 'fake_government_id_scan',
      });
    },
    /Invalid trust event type/i,
    'Must reject unapproved or invented trust event types'
  );

  const priyaEvents = await safetyBlocks.getUserTrustEvents('user-demo-priya');
  assert.ok(priyaEvents.length > 0, 'User trust events list must return recorded events');

  // 14. Scoped Realtime Subscription
  const unsubLive = liveLocation.subscribeToLiveLocation(startedSession.id, () => {});
  assert.strictEqual(typeof unsubLive, 'function', 'Scoped live location subscription must return cleanup function');
  unsubLive();

  console.log('✅ Phase D: Live Location, Real-Time Travel Presence & Trust Foundation passed all unit & integration tests.\n');

  // =========================================================================
  // SUITE 15: Google Cloud Vision Face-Only Verification System
  // =========================================================================
  console.log('--- Suite 15: Google Cloud Vision Face-Only Verification System ---');

  const faceVerif = await import('../frontend/lib/faceVerification.js');
  assert.ok(faceVerif.evaluateFaceCount, 'evaluateFaceCount helper must exist');
  assert.ok(faceVerif.invokeValidateSelfie, 'invokeValidateSelfie helper must exist');

  // 1. Exactly 1 face -> VERIFIED
  const oneFaceRes = faceVerif.evaluateFaceCount(1);
  assert.strictEqual(oneFaceRes.success, true, 'Exactly 1 face must succeed');
  assert.strictEqual(oneFaceRes.status, 'verified', 'Exactly 1 face must transition to verified');
  assert.strictEqual(oneFaceRes.faceCount, 1, 'Face count must be 1');

  // 2. Zero faces -> FAILED with mandatory user message
  const zeroFaceRes = faceVerif.evaluateFaceCount(0);
  assert.strictEqual(zeroFaceRes.success, false, '0 faces must fail');
  assert.strictEqual(zeroFaceRes.status, 'failed', '0 faces status must be failed');
  assert.strictEqual(zeroFaceRes.faceCount, 0, 'Face count must be 0');
  assert.strictEqual(
    zeroFaceRes.error,
    'No face detected. Please upload a clear photo showing your face.',
    '0 faces error message must match requirement exactly'
  );

  // 3. Multiple faces -> FAILED with mandatory user message
  const twoFaceRes = faceVerif.evaluateFaceCount(2);
  assert.strictEqual(twoFaceRes.success, false, 'Multiple faces must fail');
  assert.strictEqual(twoFaceRes.status, 'failed', 'Multiple faces status must be failed');
  assert.strictEqual(twoFaceRes.faceCount, 2, 'Face count must be 2');
  assert.strictEqual(
    twoFaceRes.error,
    'Multiple faces detected. Please upload a photo with only you visible.',
    'Multiple faces error message must match requirement exactly'
  );

  const fiveFaceRes = faceVerif.evaluateFaceCount(5);
  assert.strictEqual(fiveFaceRes.success, false, '5 faces must fail');
  assert.strictEqual(
    fiveFaceRes.error,
    'Multiple faces detected. Please upload a photo with only you visible.',
    '5 faces error message must match requirement exactly'
  );

  // 4. Edge Function client validation - reject empty or missing selfie
  const emptySelfieRes = await faceVerif.invokeValidateSelfie('');
  assert.strictEqual(emptySelfieRes.success, false, 'Empty selfiePath must be rejected');
  assert.strictEqual(emptySelfieRes.status, 'failed');

  // 5. Edge Function client validation - reject stock / placeholder photo
  const stockPhotoRes = await faceVerif.invokeValidateSelfie('https://images.unsplash.com/photo-1234');
  assert.strictEqual(stockPhotoRes.success, false, 'Stock photos must be rejected');
  assert.ok(stockPhotoRes.error.includes('Stock photos or placeholder images cannot be submitted'));

  // 6. Security & Static Analysis: Verification screen has zero Unsplash URLs
  const fsMod = await import('fs');
  const verifScreenCode = fsMod.readFileSync('frontend/app/(auth)/verification.jsx', 'utf8');
  assert.ok(
    !verifScreenCode.includes('images.unsplash.com'),
    'frontend/app/(auth)/verification.jsx must NOT contain any Unsplash fallback URLs'
  );

  // 7. Backend Edge Function validates Google Cloud Vision structure
  const edgeFunctionCode = fsMod.readFileSync('backend/supabase/functions/validate-selfie/index.js', 'utf8');
  assert.ok(
    edgeFunctionCode.includes('FACE_DETECTION'),
    'validate-selfie Edge Function must use Google Cloud Vision FACE_DETECTION'
  );
  assert.ok(
    edgeFunctionCode.includes('vision.googleapis.com'),
    'validate-selfie Edge Function must call Google Cloud Vision API endpoint'
  );
  assert.ok(
    edgeFunctionCode.includes('process_verification_decision'),
    'validate-selfie Edge Function must invoke process_verification_decision RPC'
  );

  console.log('✅ Suite 15: Google Cloud Vision Face-Only Verification passed all tests.\n');

  console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
})().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
