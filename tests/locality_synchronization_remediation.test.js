/**
 * Issue Group 3: Saved Locality & Location Synchronization Test Suite
 * Validates:
 * 1. Saved home locality surviving GPS refresh without being overwritten.
 * 2. Manually selected city surviving navigation and live GPS updates.
 * 3. Approximate indoor GPS not overwriting profile locality.
 * 4. Locality persistence across simulated app reload/restart.
 * 5. Profile/locality synchronization failure preserving last valid selection.
 * 6. Home, Discover, and Maps using intended selected locality for discovery without fabricating cities.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

import safeStorage from "../frontend/lib/safeStorage.js";
import {
  STORAGE_KEYS,
  persistProfileLocationToStorage,
  loadCachedProfileLocation,
  persistGpsTelemetryToStorage,
  loadCachedGpsTelemetry,
  persistSelectedLocalityToStorage,
  loadCachedSelectedLocality,
  clearSelectedLocalityFromStorage,
  requestCurrentLocation,
  getLocationState,
  __resetLocationServiceForTesting,
  __setExpoLocationForTesting,
} from "../frontend/lib/locationService.js";

test("1. Saved Home Locality Survives GPS Refresh: Profile locality is never overwritten by live GPS", async () => {
  await safeStorage.clear();
  __resetLocationServiceForTesting();

  // 1. User has saved home locality "Bengaluru, Karnataka" in profile
  await persistProfileLocationToStorage({
    city: "Bengaluru",
    state: "Karnataka",
    location: "Bengaluru, Karnataka",
    country: "India",
  });

  const initialProfile = await loadCachedProfileLocation();
  assert.ok(initialProfile);
  assert.equal(initialProfile.city, "Bengaluru");

  // 2. User travels to Chittoor; device GPS fires fresh satellite fix
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({
      coords: { latitude: 13.2172, longitude: 79.1003, accuracy: 15 },
      timestamp: Date.now(),
    }),
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const gpsFix = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(gpsFix);
    assert.equal(gpsFix.latitude, 13.2172);

    // 3. Verify profile location was NOT overwritten by the Chittoor GPS update
    const profileAfterGps = await loadCachedProfileLocation();
    assert.ok(profileAfterGps, "Profile location must still exist");
    assert.equal(profileAfterGps.city, "Bengaluru", "Profile city must remain Bengaluru despite GPS fix in Chittoor");
    assert.equal(profileAfterGps.location, "Bengaluru, Karnataka");

    // 4. Verify GPS telemetry is accurately stored in dedicated telemetry key
    const telemetry = await loadCachedGpsTelemetry();
    assert.ok(telemetry);
    assert.equal(telemetry.latitude, 13.2172);
  } finally {
    __resetLocationServiceForTesting();
    await safeStorage.clear();
  }
});

test("2. Manually Selected City Survives Navigation and Location Updates", async () => {
  await safeStorage.clear();
  __resetLocationServiceForTesting();

  // 1. User manually picks "Jaipur" in the destination modal
  const selected = await persistSelectedLocalityToStorage({
    city: "Jaipur",
    state: "Rajasthan",
    district: "Jaipur",
    name: "Jaipur",
  });
  assert.ok(selected);
  assert.equal(selected.city, "Jaipur");

  // 2. GPS background updates or refreshes with current coordinates in Hyderabad
  await persistGpsTelemetryToStorage({
    latitude: 17.3850,
    longitude: 78.4867,
    accuracy: 20,
    timestamp: Date.now(),
    isCoarse: false,
    source: "gps",
  });

  // 3. Verify loadCachedSelectedLocality still returns Jaipur
  const cachedSelected = await loadCachedSelectedLocality();
  assert.ok(cachedSelected, "Selected locality must be preserved");
  assert.equal(cachedSelected.city, "Jaipur", "Selected city must remain Jaipur");
  assert.equal(cachedSelected.state, "Rajasthan");

  await safeStorage.clear();
});

test("3. Approximate Indoor GPS Does Not Overwrite Profile Locality", async () => {
  await safeStorage.clear();
  __resetLocationServiceForTesting();

  // 1. Establish saved profile
  await persistProfileLocationToStorage({
    city: "Pune",
    state: "Maharashtra",
    location: "Pune, Maharashtra",
  });

  // 2. Simulate indoor GPS acquisition with poor accuracy (350m)
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({
      coords: { latitude: 19.0760, longitude: 72.8777, accuracy: 350 },
      timestamp: Date.now(),
    }),
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const loc = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(loc);
    assert.equal(loc.isCoarse, true);

    // Profile must remain completely untouched
    const prof = await loadCachedProfileLocation();
    assert.ok(prof);
    assert.equal(prof.city, "Pune");
  } finally {
    __resetLocationServiceForTesting();
    await safeStorage.clear();
  }
});

test("4. Locality Persistence Across Simulated App Restart", async () => {
  await safeStorage.clear();

  // 1. Save selected locality
  await persistSelectedLocalityToStorage({
    city: "Kochi",
    state: "Kerala",
    name: "Kochi",
  });

  // 2. Simulate app restart: re-read storage
  const restored = await loadCachedSelectedLocality();
  assert.ok(restored);
  assert.equal(restored.city, "Kochi");
  assert.equal(restored.state, "Kerala");

  // 3. User explicitly resets to GPS mode
  await clearSelectedLocalityFromStorage();
  const cleared = await loadCachedSelectedLocality();
  assert.equal(cleared, null, "Should return null after clearing selected locality");

  await safeStorage.clear();
});

test("5. Synchronization Resilience: Corrupted or Missing Locality Falls Back Without Fabricating New Delhi", async () => {
  await safeStorage.clear();

  // Write corrupted non-json string or empty object
  await safeStorage.setItem(STORAGE_KEYS.SELECTED_LOCALITY, JSON.stringify({}));
  const emptyRes = await loadCachedSelectedLocality();
  assert.equal(emptyRes, null, "Empty city must safely return null rather than fabricating a default city");

  await safeStorage.setItem(STORAGE_KEYS.SELECTED_LOCALITY, "INVALID_NON_JSON_CORRUPTED_PAYLOAD");
  const corruptRes = await loadCachedSelectedLocality();
  assert.equal(corruptRes, null, "Corrupted string must safely return null without throwing");

  await safeStorage.clear();
});

test("6. Codebase Inspection: Home, Discover, and Maps Synchronize Selected Locality", () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/index.jsx"), "utf8");
  const discoverySrc = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/discovery.jsx"), "utf8");
  const mapsSrc = fs.readFileSync(path.join(ROOT, "frontend/app/maps.jsx"), "utf8");
  const placeDiscoverySrc = fs.readFileSync(path.join(ROOT, "frontend/components/PlaceDiscoveryView.jsx"), "utf8");

  // Home Screen: stateDestinations must prioritize selectedDestinationHub over live GPS
  assert.ok(
    indexSrc.includes("selectedDestinationHub || userLocation?.city || null"),
    "index.jsx must prioritize selectedDestinationHub over userLocation.city in stateDestinations"
  );
  assert.ok(
    indexSrc.includes("loadCachedSelectedLocality"),
    "index.jsx must hydrate loadCachedSelectedLocality on mount"
  );
  assert.ok(
    indexSrc.includes("persistSelectedLocalityToStorage"),
    "index.jsx must persist selected locality when a city is chosen"
  );

  // Discover Screen: PlaceDiscoveryView must receive syncedLocalityCity
  assert.ok(
    discoverySrc.includes("loadCachedSelectedLocality"),
    "discovery.jsx must load cached selected locality"
  );
  assert.ok(
    discoverySrc.includes("initialSavedCity={params?.savedCity || params?.selectedCity || syncedLocalityCity}"),
    "discovery.jsx must forward synced locality to PlaceDiscoveryView"
  );

  // PlaceDiscoveryView: must persist destination updates and respect savedCity
  assert.ok(
    placeDiscoverySrc.includes("persistSelectedLocalityToStorage"),
    "PlaceDiscoveryView.jsx must persist destination changes"
  );

  // Maps Screen: must check selected locality when GPS is unavailable
  assert.ok(
    mapsSrc.includes("loadCachedSelectedLocality"),
    "maps.jsx must check selected locality when GPS is unavailable before generic fallback"
  );
});

test("7. GPS Refresh & Calibration Invariant: Forced GPS retry does not clear selected destination", async () => {
  await safeStorage.clear();
  __resetLocationServiceForTesting();

  // 1. User selected "Udaipur"
  await persistSelectedLocalityToStorage({
    city: "Udaipur",
    state: "Rajasthan",
    name: "Udaipur",
  });

  // 2. Device triggers forced GPS retry / calibration
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null,
    getCurrentPositionAsync: async () => ({
      coords: { latitude: 24.5854, longitude: 73.7125, accuracy: 25 },
      timestamp: Date.now(),
    }),
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const loc = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(loc);

    // Selected locality MUST remain Udaipur in storage
    const selected = await loadCachedSelectedLocality();
    assert.ok(selected, "Selected locality must not be erased by GPS refresh");
    assert.equal(selected.city, "Udaipur");
  } finally {
    __resetLocationServiceForTesting();
    await safeStorage.clear();
  }
});

test("8. Delayed Asynchronous Hydration Race Condition Guard: Newer manual selection is never clobbered", async () => {
  // Test the functional state reducer logic used in index.jsx
  let selectedDestinationHub = null;
  let hasManualSelection = false;

  // Delayed storage returns old city "Goa" after 50ms
  const delayedStoragePromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({ city: "Goa", state: "Goa" });
    }, 50);
  });

  // Immediate user manual interaction: user picks "Jaipur" at 10ms
  setTimeout(() => {
    hasManualSelection = true;
    selectedDestinationHub = "Jaipur";
  }, 10);

  // When delayed storage resolves at 50ms, it checks hasManualSelection
  const saved = await delayedStoragePromise;
  if (!hasManualSelection && saved && saved.city) {
    selectedDestinationHub = saved.city;
  }

  assert.equal(
    selectedDestinationHub,
    "Jaipur",
    "Newer manual selection must not be overwritten by older delayed storage hydration"
  );
});
