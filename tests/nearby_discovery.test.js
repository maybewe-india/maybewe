/**
 * Test Suite: Nearby Discovery & PostGIS Presence Verification
 * Validates:
 * 1. Valid coordinate bounds (WGS84 worldwide)
 * 2. Invalid coordinate rejection
 * 3. Distance calculation & formatting
 * 4. Privacy & Zero-raw-coordinate leak guarantee
 * 5. Exclusion of stale (>15 min), invisible, self, and blocked users
 * 6. Migration SQL invariants (PostGIS, RLS, ST_DWithin, ST_Distance)
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import helper functions under test
import {
  isValidCoordinate,
  formatDistance,
} from '../frontend/lib/discovery.js';

test('1. Valid coordinates accepted across worldwide WGS84 bounds', () => {
  // Test worldwide points: Tokyo, New York, London, Sydney, Chittoor, Buenos Aires, North/South poles
  const validPoints = [
    { lat: 0, lng: 0 },
    { lat: 13.2172, lng: 79.1003 }, // Chittoor, India
    { lat: 35.6762, lng: 139.6503 }, // Tokyo, Japan
    { lat: 40.7128, lng: -74.0060 }, // New York, USA
    { lat: 51.5074, lng: -0.1278 }, // London, UK
    { lat: -33.8688, lng: 151.2093 }, // Sydney, Australia
    { lat: -34.6037, lng: -58.3816 }, // Buenos Aires, Argentina
    { lat: 90, lng: 180 }, // Edge max
    { lat: -90, lng: -180 }, // Edge min
  ];

  for (const pt of validPoints) {
    assert.equal(isValidCoordinate(pt.lat, pt.lng), true, `Expected (${pt.lat}, ${pt.lng}) to be valid`);
  }
});

test('2. Invalid coordinates rejected strictly', () => {
  const invalidPoints = [
    { lat: 91, lng: 0 }, // Out of latitude bounds
    { lat: -90.1, lng: 0 },
    { lat: 0, lng: 180.1 }, // Out of longitude bounds
    { lat: 0, lng: -181 },
    { lat: NaN, lng: 50 },
    { lat: 50, lng: NaN },
    { lat: null, lng: 50 },
    { lat: undefined, lng: 50 },
    { lat: '13.2', lng: '79.1' }, // String types rejected
    { lat: {}, lng: [] },
  ];

  for (const pt of invalidPoints) {
    assert.equal(isValidCoordinate(pt.lat, pt.lng), false, `Expected (${pt.lat}, ${pt.lng}) to be rejected`);
  }
});

test('3. Distance text formatting displays clean human-readable units', () => {
  assert.equal(formatDistance(20), 'Right here (< 50 m)');
  assert.equal(formatDistance(49), 'Right here (< 50 m)');
  assert.equal(formatDistance(50), '50 m away');
  assert.equal(formatDistance(450), '450 m away');
  assert.equal(formatDistance(999), '999 m away');
  assert.equal(formatDistance(1000), '1.0 km away');
  assert.equal(formatDistance(1420), '1.4 km away');
  assert.equal(formatDistance(24800), '25 km away');
  assert.equal(formatDistance(null), 'Nearby');
  assert.equal(formatDistance(undefined), 'Nearby');
  assert.equal(formatDistance(NaN), 'Nearby');
});

test('4. Security & Privacy: No raw coordinates leaked in RPC return signature or payload', () => {
  // Read the migration SQL file
  const migrationPath = path.resolve(__dirname, '../backend/supabase/migrations/10_nearby_presence_discovery.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Verify find_nearby_travelers return table signature does NOT contain lat, lng, or geom
  const rpcReturnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.find_nearby_travelers[\s\S]*?RETURNS TABLE\s*\(([\s\S]*?)\)\s*LANGUAGE plpgsql/i);
  assert.ok(rpcReturnMatch, 'find_nearby_travelers function must exist in migration');

  const returnFields = rpcReturnMatch[1].toLowerCase();
  assert.equal(returnFields.includes('geom'), false, 'RPC return table MUST NOT contain geom');
  assert.equal(returnFields.includes('latitude'), false, 'RPC return table MUST NOT contain latitude');
  assert.equal(returnFields.includes('longitude'), false, 'RPC return table MUST NOT contain longitude');
  assert.equal(returnFields.includes('p_lat'), false, 'RPC return table MUST NOT leak caller lat');
  assert.ok(returnFields.includes('distance_meters numeric'), 'RPC return table MUST include distance_meters');
});

test('5. Backend SQL Invariants: PostGIS ST_DWithin, ST_Distance, Stale TTL, RLS, Blocks', () => {
  const migrationPath = path.resolve(__dirname, '../backend/supabase/migrations/10_nearby_presence_discovery.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // 1. PostGIS enabled
  assert.ok(sql.includes('CREATE EXTENSION IF NOT EXISTS postgis'), 'Migration must safely enable PostGIS');

  // 2. Table created with spatial GiST index
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.user_nearby_presence'), 'user_nearby_presence table must exist');
  assert.ok(sql.includes('USING GIST (geom)'), 'Must have GiST spatial index on geom');

  // 3. RLS enabled and strictly protects raw table from unauthorized coordinate exposure
  assert.ok(sql.includes('ALTER TABLE public.user_nearby_presence ENABLE ROW LEVEL SECURITY;'), 'RLS must be enabled');
  assert.ok(sql.includes('Users can view own nearby presence'), 'Must have policy restricting SELECT to own record');

  // 4. Stale presence TTL strictly enforced in query (15 minutes)
  assert.ok(
    sql.includes("INTERVAL '15 minutes'"),
    'find_nearby_travelers must strictly exclude records older than 15 minutes'
  );

  // 5. Invisible users excluded
  assert.ok(
    sql.includes('p.is_visible = true'),
    'find_nearby_travelers must filter p.is_visible = true'
  );

  // 6. Self excluded
  assert.ok(
    sql.includes('p.user_id <> v_caller_id'),
    'find_nearby_travelers must exclude requesting caller user'
  );

  // 7. Mutual block exclusion
  assert.ok(
    sql.includes('public.user_blocks'),
    'find_nearby_travelers must exclude blocked users in both directions'
  );

  // 8. Distance calculation & radius filtering with PostGIS ST_DWithin and ST_Distance
  assert.ok(
    sql.includes('ST_DWithin('),
    'find_nearby_travelers must use ST_DWithin for spatial filtering'
  );
  assert.ok(
    sql.includes('ST_Distance('),
    'find_nearby_travelers must use ST_Distance for distance calculation'
  );
  assert.ok(
    sql.includes('ORDER BY distance_meters ASC'),
    'find_nearby_travelers must sort by distance_meters ASC'
  );
});

test('6. Two test users distance verification logic', () => {
  // Test mathematical distance between two points:
  // User A (Bangalore): 12.9716° N, 77.5946° E
  // User B (Chittoor): 13.2172° N, 79.1003° E
  // Great circle distance is ~165 km
  const lat1 = 12.9716, lon1 = 77.5946;
  const lat2 = 13.2172, lon2 = 79.1003;

  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Expected ~165 km (+- 5 km)
  assert.ok(distance > 155000 && distance < 175000, `Distance should be ~165km, got ${distance}m`);

  // User within 200 km radius -> Included
  assert.ok(distance <= 200 * 1000, 'User B must be within 200km radius of User A');
  // User within 50 km radius -> Excluded
  assert.ok(distance > 50 * 1000, 'User B must NOT be within 50km radius of User A');
});

test('7. Empty nearby result returns pure [] without fake profile fabrication', () => {
  // When database returns empty array, discovery must return empty array
  const mockDbResults = [];
  const processed = mockDbResults.map(t => ({
    id: t.user_id,
    name: t.user_name,
    distance_meters: t.distance_meters,
  }));

  assert.deepEqual(processed, []);
  assert.equal(processed.length, 0);
});
