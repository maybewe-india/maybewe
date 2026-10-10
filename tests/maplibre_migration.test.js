// ============================================================================
// MAYBEWE MAPLIBRE MIGRATION AUDIT SUITE (tests/maplibre_migration.test.js)
// Comprehensive automated verification of Mapbox removal and MapLibre readiness
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import { buildMapLibreHtml } from '../frontend/components/maps/mapHtmlBuilder.js';
import {
  getMapStyle,
  getAttributionConfig,
  OPEN_FREE_MAP_STYLES,
  OSM_ATTRIBUTION,
  TILE_PROVIDERS,
} from '../frontend/lib/maps/tileProviders.js';
import {
  calculateHaversineMeters,
  calculateRoute,
  formatDistance,
  formatDuration,
  generateOrientationGeometry,
  ROUTE_TYPES,
} from '../frontend/lib/routing.js';

test('1. Zero Runtime Mapbox References in Frontend & Edge Function Code', () => {
  const dirsToScan = [
    path.join(rootDir, 'frontend/components/maps'),
    path.join(rootDir, 'frontend/lib/maps'),
    path.join(rootDir, 'frontend/lib/routing.js'),
    path.join(rootDir, 'supabase/functions/places-proxy'),
    path.join(rootDir, 'backend/supabase/functions/places-proxy'),
  ];

  const forbiddenTerms = [
    'api.mapbox.com',
    'mapboxgl.accessToken',
    'EXPO_PUBLIC_MAPBOX_WEB_TOKEN',
    'EXPO_PUBLIC_MAPBOX_MOBILE_TOKEN',
    'MAPBOX_ACCESS_TOKEN',
    'mapbox://',
    'mapbox-gl.css',
    'mapbox-gl.js',
  ];

  for (const dir of dirsToScan) {
    if (fs.existsSync(dir)) {
      const stats = fs.statSync(dir);
      const files = stats.isDirectory()
        ? fs.readdirSync(dir).map((f) => path.join(dir, f)).filter((f) => fs.statSync(f).isFile())
        : [dir];

      for (const filePath of files) {
        if (/\.(jsx?|tsx?|json)$/.test(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          for (const term of forbiddenTerms) {
            assert.equal(
              content.includes(term),
              false,
              `File ${path.relative(rootDir, filePath)} contains forbidden Mapbox reference: ${term}`
            );
          }
        }
      }
    }
  }
});

test('2. Environment Files Cleaned: No Mapbox Credentials in .env or .env.example', () => {
  const envFile = path.join(rootDir, '.env');
  const envExampleFile = path.join(rootDir, '.env.example');

  const envContent = fs.readFileSync(envFile, 'utf8');
  assert.equal(envContent.includes('MAPBOX'), false, '.env must not contain MAPBOX');
  assert.ok(envContent.includes('EXPO_PUBLIC_MAP_STYLE_URL'), '.env must contain EXPO_PUBLIC_MAP_STYLE_URL');

  const envExampleContent = fs.readFileSync(envExampleFile, 'utf8');
  assert.equal(envExampleContent.includes('EXPO_PUBLIC_MAPBOX_WEB_TOKEN'), false, '.env.example must not contain EXPO_PUBLIC_MAPBOX_WEB_TOKEN');
  assert.equal(envExampleContent.includes('EXPO_PUBLIC_MAPBOX_MOBILE_TOKEN'), false, '.env.example must not contain EXPO_PUBLIC_MAPBOX_MOBILE_TOKEN');
});

test('3. Tile Provider Abstraction: Dynamic Style Resolution and Legal Attribution', () => {
  assert.equal(TILE_PROVIDERS.OPEN_FREE_MAP, 'openfreemap');

  // Light style
  const lightStyle = getMapStyle({ isDark: false });
  assert.equal(lightStyle, OPEN_FREE_MAP_STYLES.liberty);
  assert.ok(lightStyle.includes('openfreemap.org/styles/liberty'));

  // Dark style
  const darkStyle = getMapStyle({ isDark: true });
  assert.equal(darkStyle, OPEN_FREE_MAP_STYLES.positron);
  assert.ok(darkStyle.includes('openfreemap.org/styles/positron'));

  // Custom style override
  const custom = getMapStyle({ customStyleUrl: 'https://tiles.maybewe.com/style.json' });
  assert.equal(custom, 'https://tiles.maybewe.com/style.json');

  // Attribution
  const attrib = getAttributionConfig();
  assert.ok(attrib.compact);
  assert.ok(attrib.customAttribution.includes('OpenStreetMap'));
  assert.ok(attrib.customAttribution.includes('OpenFreeMap'));
});

test('4. Routing Module: Strict Distinction between Real Road Route and Orientation Estimate', async () => {
  const start = { latitude: 12.9716, longitude: 77.5946 };
  const end = { latitude: 12.9698, longitude: 77.7499 };

  const straightMeters = calculateHaversineMeters(start.latitude, start.longitude, end.latitude, end.longitude);
  assert.ok(straightMeters > 15000 && straightMeters < 18000, 'Great circle distance should be ~16-17 km');

  // When no private OSRM routing server is configured, must return ORIENTATION_ESTIMATE
  const route = await calculateRoute({ startCoords: start, endCoords: end, mode: 'walking' });
  assert.ok(route);
  assert.equal(route.type, ROUTE_TYPES.ORIENTATION_ESTIMATE, 'Must identify as orientation_estimate');
  assert.equal(route.isRealRoadRoute, false, 'Must strictly declare isRealRoadRoute = false');
  assert.equal(route.geojson.properties.isEstimate, true, 'GeoJSON must flag isEstimate = true');
  assert.equal(route.durationMinutes, null, 'Must NOT fake a turn-by-turn road duration when unverified');
  assert.ok(route.message.includes('Direct line orientation only'), 'Must inform user to open Turn-by-Turn navigation');
});

test('5. Routing Module: Rejects Invalid Coordinates and Excessive Distance', async () => {
  // Invalid coordinates
  const invalidRes = await calculateRoute({
    startCoords: { latitude: 95, longitude: 77.5 },
    endCoords: { latitude: 12.9, longitude: 77.6 },
  });
  assert.equal(invalidRes.type, ROUTE_TYPES.UNAVAILABLE);
  assert.equal(invalidRes.error, 'Invalid coordinates');

  // Excessive distance (> 500 km)
  const farRes = await calculateRoute({
    startCoords: { latitude: 12.9716, longitude: 77.5946 }, // Bengaluru
    endCoords: { latitude: 28.6139, longitude: 77.2090 }, // Delhi (~1740 km)
  });
  assert.equal(farRes.type, ROUTE_TYPES.UNAVAILABLE);
  assert.ok(farRes.error.includes('exceeds maximum route distance'));
});

test('6. Routing Module: Real Road Routing Contract with Private Backend', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.EXPO_PUBLIC_ROUTING_API_URL;

  process.env.EXPO_PUBLIC_ROUTING_API_URL = 'https://routing.maybewe.internal';

  globalThis.fetch = async (url) => {
    assert.ok(url.startsWith('https://routing.maybewe.internal/route/v1/walking/'));
    return {
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [
          {
            distance: 18240,
            duration: 13680,
            geometry: {
              type: 'LineString',
              coordinates: [
                [77.5946, 12.9716],
                [77.6200, 12.9750],
                [77.7499, 12.9698],
              ],
            },
          },
        ],
      }),
    };
  };

  try {
    const route = await calculateRoute({
      startCoords: { latitude: 12.9716, longitude: 77.5946 },
      endCoords: { latitude: 12.9698, longitude: 77.7499 },
      mode: 'walking',
    });

    assert.equal(route.type, ROUTE_TYPES.REAL_ROAD);
    assert.equal(route.isRealRoadRoute, true);
    assert.equal(route.distanceMeters, 18240);
    assert.equal(route.durationMinutes, 228);
    assert.equal(route.geojson.properties.isEstimate, false);
    assert.equal(route.geojson.properties.provider, 'osrm-private-road');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.EXPO_PUBLIC_ROUTING_API_URL = originalEnv;
  }
});

test('7. PostGIS Migration 11: Schema, Indexes, RLS & Seed Data', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/11_places_postgis_discovery.sql');
  assert.ok(fs.existsSync(migPath), 'Migration 11 must exist');

  const sql = fs.readFileSync(migPath, 'utf8');

  // Invariants
  assert.ok(sql.includes('ALTER TABLE public.places'), 'Extends public.places');
  assert.ok(sql.includes('extensions.geography(Point, 4326)'), 'Uses WGS84 geography');
  assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_places_geom'), 'Spatial GIST index present');
  assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_places_name_trgm'), 'Trigram search index present');
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled');
  assert.ok(sql.includes('GRANT SELECT ON public.places TO anon, authenticated'), 'Explicit read grants present');
  assert.ok(sql.includes('CREATE POLICY "Public places are viewable by all"'), 'Public read policy present');
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.search_nearby_places'), 'search_nearby_places RPC present');
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.search_places_text'), 'search_places_text RPC present');
  assert.ok(sql.includes('SECURITY DEFINER'), 'SECURITY DEFINER enabled for safe PostGIS access');
  assert.ok(sql.includes('SET search_path = public, extensions, pg_temp'), 'Safe search_path configured');

  // Real Indian seed data verified
  assert.ok(sql.includes('Curlies Beach Shack'), 'Goa Curlies seed present');
  assert.ok(sql.includes('Hawa Mahal (Palace of Winds)'), 'Jaipur Hawa Mahal seed present');
  assert.ok(sql.includes('Gateway of India'), 'Mumbai Gateway of India seed present');
  assert.ok(sql.includes('India Gate'), 'Delhi India Gate seed present');
  assert.ok(sql.includes('Hadimba Devi Temple'), 'Manali Hadimba seed present');
  assert.ok(sql.includes('Kashi Art Cafe'), 'Kerala Kashi Art Cafe seed present');
});

test('8. HTML Map Generator: Complete MapLibre Vector Configuration & Dashed Orientation', () => {
  const orientationRoute = generateOrientationGeometry(
    { latitude: 19.076, longitude: 72.8777 },
    { latitude: 19.0531, longitude: 72.8296 }
  );

  const html = buildMapLibreHtml({
    userCoords: { latitude: 19.076, longitude: 72.8777 },
    places: [
      {
        place_id: 'place_subko_bandra',
        name: 'Subko Coffee Bandra',
        category: 'Cafe',
        category_id: 'cafe',
        latitude: 19.0531,
        longitude: 72.8296,
      },
    ],
    selectedPlaceId: 'place_subko_bandra',
    routeGeoJson: orientationRoute,
  });

  // Scripts & Styles
  assert.ok(html.includes('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js'));
  assert.ok(html.includes('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css'));

  // Elements
  assert.ok(html.includes('Subko Coffee Bandra'), 'Spot name rendered in marker');
  assert.ok(html.includes('place_subko_bandra'), 'Place ID bound to marker dataset');
  assert.ok(html.includes('maybewe-route-line'), 'Route line layer created');
  assert.ok(html.includes('line-dasharray'), 'Orientation route rendered with line-dasharray');
  assert.ok(html.includes('user-beacon-wrapper'), 'User location beacon created');
  assert.ok(html.includes('OpenStreetMap'), 'OpenStreetMap attribution included');
  assert.ok(html.includes('OpenFreeMap'), 'OpenFreeMap attribution included');
  assert.ok(html.includes('recenterBtn'), 'Recenter control included');
});

test('9. No Hardcoded Chittoor or Fake Data in Runtime Files', () => {
  const filesToCheck = [
    path.join(rootDir, 'frontend/components/maps/MaybeWeMap.jsx'),
    path.join(rootDir, 'frontend/components/maps/MaybeWeMap.web.jsx'),
    path.join(rootDir, 'frontend/components/maps/mapHtmlBuilder.js'),
    path.join(rootDir, 'frontend/lib/maps/tileProviders.js'),
    path.join(rootDir, 'frontend/lib/routing.js'),
    path.join(rootDir, 'frontend/lib/places.js'),
  ];

  for (const f of filesToCheck) {
    const text = fs.readFileSync(f, 'utf8');
    assert.equal(text.includes('chittoor'), false, `${path.basename(f)} contains chittoor`);
    assert.equal(text.includes('Chittoor'), false, `${path.basename(f)} contains Chittoor`);
  }
});
