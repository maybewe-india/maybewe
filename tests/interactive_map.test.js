// ============================================================================
// MAYBEWE INTERACTIVE MAP SUITE (tests/interactive_map.test.js)
// Zero Mapbox / Zero Google Keys
// Tests MapLibre GL JS v4, OpenFreeMap/OSM Tiles, Real Device GPS, POIs & Routing
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import of builder
import { buildMapLibreHtml } from '../frontend/components/maps/mapHtmlBuilder.js';
import { getMapStyle, OPEN_FREE_MAP_STYLES, OSM_ATTRIBUTION } from '../frontend/lib/maps/tileProviders.js';

test('1. MapLibre GL JS v4 libraries and stylesheets correctly embedded in map document', () => {
  const html = buildMapLibreHtml({
    userCoords: { latitude: 15.5, longitude: 73.7 },
    places: [],
  });

  assert.ok(html.includes('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js'), 'Must load MapLibre GL JS v4');
  assert.ok(html.includes('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css'), 'Must load MapLibre GL CSS v4');
  assert.ok(html.includes('new maplibregl.Map'), 'Must instantiate maplibregl.Map');
  assert.equal(html.includes('mapboxgl.accessToken'), false, 'Must NOT require mapboxgl.accessToken');
});

test('2. Real device GPS user location beacon rendered with accuracy ring (no hardcoded coordinates)', () => {
  const userLat = 12.9716;
  const userLng = 77.5946; // Bengaluru

  const html = buildMapLibreHtml({
    userCoords: { latitude: userLat, longitude: userLng },
    places: [],
  });

  assert.ok(html.includes(`const USER_LAT = ${userLat};`), 'Must use exact device latitude');
  assert.ok(html.includes(`const USER_LNG = ${userLng};`), 'Must use exact device longitude');
  assert.ok(html.includes('const HAS_USER_LOCATION = true;'), 'Has user location must be true');
  assert.ok(html.includes('user-beacon-wrapper'), 'Must render user radar beacon element');
  assert.ok(html.includes('user-beacon-pulse'), 'Must render animated beacon pulse');
  assert.ok(html.includes('user-beacon-core'), 'Must render champagne beacon core');
});

test('3. Missing or denied GPS coordinates do NOT fabricate a fake position', () => {
  const html = buildMapLibreHtml({
    userCoords: null,
    places: [],
  });

  assert.ok(html.includes('const HAS_USER_LOCATION = false;'), 'HAS_USER_LOCATION must be false when coords are null');
});

test('4. Real POI markers generated exclusively from normalized places schema', () => {
  const mockPlaces = [
    {
      place_id: 'osm_poi_curlies',
      name: 'Curlies Beach Shack',
      category: 'Restaurant',
      category_id: 'food',
      address: 'Anjuna Beach, Goa',
      latitude: 15.5783,
      longitude: 73.7412,
      distance_text: '1.2 km away',
    },
    {
      place_id: 'osm_poi_arambol',
      name: 'Sweetwater Lake Viewpoint',
      category: 'Nature',
      category_id: 'nature',
      address: 'Arambol, Goa',
      latitude: 15.6881,
      longitude: 73.7042,
      distance_text: '4.5 km away',
    },
  ];

  const html = buildMapLibreHtml({
    userCoords: { latitude: 15.5, longitude: 73.7 },
    places: mockPlaces,
    selectedPlaceId: 'osm_poi_curlies',
  });

  assert.ok(html.includes('osm_poi_curlies'), 'Must contain first place_id');
  assert.ok(html.includes('Curlies Beach Shack'), 'Must contain first place name');
  assert.ok(html.includes('osm_poi_arambol'), 'Must contain second place_id');
  assert.ok(html.includes('Sweetwater Lake Viewpoint'), 'Must contain second place name');
  assert.ok(html.includes('poi-pin-container'), 'Must render poi-pin-container element');
  assert.ok(html.includes('poi-pin-bubble'), 'Must render place name bubble');
  assert.ok(html.includes('poi-pin-dot'), 'Must render pin anchor dot');
});

test('5. Marker interaction: Tapping marker emits SELECT_PLACE with actual place_id', () => {
  const html = buildMapLibreHtml({
    userCoords: { latitude: 15.5, longitude: 73.7 },
    places: [
      { place_id: 'osm_test_456', name: 'Test Spot', latitude: 15.5, longitude: 73.7 },
    ],
  });

  assert.ok(html.includes("notifyNative({ type: 'SELECT_PLACE', placeId: p.place_id });"), 'Click listener must notify native with exact placeId');
  assert.ok(html.includes('window.ReactNativeWebView.postMessage'), 'Must bridge via window.ReactNativeWebView.postMessage for Android');
  assert.ok(html.includes('window.parent.postMessage'), 'Must bridge via postMessage for Web iframe');
});

test('6. Production map controls: Recenter on GPS, Zoom In, Zoom Out buttons', () => {
  const html = buildMapLibreHtml({
    userCoords: { latitude: 15.5, longitude: 73.7 },
    places: [],
  });

  assert.ok(html.includes('id="recenterBtn"'), 'Must render recenter button');
  assert.ok(html.includes('id="zoomInBtn"'), 'Must render zoom in button');
  assert.ok(html.includes('id="zoomOutBtn"'), 'Must render zoom out button');
  assert.ok(html.includes('map.flyTo({ center: [USER_LNG, USER_LAT]'), 'Recenter button must fly to real GPS coordinates');
  assert.ok(html.includes('map.zoomIn()'), 'Zoom in button must call map.zoomIn()');
  assert.ok(html.includes('map.zoomOut()'), 'Zoom out button must call map.zoomOut()');
});

test('7. OpenStreetMap & OpenFreeMap attribution compliance', () => {
  const html = buildMapLibreHtml({
    userCoords: { latitude: 15.5, longitude: 73.7 },
    places: [],
  });

  assert.ok(html.includes('maplibregl.AttributionControl'), 'Custom attribution control must be added');
  assert.ok(html.includes('OpenStreetMap'), 'OpenStreetMap attribution must be present');
  assert.ok(html.includes('OpenFreeMap'), 'OpenFreeMap attribution must be present');
});

test('8. Platform separation: Native (MaybeWeMap.jsx) vs Web (MaybeWeMap.web.jsx)', () => {
  const mapsDir = path.resolve(__dirname, '../frontend/components/maps');

  const nativeCode = fs.readFileSync(path.join(mapsDir, 'MaybeWeMap.jsx'), 'utf8');
  assert.ok(nativeCode.includes("from 'react-native-webview'"), 'Native implementation must import WebView');
  assert.ok(nativeCode.includes('<WebView'), 'Native implementation must render WebView');
  assert.ok(nativeCode.includes('androidHardwareAccelerationDisabled={false}'), 'Native implementation must enable Android hardware acceleration');

  const webCode = fs.readFileSync(path.join(mapsDir, 'MaybeWeMap.web.jsx'), 'utf8');
  assert.ok(webCode.includes('<iframe'), 'Web implementation must render web iframe/DOM');
  assert.equal(webCode.includes("from 'react-native-webview'"), false, 'Web implementation must not depend on native WebView');
});

test('9. Location permission denied state displays explicit UI and never fabricates coordinates', () => {
  const mapsDir = path.resolve(__dirname, '../frontend/components/maps');
  const nativeCode = fs.readFileSync(path.join(mapsDir, 'MaybeWeMap.jsx'), 'utf8');

  assert.ok(nativeCode.includes("gpsStatus === 'denied'"), 'Must handle denied GPS state');
  assert.ok(nativeCode.includes('Device Location Required'), 'Must display Device Location Required title');
  assert.ok(nativeCode.includes('onRetryLocation'), 'Must provide GPS retry action');
});

test('10. Route rendering capability: GeoJSON route lines supported', () => {
  const mockRoute = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[77.59, 12.97], [77.60, 12.98]],
    },
  };

  const html = buildMapLibreHtml({
    userCoords: { latitude: 12.97, longitude: 77.59 },
    places: [],
    routeGeoJson: mockRoute,
  });

  assert.ok(html.includes('renderRoute(initialRoute)'), 'Must call renderRoute on map load');
  assert.ok(html.includes('maybewe-route-line'), 'Must include maybewe-route-line layer');
  assert.ok(html.includes('maybewe-route-casing'), 'Must include high-contrast casing layer');
});

test('11. Zero static fallback: placesData.js is NEVER imported in map components or builder', () => {
  const mapsDir = path.resolve(__dirname, '../frontend/components/maps');

  const files = fs.readdirSync(mapsDir);
  for (const f of files) {
    const content = fs.readFileSync(path.join(mapsDir, f), 'utf8');
    assert.equal(content.includes('placesData'), false, `${f} must NOT reference placesData`);
  }
});
