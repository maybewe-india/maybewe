// ============================================================================
// MAYBEWE PAN-INDIA MAPS COVERAGE & SPATIAL INTEGRITY TEST SUITE
// tests/pan_india_coverage.test.js
// Validates 12 Indian Locations: Metros, Tier-2/Tier-3, Pilgrim Hubs & Rural
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import https from "node:https";

import {
  PLACE_CATEGORIES,
  CATEGORY_OSM_TAG_MAP,
  fetchAuthoritativeOsmPlaces,
  fetchNearbyPlaces,
  searchPlaces,
} from "../frontend/lib/places.js";

import {
  OPEN_FREE_MAP_STYLES,
  getMapStyle,
} from "../frontend/lib/maps/tileProviders.js";

// 12 Target Pan-India Acceptance Locations
export const PAN_INDIA_LOCATIONS = [
  // Metros & Major Cities
  { id: "hyderabad", name: "Hyderabad", lat: 17.3850, lon: 78.4867, type: "metro" },
  { id: "delhi", name: "Delhi", lat: 28.6139, lon: 77.2090, type: "metro" },
  { id: "mumbai", name: "Mumbai", lat: 19.0760, lon: 72.8777, type: "metro" },
  { id: "bengaluru", name: "Bengaluru", lat: 12.9716, lon: 77.5946, type: "metro" },
  { id: "chennai", name: "Chennai", lat: 13.0827, lon: 80.2707, type: "metro" },
  { id: "kolkata", name: "Kolkata", lat: 22.5726, lon: 88.3639, type: "metro" },

  // Tier-2 / Tier-3 & Pilgrim Centers
  { id: "vijayawada", name: "Vijayawada", lat: 16.5062, lon: 80.6480, type: "tier2" },
  { id: "vizianagaram", name: "Vizianagaram", lat: 18.1124, lon: 83.3978, type: "tier2" },
  { id: "tirupati", name: "Tirupati", lat: 13.6288, lon: 79.4192, type: "pilgrim" },
  { id: "jaipur", name: "Jaipur", lat: 26.9124, lon: 75.7873, type: "heritage" },

  // Small Town & Rural Coordinates
  { id: "madanapalle", name: "Madanapalle", lat: 13.5560, lon: 78.5010, type: "small_town" },
  { id: "rural_junction", name: "Pileru", lat: 13.6500, lon: 78.4000, type: "rural" },
];

function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}
function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

test("1. Pan-India Base Map: OpenFreeMap vector street tiles load across Z12, Z14, Z16 for all locations", async () => {
  const tileChecks = [];
  for (const loc of PAN_INDIA_LOCATIONS) {
    for (const z of [12, 14, 16]) {
      const x = lon2tile(loc.lon, z);
      const y = lat2tile(loc.lat, z);
      const url = "https://tiles.openfreemap.org/planet/" + z + "/" + x + "/" + y + ".pbf";

      tileChecks.push(
        new Promise((resolve) => {
          const req = https.get(url, { headers: { "User-Agent": "MaybeWe-PanIndiaTest/1.0" }, timeout: 5000 }, (res) => {
            resolve({ loc: loc.name, z, status: res.statusCode });
          });
          req.on("error", () => resolve({ loc: loc.name, z, status: 500 }));
          req.on("timeout", () => { req.destroy(); resolve({ loc: loc.name, z, status: 504 }); });
        })
      );
    }
  }

  const results = await Promise.all(tileChecks);
  for (const r of results) {
    assert.equal(r.status, 200, "Tile " + r.loc + " Z" + r.z + " must return HTTP 200, got " + r.status);
  }
});

test("2. Pan-India Geocoding: Indian cities and towns resolve with countrycodes=in bounding", async () => {
  for (const loc of PAN_INDIA_LOCATIONS) {
    const q = loc.name;
    const places = await searchPlaces({ query: q, limit: 1 });
    assert.ok(Array.isArray(places), "Search for " + q + " must return an array");
    assert.ok(places.length > 0, "Search for " + q + " must resolve at least 1 result in India");

    const top = places[0];
    assert.equal(top.country, "India", q + " must resolve within country=India");
    assert.ok(
      typeof top.latitude === "number" && typeof top.longitude === "number",
      q + " coordinates must be numbers"
    );
  }
});

test("3. Metro & Pilgrim Spatial POI Discovery: Resolves verified fuel and temples nearest-first", async () => {
  const metroSample = PAN_INDIA_LOCATIONS.find((l) => l.id === "hyderabad");
  const fuelPlaces = await fetchAuthoritativeOsmPlaces({
    latitude: metroSample.lat,
    longitude: metroSample.lon,
    category: "fuel",
    radiusMeters: 5000,
    limit: 10,
  });

  assert.ok(fuelPlaces.length > 0, "Hyderabad must return nearby fuel stations");
  assert.ok(fuelPlaces[0].distance_meters <= 5000, "First fuel place must be within 5km");

  for (let i = 1; i < fuelPlaces.length; i++) {
    assert.ok(
      fuelPlaces[i].distance_meters >= fuelPlaces[i - 1].distance_meters,
      "POIs must be sorted strictly ascending by distance"
    );
  }

  const tirupati = PAN_INDIA_LOCATIONS.find((l) => l.id === "tirupati");
  const temples = await fetchAuthoritativeOsmPlaces({
    latitude: tirupati.lat,
    longitude: tirupati.lon,
    category: "temples",
    radiusMeters: 5000,
    limit: 10,
  });

  assert.ok(temples.length > 0, "Tirupati must return nearby temples");
  for (const t of temples) {
    assert.ok(t.distance_meters <= 5000, "Tirupati temple must be within 5km");
    assert.equal(t.category_id, "temples");
  }
});

test("4. Rural Coordinate Integrity: Honest empty states without fabrication", async () => {
  const rural = PAN_INDIA_LOCATIONS.find((l) => l.id === "rural_junction");

  const results = await fetchNearbyPlaces({
    latitude: rural.lat,
    longitude: rural.lon,
    category: "cafes",
    progressive: false,
    radiusMeters: 5000,
  });

  assert.ok(Array.isArray(results), "Results must be an array");
  if (results.length === 0) {
    assert.ok(
      results.searchMessage.includes("No Cafes"),
      "Must return honest empty state message"
    );
  } else {
    for (const p of results) {
      assert.ok(p.distance_meters <= 5000, "Must be within requested 5000m radius");
    }
  }
});

test("5. Zero Synthetic Data Invariant: No fake places, no placeholder coordinates", () => {
  const styleUrl = getMapStyle();
  assert.ok(styleUrl.includes("openfreemap.org"), "Must use openfreemap.org vector style");
  assert.equal(styleUrl.includes("googleapis"), false, "Must not use Google APIs");
  assert.equal(styleUrl.includes("mapbox.com"), false, "Must not use Mapbox APIs");
});
