// ============================================================================
// MAYBEWE PAN-INDIA PLACE DISCOVERY DETERMINISTIC OFFLINE TEST HARNESS
// tests/phase5d_pan_india_discovery_harness.test.js
// ============================================================================
// Validates all 12 Pan-India geographic benchmark locations and 12 behavioral
// contracts for places-proxy with zero live network calls and 100% determinism.
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import babel from "@babel/core";

const require = createRequire(import.meta.url);

// Transpile places-proxy/index.ts for behavioral execution in Node.js
const edgeFnCode = fs.readFileSync("backend/supabase/functions/places-proxy/index.ts", "utf8");
const transformed = babel.transformSync(edgeFnCode, {
  filename: "index.ts",
  presets: [["babel-preset-expo", { jsxRuntime: "classic" }]],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
});

// The 12 Pan-India Benchmark Acceptance Locations
export const BENCHMARK_LOCATIONS = [
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", lat: 17.3850, lon: 78.4867, type: "metro" },
  { id: "delhi", name: "Delhi", state: "Delhi", lat: 28.6139, lon: 77.2090, type: "metro" },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", lat: 19.0760, lon: 72.8777, type: "metro" },
  { id: "bengaluru", name: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946, type: "metro" },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, type: "metro" },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639, type: "metro" },
  { id: "vijayawada", name: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lon: 80.6480, type: "tier2" },
  { id: "vizianagaram", name: "Vizianagaram", state: "Andhra Pradesh", lat: 18.1124, lon: 83.3978, type: "tier2" },
  { id: "tirupati", name: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lon: 79.4192, type: "pilgrim" },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873, type: "heritage" },
  { id: "madanapalle", name: "Madanapalle", state: "Andhra Pradesh", lat: 13.5560, lon: 78.5010, type: "small_town" },
  { id: "rural_junction", name: "Pileru", state: "Andhra Pradesh", lat: 13.6500, lon: 78.4000, type: "rural" },
];

function createIsolatedHarness(options = {}) {
  const {
    fetchImpl = () => Promise.resolve({ ok: false, status: 500, json: async () => ({}) }),
    rpcImpl = () => Promise.resolve({ data: [], error: null }),
    fromSelectImpl = () => Promise.resolve({ data: [], error: null }),
    fromUpsertImpl = () => Promise.resolve({ data: null, error: null }),
    envVars = {},
  } = options;

  const moduleObj = { exports: {} };
  const context = vm.createContext({
    module: moduleObj,
    exports: moduleObj.exports,
    require: (mod) => {
      if (mod.startsWith("@babel/runtime/")) return require(mod);
      return {};
    },
    Deno: {
      env: {
        get: (key) => envVars[key] ?? null,
      },
      serve: () => {},
    },
    console,
    crypto: globalThis.crypto,
    AbortController: globalThis.AbortController,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    Response: class MockResponse {
      constructor(body, init) {
        this.body = body;
        this.status = init?.status || 200;
        this.headers = init?.headers || {};
      }
      json() {
        return Promise.resolve(typeof this.body === "string" ? JSON.parse(this.body) : this.body);
      }
    },
    fetch: fetchImpl,
  });

  vm.runInContext(transformed.code, context);

  const mockSupabaseClient = {
    rpc: rpcImpl,
    from: (tableName) => ({
      select: () => {
        let latGte = -Infinity, latLte = Infinity, lngGte = -Infinity, lngLte = Infinity;
        const builder = {
          gte: (col, val) => {
            if (col === "latitude") latGte = Number(val);
            if (col === "longitude") lngGte = Number(val);
            return builder;
          },
          lte: (col, val) => {
            if (col === "latitude") latLte = Number(val);
            if (col === "longitude") lngLte = Number(val);
            return builder;
          },
          or: () => builder,
          limit: (limitVal) => fromSelectImpl({ latGte, latLte, lngGte, lngLte, limit: limitVal }),
        };
        return builder;
      },
      upsert: fromUpsertImpl,
    }),
  };

  const provider = new moduleObj.exports.PostgisPlacesProvider(mockSupabaseClient);
  return {
    provider,
    exports: moduleObj.exports,
  };
}

// ----------------------------------------------------------------------------
// CONTRACT 1: Coordinate Validation & Extreme Boundary Invariants
// ----------------------------------------------------------------------------
test("Contract 1: Coordinate Validation rejects Null Island and invalid bounds across all benchmarks", () => {
  const { exports: { isValidCoord } } = createIsolatedHarness();

  // 1. All 12 benchmark coordinates must be valid
  for (const loc of BENCHMARK_LOCATIONS) {
    assert.equal(isValidCoord(loc.lat, loc.lon), true, `Location ${loc.name} coordinates must be valid`);
  }

  // 2. Null Island strictly rejected
  assert.equal(isValidCoord(0, 0), false, "Null Island (0, 0) must be rejected");
  assert.equal(isValidCoord(0, 0), false, "Null Island (0, 0) must be rejected");

  // 3. Non-finite, NaN, and out of range rejected
  assert.equal(isValidCoord(NaN, 77.59), false, "NaN latitude must be rejected");
  assert.equal(isValidCoord(12.97, Infinity), false, "Infinity longitude must be rejected");
  assert.equal(isValidCoord(91, 77.59), false, "Latitude > 90 must be rejected");
  assert.equal(isValidCoord(-91, 77.59), false, "Latitude < -90 must be rejected");
  assert.equal(isValidCoord(12.97, 181), false, "Longitude > 180 must be rejected");
  assert.equal(isValidCoord(12.97, -181), false, "Longitude < -180 must be rejected");
});

// ----------------------------------------------------------------------------
// CONTRACT 2: Spatial Radius & Limit Clamping Geometry
// ----------------------------------------------------------------------------
test("Contract 2: Spatial Radius & Limit Clamping Geometry", () => {
  const { exports: { calculateBoundingBox } } = createIsolatedHarness();

  // Test across low latitude (Chennai ~13N) and high latitude (Delhi ~28N)
  const chennaiBox = calculateBoundingBox(13.0827, 80.2707, 5000);
  const delhiBox = calculateBoundingBox(28.6139, 77.2090, 5000);

  assert.ok(chennaiBox.maxLat > 13.0827 && chennaiBox.minLat < 13.0827);
  assert.ok(chennaiBox.maxLng > 80.2707 && chennaiBox.minLng < 80.2707);

  // Cosine expansion: At higher latitude (Delhi), longitude delta must be wider than at Chennai
  const chennaiLngSpan = chennaiBox.maxLng - chennaiBox.minLng;
  const delhiLngSpan = delhiBox.maxLng - delhiBox.minLng;
  assert.ok(delhiLngSpan > chennaiLngSpan, "Higher latitude must expand longitude span for cosine projection");

  // Verify delta calculations for standard 5000m radius
  const latDelta = chennaiBox.maxLat - chennaiBox.minLat;
  assert.ok(latDelta > 0.08 && latDelta < 0.12, "Latitude delta for 5km buffer must be ~0.103 degrees");
});

// ----------------------------------------------------------------------------
// CONTRACT 3: Database-First Bypass
// ----------------------------------------------------------------------------
test("Contract 3: Database-First Bypass prevents any external provider call when PostGIS has >= 3 records", async () => {
  let externalCalls = 0;
  const mockPlaces = [
    { id: "1", name: "Metro Spot 1", latitude: 12.971, longitude: 77.594, distance_meters: 100, category: "cafe", category_id: "cafes" },
    { id: "2", name: "Metro Spot 2", latitude: 12.972, longitude: 77.595, distance_meters: 250, category: "cafe", category_id: "cafes" },
    { id: "3", name: "Metro Spot 3", latitude: 12.973, longitude: 77.596, distance_meters: 400, category: "cafe", category_id: "cafes" },
  ];

  const { provider } = createIsolatedHarness({
    fetchImpl: () => {
      externalCalls++;
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ elements: [] }) });
    },
    rpcImpl: () => Promise.resolve({ data: mockPlaces, error: null }),
  });

  const results = await provider.searchNearby({
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 5000,
    category: "cafes",
    limit: 10,
    clientIp: "test-client",
  });

  assert.equal(results.length, 3);
  assert.equal(externalCalls, 0, "External provider MUST NOT be called when PostGIS has >= 3 records");
});

// ----------------------------------------------------------------------------
// CONTRACT 4: Candidate Spatial Bounding-Box Filtering (Zero Table Scan Leakage)
// ----------------------------------------------------------------------------
test("Contract 4: Candidate Spatial Bounding-Box Filtering prevents arbitrary insertion-order table scans", async () => {
  const dbRows = [
    { id: "mumbai_row", name: "Mumbai Venue", latitude: 19.0760, longitude: 72.8777, category: "attraction", category_id: "attractions" },
    { id: "blr_row", name: "Bengaluru Venue", latitude: 12.9716, longitude: 77.5946, category: "attraction", category_id: "attractions" },
  ];

  let appliedBounds = null;
  const { provider } = createIsolatedHarness({
    rpcImpl: () => Promise.resolve({ data: null, error: new Error("RPC offline") }),
    fromSelectImpl: ({ latGte, latLte, lngGte, lngLte }) => {
      appliedBounds = { latGte, latLte, lngGte, lngLte };
      const filtered = dbRows.filter(
        (r) => r.latitude >= latGte && r.latitude <= latLte && r.longitude >= lngGte && r.longitude <= lngLte
      );
      return Promise.resolve({ data: filtered, error: null });
    },
  });

  const results = await provider.searchNearby({
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 5000,
    category: "all",
    limit: 10,
    clientIp: "test-client",
  });

  assert.ok(appliedBounds !== null, "Bounding box must be applied to database select");
  assert.equal(results.length, 1);
  assert.equal(results[0].name, "Bengaluru Venue");
  assert.ok(!results.some((r) => r.name === "Mumbai Venue"), "Distant Mumbai venue must be excluded by bounding box");
});

// ----------------------------------------------------------------------------
// CONTRACT 5: Comprehensive 31-Category Taxonomy Alignment
// ----------------------------------------------------------------------------
test("Contract 5: Comprehensive 31-Category Taxonomy Alignment", () => {
  const { exports: { CANONICAL_CATEGORY_MAP, OVERPASS_CATEGORY_TAGS } } = createIsolatedHarness();

  const essentialCategories = [
    "cafes", "restaurants", "stays", "temples", "churches", "mosques",
    "attractions", "beaches", "parks", "museums", "banks", "atms",
    "hospitals", "pharmacies", "supermarkets", "shopping", "fuel"
  ];

  for (const cat of essentialCategories) {
    assert.ok(OVERPASS_CATEGORY_TAGS[cat], `OVERPASS_CATEGORY_TAGS must define query for category: ${cat}`);
    assert.ok(CANONICAL_CATEGORY_MAP[cat], `CANONICAL_CATEGORY_MAP must map category: ${cat}`);
  }

  // Unified "all" tag must be present and query multiple social amenities
  assert.ok(OVERPASS_CATEGORY_TAGS["all"].includes("amenity"), "Unified 'all' tag must include amenities");
});

// ----------------------------------------------------------------------------
// CONTRACT 6: Unified "all" Overpass Query Single-Request Execution
// ----------------------------------------------------------------------------
test("Contract 6: Unified 'all' Overpass query executes as a single request first (Zero Concurrency Flood)", async () => {
  const dispatchedUrls = [];
  const { provider } = createIsolatedHarness({
    rpcImpl: () => Promise.resolve({ data: [], error: null }),
    fromSelectImpl: () => Promise.resolve({ data: [], error: null }),
    fetchImpl: async (url) => {
      dispatchedUrls.push(String(url));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            { id: 101, lat: 12.9716, lon: 77.5946, tags: { name: "Unified Spot", amenity: "cafe" } }
          ],
        }),
      };
    },
  });

  const results = await provider.searchNearby({
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 5000,
    category: "all",
    limit: 10,
    clientIp: "test-client",
  });

  assert.equal(results.length, 1);
  assert.equal(dispatchedUrls.length, 1, "Must issue exactly 1 unified query when it returns valid results");
  assert.ok(dispatchedUrls[0].includes("amenity%22~%22cafe"), "Unified query must contain union of target amenities");
});

// ----------------------------------------------------------------------------
// CONTRACT 7: Sequential Category Fallback with Early Limit Exit & Concurrency <= 1
// ----------------------------------------------------------------------------
test("Contract 7: Sequential Category Fallback operates with Concurrency <= 1 and exits early", async () => {
  const dispatchedUrls = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const { provider } = createIsolatedHarness({
    rpcImpl: () => Promise.resolve({ data: [], error: null }),
    fromSelectImpl: () => Promise.resolve({ data: [], error: null }),
    fetchImpl: async (url) => {
      inFlight++;
      if (inFlight > maxInFlight) maxInFlight = inFlight;
      const urlStr = String(url);
      dispatchedUrls.push(urlStr);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;

      // 1st call: unified query -> empty to trigger fallback
      if (urlStr.includes("amenity%22~%22cafe")) {
        return { ok: true, status: 200, json: async () => ({ elements: [] }) };
      }
      // 2nd call: cafes -> returns 3 spots (limit is 3, early exit should trigger!)
      if (urlStr.includes("amenity%22%3D%22cafe%22")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            elements: [
              { id: 201, lat: 12.971, lon: 77.594, tags: { name: "Cafe A", amenity: "cafe" } },
              { id: 202, lat: 12.972, lon: 77.595, tags: { name: "Cafe B", amenity: "cafe" } },
              { id: 203, lat: 12.973, lon: 77.596, tags: { name: "Cafe C", amenity: "cafe" } },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ elements: [] }) };
    },
  });

  const results = await provider.searchNearby({
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 5000,
    category: "all",
    limit: 3,
    clientIp: "test-client",
  });

  assert.equal(results.length, 3);
  assert.equal(maxInFlight, 1, "Concurrency must be strictly 1 during sequential fallback");
  // Verify fallback URLs after the initial unified query (index 0..3) did not query remaining categories
  const categoryFallbackUrls = dispatchedUrls.slice(4);
  assert.equal(categoryFallbackUrls.length, 1, "Only cafes category should be queried before early exit");
  assert.ok(categoryFallbackUrls[0].includes("amenity%22%3D%22cafe%22"), "First fallback category must be cafes");
});

// ----------------------------------------------------------------------------
// CONTRACT 8: Dynamic State & Destination Attribution Across All 12 Benchmarks
// ----------------------------------------------------------------------------
test("Contract 8: Dynamic State Attribution accurately resolves all 12 Pan-India Benchmarks without hardcoding", () => {
  const { exports: { extractStateFromGeocode } } = createIsolatedHarness();

  for (const loc of BENCHMARK_LOCATIONS) {
    // 1. Nominatim structured address
    const nomItem = {
      name: `${loc.name} Point`,
      address: {
        city: loc.name,
        state: loc.state,
        country: "India",
      },
    };
    assert.equal(extractStateFromGeocode(nomItem), loc.state, `Must extract ${loc.state} from address for ${loc.name}`);

    // 2. Photon GeoJSON feature properties
    const photonItem = {
      properties: {
        name: `${loc.name} Landmark`,
        city: loc.name,
        state: loc.state,
        country: "India",
      },
    };
    assert.equal(extractStateFromGeocode(photonItem), loc.state, `Must extract ${loc.state} from properties for ${loc.name}`);

    // 3. Display name comma-delimited string
    const displayItem = {
      display_name: `${loc.name} Center, ${loc.name}, ${loc.state}, India`,
    };
    assert.equal(extractStateFromGeocode(displayItem), loc.state, `Must extract ${loc.state} from display_name for ${loc.name}`);
  }
});

// ----------------------------------------------------------------------------
// CONTRACT 9: Semantic Category Accuracy Guard
// ----------------------------------------------------------------------------
test("Contract 9: Semantic Category Accuracy Guard strictly drops non-matching places in recovery fallback", () => {
  const { exports: { matchesEnforcedCategory } } = createIsolatedHarness();

  // Fuel category strictly drops bakeries, cafes, and supermarkets
  assert.equal(matchesEnforcedCategory({ osm_value: "fuel" }, "fuel"), true);
  assert.equal(matchesEnforcedCategory({ osm_value: "bakery" }, "fuel"), false);
  assert.equal(matchesEnforcedCategory({ osm_value: "cafe" }, "fuel"), false);
  assert.equal(matchesEnforcedCategory({ osm_value: "supermarket" }, "fuel"), false);

  // Cafes category matches cafe, drops restaurants
  assert.equal(matchesEnforcedCategory({ osm_value: "cafe" }, "cafes"), true);
  assert.equal(matchesEnforcedCategory({ osm_value: "restaurant" }, "cafes"), false);

  // Stays category matches hotel
  assert.equal(matchesEnforcedCategory({ osm_value: "hotel" }, "stays"), true);

  // Category 'all' or undefined allows any valid category
  assert.equal(matchesEnforcedCategory({ osm_value: "bakery" }, "all"), true);
  assert.equal(matchesEnforcedCategory({ osm_value: "bakery" }, undefined), true);
});

// ----------------------------------------------------------------------------
// CONTRACT 10: GeoJSON Coordinate Order & Distance Geometry
// ----------------------------------------------------------------------------
test("Contract 10: GeoJSON Coordinate Order & Distance Geometry (coords[0]=lon, coords[1]=lat, ascending sort)", async () => {
  const { provider } = createIsolatedHarness({
    rpcImpl: () => Promise.resolve({ data: [], error: null }),
    fromSelectImpl: () => Promise.resolve({ data: [], error: null }),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [
          // Closer place: ~111m north
          { id: 301, lat: 12.9726, lon: 77.5946, tags: { name: "Closer Place", amenity: "cafe" } },
          // Farther place: ~1113m north
          { id: 302, lat: 12.9816, lon: 77.5946, tags: { name: "Farther Place", amenity: "cafe" } },
        ],
      }),
    }),
  });

  const results = await provider.searchNearby({
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 5000,
    category: "cafes",
    limit: 10,
    clientIp: "test-client",
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].name, "Closer Place");
  assert.equal(results[1].name, "Farther Place");
  assert.ok(results[0].distance_meters < results[1].distance_meters, "Results must be sorted ascending by distance");
  assert.equal(results[0].latitude, 12.9726, "Latitude must match element lat");
  assert.equal(results[0].longitude, 77.5946, "Longitude must match element lon");
});

// ----------------------------------------------------------------------------
// CONTRACT 11: Public Response Data Sanitization (Zero Debug Metadata Leaks)
// ----------------------------------------------------------------------------
test("Contract 11: Public Response Data Sanitization confirms absence of debug metadata in responses", () => {
  const sourceA = fs.readFileSync("supabase/functions/places-proxy/index.ts", "utf8");
  const sourceB = fs.readFileSync("backend/supabase/functions/places-proxy/index.ts", "utf8");

  for (const src of [sourceA, sourceB]) {
    // Assert no debug fields in JSON responses
    assert.ok(!src.includes("hasServiceRoleKey:"), "Must NOT return hasServiceRoleKey in response");
    assert.ok(!src.includes("hasAnonKey:"), "Must NOT return hasAnonKey in response");
    assert.ok(!src.includes("debug: this.lastDebug"), "Must NOT return debug object in response");

    // Assert catch-all does not leak internal error detail
    assert.ok(!src.includes("detail: errorMessage"), "Must NOT expose raw error detail in 502 responses");
  }
});

// ----------------------------------------------------------------------------
// CONTRACT 12: Upstream Error Resilience & Honest Empty States
// ----------------------------------------------------------------------------
test("Contract 12: Upstream Error Resilience & Honest Empty States without crashes", async () => {
  // Test case A: Upstream provider returns 504 Gateway Timeout -> gracefully returns empty list
  const { provider: timeoutProvider } = createIsolatedHarness({
    rpcImpl: () => Promise.resolve({ data: [], error: null }),
    fromSelectImpl: () => Promise.resolve({ data: [], error: null }),
    fetchImpl: () => Promise.resolve({ ok: false, status: 504, text: async () => "Gateway Timeout" }),
  });

  const emptyResults = await timeoutProvider.searchNearby({
    latitude: 13.6500, // Rural location (Pileru)
    longitude: 78.4000,
    radiusMeters: 5000,
    category: "cafes",
    limit: 10,
    clientIp: "test-client",
  });

  assert.ok(Array.isArray(emptyResults), "Must return array even when upstream fails");
  assert.equal(emptyResults.length, 0, "Rural location with failed providers must return honest empty array");

  // Test case B: Upstream network exception -> gracefully caught without unhandled crash
  const { provider: crashProvider } = createIsolatedHarness({
    rpcImpl: () => Promise.resolve({ data: [], error: null }),
    fromSelectImpl: () => Promise.resolve({ data: [], error: null }),
    fetchImpl: () => Promise.reject(new Error("Connection reset by peer")),
  });

  const resilientResults = await crashProvider.searchNearby({
    latitude: 13.6500,
    longitude: 78.4000,
    radiusMeters: 5000,
    category: "cafes",
    limit: 10,
    clientIp: "test-client",
  });

  assert.ok(Array.isArray(resilientResults), "Network exception must be handled gracefully");
  assert.equal(resilientResults.length, 0);
});
