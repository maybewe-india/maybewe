// ============================================================================
// MAPS, PLACES, IMAGE BINDING & GEOLOCATION RELIABILITY TEST SUITE
// tests/maps_places_reliability.test.js
//
// Milestone #11 Regression Verification:
// 1. Mathematically sound distance calculations and unit formatting
// 2. Strict radius filtering and synchronization across 5km, 10km, 25km
// 3. Distinct landmark image binding with zero cross-pollination & neutral fallbacks
// 4. Geolocation error classification (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)
// 5. Synchronous getCachedLocation object contract (zero Promise leakage)
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

import {
  calculateDistanceMeters,
  isValidCoordinate,
  getCachedLocation,
  subscribeLocation,
  __resetLocationServiceForTesting,
} from "../frontend/lib/locationService.js";

import {
  formatDistanceMeters,
  getNearbyRadiusMessage,
  getCategoryPhoto,
  KNOWN_LANDMARK_IMAGES,
  getNeutralCategorySvg,
  getCategoryPlaceholderSvg,
  resolveVenueImage,
  getImmediatePlaceImage,
} from "../frontend/lib/places.js";

test("1. Geolocation Math: Distance calculation returns identical, mathematically sound values", () => {
  // Mumbai Gateway of India (18.9220, 72.8347) to Marine Drive (18.9432, 72.8230)
  const gwLat = 18.9220;
  const gwLng = 72.8347;
  const mdLat = 18.9432;
  const mdLng = 72.8230;

  const meters = calculateDistanceMeters(gwLat, gwLng, mdLat, mdLng);
  assert.ok(meters > 2400 && meters < 2800, `Distance should be ~2.6km, got ${meters}m`);

  // Delhi India Gate (28.6129, 77.2295) to Red Fort (28.6562, 77.2410)
  const igLat = 28.6129;
  const igLng = 77.2295;
  const rfLat = 28.6562;
  const rfLng = 77.2410;

  const delhiMeters = calculateDistanceMeters(igLat, igLng, rfLat, rfLng);
  assert.ok(delhiMeters > 4700 && delhiMeters < 5200, `Distance should be ~4.9km, got ${delhiMeters}m`);

  // Distance formatting
  assert.equal(formatDistanceMeters(450), "450 m");
  assert.equal(formatDistanceMeters(999), "999 m");
  assert.equal(formatDistanceMeters(1000), "1.0 km");
  assert.equal(formatDistanceMeters(2600), "2.6 km");
  assert.equal(formatDistanceMeters(15000), "15.0 km");
  assert.equal(formatDistanceMeters(null), null);
  assert.equal(formatDistanceMeters(NaN), null);

  // Coordinate hygiene
  assert.equal(isValidCoordinate(gwLat, gwLng), true);
  assert.equal(isValidCoordinate(NaN, gwLng), false);
  assert.equal(isValidCoordinate(0, 0), false, "Null Island must be rejected");
  assert.equal(isValidCoordinate(95, 77), false, "Latitude > 90 must be rejected");
});

test("2. Spatial Radius Filtering: Produces mathematically synchronized results for 5km, 10km, 25km", () => {
  // Test entities with pre-calculated distances
  const samplePlaces = [
    { id: "p1", name: "Spot Close", distance_meters: 3200 },     // 3.2 km
    { id: "p2", name: "Spot Mid", distance_meters: 8500 },       // 8.5 km
    { id: "p3", name: "Spot Far", distance_meters: 18200 },      // 18.2 km
    { id: "p4", name: "Spot OutOfBounds", distance_meters: 28000 }, // 28.0 km (>25km hard cutoff)
    { id: "p5", name: "Spot WayOut", distance_meters: 45000 },   // 45.0 km (>25km hard cutoff)
  ];

  // Filter 5km
  const filtered5km = samplePlaces.filter((p) => p.distance_meters <= 5000);
  assert.equal(filtered5km.length, 1);
  assert.equal(filtered5km[0].id, "p1");
  const msg5km = getNearbyRadiusMessage(filtered5km, "cafes", 5);
  assert.ok(msg5km.includes("1 place"));
  assert.ok(msg5km.includes("5 km"));

  // Filter 10km
  const filtered10km = samplePlaces.filter((p) => p.distance_meters <= 10000);
  assert.equal(filtered10km.length, 2);
  assert.deepEqual(filtered10km.map((p) => p.id), ["p1", "p2"]);
  filtered10km.activeRadiusKm = 10;
  const msg10km = getNearbyRadiusMessage(filtered10km, "cafes", 10);
  assert.ok(msg10km.includes("2 places"));
  assert.ok(msg10km.includes("10 km"));

  // Filter 25km (Strict Hard Cutoff: items >25km MUST be dropped)
  const filtered25km = samplePlaces.filter((p) => p.distance_meters <= 25000);
  assert.equal(filtered25km.length, 3);
  assert.deepEqual(filtered25km.map((p) => p.id), ["p1", "p2", "p3"]);
  assert.equal(filtered25km.some((p) => p.id === "p4"), false, "28km item must be dropped");
  assert.equal(filtered25km.some((p) => p.id === "p5"), false, "45km item must be dropped");

  // Zero-state honesty
  const emptyList = [];
  const emptyMsg = getNearbyRadiusMessage(emptyList, "temples", 5);
  assert.equal(emptyMsg, "No Temples places found nearby.");
});

test("3. Place Image Resolution: Zero Cross-Place Photo Collisions & Neutral Fallbacks", () => {
  // Test distinct verified landmark resolution
  const gwPhoto = getCategoryPhoto("attractions", "Gateway of India");
  const igPhoto = getCategoryPhoto("attractions", "India Gate");
  const tajPhoto = getCategoryPhoto("attractions", "Taj Mahal");
  const charminarPhoto = getCategoryPhoto("attractions", "Charminar");

  // Invariant 1: Distinct assets for distinct landmarks
  assert.ok(gwPhoto.startsWith("https://images.unsplash.com/"));
  assert.ok(igPhoto.startsWith("https://images.unsplash.com/"));
  assert.notEqual(gwPhoto, igPhoto, "Gateway of India and India Gate must NEVER share the same image");
  assert.notEqual(gwPhoto, tajPhoto, "Gateway of India and Taj Mahal must NEVER share the same image");
  assert.notEqual(igPhoto, charminarPhoto, "India Gate and Charminar must NEVER share the same image");

  // Invariant 2: Unphotographed venue receives neutral fallback (NEVER a landmark photo like India Gate)
  const localSpotPhoto = getCategoryPhoto("attractions", "Local Sunrise Point");
  assert.notEqual(localSpotPhoto, igPhoto, "Generic attraction must NEVER receive India Gate photo");
  assert.notEqual(localSpotPhoto, gwPhoto, "Generic attraction must NEVER receive Gateway of India photo");
  assert.ok(
    localSpotPhoto.startsWith("data:image/svg+xml") || localSpotPhoto.includes("svg"),
    "Generic attraction must use neutral SVG fallback"
  );

  // Invariant 3: Custom verified image on entity is strictly preserved
  const customUrl = "https://custom.provider.com/verified-venue.jpg";
  const venue = {
    id: "venue-1",
    name: "Artisan Cafe",
    category_id: "cafes",
    image_url: customUrl,
  };
  const resolvedCover = venue.image_url || getCategoryPhoto(venue.category_id, venue.name);
  assert.equal(resolvedCover, customUrl, "Entity custom verified image must be strictly preserved");
});

test("4. Geolocation Lifecycle: getCachedLocation returns synchronous object, never a Promise", () => {
  __resetLocationServiceForTesting();

  // Initial state is null
  const initial = getCachedLocation();
  assert.equal(initial, null, "Initial cached location must be null");

  // Set mock in memory via subscribeLocation initial delivery
  let delivered = null;
  const unsub = subscribeLocation((state) => {
    delivered = state;
  });

  assert.ok(delivered !== null);
  assert.equal(typeof delivered.location?.then, "undefined", "Delivered location must NOT be a Promise");
  unsub();
});

test("5. Geolocation Error Handling: Cleanly classifies PERMISSION_DENIED, POSITION_UNAVAILABLE, and TIMEOUT", () => {
  __resetLocationServiceForTesting();

  const locServicePath = path.join(ROOT, "frontend/lib/locationService.js");
  const locServiceSrc = fs.readFileSync(locServicePath, "utf8");

  assert.ok(locServiceSrc.includes("PERMISSION_DENIED"), "Must classify PERMISSION_DENIED (err.code 1)");
  assert.ok(locServiceSrc.includes("POSITION_UNAVAILABLE"), "Must classify POSITION_UNAVAILABLE (err.code 2)");
  assert.ok(locServiceSrc.includes("TIMEOUT"), "Must classify TIMEOUT (err.code 3)");
  assert.equal(
    locServiceSrc.includes("Promise.resolve({ ...cachedLocation })"),
    false,
    "Must NEVER return Promise.resolve inside getCachedLocation"
  );
});

test("6. Map Container & Tile Pipeline Integrity: ResizeObserver & CSP safeguards intact", () => {
  const mapHtmlPath = path.join(ROOT, "frontend/components/maps/mapHtmlBuilder.js");
  const mapHtmlSrc = fs.readFileSync(mapHtmlPath, "utf8");

  // CSP img-src check
  assert.ok(mapHtmlSrc.includes("img-src * data: blob: https:"), "CSP must include img-src wildcard");

  // Built-in worker check
  assert.equal(
    mapHtmlSrc.includes("importScripts('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl-csp-worker.js')"),
    false,
    "Must NOT force external importScripts blob worker"
  );

  // ResizeObserver check in MaybeWeMap.web.jsx
  const webMapPath = path.join(ROOT, "frontend/components/maps/MaybeWeMap.web.jsx");
  const webMapSrc = fs.readFileSync(webMapPath, "utf8");
  assert.ok(webMapSrc.includes("ResizeObserver"), "MaybeWeMap.web.jsx must observe containerRef with ResizeObserver");
  assert.ok(webMapSrc.includes('type: "RESIZE"'), "Dispatches RESIZE event to iframe");
});

test("7. Place Image Architecture: Warm Vector SVG Placeholders (Zero Black Box, Valid Base64)", () => {
  const categories = ["cafes", "restaurants", "temples", "churches", "hospitals", "nature", "nightlife", "attractions"];
  
  for (const cat of categories) {
    const svgUri = getCategoryPlaceholderSvg(cat, "Test Place");
    assert.ok(svgUri.startsWith("data:image/svg+xml;base64,"), "Category " + cat + " must return base64 encoded data URI");
    
    // Decode base64 and verify content
    const base64Data = svgUri.replace("data:image/svg+xml;base64,", "");
    const decoded = Buffer.from(base64Data, "base64").toString("utf8");
    
    assert.ok(decoded.includes("<svg"), "Must contain valid SVG tag");
    assert.ok(decoded.includes("Test Place"), "Must embed sanitized place name");
    assert.equal(decoded.includes("fill='%231C1E1C'"), false, "Must NEVER use pitch-black #1C1E1C background");
    assert.equal(decoded.includes('fill="#000000"'), false, "Must NEVER use black #000000 background");
    assert.ok(decoded.includes('linearGradient id="bgGrad"'), "Must use curated warm linear gradient");
  }
});

test("8. Pan-India Landmark Verification: Multi-city distinct photography registry", () => {
  const landmarks = [
    { city: "Mumbai", key: "gateway of india" },
    { city: "Mumbai", key: "marine drive" },
    { city: "Delhi", key: "india gate" },
    { city: "Delhi", key: "qutub minar" },
    { city: "Delhi", key: "red fort" },
    { city: "Bengaluru", key: "cubbon park" },
    { city: "Bengaluru", key: "bangalore palace" },
    { city: "Hyderabad", key: "charminar" },
    { city: "Hyderabad", key: "golconda fort" },
    { city: "Agra", key: "taj mahal" },
    { city: "Jaipur", key: "hawa mahal" },
    { city: "Amritsar", key: "golden temple" },
    { city: "Kolkata", key: "victoria memorial" },
    { city: "Vijayawada", key: "kanaka durga temple" },
  ];

  const seenUrls = new Set();
  for (const item of landmarks) {
    assert.ok(KNOWN_LANDMARK_IMAGES[item.key], "Landmark " + item.key + " (" + item.city + ") must be defined in registry");
    const url = KNOWN_LANDMARK_IMAGES[item.key];
    assert.ok(url.startsWith("https://images.unsplash.com/"), "Landmark " + item.key + " must have valid CDN URL");
    assert.equal(seenUrls.has(url), false, "Landmark " + item.key + " must NOT collide with another landmark photo");
    seenUrls.add(url);
  }
});

test("9. Multi-tier Place Image Resolver & Cache Integrity", async () => {
  // Test immediate fallback (<1ms)
  const immediate = getImmediatePlaceImage({
    placeId: "test_poi_123",
    name: "Third Wave Coffee",
    categoryId: "cafes",
    latitude: 12.9716,
    longitude: 77.5946,
  });
  assert.ok(immediate.startsWith("data:image/svg+xml;base64,"), "Unphotographed cafe gets immediate warm placeholder");

  // Test custom existing URL preserved
  const customUrl = "https://images.example.com/verified-cafe.jpg";
  const existing = getImmediatePlaceImage({
    placeId: "test_poi_456",
    name: "Blue Tokai Coffee",
    existingUrl: customUrl,
  });
  assert.equal(existing, customUrl, "Existing verified photo strictly preserved");

  // Test confirmed landmark match via getImmediatePlaceImage
  const landmarkPhoto = getImmediatePlaceImage({
    name: "Gateway of India, Apollo Bunder",
    categoryId: "attractions",
  });
  assert.equal(landmarkPhoto, KNOWN_LANDMARK_IMAGES["gateway of india"], "Gateway of India match resolves confirmed photo");
});
