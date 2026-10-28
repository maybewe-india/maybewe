import test from "node:test";
import assert from "node:assert/strict";

import safeStorage from "../frontend/lib/safeStorage.js";
import {
  STORAGE_KEYS,
  isGpsTelemetryPayload,
  isProfileLocationPayload,
  persistGpsTelemetryToStorage,
  persistProfileLocationToStorage,
  loadCachedGpsTelemetry,
  loadCachedProfileLocation,
  isValidCoordinate,
} from "../frontend/lib/locationService.js";

test("Phase 3.1: Explicit Storage Keys Contract", () => {
  assert.equal(STORAGE_KEYS.GPS_TELEMETRY, "@maybewe_gps_telemetry");
  assert.equal(STORAGE_KEYS.PROFILE_LOCATION, "@maybewe_profile_location");
  assert.equal(STORAGE_KEYS.LEGACY_USER_LOCATION, "@maybewe_user_location");
  assert.equal(STORAGE_KEYS.ASYNC_LOCATION, "@maybewe_gps_telemetry");
  assert.equal(STORAGE_KEYS.SESSION_GPS, "maybewe_last_gps");
});

test("Phase 3.2: Shape Discriminator Classification Engine", () => {
  // GPS Telemetry Payloads
  assert.equal(
    isGpsTelemetryPayload({ latitude: 12.9716, longitude: 77.5946, accuracy: 15 }),
    true,
    "Standard latitude/longitude coordinates must pass as GPS telemetry"
  );
  assert.equal(
    isGpsTelemetryPayload({ lat: 13.2172, lng: 79.1003, isGPS: true }),
    true,
    "Shorthand lat/lng coordinates must pass as GPS telemetry"
  );
  assert.equal(
    isGpsTelemetryPayload({ city: "Bengaluru", state: "Karnataka", isGPS: false }),
    false,
    "Profile location lacking coordinates must be rejected by isGpsTelemetryPayload"
  );
  assert.equal(
    isGpsTelemetryPayload({ lat: "invalid", lng: "coords" }),
    false,
    "Non-numeric coordinates must be rejected"
  );
  assert.equal(
    isGpsTelemetryPayload({ lat: 0, lng: 0 }),
    false,
    "Null island coordinates (0,0) must be rejected"
  );
  assert.equal(
    isGpsTelemetryPayload(null),
    false,
    "Null payload must be rejected"
  );

  // Profile Location Payloads
  assert.equal(
    isProfileLocationPayload({ city: "Chittoor", state: "Andhra Pradesh" }),
    true,
    "Profile city + state payload must pass as profile location"
  );
  assert.equal(
    isProfileLocationPayload({ location: "Horsley Hills, AP" }),
    true,
    "Profile location string payload must pass as profile location"
  );
  assert.equal(
    isProfileLocationPayload({ city: "Tirupati", isGPS: false }),
    true,
    "Profile city with isGPS false must pass as profile location"
  );
  assert.equal(
    isProfileLocationPayload({ lat: 12.9716, lng: 77.5946, accuracy: 25, isGPS: true }),
    false,
    "Pure coordinate payload without city must be rejected by isProfileLocationPayload"
  );
  assert.equal(
    isProfileLocationPayload({}),
    false,
    "Empty object must be rejected by isProfileLocationPayload"
  );
  assert.equal(
    isProfileLocationPayload(null),
    false,
    "Null payload must be rejected"
  );
});

test("Phase 3.3: Storage Cache Isolation Contract (Zero Cross-Key Overwriting)", async () => {
  await safeStorage.clear();

  // 1. Initial State: User saves their Profile Home Location (e.g. Chittoor)
  const initialProfile = {
    city: "Chittoor",
    state: "Andhra Pradesh",
    location: "Chittoor, Andhra Pradesh",
  };
  await persistProfileLocationToStorage(initialProfile);

  // Assert Profile location is stored in dedicated key
  const storedProfileRaw = await safeStorage.getItem(STORAGE_KEYS.PROFILE_LOCATION);
  assert.ok(storedProfileRaw, "Profile location must be stored in @maybewe_profile_location");
  const storedProfile = JSON.parse(storedProfileRaw);
  assert.equal(storedProfile.city, "Chittoor");
  assert.equal(storedProfile.isGPS, false);

  // Assert GPS key is empty
  const initialGpsRaw = await safeStorage.getItem(STORAGE_KEYS.GPS_TELEMETRY);
  assert.equal(initialGpsRaw, null, "@maybewe_gps_telemetry must remain empty when profile is saved");

  // 2. Hardware GPS Fix arrives from live background watcher (e.g. Bangalore traveler: 12.9716, 77.5946)
  const liveGpsFix = {
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 12,
    timestamp: Date.now(),
    isCoarse: false,
    source: "native_gps",
  };
  await persistGpsTelemetryToStorage(liveGpsFix);

  // Assert GPS telemetry is saved to dedicated GPS key
  const updatedGpsRaw = await safeStorage.getItem(STORAGE_KEYS.GPS_TELEMETRY);
  assert.ok(updatedGpsRaw, "GPS fix must be stored in @maybewe_gps_telemetry");
  const updatedGps = JSON.parse(updatedGpsRaw);
  assert.equal(updatedGps.latitude, 12.9716);
  assert.equal(updatedGps.longitude, 77.5946);
  assert.equal(updatedGps.isGPS, true);

  // 3. CRUCIAL CACHE ISOLATION PROOF:
  // Profile location key MUST remain completely intact and unmodified by the GPS update
  const preservedProfileRaw = await safeStorage.getItem(STORAGE_KEYS.PROFILE_LOCATION);
  const preservedProfile = JSON.parse(preservedProfileRaw);
  assert.equal(
    preservedProfile.city,
    "Chittoor",
    "Background GPS update must NEVER overwrite or clobber saved profile city"
  );
  assert.equal(
    preservedProfile.location,
    "Chittoor, Andhra Pradesh",
    "Background GPS update must NEVER overwrite saved profile location string"
  );

  // 4. Reverse Isolation Proof:
  // User updates profile home city to "Tirupati" -> live GPS coordinates MUST NOT be wiped
  await persistProfileLocationToStorage({
    city: "Tirupati",
    state: "Andhra Pradesh",
  });

  const verifiedGpsRaw = await safeStorage.getItem(STORAGE_KEYS.GPS_TELEMETRY);
  const verifiedGps = JSON.parse(verifiedGpsRaw);
  assert.equal(
    verifiedGps.latitude,
    12.9716,
    "Profile edit must NEVER wipe or mutate active GPS telemetry coordinates"
  );
  assert.equal(
    verifiedGps.longitude,
    77.5946,
    "Profile edit must NEVER wipe or mutate active GPS telemetry coordinates"
  );

  await safeStorage.clear();
});

test("Phase 3.4: Shape-Discriminating Backward-Compatible Legacy Reader", async () => {
  await safeStorage.clear();

  // Scenario A: Legacy storage holds an ephemeral GPS coordinate fix
  const legacyGpsFix = {
    lat: 13.0827,
    lng: 80.2707,
    accuracy: 25,
    isGPS: true,
    status: "granted",
    timestamp: new Date().toISOString(),
  };
  await safeStorage.setItem(STORAGE_KEYS.LEGACY_USER_LOCATION, JSON.stringify(legacyGpsFix));

  // loadCachedGpsTelemetry recovers the GPS coordinates
  const recoveredGps = await loadCachedGpsTelemetry();
  assert.ok(recoveredGps, "Legacy GPS fix must be recovered by loadCachedGpsTelemetry");
  assert.equal(recoveredGps.latitude, 13.0827);
  assert.equal(recoveredGps.longitude, 80.2707);

  // loadCachedProfileLocation must REJECT the legacy GPS fix (does not mistake GPS for home city)
  const rejectedProfile = await loadCachedProfileLocation();
  assert.equal(
    rejectedProfile,
    null,
    "loadCachedProfileLocation must reject legacy GPS coordinate payloads"
  );

  // Scenario B: Legacy storage holds a profile home location
  const legacyProfile = {
    city: "Madanapalle",
    state: "Andhra Pradesh",
    location: "Madanapalle, Andhra Pradesh",
    country: "India",
    isGPS: false,
    status: "granted",
  };
  await safeStorage.setItem(STORAGE_KEYS.LEGACY_USER_LOCATION, JSON.stringify(legacyProfile));

  // loadCachedProfileLocation recovers the profile location
  const recoveredProfile = await loadCachedProfileLocation();
  assert.ok(recoveredProfile, "Legacy profile location must be recovered by loadCachedProfileLocation");
  assert.equal(recoveredProfile.city, "Madanapalle");
  assert.equal(recoveredProfile.location, "Madanapalle, Andhra Pradesh");

  // loadCachedGpsTelemetry must REJECT the legacy profile location (does not mistake profile for GPS fix)
  const rejectedGps = await loadCachedGpsTelemetry();
  assert.equal(
    rejectedGps,
    null,
    "loadCachedGpsTelemetry must reject legacy profile payloads lacking coordinates"
  );

  // Scenario C: Dedicated key takes absolute precedence over legacy key
  await safeStorage.setItem(
    STORAGE_KEYS.GPS_TELEMETRY,
    JSON.stringify({ latitude: 15.3173, longitude: 75.7139, accuracy: 10, isGPS: true })
  );
  const dedicatedGps = await loadCachedGpsTelemetry();
  assert.equal(
    dedicatedGps.latitude,
    15.3173,
    "Dedicated GPS key must take precedence over legacy storage key"
  );

  await safeStorage.clear();
});
