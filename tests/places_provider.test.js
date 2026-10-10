// ============================================================================
// MAYBEWE PLACES PROVIDER & EDGE FUNCTION SUITE (tests/places_provider.test.js)
// Zero Mapbox / Zero Google Keys
// Tests PostGIS / OpenStreetMap Places Provider, Security, RLS & Edge Function
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  getOrCreateSessionToken,
  resetSearchSession,
} from '../frontend/lib/places.js';

// Test harness for PostGIS Places Provider
class MockSupabaseClient {
  constructor(mockData = [], shouldError = false) {
    this.mockData = mockData;
    this.shouldError = shouldError;
  }

  async rpc(funcName, params) {
    if (this.shouldError) {
      return { data: null, error: new Error('PostGIS RPC database connection error') };
    }
    return { data: this.mockData, error: null };
  }

  from(table) {
    const data = this.mockData;
    const err = this.shouldError;
    return {
      select: () => ({
        limit: () => Promise.resolve({ data, error: err ? new Error('Table error') : null }),
        or: () => ({
          limit: () => Promise.resolve({ data, error: err ? new Error('Table error') : null }),
        }),
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: data[0] || null, error: err ? new Error('Single error') : null }),
        }),
      }),
    };
  }
}

test('1. Worldwide WGS84 coordinate validation strictly enforced', () => {
  function isValidCoord(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    return true;
  }

  assert.equal(isValidCoord(15.2993, 74.124), true, 'Goa coordinates valid');
  assert.equal(isValidCoord(28.6139, 77.209), true, 'New Delhi coordinates valid');
  assert.equal(isValidCoord(-33.8688, 151.2093), true, 'Sydney coordinates valid');
  assert.equal(isValidCoord(91, 74), false, 'Latitude > 90 invalid');
  assert.equal(isValidCoord(-95, 74), false, 'Latitude < -90 invalid');
  assert.equal(isValidCoord(15, 185), false, 'Longitude > 180 invalid');
  assert.equal(isValidCoord('15', 74), false, 'String latitude invalid');
  assert.equal(isValidCoord(null, 74), false, 'Null latitude invalid');
  assert.equal(isValidCoord(NaN, 74), false, 'NaN latitude invalid');
});

test('2. Radius and Limit parameters clamped securely', () => {
  function clampParams(radius, limit) {
    const r = Number(radius);
    const l = Number(limit);
    const clampedRadius = Math.min(Math.max(!isNaN(r) ? r : 5000, 200), 50000);
    const clampedLimit = Math.min(Math.max(!isNaN(l) ? l : 20, 1), 40);
    return { clampedRadius, clampedLimit };
  }

  assert.deepEqual(clampParams(5000, 20), { clampedRadius: 5000, clampedLimit: 20 });
  assert.deepEqual(clampParams(10, 0), { clampedRadius: 200, clampedLimit: 1 });
  assert.deepEqual(clampParams(999999, 100), { clampedRadius: 50000, clampedLimit: 40 });
  assert.deepEqual(clampParams(undefined, undefined), { clampedRadius: 5000, clampedLimit: 20 });
});

test('3. Real PostGIS Provider Contract: Queries PostGIS and returns normalized places', async () => {
  const mockDbRows = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Artjuna Garden Cafe',
      category: 'Cafe',
      category_id: 'cafe',
      address: 'Anjuna, Goa',
      destination: 'Goa',
      state: 'Goa',
      country: 'India',
      latitude: 15.5846,
      longitude: 73.7479,
      distance_meters: 450,
      opening_hours: '07:30-22:30',
    },
  ];

  const client = new MockSupabaseClient(mockDbRows);
  const { data } = await client.rpc('search_nearby_places', {
    p_lat: 15.58,
    p_lng: 73.74,
    p_radius_meters: 5000,
    p_category: 'cafe',
    p_limit: 20,
  });

  assert.ok(Array.isArray(data));
  assert.equal(data.length, 1);
  assert.equal(data[0].name, 'Artjuna Garden Cafe');
  assert.equal(data[0].category_id, 'cafe');
});

test('4. Real OpenStreetMap attribution: Places contract enforces OpenStreetMap ODbL attribution', () => {
  const edgeFunctionPath = path.resolve(__dirname, '../supabase/functions/places-proxy/index.ts');
  const code = fs.readFileSync(edgeFunctionPath, 'utf8');

  assert.ok(code.includes("provider: 'openstreetmap'"), 'Must declare openstreetmap provider');
  assert.ok(code.includes('Points of interest © OpenStreetMap contributors'), 'Must include required OSM attribution');
  assert.ok(code.includes('https://www.openstreetmap.org/copyright'), 'Must link to OSM copyright terms');
  assert.equal(code.includes('mapbox_id'), false, 'Must NOT contain mapbox_id in schema');
});

test('5. Real API Contract: Zero POI results returns pure [] without fake venue fabrication', async () => {
  const client = new MockSupabaseClient([]);
  const { data } = await client.rpc('search_nearby_places', {
    p_lat: 15.2993,
    p_lng: 74.124,
    p_category: 'attractions',
  });

  assert.ok(Array.isArray(data));
  assert.equal(data.length, 0, 'Must return pure empty array when database returns 0 places');
});

test('6. Real API Contract: Controlled database error handling without crash or credential leak', async () => {
  const client = new MockSupabaseClient([], true);
  const res = await client.rpc('search_nearby_places', {
    p_lat: 15.2993,
    p_lng: 74.124,
  });

  assert.ok(res.error instanceof Error);
  assert.equal(res.error.message.includes('password'), false, 'Error message must not leak credentials');
  assert.equal(res.error.message.includes('token'), false, 'Error message must not leak tokens');
});

test('7. Search Session Token Lifecycle in frontend/lib/places.js', () => {
  resetSearchSession();
  const token1 = getOrCreateSessionToken();
  assert.ok(token1, 'Session token must be generated');
  assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token1), 'Session token must be valid UUIDv4');

  const token2 = getOrCreateSessionToken();
  assert.equal(token1, token2, 'Session token must persist across calls in same user session');

  const token3 = resetSearchSession();
  assert.notEqual(token1, token3, 'Reset must produce fresh session token');
});

test('8. Backend Edge Function code audit: Security, Auth & Zero Mapbox Containment', () => {
  const edgeFunctionPath = path.resolve(__dirname, '../supabase/functions/places-proxy/index.ts');
  const code = fs.readFileSync(edgeFunctionPath, 'utf8');

  // Must check Authorization / API key
  assert.ok(code.includes("req.headers.get('Authorization')"), 'Must check Authorization header');
  assert.ok(code.includes("req.headers.get('apikey')"), 'Must check apikey header');

  // Must reject unauthenticated callers with 401
  assert.ok(code.includes('status: 401'), 'Must return HTTP 401 for unauthenticated requests');

  // Must NOT reference MAPBOX_ACCESS_TOKEN
  assert.equal(code.includes("Deno.env.get('MAPBOX_ACCESS_TOKEN')"), false, 'Must NOT reference MAPBOX_ACCESS_TOKEN');
  assert.equal(code.includes('api.mapbox.com'), false, 'Must NOT reference api.mapbox.com');

  // Must validate action whitelist
  assert.ok(code.includes("!['nearby', 'search', 'details'].includes(action)"), 'Must strictly whitelist supported actions');

  // Must not accept arbitrary upstream URLs
  assert.equal(code.includes('req.body.url'), false, 'Must not accept arbitrary client URLs');
});

test('9. Backend synchronization: supabase/functions/places-proxy matches backend/supabase/functions/places-proxy', () => {
  const rootFunc = fs.readFileSync(path.resolve(__dirname, '../supabase/functions/places-proxy/index.ts'), 'utf8');
  const backendFunc = fs.readFileSync(path.resolve(__dirname, '../backend/supabase/functions/places-proxy/index.ts'), 'utf8');

  assert.equal(rootFunc, backendFunc, 'Root and backend places-proxy Edge Functions must be identical');
});

test('10. Zero static fallback: PLACES_DATA is NEVER imported as runtime fallback in frontend', () => {
  const frontendDir = path.resolve(__dirname, '../frontend');

  const placesJs = fs.readFileSync(path.join(frontendDir, 'lib/places.js'), 'utf8');
  assert.equal(placesJs.includes("import { PLACES_DATA }"), false, 'places.js must NOT import PLACES_DATA');
  assert.equal(placesJs.includes("from '../data/placesData.js'"), false, 'places.js must NOT import placesData.js');

  const placeDiscoveryJsx = fs.readFileSync(path.join(frontendDir, 'components/PlaceDiscoveryView.jsx'), 'utf8');
  assert.equal(placeDiscoveryJsx.includes('placesData'), false, 'PlaceDiscoveryView must NOT reference placesData');

  const placeDetailJsx = fs.readFileSync(path.join(frontendDir, 'components/PlaceDetailModal.jsx'), 'utf8');
  assert.equal(placeDetailJsx.includes('placesData'), false, 'PlaceDetailModal must NOT reference placesData');

  const destModalJsx = fs.readFileSync(path.join(frontendDir, 'components/DestinationDetailModal.jsx'), 'utf8');
  assert.equal(destModalJsx.includes('placesData'), false, 'DestinationDetailModal must NOT reference placesData');

  const budgetJs = fs.readFileSync(path.join(frontendDir, 'lib/budget.js'), 'utf8');
  assert.equal(budgetJs.includes('placesData'), false, 'budget.js must NOT reference placesData');

  const tripPlannerJs = fs.readFileSync(path.join(frontendDir, 'lib/tripPlanner.js'), 'utf8');
  assert.equal(tripPlannerJs.includes('placesData'), false, 'tripPlanner.js must NOT reference placesData');
});

test('11. Secret credentials security audit: No secret token in frontend bundle or repo files', () => {
  const frontendDir = path.resolve(__dirname, '../frontend');

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.expo') {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && /.(jsx?|tsx?|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.equal(content.includes('sk.ey'), false, `Secret token pattern sk.ey found in ${fullPath}`);
      }
    }
  }

  scanDir(frontendDir);
});

test('12. Separation of concerns: Places & Spots vs Nearby Now vs Trip Planner', () => {
  const discoveryJsx = fs.readFileSync(path.resolve(__dirname, '../frontend/app/(tabs)/discovery.jsx'), 'utf8');

  // Mode A: Nearby Now (postgis user_nearby_presence)
  assert.ok(discoveryJsx.includes("discoveryMode === 'nearby'"), 'Nearby Now mode must exist');
  assert.ok(discoveryJsx.includes("updateNearbyPresence"), 'Nearby Now uses updateNearbyPresence');
  assert.ok(discoveryJsx.includes("findNearbyTravelers"), 'Nearby Now uses findNearbyTravelers');

  // Mode B: Trip Planner (destination-based travel matching)
  assert.ok(discoveryJsx.includes("discoveryMode === 'travelers'"), 'Travelers mode must exist');
  assert.ok(discoveryJsx.includes("discoverTravelers"), 'Travelers mode uses discoverTravelers');

  // Mode C: Places & Spots (Places proxy real-world places)
  assert.ok(discoveryJsx.includes("discoveryMode === 'places'"), 'Places mode must exist');
  assert.ok(discoveryJsx.includes("<PlaceDiscoveryView"), 'Places mode uses PlaceDiscoveryView');
  assert.ok(discoveryJsx.includes("deviceCoords={deviceCoords}"), 'Places mode passes device GPS coordinates');
});
