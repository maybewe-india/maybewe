// ============================================================================
// MAYBEWE CENTRALIZED LOCATION MANAGER & SHARED SINGLETON SERVICE
// frontend/lib/locationService.js
//
// Solves GPS Waterfall & Competing Hardware Calls:
// 1. Single-flight in-flight request deduplication
// 2. Reference-counted background location watcher
// 3. Synchronous cached coordinate hydration (<16ms Frame 0)
// 4. In-memory permission caching (zero redundant OS prompts)
// 5. Decoupled two-tier acquisition (Coarse <300ms -> Refined >50m delta)
// 6. Decoupled asynchronous reverse geocoding
// ============================================================================

import AsyncStorage from './safeStorage.js';

// Safe dynamic access to Platform & expo-location for cross-platform & Node.js test runner
let Platform = { OS: typeof window !== 'undefined' ? 'web' : 'node' };
try {
  const rn = require('react-native');
  if (rn && rn.Platform) Platform = rn.Platform;
} catch (e) {}

let ExpoLocation = null;
try {
  ExpoLocation = require('expo-location');
} catch (e) {}

// Neutral India overview fallback — NEVER hardcode a city like Vijayawada/Hyderabad
export const INDIA_OVERVIEW = {
  latitude: 20.5937,
  longitude: 78.9629,
  zoom: 4,
};

export const STORAGE_KEYS = {
  ASYNC_LOCATION: '@maybewe_user_location',
  SESSION_GPS: 'maybewe_last_gps',
};

// Benchmark instrumentation recorder for real runtime milestones
export const LocationBenchmark = {
  timings: {},
  record(event, meta = {}) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.timings[event] = {
      timestamp: Date.now(),
      relativeMs: now,
      ...meta,
    };
    if (typeof window !== 'undefined') {
      window.__MAYBEWE_LOCATION_TIMINGS = this.timings;
    }
  },
  getReport() {
    return { ...this.timings };
  },
  reset() {
    this.timings = {};
    if (typeof window !== 'undefined') {
      delete window.__MAYBEWE_LOCATION_TIMINGS;
    }
  },
};

/**
 * Validates coordinate pair against NaN, null, and geographic bounding ranges
 */
export function isValidCoordinate(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  // Reject uninitialized zero coordinates (Null Island) unless explicit
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/**
 * Calculates Haversine distance in meters between two coordinates
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) return Infinity;
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// SINGLETON IN-MEMORY STATE
// ============================================================================

let cachedLocation = null; // { latitude, longitude, accuracy, timestamp, isCoarse, source }
let cachedPermissionStatus = null; // 'granted' | 'denied' | 'undetermined'
let inFlightLocationPromise = null; // Single pending in-flight promise
let inFlightRequestTimestamp = 0;
const subscribers = new Set(); // Set of listener callbacks: (state) => void
let subscribersCount = 0; // Reference count for active watcher
let activeWatcherCleanup = null; // Cleanup function for watcher

/**
 * Synchronous hydration of cached coordinates (<16ms, zero layout shifts)
 */
export function getCachedLocation() {
  if (cachedLocation && isValidCoordinate(cachedLocation.latitude, cachedLocation.longitude)) {
    return { ...cachedLocation };
  }

  // On Web, read synchronously from sessionStorage / localStorage
  if (typeof window !== 'undefined') {
    try {
      const sessionRaw = window.sessionStorage?.getItem(STORAGE_KEYS.SESSION_GPS);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        const lat = parsed.lat ?? parsed.latitude;
        const lng = parsed.lng ?? parsed.longitude;
        if (isValidCoordinate(lat, lng)) {
          cachedLocation = {
            latitude: lat,
            longitude: lng,
            accuracy: parsed.accuracy || 50,
            timestamp: parsed.ts || parsed.timestamp || Date.now(),
            isCoarse: !!parsed.isCoarse,
            source: 'sessionStorage',
          };
          return { ...cachedLocation };
        }
      }
    } catch (e) {}

    try {
      const localRaw = window.localStorage?.getItem(STORAGE_KEYS.ASYNC_LOCATION);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        const lat = parsed.lat ?? parsed.latitude;
        const lng = parsed.lng ?? parsed.longitude;
        if (isValidCoordinate(lat, lng)) {
          cachedLocation = {
            latitude: lat,
            longitude: lng,
            accuracy: parsed.accuracy || 100,
            timestamp: parsed.timestamp ? new Date(parsed.timestamp).getTime() : Date.now(),
            isCoarse: !!parsed.isCoarse,
            source: 'localStorage',
          };
          return { ...cachedLocation };
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Synchronous cached permission status
 */
export function getCachedPermission() {
  return cachedPermissionStatus;
}

/**
 * Internal state broadcaster to all active subscribers
 */
function notifySubscribers(eventPayload) {
  const currentState = {
    location: cachedLocation ? { ...cachedLocation } : null,
    status: cachedPermissionStatus || (cachedLocation ? 'granted' : 'idle'),
    ...eventPayload,
  };
  subscribers.forEach((cb) => {
    try {
      cb(currentState);
    } catch (err) {
      console.warn('LocationService subscriber error:', err);
    }
  });
}

/**
 * Persists valid coordinates to storage tiers asynchronously
 */
async function persistLocationToStorage(coords) {
  if (!coords || !isValidCoordinate(coords.latitude, coords.longitude)) return;

  // Web sessionStorage for sub-second page restores
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEYS.SESSION_GPS,
        JSON.stringify({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          isCoarse: coords.isCoarse,
          ts: coords.timestamp || Date.now(),
        })
      );
    } catch (e) {}
  }

  // Cross-platform AsyncStorage persistence
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.ASYNC_LOCATION,
      JSON.stringify({
        status: 'granted',
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        isCoarse: coords.isCoarse,
        isGPS: true,
        timestamp: new Date(coords.timestamp || Date.now()).toISOString(),
      })
    );
  } catch (e) {}
}

/**
 * Core Request Deduplication & Two-Tier GPS Acquisition
 */
export function requestCurrentLocation({
  forceRefresh = false,
  highAccuracyTimeout = 3500,
  maximumAge = 300000, // 5 minutes cache validity
} = {}) {
  // 1. Return fresh in-memory cache if not forced
  if (!forceRefresh && cachedLocation) {
    const age = Date.now() - (cachedLocation.timestamp || 0);
    if (age < maximumAge && isValidCoordinate(cachedLocation.latitude, cachedLocation.longitude)) {
      return { ...cachedLocation };
    }
  }

  // 2. Single-Flight Deduplication: Share in-flight Promise
  if (inFlightLocationPromise) {
    const inFlightAge = Date.now() - inFlightRequestTimestamp;
    // If request was started within 2 seconds, re-use it
    if (inFlightAge < 2000) {
      return inFlightLocationPromise;
    }
  }

  inFlightRequestTimestamp = Date.now();
  inFlightLocationPromise = _executeTwoTierAcquisition({ forceRefresh, highAccuracyTimeout })
    .finally(() => {
      inFlightLocationPromise = null;
    });

  return inFlightLocationPromise;
}

/**
 * Private: Two-tier acquisition pipeline
 */
async function _executeTwoTierAcquisition({ forceRefresh, highAccuracyTimeout }) {
  LocationBenchmark.record('T0_ACQUISITION_START');

  // STEP 1: Cached Permission Check
  if (cachedPermissionStatus !== 'granted') {
    let granted = false;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'granted') {
          granted = true;
          cachedPermissionStatus = 'granted';
        } else if (perm.state === 'denied') {
          cachedPermissionStatus = 'denied';
          notifySubscribers({ status: 'denied' });
          return null;
        }
      } catch (e) {}
    }

    if (!granted && ExpoLocation && ExpoLocation.requestForegroundPermissionsAsync) {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          cachedPermissionStatus = 'granted';
          granted = true;
        } else {
          cachedPermissionStatus = 'denied';
          notifySubscribers({ status: 'denied' });
          return null;
        }
      } catch (permErr) {
        console.warn('Location permission request error:', permErr);
      }
    }
  }

  // STEP 2: STAGE 1 FAST COARSE FIX (<300ms)
  let fastResolved = false;

  // Web Fast Path: navigator.geolocation with enableHighAccuracy: false
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (pos?.coords && isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
          const coarseFix = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 200,
            timestamp: Date.now(),
            isCoarse: true,
            source: 'web_coarse',
          };

          fastResolved = true;
          cachedPermissionStatus = 'granted';
          cachedLocation = coarseFix;
          persistLocationToStorage(coarseFix);
          LocationBenchmark.record('T2_COARSE_FIX_RECEIVED', {
            accuracy: coarseFix.accuracy,
            source: coarseFix.source,
          });
          notifySubscribers({ location: coarseFix, isCoarse: true, status: 'granted' });
        }
      },
      (err) => {
        if (err.code === 1) {
          cachedPermissionStatus = 'denied';
          notifySubscribers({ status: 'denied', error: 'PERMISSION_DENIED' });
        } else if (err.code === 2) {
          cachedPermissionStatus = 'unavailable';
          notifySubscribers({ status: 'unavailable', error: 'POSITION_UNAVAILABLE' });
        } else if (err.code === 3) {
          cachedPermissionStatus = 'timeout';
          notifySubscribers({ status: 'timeout', error: 'TIMEOUT' });
        } else {
          cachedPermissionStatus = 'unavailable';
          notifySubscribers({ status: 'unavailable', error: err?.message || 'UNKNOWN_ERROR' });
        }
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
    );
  }

  // Native Fast Path: getLastKnownPositionAsync
  if (ExpoLocation && ExpoLocation.getLastKnownPositionAsync) {
    try {
      const lastLoc = await ExpoLocation.getLastKnownPositionAsync({ maxAge: 300000 });
      if (lastLoc?.coords && isValidCoordinate(lastLoc.coords.latitude, lastLoc.coords.longitude)) {
        const coarseFix = {
          latitude: lastLoc.coords.latitude,
          longitude: lastLoc.coords.longitude,
          accuracy: lastLoc.coords.accuracy || 100,
          timestamp: Date.now(),
          isCoarse: true,
          source: 'native_last_known',
        };
        fastResolved = true;
        cachedPermissionStatus = 'granted';
        cachedLocation = coarseFix;
        persistLocationToStorage(coarseFix);
        LocationBenchmark.record('T2_COARSE_FIX_RECEIVED', {
          accuracy: coarseFix.accuracy,
          source: coarseFix.source,
        });
        notifySubscribers({ location: coarseFix, isCoarse: true, status: 'granted' });
      }
    } catch (e) {}
  }

  // STEP 3: STAGE 2 HIGH-ACCURACY REFINEMENT (Background / Non-Blocking)
  const highAccuracyPromise = new Promise(async (resolve, reject) => {
    let settled = false;

    // Timeout boundary to prevent app lockup
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        // If we already have a coarse fix, resolve cleanly with coarse fix
        if (cachedLocation) {
          resolve(cachedLocation);
        } else {
          cachedPermissionStatus = 'timeout';
          notifySubscribers({ status: 'timeout', error: 'TIMEOUT' });
          reject(new Error('GPS high accuracy timeout'));
        }
      }
    }, highAccuracyTimeout);

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!settled && pos?.coords && isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
              settled = true;
              clearTimeout(timer);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy || 15,
                timestamp: Date.now(),
                isCoarse: false,
                source: 'web_high_accuracy',
              });
            }
          },
          (err) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              if (cachedLocation) {
                resolve(cachedLocation);
              } else {
                if (err.code === 1) {
                  cachedPermissionStatus = 'denied';
                  notifySubscribers({ status: 'denied', error: 'PERMISSION_DENIED' });
                } else if (err.code === 2) {
                  cachedPermissionStatus = 'unavailable';
                  notifySubscribers({ status: 'unavailable', error: 'POSITION_UNAVAILABLE' });
                } else if (err.code === 3) {
                  cachedPermissionStatus = 'timeout';
                  notifySubscribers({ status: 'timeout', error: 'TIMEOUT' });
                } else {
                  cachedPermissionStatus = 'unavailable';
                  notifySubscribers({ status: 'unavailable', error: err?.message || 'UNKNOWN_ERROR' });
                }
                reject(err);
              }
            }
          },
          { enableHighAccuracy: true, timeout: highAccuracyTimeout, maximumAge: forceRefresh ? 0 : 60000 }
        );
      } else if (ExpoLocation && ExpoLocation.getCurrentPositionAsync) {
        const loc = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
        if (!settled && loc?.coords && isValidCoordinate(loc.coords.latitude, loc.coords.longitude)) {
          settled = true;
          clearTimeout(timer);
          resolve({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || 20,
            timestamp: Date.now(),
            isCoarse: false,
            source: 'native_high_accuracy',
          });
        }
      } else {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(cachedLocation);
        }
      }
    } catch (e) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        if (cachedLocation) resolve(cachedLocation);
        else reject(e);
      }
    }
  });

  try {
    const refinedCoords = await highAccuracyPromise;
    if (refinedCoords && isValidCoordinate(refinedCoords.latitude, refinedCoords.longitude)) {
      cachedPermissionStatus = 'granted';

      // Compare delta distance with existing coarse fix
      let shouldTriggerUpdate = true;
      if (cachedLocation) {
        const deltaMeters = calculateDistanceMeters(
          cachedLocation.latitude,
          cachedLocation.longitude,
          refinedCoords.latitude,
          refinedCoords.longitude
        );
        // Only trigger subscriber update if delta > 50 meters or transitioning from coarse
        shouldTriggerUpdate = deltaMeters > 50 || cachedLocation.isCoarse;
      }

      cachedLocation = refinedCoords;
      persistLocationToStorage(refinedCoords);
      LocationBenchmark.record('T4_HIGH_ACCURACY_RESOLVED', {
        accuracy: refinedCoords.accuracy,
        shouldTriggerUpdate,
      });

      if (shouldTriggerUpdate) {
        notifySubscribers({
          location: refinedCoords,
          isCoarse: false,
          status: 'granted',
          deltaTriggered: true,
        });
      }

      return refinedCoords;
    }
  } catch (err) {
    if (cachedLocation) return cachedLocation;
    console.warn('High accuracy refinement skipped/timed out:', err?.message);
  }

  return cachedLocation;
}

// ============================================================================
// REFERENCE-COUNTED BACKGROUND LOCATION WATCHER
// ============================================================================

function _startActiveWatcher() {
  if (activeWatcherCleanup) return;

  const handlePosition = (coords, source) => {
    if (!coords || !isValidCoordinate(coords.latitude, coords.longitude)) return;

    let deltaMeters = Infinity;
    if (cachedLocation) {
      deltaMeters = calculateDistanceMeters(
        cachedLocation.latitude,
        cachedLocation.longitude,
        coords.latitude,
        coords.longitude
      );
    }

    // Only broadcast updates if position shifted > 50 meters
    if (deltaMeters > 50 || !cachedLocation) {
      const updated = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 20,
        timestamp: Date.now(),
        isCoarse: false,
        source,
      };
      cachedLocation = updated;
      persistLocationToStorage(updated);
      notifySubscribers({ location: updated, isCoarse: false, status: 'granted' });
    }
  };

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => handlePosition(pos?.coords, 'web_watcher'),
      (err) => console.warn('Web location watch notice:', err?.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    activeWatcherCleanup = () => {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch (e) {}
    };
  } else if (ExpoLocation && ExpoLocation.watchPositionAsync) {
    let sub = null;
    ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.Balanced,
        distanceInterval: 50, // 50m minimum shift
        timeInterval: 10000,
      },
      (loc) => handlePosition(loc?.coords, 'native_watcher')
    )
      .then((s) => {
        sub = s;
      })
      .catch((err) => console.warn('Native location watch notice:', err));

    activeWatcherCleanup = () => {
      try {
        if (sub && sub.remove) sub.remove();
      } catch (e) {}
    };
  }
}

function _stopActiveWatcher() {
  if (activeWatcherCleanup) {
    try {
      activeWatcherCleanup();
    } catch (e) {}
    activeWatcherCleanup = null;
  }
}

/**
 * Subscribes component to location updates with reference counting
 */
export function subscribeLocation(callback) {
  if (typeof callback !== 'function') return () => {};

  subscribers.add(callback);
  subscribersCount++;

  // Synchronously deliver latest known state on frame 0 (<1ms)
  const initial = {
    location: getCachedLocation(),
    status: cachedPermissionStatus || (cachedLocation ? 'granted' : 'idle'),
    isCoarse: cachedLocation?.isCoarse || false,
  };
  try {
    callback(initial);
  } catch (e) {}

  // Spin up watcher only if active subscribers exist
  if (subscribersCount === 1) {
    _startActiveWatcher();
  }

  return () => {
    subscribers.delete(callback);
    subscribersCount = Math.max(0, subscribersCount - 1);
    if (subscribersCount === 0) {
      _stopActiveWatcher();
    }
  };
}

/**
 * Returns current watcher subscription count (for testing/diagnostics)
 */
export function getActiveSubscribersCount() {
  return subscribersCount;
}

/**
 * Decoupled Asynchronous Reverse Geocoding (Cosmetic UI only — never blocks GPS/render)
 */
export async function reverseGeocodeLocation(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) return null;

  try {
    if (ExpoLocation && ExpoLocation.reverseGeocodeAsync) {
      const [geocode] = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
      if (geocode) {
        return {
          city: geocode.city || geocode.subregion || geocode.district || null,
          state: geocode.region || null,
          district: geocode.district || geocode.subregion || null,
          formatted: [geocode.city, geocode.region].filter(Boolean).join(', '),
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Unit test reset helper for clean lifecycle verification
 */
export function __resetLocationServiceForTesting() {
  _stopActiveWatcher();
  cachedLocation = null;
  cachedPermissionStatus = null;
  inFlightLocationPromise = null;
  inFlightRequestTimestamp = 0;
  subscribers.clear();
  subscribersCount = 0;
  LocationBenchmark.reset();
}
