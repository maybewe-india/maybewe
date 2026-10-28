/**
 * GPS Indoor Lockout Remediation Test Suite
 * Validates:
 * 1. Poor accuracy (indoor fix > 150m): Resolves approximate location without hanging or claiming false precision.
 * 2. Cached fallback: Preserves valid prior location when current acquisition times out.
 * 3. Timeout handling: Bounded execution without indefinite hang or unhandled promise rejection.
 * 4. Permission denial: Signals PERMISSION_DENIED without injecting New Delhi or hardcoded cities.
 * 5. Recovery to accurate GPS: Automatically transitions from coarse to READY when accurate GPS arrives.
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
  requestCurrentLocation,
  getLocationState,
  subscribeLocation,
  __resetLocationServiceForTesting,
  __setExpoLocationForTesting,
} from "../frontend/lib/locationService.js";

test("1. Poor Accuracy (Indoor GPS Lockout): Indoor fix > 150m is accepted as approximate without hanging", async () => {
  __resetLocationServiceForTesting();

  // Simulate an indoor device: getLastKnownPositionAsync is null (cold start),
  // getCurrentPositionAsync returns indoor cell/Wi-Fi fix with 350m accuracy
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({
      coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 350 },
      timestamp: Date.now(),
    }),
    watchPositionAsync: async (options, callback) => {
      // Simulate watcher emitting same indoor accuracy
      setTimeout(() => {
        callback({
          coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 350 },
          timestamp: Date.now(),
        });
      }, 20);
      return { remove: () => {} };
    },
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const loc = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(loc, "Must return approximate indoor location instead of null or infinite hang");
    assert.equal(loc.latitude, 12.9716);
    assert.equal(loc.longitude, 77.5946);
    assert.equal(loc.isCoarse, true, "Must flag indoor fix as isCoarse");
    assert.equal(loc.isProvisional, true, "Must flag indoor fix as provisional");
    assert.equal(loc.confidence, CONFIDENCE_TIERS.COARSE, "Must classify confidence as COARSE");
    assert.equal(loc.accuracyRadiusMeters, 350, "Must report true 350m accuracy radius without claiming false precision");

    const state = getLocationState();
    assert.notEqual(state.status, LOCATION_STATES.READY, "Must NOT claim solid READY for 350m accuracy");
    assert.equal(state.isCoarse, true);
    assert.ok(state.errorMessage && state.errorMessage.includes("Refining GPS accuracy"), "Must provide refining message");
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("2. Cached Fallback on Timeout: Returns fresh cached location when GPS acquisition fails", async () => {
  __resetLocationServiceForTesting();

  const recentTimestamp = Date.now() - 15000; // 15 seconds old
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => ({
      coords: { latitude: 13.0827, longitude: 80.2707, accuracy: 40 },
      timestamp: recentTimestamp,
    }),
    getCurrentPositionAsync: async () => {
      throw new Error("NATIVE_GPS_TIMEOUT");
    },
    watchPositionAsync: async () => {
      throw new Error("NATIVE_HARDWARE_WATCH_TIMEOUT");
    },
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const loc = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(loc, "Must return valid cached fallback when current GPS times out");
    assert.equal(loc.latitude, 13.0827);
    assert.equal(loc.longitude, 80.2707);

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY);
    assert.equal(state.isReady, true);
    assert.equal(state.location.latitude, 13.0827);
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("3. Timeout Handling: Hardware watcher timeout terminates cleanly with error state and retry prompt", async () => {
  __resetLocationServiceForTesting();

  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => {
      throw new Error("NATIVE_GPS_TIMEOUT");
    },
    watchPositionAsync: async () => {
      throw new Error("NATIVE_HARDWARE_WATCH_TIMEOUT");
    },
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const loc = await requestCurrentLocation({ forceRefresh: true });
    assert.equal(loc, null, "Must return null when all providers time out with zero cached coordinates");

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.ERROR);
    assert.equal(state.isError, true);
    assert.ok(state.errorMessage && state.errorMessage.includes("Retry GPS"), "Must prompt user to Retry GPS");
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("4. Permission Denial Handling: Rejection sets PERMISSION_DENIED without injecting New Delhi or hardcoded cities", async () => {
  __resetLocationServiceForTesting();

  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "denied", canAskAgain: false }),
    Accuracy: { Balanced: 3 },
  }, { OS: "android" });

  try {
    const loc = await requestCurrentLocation({ forceRefresh: true });
    assert.equal(loc, null, "Must return null on permission denial");

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.PERMISSION_DENIED);
    assert.equal(state.isPermissionDenied, true);
    assert.equal(state.isPermanentlyDenied, true);

    // Verify no hardcoded city was injected into state.location
    assert.equal(state.location, null, "Must not fabricate a location on permission denial");
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("5. Recovery When Accurate GPS Becomes Available: Background watcher transitions coarse state to solid READY", async () => {
  __resetLocationServiceForTesting();

  let watchCallback = null;
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({
      // Step A: Device starts indoors with coarse 300m fix
      coords: { latitude: 17.3850, longitude: 78.4867, accuracy: 300 },
      timestamp: Date.now(),
    }),
    watchPositionAsync: async (options, callback) => {
      watchCallback = callback;
      return { remove: () => {} };
    },
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    // 1. Initial indoor lock
    const loc = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(loc);
    assert.equal(loc.isCoarse, true, "Initial indoor fix must be coarse");

    let currentState = getLocationState();
    assert.equal(currentState.isCoarse, true);

    // Subscribe to watch updates
    let latestEmittedState = null;
    const unsub = subscribeLocation((s) => {
      latestEmittedState = s;
    });

    // 2. User walks outdoors: watcher receives high-accuracy 12m fix
    assert.ok(watchCallback, "Active watcher callback must be registered");
    watchCallback({
      coords: { latitude: 17.3855, longitude: 78.4870, accuracy: 12 },
      timestamp: Date.now(),
    });

    // Verify state immediately promoted to READY
    const recoveredState = getLocationState();
    assert.equal(recoveredState.status, LOCATION_STATES.READY, "Must promote to READY on outdoor satellite fix");
    assert.equal(recoveredState.isReady, true);
    assert.equal(recoveredState.isCoarse, false, "isCoarse must clear to false");
    assert.equal(recoveredState.location.isCoarse, false);
    assert.equal(recoveredState.location.isProvisional, false);
    assert.equal(recoveredState.location.confidence, CONFIDENCE_TIERS.ACCURATE);
    assert.equal(recoveredState.location.accuracyRadiusMeters, 12);
    assert.equal(recoveredState.errorMessage, null, "Error message must clear to null");

    unsub();
  } finally {
    __resetLocationServiceForTesting();
  }
});
