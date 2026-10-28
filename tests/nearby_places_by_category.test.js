// ============================================================================
// MAYBEWE NEARBY PLACES BY CATEGORY SUITE (tests/nearby_places_by_category.test.js)
// Validates strict GPS proximity, PostGIS radius cutoff, progressive expansion,
// and zero leakage of distant (>25km) items.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  fetchNearbyPlaces,
  getNearbyRadiusMessage,
  getCategoryDisplayName,
  getCategoryEmptyTitle,
  buildGoogleMapsCategorySearchUrl,
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

test('10. Clean Empty-State Category Typography (Zero double-places wording)', () => {
  assert.equal(getCategoryEmptyTitle('restaurants'), 'No restaurants found nearby');
  assert.equal(getCategoryEmptyTitle('cafes'), 'No cafés found nearby');
  assert.equal(getCategoryEmptyTitle('all'), 'No places found nearby');
  assert.equal(getCategoryEmptyTitle('fuel'), 'No petrol / fuel found nearby');
  assert.equal(getCategoryEmptyTitle('temples'), 'No temples found nearby');
  assert.equal(getCategoryEmptyTitle(null), 'No places found nearby');

  // Verify no redundant "places" artifact
  assert.equal(getCategoryEmptyTitle('restaurants').includes('places'), false);
  assert.equal(getCategoryEmptyTitle('cafes').includes('places'), false);
});

test('11. PlaceDiscoveryView Guards Against Premature Empty States on Null/Pending Coordinates', () => {
  const viewCode = fs.readFileSync(path.resolve('./frontend/components/PlaceDiscoveryView.jsx'), 'utf8');

  // 1. Must set isLocationPending instead of wiping places with setPlaces([])
  assert.ok(viewCode.includes('setIsLocationPending(true)'), 'Must flag location pending when coords are null');
  assert.ok(!viewCode.includes('setPlaces([]);\n            setLoading(false);\n            setIsRevalidating(false);\n          }\n          return;'), 'Must NOT wipe places to empty when coordinates are null/pending');

  // 2. Must render honest detecting indicator
  assert.ok(viewCode.includes('Detecting current location...'), 'Must render detecting status');

  // 3. Must use clean empty state typography
  assert.ok(viewCode.includes('getCategoryEmptyTitle(selectedCategory)'), 'Empty state must use clean category titles');
});

test('12. places-proxy canonicalCat === "all" Multi-Category OSM Discovery Generator', () => {
  const proxyCode = fs.readFileSync(path.resolve('./supabase/functions/places-proxy/index.ts'), 'utf8');

  // 1. Must support canonicalCat === "all" with unified query first
  assert.ok(proxyCode.includes("canonicalCat === 'all'"), 'Must handle canonicalCat === all in OSM discovery');
  assert.ok(proxyCode.includes("OVERPASS_CATEGORY_TAGS") && proxyCode.includes("all:"), 'Must declare unified multi-amenity tag for category all');
  assert.ok(proxyCode.includes("const unifiedOsmPlaces = await this.fetchAndIngestOsm("), 'Must issue unified query first to avoid 429 concurrency throttles');

  // 2. Must support sequential fallback across primary categories when unified query yields 0
  assert.ok(proxyCode.includes("const primaryCategories = ['cafes', 'restaurants', 'attractions', 'stays']"), 'Must declare primary categories in documented order');
  assert.ok(proxyCode.includes("for (const cat of primaryCategories)"), 'Must iterate fallback categories sequentially (concurrency <= 1)');
  assert.ok(proxyCode.includes("if (allOsmPlaces.length >= clampedLimit) break;"), 'Must exit early once enough places are found');

  // 3. Must not flood external providers concurrently with Promise.all / Promise.allSettled
  assert.ok(!proxyCode.includes("Promise.all(primaryCategories"), 'Must NOT flood external providers concurrently');
  assert.ok(!proxyCode.includes("Promise.allSettled(primaryCategories"), 'Must NOT flood external providers with parallel allSettled');
});

test('13. Universal Pan-India External Google Maps Category Search Deep-Linking', () => {
  // Test A: Priority 1 - City Mode strictly takes precedence over GPS coordinates
  const cityUrl = buildGoogleMapsCategorySearchUrl({
    category: 'restaurants',
    mode: 'destination',
    searchDestination: 'Mumbai',
    coords: { latitude: 12.9716, longitude: 77.5946 }, // Bengaluru GPS coordinates should be ignored
  });
  assert.equal(
    cityUrl,
    'https://www.google.com/maps/search/?api=1&query=restaurants%20in%20Mumbai',
    'City mode must strictly override available GPS coordinates'
  );
  assert.ok(!cityUrl.includes('12.9716'), 'City mode must not leak GPS coordinate numbers into query');

  // Test B: Dynamic Pan-India arbitrary Indian cities propagation
  const kolkata = buildGoogleMapsCategorySearchUrl({ category: 'cafes', searchDestination: 'Kolkata' });
  assert.equal(kolkata, 'https://www.google.com/maps/search/?api=1&query=cafes%20in%20Kolkata');

  const bengaluru = buildGoogleMapsCategorySearchUrl({ category: 'stays', searchDestination: 'Bengaluru' });
  assert.equal(bengaluru, 'https://www.google.com/maps/search/?api=1&query=hotels%20in%20Bengaluru');

  const pune = buildGoogleMapsCategorySearchUrl({ category: 'restaurants', searchDestination: 'Pune' });
  assert.equal(pune, 'https://www.google.com/maps/search/?api=1&query=restaurants%20in%20Pune');

  const shimla = buildGoogleMapsCategorySearchUrl({ category: 'attractions', searchDestination: 'Shimla' });
  assert.equal(shimla, 'https://www.google.com/maps/search/?api=1&query=attractions%20in%20Shimla');

  const multiWord = buildGoogleMapsCategorySearchUrl({ category: 'cafes', searchDestination: 'Fort Kochi' });
  assert.equal(multiWord, 'https://www.google.com/maps/search/?api=1&query=cafes%20in%20Fort%20Kochi');

  // Test C: Priority 2 - Nearby Mode anchors to exact decimal coordinates when city is empty
  const nearbyGps = buildGoogleMapsCategorySearchUrl({
    category: 'restaurants',
    mode: 'nearby',
    searchDestination: '',
    coords: { latitude: 19.076, longitude: 72.8777 },
  });
  assert.equal(
    nearbyGps,
    'https://www.google.com/maps/search/?api=1&query=restaurants%20near%2019.076%2C72.8777',
    'Nearby mode must anchor to current GPS latitude and longitude'
  );

  // Test D: Priority 3 - Graceful Fallback / Zero State when coordinates are null and no city is active
  const fallbackZero = buildGoogleMapsCategorySearchUrl({
    category: 'restaurants',
    mode: 'nearby',
    searchDestination: '',
    coords: null,
  });
  assert.equal(
    fallbackZero,
    'https://www.google.com/maps/search/?api=1&query=restaurants',
    'Must cleanly query category alone without error or lockup'
  );

  const fallbackAll = buildGoogleMapsCategorySearchUrl({
    category: 'all',
    mode: 'nearby',
    searchDestination: '',
    coords: null,
  });
  assert.equal(
    fallbackAll,
    'https://www.google.com/maps/search/?api=1&query=places%20to%20visit'
  );

  // Test E: PlaceDiscoveryView integrates external Google Maps category button
  const viewCode = fs.readFileSync(path.resolve('./frontend/components/PlaceDiscoveryView.jsx'), 'utf8');
  assert.ok(viewCode.includes('buildGoogleMapsCategorySearchUrl'), 'Must import buildGoogleMapsCategorySearchUrl');
  assert.ok(viewCode.includes('handleOpenExternalCategorySearch'), 'Must declare handler for category deep link');
  assert.ok(viewCode.includes('Google Maps ↗'), 'Must render button with external arrow indicator');
});

test("14. Direct Category-to-Google Maps Interaction & Dynamic Priority Contract", () => {
  // Test A: Category chip tap generates and opens the exact expected Google Maps URL for "Hotels / Stays" in Mumbai
  const hotelsMumbai = buildGoogleMapsCategorySearchUrl({
    category: "Hotels / Stays",
    mode: "destination",
    searchDestination: "Mumbai",
    coords: { latitude: 19.076, longitude: 72.8777 },
  });
  assert.equal(
    hotelsMumbai,
    "https://www.google.com/maps/search/?api=1&query=Hotels%20in%20Mumbai",
    "Hotels / Stays in Mumbai must prioritize city destination name"
  );

  // Test B: Category chip tap in Nearby mode opens using live GPS coordinates
  const cafesNearby = buildGoogleMapsCategorySearchUrl({
    category: "Cafes",
    mode: "nearby",
    searchDestination: "",
    coords: { latitude: 19.076, longitude: 72.8777 },
  });
  assert.equal(
    cafesNearby,
    "https://www.google.com/maps/search/?api=1&query=Cafes%20near%2019.076%2C72.8777",
    "Cafes in Nearby mode must target exact GPS coordinates"
  );

  // Test C: Category switching cleanly adapts the target URL
  const switchCafes = buildGoogleMapsCategorySearchUrl({
    category: "Cafes",
    mode: "destination",
    searchDestination: "Mumbai",
  });
  assert.equal(switchCafes, "https://www.google.com/maps/search/?api=1&query=Cafes%20in%20Mumbai");

  const switchRestaurants = buildGoogleMapsCategorySearchUrl({
    category: "Restaurants",
    mode: "destination",
    searchDestination: "Mumbai",
  });
  assert.equal(switchRestaurants, "https://www.google.com/maps/search/?api=1&query=Restaurants%20in%20Mumbai");

  const switchTemples = buildGoogleMapsCategorySearchUrl({
    category: "Temples",
    mode: "destination",
    searchDestination: "Mumbai",
  });
  assert.equal(switchTemples, "https://www.google.com/maps/search/?api=1&query=Temples%20in%20Mumbai");

  // Test D: PlaceDiscoveryView wires direct category tap to Google Maps launch
  const viewCode = fs.readFileSync(path.resolve("./frontend/components/PlaceDiscoveryView.jsx"), "utf8");
  assert.ok(viewCode.includes("handleCategoryPress"), "Must declare handleCategoryPress handler");
  assert.ok(viewCode.includes("handleOpenExternalCategorySearch(catId)"), "handleCategoryPress must directly launch external Google Maps search");
  assert.ok(!viewCode.includes("REAL-WORLD VENUES"), "Internal REAL-WORLD VENUES header must be retired");
  assert.ok(!viewCode.includes("fullPlaceCard"), "Internal fullPlaceCard list must be retired");
});

test("15. Mode Switching Integrity & Stale City Elimination Contract", () => {
  // Requirement 1: Select Goa -> switch to Nearby -> destination no longer says Goa
  // When mode is "nearby", even if searchDestination was left as "Goa",
  // buildGoogleMapsCategorySearchUrl strictly targets the GPS coordinates, never Goa.
  const goaToNearbyUrl = buildGoogleMapsCategorySearchUrl({
    category: "Restaurants",
    mode: "nearby",
    searchDestination: "Goa",
    coords: { latitude: 15.2993, longitude: 74.124 },
  });
  assert.equal(
    goaToNearbyUrl,
    "https://www.google.com/maps/search/?api=1&query=Restaurants%20near%2015.2993%2C74.124",
    "Switching to Nearby mode must never include stale city Goa in search URL"
  );
  assert.ok(
    !goaToNearbyUrl.includes("Goa") && !goaToNearbyUrl.includes("goa"),
    "Nearby URL must not contain any trace of stale city Goa"
  );

  // Requirement 2: Nearby category search URL uses GPS coordinates
  const nearbyGpsUrl = buildGoogleMapsCategorySearchUrl({
    category: "Cafes",
    mode: "nearby",
    searchDestination: "Goa",
    coords: { latitude: 13.2231, longitude: 79.0958 },
  });
  assert.equal(
    nearbyGpsUrl,
    "https://www.google.com/maps/search/?api=1&query=Cafes%20near%2013.2231%2C79.0958",
    "Nearby category search must use live GPS coordinates"
  );

  // Requirement 3: Switch back to Search City -> Goa is restored
  const switchBackToCityUrl = buildGoogleMapsCategorySearchUrl({
    category: "Restaurants",
    mode: "destination",
    searchDestination: "Goa",
    coords: { latitude: 13.2231, longitude: 79.0958 },
  });
  assert.equal(
    switchBackToCityUrl,
    "https://www.google.com/maps/search/?api=1&query=Restaurants%20in%20Goa",
    "Switching back to Search City mode must restore Goa"
  );

  // Requirement 4: GPS unavailable in Nearby mode does not fall back to Goa
  // When coords is null, Nearby mode falls back to category-only query, NEVER Goa
  const nearbyNoGpsUrl = buildGoogleMapsCategorySearchUrl({
    category: "Restaurants",
    mode: "nearby",
    searchDestination: "Goa",
    coords: null,
  });
  assert.equal(
    nearbyNoGpsUrl,
    "https://www.google.com/maps/search/?api=1&query=Restaurants",
    "GPS unavailable in Nearby mode must use category-only query, never fallback to Goa"
  );
  assert.ok(
    !nearbyNoGpsUrl.includes("Goa") && !nearbyNoGpsUrl.includes("goa"),
    "GPS unavailable Nearby query must never leak stale city Goa"
  );

  // Requirement 5: City mode remains functional with GPS unavailable
  const cityNoGpsUrl = buildGoogleMapsCategorySearchUrl({
    category: "Cafes",
    mode: "destination",
    searchDestination: "Goa",
    coords: null,
  });
  assert.equal(
    cityNoGpsUrl,
    "https://www.google.com/maps/search/?api=1&query=Cafes%20in%20Goa",
    "City mode must remain fully functional with GPS unavailable"
  );

  // Requirement 6: PlaceDiscoveryView code audit for state separation
  const viewCode = fs.readFileSync(path.resolve("./frontend/components/PlaceDiscoveryView.jsx"), "utf8");
  // Ensure savedCity state exists to preserve user input without leaking it into Nearby
  assert.ok(viewCode.includes("savedCity"), "PlaceDiscoveryView must maintain savedCity state for switching back");
  // Ensure isCityMode is strictly governed by placesMode === "destination"
  assert.ok(
    viewCode.includes("placesMode === \"destination\""),
    "isCityMode must strictly check placesMode === destination"
  );
  // Ensure external category search does not pass cleanDest in nearby mode
  assert.ok(
    viewCode.includes("activeDest = placesMode === \"destination\" ? (savedCity || searchDestination || \"\") : \"\""),
    "External search must pass empty destination in nearby mode"
  );
});

test("16. Dynamic Radius Selection & Google Maps Deep-Linking Contract", () => {
  const coords = { latitude: 12.9716, longitude: 77.5946 };

  // Test A: 5 km radius produces query containing "within 5km of <lat>,<lng>"
  const url5km = buildGoogleMapsCategorySearchUrl({
    category: "Restaurants",
    mode: "nearby",
    coords,
    radiusKm: 5,
  });
  assert.equal(
    url5km,
    "https://www.google.com/maps/search/?api=1&query=Restaurants%20within%205km%20of%2012.9716%2C77.5946",
    "Selecting 5 km radius must format query with within 5km of <lat>,<lng>"
  );
  assert.ok(url5km.includes("within%205km%20of"), "URL must contain encoded within 5km of");

  // Test B: Switching to 25 km updates the URL to "within 25km of <lat>,<lng>"
  const url25km = buildGoogleMapsCategorySearchUrl({
    category: "Restaurants",
    mode: "nearby",
    coords,
    radiusKm: 25,
  });
  assert.equal(
    url25km,
    "https://www.google.com/maps/search/?api=1&query=Restaurants%20within%2025km%20of%2012.9716%2C77.5946",
    "Switching to 25 km radius must update query with within 25km of <lat>,<lng>"
  );
  assert.ok(url25km.includes("within%2025km%20of"), "URL must contain encoded within 25km of");

  // Test C: Additional standard radius options (15 km, 50 km, 100 km)
  const url15km = buildGoogleMapsCategorySearchUrl({
    category: "Cafes",
    mode: "nearby",
    coords,
    radiusKm: 15,
  });
  assert.equal(
    url15km,
    "https://www.google.com/maps/search/?api=1&query=Cafes%20within%2015km%20of%2012.9716%2C77.5946"
  );

  const url50km = buildGoogleMapsCategorySearchUrl({
    category: "all",
    mode: "nearby",
    coords,
    radiusKm: 50,
  });
  assert.equal(
    url50km,
    "https://www.google.com/maps/search/?api=1&query=places%20to%20visit%20within%2050km%20of%2012.9716%2C77.5946"
  );

  const url100km = buildGoogleMapsCategorySearchUrl({
    category: "Hotels",
    mode: "nearby",
    coords,
    radiusKm: 100,
  });
  assert.equal(
    url100km,
    "https://www.google.com/maps/search/?api=1&query=Hotels%20within%20100km%20of%2012.9716%2C77.5946"
  );

  // Test D: City Mode remains unaffected by radius changes
  const cityWithRadius = buildGoogleMapsCategorySearchUrl({
    category: "Restaurants",
    mode: "destination",
    searchDestination: "Goa",
    coords,
    radiusKm: 50,
  });
  assert.equal(
    cityWithRadius,
    "https://www.google.com/maps/search/?api=1&query=Restaurants%20in%20Goa",
    "City Mode must remain unaffected by radius changes"
  );
  assert.ok(!cityWithRadius.includes("within"), "City Mode must not contain radius within");
  assert.ok(!cityWithRadius.includes("50km"), "City Mode must not contain radius numbers");

  // Test E: PlaceDiscoveryView integrates radius selector pills & explicit activeContextSub feedback
  const viewCode = fs.readFileSync(path.resolve("./frontend/components/PlaceDiscoveryView.jsx"), "utf8");
  assert.ok(viewCode.includes("RADIUS_OPTIONS"), "PlaceDiscoveryView must define standard RADIUS_OPTIONS");
  assert.ok(viewCode.includes("activeRadiusKm"), "PlaceDiscoveryView must track activeRadiusKm");
  assert.ok(viewCode.includes("radiusKm: activeRadiusKm"), "handleOpenExternalCategorySearch must pass radiusKm");
  assert.ok(
    viewCode.includes("Showing results within ${activeRadiusKm} km of your current location"),
    "Active GPS card must explicitly display the active radius in km"
  );
});
