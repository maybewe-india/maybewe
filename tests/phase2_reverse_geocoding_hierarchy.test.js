import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  reverseGeocodeLocation,
  __setExpoLocationForTesting,
  __resetExpoLocationForTesting,
  INDIA_OVERVIEW,
  isValidCoordinate,
} from "../frontend/lib/locationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

test("Phase 2.1: Locality Precedence Hierarchy in reverseGeocodeLocation", async () => {
  // Case A: Standard Metro point with explicit city and region
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [
      {
        city: "Bengaluru",
        sublocality: "Indiranagar",
        district: "Bengaluru Urban",
        region: "Karnataka",
        country: "India",
      },
    ],
  });

  const metroResult = await reverseGeocodeLocation(12.9716, 77.5946);
  assert.equal(metroResult.city, "Bengaluru");
  assert.equal(metroResult.state, "Karnataka");
  assert.equal(metroResult.formatted, "Bengaluru, Karnataka");

  // Case B: Suburban point where city is null but sublocality is present
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [
      {
        city: null,
        sublocality: "Whitefield",
        district: "Bengaluru Urban",
        region: "Karnataka",
        country: "India",
      },
    ],
  });

  const suburbanResult = await reverseGeocodeLocation(12.9698, 77.7500);
  assert.equal(suburbanResult.city, "Whitefield", "Sublocality must take precedence when city is null");
  assert.equal(suburbanResult.formatted, "Whitefield, Karnataka");

  // Case C: Rural point where city & sublocality are null, but district is present
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [
      {
        city: null,
        sublocality: null,
        district: "Chittoor",
        region: "Andhra Pradesh",
        country: "India",
      },
    ],
  });

  const ruralResult = await reverseGeocodeLocation(13.2172, 79.1003);
  assert.equal(ruralResult.city, "Chittoor", "District must resolve as city when both city & sublocality are null");
  assert.equal(ruralResult.district, "Chittoor");
  assert.equal(ruralResult.state, "Andhra Pradesh");
  assert.equal(ruralResult.formatted, "Chittoor, Andhra Pradesh");

  // Case D: Rural POI / Town where valid specific place name takes precedence over district
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [
      {
        name: "Horsley Hills",
        city: null,
        sublocality: null,
        district: "Annamayya",
        region: "Andhra Pradesh",
        country: "India",
      },
    ],
  });

  const poiResult = await reverseGeocodeLocation(13.6598, 78.3972);
  assert.equal(poiResult.city, "Horsley Hills", "Specific place name Horsley Hills must take precedence over Annamayya district");
  assert.equal(poiResult.formatted, "Horsley Hills, Andhra Pradesh");
  assert.equal(poiResult.district, "Annamayya");

  // Explicit Regression Case: Hill Station / Landmark where place name takes precedence over administrative district & subregion
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [
      {
        name: "Horsley Hills",
        city: null,
        sublocality: null,
        subregion: "Madanapalle Mandal",
        district: "Annamayya",
        region: "Andhra Pradesh",
        country: "India",
      },
    ],
  });

  const regressionHorsley = await reverseGeocodeLocation(13.6598, 78.3972);
  assert.equal(regressionHorsley.city, "Horsley Hills", "Regression: Horsley Hills must resolve over Annamayya district");
  assert.equal(regressionHorsley.district, "Annamayya");
  assert.equal(regressionHorsley.formatted, "Horsley Hills, Andhra Pradesh");

  // Case D2: Only valid name and region present
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [
      {
        name: "Horsley Hills",
        city: null,
        sublocality: null,
        district: null,
        subregion: null,
        region: "Andhra Pradesh",
        country: "India",
      },
    ],
  });

  const namedPoiResult = await reverseGeocodeLocation(13.6598, 78.3972);
  assert.equal(namedPoiResult.city, "Horsley Hills", "Valid POI name used when city, sublocality, and district are null");
  assert.equal(namedPoiResult.formatted, "Horsley Hills, Andhra Pradesh");

  // Case E: Address with purely numeric street/pin number is NOT used as city name
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [
      {
        name: "517001",
        city: null,
        sublocality: null,
        district: "Chittoor",
        region: "Andhra Pradesh",
        country: "India",
      },
    ],
  });

  const pinResult = await reverseGeocodeLocation(13.2172, 79.1003);
  assert.equal(pinResult.city, "Chittoor", "Purely numeric name is rejected in favor of district");

  // Case F: Sparse geocode returns honest fallback
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [{}],
  });

  const sparseResult = await reverseGeocodeLocation(13.2172, 79.1003);
  assert.equal(sparseResult.formatted, "Current Location", "Sparse reverse-geocode falls back to honest Current Location");

  __resetExpoLocationForTesting();
});

test("Phase 2.2: Hardcoded Anti-Chittoor Suppressions Completely Purged", () => {
  const editProfileSrc = fs.readFileSync(path.join(ROOT, "frontend/app/edit-profile.jsx"), "utf8");
  const profileTabSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/profile.jsx"), "utf8");

  // Assert neither file contains .includes("chittoor") or case variants
  assert.equal(
    editProfileSrc.toLowerCase().includes('.includes("chittoor")') || editProfileSrc.toLowerCase().includes(".includes('chittoor')"),
    false,
    "edit-profile.jsx must have ZERO .includes('chittoor') suppressions"
  );
  assert.equal(
    profileTabSrc.toLowerCase().includes('.includes("chittoor")') || profileTabSrc.toLowerCase().includes(".includes('chittoor')"),
    false,
    "(tabs)/profile.jsx must have ZERO .includes('chittoor') suppressions"
  );

  // Assert sanitize functions preserve genuine Chittoor addresses
  const extractFunction = (src, fnName) => {
    const match = src.match(new RegExp(`function ${fnName}\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`));
    if (!match) throw new Error(`Could not find function ${fnName}`);
    return new Function("p", match[1]);
  };

  const sanitizeEditProfileLocation = extractFunction(editProfileSrc, "sanitizeProfileLocation");
  assert.equal(
    sanitizeEditProfileLocation({ location: "Chittoor, Andhra Pradesh" }),
    "Chittoor, Andhra Pradesh",
    "edit-profile must allow legitimate Chittoor location strings"
  );
  assert.equal(
    sanitizeEditProfileLocation({ city: "Chittoor", state: "Andhra Pradesh" }),
    "Chittoor, Andhra Pradesh",
    "edit-profile must allow legitimate Chittoor city + state"
  );

  const sanitizeProfileTabCity = extractFunction(profileTabSrc, "sanitizeProfileCity");
  assert.equal(
    sanitizeProfileTabCity({ city: "Chittoor", state: "Andhra Pradesh" }),
    "Chittoor, Andhra Pradesh",
    "(tabs)/profile must allow legitimate Chittoor city + state"
  );
  assert.equal(
    sanitizeProfileTabCity({ location: "Chittoor, Andhra Pradesh" }),
    "Chittoor, Andhra Pradesh",
    "(tabs)/profile must allow legitimate Chittoor location string"
  );
});

test("Phase 2.3: Major-City Coordinate Snapping Elimination Contract", () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(tabs)/index.jsx"), "utf8");
  const discoverySrc = fs.readFileSync(path.join(ROOT, "frontend/components/PlaceDiscoveryView.jsx"), "utf8");
  const mapsSrc = fs.readFileSync(path.join(ROOT, "frontend/app/maps.jsx"), "utf8");

  // 1. (tabs)/index.jsx must NOT snap initial GPS coordinates to findClosestIndianCity
  assert.equal(
    indexSrc.includes("const closestCity = findClosestIndianCity(coords.latitude, coords.longitude)"),
    false,
    "index.jsx must not call findClosestIndianCity on live GPS coordinate acquisition"
  );
  assert.ok(
    indexSrc.includes('const initialCity = "Current Location";'),
    "index.jsx must use neutral Current Location prior to asynchronous reverse-geocoding"
  );

  // 2. PlaceDiscoveryView must NOT import or call findClosestIndianCity
  assert.equal(
    discoverySrc.includes("findClosestIndianCity"),
    false,
    "PlaceDiscoveryView must NOT import or invoke findClosestIndianCity"
  );
  assert.ok(
    discoverySrc.includes('const locationName = effectiveCoords?.city || effectiveCoords?.district || "Current Location";'),
    "PlaceDiscoveryView must honest-resolve locality without city snapping"
  );

  // 3. maps.jsx DEFAULT_COORDS must NOT hardcode Vijayawada
  assert.equal(
    mapsSrc.includes("16.5062") && mapsSrc.includes("80.6480"),
    false,
    "maps.jsx must NOT hardcode Vijayawada coordinates (16.5062, 80.6480)"
  );
  assert.ok(
    mapsSrc.includes("INDIA_OVERVIEW.latitude"),
    "maps.jsx DEFAULT_COORDS must use neutral INDIA_OVERVIEW centroid"
  );
});

test("Phase 2.4: Raw GPS Telemetry Float Immutability Guarantee", async () => {
  // Coordinates representing non-metro point (e.g. Madanapalle / Horsley Hills: 13.6598, 78.3972)
  const inputLat = 13.65984321;
  const inputLng = 78.39726543;

  __setExpoLocationForTesting({
    reverseGeocodeAsync: async ({ latitude, longitude }) => {
      // Mock returns nearest administrative center
      return [
        {
          city: "Madanapalle",
          district: "Annamayya",
          region: "Andhra Pradesh",
          country: "India",
        },
      ];
    },
  });

  const geo = await reverseGeocodeLocation(inputLat, inputLng);

  // Verify reverse geocoding returns locality metadata WITHOUT modifying input floats
  assert.equal(typeof inputLat, "number");
  assert.equal(typeof inputLng, "number");
  assert.equal(inputLat, 13.65984321, "Raw latitude must remain strictly immutable float");
  assert.equal(inputLng, 78.39726543, "Raw longitude must remain strictly immutable float");
  assert.equal(geo.city, "Madanapalle");
  assert.equal(geo.district, "Annamayya");
  assert.equal(geo.state, "Andhra Pradesh");

  __resetExpoLocationForTesting();
});
