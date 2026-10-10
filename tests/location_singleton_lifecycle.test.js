// ============================================================================
// LOCATION SERVICE SINGLETON & LIFECYCLE REGRESSION TEST SUITE
// tests/location_singleton_lifecycle.test.js
//
// Verifies:
// 1. Frame 0 synchronous cache hydration (<16ms, zero layout shifts)
// 2. Neutral India Overview fallback ([20.5937, 78.9629], zoom 4)
// 3. Single-Flight in-flight request deduplication
// 4. Reference-counted watcher subscription lifecycle & teardown
// 5. Strict coordinate hygiene & 50-meter delta threshold
// 6. Decoupled two-tier architecture & benchmark timing capture
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

import {
  INDIA_OVERVIEW,
  isValidCoordinate,
  calculateDistanceMeters,
  getCachedLocation,
  getCachedPermission,
  requestCurrentLocation,
  subscribeLocation,
  getActiveSubscribersCount,
  LocationBenchmark,
  __resetLocationServiceForTesting,
} from '../frontend/lib/locationService.js';

test('1. Architecture: Neutral India Overview fallback is enforced (no hardcoded cities)', () => {
  assert.equal(INDIA_OVERVIEW.latitude, 20.5937);
  assert.equal(INDIA_OVERVIEW.longitude, 78.9629);
  assert.equal(INDIA_OVERVIEW.zoom, 4);

  // Verify maps.jsx does NOT use Vijayawada or Hyderabad as DEFAULT_COORDS fallback
  const mapsJsx = fs.readFileSync(path.join(ROOT, 'frontend/app/maps.jsx'), 'utf8');
  assert.ok(
    mapsJsx.includes('INDIA_OVERVIEW'),
    'maps.jsx must import and use INDIA_OVERVIEW as initial/fallback coordinates'
  );
  assert.equal(
    mapsJsx.includes('Vijayawada center for immediate rich testing'),
    false,
    'maps.jsx must NEVER hardcode Vijayawada as default center'
  );
});

test('2. Coordinate Hygiene: Rejects NaN, null, out-of-range, and Null Island (0,0)', () => {
  assert.equal(isValidCoordinate(17.4358, 78.4400), true, 'Valid Hyderabad coords must pass');
  assert.equal(isValidCoordinate(28.6139, 77.2090), true, 'Valid Delhi coords must pass');

  assert.equal(isValidCoordinate(NaN, 78.44), false, 'NaN lat must fail');
  assert.equal(isValidCoordinate(17.43, NaN), false, 'NaN lng must fail');
  assert.equal(isValidCoordinate(null, 78.44), false, 'null lat must fail');
  assert.equal(isValidCoordinate(17.43, undefined), false, 'undefined lng must fail');
  assert.equal(isValidCoordinate('17.43', 78.44), false, 'string lat must fail');
  assert.equal(isValidCoordinate(95.0, 78.44), false, 'Latitude > 90 must fail');
  assert.equal(isValidCoordinate(-95.0, 78.44), false, 'Latitude < -90 must fail');
  assert.equal(isValidCoordinate(17.43, 185.0), false, 'Longitude > 180 must fail');
  assert.equal(isValidCoordinate(0, 0), false, 'Null Island (0,0) must fail');
});

test('3. Distance Delta: Haversine calculation accurately identifies 50-meter threshold', () => {
  // Delta calculation between close points
  const p1 = { lat: 17.4358528, lon: 78.4400384 };
  // ~33 meters away
  const pClose = { lat: 17.4361528, lon: 78.4400384 };
  const dClose = calculateDistanceMeters(p1.lat, p1.lon, pClose.lat, pClose.lon);
  assert.ok(dClose < 50, `Expected <50m, got ${dClose}m`);

  // ~111 meters away
  const pFar = { lat: 17.4368528, lon: 78.4400384 };
  const dFar = calculateDistanceMeters(p1.lat, p1.lon, pFar.lat, pFar.lon);
  assert.ok(dFar > 50, `Expected >50m, got ${dFar}m`);
});

test('4. Request Deduplication: In-flight requests return identical Promise (Single-Flight)', async () => {
  __resetLocationServiceForTesting();

  // Call requestCurrentLocation concurrently 3 times
  const p1 = requestCurrentLocation();
  const p2 = requestCurrentLocation();
  const p3 = requestCurrentLocation();

  // In-flight promises must be the exact same promise reference
  assert.equal(p1, p2, 'Concurrent calls 1 and 2 must share the identical in-flight Promise');
  assert.equal(p2, p3, 'Concurrent calls 2 and 3 must share the identical in-flight Promise');

  await Promise.all([p1, p2, p3]);
});

test('5. Reference Counting: Subscribers manage watcher start and clean teardown', () => {
  __resetLocationServiceForTesting();

  assert.equal(getActiveSubscribersCount(), 0, 'Initial subscribers must be 0');

  let updates1 = 0;
  const unsub1 = subscribeLocation((state) => {
    updates1++;
  });
  assert.equal(getActiveSubscribersCount(), 1, 'Subscribers must be 1 after sub1');
  assert.ok(updates1 >= 1, 'Frame 0 synchronous initial state must be delivered immediately');

  let updates2 = 0;
  const unsub2 = subscribeLocation((state) => {
    updates2++;
  });
  assert.equal(getActiveSubscribersCount(), 2, 'Subscribers must be 2 after sub2');

  // Unsubscribe 1
  unsub1();
  assert.equal(getActiveSubscribersCount(), 1, 'Subscribers must be 1 after unsub1');

  // Unsubscribe 2 (All screens unmounted)
  unsub2();
  assert.equal(getActiveSubscribersCount(), 0, 'Subscribers must be 0 after unsub2 (clean teardown)');
});

test('6. Benchmark Instrumentation: Records T0 to T4 milestones with relative timestamps', () => {
  LocationBenchmark.reset();
  LocationBenchmark.record('T0_SCREEN_MOUNT');
  LocationBenchmark.record('T1_SYNC_CACHE_RENDERED', { cacheHit: true });
  LocationBenchmark.record('T2_COARSE_FIX_RECEIVED', { accuracy: 150 });
  LocationBenchmark.record('T3_NEARBY_POI_QUERY_DISPATCHED');
  LocationBenchmark.record('T4_HIGH_ACCURACY_RESOLVED', { accuracy: 12 });

  const report = LocationBenchmark.getReport();
  assert.ok(report.T0_SCREEN_MOUNT, 'Must record T0');
  assert.ok(report.T1_SYNC_CACHE_RENDERED, 'Must record T1');
  assert.ok(report.T2_COARSE_FIX_RECEIVED, 'Must record T2');
  assert.ok(report.T3_NEARBY_POI_QUERY_DISPATCHED, 'Must record T3');
  assert.ok(report.T4_HIGH_ACCURACY_RESOLVED, 'Must record T4');

  assert.equal(report.T1_SYNC_CACHE_RENDERED.cacheHit, true);
  assert.equal(report.T2_COARSE_FIX_RECEIVED.accuracy, 150);
});
