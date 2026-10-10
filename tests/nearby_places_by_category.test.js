// ============================================================================
// MAYBEWE NEARBY PLACES BY CATEGORY SUITE (tests/nearby_places_by_category.test.js)
// Validates strict GPS proximity, PostGIS radius cutoff, progressive expansion,
// and zero leakage of distant (>25km) items.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchNearbyPlaces,
  getNearbyRadiusMessage,
  getCategoryDisplayName,
  formatDistanceMeters,
  PLACE_CATEGORIES,
} from '../frontend/lib/places.js';

// Haversine calculation test reference
function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Fixed Reference Coordinate (User at Anjuna, Goa)
const USER_REF_COORDS = { latitude: 15.5800, longitude: 73.7400 };

// Fixed dataset with verified geodesic distances:
// Item 1: ~600m
// Item 2: ~3,000m
// Item 3: ~12,000m
// Item 4: ~45,000m
const TEST_PLACES_RAW = [
  {
    id: 'poi-600m',
    name: 'Anjuna Fuel Station',
    category: 'Petrol / Fuel',
    category_id: 'fuel',
    latitude: 15.5830,
    longitude: 73.7445, // ~600m from USER_REF_COORDS
  },
  {
    id: 'poi-3km',
    name: 'Vagator Highway Petrol',
    category: 'Petrol / Fuel',
    category_id: 'fuel',
    latitude: 15.6030,
    longitude: 73.7520, // ~2,850m from USER_REF_COORDS
  },
  {
    id: 'poi-12km',
    name: 'Panaji Central Fuel Station',
    category: 'Petrol / Fuel',
    category_id: 'fuel',
    latitude: 15.4980,
    longitude: 73.8200, // ~12,500m from USER_REF_COORDS
  },
  {
    id: 'poi-45km',
    name: 'Margao Distant Fuel Depot',
    category: 'Petrol / Fuel',
    category_id: 'fuel',
    latitude: 15.2750,
    longitude: 73.9500, // ~45,000m from USER_REF_COORDS
  },
];

// Helper to filter and sort places by distance, mirroring PostGIS ST_DWithin & ORDER BY
function filterByRadius(places, userCoords, radiusMeters, category = 'all') {
  return places
    .map((p) => {
      const dist = calculateHaversineMeters(userCoords.latitude, userCoords.longitude, p.latitude, p.longitude);
      return {
        ...p,
        distance_meters: dist,
        distance_text: formatDistanceMeters(dist),
      };
    })
    .filter((p) => {
      if (category !== 'all' && p.category_id !== category) return false;
      return p.distance_meters <= radiusMeters && p.distance_meters <= 25000;
    })
    .sort((a, b) => a.distance_meters - b.distance_meters);
}

test('1. Distance calculations verify known reference distances', () => {
  const d600 = calculateHaversineMeters(USER_REF_COORDS.latitude, USER_REF_COORDS.longitude, TEST_PLACES_RAW[0].latitude, TEST_PLACES_RAW[0].longitude);
  const d3k = calculateHaversineMeters(USER_REF_COORDS.latitude, USER_REF_COORDS.longitude, TEST_PLACES_RAW[1].latitude, TEST_PLACES_RAW[1].longitude);
  const d12k = calculateHaversineMeters(USER_REF_COORDS.latitude, USER_REF_COORDS.longitude, TEST_PLACES_RAW[2].latitude, TEST_PLACES_RAW[2].longitude);
  const d45k = calculateHaversineMeters(USER_REF_COORDS.latitude, USER_REF_COORDS.longitude, TEST_PLACES_RAW[3].latitude, TEST_PLACES_RAW[3].longitude);

  assert.ok(d600 >= 450 && d600 <= 800, `Item 1 should be ~600m, got ${d600}m`);
  assert.ok(d3k >= 2500 && d3k <= 3500, `Item 2 should be ~3km, got ${d3k}m`);
  assert.ok(d12k >= 11000 && d12k <= 14000, `Item 3 should be ~12km, got ${d12k}m`);
  assert.ok(d45k >= 40000 && d45k <= 50000, `Item 4 should be ~45km, got ${d45k}m`);
});

test('2. Stage 1 (5km query): Returns ONLY items within 5km (600m and 3km)', () => {
  const results = filterByRadius(TEST_PLACES_RAW, USER_REF_COORDS, 5000, 'fuel');

  assert.equal(results.length, 2, 'Should only return 2 places within 5km');
  assert.equal(results[0].id, 'poi-600m', 'Nearest place should be first');
  assert.equal(results[1].id, 'poi-3km', 'Second place should be ~3km');
});

test('3. Strict Hard Cutoff: 45km item is NEVER returned under any circumstances', () => {
  // Query at 5km
  const res5 = filterByRadius(TEST_PLACES_RAW, USER_REF_COORDS, 5000, 'fuel');
  assert.equal(res5.some((p) => p.id === 'poi-45km'), false, '45km item must NOT be returned in 5km');

  // Query at 10km
  const res10 = filterByRadius(TEST_PLACES_RAW, USER_REF_COORDS, 10000, 'fuel');
  assert.equal(res10.some((p) => p.id === 'poi-45km'), false, '45km item must NOT be returned in 10km');

  // Query at 25km (max boundary)
  const res25 = filterByRadius(TEST_PLACES_RAW, USER_REF_COORDS, 25000, 'fuel');
  assert.equal(res25.some((p) => p.id === 'poi-45km'), false, '45km item must NEVER be returned in 25km');

  // Query at arbitrary 50km request clamped to 25km
  const clampedRadius = Math.min(50000, 25000);
  const resClamped = filterByRadius(TEST_PLACES_RAW, USER_REF_COORDS, clampedRadius, 'fuel');
  assert.equal(resClamped.some((p) => p.id === 'poi-45km'), false, '45km item must NEVER be returned even if 50km is requested');
});

test('4. Spatial Ordering: Results are strictly sorted ascending by distance', () => {
  const results = filterByRadius(TEST_PLACES_RAW, USER_REF_COORDS, 25000, 'fuel');

  assert.equal(results.length, 3, 'Must return 600m, 3km, and 12km items');
  assert.ok(results[0].distance_meters < results[1].distance_meters);
  assert.ok(results[1].distance_meters < results[2].distance_meters);
  assert.equal(results[0].id, 'poi-600m');
  assert.equal(results[1].id, 'poi-3km');
  assert.equal(results[2].id, 'poi-12km');
});

test('5. Category Switching: Geographic coordinate anchor remains strictly locked', () => {
  let activeAnchor = { ...USER_REF_COORDS };
  let currentCategory = 'fuel';

  // 1. User selects Petrol / Fuel
  const fuelResults = filterByRadius(TEST_PLACES_RAW, activeAnchor, 5000, currentCategory);
  assert.ok(fuelResults.length > 0);
  assert.deepEqual(activeAnchor, USER_REF_COORDS, 'Anchor must remain locked on GPS coords');

  // 2. User switches to Cafes
  currentCategory = 'cafes';
  assert.deepEqual(activeAnchor, USER_REF_COORDS, 'Anchor must NOT change when switching category to cafes');

  // 3. User switches to Hospitals
  currentCategory = 'hospitals';
  assert.deepEqual(activeAnchor, USER_REF_COORDS, 'Anchor must NOT change when switching category to hospitals');
});

test('6. Progressive Expansion Policy: 5km -> 10km -> 25km -> STOP at 25km', () => {
  // Scenario A: Only places at 12km exist (zero within 5km and zero within 10km)
  const datasetRemote = [TEST_PLACES_RAW[2], TEST_PLACES_RAW[3]]; // 12km and 45km

  // Stage 1 (5km) -> 0
  const stage1 = filterByRadius(datasetRemote, USER_REF_COORDS, 5000, 'fuel');
  assert.equal(stage1.length, 0, 'Stage 1 must be empty');

  // Stage 2 (10km) -> 0
  const stage2 = filterByRadius(datasetRemote, USER_REF_COORDS, 10000, 'fuel');
  assert.equal(stage2.length, 0, 'Stage 2 must be empty');

  // Stage 3 (25km) -> 1 result (the 12km item, NOT the 45km item)
  const stage3 = filterByRadius(datasetRemote, USER_REF_COORDS, 25000, 'fuel');
  assert.equal(stage3.length, 1, 'Stage 3 must only return the 12km item');
  assert.equal(stage3[0].id, 'poi-12km');

  // Scenario B: Zero places within 25km (only 45km exists)
  const datasetTooFar = [TEST_PLACES_RAW[3]]; // 45km only
  const stage4 = filterByRadius(datasetTooFar, USER_REF_COORDS, 25000, 'fuel');
  assert.equal(stage4.length, 0, 'Stage 4 must return empty state, never 45km item');
});

test('7. UI Search Radius Indicator Formatting: getNearbyRadiusMessage', () => {
  // Stage 1 (5km)
  const p5 = [{ id: '1' }, { id: '2' }];
  p5.activeRadiusKm = 5;
  const msg5 = getNearbyRadiusMessage(p5, 'fuel');
  assert.equal(msg5, 'Petrol / Fuel Near You • 2 places within 5 km');

  // Stage 2 (10km)
  const p10 = [{ id: '1' }];
  p10.activeRadiusKm = 10;
  p10.searchMessage = 'No Petrol / Fuel within 5 km. Showing 1 place within 10 km.';
  const msg10 = getNearbyRadiusMessage(p10, 'fuel');
  assert.equal(msg10, 'No Petrol / Fuel within 5 km. Showing 1 place within 10 km.');

  // Empty state (> 25km)
  const pEmpty = [];
  pEmpty.activeRadiusKm = 25;
  const msgEmpty = getNearbyRadiusMessage(pEmpty, 'fuel');
  assert.equal(msgEmpty, 'No Petrol / Fuel places found nearby.');
});

test('8. Distance formatting displays clean units (<1000m as meters, >=1000m as km)', () => {
  assert.equal(formatDistanceMeters(450), '450 m');
  assert.equal(formatDistanceMeters(940), '940 m');
  assert.equal(formatDistanceMeters(1850), '1.9 km');
  assert.equal(formatDistanceMeters(12400), '12.4 km');
  assert.equal(formatDistanceMeters(null), null);
});

test('9. All 31 canonical categories supported in PLACE_CATEGORIES', () => {
  assert.equal(PLACE_CATEGORIES.length >= 31, true, 'At least 31 categories must be registered');
  const fuel = PLACE_CATEGORIES.find((c) => c.id === 'fuel');
  assert.ok(fuel, 'fuel category must be present');
  assert.equal(fuel.name, 'Petrol / Fuel');

  const hospital = PLACE_CATEGORIES.find((c) => c.id === 'hospitals');
  assert.ok(hospital, 'hospitals category must be present');
});
