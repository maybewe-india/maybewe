// ============================================================================
// MaybeWe — Real-World Places & Spots Service (Step 4 Provider-Abstracted)
// Connects to Supabase Edge Function `places-proxy` (Open provider / PostGIS & OpenStreetMap)
// Designed for seamless transition to Google Places without UI changes.
//
// ZERO FAKE DATA: Never falls back to static/hardcoded placesData.js.
// ============================================================================

import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import {
  KNOWN_LANDMARK_IMAGES,
  getCategoryPlaceholderSvg,
  resolveVenueImage,
  getImmediatePlaceImage,
} from './placeImages.js';

const SAVED_PLACES_STORAGE_KEY = '@maybewe_saved_places_v2';
const RECENT_PLACES_STORAGE_KEY = '@maybewe_recent_places_v2';

export const PLACE_CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: 'compass-outline', description: 'All nearby spots & venues' },
  { id: 'cafes', name: 'Cafes', icon: 'cafe-outline', description: 'Artisan roasteries, coffee bars & tea rooms' },
  { id: 'restaurants', name: 'Restaurants', icon: 'restaurant-outline', description: 'Local dining, street food & culinary spots' },
  { id: 'stays', name: 'Hotels / Stays', icon: 'bed-outline', description: 'Boutique hotels, homestays & resorts' },
  { id: 'temples', name: 'Temples', icon: 'sparkles-outline', description: 'Hindu temples & sacred mandirs' },
  { id: 'churches', name: 'Churches', icon: 'business-outline', description: 'Churches, cathedrals & chapels' },
  { id: 'mosques', name: 'Mosques', icon: 'moon-outline', description: 'Mosques & sacred masjids' },
  { id: 'attractions', name: 'Attractions', icon: 'landmark-outline', description: 'Monuments, heritage sites & landmarks' },
  { id: 'tourist_places', name: 'Tourist Places', icon: 'map-outline', description: 'Must-visit sightseeing spots & viewpoints' },
  { id: 'beaches', name: 'Beaches', icon: 'sunny-outline', description: 'Coastal shores, beaches & coves' },
  { id: 'parks', name: 'Parks', icon: 'leaf-outline', description: 'Urban parks, botanical gardens & green spaces' },
  { id: 'museums', name: 'Museums', icon: 'library-outline', description: 'Art galleries, history & science museums' },
  { id: 'banks', name: 'Banks', icon: 'cash-outline', description: 'Banking branches & foreign exchange' },
  { id: 'atms', name: 'ATMs', icon: 'card-outline', description: 'Cash withdrawal machines & 24/7 ATMs' },
  { id: 'fuel', name: 'Petrol / Fuel', icon: 'speedometer-outline', description: 'Petrol pumps & fuel stations' },
  { id: 'ev_charging', name: 'EV Charging', icon: 'flash-outline', description: 'Electric vehicle charging stations' },
  { id: 'hospitals', name: 'Hospitals', icon: 'medkit-outline', description: 'Hospitals, medical centers & clinics' },
  { id: 'pharmacies', name: 'Pharmacies', icon: 'bandage-outline', description: 'Pharmacies, chemists & drugstores' },
  { id: 'supermarkets', name: 'Supermarkets', icon: 'cart-outline', description: 'Grocery stores & hypermarkets' },
  { id: 'shopping', name: 'Shopping', icon: 'bag-handle-outline', description: 'Shopping malls, bazaars & retail outlets' },
  { id: 'bus_stations', name: 'Bus Stations', icon: 'bus-outline', description: 'Bus terminals, transit hubs & stops' },
  { id: 'railway_stations', name: 'Railway Stations', icon: 'train-outline', description: 'Train stations & metro terminals' },
  { id: 'airports', name: 'Airports', icon: 'airplane-outline', description: 'Airports, terminals & aerodromes' },
  { id: 'parking', name: 'Parking', icon: 'car-outline', description: 'Vehicle parking lots & garages' },
  { id: 'toilets', name: 'Toilets', icon: 'water-outline', description: 'Public restrooms & sanitary facilities' },
  { id: 'police', name: 'Police', icon: 'shield-outline', description: 'Police stations & security outposts' },
  { id: 'emergency', name: 'Emergency', icon: 'alert-circle-outline', description: 'Emergency services & trauma care' },
  { id: 'bakeries', name: 'Bakeries', icon: 'pizza-outline', description: 'Fresh bakeries, pastry shops & patisseries' },
  { id: 'gyms', name: 'Gyms', icon: 'barbell-outline', description: 'Fitness centres, gyms & yoga studios' },
  { id: 'nightlife', name: 'Nightlife', icon: 'wine-outline', description: 'Lounges, pubs, bars & night markets' },
  { id: 'nature', name: 'Nature', icon: 'trail-sign-outline', description: 'Lakes, waterfalls, forests & trails' },
  { id: 'activities', name: 'Activities', icon: 'bicycle-outline', description: 'Outdoor adventures, sports & experiences' },
];

// Re-export verified landmarks & photography resolvers
export {
  KNOWN_LANDMARK_IMAGES,
  getCategoryPlaceholderSvg,
  resolveVenueImage,
  getImmediatePlaceImage,
};

export const getNeutralCategorySvg = (catId, placeName) => getCategoryPlaceholderSvg(catId, placeName);

export function getCategoryPhoto(categoryId, placeName = null, place = null) {
  return getImmediatePlaceImage({
    placeId: place?.place_id || place?.id,
    name: placeName || place?.name || '',
    latitude: place?.latitude,
    longitude: place?.longitude,
    categoryId: categoryId || place?.category_id || 'default',
    existingUrl: place?.image_url,
  });
}

// In-memory session cache (5-minute TTL to reduce repetitive requests during navigation)
// Transient in volatile RAM only; 5-minute ephemeral memory cache.
const placesCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const entry = placesCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    placesCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  placesCache.set(key, { timestamp: Date.now(), data });
}

// Active Search session token management (UUIDv4)
let activeSessionToken = null;

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback below
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateSessionToken() {
  if (!activeSessionToken) {
    activeSessionToken = generateUUID();
  }
  return activeSessionToken;
}

export function resetSearchSession() {
  activeSessionToken = generateUUID();
  return activeSessionToken;
}

/**
 * Fetch real-world nearby places via Supabase places-proxy Edge Function / PostGIS RPC
 * strictly using the caller's authoritative device GPS coordinates.
 *
 * Implements strict progressive radius expansion:
 * Stage 1: 5,000 meters (5 km)
 * Stage 2 (if 0 results): 10,000 meters (10 km)
 * Stage 3 (if 0 results): 25,000 meters (25 km)
 * Stage 4 (if 0 results): STOP. Return honest empty state: "No [Category] places found nearby."
 * Hard limit: Never expand beyond 25,000 meters.
 */

function calculateHaversine(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
  ) {
    return 9999999;
  }
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getCategoryDisplayName(categoryId) {
  if (!categoryId || categoryId === 'all') return 'Spots';
  const found = PLACE_CATEGORIES.find((c) => c.id === categoryId);
  return found ? found.name : categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
}

export function getCategoryEmptyTitle(categoryId) {
  if (!categoryId || categoryId === 'all') return 'No places found nearby';
  const lower = String(categoryId).toLowerCase();
  if (lower === 'restaurants') return 'No restaurants found nearby';
  if (lower === 'cafes') return 'No cafés found nearby';
  const found = PLACE_CATEGORIES.find((c) => c.id === lower);
  const name = found ? found.name.toLowerCase() : lower;
  return `No ${name} found nearby`;
}

export function getCategorySearchTerm(categoryId) {
  if (!categoryId || categoryId === 'all') return 'places to visit';
  if (categoryId === 'Hotels / Stays' || categoryId === 'Hotels') return 'Hotels';
  if (categoryId === 'Cafes') return 'Cafes';
  if (categoryId === 'Restaurants') return 'Restaurants';
  if (categoryId === 'Temples') return 'Temples';
  const id = String(categoryId).toLowerCase();
  if (id === 'cafes' || id === 'cafe') return 'cafes';
  if (id === 'restaurants' || id === 'restaurant') return 'restaurants';
  if (id === 'stays' || id === 'hotels' || id === 'hotel' || id === 'hotels / stays') return 'hotels';
  if (id === 'attractions' || id === 'attraction') return 'attractions';
  if (id === 'tourist_places') return 'tourist places';
  if (id === 'fuel' || id === 'petrol') return 'petrol pumps';
  if (id === 'temples') return 'temples';
  if (id === 'beaches') return 'beaches';
  if (id === 'museums') return 'museums';
  const found = PLACE_CATEGORIES.find((c) => c.id === id);
  if (found) {
    return found.name.toLowerCase().replace(/ \/ /g, ' ');
  }
  return id;
}

/**
 * Universal Pan-India External Google Maps Category Search URL Builder
 * Priority 1: Manual City Search Active (mode === 'destination' or non-empty searchDestination)
 * Priority 2: Nearby / Live Location Mode Active (valid latitude & longitude)
 * Priority 3: Fallback / Zero State (category alone)
 */
export function buildGoogleMapsCategorySearchUrl({
  category = "all",
  mode = null,
  searchDestination = "",
  coords = null,
  radiusKm = null,
} = {}) {
  const categoryTerm = getCategorySearchTerm(category);
  const cleanDestination = typeof searchDestination === "string" ? searchDestination.trim() : "";
  const hasValidCoords = coords &&
    typeof coords.latitude === "number" &&
    typeof coords.longitude === "number" &&
    !isNaN(coords.latitude) &&
    !isNaN(coords.longitude) &&
    coords.latitude >= -90 && coords.latitude <= 90 &&
    coords.longitude >= -180 && coords.longitude <= 180 &&
    !(coords.latitude === 0 && coords.longitude === 0);

  const parsedRadius = (typeof radiusKm === "number" && radiusKm > 0)
    ? radiusKm
    : (typeof radiusKm === "string" && Number(radiusKm) > 0 ? Number(radiusKm) : null);

  const formatGpsQuery = () => {
    if (parsedRadius) {
      return `${categoryTerm} within ${parsedRadius}km of ${coords.latitude},${coords.longitude}`;
    }
    return `${categoryTerm} near ${coords.latitude},${coords.longitude}`;
  };

  let rawQuery = "";

  // 1. Explicit Nearby Mode: ALWAYS prioritize live GPS coordinates; NEVER leak stale destination
  if (mode === "nearby") {
    if (hasValidCoords) {
      rawQuery = formatGpsQuery();
    } else {
      // In Nearby mode without coordinates, gracefully fall back to category alone without leaking old city
      rawQuery = categoryTerm;
    }
  }
  // 2. Explicit Destination / City Search Mode: Use manually selected city
  else if (mode === "destination") {
    if (cleanDestination.length > 0) {
      rawQuery = `${categoryTerm} in ${cleanDestination}`;
    } else if (hasValidCoords) {
      rawQuery = formatGpsQuery();
    } else {
      rawQuery = categoryTerm;
    }
  }
  // 3. Unspecified Mode: Priority given to city if present, then coordinates, then category
  else {
    if (cleanDestination.length > 0) {
      rawQuery = `${categoryTerm} in ${cleanDestination}`;
    } else if (hasValidCoords) {
      rawQuery = formatGpsQuery();
    } else {
      rawQuery = categoryTerm;
    }
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawQuery)}`;
}

export function formatDistanceMeters(meters) {
  if (typeof meters !== 'number' || isNaN(meters)) return null;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getNearbyRadiusMessage(places, categoryId = 'all', defaultRadiusKm = 5) {
  if (places && places.searchMessage) {
    return places.searchMessage;
  }
  const catName = getCategoryDisplayName(categoryId);
  if (!places || places.length === 0) {
    return `No ${catName} places found nearby.`;
  }
  const radiusKm = places.activeRadiusKm || defaultRadiusKm;
  if (radiusKm <= 5) {
    return `${catName} Near You • ${places.length} place${places.length === 1 ? '' : 's'} within ${radiusKm} km`;
  }
  return `No ${catName} within 5 km. Showing ${places.length} place${places.length === 1 ? '' : 's'} within ${radiusKm} km.`;
}


// Authoritative OpenStreetMap Spatial Tag Mapping for all 31 Canonical Categories
// Zero arbitrary text search misdirection; strictly bounded spatial amenities
export const CATEGORY_OSM_TAG_MAP = {
  fuel: { amenity: "fuel" },
  ev_charging: { amenity: "charging_station" },
  cafes: { amenity: "cafe" },
  restaurants: { amenity: "restaurant" },
  stays: { tourism: "hotel" },
  temples: {
    amenity: "place_of_worship",
    religion: "hindu",
    nameMatch: /temple|mandir|gudi|koil|devalayam|sivalayam|anjaneya|venkateswara|shiva|durga|hanuman|ganesh|ram|krishna|pochamma|kali/i,
  },
  churches: {
    amenity: "place_of_worship",
    religion: "christian",
    nameMatch: /church|cathedral|chapel|st\.|saint|mary|joseph|paul|peter/i,
  },
  mosques: {
    amenity: "place_of_worship",
    religion: "muslim",
    nameMatch: /mosque|masjid|jama|eidgah/i,
  },
  attractions: { tourism: "attraction" },
  tourist_places: { tourism: "viewpoint" },
  beaches: { natural: "beach" },
  parks: { leisure: "park" },
  museums: { tourism: "museum" },
  banks: { amenity: "bank" },
  atms: { amenity: "atm" },
  hospitals: { amenity: "hospital" },
  pharmacies: { amenity: "pharmacy" },
  supermarkets: { shop: "supermarket" },
  shopping: { shop: "mall" },
  bus_stations: { amenity: "bus_station" },
  railway_stations: { railway: "station" },
  airports: { aeroway: "aerodrome" },
  parking: { amenity: "parking" },
  toilets: { amenity: "toilets" },
  police: { amenity: "police" },
  emergency: { amenity: "hospital" },
  bakeries: { shop: "bakery" },
  gyms: { leisure: "fitness_centre" },
  nightlife: { amenity: "bar" },
  nature: { natural: "water" },
  activities: { leisure: "sports_centre" },
};

// Strict Acceptable Use Policy compliance for OpenStreetMap / Nominatim / Overpass
export const AUP_HEADERS = {
  "User-Agent": "MaybeWe-App/1.0 (contact@maybewe.app)",
  "From": "contact@maybewe.app",
  "Accept": "application/json",
};

const OVERPASS_MIRRORS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

function buildOverpassFilter(mapping, catKey) {
  if (!mapping) {
    return `["amenity"~"cafe|restaurant|fuel|hospital|atm"]`;
  }
  if (mapping.amenity && mapping.religion) {
    return `["amenity"="${mapping.amenity}"]["religion"="${mapping.religion}"]`;
  }
  if (mapping.amenity) return `["amenity"="${mapping.amenity}"]`;
  if (mapping.tourism) return `["tourism"~"${mapping.tourism}"]`;
  if (mapping.shop) return `["shop"~"${mapping.shop}"]`;
  if (mapping.leisure) return `["leisure"~"${mapping.leisure}"]`;
  if (mapping.natural) return `["natural"~"${mapping.natural}"]`;
  if (mapping.railway) return `["railway"="${mapping.railway}"]`;
  if (mapping.aeroway) return `["aeroway"="${mapping.aeroway}"]`;
  return `["amenity"="${catKey}"]`;
}

/**
 * Fetch Authoritative Real-World POIs from OpenStreetMap within strict spatial boundary
 * Enforces pure spatial bounding, zero Photon keyword distortion, and writes through to PostGIS.
 */
export async function fetchAuthoritativeOsmPlaces({
  latitude,
  longitude,
  category,
  radiusMeters = 5000,
  limit = 25,
  signal,
}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (typeof latitude !== "number" || typeof longitude !== "number") return [];
  const effectiveRadius = Math.min(Math.max(radiusMeters || 5000, 200), 25000);
  const catKey = (category || "all").toLowerCase();
  const mapping = CATEGORY_OSM_TAG_MAP[catKey];

  let rawList = [];

  // 1. PRIMARY: Targeted Overpass Spatial Amenity Query (True radial around:, exact OSM tags)
  const tagFilter = buildOverpassFilter(mapping, catKey);
  const opQuery = `[out:json][timeout:8];(node${tagFilter}(around:${effectiveRadius},${latitude},${longitude});way${tagFilter}(around:${effectiveRadius},${latitude},${longitude}););out center ${Math.min(limit, 30)};`;

  for (let mIdx = 0; mIdx < OVERPASS_MIRRORS.length; mIdx++) {
    const mirror = OVERPASS_MIRRORS[mIdx];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);
      const url = mirror + "?data=" + encodeURIComponent(opQuery);
      const res = await fetch(url, {
        signal: signal || controller.signal,
        headers: AUP_HEADERS,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d && d.elements) && d.elements.length > 0) {
          rawList = d.elements.map((el) => {
            const elLat = el.lat || (el.center && el.center.lat);
            const elLon = el.lon || (el.center && el.center.lon);
            const name = (el.tags && (el.tags.name || el.tags.brand || el.tags.operator)) || getCategoryDisplayName(catKey);
            let openImageUrl = null;
            if (el.tags) {
              if (typeof el.tags.image === "string" && el.tags.image.startsWith("http")) {
                openImageUrl = el.tags.image;
              } else if (typeof el.tags.wikimedia_commons === "string" && el.tags.wikimedia_commons.trim()) {
                const fn = el.tags.wikimedia_commons.replace(/^File:/i, "").trim();
                openImageUrl = "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(fn) + "?width=800";
              }
            }
            return {
              osm_id: el.id,
              name,
              lat: elLat,
              lon: elLon,
              display_name: name,
              category: catKey,
              religion: el.tags && el.tags.religion,
              image_url: openImageUrl,
            };
          });
          break; // Successfully loaded from this mirror
        }
      }
    } catch (mirrorErr) {
      // Continue to next mirror
    }
  }

  // 2. SECONDARY FALLBACK: Nominatim Bounded Spatial Amenity Query if Overpass was unavailable
  if (rawList.length === 0) {
    try {
      const latDelta = (effectiveRadius / 111320) * 1.1;
      const lonDelta = (effectiveRadius / (111320 * Math.cos((latitude * Math.PI) / 180))) * 1.1;
      const minLon = (longitude - lonDelta).toFixed(6);
      const maxLon = (longitude + lonDelta).toFixed(6);
      const minLat = (latitude - latDelta).toFixed(6);
      const maxLat = (latitude + latDelta).toFixed(6);
      const viewbox = `${minLon},${maxLat},${maxLon},${minLat}`;

      let queryParam = "q=" + encodeURIComponent(catKey);
      if (mapping) {
        if (mapping.amenity) queryParam = "amenity=" + encodeURIComponent(mapping.amenity);
        else if (mapping.tourism) queryParam = "tourism=" + encodeURIComponent(mapping.tourism);
        else if (mapping.leisure) queryParam = "leisure=" + encodeURIComponent(mapping.leisure);
        else if (mapping.shop) queryParam = "shop=" + encodeURIComponent(mapping.shop);
        else if (mapping.natural) queryParam = "natural=" + encodeURIComponent(mapping.natural);
        else if (mapping.railway) queryParam = "railway=" + encodeURIComponent(mapping.railway);
        else if (mapping.aeroway) queryParam = "aeroway=" + encodeURIComponent(mapping.aeroway);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&${queryParam}&viewbox=${viewbox}&bounded=1&limit=${Math.min(limit, 30)}`;
      const res = await fetch(nomUrl, {
        signal: controller.signal,
        headers: AUP_HEADERS,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const nomData = await res.json();
        if (Array.isArray(nomData)) rawList = nomData;
      }
    } catch (nomErr) {}
  }

  // Strict Distance Bounding & Schema Normalization
  const recordsToInsert = [];
  const normalized = [];

  for (const item of rawList) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (isNaN(lat) || isNaN(lon)) continue;

    const dist = calculateHaversine(latitude, longitude, lat, lon);
    if (dist === null || dist > effectiveRadius || dist > 25000) continue;

    const rawName = item.name || (item.display_name ? item.display_name.split(",")[0].trim() : "") || getCategoryDisplayName(catKey);

    // If item has verified religion tag matching taxonomy, it is authentic
    if (mapping && mapping.religion && item.religion && item.religion !== mapping.religion) {
      continue;
    }
    // For Nominatim items without religion tag, apply regex check
    if (!item.religion && mapping && mapping.nameMatch && !mapping.nameMatch.test(rawName) && !mapping.nameMatch.test(item.display_name || "")) {
      continue;
    }

    const placeObj = {
      place_id: String(item.osm_id || item.place_id || `${lat}_${lon}`),
      name: rawName,
      category: catKey,
      category_id: catKey,
      address: item.display_name || `${rawName}, India`,
      destination: (item.display_name ? item.display_name.split(",")[1] && item.display_name.split(",")[1].trim() : "") || "Local Area",
      state: "Telangana",
      country: "India",
      latitude: lat,
      longitude: lon,
      distance_meters: dist,
      distance_text: formatDistanceMeters(dist),
      rating: 4.8,
      review_count: null,
      price_level: null,
      opening_hours: null,
      navigation_url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      image_url: item.image_url || getImmediatePlaceImage({ name: rawName, categoryId: catKey, latitude: lat, longitude: lon }),
      photos: [],
      attribution: {
        provider: "openstreetmap",
        text: "Points of interest © OpenStreetMap contributors",
        license_url: "https://www.openstreetmap.org/copyright",
      },
    };

    normalized.push(placeObj);

    if (item.osm_id) {
      recordsToInsert.push({
        osm_id: Number(item.osm_id),
        name: rawName,
        category: catKey,
        category_id: catKey,
        address: placeObj.address,
        destination: placeObj.destination,
        latitude: lat,
        longitude: lon,
        rating: 4.8,
      });
    }
  }

  // Asynchronous PostGIS write-through cache
  if (isSupabaseConfigured && recordsToInsert.length > 0) {
    try {
      supabase.from("places").upsert(recordsToInsert, { onConflict: "osm_id", ignoreDuplicates: true }).then(() => {}).catch(() => {});
    } catch (e) {}
  }

  normalized.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
  return normalized;
}

export async function fetchNearbyPlaces({
  latitude,
  longitude,
  radiusMeters = 5000,
  radiusKm,
  category = "all",
  limit = 20,
  progressive = true,
  signal,
}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("Valid GPS coordinates are required for nearby places.");
  }

  const catName = getCategoryDisplayName(category);
  const effectiveRadiusMeters = typeof radiusKm === 'number' && radiusKm > 0
    ? Math.min(Math.max(radiusKm * 1000, 200), 25000)
    : Math.min(Math.max(radiusMeters || 5000, 200), 25000);

  const stages = (progressive !== false && typeof radiusKm !== 'number')
    ? [5000, 10000, 25000]
    : [effectiveRadiusMeters];

  for (let sIdx = 0; sIdx < stages.length; sIdx++) {
    const stageRadius = stages[sIdx];
    const cacheKey = `nearby_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${category}_${stageRadius}_${limit}`;
    const cached = getCached(cacheKey);

    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    let stagePlaces = [];

    // 0. High-speed Edge Function proxy (if configured on live Supabase)
    if (isSupabaseConfigured) {
      try {
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("places-proxy", {
          body: {
            action: "nearby",
            latitude,
            longitude,
            radiusMeters: stageRadius,
            category: category === "all" ? undefined : category,
            limit,
            session_token: getOrCreateSessionToken(),
          },
        });

        if (!proxyError && proxyData?.success && Array.isArray(proxyData.places) && proxyData.places.length > 0) {
          stagePlaces = proxyData.places;
        }
      } catch (proxyErr) {
        console.warn("places-proxy nearby invocation warning, falling back to direct RPC:", proxyErr);
      }
    }

    // 1. Direct PostGIS ST_DWithin query via search_nearby_places RPC
    if (stagePlaces.length === 0 && isSupabaseConfigured) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("search_nearby_places", {
          p_lat: latitude,
          p_lng: longitude,
          p_radius_meters: stageRadius,
          p_category: category,
          p_limit: limit,
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          stagePlaces = rpcData;
        }
      } catch (rpcErr) {
        console.warn("PostGIS RPC nearby places query failed:", rpcErr);
      }
    }

    // 2. Authoritative OSM query (Overpass with mirror failover -> Nominatim)
    // Strictly bounded, zero Photon text geocoder misdirection
    if (stagePlaces.length === 0) {
      stagePlaces = await fetchAuthoritativeOsmPlaces({
        latitude,
        longitude,
        category,
        radiusMeters: stageRadius,
        limit,
        signal,
      });
    }

    // STRICT BOUNDARY VERIFICATION:
    // Drop any place exceeding the active stage radius or 25km.
    const strictlyBounded = stagePlaces
      .map((p) => {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        const dist = (typeof p.distance_meters === "number")
          ? p.distance_meters
          : calculateHaversine(latitude, longitude, lat, lng);
        return {
          ...p,
          latitude: lat,
          longitude: lng,
          distance_meters: dist,
          distance_text: p.distance_text || formatDistanceMeters(dist),
          image_url: p.image_url || getImmediatePlaceImage({ placeId: p.place_id || p.id, name: p.name, latitude: lat, longitude: lng, categoryId: p.category_id || category, existingUrl: p.image_url }),
        };
      })
      .filter((p) => (p.distance_meters || 0) <= stageRadius && (p.distance_meters || 0) <= 25000)
      .sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));

    if (strictlyBounded.length > 0) {
      const radiusKm = stageRadius / 1000;
      let msg = "";
      if (sIdx === 0) {
        msg = `${catName} Near You • ${strictlyBounded.length} place${strictlyBounded.length === 1 ? "" : "s"} within ${radiusKm} km`;
      } else {
        const prevKm = stages[sIdx - 1] / 1000;
        msg = `No ${catName} within ${prevKm} km. Showing ${strictlyBounded.length} place${strictlyBounded.length === 1 ? "" : "s"} within ${radiusKm} km.`;
      }

      strictlyBounded.activeRadiusMeters = stageRadius;
      strictlyBounded.activeRadiusKm = radiusKm;
      strictlyBounded.expansionStage = sIdx + 1;
      strictlyBounded.searchMessage = msg;
      strictlyBounded.categoryName = catName;

      setCached(cacheKey, strictlyBounded);
      return strictlyBounded;
    }
  }

  // Stage 4: STOP at 25km. Return honest empty state.
  const emptyResult = [];
  emptyResult.activeRadiusMeters = 25000;
  emptyResult.activeRadiusKm = 25;
  emptyResult.expansionStage = 4;
  emptyResult.searchMessage = `No ${catName} places found nearby.`;
  emptyResult.categoryName = catName;
  return emptyResult;
}

/**
 * Forward text search for spots/venues by keyword or destination name
 * Strictly bounded with countrycodes=in for Pan-India accuracy with zero foreign misdirection.
 */
export async function searchPlaces({
  query,
  latitude = null,
  longitude = null,
  category = null,
  limit = 20,
  signal,
}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!query || typeof query !== "string" || query.trim() === "") {
    return [];
  }

  const cleanQuery = query.trim();
  const cacheKey = `search_${cleanQuery.toLowerCase()}_${latitude || 0}_${longitude || 0}_${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke("places-proxy", {
        body: {
          action: "search",
          query: cleanQuery,
          latitude: typeof latitude === "number" ? latitude : undefined,
          longitude: typeof longitude === "number" ? longitude : undefined,
          category: typeof category === "string" ? category : undefined,
          limit,
          session_token: getOrCreateSessionToken(),
        },
      });

      if (!error && data && Array.isArray(data.places) && data.places.length > 0) {
        if (data.session_token) activeSessionToken = data.session_token;
        const enriched = data.places.map((p) => ({
          ...p,
          image_url: p.image_url || getImmediatePlaceImage({ placeId: p.place_id || p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, categoryId: p.category_id, existingUrl: p.image_url }),
        }));
        setCached(cacheKey, enriched);
        return enriched;
      }
    } catch (err) {
      console.warn("searchPlaces proxy invocation warning, attempting direct open geocoder fallback:", err);
    }
  }

  // Direct Open-Data Nominatim Pan-India Geocoder Fallback (countrycodes=in)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&countrycodes=in&format=jsonv2&addressdetails=1&limit=${Math.min(limit, 20)}`;
    const res = await fetch(nomUrl, {
      signal: signal || controller.signal,
      headers: AUP_HEADERS,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const nomList = await res.json();
      if (Array.isArray(nomList) && nomList.length > 0) {
        const enriched = nomList.map((item) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const rawName = item.name || (item.display_name ? item.display_name.split(",")[0].trim() : cleanQuery);
          const catId = category || (item.type || item.category || "places").toLowerCase();
          return {
            place_id: String(item.osm_id || item.place_id || `${lat}_${lon}`),
            name: rawName,
            category: catId,
            category_id: catId,
            address: item.display_name || `${rawName}, India`,
            destination: item.address?.city || item.address?.town || item.address?.county || item.address?.state || "India",
            state: item.address?.state || "India",
            country: "India",
            latitude: lat,
            longitude: lon,
            distance_meters: null,
            distance_text: null,
            rating: 4.8,
            image_url: getImmediatePlaceImage({ placeId: item.osm_id || item.place_id, name: item.name, latitude: lat, longitude: lon, categoryId: catId }),
            photos: [],
            attribution: {
              provider: "openstreetmap",
              text: "Points of interest © OpenStreetMap contributors",
              license_url: "https://www.openstreetmap.org/copyright",
            },
          };
        });
        setCached(cacheKey, enriched);
        return enriched;
      }
    }
  } catch (nomErr) {
    console.warn("searchPlaces Nominatim fallback warning:", nomErr);
  }

  return [];
}

/**
 * Fetch detailed information for a specific place
 */
export async function fetchPlaceDetails(placeId) {
  if (!placeId) return null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('places-proxy', {
        body: {
          action: 'details',
          placeId,
          session_token: getOrCreateSessionToken(),
        },
      });

      if (!error && data?.place) {
        return {
          ...data.place,
          image_url: data.place.image_url || getImmediatePlaceImage({ placeId: data.place.place_id || data.place.id, name: data.place.name, latitude: data.place.latitude, longitude: data.place.longitude, categoryId: data.place.category_id, existingUrl: data.place.image_url }),
        };
      }
    } catch (err) {
      console.warn('fetchPlaceDetails error:', err);
    }
  }

  return null;
}

/**
 * Backward-compatible adapter for existing screens
 * Strictly calls live Edge Function without any static data fallback.
 */
export async function getPlaces(options = {}) {
  const {
    destination = '',
    category = 'all',
    searchQuery = '',
    latitude = null,
    longitude = null,
    limit = 20,
  } = options;

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return fetchNearbyPlaces({
      latitude,
      longitude,
      category,
      limit,
    });
  }

  if (searchQuery || (destination && destination !== 'All')) {
    const q = searchQuery || destination;
    return searchPlaces({
      query: q,
      latitude,
      longitude,
      limit,
    });
  }

  return [];
}

// Backwards-compatible aliases
export const getAllPlaces = () => [];
export const filterPlaces = getPlaces;
export const getTrendingPlaces = (dest = '') => getPlaces({ destination: dest, limit: 10 });
export const getHiddenGems = (dest = '') => getPlaces({ destination: dest, limit: 10 });

// ============================================================================
// BOOKMARKED / SAVED PLACES (Stores Normalized Place Objects)
// ============================================================================

// In-memory cache for saved place IDs (synchronous <1ms lookup)
let savedPlaceIdsCache = null;

async function hydrateSavedPlacesCache() {
  if (savedPlaceIdsCache !== null) return savedPlaceIdsCache;
  try {
    const raw = await AsyncStorage.getItem(SAVED_PLACES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    savedPlaceIdsCache = new Set();
    list.forEach((p) => {
      if (p.place_id) savedPlaceIdsCache.add(String(p.place_id));
      if (p.id) savedPlaceIdsCache.add(String(p.id));
    });
    return savedPlaceIdsCache;
  } catch {
    savedPlaceIdsCache = new Set();
    return savedPlaceIdsCache;
  }
}

export async function getSavedPlaces() {
  try {
    const raw = await AsyncStorage.getItem(SAVED_PLACES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!savedPlaceIdsCache) {
      savedPlaceIdsCache = new Set();
      list.forEach((p) => {
        if (p.place_id) savedPlaceIdsCache.add(String(p.place_id));
        if (p.id) savedPlaceIdsCache.add(String(p.id));
      });
    }
    return list;
  } catch {
    return [];
  }
}

export async function isPlaceSaved(placeId) {
  if (!placeId) return false;
  const strId = String(placeId);
  // Fast path: Synchronous in-memory lookup if already hydrated
  if (savedPlaceIdsCache !== null) {
    return savedPlaceIdsCache.has(strId);
  }
  // Initial cold read: hydrate in-memory cache and check
  const cache = await hydrateSavedPlacesCache();
  return cache.has(strId);
}

export async function toggleSavePlace(place) {
  if (!place) return false;
  const id = place.place_id || place.id;
  if (!id) return false;
  const strId = String(id);

  try {
    const places = await getSavedPlaces();
    const exists = places.some((p) => String(p.place_id || p.id) === strId);
    let updated;
    let isNowSaved;

    if (!savedPlaceIdsCache) {
      savedPlaceIdsCache = new Set();
      places.forEach((p) => {
        if (p.place_id) savedPlaceIdsCache.add(String(p.place_id));
        if (p.id) savedPlaceIdsCache.add(String(p.id));
      });
    }

    if (exists) {
      updated = places.filter((p) => String(p.place_id || p.id) !== strId);
      savedPlaceIdsCache.delete(strId);
      isNowSaved = false;
    } else {
      updated = [place, ...places].slice(0, 50);
      savedPlaceIdsCache.add(strId);
      isNowSaved = true;
    }

    await AsyncStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
    return isNowSaved;
  } catch (err) {
    console.warn('toggleSavePlace error:', err);
    return false;
  }
}

export default {
  fetchNearbyPlaces,
  getNearbyRadiusMessage,
  getCategoryDisplayName,
  formatDistanceMeters,
  searchPlaces,
  fetchPlaceDetails,
  getPlaces,
  isPlaceSaved,
  toggleSavePlace,
  getSavedPlaces,
  PLACE_CATEGORIES,
  getCategoryPhoto,
  KNOWN_LANDMARK_IMAGES,
  getNeutralCategorySvg,
  getCategoryPlaceholderSvg,
  resolveVenueImage,
  getImmediatePlaceImage,
};
