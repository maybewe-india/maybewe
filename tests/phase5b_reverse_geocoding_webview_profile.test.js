import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import babel from "@babel/core";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import safeStorage from "../frontend/lib/safeStorage.js";
import {
  STORAGE_KEYS,
  cleanLocalityString,
  reverseGeocodeLocation,
  persistProfileLocationToStorage,
  loadCachedProfileLocation,
  persistGpsTelemetryToStorage,
  loadCachedGpsTelemetry,
  __setExpoLocationForTesting,
  __resetLocationServiceForTesting,
} from "../frontend/lib/locationService.js";

// ============================================================================
// Phase 5B Test Suite:
// 1. Locality Sanitization & Strict Numeric / Plus-Code Rejection
// 2. 5-Tier Locality Precedence Hierarchy in reverseGeocodeLocation
// 3. Profile Location Clearing Purges Storage & Preserves Ephemeral GPS Telemetry
// 4. Cold-Start Anti-Resurrection Guard
// 5. Map WebView Error Handling, WebGL Crash & Active Retry Reload Mechanism
// ============================================================================

test("Phase 5B.1: Locality Sanitization & Strict Numeric / Plus-Code Rejection", () => {
  // 1. Pure numeric postal codes and numbers must be rejected
  assert.equal(cleanLocalityString("560038"), null, "Postal code 560038 must be rejected");
  assert.equal(cleanLocalityString("12345"), null, "Generic digits 12345 must be rejected");
  assert.equal(cleanLocalityString("560 038"), null, "Spaced postal code 560 038 must be rejected");

  // 2. Punctuation, house/plot numbers, and slashes must be rejected
  assert.equal(cleanLocalityString("12-3/4"), null, "House number 12-3/4 must be rejected");
  assert.equal(cleanLocalityString("#101"), null, "Unit number #101 must be rejected");
  assert.equal(cleanLocalityString("---"), null, "Dashes must be rejected");

  // 3. Plus Codes / Open Location Codes must be rejected
  assert.equal(cleanLocalityString("7M8G+5F"), null, "Plus code 7M8G+5F must be rejected");
  assert.equal(cleanLocalityString("8F572222+22"), null, "Plus code 8F572222+22 must be rejected");
  assert.equal(cleanLocalityString("6PH57VP3+PR"), null, "Plus code 6PH57VP3+PR must be rejected");

  // 4. Strings with leading plus code must have plus code stripped
  assert.equal(
    cleanLocalityString("7M8G+5F, Madanapalle"),
    "Madanapalle",
    "Compound plus code + locality must yield sanitized locality name"
  );
  assert.equal(
    cleanLocalityString("7M8G+5F Bengaluru"),
    "Bengaluru",
    "Plus code with space-separated town name must yield town name"
  );

  // 5. Generic / placeholder strings must be rejected
  assert.equal(cleanLocalityString("unnamed road"), null, "Unnamed road must be rejected");
  assert.equal(cleanLocalityString("current location"), null, "Current location must be rejected");
  assert.equal(cleanLocalityString("unknown location"), null, "Unknown location must be rejected");
  assert.equal(cleanLocalityString("null"), null, "Literal null must be rejected");
  assert.equal(cleanLocalityString("undefined"), null, "Literal undefined must be rejected");
  assert.equal(cleanLocalityString(""), null, "Empty string must be rejected");
  assert.equal(cleanLocalityString("   "), null, "Whitespace-only string must be rejected");
  assert.equal(cleanLocalityString(null), null, "null must return null");
  assert.equal(cleanLocalityString(undefined), null, "undefined must return null");

  // 6. Legitimate town and city names must be preserved cleanly
  assert.equal(cleanLocalityString("Madanapalle"), "Madanapalle");
  assert.equal(cleanLocalityString("Bengaluru"), "Bengaluru");
  assert.equal(cleanLocalityString("Indiranagar"), "Indiranagar");
  assert.equal(cleanLocalityString("Whitefield"), "Whitefield");
  assert.equal(cleanLocalityString("Annamayya"), "Annamayya");
  assert.equal(cleanLocalityString("Horsley Hills"), "Horsley Hills");
});

test("Phase 5B.2: 5-Tier Locality Precedence Hierarchy in reverseGeocodeLocation", async () => {
  __resetLocationServiceForTesting();

  // Tier 1: City takes precedence when present and valid
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [{
      city: "Madanapalle",
      sublocality: "Neerugattu",
      district: "Annamayya",
      name: "Horsley Hills Road",
      subregion: "Madanapalle Mandal",
      region: "Andhra Pradesh",
    }],
  });
  const res1 = await reverseGeocodeLocation(13.55, 78.50);
  assert.equal(res1.city, "Madanapalle", "Tier 1: City must take precedence");
  assert.equal(res1.state, "Andhra Pradesh");
  assert.equal(res1.formatted, "Madanapalle, Andhra Pradesh");

  // Tier 2: Sublocality takes precedence if city is a postal code or null
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [{
      city: "560038", // Numeric postal code to be rejected
      sublocality: "Indiranagar",
      district: "Bengaluru Urban",
      name: "100 Feet Road",
      subregion: "Bengaluru East",
      region: "Karnataka",
    }],
  });
  const res2 = await reverseGeocodeLocation(12.978, 77.64);
  assert.equal(res2.city, "Indiranagar", "Tier 2: Sublocality must be chosen over numeric postal code");
  assert.equal(res2.state, "Karnataka");
  assert.equal(res2.formatted, "Indiranagar, Karnataka");

  // Tier 3: Valid place name takes precedence if city and sublocality are absent or rejected
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [{
      city: "7M8G+5F", // Plus code to be rejected
      sublocality: null,
      district: "Annamayya",
      name: "Horsley Hills",
      subregion: "Madanapalle Mandal",
      region: "Andhra Pradesh",
    }],
  });
  const res3 = await reverseGeocodeLocation(13.55, 78.50);
  assert.equal(res3.city, "Horsley Hills", "Tier 3: Valid place name Horsley Hills must take precedence over subregion and district");
  assert.equal(res3.state, "Andhra Pradesh");
  assert.equal(res3.district, "Annamayya");
  assert.equal(res3.formatted, "Horsley Hills, Andhra Pradesh");

  // Tier 4: Subregion is chosen when city, sublocality, and name are absent or numeric
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [{
      city: null,
      sublocality: null,
      district: "Annamayya",
      name: "517357", // Pure numeric postal/street code rejected
      subregion: "Madanapalle Mandal",
      region: "Andhra Pradesh",
    }],
  });
  const res4 = await reverseGeocodeLocation(13.65, 78.39);
  assert.equal(res4.city, "Madanapalle Mandal", "Tier 4: Subregion must take precedence over district when name is numeric");
  assert.equal(res4.district, "Annamayya");
  assert.equal(res4.formatted, "Madanapalle Mandal, Andhra Pradesh");

  // Tier 5: District is chosen if tiers 1-4 are absent or rejected
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [{
      city: null,
      sublocality: null,
      district: "Annamayya",
      name: null,
      subregion: null,
      region: "Andhra Pradesh",
    }],
  });
  const res5 = await reverseGeocodeLocation(13.20, 78.75);
  assert.equal(res5.city, "Annamayya", "Tier 5: District must be chosen if tiers 1-4 are null");
  assert.equal(res5.district, "Annamayya");
  assert.equal(res5.formatted, "Annamayya, Andhra Pradesh");

  // Explicit Regression Case: Hill station / tourist destination resolves over administrative district
  __setExpoLocationForTesting({
    reverseGeocodeAsync: async () => [{
      name: "Horsley Hills",
      city: null,
      sublocality: null,
      subregion: "Madanapalle Mandal",
      district: "Annamayya",
      region: "Andhra Pradesh",
    }],
  });
  const resHorsley = await reverseGeocodeLocation(13.6598, 78.3972);
  assert.equal(resHorsley.city, "Horsley Hills", "Regression: Horsley Hills must strictly resolve over Annamayya district");
  assert.equal(resHorsley.district, "Annamayya");
  assert.equal(resHorsley.formatted, "Horsley Hills, Andhra Pradesh");
});

test("Phase 5B.3: Profile Location Clearing Purges Storage & Preserves Ephemeral GPS Telemetry", async () => {
  await safeStorage.clear();

  // 1. Establish real GPS telemetry fix
  const liveTelemetry = {
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 12,
    accuracyRadiusMeters: 12,
    timestamp: Date.now(),
    isCoarse: false,
    confidence: "ACCURATE",
    source: "gps_hardware",
  };
  await persistGpsTelemetryToStorage(liveTelemetry);

  // 2. Establish saved profile home location
  const profileHome = {
    city: "Bengaluru",
    state: "Karnataka",
    location: "Bengaluru, Karnataka",
    country: "India",
  };
  await persistProfileLocationToStorage(profileHome);

  // Verify both exist independently
  const loadedGpsBefore = await loadCachedGpsTelemetry();
  const loadedProfileBefore = await loadCachedProfileLocation();
  assert.equal(loadedGpsBefore.latitude, 12.9716);
  assert.equal(loadedProfileBefore.city, "Bengaluru");

  // 3. User intentionally clears profile home location
  await persistProfileLocationToStorage({
    city: "",
    state: "",
    location: "",
  });

  // Verify profile storage is purged and cleared flag is set
  const rawProfileAfter = await safeStorage.getItem(STORAGE_KEYS.PROFILE_LOCATION);
  assert.equal(rawProfileAfter, null, "Profile location key must be purged from storage");

  const clearedFlag = await safeStorage.getItem("@maybewe_profile_location_cleared");
  assert.equal(clearedFlag, "true", "Cleared flag must be recorded in storage");

  // Verify GPS telemetry fix is completely UNTOUCHED and intact
  const loadedGpsAfter = await loadCachedGpsTelemetry();
  assert.ok(loadedGpsAfter, "GPS telemetry must survive profile location clearing");
  assert.equal(loadedGpsAfter.latitude, 12.9716, "GPS latitude must be strictly preserved");
  assert.equal(loadedGpsAfter.longitude, 77.5946, "GPS longitude must be strictly preserved");
  assert.equal(loadedGpsAfter.accuracy, 12, "GPS accuracy must be strictly preserved");
});

test("Phase 5B.4: Cold-Start Anti-Resurrection Guard", async () => {
  await safeStorage.clear();

  // 1. Set cleared flag to simulate a user who intentionally cleared their location
  await safeStorage.setItem("@maybewe_profile_location_cleared", "true");

  // 2. Simulate stale legacy storage containing a previous user location
  await safeStorage.setItem(
    STORAGE_KEYS.LEGACY_USER_LOCATION,
    JSON.stringify({
      city: "Resurrected City",
      state: "Resurrected State",
      location: "Resurrected City, Resurrected State",
      isGPS: false,
    })
  );

  // 3. Cold-start load must reject resurrection and return null
  const profile = await loadCachedProfileLocation();
  assert.equal(
    profile,
    null,
    "loadCachedProfileLocation must return null and refuse to resurrect legacy data when cleared flag is true"
  );

  // 4. When user subsequently saves a new valid location, cleared flag is removed and profile is stored
  await persistProfileLocationToStorage({
    city: "Madanapalle",
    state: "Andhra Pradesh",
    location: "Madanapalle, Andhra Pradesh",
  });

  const clearedFlagAfter = await safeStorage.getItem("@maybewe_profile_location_cleared");
  assert.equal(clearedFlagAfter, null, "Cleared flag must be removed once valid location is saved");

  const reloadedProfile = await loadCachedProfileLocation();
  assert.ok(reloadedProfile, "New location must be retrievable");
  assert.equal(reloadedProfile.city, "Madanapalle");
  assert.equal(reloadedProfile.state, "Andhra Pradesh");
});

test("Phase 5B.5: Map WebView Error Handling, WebGL Crash & Active Retry Reload Mechanism", () => {
  // Setup React / React Native test harness for MaybeWeMap component execution
  const mockThemeContext = {
    useTheme: () => ({
      colors: { cardBackground: "#1A1A1A", border: "#333", textPrimary: "#FFF", textSecondary: "#AAA" },
      isDark: true,
    }),
  };

  const mockReactNative = {
    View: "View",
    Text: "Text",
    StyleSheet: { create: (s) => s, absoluteFillObject: {} },
    TouchableOpacity: "TouchableOpacity",
    ActivityIndicator: "ActivityIndicator",
    Platform: { OS: "android" },
  };

  const mockWebView = { WebView: "WebView" };
  const mockVectorIcons = { Ionicons: "Ionicons" };
  const mockTheme = {
    COLORS: {}, RADII: {}, SHADOWS: {}, FONTS: { bold: "bold", regular: "regular", semiBold: "semiBold" },
  };
  const mockMapHtmlBuilder = {
    buildMapLibreHtml: () => "<html>MockMap</html>",
  };
  const mockTileProviders = {
    getMapStyle: () => "https://style.json",
    MAP_MODES: { STREET: "street", SATELLITE: "satellite", DARK: "dark" },
  };

  let states = [];
  let stateIndex = 0;

  const mockReact = {
    createElement: (type, props, ...children) => {
      const flat = children.flat ? children.flat() : children;
      return {
        type,
        props: {
          ...props,
          children: flat.length === 1 ? flat[0] : flat,
        },
      };
    },
    useState: (initial) => {
      const idx = stateIndex++;
      if (states.length <= idx) {
        states.push(typeof initial === "function" ? initial() : initial);
      }
      const setter = (val) => {
        states[idx] = typeof val === "function" ? val(states[idx]) : val;
      };
      return [states[idx], setter];
    },
    useRef: (initial) => ({ current: initial }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useEffect: () => {},
  };

  const code = fs.readFileSync("frontend/components/maps/MaybeWeMap.jsx", "utf8");
  const transformed = babel.transformSync(code, {
    filename: "MaybeWeMap.jsx",
    presets: [["babel-preset-expo", { jsxRuntime: "classic" }]],
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });

  const moduleObj = { exports: {} };
  const context = vm.createContext({
    module: moduleObj,
    exports: moduleObj.exports,
    require: (mod) => {
      if (mod.startsWith("@babel/runtime/")) return require(mod);
      if (mod === "react") return mockReact;
      if (mod === "react-native") return mockReactNative;
      if (mod === "react-native-webview") return mockWebView;
      if (mod === "@expo/vector-icons") return mockVectorIcons;
      if (mod.includes("themeContext")) return mockThemeContext;
      if (mod.includes("theme")) return mockTheme;
      if (mod.includes("mapHtmlBuilder")) return mockMapHtmlBuilder;
      if (mod.includes("tileProviders")) return mockTileProviders;
      return {};
    },
    console,
  });

  vm.runInContext(transformed.code, context);
  const MaybeWeMap = moduleObj.exports.default || moduleObj.exports;

  // Scenario 1: Initial Render — Map renders WebView with initial reloadKey = 0
  states = [];
  stateIndex = 0;
  let retryLocationTriggered = false;

  const initialTree = MaybeWeMap({
    userCoords: { latitude: 12.97, longitude: 77.59 },
    places: [],
    onRetryLocation: () => { retryLocationTriggered = true; },
  });

  assert.equal(initialTree.type, "View");
  const children1 = Array.isArray(initialTree.props.children) ? initialTree.props.children : [initialTree.props.children];
  const webViewEl = children1.find((c) => c && c.type === "WebView");
  assert.ok(webViewEl, "WebView element must be rendered initially");
  assert.equal(webViewEl.props.key, "map_wv_0", "WebView key must reflect reloadKey: 0");

  // Scenario 2: Error Event Dispatch — simulate network load failure
  webViewEl.props.onError({
    nativeEvent: { description: "ERR_NAME_NOT_RESOLVED: Failed to load map tiles" },
  });
  assert.equal(states[0], "ERR_NAME_NOT_RESOLVED: Failed to load map tiles", "webViewError state must be updated");

  // Scenario 3: Error State Render — MaybeWeMap renders error fallback UI
  stateIndex = 0;
  const errorTree = MaybeWeMap({
    userCoords: { latitude: 12.97, longitude: 77.59 },
    places: [],
    onRetryLocation: () => { retryLocationTriggered = true; },
  });

  assert.equal(errorTree.type, "View");
  const errChildren = errorTree.props.children;
  const errorTitle = errChildren[1].props.children;
  const errorDesc = errChildren[2].props.children;
  const retryBtn = errChildren[3];

  assert.equal(errorTitle, "Map Viewport Error", "Fallback UI must display Map Viewport Error title");
  assert.equal(errorDesc, "ERR_NAME_NOT_RESOLVED: Failed to load map tiles", "Fallback UI must show error description");
  assert.equal(retryBtn.type, "TouchableOpacity", "Fallback UI must provide a retry TouchableOpacity");

  // Scenario 4: Trigger Active Retry Reload
  retryBtn.props.onPress();
  assert.equal(states[0], null, "webViewError state must be cleared on retry");
  assert.equal(states[1], 1, "reloadKey must increment from 0 to 1");
  assert.equal(retryLocationTriggered, true, "onRetryLocation callback must be invoked on retry");

  // Scenario 5: WebGL / Tile message error handler
  webViewEl.props.onMessage({
    nativeEvent: { data: JSON.stringify({ type: "WEBGL_ERROR" }) },
  });
  assert.ok(states[0].includes("error") || states[0].includes("retry") || states[0].includes("Map"), "WEBGL_ERROR must set error state");

  // Scenario 6: HTTP Error status code
  webViewEl.props.onHttpError({
    nativeEvent: { statusCode: 502 },
  });
  assert.ok(states[0].includes("502"), "onHttpError must capture HTTP status code in error message");
});
