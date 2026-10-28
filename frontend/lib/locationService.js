// ============================================================================
// MAYBEWE CENTRALIZED LOCATION MANAGER & SHARED SINGLETON SERVICE
// frontend/lib/locationService.js
//
// Authoritative single source of truth for location across MaybeWe:
// - States: idle, requesting_permission, locating, ready, permission_denied, services_disabled, error
// - Secure context & platform-aware Web Geolocation without native API leaks
// - Native Expo Location with services check & foreground permissions
// - Single-flight request deduplication & stale result discard
// - Fast cached/last-known fix hydration followed by fresh accurate fix
// - Manual retry action (retryLocation)
// - Clean permission instructions (no repeated prompts if permanently denied)
// - Reference-counted background location watcher (>50m delta threshold)
// - Strict coordinate hygiene & neutral India overview fallback
// ============================================================================

import AsyncStorage from "./safeStorage.js";

// Safe dynamic access to Platform & expo-location for cross-platform & Node.js test runner
let Platform = { OS: typeof window !== "undefined" ? "web" : "node" };
try {
  const rn = require("react-native");
  if (rn && rn.Platform) Platform = rn.Platform;
} catch (e) {}

let ExpoLocation = null;
try {
  const mod = require("expo-location");
  ExpoLocation = (mod && typeof mod.getCurrentPositionAsync === "function")
    ? mod
    : (mod && mod.default && typeof mod.default.getCurrentPositionAsync === "function")
    ? mod.default
    : mod;
} catch (e) {}

let customExpoLocation = null;
let customPlatform = null;

function getResolvedExpoLocation() {
  if (customExpoLocation) return customExpoLocation;
  if (ExpoLocation && typeof ExpoLocation.getCurrentPositionAsync === "function") {
    return ExpoLocation;
  }
  try {
    const mod = require("expo-location");
    return (mod && typeof mod.getCurrentPositionAsync === "function")
      ? mod
      : (mod && mod.default && typeof mod.default.getCurrentPositionAsync === "function")
      ? mod.default
      : mod;
  } catch (e) {
    return null;
  }
}

function getResolvedPlatform() {
  if (customPlatform) return customPlatform;
  try {
    const rn = require("react-native");
    if (rn && rn.Platform) return rn.Platform;
  } catch (e) {}
  return Platform;
}

export function __setExpoLocationForTesting(mockExpoLocation, mockPlatform = null) {
  customExpoLocation = mockExpoLocation;
  if (mockPlatform) customPlatform = mockPlatform;
}

export function __resetExpoLocationForTesting() {
  customExpoLocation = null;
  customPlatform = null;
}

// Canonical location state machine enum
export const LOCATION_STATES = {
  IDLE: "idle",
  REQUESTING_PERMISSION: "requesting_permission",
  LOCATING: "locating",
  READY: "ready",
  PERMISSION_DENIED: "permission_denied",
  SERVICES_DISABLED: "services_disabled",
  ERROR: "error",
};

// Configurable thresholds for telemetry classification
export const LOCATION_CONFIG = {
  HIGH_ACCURACY_THRESHOLD_METERS: 150, // Fixes <= 150m considered accurate
  STALE_MAX_AGE_MS: 120000,           // Fixes older than 2 minutes considered stale
  TIMEOUT_MS: 10000,                  // Acquisition timeout limit
};

// Explicit confidence tiers
export const CONFIDENCE_TIERS = {
  ACCURATE: "ACCURATE",
  COARSE: "COARSE",
  STALE: "STALE",
  TIMEOUT: "TIMEOUT",
  UNAVAILABLE: "UNAVAILABLE",
};

/**
 * Classifies telemetry into discrete confidence tiers
 */
export function classifyTelemetry(loc, config = LOCATION_CONFIG) {
  if (!loc || !isValidCoordinate(loc.latitude, loc.longitude)) {
    return CONFIDENCE_TIERS.UNAVAILABLE;
  }
  const age = Date.now() - (loc.timestamp || 0);
  if (age > (config.STALE_MAX_AGE_MS || 120000)) {
    return CONFIDENCE_TIERS.STALE;
  }
  const acc = loc.accuracy;
  if (typeof acc !== "number" || !Number.isFinite(acc) || acc <= 0) {
    return CONFIDENCE_TIERS.COARSE;
  }
  if (acc <= (config.HIGH_ACCURACY_THRESHOLD_METERS || 150)) {
    return CONFIDENCE_TIERS.ACCURATE;
  }
  return CONFIDENCE_TIERS.COARSE;
}

// Neutral India overview fallback — NEVER hardcode a city like Vijayawada/Hyderabad
export const INDIA_OVERVIEW = {
  latitude: 20.5937,
  longitude: 78.9629,
  zoom: 4,
};

export const STORAGE_KEYS = {
  GPS_TELEMETRY: "@maybewe_gps_telemetry",
  PROFILE_LOCATION: "@maybewe_profile_location",
  LEGACY_USER_LOCATION: "@maybewe_user_location",
  ASYNC_LOCATION: "@maybewe_gps_telemetry",
  SESSION_GPS: "maybewe_last_gps",
  SELECTED_LOCALITY: "@maybewe_selected_locality",
};

/**
 * Shape discriminator: checks if payload represents valid GPS telemetry coordinates
 */
export function isGpsTelemetryPayload(obj) {
  if (!obj || typeof obj !== "object") return false;
  const lat = obj.latitude ?? obj.lat;
  const lng = obj.longitude ?? obj.lng;
  return isValidCoordinate(lat, lng);
}

/**
 * Shape discriminator: checks if payload represents a user-saved profile home location
 */
export function isProfileLocationPayload(obj) {
  if (!obj || typeof obj !== "object") return false;
  // If explicitly tagged as live/ephemeral GPS, reject immediately
  if (obj.isGPS === true) return false;
  const hasCity = typeof obj.city === "string" && obj.city.trim().length > 0;
  const hasLoc = typeof obj.location === "string" && obj.location.trim().length > 0;
  const hasState = typeof obj.state === "string" && obj.state.trim().length > 0;
  if (obj.isGPS === false && (hasCity || hasLoc || hasState)) return true;
  if (hasCity || hasLoc) return true;
  return false;
}

// Benchmark instrumentation recorder for real runtime milestones
export const LocationBenchmark = {
  timings: {},
  record(event, meta = {}) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.timings[event] = {
      timestamp: Date.now(),
      relativeMs: now,
      ...meta,
    };
    if (typeof window !== "undefined") {
      window.__MAYBEWE_LOCATION_TIMINGS = this.timings;
    }
  },
  getReport() {
    return { ...this.timings };
  },
  reset() {
    this.timings = {};
    if (typeof window !== "undefined") {
      delete window.__MAYBEWE_LOCATION_TIMINGS;
    }
  },
};

/**
 * Validates coordinate pair against NaN, null, and geographic bounding ranges
 */
export function isValidCoordinate(latitude, longitude) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
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

/**
 * Freshness guard: checks if a location timestamp is within allowable age
 */
export function isLocationFresh(loc, maxAgeMs = 60000) {
  if (!loc || typeof loc.timestamp !== 'number') return false;
  return (Date.now() - loc.timestamp) <= maxAgeMs;
}

/**
 * Accuracy guard: checks if location accuracy radius is acceptable (<= 150m for live nearby)
 */
export function isLocationAccurate(loc, maxAccuracyMeters = 150) {
  if (!loc || typeof loc.accuracy !== 'number') return false;
  if (!Number.isFinite(loc.accuracy) || loc.accuracy <= 0) return false;
  return loc.accuracy <= maxAccuracyMeters;
}

/**
 * Validates a confirmed, non-provisional fix for live spatial discovery
 */
export function isConfirmedGpsFix(loc) {
  if (!loc) return false;
  // Reject mock-provider fixes only when a reliable supported flag is present
  if (loc.mocked === true || loc.isMock === true || loc.isFromMockProvider === true || loc.coords?.mocked === true) {
    return false;
  }
  return (
    isValidCoordinate(loc.latitude, loc.longitude) &&
    isLocationFresh(loc, 60000) &&
    isLocationAccurate(loc, LOCATION_CONFIG.HIGH_ACCURACY_THRESHOLD_METERS) &&
    !loc.isCoarse &&
    !loc.isProvisional &&
    (loc.confidence === undefined || loc.confidence === CONFIDENCE_TIERS.ACCURATE)
  );
}

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

let currentLocationState = {
  status: LOCATION_STATES.IDLE,
  location: null, // { latitude, longitude, accuracy, timestamp, isCoarse, source }
  error: null,
  errorMessage: null,
  permissionStatus: null, // "granted" | "denied" | "prompt" | "undetermined"
  isPermanentlyDenied: false,
  canAskAgain: true,
  isCoarse: false,
};

let cachedLocation = null;
let cachedPermissionStatus = null;
let inFlightLocationPromise = null;
let inFlightRequestTimestamp = 0;
let currentRequestId = 0;
const subscribers = new Set();
let subscribersCount = 0;
let activeWatcherCleanup = null;

/**
 * Returns current snapshot of location state with convenience helper booleans
 */
export function getLocationState() {
  if (!currentLocationState.location) {
    const cached = getCachedLocation();
    if (cached) {
      currentLocationState.location = cached;
      if (currentLocationState.status === LOCATION_STATES.IDLE) {
        currentLocationState.status = LOCATION_STATES.READY;
      }
    }
  }

  const hasCoords = !!(
    currentLocationState.location &&
    isValidCoordinate(currentLocationState.location.latitude, currentLocationState.location.longitude)
  );

  const isReady = currentLocationState.status === LOCATION_STATES.READY || hasCoords;
  const isLocating =
    (currentLocationState.status === LOCATION_STATES.LOCATING ||
      currentLocationState.status === LOCATION_STATES.REQUESTING_PERMISSION) &&
    !hasCoords;
  const isRefreshing =
    (currentLocationState.status === LOCATION_STATES.LOCATING ||
      currentLocationState.status === LOCATION_STATES.REQUESTING_PERMISSION) &&
    hasCoords;
  const isPermissionDenied = currentLocationState.status === LOCATION_STATES.PERMISSION_DENIED;
  const isServicesDisabled = currentLocationState.status === LOCATION_STATES.SERVICES_DISABLED;
  const isError = currentLocationState.status === LOCATION_STATES.ERROR;

  return {
    ...currentLocationState,
    location: currentLocationState.location ? { ...currentLocationState.location } : null,
    isReady,
    isLocating,
    isRefreshing,
    isPermissionDenied,
    isServicesDisabled,
    isError,
    hasCoords,
    // Status alias for backward-compatibility with components expecting legacy granted/denied
    legacyStatus: isReady ? "granted" : isPermissionDenied ? "denied" : isLocating ? "detecting" : "unavailable",
  };
}

/**
 * Synchronous hydration of cached coordinates (<16ms, zero layout shifts)
 */
export function getCachedLocation() {
  if (cachedLocation && isValidCoordinate(cachedLocation.latitude, cachedLocation.longitude)) {
    return { ...cachedLocation };
  }

  // On Web, read synchronously from sessionStorage / localStorage
  if (typeof window !== "undefined") {
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
            source: "sessionStorage",
          };
          currentLocationState.location = cachedLocation;
          return { ...cachedLocation };
        }
      }
    } catch (e) {}

    try {
      let localRaw = window.localStorage?.getItem(STORAGE_KEYS.GPS_TELEMETRY);
      if (!localRaw) {
        localRaw = window.localStorage?.getItem(STORAGE_KEYS.LEGACY_USER_LOCATION);
      }
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        const lat = parsed.lat ?? parsed.latitude;
        const lng = parsed.lng ?? parsed.longitude;
        if (isValidCoordinate(lat, lng) && parsed.isGPS !== false) {
          cachedLocation = {
            latitude: lat,
            longitude: lng,
            accuracy: parsed.accuracy || 100,
            timestamp: parsed.timestamp ? new Date(parsed.timestamp).getTime() : Date.now(),
            isCoarse: !!parsed.isCoarse,
            source: "localStorage",
          };
          currentLocationState.location = cachedLocation;
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
  return cachedPermissionStatus || currentLocationState.permissionStatus;
}

/**
 * Internal state updater and subscriber broadcaster
 */
function _updateState(updates = {}) {
  currentLocationState = {
    ...currentLocationState,
    ...updates,
  };

  if (updates.location) {
    cachedLocation = updates.location;
  }
  if (updates.permissionStatus) {
    cachedPermissionStatus = updates.permissionStatus;
  } else if (currentLocationState.status === LOCATION_STATES.READY) {
    cachedPermissionStatus = "granted";
    currentLocationState.permissionStatus = "granted";
  } else if (currentLocationState.status === LOCATION_STATES.PERMISSION_DENIED) {
    cachedPermissionStatus = "denied";
    currentLocationState.permissionStatus = "denied";
  }

  notifySubscribers();
}

/**
 * Internal broadcaster to active subscribers
 */
function notifySubscribers(overrides = {}) {
  const snapshot = {
    ...getLocationState(),
    ...overrides,
  };

  subscribers.forEach((cb) => {
    try {
      cb(snapshot);
    } catch (err) {
      console.warn("LocationService subscriber error:", err);
    }
  });
}

/**
 * Persists authentic GPS telemetry asynchronously to dedicated telemetry tier
 */
export async function persistGpsTelemetryToStorage(coords) {
  if (!coords || !isValidCoordinate(coords.latitude, coords.longitude)) return;

  const telemetryPayload = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: coords.accuracy || null,
    accuracyRadiusMeters: coords.accuracyRadiusMeters || coords.accuracy || null,
    isCoarse: !!coords.isCoarse,
    isProvisional: !!coords.isProvisional,
    confidence: coords.confidence || (coords.accuracy && coords.accuracy <= 150 ? "ACCURATE" : "COARSE"),
    source: coords.source || "gps",
    status: "granted",
    isGPS: true,
    timestamp: new Date(coords.timestamp || Date.now()).toISOString(),
  };

  // Web sessionStorage for sub-second page restores
  if (typeof window !== "undefined" && window.sessionStorage) {
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

  // Web localStorage for fast synchronous Frame-0 restoration
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.GPS_TELEMETRY,
        JSON.stringify(telemetryPayload)
      );
    } catch (e) {}
  }

  // Cross-platform AsyncStorage persistence (Isolated dedicated GPS key)
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.GPS_TELEMETRY,
      JSON.stringify(telemetryPayload)
    );
  } catch (e) {}
}

/**
 * Persists user profile home location to dedicated profile storage tier
 */
export async function persistProfileLocationToStorage(profileLoc) {
  if (!profileLoc || typeof profileLoc !== "object") return;
  const city = typeof profileLoc.city === "string" ? profileLoc.city.trim() : "";
  const state = typeof profileLoc.state === "string" ? profileLoc.state.trim() : "";
  const location = typeof profileLoc.location === "string"
    ? profileLoc.location.trim()
    : (city ? (state ? `${city}, ${state}` : city) : "");

  // If intentionally cleared
  if (!city && !location) {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_LOCATION);
      await AsyncStorage.setItem("@maybewe_profile_location_cleared", "true");
    } catch (e) {}
    return;
  }

  const payload = {
    city,
    state,
    location,
    country: profileLoc.country || "India",
    status: "granted",
    isGPS: false,
    updatedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.removeItem("@maybewe_profile_location_cleared");
    await AsyncStorage.setItem(
      STORAGE_KEYS.PROFILE_LOCATION,
      JSON.stringify(payload)
    );
  } catch (e) {}
}

/**
 * Loads cached GPS telemetry with backward-compatible shape-discriminating legacy fallback
 */
export async function loadCachedGpsTelemetry() {
  try {
    // 1. Read dedicated GPS telemetry key
    const rawGps = await AsyncStorage.getItem(STORAGE_KEYS.GPS_TELEMETRY);
    if (rawGps) {
      const parsed = JSON.parse(rawGps);
      if (isGpsTelemetryPayload(parsed)) {
        return {
          latitude: parsed.latitude ?? parsed.lat,
          longitude: parsed.longitude ?? parsed.lng,
          accuracy: parsed.accuracy || 50,
          accuracyRadiusMeters: parsed.accuracyRadiusMeters || parsed.accuracy || 50,
          timestamp: parsed.timestamp ? new Date(parsed.timestamp).getTime() : Date.now(),
          isCoarse: !!parsed.isCoarse,
          isProvisional: !!parsed.isProvisional,
          confidence: parsed.confidence || (parsed.accuracy && parsed.accuracy <= 150 ? "ACCURATE" : "COARSE"),
          source: parsed.source || "async_gps_telemetry",
        };
      }
    }

    // 2. Backward-compatible legacy check (non-destructive)
    const legacyRaw = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_USER_LOCATION);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (isGpsTelemetryPayload(parsed) && parsed.isGPS !== false) {
        return {
          latitude: parsed.latitude ?? parsed.lat,
          longitude: parsed.longitude ?? parsed.lng,
          accuracy: parsed.accuracy || 100,
          accuracyRadiusMeters: parsed.accuracyRadiusMeters || parsed.accuracy || 100,
          timestamp: parsed.timestamp ? new Date(parsed.timestamp).getTime() : Date.now(),
          isCoarse: !!parsed.isCoarse,
          isProvisional: !!parsed.isProvisional,
          confidence: parsed.confidence || "COARSE",
          source: "legacy_user_location",
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Loads cached profile location with backward-compatible shape-discriminating legacy fallback
 */
export async function loadCachedProfileLocation() {
  try {
    const isCleared = await AsyncStorage.getItem("@maybewe_profile_location_cleared");
    if (isCleared === "true") {
      return null;
    }

    // 1. Read dedicated profile location key
    const rawProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_LOCATION);
    if (rawProfile) {
      const parsed = JSON.parse(rawProfile);
      if (isProfileLocationPayload(parsed)) {
        return parsed;
      }
    }

    // 2. Backward-compatible legacy check (non-destructive)
    const legacyRaw = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_USER_LOCATION);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (isProfileLocationPayload(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Persists a manually selected destination locality to storage
 */
export async function persistSelectedLocalityToStorage(loc) {
  if (!loc || typeof loc !== "object") return null;
  const city = typeof loc.city === "string" ? loc.city.trim() : (typeof loc.name === "string" ? loc.name.trim() : "");
  if (!city) {
    await clearSelectedLocalityFromStorage();
    return null;
  }

  const payload = {
    city,
    state: typeof loc.state === "string" ? loc.state.trim() : "",
    district: typeof loc.district === "string" ? loc.district.trim() : "",
    name: city,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEYS.SELECTED_LOCALITY, JSON.stringify(payload));
    }
  } catch (e) {}

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_LOCALITY, JSON.stringify(payload));
  } catch (e) {}
  return payload;
}

/**
 * Loads cached manually selected destination locality
 */
export async function loadCachedSelectedLocality() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEYS.SELECTED_LOCALITY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.city === "string" && parsed.city.trim().length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {}

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_LOCALITY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.city === "string" && parsed.city.trim().length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Clears manually selected destination locality
 */
export async function clearSelectedLocalityFromStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.SELECTED_LOCALITY);
    }
  } catch (e) {}
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_LOCALITY);
  } catch (e) {}
}


/**
 * Persists valid coordinates to storage tiers asynchronously (Backward-compatible alias)
 */
async function persistLocationToStorage(coords) {
  return persistGpsTelemetryToStorage(coords);
}

/**
 * Core Request Deduplication & Two-Tier GPS Acquisition
 */
export function requestCurrentLocation({
  forceRefresh = false,
  highAccuracyTimeout = 12000,
  maximumAge = 300000,
} = {}) {
  // 1. Return fresh in-memory cache if not forced
  if (!forceRefresh && cachedLocation) {
    const age = Date.now() - (cachedLocation.timestamp || 0);
    if (age < maximumAge && isValidCoordinate(cachedLocation.latitude, cachedLocation.longitude)) {
      return { ...cachedLocation };
    }
  }

  // 2. Single-Flight Deduplication: Share in-flight Promise if not force refreshed
  if (inFlightLocationPromise && !forceRefresh) {
    const inFlightAge = Date.now() - inFlightRequestTimestamp;
    if (inFlightAge < 15000) {
      return inFlightLocationPromise;
    }
  }

  const thisRequestId = ++currentRequestId;
  inFlightRequestTimestamp = Date.now();

  inFlightLocationPromise = _executeLocationAcquisition({
    forceRefresh,
    timeout: highAccuracyTimeout,
    requestId: thisRequestId,
  }).finally(() => {
    inFlightLocationPromise = null;
  });

  return inFlightLocationPromise;
}

/**
 * Manual Retry GPS action: resets errors and starts a fresh GPS request
 */
export async function retryLocation() {
  inFlightLocationPromise = null;
  _updateState({
    status: cachedLocation ? LOCATION_STATES.READY : LOCATION_STATES.LOCATING,
    error: null,
    errorMessage: null,
  });
  return requestCurrentLocation({ forceRefresh: true });
}

/**
 * Private: Authoritative Location Acquisition Pipeline
 */
async function _executeLocationAcquisition({ forceRefresh, timeout = 12000, requestId }) {
  LocationBenchmark.record("T0_ACQUISITION_START");

  const activePlatform = getResolvedPlatform();
  const activeExpoLocation = getResolvedExpoLocation();
  const isNative = activePlatform.OS === "android" || activePlatform.OS === "ios";
  const isWeb = activePlatform.OS === "web" || (!isNative && typeof window !== "undefined" && typeof navigator !== "undefined" && !!navigator.geolocation);

  // ==========================================================================
  // WEB ENVIRONMENT: Native Browser Geolocation via Secure Context
  // ==========================================================================
  if (isWeb && typeof navigator !== "undefined") {
    // 1. Secure context check (Geolocation requires HTTPS or localhost)
    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false &&
      window.location &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      _updateState({
        status: LOCATION_STATES.ERROR,
        error: "INSECURE_CONTEXT",
        errorMessage: "Geolocation requires a secure HTTPS connection.",
      });
      return null;
    }

    // 2. Geolocation API presence
    if (!navigator.geolocation) {
      _updateState({
        status: LOCATION_STATES.ERROR,
        error: "NOT_SUPPORTED",
        errorMessage: "Geolocation is not supported by your browser.",
      });
      return null;
    }

    // 3. Check browser permission state if supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permResult = await navigator.permissions.query({ name: "geolocation" });
        if (permResult.state === "denied") {
          _updateState({
            status: LOCATION_STATES.PERMISSION_DENIED,
            error: "PERMISSION_DENIED",
            errorMessage:
              "Location permission is blocked. Please enable location permissions for this site in your browser address bar settings and reload.",
            permissionStatus: "denied",
            isPermanentlyDenied: true,
            canAskAgain: false,
          });
          return null;
        }
      } catch (e) {
        // Safari does not support permissions.query for geolocation - proceed safely
      }
    }

    // Set locating state
    _updateState({
      status: LOCATION_STATES.LOCATING,
      error: null,
      errorMessage: null,
    });

    // Hydrate quick cached location if available
    const initialCached = getCachedLocation();
    if (initialCached && isValidCoordinate(initialCached.latitude, initialCached.longitude)) {
      _updateState({
        location: initialCached,
        isCoarse: true,
      });
    }

    // Execute single clean browser geolocation request
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          const isFresh = cachedLocation && isLocationFresh(cachedLocation, LOCATION_CONFIG.STALE_MAX_AGE_MS);
          if (requestId === currentRequestId) {
            _updateState({
              status: isFresh ? LOCATION_STATES.READY : LOCATION_STATES.ERROR,
              error: isFresh ? null : "TIMEOUT",
              errorMessage: isFresh ? null : "Location request timed out. Please check your signal and tap Retry GPS.",
            });
          }
          resolve(isFresh ? cachedLocation : null);
        }
      }, timeout);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            if (requestId !== currentRequestId) {
              resolve(cachedLocation);
              return;
            }

            if (pos?.coords && isValidCoordinate(pos.coords.latitude, pos.coords.longitude)) {
              const acc = pos.coords.accuracy;
              const ts = pos.timestamp || Date.now();
              const age = Date.now() - ts;
              const isAccurate = isLocationAccurate({ accuracy: acc }, LOCATION_CONFIG.HIGH_ACCURACY_THRESHOLD_METERS);
              const isFresh = age <= 60000;
              const confidence = !isFresh
                ? CONFIDENCE_TIERS.STALE
                : isAccurate
                ? CONFIDENCE_TIERS.ACCURATE
                : CONFIDENCE_TIERS.COARSE;

              const freshFix = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: acc,
                accuracyRadiusMeters: acc,
                timestamp: ts,
                isCoarse: !isAccurate,
                isProvisional: !isAccurate || !isFresh,
                confidence,
                source: "web_geolocation",
              };

              if (isAccurate && isFresh) {
                _updateState({
                  status: LOCATION_STATES.READY,
                  location: freshFix,
                  isCoarse: false,
                  permissionStatus: "granted",
                  error: null,
                  errorMessage: null,
                  isPermanentlyDenied: false,
                  canAskAgain: true,
                });
                persistLocationToStorage(freshFix);
                LocationBenchmark.record("T4_HIGH_ACCURACY_RESOLVED", {
                  accuracy: freshFix.accuracy,
                  source: freshFix.source,
                });
                resolve(freshFix);
              } else {
                _updateState({
                  status: LOCATION_STATES.LOCATING,
                  location: freshFix,
                  isCoarse: true,
                  permissionStatus: "granted",
                  errorMessage: `Refining GPS accuracy... (±${Math.round(acc)}m)`,
                });
                resolve(freshFix);
              }
            } else {
              resolve(cachedLocation);
            }
          }
        },
        (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            const isFreshCache = cachedLocation && isLocationFresh(cachedLocation, LOCATION_CONFIG.STALE_MAX_AGE_MS);
            if (requestId !== currentRequestId) {
              resolve(isFreshCache ? cachedLocation : null);
              return;
            }

            if (err.code === 1) {
              _updateState({
                status: LOCATION_STATES.PERMISSION_DENIED,
                error: "PERMISSION_DENIED",
                errorMessage:
                  "Location permission was denied. Please allow location access in your browser settings (click the lock or tune icon in the address bar).",
                permissionStatus: "denied",
                isPermanentlyDenied: true,
                canAskAgain: false,
              });
              resolve(null);
              return;
            }

            if (isFreshCache) {
              _updateState({
                status: LOCATION_STATES.READY,
                location: cachedLocation,
                error: null,
                errorMessage: null,
              });
              resolve(cachedLocation);
              return;
            }

            if (err.code === 2) {
              _updateState({
                status: LOCATION_STATES.SERVICES_DISABLED,
                error: "POSITION_UNAVAILABLE",
                errorMessage:
                  "Location services are unavailable. Please ensure location services are enabled on your device.",
              });
            } else if (err.code === 3) {
              _updateState({
                status: LOCATION_STATES.ERROR,
                error: "TIMEOUT",
                errorMessage: "Location request timed out. Tap Retry GPS to try again.",
              });
            } else {
              _updateState({
                status: LOCATION_STATES.ERROR,
                error: err?.message || "UNKNOWN_ERROR",
                errorMessage: "Could not acquire GPS position. Tap Retry GPS to try again.",
              });
            }
            resolve(null);
          }
        },
        {
          enableHighAccuracy: true,
          timeout,
          maximumAge: forceRefresh ? 0 : 60000,
        }
      );
    });
  }

  // ==========================================================================
  // NATIVE ENVIRONMENT: Android & iOS via Expo Location
  // ==========================================================================
  if (isNative && activeExpoLocation) {
    // 1. Device Location Services Check & Network Provider Prompt
    if (activeExpoLocation.hasServicesEnabledAsync) {
      try {
        const servicesEnabled = await activeExpoLocation.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (activePlatform.OS === "android" && activeExpoLocation.enableNetworkProviderAsync) {
            try {
              await activeExpoLocation.enableNetworkProviderAsync();
            } catch (pErr) {}
          }
          const recheck = await activeExpoLocation.hasServicesEnabledAsync().catch(() => false);
          if (!recheck) {
            _updateState({
              status: LOCATION_STATES.SERVICES_DISABLED,
              error: "SERVICES_DISABLED",
              errorMessage:
                "Device location services (GPS) are disabled. Please turn on location in device settings.",
            });
            return null;
          }
        }
      } catch (e) {}
    }

    // 2. Foreground Permissions Check & Request
    _updateState({ status: LOCATION_STATES.REQUESTING_PERMISSION });
    let fgStatus = null;
    if (activeExpoLocation.getForegroundPermissionsAsync) {
      try {
        fgStatus = await activeExpoLocation.getForegroundPermissionsAsync();
      } catch (e) {}
    }

    const hasFgPermission = fgStatus?.status === "granted" || fgStatus?.granted === true;
    if (!hasFgPermission) {
      if (fgStatus && fgStatus.status === "denied" && fgStatus.canAskAgain === false) {
        _updateState({
          status: LOCATION_STATES.PERMISSION_DENIED,
          error: "PERMISSION_DENIED",
          permissionStatus: "denied",
          isPermanentlyDenied: true,
          canAskAgain: false,
          errorMessage:
            "Location permission is permanently denied. Please enable it in your device App Settings.",
        });
        return null;
      }

      if (activeExpoLocation.requestForegroundPermissionsAsync) {
        try {
          const req = await activeExpoLocation.requestForegroundPermissionsAsync();
          const reqGranted = req?.status === "granted" || req?.granted === true;
          if (!reqGranted) {
            _updateState({
              status: LOCATION_STATES.PERMISSION_DENIED,
              error: "PERMISSION_DENIED",
              permissionStatus: "denied",
              isPermanentlyDenied: req?.canAskAgain === false,
              canAskAgain: req?.canAskAgain !== false,
              errorMessage:
                req?.canAskAgain === false
                  ? "Location permission is permanently denied. Please enable it in device App Settings."
                  : "Location permission was denied. Tap Retry GPS to request permission again.",
            });
            return null;
          }
        } catch (e) {
          _updateState({
            status: LOCATION_STATES.ERROR,
            error: "PERMISSION_REQUEST_FAILED",
            errorMessage: "Failed to request location permission.",
          });
          return null;
        }
      }
    }

    // Permission granted!
    _updateState({
      status: LOCATION_STATES.LOCATING,
      permissionStatus: "granted",
      error: null,
      errorMessage: null,
    });

    // 3. Initial fix via getLastKnownPositionAsync with strict maxAge (60s) & accuracy guards
    let quickFix = null;
    if (activeExpoLocation.getLastKnownPositionAsync) {
      try {
        const lastKnown = await activeExpoLocation.getLastKnownPositionAsync({ maxAge: 60000 }).catch(() => null);
        if (lastKnown?.coords && isValidCoordinate(lastKnown.coords.latitude, lastKnown.coords.longitude)) {
          const acc = lastKnown.coords.accuracy || 1000;
          const ts = lastKnown.timestamp || Date.now();
          const age = Date.now() - ts;
          const isFresh = age <= 60000;
          const isMock = lastKnown.mocked === true || lastKnown.coords?.mocked === true;
          const isAccurate = !isMock && isLocationAccurate({ accuracy: acc }, LOCATION_CONFIG.HIGH_ACCURACY_THRESHOLD_METERS);
          const confidence = !isFresh
            ? CONFIDENCE_TIERS.STALE
            : isAccurate
            ? CONFIDENCE_TIERS.ACCURATE
            : CONFIDENCE_TIERS.COARSE;

          quickFix = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: acc,
            accuracyRadiusMeters: acc,
            timestamp: ts,
            isCoarse: !isAccurate,
            isProvisional: !isFresh || !isAccurate,
            confidence,
            source: "native_last_known",
          };

          if (requestId === currentRequestId) {
            if (isFresh && isAccurate) {
              _updateState({
                status: LOCATION_STATES.READY,
                location: quickFix,
                isCoarse: false,
                permissionStatus: "granted",
              });
              persistLocationToStorage(quickFix);
              LocationBenchmark.record("T2_COARSE_FIX_RECEIVED", {
                accuracy: quickFix.accuracy,
                source: quickFix.source,
              });
            } else {
              // Mark as provisional: do NOT promote to READY for nearby search!
              _updateState({
                status: LOCATION_STATES.LOCATING,
                location: quickFix,
                isCoarse: true,
                permissionStatus: "granted",
                errorMessage: `Refining GPS accuracy... (±${Math.round(acc)}m)`,
              });
            }
          }
        }
      } catch (e) {}
    }

    // 4. Fresh accurate position acquisition with hardware watcher fallback
    let freshFix = null;
    let freshError = null;
    let singleShotCoarseFix = null;

    if (activeExpoLocation.getCurrentPositionAsync) {
      try {
        const targetAccuracy = activeExpoLocation.Accuracy ? activeExpoLocation.Accuracy.High : 4;
        const posPromise = activeExpoLocation.getCurrentPositionAsync({
          accuracy: targetAccuracy,
          mayShowUserSettingsDialog: false,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("NATIVE_GPS_TIMEOUT")), 10000)
        );
        const res = await Promise.race([posPromise, timeoutPromise]);
        if (res?.coords && isValidCoordinate(res.coords.latitude, res.coords.longitude)) {
          const acc = res.coords.accuracy || 20;
          const ts = res.timestamp || Date.now();
          const age = Date.now() - ts;
          const isMock = res.mocked === true || res.coords?.mocked === true;
          const isAccurate = !isMock && isLocationAccurate({ accuracy: acc }, LOCATION_CONFIG.HIGH_ACCURACY_THRESHOLD_METERS);
          const isFresh = age <= 60000;
          if (isAccurate && isFresh) {
            freshFix = {
              latitude: res.coords.latitude,
              longitude: res.coords.longitude,
              accuracy: acc,
              accuracyRadiusMeters: acc,
              timestamp: ts,
              isCoarse: false,
              isProvisional: false,
              confidence: CONFIDENCE_TIERS.ACCURATE,
              source: "native_high_accuracy",
            };
          } else if (!isMock && isValidCoordinate(res.coords.latitude, res.coords.longitude)) {
            singleShotCoarseFix = {
              latitude: res.coords.latitude,
              longitude: res.coords.longitude,
              accuracy: acc,
              accuracyRadiusMeters: acc,
              timestamp: ts,
              isCoarse: true,
              isProvisional: true,
              confidence: CONFIDENCE_TIERS.COARSE,
              source: "native_coarse",
            };
          }
        }
      } catch (err) {
        freshError = err;
      }
    }

    // 4b. Stream via watchPositionAsync to acquire high-accuracy satellite fix if needed
    if (!freshFix && activeExpoLocation.watchPositionAsync) {
      try {
        freshFix = await new Promise((resolve, reject) => {
          let sub = null;
          let settled = false;
          let bestSeenCoarse = singleShotCoarseFix;

          const watchTimeoutMs = bestSeenCoarse ? 3500 : 10000;
          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              if (sub && sub.remove) {
                try { sub.remove(); } catch (e) {}
              }
              if (bestSeenCoarse) {
                resolve(bestSeenCoarse);
              } else {
                reject(new Error("NATIVE_HARDWARE_WATCH_TIMEOUT"));
              }
            }
          }, watchTimeoutMs);

          activeExpoLocation.watchPositionAsync(
            {
              accuracy: activeExpoLocation.Accuracy ? activeExpoLocation.Accuracy.High : 4,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (loc) => {
              if (!settled && loc?.coords && isValidCoordinate(loc.coords.latitude, loc.coords.longitude)) {
                const acc = loc.coords.accuracy || 20;
                const isMock = loc.mocked === true || loc.coords?.mocked === true;
                if (!isMock) {
                  if (isLocationAccurate({ accuracy: acc }, 150)) {
                    settled = true;
                    clearTimeout(timer);
                    if (sub && sub.remove) {
                      try { sub.remove(); } catch (e) {}
                    }
                    resolve({
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                      accuracy: acc,
                      accuracyRadiusMeters: acc,
                      timestamp: loc.timestamp || Date.now(),
                      isCoarse: false,
                      isProvisional: false,
                      confidence: CONFIDENCE_TIERS.ACCURATE,
                      source: "native_hardware_stream",
                    });
                  } else {
                    if (!bestSeenCoarse || (typeof acc === "number" && acc < (bestSeenCoarse.accuracy || Infinity))) {
                      bestSeenCoarse = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        accuracy: acc,
                        accuracyRadiusMeters: acc,
                        timestamp: loc.timestamp || Date.now(),
                        isCoarse: true,
                        isProvisional: true,
                        confidence: CONFIDENCE_TIERS.COARSE,
                        source: "native_hardware_stream_coarse",
                      };
                    }
                  }
                }
              }
            }
          )
            .then((s) => {
              sub = s;
              if (settled && sub && sub.remove) {
                try { sub.remove(); } catch (e) {}
              }
            })
            .catch((wErr) => {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                if (bestSeenCoarse) {
                  resolve(bestSeenCoarse);
                } else {
                  reject(wErr);
                }
              }
            });
        });
      } catch (watchErr) {
        freshError = watchErr;
      }
    }

    // 4c. Process acquired fix with Monotonic Request ID and Stale-Override Guards
    if (freshFix && requestId === currentRequestId) {
      const isCoarse = !!freshFix.isCoarse;
      if (
        !cachedLocation ||
        freshFix.timestamp >= (cachedLocation.timestamp || 0) ||
        freshFix.accuracy <= (cachedLocation.accuracy || 1000) ||
        (cachedLocation.isCoarse && !isCoarse)
      ) {
        if (!isCoarse) {
          _updateState({
            status: LOCATION_STATES.READY,
            location: freshFix,
            isCoarse: false,
            permissionStatus: "granted",
            error: null,
            errorMessage: null,
            isPermanentlyDenied: false,
            canAskAgain: true,
          });
        } else {
          _updateState({
            status: LOCATION_STATES.LOCATING,
            location: freshFix,
            isCoarse: true,
            permissionStatus: "granted",
            error: null,
            errorMessage: `Refining GPS accuracy... (±${Math.round(freshFix.accuracy || 0)}m). Tap Retry GPS.`,
            isPermanentlyDenied: false,
            canAskAgain: true,
          });
        }
        persistLocationToStorage(freshFix);
        LocationBenchmark.record(isCoarse ? "T2_COARSE_FIX_RECEIVED" : "T4_HIGH_ACCURACY_RESOLVED", {
          accuracy: freshFix.accuracy,
          source: freshFix.source,
        });
        return freshFix;
      }
    }

    // 4d. Fallback to cached, quickFix, or singleShotCoarseFix ONLY if valid coordinates exist
    const fallback = cachedLocation || quickFix || singleShotCoarseFix;
    if (fallback && isValidCoordinate(fallback.latitude, fallback.longitude)) {
      if (requestId === currentRequestId) {
        const isFresh = isLocationFresh(fallback, 60000);
        const isAcc = isLocationAccurate(fallback, LOCATION_CONFIG.HIGH_ACCURACY_THRESHOLD_METERS);
        const confidence = !isFresh
          ? CONFIDENCE_TIERS.STALE
          : isAcc
          ? CONFIDENCE_TIERS.ACCURATE
          : CONFIDENCE_TIERS.COARSE;

        const enrichedFallback = {
          ...fallback,
          accuracyRadiusMeters: fallback.accuracy || 1000,
          confidence,
        };

        if (isFresh && isAcc) {
          _updateState({
            status: LOCATION_STATES.READY,
            location: {
              ...enrichedFallback,
              isCoarse: false,
              isProvisional: false,
            },
            isCoarse: false,
            permissionStatus: "granted",
            error: null,
            errorMessage: null,
          });
          persistLocationToStorage(enrichedFallback);
          return {
            ...enrichedFallback,
            isCoarse: false,
            isProvisional: false,
          };
        } else {
          // Coarse/stale fallback: maintain provisional refining state with working Retry GPS
          _updateState({
            status: LOCATION_STATES.LOCATING,
            location: {
              ...enrichedFallback,
              isCoarse: true,
              isProvisional: true,
            },
            isCoarse: true,
            permissionStatus: "granted",
            error: null,
            errorMessage: `Refining GPS accuracy... (±${Math.round(fallback.accuracy || 0)}m). Tap Retry GPS.`,
          });
          persistLocationToStorage(enrichedFallback);
          return {
            ...enrichedFallback,
            isCoarse: true,
            isProvisional: true,
          };
        }
      }
    }

    // 4e. Neither fresh fix nor valid fallback exists
    if (requestId === currentRequestId) {
      const errCode = freshError?.code || freshError?.message || "LOCATION_UNAVAILABLE";
      _updateState({
        status: LOCATION_STATES.ERROR,
        error: errCode,
        errorMessage: `Could not acquire GPS position (${errCode}). Tap Retry GPS to try again.`,
      });
    }

    return null;
  }

  if (isNative && !activeExpoLocation) {
    _updateState({
      status: LOCATION_STATES.ERROR,
      error: "EXPO_LOCATION_UNAVAILABLE",
      errorMessage: "Native location module could not be initialized.",
    });
    return cachedLocation;
  }

  // Fallback (e.g. Node test runner without browser or Expo)
  if (cachedLocation) {
    _updateState({
      status: LOCATION_STATES.READY,
      location: cachedLocation,
      permissionStatus: "granted",
    });
    return cachedLocation;
  }

  return null;
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

    const acc = coords.accuracy || 20;
    const isAcc = acc <= LOCATION_CONFIG.HIGH_ACCURACY_THRESHOLD_METERS;

    // Reject coarse fixes > 150m ONLY if we already possess a fresh, high-accuracy fix
    if (!isAcc && cachedLocation && !cachedLocation.isCoarse && isLocationFresh(cachedLocation, 60000)) {
      return;
    }

    // Only broadcast updates if position shifted > 50 meters, better accuracy, or transitioning from coarse
    if (deltaMeters > 50 || !cachedLocation || cachedLocation.isCoarse || (cachedLocation.accuracy && acc < cachedLocation.accuracy)) {
      const isFresh = isLocationFresh(coords, 60000);
      const confidence = !isFresh
        ? CONFIDENCE_TIERS.STALE
        : isAcc
        ? CONFIDENCE_TIERS.ACCURATE
        : CONFIDENCE_TIERS.COARSE;

      const updated = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: acc,
        accuracyRadiusMeters: acc,
        timestamp: coords.timestamp || Date.now(),
        isCoarse: !isAcc,
        isProvisional: !isAcc || !isFresh,
        confidence,
        source,
      };

      if (isAcc && isFresh) {
        _updateState({
          status: LOCATION_STATES.READY,
          location: updated,
          isCoarse: false,
          permissionStatus: "granted",
          error: null,
          errorMessage: null,
        });
      } else {
        _updateState({
          status: LOCATION_STATES.LOCATING,
          location: updated,
          isCoarse: true,
          permissionStatus: "granted",
          error: null,
          errorMessage: `Refining GPS accuracy... (±${Math.round(acc)}m). Tap Retry GPS.`,
        });
      }
      persistLocationToStorage(updated);
    }
  };

  const activePlatform = getResolvedPlatform();
  const activeExpoLocation = getResolvedExpoLocation();
  const isNative = activePlatform.OS === "android" || activePlatform.OS === "ios";

  if (isNative && activeExpoLocation && activeExpoLocation.watchPositionAsync) {
    let sub = null;
    activeExpoLocation.watchPositionAsync(
      {
        accuracy: activeExpoLocation.Accuracy ? activeExpoLocation.Accuracy.Balanced : 3,
        distanceInterval: 50,
        timeInterval: 10000,
      },
      (loc) => {
        if (!loc?.coords) return;
        handlePosition({
          ...loc.coords,
          timestamp: loc.coords.timestamp || loc.timestamp || Date.now(),
        }, "native_watcher");
      }
    )
      .then((s) => {
        sub = s;
      })
      .catch((err) => console.warn("Native location watch notice:", err));

    activeWatcherCleanup = () => {
      try {
        if (sub && sub.remove) sub.remove();
      } catch (e) {}
    };
    return;
  }

  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => handlePosition(pos?.coords, "web_watcher"),
      (err) => console.warn("Web location watch notice:", err?.message),
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
        distanceInterval: 50,
        timeInterval: 10000,
      },
      (loc) => handlePosition(loc?.coords, "native_watcher")
    )
      .then((s) => {
        sub = s;
      })
      .catch((err) => console.warn("Native location watch notice:", err));

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
  if (typeof callback !== "function") return () => {};

  subscribers.add(callback);
  subscribersCount++;

  // Synchronously deliver latest known state on frame 0 (<1ms)
  try {
    callback(getLocationState());
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
/**
 * Strict locality string sanitizer: rejects pure numbers, house numbers, postal codes, plus-codes, and placeholders
 */
export function cleanLocalityString(str) {
  if (!str || typeof str !== "string") return null;
  let trimmed = str.trim();
  if (trimmed.length === 0) return null;
  // Strip leading plus-code if present (e.g. "7M8G+5F, Madanapalle" -> "Madanapalle")
  trimmed = trimmed.replace(/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}(?:,\s*|\s+|$)/i, "").trim();
  if (trimmed.length === 0) return null;
  // Reject pure numbers, punctuation, house numbers, or postal codes (e.g. "560038", "12-3/4", "#101")
  if (/^[\d\-\s,#/.]+$/.test(trimmed)) return null;
  // Reject strings that are primarily digits (e.g. "560038", "12345")
  if (/^\d{3,10}$/.test(trimmed.replace(/\s+/g, ""))) return null;
  // Reject standalone Plus Codes
  if (/^[A-Z0-9]{2,8}\+[A-Z0-9]{2,8}$/i.test(trimmed)) return null;
  // Reject generic or placeholder strings
  if (/^(unnamed road|current location|unknown location|null|undefined|n\/a)$/i.test(trimmed)) return null;
  return trimmed;
}

export async function reverseGeocodeLocation(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) return null;

  try {
    const activeExpoLocation = getResolvedExpoLocation();
    if (activeExpoLocation && activeExpoLocation.reverseGeocodeAsync) {
      const [geocode] = await activeExpoLocation.reverseGeocodeAsync({ latitude, longitude });
      if (geocode) {
        // Explicit 5-Tier Locality Precedence Hierarchy with strict numeric/plus-code rejection:
        // Tier 1: Local City (e.g. "Madanapalle", "Chennai", "Bengaluru")
        // Tier 2: Sublocality / Neighborhood (e.g. "Whitefield", "Indiranagar")
        // Tier 3: Specific Place / POI / Town Name (e.g. "Horsley Hills")
        // Tier 4: Subregion / Taluk / Tehsil (e.g. "Madanapalle Mandal", "Palamaner Mandal")
        // Tier 5: Administrative District (e.g. "Chittoor", "Annamayya")
        const localCity =
          cleanLocalityString(geocode.city) ||
          cleanLocalityString(geocode.sublocality) ||
          cleanLocalityString(geocode.name) ||
          cleanLocalityString(geocode.subregion) ||
          cleanLocalityString(geocode.district) ||
          null;

        const stateRegion = cleanLocalityString(geocode.region) || null;
        const subregionDistrict = cleanLocalityString(geocode.district) || cleanLocalityString(geocode.subregion) || null;
        const formattedCity = localCity || subregionDistrict;
        const formatted =
          [formattedCity, stateRegion].filter(Boolean).join(", ") ||
          "Current Location";

        return {
          city: localCity,
          state: stateRegion,
          district: subregionDistrict,
          formatted,
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
  __resetExpoLocationForTesting();
  currentLocationState = {
    status: LOCATION_STATES.IDLE,
    location: null,
    error: null,
    errorMessage: null,
    permissionStatus: null,
    isPermanentlyDenied: false,
    canAskAgain: true,
    isCoarse: false,
  };
  cachedLocation = null;
  cachedPermissionStatus = null;
  inFlightLocationPromise = null;
  inFlightRequestTimestamp = 0;
  currentRequestId = 0;
  subscribers.clear();
  subscribersCount = 0;
  LocationBenchmark.reset();
}
