import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import babel from "@babel/core";

import { isValidCoordinate as frontendIsValidCoord } from "../frontend/lib/locationService.js";

const require = createRequire(import.meta.url);

// Transpile places-proxy/index.ts for behavioral execution in Node.js
const edgeFnCode = fs.readFileSync("backend/supabase/functions/places-proxy/index.ts", "utf8");
const transformed = babel.transformSync(edgeFnCode, {
  filename: "index.ts",
  presets: [["babel-preset-expo", { jsxRuntime: "classic" }]],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
});

const moduleObj = { exports: {} };
const context = vm.createContext({
  module: moduleObj,
  exports: moduleObj.exports,
  require: (mod) => {
    if (mod.startsWith("@babel/runtime/")) return require(mod);
    return {};
  },
  Deno: {
    env: { get: () => null },
    serve: () => {},
  },
  console,
  crypto: global.crypto,
  Response: class MockResponse {},
  fetch: () => Promise.resolve({ ok: false }),
});

vm.runInContext(transformed.code, context);

const {
  isValidCoord,
  calculateBoundingBox,
  extractStateFromGeocode,
  KNOWN_INDIAN_STATES_AND_UTS,
  PostgisPlacesProvider,
} = moduleObj.exports;

// ============================================================================
// Phase 5C Test Suite:
// 1. Coordinate Validation Hardening (Null Island & Non-Finite Rejection)
// 2. Spatial Bounding Box Bounding & Haversine Distance Geometry
// 3. Database Fallback Candidate Spatial Filtering (Zero Table Scan Leakage)
// 4. Dynamic State Attribution (Zero Hardcoded "Telangana")
// ============================================================================

test("Phase 5C.1: Coordinate Validation Hardening (Null Island & Non-Finite Rejection)", () => {
  // 1. Null Island (0, 0) must be strictly rejected
  assert.equal(isValidCoord(0, 0), false, "Null Island (0, 0) must be rejected");

  // 2. Non-finite values must be strictly rejected
  assert.equal(isValidCoord(Infinity, 77.59), false, "Latitude Infinity must be rejected");
  assert.equal(isValidCoord(-Infinity, 77.59), false, "Latitude -Infinity must be rejected");
  assert.equal(isValidCoord(12.97, Infinity), false, "Longitude Infinity must be rejected");
  assert.equal(isValidCoord(12.97, -Infinity), false, "Longitude -Infinity must be rejected");

  // 3. NaN values must be strictly rejected
  assert.equal(isValidCoord(NaN, 77.59), false, "Latitude NaN must be rejected");
  assert.equal(isValidCoord(12.97, NaN), false, "Longitude NaN must be rejected");
  assert.equal(isValidCoord(NaN, NaN), false, "Both NaN must be rejected");

  // 4. Non-number types must be strictly rejected
  assert.equal(isValidCoord("12.97", 77.59), false, "String latitude must be rejected");
  assert.equal(isValidCoord(12.97, "77.59"), false, "String longitude must be rejected");
  assert.equal(isValidCoord(null, 77.59), false, "Null latitude must be rejected");
  assert.equal(isValidCoord(12.97, null), false, "Null longitude must be rejected");
  assert.equal(isValidCoord(undefined, 77.59), false, "Undefined latitude must be rejected");
  assert.equal(isValidCoord(12.97, undefined), false, "Undefined longitude must be rejected");

  // 5. Geographic boundary limits
  assert.equal(isValidCoord(90.0001, 77.59), false, "Latitude > 90 must be rejected");
  assert.equal(isValidCoord(-90.0001, 77.59), false, "Latitude < -90 must be rejected");
  assert.equal(isValidCoord(12.97, 180.0001), false, "Longitude > 180 must be rejected");
  assert.equal(isValidCoord(12.97, -180.0001), false, "Longitude < -180 must be rejected");

  // 6. Valid global coordinates must be accepted
  assert.equal(isValidCoord(12.9716, 77.5946), true, "Bengaluru coordinates must be valid");
  assert.equal(isValidCoord(13.556, 78.501), true, "Madanapalle coordinates must be valid");
  assert.equal(isValidCoord(28.6139, 77.209), true, "Delhi coordinates must be valid");
  assert.equal(isValidCoord(-33.8688, 151.2093), true, "Sydney coordinates must be valid");
  assert.equal(isValidCoord(90, 180), true, "Extreme valid boundary (90, 180) must be accepted");
  assert.equal(isValidCoord(-90, -180), true, "Extreme valid boundary (-90, -180) must be accepted");

  // 7. Parity check with frontend isValidCoordinate
  const samplePoints = [
    [0, 0],
    [12.97, 77.59],
    [NaN, 77.59],
    [Infinity, 50],
    [-91, 10],
    [10, 181],
    [13.55, 78.5],
  ];
  for (const [lat, lng] of samplePoints) {
    assert.equal(
      isValidCoord(lat, lng),
      frontendIsValidCoord(lat, lng),
      `Parity failure between backend isValidCoord and frontend isValidCoordinate for (${lat}, ${lng})`
    );
  }
});

test("Phase 5C.2: Spatial Bounding Box Bounding & Haversine Distance Geometry", () => {
  const centerLat = 12.9716;
  const centerLng = 77.5946;
  const radiusMeters = 5000;

  const box = calculateBoundingBox(centerLat, centerLng, radiusMeters);

  // 1. Box dimensions must be centered around search coordinates
  assert.ok(box.minLat < centerLat, "minLat must be strictly south of centerLat");
  assert.ok(box.maxLat > centerLat, "maxLat must be strictly north of centerLat");
  assert.ok(box.minLng < centerLng, "minLng must be strictly west of centerLng");
  assert.ok(box.maxLng > centerLng, "maxLng must be strictly east of centerLng");

  // 2. Buffer margin: 15% buffer expansion must surround the search circle
  const bufferRadius = radiusMeters * 1.15;
  const expectedDeltaLat = bufferRadius / 111320;
  assert.ok(Math.abs((box.maxLat - centerLat) - expectedDeltaLat) < 0.0001, "Latitude delta must match buffered radius");

  // 3. Cosine scaling: At higher latitudes, deltaLng must expand properly
  const equatorBox = calculateBoundingBox(0, 0, 5000);
  const polarBox = calculateBoundingBox(60, 0, 5000);
  const equatorLngSpan = equatorBox.maxLng - equatorBox.minLng;
  const polarLngSpan = polarBox.maxLng - polarBox.minLng;
  assert.ok(polarLngSpan > equatorLngSpan, "Longitude delta must widen at higher latitudes due to cosine factor");
});

test("Phase 5C.3: Database Fallback Candidate Spatial Filtering (Zero Table Scan Leakage)", async () => {
  // Test dataset with insertion-order pitfall:
  // Initial rows 1 & 2 are in Delhi and Mumbai (outside 5km).
  // Target rows 3 & 4 are in Bengaluru (within 5km).
  const mockTableRows = [
    {
      id: "delhi_1",
      name: "Delhi Heritage Spot",
      destination: "Delhi",
      state: "Delhi",
      country: "India",
      latitude: 28.6139,
      longitude: 77.2090,
      category_id: "attractions",
      category: "Attractions",
    },
    {
      id: "mumbai_2",
      name: "Mumbai Sea View",
      destination: "Mumbai",
      state: "Maharashtra",
      country: "India",
      latitude: 19.0760,
      longitude: 72.8777,
      category_id: "attractions",
      category: "Attractions",
    },
    {
      id: "blr_close",
      name: "Bengaluru Botanic Garden",
      destination: "Bengaluru",
      state: "Karnataka",
      country: "India",
      latitude: 12.9750,
      longitude: 77.5950,
      category_id: "attractions",
      category: "Attractions",
    },
    {
      id: "blr_further",
      name: "Bengaluru Art Gallery",
      destination: "Bengaluru",
      state: "Karnataka",
      country: "India",
      latitude: 12.9850,
      longitude: 77.6050,
      category_id: "attractions",
      category: "Attractions",
    },
  ];

  class MockSupabaseClientWithSpatialFilters {
    rpc() {
      // Simulate RPC error to trigger table fallback
      return Promise.resolve({ data: null, error: new Error("RPC unavailable") });
    }

    from(tableName) {
      assert.equal(tableName, "places");
      return {
        select: () => {
          let latGte = -Infinity;
          let latLte = Infinity;
          let lngGte = -Infinity;
          let lngLte = Infinity;

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
            limit: (candidateLimit) => {
              // Execute spatial bounding box filtering
              const filtered = mockTableRows.filter(
                (r) =>
                  r.latitude >= latGte &&
                  r.latitude <= latLte &&
                  r.longitude >= lngGte &&
                  r.longitude <= lngLte
              );
              return Promise.resolve({ data: filtered.slice(0, candidateLimit), error: null });
            },
          };
          return builder;
        },
      };
    }
  }

  const mockClient = new MockSupabaseClientWithSpatialFilters();
  const provider = new PostgisPlacesProvider(mockClient);

  const results = await provider.searchNearby({
    latitude: 12.9716,
    longitude: 77.5946,
    radiusMeters: 5000,
    category: "attractions",
    limit: 10,
    clientIp: "test-ip",
  });

  // 1. Must NOT return Delhi or Mumbai places despite them being first in insertion order
  assert.equal(results.length, 2, "Must return exactly the 2 Bengaluru places inside the spatial bounding box");
  const resultIds = results.map((r) => r.place_id);
  assert.ok(!resultIds.includes("delhi_1"), "Distant Delhi place must be excluded by bounding box");
  assert.ok(!resultIds.includes("mumbai_2"), "Distant Mumbai place must be excluded by bounding box");

  // 2. Must be sorted strictly ascending by Haversine distance
  assert.equal(results[0].name, "Bengaluru Botanic Garden", "Closer place (~381m) must appear first");
  assert.equal(results[1].name, "Bengaluru Art Gallery", "Further place (~1.8km) must appear second");
  assert.ok(results[0].distance_meters < results[1].distance_meters, "Distances must be sorted ascending");
});

test("Phase 5C.4: Dynamic State Attribution (Zero Hardcoded Telangana)", () => {
  // 1. Nominatim address object with explicit state
  const apItem = {
    name: "Horsley Hills Resort",
    address: {
      state: "Andhra Pradesh",
      county: "Annamayya",
      country: "India",
    },
  };
  assert.equal(extractStateFromGeocode(apItem), "Andhra Pradesh", "Must extract Andhra Pradesh from address.state");

  const kaItem = {
    name: "Vidhana Soudha",
    address: {
      state: "Karnataka",
      city: "Bengaluru",
      country: "India",
    },
  };
  assert.equal(extractStateFromGeocode(kaItem), "Karnataka", "Must extract Karnataka from address.state");

  const tnItem = {
    name: "Meenakshi Temple",
    address: {
      state: "Tamil Nadu",
      city: "Madurai",
      country: "India",
    },
  };
  assert.equal(extractStateFromGeocode(tnItem), "Tamil Nadu", "Must extract Tamil Nadu from address.state");

  // 2. Photon / GeoJSON property state
  const klFeature = {
    properties: {
      name: "Munnar Tea Estate",
      state: "Kerala",
      country: "India",
    },
  };
  assert.equal(extractStateFromGeocode(klFeature), "Kerala", "Must extract Kerala from properties.state");

  // 3. Fallback to display_name parsing with known Indian states
  const displayNameAp = {
    display_name: "Horsley Hills, B.Kothakota, Annamayya, Andhra Pradesh, 517357, India",
  };
  assert.equal(
    extractStateFromGeocode(displayNameAp),
    "Andhra Pradesh",
    "Must parse Andhra Pradesh from comma-delimited display_name"
  );

  const displayNameTg = {
    display_name: "Charminar, Ghansi Bazaar, Hyderabad, Telangana, 500002, India",
  };
  assert.equal(
    extractStateFromGeocode(displayNameTg),
    "Telangana",
    "Must parse Telangana from comma-delimited display_name"
  );

  // 4. Assert zero hardcoded Telangana leakage for Andhra Pradesh venues
  assert.notEqual(
    extractStateFromGeocode(displayNameAp),
    "Telangana",
    "An Andhra Pradesh venue must NEVER be assigned Telangana"
  );
});
