// ============================================================================
// MAYBEWE TILE & STYLE PROVIDER ABSTRACTION (frontend/lib/maps/tileProviders.js)
// Zero Mapbox / Zero Google Keys
// Production-safe, open map vector and raster tile configurations
// Compatible with MapLibre GL JS (Web) and react-native-webview (Android & iOS)
// ============================================================================

export const MAP_MODES = {
  STREET: "street",
  DARK: "dark",
  SATELLITE: "satellite",
};

export const TILE_PROVIDERS = {
  OPEN_FREE_MAP: "openfreemap",
  CUSTOM_STYLE: "custom_style",
  PROTOMAPS_R2: "protomaps_r2",
};

// OpenFreeMap vector tile style endpoints (Zero API Key, Cloudflare global CDN edge)
// https://openfreemap.org/
export const OPEN_FREE_MAP_STYLES = {
  // Liberty: Clean, vibrant map with balanced road hierarchy, water, and building contours
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  // Dark: High-contrast dark vector cartography with readable labels
  dark: "https://tiles.openfreemap.org/styles/dark",
  // Positron: Minimal monochrome style
  positron: "https://tiles.openfreemap.org/styles/positron",
  // Bright: Light, crisp high-readability cartography
  bright: "https://tiles.openfreemap.org/styles/bright",
};

// Satellite raster tile providers
// TRANSPARENT LICENSING DISCLOSURE:
// 1. Esri World Imagery: Free for development, non-commercial evaluation and testing.
//    Commercial production deployment requires an Esri ArcGIS commercial license.
// 2. EOX Cloudless: Licensed under CC BY-NC-SA 4.0 (Non-commercial only). Commercial use requires paid license.
// 3. NASA GIBS / USGS: Public domain ($0), lower maximum zoom (z=9-12).
export const SATELLITE_CONFIG = {
  esri: {
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    tileSize: 256,
    maxzoom: 19,
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    commercialSafeFree: false, // Disclosed: requires commercial license for launch
    notes: "High-resolution global satellite imagery (0.3m-15m). CORS enabled.",
  },
  nasa: {
    tiles: ["https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"],
    tileSize: 256,
    maxzoom: 9,
    attribution: "NASA GIBS / Earthdata",
    commercialSafeFree: true,
    notes: "Public domain imagery, limited zoom level.",
  },
};

// Required OpenStreetMap Legal Attribution (ODbL 1.0)
export const OSM_ATTRIBUTION = {
  html: "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener\">OpenStreetMap</a> contributors | <a href=\"https://openfreemap.org\" target=\"_blank\" rel=\"noopener\">OpenFreeMap</a>",
  text: "© OpenStreetMap contributors | OpenFreeMap",
  licenseUrl: "https://www.openstreetmap.org/copyright",
};

/**
 * Resolve the map style URL dynamically based on mode, theme preference,
 * environment configuration, or provider override.
 */
export function getMapStyle({
  mode = MAP_MODES.STREET,
  isDark = false,
  provider = TILE_PROVIDERS.OPEN_FREE_MAP,
  customStyleUrl = null,
} = {}) {
  // 1. Explicit override via caller
  if (customStyleUrl && typeof customStyleUrl === "string" && customStyleUrl.trim() !== "") {
    return customStyleUrl.trim();
  }

  // 2. Mode-specific styles
  if (mode === MAP_MODES.DARK) {
    const envDarkStyle = typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_MAP_DARK_STYLE_URL : null;
    return envDarkStyle || OPEN_FREE_MAP_STYLES.dark;
  }

  if (isDark) {
    const envDarkStyle = typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_MAP_DARK_STYLE_URL : null;
    return envDarkStyle || OPEN_FREE_MAP_STYLES.positron;
  }

  if (mode === MAP_MODES.SATELLITE) {
    // Satellite mode uses custom raster configuration handled inside mapHtmlBuilder
    return "satellite";
  }

  // 3. Default Street Style (Liberty)
  const envLightStyle = typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_MAP_STYLE_URL : null;
  return envLightStyle || OPEN_FREE_MAP_STYLES.liberty;
}

/**
 * Returns attribution configuration for MapLibre AttributionControl
 */
export function getAttributionConfig(mode = MAP_MODES.STREET) {
  if (mode === MAP_MODES.SATELLITE) {
    return {
      compact: true,
      customAttribution: SATELLITE_CONFIG.esri.attribution,
    };
  }
  return {
    compact: true,
    customAttribution: OSM_ATTRIBUTION.html,
  };
}

export default {
  MAP_MODES,
  TILE_PROVIDERS,
  OPEN_FREE_MAP_STYLES,
  SATELLITE_CONFIG,
  OSM_ATTRIBUTION,
  getMapStyle,
  getAttributionConfig,
};
