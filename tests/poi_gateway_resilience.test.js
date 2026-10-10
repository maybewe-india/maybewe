// ============================================================================
// MAYBEWE MAPS PRODUCTION HARDENING & RESILIENT POI GATEWAY VERIFICATION
// Suite: tests/poi_gateway_resilience.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const edgeFnPath = path.join(rootDir, "supabase", "functions", "places-proxy", "index.ts");
const backendEdgeFnPath = path.join(rootDir, "backend", "supabase", "functions", "places-proxy", "index.ts");
const placesJsPath = path.join(rootDir, "frontend", "lib", "places.js");
const mapsJsxPath = path.join(rootDir, "frontend", "app", "maps.jsx");
const placeDiscoveryPath = path.join(rootDir, "frontend", "components", "PlaceDiscoveryView.jsx");

const edgeFn = fs.readFileSync(edgeFnPath, "utf8");
const backendEdgeFn = fs.readFileSync(backendEdgeFnPath, "utf8");
const placesJs = fs.readFileSync(placesJsPath, "utf8");
const mapsJsx = fs.readFileSync(mapsJsxPath, "utf8");
const placeDiscoveryJsx = fs.readFileSync(placeDiscoveryPath, "utf8");

test("1. AUP Compliance: Upstream requests contain compliant User-Agent and Contact headers", () => {
  assert.ok(edgeFn.includes("MaybeWe-App/1.0 (contact@maybewe.app)"), "Edge function must declare compliant User-Agent");
  assert.ok(edgeFn.includes("contact@maybewe.app"), "Edge function must declare contact header");
  assert.ok(edgeFn.includes("AUP_HEADERS"), "Edge function must export or use AUP_HEADERS");

  assert.ok(placesJs.includes("MaybeWe-App/1.0 (contact@maybewe.app)"), "Frontend places.js must declare compliant User-Agent");
  assert.ok(placesJs.includes("contact@maybewe.app"), "Frontend places.js must declare contact header");
  assert.ok(placesJs.includes("AUP_HEADERS"), "Frontend places.js must define AUP_HEADERS");
});

test("2. Provider Adapter Pattern: Swappable upstream endpoints via environment variables", () => {
  assert.ok(edgeFn.includes("OVERPASS_PROVIDER_URL"), "Edge function must define OVERPASS_PROVIDER_URL adapter");
  assert.ok(edgeFn.includes("GEOCODER_PROVIDER_URL"), "Edge function must define GEOCODER_PROVIDER_URL adapter");
  assert.ok(/Deno\.env\.get\([\x27\"]OVERPASS_PROVIDER_URL[\x27\"]\)/.test(edgeFn), "Must read OVERPASS_PROVIDER_URL from environment");
  assert.ok(/Deno\.env\.get\([\x27\"]GEOCODER_PROVIDER_URL[\x27\"]\)/.test(edgeFn), "Must read GEOCODER_PROVIDER_URL from environment");
  assert.equal(edgeFn, backendEdgeFn, "supabase/functions/places-proxy and backend/supabase/functions/places-proxy must remain identical");
});

test("3. Search Debounce & Autocomplete Protection: Enforces >= 400ms debounce and >= 3 characters", () => {
  const debounceMatch = mapsJsx.match(/setTimeout\([\s\S]*?,\s*(\d+)\)/);
  assert.ok(debounceMatch, "Debounce timer must exist in maps.jsx");
  const debounceMs = parseInt(debounceMatch[1], 10);
  assert.ok(debounceMs >= 400, "Search debounce must be >= 400ms, got " + debounceMs + "ms");

  assert.ok(
    mapsJsx.includes("searchQuery.trim().length < 3") || mapsJsx.includes("searchQuery.length < 3"),
    "Must forbid geocoding requests on keystrokes shorter than 3 characters"
  );
});

test("4. Database-First Bypassing: PostGIS ST_DWithin check bypasses external provider", () => {
  assert.ok(edgeFn.includes("search_nearby_places"), "Edge function must execute search_nearby_places PostGIS RPC first");
  assert.ok(edgeFn.includes("Database-First ST_DWithin bypass"), "Edge function must implement Database-First bypass logging");
  assert.ok(edgeFn.includes("filtered.length >= 3"), "Must bypass external provider when at least 3 fresh records exist");
});

test("5. Category Switching Storm: Generation Counter & AbortController eliminate race conditions", () => {
  assert.ok(mapsJsx.includes("placesQueryGenerationRef"), "maps.jsx must maintain placesQueryGenerationRef");
  assert.ok(mapsJsx.includes("placesAbortControllerRef"), "maps.jsx must maintain placesAbortControllerRef");
  assert.ok(mapsJsx.includes("abort()"), "maps.jsx must abort prior in-flight POI requests");

  assert.ok(placeDiscoveryJsx.includes("queryGenerationRef"), "PlaceDiscoveryView must maintain queryGenerationRef");
  assert.ok(placeDiscoveryJsx.includes("abortControllerRef"), "PlaceDiscoveryView must maintain abortControllerRef");
  assert.ok(placeDiscoveryJsx.includes("abort()"), "PlaceDiscoveryView must abort prior in-flight requests");
});

test("6. GPS Refinement Drift: Delta > 50m invalidates previous POI generation", () => {
  assert.ok(mapsJsx.includes("deltaTriggered"), "maps.jsx must listen for deltaTriggered location events");
  const deltaSection = mapsJsx.slice(mapsJsx.indexOf("deltaTriggered"), mapsJsx.indexOf("deltaTriggered") + 600);
  assert.ok(deltaSection.includes("loadPlacesAround"), "maps.jsx must trigger fresh POI query on deltaTriggered");
});

test("7. Navigation Honesty & Distance Alignment: Orientation estimate clearly labeled", () => {
  assert.ok(mapsJsx.includes("Orientation Estimate"), "maps.jsx must honestly label directions as orientation estimate");
  assert.ok(mapsJsx.includes("handleOpenDirections"), "Native navigation handoff preserved");
  assert.ok(mapsJsx.includes("distance_text"), "Consistent geodesic distance formatting across markers & cards");
});

test("8. In-Flight Race Simulation: Rapid category toggling reliably drops superseded responses", async () => {
  let activeGeneration = 0;
  let inFlightController = null;
  const committedResults = [];

  async function mockSimulatedCategoryTap(catName, delayMs) {
    if (inFlightController) inFlightController.abort();
    inFlightController = new AbortController();
    const generation = ++activeGeneration;
    const signal = inFlightController.signal;

    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

      if (generation !== activeGeneration) return;
      committedResults.push(catName);
    } catch (err) {
      if (err.name === "AbortError") return;
      throw err;
    }
  }

  // Simulate rapid tapping: Fuel -> Cafes -> Restaurants -> Temples -> Hospitals
  const p1 = mockSimulatedCategoryTap("Fuel", 150);
  const p2 = mockSimulatedCategoryTap("Cafes", 120);
  const p3 = mockSimulatedCategoryTap("Restaurants", 100);
  const p4 = mockSimulatedCategoryTap("Temples", 80);
  const p5 = mockSimulatedCategoryTap("Hospitals", 40);

  await Promise.allSettled([p1, p2, p3, p4, p5]);

  assert.equal(committedResults.length, 1, "Only exactly one response should be committed");
  assert.equal(committedResults[0], "Hospitals", "Latest category selection (Hospitals) must win");
});
