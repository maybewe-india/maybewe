/**
 * Phase 5A Focused Regression Test Suite
 * Validates:
 * 1. Accuracy validation: Negative, zero, missing, non-finite accuracy values rejected.
 * 2. 150m threshold: Valid positive accuracy up to 150m passes, > 150m classified as COARSE.
 * 3. Mock provider flags: Rejection only when supported flag is present; ordinary fixes preserved.
 * 4. Browser timeout path: Fresh cache returned, stale cache rejected with null and error preserved.
 * 5. Coarse GPS map protection: Approximate fixes trigger warning without tight zoom or POI queries.
 * 6. Permission denied & retry invariants: No regressions to denied state or retry flows.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

import {
  LOCATION_STATES,
  LOCATION_CONFIG,
  CONFIDENCE_TIERS,
  classifyTelemetry,
  isLocationAccurate,
  isLocationFresh,
  isConfirmedGpsFix,
  requestCurrentLocation,
  getLocationState,
  retryLocation,
  __resetLocationServiceForTesting,
  __setExpoLocationForTesting,
} from "../frontend/lib/locationService.js";

// Helper for Web Geolocation mocking
function setupMockWeb({ geolocation, sessionData = null, localData = null } = {}) {
  global.window = {
    isSecureContext: true,
    location: { hostname: "localhost" },
    sessionStorage: {
      getItem: (k) => (k === "maybewe_last_gps" ? sessionData : null),
      setItem: () => {},
      removeItem: () => {},
    },
    localStorage: {
      getItem: (k) => (k === "@maybewe_gps_telemetry" ? localData : null),
      setItem: () => {},
      removeItem: () => {},
    },
  };
  const geo = geolocation || {
    getCurrentPosition: (success) => {
      success({
        coords: { latitude: 13.0827, longitude: 80.2707, accuracy: 25 },
        timestamp: Date.now(),
      });
    },
    watchPosition: () => 1,
    clearWatch: () => {},
  };
  Object.defineProperty(global, "navigator", {
    value: { geolocation: geo },
    configurable: true,
    writable: true,
  });
}

function teardownMockWeb() {
  delete global.window;
  delete global.navigator;
  __resetLocationServiceForTesting();
}

test("Phase 5A.1: Accuracy Validation — Negative, Zero, Missing & Non-Finite Accuracy Rejection", () => {
  // Non-finite, zero, and negative values must be rejected by isLocationAccurate
  assert.equal(isLocationAccurate({ accuracy: -1 }, 150), false, "Negative accuracy (-1) must be rejected");
  assert.equal(isLocationAccurate({ accuracy: -0.01 }, 150), false, "Negative decimal accuracy must be rejected");
  assert.equal(isLocationAccurate({ accuracy: 0 }, 150), false, "Zero accuracy (0) must be rejected");
  assert.equal(isLocationAccurate({ accuracy: NaN }, 150), false, "NaN accuracy must be rejected");
  assert.equal(isLocationAccurate({ accuracy: Infinity }, 150), false, "Infinity accuracy must be rejected");
  assert.equal(isLocationAccurate({ accuracy: -Infinity }, 150), false, "-Infinity accuracy must be rejected");
  assert.equal(isLocationAccurate({ accuracy: undefined }, 150), false, "undefined accuracy must be rejected");
  assert.equal(isLocationAccurate({ accuracy: null }, 150), false, "null accuracy must be rejected");
  assert.equal(isLocationAccurate({ accuracy: "50" }, 150), false, "string accuracy must be rejected");
  assert.equal(isLocationAccurate(null, 150), false, "null location must be rejected");
  assert.equal(isLocationAccurate({}, 150), false, "empty location object must be rejected");

  // classifyTelemetry must NEVER label invalid accuracy as ACCURATE
  const baseLoc = { latitude: 13.0827, longitude: 80.2707, timestamp: Date.now() };

  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: -1 }),
    CONFIDENCE_TIERS.COARSE,
    "classifyTelemetry with negative accuracy must be COARSE, not ACCURATE"
  );
  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: 0 }),
    CONFIDENCE_TIERS.COARSE,
    "classifyTelemetry with zero accuracy must be COARSE, not ACCURATE"
  );
  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: NaN }),
    CONFIDENCE_TIERS.COARSE,
    "classifyTelemetry with NaN accuracy must be COARSE, not ACCURATE"
  );
  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: undefined }),
    CONFIDENCE_TIERS.COARSE,
    "classifyTelemetry with missing accuracy must be COARSE, not ACCURATE"
  );
});

test("Phase 5A.2: Valid Positive Accuracy & 150-Metre Threshold Compliance", () => {
  // Valid positive accuracy within 150m passes
  assert.equal(isLocationAccurate({ accuracy: 5 }, 150), true, "5m accuracy must pass");
  assert.equal(isLocationAccurate({ accuracy: 20 }, 150), true, "20m accuracy must pass");
  assert.equal(isLocationAccurate({ accuracy: 150 }, 150), true, "150m boundary accuracy must pass");

  // Accuracies > 150m fail threshold
  assert.equal(isLocationAccurate({ accuracy: 150.1 }, 150), false, "150.1m accuracy must fail");
  assert.equal(isLocationAccurate({ accuracy: 500 }, 150), false, "500m accuracy must fail");
  assert.equal(isLocationAccurate({ accuracy: 1500 }, 150), false, "1500m accuracy must fail");

  // classifyTelemetry classification
  const baseLoc = { latitude: 13.0827, longitude: 80.2707, timestamp: Date.now() };

  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: 10 }),
    CONFIDENCE_TIERS.ACCURATE,
    "10m accuracy must classify as ACCURATE"
  );
  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: 150 }),
    CONFIDENCE_TIERS.ACCURATE,
    "150m boundary must classify as ACCURATE"
  );
  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: 151 }),
    CONFIDENCE_TIERS.COARSE,
    "151m must classify as COARSE"
  );

  // Stale age overrides accurate radius
  assert.equal(
    classifyTelemetry({ ...baseLoc, accuracy: 10, timestamp: Date.now() - 300000 }),
    CONFIDENCE_TIERS.STALE,
    "Fix older than STALE_MAX_AGE_MS must classify as STALE regardless of accuracy"
  );

  // Invalid coordinates always UNAVAILABLE
  assert.equal(
    classifyTelemetry({ latitude: 0, longitude: 0, accuracy: 10 }),
    CONFIDENCE_TIERS.UNAVAILABLE,
    "Null island coordinates must classify as UNAVAILABLE"
  );
});

test("Phase 5A.3: Mock Provider Flag Detection & Selective Rejection", () => {
  const accurateBase = {
    latitude: 13.0827,
    longitude: 80.2707,
    accuracy: 10,
    timestamp: Date.now(),
    isCoarse: false,
    isProvisional: false,
  };

  // When mock flags are reliably present and true, fix must be rejected
  assert.equal(isConfirmedGpsFix({ ...accurateBase, mocked: true }), false, "mocked: true must be rejected");
  assert.equal(isConfirmedGpsFix({ ...accurateBase, isFromMockProvider: true }), false, "isFromMockProvider: true must be rejected");
  assert.equal(isConfirmedGpsFix({ ...accurateBase, isMock: true }), false, "isMock: true must be rejected");
  assert.equal(isConfirmedGpsFix({ ...accurateBase, coords: { mocked: true } }), false, "coords.mocked: true must be rejected");

  // Ordinary fixes without mock flags or with mocked: false must be ACCEPTED
  assert.equal(isConfirmedGpsFix({ ...accurateBase, mocked: false }), true, "mocked: false must be accepted");
  assert.equal(isConfirmedGpsFix({ ...accurateBase }), true, "Absent mock flag must be accepted");
});

test("Phase 5A.4: Browser Geolocation Timeout — Fresh vs Stale Cached Location", async () => {
  __resetLocationServiceForTesting();

  // 1. Stale cached fix (> 2 minutes old) must NOT be returned on timeout; return null and set TIMEOUT error
  const staleTimestamp = Date.now() - 300000; // 5 minutes old
  const staleSession = JSON.stringify({
    lat: 12.9716,
    lng: 77.5946,
    accuracy: 30,
    isCoarse: false,
    ts: staleTimestamp,
  });

  setupMockWeb({
    sessionData: staleSession,
    geolocation: {
      getCurrentPosition: (success, error) => {
        // Simulates timeout by never resolving within timeout interval
      },
    },
  });

  try {
    const result = await requestCurrentLocation({
      forceRefresh: true,
      highAccuracyTimeout: 80, // fast timeout for test
    });

    assert.equal(result, null, "Stale cache must NOT be returned on browser timeout; must return null");
    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.ERROR, "State must be ERROR on timeout");
    assert.equal(state.error, "TIMEOUT", "Error code must be TIMEOUT");
    assert.equal(state.isError, true);
  } finally {
    teardownMockWeb();
  }

  // 2. Fresh cached fix (< 2 minutes old) CAN be safely returned on timeout
  __resetLocationServiceForTesting();
  const freshTimestamp = Date.now() - 10000; // 10 seconds old
  const freshSession = JSON.stringify({
    lat: 13.0827,
    lng: 80.2707,
    accuracy: 25,
    isCoarse: false,
    ts: freshTimestamp,
  });

  setupMockWeb({
    sessionData: freshSession,
    geolocation: {
      getCurrentPosition: (success, error) => {
        // Simulates timeout
      },
    },
  });

  try {
    const result = await requestCurrentLocation({
      forceRefresh: true,
      highAccuracyTimeout: 80,
    });

    assert.ok(result, "Fresh cache under maximum age may be returned on timeout");
    assert.equal(result.latitude, 13.0827);
  } finally {
    teardownMockWeb();
  }
});

test("Phase 5A.5: Coarse Fix Protection & Map Behavior Contract", () => {
  const mapsJsx = fs.readFileSync(path.join(ROOT, "frontend/app/maps.jsx"), "utf8");

  // Verify coarse fix guards against tight zoom 15 and POI query
  assert.ok(
    mapsJsx.includes("!isCoarseFix"),
    "maps.jsx must conditionally branch on !isCoarseFix"
  );

  // In requestDeviceGps, verify that only !isCoarseFix triggers tight zoom 15 and loadPlacesAround
  const coarsePanBlock = mapsJsx.slice(
    mapsJsx.indexOf("if (andPan)"),
    mapsJsx.indexOf("if (andPan)") + 600
  );
  assert.ok(
    coarsePanBlock.includes("zoom: 11"),
    "Approximate/coarse fixes must use broad regional zoom (11), not tight zoom (15)"
  );

  // Verify warning toast is shown for coarse fix
  assert.ok(
    mapsJsx.includes("Approximate GPS fix"),
    "maps.jsx must preserve approximate GPS warning banner"
  );

  // Verify India overview fallback on mount is preserved
  assert.ok(
    mapsJsx.includes("loadPlacesAround(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude"),
    "Neutral India overview fallback must be preserved"
  );
});

test("Phase 5A.6: Permission Denied & Retry Invariants", async () => {
  __resetLocationServiceForTesting();

  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success, error) => {
        const err = new Error("User denied Geolocation");
        err.code = 1; // PERMISSION_DENIED
        error(err);
      },
    },
  });

  try {
    const res = await requestCurrentLocation({ forceRefresh: true });
    assert.equal(res, null, "Permission denied must resolve null");
    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.PERMISSION_DENIED);
    assert.equal(state.isPermissionDenied, true);
    assert.equal(state.canAskAgain, false);
  } finally {
    teardownMockWeb();
  }

  // Retry location clears error state and allows re-attempt
  __resetLocationServiceForTesting();
  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success) => {
        success({
          coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 20 },
          timestamp: Date.now(),
        });
      },
    },
  });

  try {
    const retryRes = await retryLocation();
    assert.ok(retryRes, "Retry must successfully acquire location");
    assert.equal(retryRes.latitude, 12.9716);
    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY);
    assert.equal(state.error, null);
  } finally {
    teardownMockWeb();
  }
});
