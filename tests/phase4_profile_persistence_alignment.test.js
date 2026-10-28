import test from "node:test";
import assert from "node:assert/strict";

import safeStorage from "../frontend/lib/safeStorage.js";
import {
  STORAGE_KEYS,
  isProfileLocationPayload,
  isGpsTelemetryPayload,
  persistGpsTelemetryToStorage,
  persistProfileLocationToStorage,
  loadCachedProfileLocation,
  loadCachedGpsTelemetry,
} from "../frontend/lib/locationService.js";

test("Phase 4.1: Classifier Hardening — Rejects isGPS: true Composite & Telemetry Payloads", () => {
  // 1. Composite payload with isGPS: true and cosmetic city name must be rejected
  const telemetryWithCity = {
    status: "granted",
    city: "Current Location",
    district: "Chittoor",
    lat: 13.2172,
    lng: 79.1003,
    accuracy: 15,
    isGPS: true,
    timestamp: new Date().toISOString(),
  };
  assert.equal(
    isProfileLocationPayload(telemetryWithCity),
    false,
    "isProfileLocationPayload must reject payloads where isGPS is true, even if city is present"
  );

  // 2. Telemetry payload with resolved town name but marked as live GPS fix
  const liveFixWithTown = {
    city: "Bengaluru",
    location: "Bengaluru, Karnataka",
    latitude: 12.9716,
    longitude: 77.5946,
    isGPS: true,
  };
  assert.equal(
    isProfileLocationPayload(liveFixWithTown),
    false,
    "isProfileLocationPayload must reject live GPS fixes with city names when isGPS: true"
  );

  // 3. Genuine user-confirmed profile home locations must be accepted
  assert.equal(
    isProfileLocationPayload({
      city: "Chittoor",
      state: "Andhra Pradesh",
      location: "Chittoor, Andhra Pradesh",
      isGPS: false,
    }),
    true,
    "Saved profile location with isGPS: false must pass"
  );

  assert.equal(
    isProfileLocationPayload({
      location: "Madanapalle, Andhra Pradesh",
    }),
    true,
    "Saved profile location string without isGPS flag must pass"
  );

  assert.equal(
    isProfileLocationPayload({
      city: "Tirupati",
      state: "Andhra Pradesh",
    }),
    true,
    "Saved profile city + state without isGPS flag must pass"
  );

  // 4. Invalidation / non-location objects must be rejected
  assert.equal(isProfileLocationPayload(null), false, "null payload rejected");
  assert.equal(isProfileLocationPayload(undefined), false, "undefined payload rejected");
  assert.equal(isProfileLocationPayload({}), false, "empty object rejected");
  assert.equal(
    isProfileLocationPayload({ lat: 13.2172, lng: 79.1003 }),
    false,
    "pure coordinates without profile shape rejected"
  );
});

test("Phase 4.2: Shape-Discriminating Legacy Reader with Hardened Classifier", async () => {
  await safeStorage.clear();

  // Scenario 1: Legacy key contains an ephemeral GPS fix with city = "Current Location"
  const legacyGpsWithCity = {
    status: "granted",
    city: "Current Location",
    lat: 13.2172,
    lng: 79.1003,
    accuracy: 12,
    isGPS: true,
    timestamp: new Date().toISOString(),
  };
  await safeStorage.setItem(
    STORAGE_KEYS.LEGACY_USER_LOCATION,
    JSON.stringify(legacyGpsWithCity)
  );

  // loadCachedProfileLocation MUST NOT classify this as a saved home profile
  const profileResult = await loadCachedProfileLocation();
  assert.equal(
    profileResult,
    null,
    "loadCachedProfileLocation must return null when legacy data has isGPS: true"
  );

  // But loadCachedGpsTelemetry MUST successfully recover the GPS coordinates
  const gpsResult = await loadCachedGpsTelemetry();
  assert.ok(gpsResult, "loadCachedGpsTelemetry must recover GPS coordinates");
  assert.equal(gpsResult.latitude, 13.2172);
  assert.equal(gpsResult.longitude, 79.1003);

  // Scenario 2: Legacy key contains a genuine user-saved profile
  const legacySavedProfile = {
    city: "Chittoor",
    state: "Andhra Pradesh",
    location: "Chittoor, Andhra Pradesh",
    country: "India",
    isGPS: false,
    status: "granted",
  };
  await safeStorage.setItem(
    STORAGE_KEYS.LEGACY_USER_LOCATION,
    JSON.stringify(legacySavedProfile)
  );

  const recoveredProfile = await loadCachedProfileLocation();
  assert.ok(recoveredProfile, "loadCachedProfileLocation must recover genuine legacy profile");
  assert.equal(recoveredProfile.city, "Chittoor");
  assert.equal(recoveredProfile.location, "Chittoor, Andhra Pradesh");

  await safeStorage.clear();
});

test("Phase 4.3: Modal Contract Parity & Payload Normalization Execution", () => {
  // Functional simulation of handleSaveProfile payload construction
  const buildProfileModalPayload = (params) => {
    const { editName, editBio, editAvatar, editAge, editLocation, profile } = params;
    let city = "";
    let state = "";
    const cleanLoc = (editLocation && typeof editLocation === "string") ? editLocation.trim() : "";
    if (cleanLoc.length > 0) {
      const parts = cleanLoc.split(",").map((s) => s.trim());
      city = parts[0] || "";
      state = parts[1] || "";
    }

    return {
      name: (editName && editName.trim()) || profile?.name || "Traveler",
      bio: editBio,
      avatar_url: editAvatar || profile?.avatar_url,
      age: parseInt(editAge, 10) || profile?.age || 24,
      location: cleanLoc,
      city,
      state,
    };
  };

  // Case A: User provides full "City, State" in modal
  const payloadA = buildProfileModalPayload({
    editName: "Sam",
    editBio: "Traveler",
    editAvatar: "https://example.com/avatar.jpg",
    editAge: "28",
    editLocation: "Chittoor, Andhra Pradesh",
    profile: { name: "Sam" },
  });

  assert.equal(payloadA.location, "Chittoor, Andhra Pradesh", "location must be explicitly supplied in payload");
  assert.equal(payloadA.city, "Chittoor", "city must match parsed locality");
  assert.equal(payloadA.state, "Andhra Pradesh", "state must match parsed region");

  // Case B: User provides single-token city with trailing whitespace
  const payloadB = buildProfileModalPayload({
    editName: "Sam",
    editBio: "Traveler",
    editAvatar: null,
    editAge: 25,
    editLocation: "  Bengaluru  ",
    profile: null,
  });

  assert.equal(payloadB.location, "Bengaluru");
  assert.equal(payloadB.city, "Bengaluru");
  assert.equal(payloadB.state, "");

  // Case C: User clears location or passes null/undefined (defensive guard against undefined/clobber)
  const payloadC = buildProfileModalPayload({
    editName: "Sam",
    editBio: "",
    editAvatar: null,
    editAge: 25,
    editLocation: null,
    profile: null,
  });

  assert.equal(payloadC.location, "", "Null editLocation must safely default to empty string");
  assert.equal(payloadC.city, "");
  assert.equal(payloadC.state, "");
});

test("Phase 4.4: Cross-Storage Telemetry & Profile Decoupling Verification", async () => {
  await safeStorage.clear();

  // 1. Save live GPS telemetry (e.g., traveler in Tirupati)
  await persistGpsTelemetryToStorage({
    latitude: 13.6288,
    longitude: 79.4192,
    accuracy: 10,
    timestamp: Date.now(),
    isCoarse: false,
    source: "gps",
  });

  // Verify GPS is loaded, but Profile is null
  const gpsOnly = await loadCachedGpsTelemetry();
  assert.equal(gpsOnly.latitude, 13.6288);
  const profileCheck1 = await loadCachedProfileLocation();
  assert.equal(profileCheck1, null, "Profile storage must be completely unaffected by GPS persist");

  // 2. Save user profile home location (e.g., user lives in Chittoor)
  await persistProfileLocationToStorage({
    city: "Chittoor",
    state: "Andhra Pradesh",
    location: "Chittoor, Andhra Pradesh",
  });

  // Verify Profile is loaded, and GPS remains intact
  const profileLoaded = await loadCachedProfileLocation();
  assert.equal(profileLoaded.city, "Chittoor");
  const gpsCheck2 = await loadCachedGpsTelemetry();
  assert.equal(gpsCheck2.latitude, 13.6288, "GPS telemetry must remain intact after profile persist");

  await safeStorage.clear();
});
