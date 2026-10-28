import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LOCATION_CONFIG,
  CONFIDENCE_TIERS,
  classifyTelemetry,
  isConfirmedGpsFix,
  isLocationFresh,
  isLocationAccurate,
  requestCurrentLocation,
  getLocationState,
  LOCATION_STATES,
  __setExpoLocationForTesting,
  __resetLocationServiceForTesting,
} from "../frontend/lib/locationService.js";

const ROOT = process.cwd();

test("Phase 1.1: Standardized Location Telemetry Constants & Confidence Tiers", () => {
  assert.ok(LOCATION_CONFIG, "LOCATION_CONFIG must be exported");
  assert.equal(LOCATION_CONFIG.HIGH_ACCURACY_THRESHOLD_METERS, 150, "Accuracy threshold must be 150 meters");
  assert.equal(LOCATION_CONFIG.STALE_MAX_AGE_MS, 120000, "Stale age threshold must be 120,000ms");
  assert.equal(LOCATION_CONFIG.TIMEOUT_MS, 10000, "Timeout limit must be 10,000ms");

  assert.ok(CONFIDENCE_TIERS, "CONFIDENCE_TIERS must be exported");
  assert.equal(CONFIDENCE_TIERS.ACCURATE, "ACCURATE");
  assert.equal(CONFIDENCE_TIERS.COARSE, "COARSE");
  assert.equal(CONFIDENCE_TIERS.STALE, "STALE");
  assert.equal(CONFIDENCE_TIERS.TIMEOUT, "TIMEOUT");
  assert.equal(CONFIDENCE_TIERS.UNAVAILABLE, "UNAVAILABLE");
});

test("Phase 1.2: classifyTelemetry Classification Engine", () => {
  const accurateFix = {
    latitude: 13.0827,
    longitude: 80.2707,
    accuracy: 25,
    timestamp: Date.now() - 10000,
  };
  assert.equal(classifyTelemetry(accurateFix), CONFIDENCE_TIERS.ACCURATE);

  const coarseFix = {
    latitude: 13.0827,
    longitude: 80.2707,
    accuracy: 1200,
    timestamp: Date.now() - 10000,
  };
  assert.equal(classifyTelemetry(coarseFix), CONFIDENCE_TIERS.COARSE);

  const staleFix = {
    latitude: 13.0827,
    longitude: 80.2707,
    accuracy: 20,
    timestamp: Date.now() - 180000,
  };
  assert.equal(classifyTelemetry(staleFix), CONFIDENCE_TIERS.STALE);

  assert.equal(classifyTelemetry(null), CONFIDENCE_TIERS.UNAVAILABLE);
  assert.equal(classifyTelemetry({ latitude: 0, longitude: 0 }), CONFIDENCE_TIERS.UNAVAILABLE);
  assert.equal(classifyTelemetry({ latitude: 999, longitude: 80 }), CONFIDENCE_TIERS.UNAVAILABLE);
});

test("Phase 1.3: Web Geolocation Accuracy Gate: Browser IP/Wi-Fi Coarse Fixes Flagged", async () => {
  __resetLocationServiceForTesting();

  global.window = {
    isSecureContext: true,
    location: { hostname: "localhost" },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  Object.defineProperty(global, "navigator", {
    value: {
      geolocation: {
        getCurrentPosition: (success) => {
          success({
            coords: {
              latitude: 12.9716,
              longitude: 77.5946,
              accuracy: 2500,
            },
            timestamp: Date.now(),
          });
        },
      },
    },
    configurable: true,
    writable: true,
  });

  try {
    const fix = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(fix, "Must return fix object");
    assert.equal(fix.isCoarse, true, "Web fix with accuracy > 150m must be flagged isCoarse");
    assert.equal(fix.isProvisional, true, "Web fix with accuracy > 150m must be flagged isProvisional");
    assert.equal(fix.confidence, CONFIDENCE_TIERS.COARSE, "Web fix must have confidence tier COARSE");
    assert.equal(fix.accuracyRadiusMeters, 2500, "accuracyRadiusMeters must match coords.accuracy");

    const state = getLocationState();
    assert.notEqual(state.status, LOCATION_STATES.READY, "Coarse web fix must not promote status to READY");
    assert.equal(state.isCoarse, true, "State must reflect isCoarse: true");
    assert.ok(state.errorMessage && state.errorMessage.includes("Refining GPS accuracy"), "Must provide refining GPS status message");
  } finally {
    delete global.window;
    delete global.navigator;
    __resetLocationServiceForTesting();
  }
});

test("Phase 1.4: Native Android High-Accuracy vs Coarse Telemetry Contract", async () => {
  __resetLocationServiceForTesting();

  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => ({
      coords: { latitude: 12.8224, longitude: 80.0438, accuracy: 1800 },
      timestamp: Date.now() - 5000,
    }),
    getCurrentPositionAsync: async () => { throw new Error("GPS_TIMEOUT"); },
    watchPositionAsync: async () => { throw new Error("WATCH_TIMEOUT"); },
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const coarseResult = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(coarseResult, "Should return coarse fallback");
    assert.equal(coarseResult.isCoarse, true);
    assert.equal(coarseResult.confidence, CONFIDENCE_TIERS.COARSE);
    assert.equal(coarseResult.accuracyRadiusMeters, 1800);
  } finally {
    __resetLocationServiceForTesting();
  }

  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({
      coords: { latitude: 17.3850, longitude: 78.4867, accuracy: 18 },
      timestamp: Date.now(),
    }),
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const accurateResult = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(accurateResult, "Should return accurate fix");
    assert.equal(accurateResult.isCoarse, false);
    assert.equal(accurateResult.isProvisional, false);
    assert.equal(accurateResult.confidence, CONFIDENCE_TIERS.ACCURATE);
    assert.equal(accurateResult.accuracyRadiusMeters, 18);

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY);
    assert.equal(state.isCoarse, false);
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("Phase 1.5: Consuming Callers Coarse Fix Warning & User Choice Contract", () => {
  const editProfileSrc = fs.readFileSync(path.join(ROOT, "frontend/app/edit-profile.jsx"), "utf8");
  const profileTabSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/profile.jsx"), "utf8");
  const mapsSrc = fs.readFileSync(path.join(ROOT, "frontend/app/maps.jsx"), "utf8");

  assert.ok(
    editProfileSrc.includes("isCoarse") && editProfileSrc.includes("Approximate Location Warning"),
    "edit-profile.jsx must inspect isCoarse and provide Approximate Location Warning"
  );
  assert.ok(
    editProfileSrc.includes("Use Approximate"),
    "edit-profile.jsx must allow explicit user override choice"
  );

  assert.ok(
    profileTabSrc.includes("isCoarse") && profileTabSrc.includes("Approximate Location Warning"),
    "profile.jsx must inspect isCoarse and provide Approximate Location Warning"
  );
  assert.ok(
    profileTabSrc.includes("Use Approximate"),
    "profile.jsx must allow explicit user override choice"
  );

  assert.ok(
    mapsSrc.includes("isCoarseFix") && mapsSrc.includes("Approximate GPS fix"),
    "maps.jsx must detect coarse fix and surface approximate GPS notice to user"
  );
});