// ============================================================================
// DEDICATED MAPS PAGE & GOOGLE-MAPS UX TEST SUITE
// Tests MapLibre modes, diagnostics, full-screen route, categories & controls
// tests/dedicated_maps_page.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

test("1. Dedicated /maps route exists and is registered in _layout.jsx", () => {
  const mapsFile = path.join(ROOT, "frontend/app/maps.jsx");
  assert.ok(fs.existsSync(mapsFile), "maps.jsx route must exist");

  const mapsContent = fs.readFileSync(mapsFile, "utf8");
  assert.ok(mapsContent.includes("export default function MapsScreen"), "Must export MapsScreen");
  assert.ok(mapsContent.includes("MaybeWeMap"), "Must render MaybeWeMap");
  assert.ok(mapsContent.includes("MAP_MODES"), "Must import MAP_MODES");
  assert.ok(mapsContent.includes("searchPlaces"), "Must call searchPlaces");

  const layoutFile = path.join(ROOT, "frontend/app/_layout.jsx");
  const layoutContent = fs.readFileSync(layoutFile, "utf8");
  assert.ok(layoutContent.includes('<Stack.Screen'), "Stack.Screen exists");
  assert.ok(layoutContent.includes('name="maps"'), "maps screen is registered");
  assert.ok(layoutContent.includes('inMaps'), "AuthRouteGuard permits inMaps");
  assert.ok(layoutContent.includes('body.maps-wide #root'), "Desktop full browser width CSS enabled");
});

test("2. MapLibre HTML Builder has explicit diagnostics and mode support", () => {
  const builderFile = path.join(ROOT, "frontend/components/maps/mapHtmlBuilder.js");
  assert.ok(fs.existsSync(builderFile), "mapHtmlBuilder.js exists");

  const builderContent = fs.readFileSync(builderFile, "utf8");
  // Mode support
  assert.ok(builderContent.includes('mode = "street"'), "Default mode is street");
  assert.ok(builderContent.includes('SATELLITE_STYLE_DEF'), "Includes satellite raster style");
  assert.ok(builderContent.includes('https://tiles.openfreemap.org/styles/dark'), "Includes dark vector style");
  assert.ok(builderContent.includes('https://tiles.openfreemap.org/styles/liberty'), "Includes liberty street style");

  // Diagnostics & Error Prevention
  assert.ok(builderContent.includes('STYLE_LOADED'), "Dispatches STYLE_LOADED event");
  assert.ok(builderContent.includes('FIRST_TILE_LOADED'), "Dispatches FIRST_TILE_LOADED event");
  assert.ok(builderContent.includes('MAP_ERROR'), "Dispatches MAP_ERROR event");
  assert.ok(builderContent.includes('WEBGL_ERROR'), "Dispatches WEBGL_ERROR event");
  assert.ok(builderContent.includes('ResizeObserver'), "Uses ResizeObserver for container resizing");
  assert.ok(builderContent.includes('map.resize()'), "Calls map.resize()");
  assert.ok(builderContent.includes('error-banner'), "Includes user-facing error banner");
  assert.ok(builderContent.includes('retryMapLoad'), "Includes retry button for tiles");
});

test("3. Tile Providers abstraction includes all 3 modes and licensing notes", () => {
  const tileFile = path.join(ROOT, "frontend/lib/maps/tileProviders.js");
  assert.ok(fs.existsSync(tileFile), "tileProviders.js exists");

  const tileContent = fs.readFileSync(tileFile, "utf8");
  assert.ok(tileContent.includes('MAP_MODES'), "Exports MAP_MODES");
  assert.ok(tileContent.includes('STREET: "street"'), "Includes STREET mode");
  assert.ok(tileContent.includes('DARK: "dark"'), "Includes DARK mode");
  assert.ok(tileContent.includes('SATELLITE: "satellite"'), "Includes SATELLITE mode");
  assert.ok(tileContent.includes('SATELLITE_CONFIG'), "Includes SATELLITE_CONFIG");
  assert.ok(tileContent.includes('commercialSafeFree: false'), "Transparently discloses satellite commercial license terms");
  assert.ok(tileContent.includes('Esri'), "Includes Esri attribution");
});

test("4. Full 31-Category discovery system is intact and wired", () => {
  const placesFile = path.join(ROOT, "frontend/lib/places.js");
  const placesContent = fs.readFileSync(placesFile, "utf8");

  const expectedCategories = [
    'cafes', 'restaurants', 'stays', 'temples', 'churches', 'mosques',
    'attractions', 'tourist_places', 'beaches', 'parks', 'museums',
    'banks', 'atms', 'fuel', 'ev_charging', 'hospitals', 'pharmacies',
    'supermarkets', 'shopping', 'bus_stations', 'railway_stations',
    'airports', 'parking', 'toilets', 'police', 'emergency',
    'bakeries', 'gyms', 'nightlife', 'nature', 'activities'
  ];

  expectedCategories.forEach((cat) => {
    assert.ok(placesContent.toLowerCase().includes(`'${cat.toLowerCase()}'`), `Category '${cat}' must be present in places.js`);
  });
});

test("5. Places & Experiences page has Open Maps entrypoint", () => {
  const placesViewFile = path.join(ROOT, "frontend/components/PlaceDiscoveryView.jsx");
  const viewContent = fs.readFileSync(placesViewFile, "utf8");

  assert.ok(viewContent.includes("router.push('/maps')"), "Contains navigation to /maps");
  assert.ok(viewContent.includes("openMapsHeroCard"), "Renders openMapsHeroCard");
  assert.ok(viewContent.includes("Open Dedicated Maps"), "Displays hero text");
});

test("6. Google-Maps-like features present on MapsScreen", () => {
  const mapsFile = path.join(ROOT, "frontend/app/maps.jsx");
  const mapsContent = fs.readFileSync(mapsFile, "utf8");

  // Search bar
  assert.ok(mapsContent.includes("executeTextSearch"), "Implements real text search");
  assert.ok(mapsContent.includes("autocompleteDropdown"), "Implements autocomplete dropdown");

  // Real device GPS
  assert.ok(mapsContent.includes("Location.requestForegroundPermissionsAsync"), "Requests GPS permissions");
  assert.ok(mapsContent.includes("Location.getCurrentPositionAsync"), "Gets real GPS coordinates");
  assert.ok(mapsContent.includes("gpsStatus"), "Maintains gpsStatus state");

  // Floating controls: Mode switcher, Recenter, Search this area
  assert.ok(mapsContent.includes("modePickerMenu"), "Includes map mode switcher menu");
  assert.ok(mapsContent.includes("recenter") || mapsContent.includes("requestDeviceGps"), "Includes GPS recenter button");
  assert.ok(mapsContent.includes("searchAreaButton"), "Includes Search this area button");

  // Bottom Sheet & Place Card
  assert.ok(mapsContent.includes("placeCardContainer"), "Includes place card container");
  assert.ok(mapsContent.includes("bottomSheetContainer"), "Includes bottom sheet container");
  assert.ok(mapsContent.includes("handleOpenDirections"), "Implements native directions handoff");
});
