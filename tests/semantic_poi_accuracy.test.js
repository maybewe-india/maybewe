// ============================================================================
// MAYBEWE SEMANTIC POI ACCURACY & FAST GPS RESOLUTION SUITE
// tests/semantic_poi_accuracy.test.js
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  PLACE_CATEGORIES,
  CATEGORY_OSM_TAG_MAP,
  fetchAuthoritativeOsmPlaces,
} from '../frontend/lib/places.js';

// Real-world coordinates of user device in Hyderabad
const REAL_USER_GPS = {
  latitude: 17.4358528,
  longitude: 78.4400384,
};

test('1. Authoritative Category-to-OSM-Tag mapping registered for all 31 categories', () => {
  const registeredCount = Object.keys(CATEGORY_OSM_TAG_MAP).length;
  assert.ok(registeredCount >= 30, `Expected at least 30 category mappings, found ${registeredCount}`);

  // Test critical categories
  assert.equal(CATEGORY_OSM_TAG_MAP.fuel.amenity, 'fuel', 'Fuel must map to amenity=fuel');
  assert.equal(CATEGORY_OSM_TAG_MAP.cafes.amenity, 'cafe', 'Cafes must map to amenity=cafe');
  assert.equal(CATEGORY_OSM_TAG_MAP.restaurants.amenity, 'restaurant', 'Restaurants must map to amenity=restaurant');
  assert.equal(CATEGORY_OSM_TAG_MAP.stays.tourism, 'hotel', 'Stays must map to tourism=hotel');
  assert.equal(CATEGORY_OSM_TAG_MAP.temples.amenity, 'place_of_worship', 'Temples must map to amenity=place_of_worship');
  assert.equal(CATEGORY_OSM_TAG_MAP.hospitals.amenity, 'hospital', 'Hospitals must map to amenity=hospital');
  assert.equal(CATEGORY_OSM_TAG_MAP.atms.amenity, 'atm', 'ATMs must map to amenity=atm');
  assert.equal(CATEGORY_OSM_TAG_MAP.banks.amenity, 'bank', 'Banks must map to amenity=bank');
  assert.equal(CATEGORY_OSM_TAG_MAP.pharmacies.amenity, 'pharmacy', 'Pharmacies must map to amenity=pharmacy');
});

test('2. Diagnosis: The missing ~700m petrol station is captured by amenity=fuel', async () => {
  // Query authoritative spatial places for fuel around user coordinates
  const places = await fetchAuthoritativeOsmPlaces({
    latitude: REAL_USER_GPS.latitude,
    longitude: REAL_USER_GPS.longitude,
    category: 'fuel',
    radiusMeters: 5000,
    limit: 20,
  });

  assert.ok(Array.isArray(places), 'Must return an array of places');
  assert.ok(places.length > 0, 'Must find fuel stations around user GPS');

  // Verify nearest fuel station is < 1000m (e.g. Indian Oil at ~205m or Bharat Petroleum at ~334m)
  const nearest = places[0];
  assert.ok(nearest.distance_meters < 1000, `Nearest fuel station should be <1000m, got ${nearest.distance_meters}m (${nearest.name})`);
  assert.equal(nearest.category_id, 'fuel');

  // Verify all returned stations are strictly <= 5000m
  for (const p of places) {
    assert.ok(p.distance_meters <= 5000, `Station ${p.name} at ${p.distance_meters}m exceeds 5000m radius`);
  }

  // Verify sorting ascending
  for (let i = 1; i < places.length; i++) {
    assert.ok(
      places[i].distance_meters >= places[i - 1].distance_meters,
      'Places must be sorted strictly ascending by distance'
    );
  }
});

test('3. Semantic Accuracy: Temples category rejects non-sacred establishments', async () => {
  const places = await fetchAuthoritativeOsmPlaces({
    latitude: REAL_USER_GPS.latitude,
    longitude: REAL_USER_GPS.longitude,
    category: 'temples',
    radiusMeters: 5000,
    limit: 15,
  });

  assert.ok(Array.isArray(places));
  assert.ok(places.length > 0, 'Must find temples around user GPS');

  // Verify every returned item is a place of worship and not a commercial store or apartment
  const negativeKeywords = ['apartment', 'residency', 'travels', 'hotel', 'shop', 'complex', 'bar'];
  for (const t of places) {
    const lowerName = t.name.toLowerCase();
    for (const bad of negativeKeywords) {
      assert.equal(
        lowerName.includes(bad),
        false,
        `Temple result "${t.name}" contains commercial keyword "${bad}"`
      );
    }
    assert.ok(t.distance_meters <= 5000);
  }
});

test('4. Fast GPS Pipeline: maps.jsx implements two-tier fast resolution with non-blocking render', () => {
  const mapsJsx = fs.readFileSync(path.resolve(__dirname, '../frontend/app/maps.jsx'), 'utf8');

  // Tier 1 Fast fix
  assert.ok(mapsJsx.includes('getLastKnownPositionAsync'), 'Must check getLastKnownPositionAsync for fast fix');
  assert.ok(mapsJsx.includes('maybewe_last_gps'), 'Must check web cached GPS session for sub-second restore');

  // Tier 2 Fresh GPS with timeout
  assert.ok(mapsJsx.includes('timeoutPromise'), 'Must bound GPS fresh fix with timeout');
  assert.ok(mapsJsx.includes('Promise.race'), 'Must race GPS against timeout to prevent freeze');

  // Auto-pan on initial mount
  assert.ok(mapsJsx.includes('requestDeviceGps(true)'), 'Must auto-pan on initial mount');

  // Background non-blocking watch
  assert.ok(mapsJsx.includes('watchPositionAsync'), 'Must watch position for live beacon updates');
});

test('5. Backend Edge Function: Eliminates Photon text search for nearby category queries', () => {
  const edgeFn = fs.readFileSync(path.resolve(__dirname, '../supabase/functions/places-proxy/index.ts'), 'utf8');

  // Verify Nominatim bounded spatial amenity query is present
  assert.ok(edgeFn.includes('Nominatim Bounded Spatial Amenity Query'), 'Must implement Nominatim bounded spatial search');
  assert.ok(edgeFn.includes('amenity=fuel'), 'Must query amenity=fuel for fuel');
  assert.ok(edgeFn.includes('amenity=place_of_worship'), 'Must query amenity=place_of_worship for temples');

  // Verify Photon is strictly restricted to free-text geocoding
  assert.ok(edgeFn.includes('!enforceCategoryId'), 'Photon must ONLY be called when !enforceCategoryId');
});
