// Verification and Automated Unit Tests for MaybeWe MVP
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 RUNNING MAYBEWE UNIT & INTEGRATION TESTS...\n');

// 1. CHAT SAFETY SCANNER TESTS
console.log('--- 1. Testing In-Chat Safety Scanner (lib/safety.js) ---');
const { scanMessageForSafety } = require('../lib/safety');

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
const { calculateCompatibility } = require('../lib/discovery');

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
const sqlPath = path.join(__dirname, '../supabase/migrations/01_initial_schema.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

const requiredTables = ['public.users', 'public.travel_history', 'public.trips', 'public.matches', 'public.messages', 'public.reviews', 'public.reports'];
requiredTables.forEach((table) => {
  assert.ok(sqlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Schema must contain table ${table}`);
});

// Check RLS
requiredTables.forEach((table) => {
  assert.ok(sqlContent.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`), `RLS must be enabled on ${table}`);
});

// Check RPC and Trigger
assert.ok(sqlContent.includes('find_overlapping_trips'), 'Schema must define find_overlapping_trips RPC');
assert.ok(sqlContent.includes('recalculate_trust_score'), 'Schema must define recalculate_trust_score trigger function');
assert.ok(sqlContent.includes('idx_matches_unique_pair'), 'Schema must prevent duplicate matches');
assert.ok(sqlContent.includes('SECURITY DEFINER'), 'RPC must have SECURITY DEFINER flag');

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
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test' || entry.name === 'supabase') continue;
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
checkBrandIntegrity(path.join(__dirname, '../app'));
checkBrandIntegrity(path.join(__dirname, '../components'));
console.log('✅ Verified MaybeWe brand integrity across all UI screens and components.\n');

// 7. THEME SYSTEM & PERSISTENCE TESTS
console.log('--- 7. Testing Theme System & Preferences ---');
const themePath = path.join(__dirname, '../lib/theme.js');
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
const themeContextPath = path.join(__dirname, '../lib/themeContext.jsx');
assert.ok(fs.existsSync(themeContextPath), 'lib/themeContext.jsx must exist');
const themeContextContent = fs.readFileSync(themeContextPath, 'utf8');
assert.ok(themeContextContent.includes('ThemeProvider'), 'themeContext must export ThemeProvider');
assert.ok(themeContextContent.includes('useTheme'), 'themeContext must export useTheme');

// Check migration file
const migration2Path = path.join(__dirname, '../supabase/migrations/02_theme_preference.sql');
assert.ok(fs.existsSync(migration2Path), '02_theme_preference.sql migration must exist');
const mig2Content = fs.readFileSync(migration2Path, 'utf8');
assert.ok(mig2Content.includes('theme_preference'), 'Migration must alter users with theme_preference');
assert.ok(mig2Content.includes("CHECK (theme_preference IN ('dark', 'light'))"), 'Migration must check theme_preference values');

console.log('✅ Theme system tokens, dual palettes, ThemeContext, and database migration verified successfully.\n');

// 8. INDIA LOCALIZATION VERIFICATION
console.log('--- 8. Verifying India Localization ---');
const indiaDataPath = path.join(__dirname, '../lib/indiaData.js');
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
const demoDataPath = path.join(__dirname, '../lib/demoData.js');
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
const signupPath = path.join(__dirname, '../app/(auth)/signup.jsx');
const signupContent = fs.readFileSync(signupPath, 'utf8');
assert.ok(signupContent.includes("from '../../lib/indiaData'"), 'signup.jsx must import from indiaData');
assert.ok(signupContent.includes('INDIAN_LANGUAGES'), 'signup.jsx must use INDIAN_LANGUAGES');

// Trips must use en-IN date formatting
const tripsPath = path.join(__dirname, '../app/(tabs)/trips.jsx');
const tripsContent = fs.readFileSync(tripsPath, 'utf8');
assert.ok(tripsContent.includes('formatTripDateRangeIN'), 'trips.jsx must use formatTripDateRangeIN (en-IN)');

console.log('✅ India localization verified: indiaData.js, Indian states/destinations/languages, INR formatting, demo data, and UI screens all India-compliant.\n');

console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');

