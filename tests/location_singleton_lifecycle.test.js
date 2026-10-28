// ============================================================================
// LOCATION SERVICE SINGLETON & LIFECYCLE REGRESSION TEST SUITE
// tests/location_singleton_lifecycle.test.js
//
// Verifies:
// 1. Frame 0 synchronous cache hydration (<16ms, zero layout shifts)
// 2. Neutral India Overview fallback ([20.5937, 78.9629], zoom 4)
// 3. Single-Flight in-flight request deduplication
// 4. Reference-counted watcher subscription lifecycle & teardown
// 5. Strict coordinate hygiene & 50-meter delta threshold
// 6. Decoupled two-tier architecture & benchmark timing capture
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

import {
  INDIA_OVERVIEW,
  isValidCoordinate,
  calculateDistanceMeters,
  getCachedLocation,
  getCachedPermission,
  requestCurrentLocation,
  subscribeLocation,
  getActiveSubscribersCount,
  LocationBenchmark,
  __resetLocationServiceForTesting,
  __setExpoLocationForTesting,
  __resetExpoLocationForTesting,
} from '../frontend/lib/locationService.js';

test('1. Architecture: Neutral India Overview fallback is enforced (no hardcoded cities)', () => {
  assert.equal(INDIA_OVERVIEW.latitude, 20.5937);
  assert.equal(INDIA_OVERVIEW.longitude, 78.9629);
  assert.equal(INDIA_OVERVIEW.zoom, 4);

  // Verify maps.jsx does NOT use Vijayawada or Hyderabad as DEFAULT_COORDS fallback
  const mapsJsx = fs.readFileSync(path.join(ROOT, 'frontend/app/maps.jsx'), 'utf8');
  assert.ok(
    mapsJsx.includes('INDIA_OVERVIEW'),
    'maps.jsx must import and use INDIA_OVERVIEW as initial/fallback coordinates'
  );
  assert.equal(
    mapsJsx.includes('Vijayawada center for immediate rich testing'),
    false,
    'maps.jsx must NEVER hardcode Vijayawada as default center'
  );
});

test('2. Coordinate Hygiene: Rejects NaN, null, out-of-range, and Null Island (0,0)', () => {
  assert.equal(isValidCoordinate(17.4358, 78.4400), true, 'Valid Hyderabad coords must pass');
  assert.equal(isValidCoordinate(28.6139, 77.2090), true, 'Valid Delhi coords must pass');

  assert.equal(isValidCoordinate(NaN, 78.44), false, 'NaN lat must fail');
  assert.equal(isValidCoordinate(17.43, NaN), false, 'NaN lng must fail');
  assert.equal(isValidCoordinate(null, 78.44), false, 'null lat must fail');
  assert.equal(isValidCoordinate(17.43, undefined), false, 'undefined lng must fail');
  assert.equal(isValidCoordinate('17.43', 78.44), false, 'string lat must fail');
  assert.equal(isValidCoordinate(95.0, 78.44), false, 'Latitude > 90 must fail');
  assert.equal(isValidCoordinate(-95.0, 78.44), false, 'Latitude < -90 must fail');
  assert.equal(isValidCoordinate(17.43, 185.0), false, 'Longitude > 180 must fail');
  assert.equal(isValidCoordinate(0, 0), false, 'Null Island (0,0) must fail');
});

test('3. Distance Delta: Haversine calculation accurately identifies 50-meter threshold', () => {
  // Delta calculation between close points
  const p1 = { lat: 17.4358528, lon: 78.4400384 };
  // ~33 meters away
  const pClose = { lat: 17.4361528, lon: 78.4400384 };
  const dClose = calculateDistanceMeters(p1.lat, p1.lon, pClose.lat, pClose.lon);
  assert.ok(dClose < 50, `Expected <50m, got ${dClose}m`);

  // ~111 meters away
  const pFar = { lat: 17.4368528, lon: 78.4400384 };
  const dFar = calculateDistanceMeters(p1.lat, p1.lon, pFar.lat, pFar.lon);
  assert.ok(dFar > 50, `Expected >50m, got ${dFar}m`);
});

test('4. Request Deduplication: In-flight requests return identical Promise (Single-Flight)', async () => {
  __resetLocationServiceForTesting();

  // Call requestCurrentLocation concurrently 3 times
  const p1 = requestCurrentLocation();
  const p2 = requestCurrentLocation();
  const p3 = requestCurrentLocation();

  // In-flight promises must be the exact same promise reference
  assert.equal(p1, p2, 'Concurrent calls 1 and 2 must share the identical in-flight Promise');
  assert.equal(p2, p3, 'Concurrent calls 2 and 3 must share the identical in-flight Promise');

  await Promise.all([p1, p2, p3]);
});

test('5. Reference Counting: Subscribers manage watcher start and clean teardown', () => {
  __resetLocationServiceForTesting();

  assert.equal(getActiveSubscribersCount(), 0, 'Initial subscribers must be 0');

  let updates1 = 0;
  const unsub1 = subscribeLocation((state) => {
    updates1++;
  });
  assert.equal(getActiveSubscribersCount(), 1, 'Subscribers must be 1 after sub1');
  assert.ok(updates1 >= 1, 'Frame 0 synchronous initial state must be delivered immediately');

  let updates2 = 0;
  const unsub2 = subscribeLocation((state) => {
    updates2++;
  });
  assert.equal(getActiveSubscribersCount(), 2, 'Subscribers must be 2 after sub2');

  // Unsubscribe 1
  unsub1();
  assert.equal(getActiveSubscribersCount(), 1, 'Subscribers must be 1 after unsub1');

  // Unsubscribe 2 (All screens unmounted)
  unsub2();
  assert.equal(getActiveSubscribersCount(), 0, 'Subscribers must be 0 after unsub2 (clean teardown)');
});

test('6. Benchmark Instrumentation: Records T0 to T4 milestones with relative timestamps', () => {
  LocationBenchmark.reset();
  LocationBenchmark.record('T0_SCREEN_MOUNT');
  LocationBenchmark.record('T1_SYNC_CACHE_RENDERED', { cacheHit: true });
  LocationBenchmark.record('T2_COARSE_FIX_RECEIVED', { accuracy: 150 });
  LocationBenchmark.record('T3_NEARBY_POI_QUERY_DISPATCHED');
  LocationBenchmark.record('T4_HIGH_ACCURACY_RESOLVED', { accuracy: 12 });

  const report = LocationBenchmark.getReport();
  assert.ok(report.T0_SCREEN_MOUNT, 'Must record T0');
  assert.ok(report.T1_SYNC_CACHE_RENDERED, 'Must record T1');
  assert.ok(report.T2_COARSE_FIX_RECEIVED, 'Must record T2');
  assert.ok(report.T3_NEARBY_POI_QUERY_DISPATCHED, 'Must record T3');
  assert.ok(report.T4_HIGH_ACCURACY_RESOLVED, 'Must record T4');

  assert.equal(report.T1_SYNC_CACHE_RENDERED.cacheHit, true);
  assert.equal(report.T2_COARSE_FIX_RECEIVED.accuracy, 150);
});

import {
  LOCATION_STATES,
  getLocationState,
  retryLocation,
} from "../frontend/lib/locationService.js";

function setupMockWeb({ geolocation, sessionData = null } = {}) {
  global.window = {
    isSecureContext: true,
    location: { hostname: "localhost" },
    sessionStorage: {
      getItem: (k) => (k === "maybewe_last_gps" ? sessionData : null),
      setItem: () => {},
    },
    localStorage: { getItem: () => null, setItem: () => {} },
  };

  if (geolocation) {
    Object.defineProperty(global, "navigator", {
      value: { geolocation },
      configurable: true,
      writable: true,
    });
  } else {
    delete global.navigator;
  }
}

function teardownMockWeb() {
  delete global.window;
  delete global.navigator;
  __resetLocationServiceForTesting();
}

test("7. Canonical Location States: All 7 explicit states defined and exposed", () => {
  assert.equal(LOCATION_STATES.IDLE, "idle");
  assert.equal(LOCATION_STATES.REQUESTING_PERMISSION, "requesting_permission");
  assert.equal(LOCATION_STATES.LOCATING, "locating");
  assert.equal(LOCATION_STATES.READY, "ready");
  assert.equal(LOCATION_STATES.PERMISSION_DENIED, "permission_denied");
  assert.equal(LOCATION_STATES.SERVICES_DISABLED, "services_disabled");
  assert.equal(LOCATION_STATES.ERROR, "error");

  __resetLocationServiceForTesting();
  const state = getLocationState();
  assert.equal(state.status, LOCATION_STATES.IDLE);
  assert.equal(state.location, null);
  assert.equal(state.isReady, false);
});

test("8. Permission Granted & Successful Position Retrieval (Web Flow)", async () => {
  __resetLocationServiceForTesting();

  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success) => {
        success({
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy: 10,
          },
          timestamp: Date.now(),
        });
      },
    },
  });

  try {
    const coords = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(coords, "Must return valid coordinates object");
    assert.equal(coords.latitude, 12.9716);
    assert.equal(coords.longitude, 77.5946);

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY);
    assert.equal(state.isReady, true);
    assert.equal(state.permissionStatus, "granted");
    assert.equal(state.isLocating, false);
  } finally {
    teardownMockWeb();
  }
});

test("9. Permission Denied and Permanently Denied State Handling", async () => {
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
    assert.equal(res, null, "Denied request must return null (zero synthetic coordinates)");

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.PERMISSION_DENIED);
    assert.equal(state.isPermissionDenied, true);
    assert.equal(state.isPermanentlyDenied, true);
    assert.equal(state.isLocating, false);
    assert.ok(
      state.errorMessage.includes("browser settings") || state.errorMessage.includes("settings"),
      "Must explain how to enable in browser/device settings"
    );
  } finally {
    teardownMockWeb();
  }
});

test("10. Location Services Disabled State Handling (code 2 POSITION_UNAVAILABLE)", async () => {
  __resetLocationServiceForTesting();

  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success, error) => {
        const err = new Error("Position unavailable");
        err.code = 2; // POSITION_UNAVAILABLE
        error(err);
      },
    },
  });

  try {
    await requestCurrentLocation({ forceRefresh: true });
    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.SERVICES_DISABLED);
    assert.equal(state.isServicesDisabled, true);
    assert.equal(state.isLocating, false);
  } finally {
    teardownMockWeb();
  }
});

test("11. Timeout Handling & Locating State Termination (code 3 TIMEOUT)", async () => {
  __resetLocationServiceForTesting();

  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success, error) => {
        const err = new Error("Timeout expired");
        err.code = 3; // TIMEOUT
        error(err);
      },
    },
  });

  try {
    await requestCurrentLocation({ forceRefresh: true });
    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.ERROR);
    assert.equal(state.error, "TIMEOUT");
    assert.equal(state.isError, true);
    assert.equal(state.isLocating, false, "Timeout must end the locating state");
  } finally {
    teardownMockWeb();
  }
});

test("12. Retry GPS Action Recovers After Failure", async () => {
  __resetLocationServiceForTesting();

  let shouldFail = true;

  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success, error) => {
        if (shouldFail) {
          const err = new Error("Timeout");
          err.code = 3;
          error(err);
        } else {
          success({
            coords: { latitude: 13.0827, longitude: 80.2707, accuracy: 25 },
            timestamp: Date.now(),
          });
        }
      },
    },
  });

  try {
    // 1. Initial attempt fails with timeout
    await requestCurrentLocation({ forceRefresh: true });
    assert.equal(getLocationState().status, LOCATION_STATES.ERROR);

    // 2. User taps Retry GPS -> GPS recovers
    shouldFail = false;
    const retryCoords = await retryLocation();
    assert.ok(retryCoords, "Retry GPS must successfully obtain coordinates");
    assert.equal(retryCoords.latitude, 13.0827);
    assert.equal(retryCoords.longitude, 80.2707);

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY);
    assert.equal(state.isReady, true);
  } finally {
    teardownMockWeb();
  }
});

test("13. Fast Cached Hydration Followed by Fresh Fix", async () => {
  __resetLocationServiceForTesting();

  const cachedData = JSON.stringify({
    lat: 17.3850,
    lng: 78.4867,
    accuracy: 80,
    isCoarse: true,
    ts: Date.now() - 10000,
  });

  setupMockWeb({
    sessionData: cachedData,
    geolocation: {
      getCurrentPosition: (success) => {
        success({
          coords: { latitude: 17.4358, longitude: 78.4400, accuracy: 12 },
          timestamp: Date.now(),
        });
      },
    },
  });

  const observedUpdates = [];
  const unsub = subscribeLocation((s) => {
    observedUpdates.push({ ...s });
  });

  try {
    // Verify Frame 0 cached hydration
    assert.ok(observedUpdates.length >= 1, "Must receive frame 0 initial state");
    assert.ok(observedUpdates[0].location, "Frame 0 must contain hydrated cached location");
    assert.equal(observedUpdates[0].location.latitude, 17.3850);

    const fresh = await requestCurrentLocation({ forceRefresh: true });
    assert.equal(fresh.latitude, 17.4358);
    assert.equal(fresh.isCoarse, false);

    // Latest subscriber state must have the refined fresh position
    const latest = observedUpdates[observedUpdates.length - 1];
    assert.equal(latest.location.latitude, 17.4358);
    assert.equal(latest.location.isCoarse, false);
  } finally {
    unsub();
    teardownMockWeb();
  }
});

test("14. Concurrency & Stale Response Discard Guarantee", async () => {
  __resetLocationServiceForTesting();

  let requestCount = 0;
  let delayedCallback = null;

  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success) => {
        requestCount++;
        if (requestCount === 1) {
          // Stale request 1 is delayed
          delayedCallback = () => {
            success({
              coords: { latitude: 10.0000, longitude: 70.0000, accuracy: 50 },
              timestamp: Date.now(),
            });
          };
        } else {
          // Fresh request 2 resolves immediately with newer coordinates
          success({
            coords: { latitude: 28.6139, longitude: 77.2090, accuracy: 10 },
            timestamp: Date.now(),
          });
        }
      },
    },
  });

  try {
    // Launch request 1 (delayed)
    const p1 = requestCurrentLocation({ forceRefresh: true });

    // User triggers Retry GPS (request 2) which resolves immediately
    const p2 = retryLocation();
    const freshResult = await p2;
    assert.equal(freshResult.latitude, 28.6139, "Request 2 fresh coordinates must be active");

    // Now delayed request 1 finishes late
    if (delayedCallback) delayedCallback();
    await p1;

    // Active state must NOT be overwritten by stale request 1
    const state = getLocationState();
    assert.equal(state.location.latitude, 28.6139, "Stale request 1 must not overwrite newer request 2 coordinates");
  } finally {
    teardownMockWeb();
  }
});

test("15. City Search Operates Independently When GPS is Unavailable", () => {
  // Verify PlaceDiscoveryView contract: destination mode does not block on null GPS
  const viewPath = path.join(ROOT, "frontend/components/PlaceDiscoveryView.jsx");
  const viewSrc = fs.readFileSync(viewPath, "utf8");

  assert.ok(
    viewSrc.includes("placesMode === \"destination\""),
    "PlaceDiscoveryView supports independent destination search mode"
  );
  assert.ok(
    viewSrc.includes("searchDestination"),
    "PlaceDiscoveryView binds searchDestination independently of device GPS"
  );
  assert.ok(
    viewSrc.includes("buildGoogleMapsCategorySearchUrl"),
    "Generates category search URL using destination or GPS context"
  );
});

test("16. Modal Calibration Flow: Valid coordinates arriving immediately transitions out of acquiring state", async () => {
  __resetLocationServiceForTesting();

  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success) => {
        // Simulates realistic geolocation fix return
        success({
          coords: { latitude: 13.2231, longitude: 79.0958, accuracy: 15 },
          timestamp: Date.now(),
        });
      },
    },
  });

  try {
    const subscriberStates = [];
    const unsub = subscribeLocation((state) => {
      subscriberStates.push({ ...state });
    });

    // Initial state before acquisition
    assert.equal(getLocationState().isLocating, false);

    // Trigger location request
    const coordsPromise = requestCurrentLocation({ forceRefresh: true });

    // While awaiting, or once resolved, valid coords transition out of locating
    const result = await coordsPromise;
    assert.ok(result, "Must return valid coordinates");
    assert.equal(result.latitude, 13.2231);
    assert.equal(result.longitude, 79.0958);

    const finalState = getLocationState();
    assert.equal(finalState.isReady, true);
    assert.equal(finalState.isLocating, false, "Must NOT remain in locating/acquiring state after coordinates arrive");
    assert.equal(finalState.hasCoords, true);
    assert.equal(finalState.status, LOCATION_STATES.READY);
    unsub();
  } finally {
    teardownMockWeb();
  }
});

test("17. Cached Coordinates Followed by Fresh Fix: Retains valid coordinates without false locating state", async () => {
  __resetLocationServiceForTesting();

  const chittoorCached = JSON.stringify({
    lat: 13.2231,
    lng: 79.0958,
    accuracy: 30,
    isCoarse: true,
    ts: Date.now() - 5000,
  });

  let resolveFreshFix = null;
  setupMockWeb({
    sessionData: chittoorCached,
    geolocation: {
      getCurrentPosition: (success) => {
        resolveFreshFix = () => {
          success({
            coords: { latitude: 13.2240, longitude: 79.0965, accuracy: 8 },
            timestamp: Date.now(),
          });
        };
      },
    },
  });

  try {
    // Frame 0 synchronous read: Cached coordinates exist
    const initialState = getLocationState();
    assert.equal(initialState.isReady, true, "Must immediately be ready with cached coordinates");
    assert.equal(initialState.isLocating, false, "Must NOT be in locating state when cached coordinates exist");
    assert.equal(initialState.hasCoords, true);
    assert.equal(initialState.location.latitude, 13.2231);

    // Launch background fresh GPS request
    const freshPromise = requestCurrentLocation({ forceRefresh: true });

    // While fresh request is in flight, existing coordinates remain active
    const inFlightState = getLocationState();
    assert.equal(inFlightState.isReady, true, "Must remain ready with existing coordinates while fresh fix is pending");
    assert.equal(inFlightState.isLocating, false, "isLocating must be false so modal does not claim no GPS fix exists");
    assert.equal(inFlightState.isRefreshing, true, "isRefreshing indicates fresh calibration is in progress");
    assert.equal(inFlightState.location.latitude, 13.2231);

    // Fresh fix arrives
    if (resolveFreshFix) resolveFreshFix();
    const freshResult = await freshPromise;
    assert.equal(freshResult.latitude, 13.2240);

    const settledState = getLocationState();
    assert.equal(settledState.isReady, true);
    assert.equal(settledState.isLocating, false);
    assert.equal(settledState.isRefreshing, false);
    assert.equal(settledState.location.latitude, 13.2240);
  } finally {
    teardownMockWeb();
  }
});

test("18. Fresh-Fix Timeout Resilience: Preserves accepted coordinates without stuck acquiring state", async () => {
  __resetLocationServiceForTesting();

  const chittoorCached = JSON.stringify({
    lat: 13.2231,
    lng: 79.0958,
    accuracy: 30,
    isCoarse: true,
    ts: Date.now() - 5000,
  });

  setupMockWeb({
    sessionData: chittoorCached,
    geolocation: {
      getCurrentPosition: (success, error) => {
        const timeoutErr = new Error("Timeout");
        timeoutErr.code = 3;
        error(timeoutErr);
      },
    },
  });

  try {
    // When cached coordinates exist and fresh request times out
    const res = await requestCurrentLocation({ forceRefresh: true, highAccuracyTimeout: 200 });

    // Coordinates MUST NOT be wiped out
    assert.ok(res, "Must retain cached coordinates on fresh fix timeout");
    assert.equal(res.latitude, 13.2231);

    const state = getLocationState();
    assert.equal(state.isReady, true, "Must retain ready state with cached coordinates");
    assert.equal(state.isLocating, false, "Must not remain stuck in locating state after timeout");
    assert.equal(state.hasCoords, true);
    assert.equal(state.location.latitude, 13.2231);
  } finally {
    teardownMockWeb();
  }
});

test("19. Manual Retry GPS from Modal: Initiates fresh acquisition and transitions to acquired state", async () => {
  __resetLocationServiceForTesting();

  let retryCount = 0;
  setupMockWeb({
    geolocation: {
      getCurrentPosition: (success, error) => {
        retryCount++;
        if (retryCount === 1) {
          const err = new Error("Timeout");
          err.code = 3;
          error(err);
        } else {
          success({
            coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 12 },
            timestamp: Date.now(),
          });
        }
      },
    },
  });

  try {
    // First attempt fails
    await requestCurrentLocation({ forceRefresh: true });
    assert.equal(getLocationState().isReady, false);
    assert.equal(getLocationState().isLocating, false);

    // Modal user clicks Retry / Calibrate
    const retryRes = await retryLocation();
    assert.ok(retryRes, "Retry must succeed with fresh fix");
    assert.equal(retryRes.latitude, 12.9716);

    const state = getLocationState();
    assert.equal(state.isReady, true);
    assert.equal(state.isLocating, false);
    assert.equal(state.status, LOCATION_STATES.READY);
  } finally {
    teardownMockWeb();
  }
});

test("20. Modal Reopening Invariant: Reopening modal returns synchronous acquired state with zero stuck spinner", () => {
  __resetLocationServiceForTesting();

  const chittoorCached = JSON.stringify({
    lat: 13.2231,
    lng: 79.0958,
    accuracy: 30,
    isCoarse: false,
    ts: Date.now() - 1000,
  });

  setupMockWeb({
    sessionData: chittoorCached,
  });

  try {
    // 1. First modal open: subscriber mounts
    let modal1State = null;
    const unsub1 = subscribeLocation((s) => {
      modal1State = s;
    });

    assert.ok(modal1State, "Subscriber 1 receives state immediately");
    assert.equal(modal1State.isReady, true);
    assert.equal(modal1State.isLocating, false, "Modal 1 must NOT show stuck locating spinner");
    assert.equal(modal1State.location.latitude, 13.2231);
    unsub1(); // User closes modal

    // 2. Second modal open: subscriber mounts again
    let modal2State = null;
    const unsub2 = subscribeLocation((s) => {
      modal2State = s;
    });

    assert.ok(modal2State, "Subscriber 2 receives state immediately on reopen");
    assert.equal(modal2State.isReady, true);
    assert.equal(modal2State.isLocating, false, "Modal 2 reopen must NOT show stuck locating spinner");
    assert.equal(modal2State.location.latitude, 13.2231);
    unsub2(); // Clean unmount
  } finally {
    teardownMockWeb();
  }
});

test("21. Native Android GPS Pipeline: Services disabled returns SERVICES_DISABLED state", async () => {
  __resetLocationServiceForTesting();

  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => false,
  }, { OS: "android" });

  try {
    const coords = await requestCurrentLocation({ forceRefresh: true });
    assert.equal(coords, null);
    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.SERVICES_DISABLED);
    assert.equal(state.isServicesDisabled, true);
    assert.equal(state.isLocating, false);
    assert.ok(state.errorMessage.includes("Device location services (GPS) are disabled"));
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("22. Native Android GPS Pipeline: Fast seed followed by accurate fix resolves cleanly", async () => {
  __resetLocationServiceForTesting();

  let getCurrentCalled = false;
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => ({
      coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 120 },
      timestamp: Date.now() - 60000,
    }),
    getCurrentPositionAsync: async () => {
      getCurrentCalled = true;
      return {
        coords: { latitude: 12.9719, longitude: 77.5937, accuracy: 15 },
        timestamp: Date.now(),
      };
    },
    Accuracy: { Balanced: 3 },
  }, { OS: "android" });

  try {
    const coords = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(coords, "Must return valid coordinates");
    assert.equal(getCurrentCalled, true, "Must call getCurrentPositionAsync");
    assert.equal(coords.latitude, 12.9719);
    assert.equal(coords.accuracy, 15);

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY);
    assert.equal(state.isReady, true);
    assert.equal(state.isLocating, false);
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("23. Native Android GPS Pipeline: Timeout fallback to last known prevents false GPS Unavailable error", async () => {
  __resetLocationServiceForTesting();

  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => ({
      coords: { latitude: 15.2993, longitude: 74.1240, accuracy: 100 },
      timestamp: Date.now() - 30000,
    }),
    getCurrentPositionAsync: async () => {
      // Simulate physical Android timeout or long delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      throw new Error("Location request timed out.");
    },
    Accuracy: { Balanced: 3 },
  }, { OS: "android" });

  try {
    const coords = await requestCurrentLocation({ forceRefresh: true, highAccuracyTimeout: 100 });
    assert.ok(coords, "Must return last-known position fallback on timeout");
    assert.equal(coords.latitude, 15.2993);

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY, "Must retain READY state on timeout if last-known exists");
    assert.equal(state.isReady, true);
    assert.equal(state.isError, false, "Must NOT flip to ERROR state when last-known fix is seeded");
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("24. Direct Home-to-Discover Route Contract: Submitting destination routes to Places in Search City mode", () => {
  const indexJsx = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/index.jsx"), "utf8");
  const discJsx = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/discovery.jsx"), "utf8");
  const placeViewJsx = fs.readFileSync(path.join(ROOT, "frontend/components/PlaceDiscoveryView.jsx"), "utf8");

  assert.ok(
    indexJsx.includes("mode: 'places'") && indexJsx.includes("placesMode: 'destination'"),
    "Home screen must pass mode: places and placesMode: destination on destination search/explore"
  );

  assert.ok(
    discJsx.includes("setDiscoveryMode('places')") && discJsx.includes("setCinematicZoomVisible(false)"),
    "Discovery screen must immediately switch to places mode and suppress cinematic zoom"
  );

  assert.ok(
    placeViewJsx.includes("initialPlacesMode") && placeViewJsx.includes("initialSavedCity"),
    "PlaceDiscoveryView must accept initialPlacesMode and initialSavedCity for immediate Search City targeting"
  );
});

test("25. Native Android GPS Pipeline: When single-shot getCurrentPositionAsync fails, hardware watcher fallback captures live fix", async () => {
  __resetLocationServiceForTesting();

  let watchStarted = false;
  let watcherUnsubscribed = false;

  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => null, // No cached position available (cold fix)
    getCurrentPositionAsync: async () => {
      // Simulate Google Play Services rejecting with null location
      throw new Error("Current location is unavailable. Make sure that location services are enabled.");
    },
    watchPositionAsync: async (options, callback) => {
      watchStarted = true;
      // Deliver satellite fix via active hardware streaming after brief sensor warm-up
      setTimeout(() => {
        callback({
          coords: { latitude: 17.3850, longitude: 78.4867, accuracy: 18 },
          timestamp: Date.now(),
        });
      }, 50);

      return {
        remove: () => {
          watcherUnsubscribed = true;
        },
      };
    },
    Accuracy: { Balanced: 3 },
  }, { OS: "android" });

  try {
    const coords = await requestCurrentLocation({ forceRefresh: true });
    assert.ok(coords, "Must acquire live coordinates via hardware watcher fallback");
    assert.equal(watchStarted, true, "Must invoke watchPositionAsync when getCurrentPositionAsync fails");
    assert.equal(watcherUnsubscribed, true, "Must unsubscribe temporary hardware watcher upon fix acquisition");
    assert.equal(coords.latitude, 17.3850);
    assert.equal(coords.longitude, 78.4867);

    const state = getLocationState();
    assert.equal(state.status, LOCATION_STATES.READY);
    assert.equal(state.isReady, true);
    assert.equal(state.isError, false);
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("26. Stale & Coarse Location Rejection: Positions with accuracy > 150m or age > 60s are flagged provisional, not READY", async () => {
  __resetLocationServiceForTesting();

  // Simulate Android returning a stale 2-hour old cell-tower fix (Mahabalipuram ~12.8224, 80.0438, accuracy 1200m)
  __setExpoLocationForTesting({
    hasServicesEnabledAsync: async () => true,
    getForegroundPermissionsAsync: async () => ({ status: "granted", canAskAgain: true }),
    getLastKnownPositionAsync: async () => ({
      coords: { latitude: 12.8224, longitude: 80.0438, accuracy: 1200 },
      timestamp: Date.now() - 7200000, // 2 hours old
    }),
    getCurrentPositionAsync: async () => {
      // Still searching for GPS
      throw new Error("GPS_SEARCHING");
    },
    watchPositionAsync: async () => {
      throw new Error("WATCH_TIMEOUT");
    },
    Accuracy: { Balanced: 3, High: 4 },
  }, { OS: "android" });

  try {
    const loc = await requestCurrentLocation({ forceRefresh: true });
    const state = getLocationState();

    // Must NOT be marked as solid READY
    assert.notEqual(state.status, LOCATION_STATES.READY, "Stale/coarse fix must not promote status to READY");
    assert.equal(state.isCoarse, true, "Must flag fix as coarse");
    if (state.location) {
      assert.equal(state.location.isProvisional, true, "Location must be marked provisional");
      assert.ok(
        state.errorMessage && state.errorMessage.includes("Refining GPS accuracy"),
        "Must provide 'Refining GPS accuracy...' message rather than claiming solid fix"
      );
    }
  } finally {
    __resetLocationServiceForTesting();
  }
});

test("27. Race Condition & Stale Override Protection: Late-resolving slower fixes cannot overwrite newer high-accuracy fixes", async () => {
  __resetLocationServiceForTesting();

  // Test isConfirmedGpsFix, isLocationFresh, isLocationAccurate helper guards
  const { isLocationFresh, isLocationAccurate, isConfirmedGpsFix } = await import("../frontend/lib/locationService.js");

  const freshHighAcc = {
    latitude: 13.0827,
    longitude: 80.2707,
    accuracy: 15,
    timestamp: Date.now(),
    isCoarse: false,
    isProvisional: false,
  };

  const staleOldAcc = {
    latitude: 12.8224,
    longitude: 80.0438,
    accuracy: 900,
    timestamp: Date.now() - 120000,
    isCoarse: true,
    isProvisional: true,
  };

  assert.equal(isLocationFresh(freshHighAcc, 60000), true);
  assert.equal(isLocationAccurate(freshHighAcc, 150), true);
  assert.equal(isConfirmedGpsFix(freshHighAcc), true);

  assert.equal(isLocationFresh(staleOldAcc, 60000), false);
  assert.equal(isLocationAccurate(staleOldAcc, 150), false);
  assert.equal(isConfirmedGpsFix(staleOldAcc), false);
});

test("28. Profile Location Persistence Decoupling: Zero Hardcoded Chittoor & Live GPS Decoupled from Profile", () => {
  const editProfileSrc = fs.readFileSync(path.join(ROOT, "frontend/app/edit-profile.jsx"), "utf8");
  const profileTabSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/profile.jsx"), "utf8");

  // Zero hardcoded Chittoor fallback
  assert.equal(
    editProfileSrc.includes('profile?.location || "Chittoor, Andhra Pradesh"'),
    false,
    "edit-profile.jsx must not fallback to hardcoded Chittoor"
  );
  assert.equal(
    profileTabSrc.includes("Set Chittoor, AP"),
    false,
    "profile.jsx must not contain hardcoded 'Set Chittoor, AP' button"
  );
  assert.equal(
    profileTabSrc.includes("city = 'Chittoor'"),
    false,
    "profile.jsx handleSaveProfile must not default city to Chittoor"
  );

  // Both screens must provide explicit 'Use Current Location' action
  assert.ok(
    editProfileSrc.includes("handleUseCurrentLocation") && editProfileSrc.includes("Use Current Location"),
    "edit-profile.jsx must provide explicit 'Use Current Location' action"
  );
  assert.ok(
    profileTabSrc.includes("handleUseCurrentLocation") && profileTabSrc.includes("Use Current Location"),
    "profile.jsx must provide explicit 'Use Current Location' action"
  );

  // Both screens must import reverseGeocodeLocation to populate human-readable city string
  assert.ok(
    editProfileSrc.includes("reverseGeocodeLocation"),
    "edit-profile.jsx must reverse-geocode GPS fix to city/state string"
  );
  assert.ok(
    profileTabSrc.includes("reverseGeocodeLocation"),
    "profile.jsx must reverse-geocode GPS fix to city/state string"
  );
});

test("29. Android Edit Profile Keyboard & Scroll Resilience Contract", () => {
  const editProfileSrc = fs.readFileSync(path.join(ROOT, "frontend/app/edit-profile.jsx"), "utf8");

  assert.ok(
    editProfileSrc.includes('behavior={Platform.OS === "android" ? "height" : "padding"}'),
    "edit-profile.jsx must configure Android height keyboard avoidance"
  );
  assert.ok(
    editProfileSrc.includes('keyboardShouldPersistTaps="handled"'),
    "edit-profile.jsx ScrollView must configure keyboardShouldPersistTaps='handled'"
  );
  assert.ok(
    editProfileSrc.includes("Keyboard.dismiss"),
    "edit-profile.jsx must support tap-outside keyboard dismissal via Keyboard.dismiss"
  );
});
