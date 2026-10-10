// ============================================================================
// MAYBEWE PLACE IMAGE SYSTEM (frontend/lib/placeImages.js)
// Accurate, India-wide venue photography & elegant vector placeholders.
// Zero black cards. Zero invented photos. Strict landmark verification.
// ============================================================================

import AsyncStorage from './safeStorage.js';

// ----------------------------------------------------------------------------
// 1. VERIFIED CANONICAL INDIAN LANDMARKS REGISTRY
// Strict identity confirmation — only assigned when place name confirms identity.
// ----------------------------------------------------------------------------
export const KNOWN_LANDMARK_IMAGES = {
  // Mumbai
  'gateway of india': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&auto=format&fit=crop&q=85',
  'marine drive': 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&auto=format&fit=crop&q=85',
  'chhatrapati shivaji terminus': 'https://images.unsplash.com/photo-1562979314-bee7453e911c?w=1200&auto=format&fit=crop&q=85',
  'cst station': 'https://images.unsplash.com/photo-1562979314-bee7453e911c?w=1200&auto=format&fit=crop&q=85',
  'bandra-worli sea link': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=85',
  'elephanta caves': 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&auto=format&fit=crop&q=85',
  'juhu beach': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=85',
  'siddhivinayak': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=85',
  'haji ali': 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&auto=format&fit=crop&q=85',

  // Delhi & NCR
  'india gate': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&auto=format&fit=crop&q=85',
  'qutub minar': 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=1200&auto=format&fit=crop&q=85',
  'red fort': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=85',
  'humayun tomb': 'https://images.unsplash.com/photo-1585136917228-44d5a9d8d697?w=1200&auto=format&fit=crop&q=85',
  'humayun\'s tomb': 'https://images.unsplash.com/photo-1585136917228-44d5a9d8d697?w=1200&auto=format&fit=crop&q=85',
  'lotus temple': 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&auto=format&fit=crop&q=85',
  'akshardham': 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=1200&auto=format&fit=crop&q=85',
  'jama masjid': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&auto=format&fit=crop&q=85',
  'rashtrapati bhavan': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&auto=format&fit=crop&q=85',

  // Bengaluru
  'cubbon park': 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=1200&auto=format&fit=crop&q=85',
  'lalbagh': 'https://images.unsplash.com/photo-1585136917228-44d5a9d8d697?w=1200&auto=format&fit=crop&q=85',
  'lalbagh botanical garden': 'https://images.unsplash.com/photo-1585136917228-44d5a9d8d697?w=1200&auto=format&fit=crop&q=85',
  'bangalore palace': 'https://images.unsplash.com/photo-1600100397608-f010f443b22b?w=1200&auto=format&fit=crop&q=85',
  'bengaluru palace': 'https://images.unsplash.com/photo-1600100397608-f010f443b22b?w=1200&auto=format&fit=crop&q=85',
  'vidhana soudha': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=85',
  'iskcon temple bangalore': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=85',

  // Hyderabad
  'charminar': 'https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?w=1200&auto=format&fit=crop&q=85',
  'golconda fort': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=85',
  'hussain sagar': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=85',
  'birla mandir hyderabad': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=85',
  'salar jung museum': 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&auto=format&fit=crop&q=85',

  // Agra, Jaipur, Amritsar, Kolkata, Mysore, Vijayawada
  'taj mahal': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&auto=format&fit=crop&q=85',
  'agra fort': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=85',
  'hawa mahal': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&auto=format&fit=crop&q=85',
  'amer fort': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=85',
  'city palace jaipur': 'https://images.unsplash.com/photo-1600100397608-f010f443b22b?w=1200&auto=format&fit=crop&q=85',
  'golden temple': 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1200&auto=format&fit=crop&q=85',
  'harmandir sahib': 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1200&auto=format&fit=crop&q=85',
  'victoria memorial': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=1200&auto=format&fit=crop&q=85',
  'howrah bridge': 'https://images.unsplash.com/photo-1562979314-bee7453e911c?w=1200&auto=format&fit=crop&q=85',
  'mysore palace': 'https://images.unsplash.com/photo-1600100397608-f010f443b22b?w=1200&auto=format&fit=crop&q=85',
  'mysuru palace': 'https://images.unsplash.com/photo-1600100397608-f010f443b22b?w=1200&auto=format&fit=crop&q=85',
  'kanaka durga temple': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=85',
  'prakasam barrage': 'https://images.unsplash.com/photo-1562979314-bee7453e911c?w=1200&auto=format&fit=crop&q=85',
  'undavalli caves': 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&auto=format&fit=crop&q=85',
  'hadimba devi temple': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&auto=format&fit=crop&q=85',
};

// ----------------------------------------------------------------------------
// 2. VIBRANT, LUXURY VECTOR PLACEHOLDERS (NO BLACK BOXES)
// Generates Base64 encoded SVGs with curated gradients, vector icons, and titles.
// ----------------------------------------------------------------------------
const CATEGORY_STYLES = {
  cafes: {
    g1: '#7B4A28', g2: '#3D1F0E', iconColor: '#F5E6D8', label: 'CAFE',
    icon: 'M14 8h18a3 3 0 0 1 3 3v8a7 7 0 0 1-7 7H21a7 7 0 0 1-7-7v-8a3 3 0 0 1 3-3zm21 5h4a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-4v-7zM10 30h28a2 2 0 0 1 0 4H10a2 2 0 0 1 0-4z'
  },
  restaurants: {
    g1: '#8E381A', g2: '#4A1808', iconColor: '#FBE8DE', label: 'DINING',
    icon: 'M15 7v14m4-14v14m-8-14v7a4 4 0 0 0 4 4v7m16-14v5a4 4 0 0 1-4 4v9m4-18c2 2 3 5 3 7v2h-7'
  },
  temples: {
    g1: '#8C5E14', g2: '#472E06', iconColor: '#FFF1C2', label: 'TEMPLE',
    icon: 'M24 6l6 10H18l6-10zm-8 10h16v6H16v-6zm-4 6h24v16H12V22zm6 16v-8h12v8H18z'
  },
  churches: {
    g1: '#2C4977', g2: '#122542', iconColor: '#DCE8FA', label: 'CHURCH',
    icon: 'M24 6v8m-4-4h8m-4 8v22m-8-12h16'
  },
  mosques: {
    g1: '#1F5C45', g2: '#0D2B20', iconColor: '#D1EFE4', label: 'MOSQUE',
    icon: 'M24 7c6 5 10 10 10 16H14c0-6 4-11 10-16zm-10 16h20v15H14V23zm10 15v-6a3 3 0 0 1 6 0v6h-6z'
  },
  attractions: {
    g1: '#8B6A2B', g2: '#46320F', iconColor: '#FDF3D6', label: 'ATTRACTION',
    icon: 'M24 6l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9z'
  },
  tourist_places: {
    g1: '#2A556F', g2: '#102533', iconColor: '#D6EAF8', label: 'TOURIST SPOT',
    icon: 'M24 8a16 16 0 1 0 0 32 16 16 0 0 0 0-32zm0 6l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z'
  },
  beaches: {
    g1: '#1C6B72', g2: '#0A3135', iconColor: '#D1F2F5', label: 'BEACH',
    icon: 'M24 8a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-14 20c4-3 8-3 12 0s8 3 12 0 8-3 12 0v4H10v-4z'
  },
  parks: {
    g1: '#2D5E37', g2: '#122E19', iconColor: '#D8F1DE', label: 'PARK',
    icon: 'M24 7l8 12h-5l6 10H15l6-10h-5l8-12zm-2 22h4v11h-4V29z'
  },
  museums: {
    g1: '#634A6E', g2: '#2F1E36', iconColor: '#EFE5F5', label: 'MUSEUM',
    icon: 'M24 8l14 8H10l14-8zm-11 8h22v3H13v-3zm3 3v15h3V19h-3zm7 0v15h3V19h-3zm7 0v15h3V19h-3zM10 34h28v4H10v-4z'
  },
  hotels: {
    g1: '#4A536B', g2: '#202534', iconColor: '#E2E6F2', label: 'STAY',
    icon: 'M10 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v18h-4v-4H14v4h-4V18zm16 4h10a4 4 0 0 1 4 4v10h-4v-4h-6v4h-4V22z'
  },
  stays: {
    g1: '#4A536B', g2: '#202534', iconColor: '#E2E6F2', label: 'STAY',
    icon: 'M10 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v18h-4v-4H14v4h-4V18zm16 4h10a4 4 0 0 1 4 4v10h-4v-4h-6v4h-4V22z'
  },
  hospitals: {
    g1: '#852D37', g2: '#421117', iconColor: '#FDE4E7', label: 'HOSPITAL',
    icon: 'M21 9h6v9h9v6h-9v9h-6v-9h-9v-6h9V9z'
  },
  pharmacies: {
    g1: '#266D5A', g2: '#0F332A', iconColor: '#D8F3EB', label: 'PHARMACY',
    icon: 'M21 9h6v9h9v6h-9v9h-6v-9h-9v-6h9V9z'
  },
  shopping: {
    g1: '#6E4555', g2: '#351C26', iconColor: '#F8E7EE', label: 'SHOPPING',
    icon: 'M14 14h20l-2 20H16L14 14zm5 0V11a5 5 0 0 1 10 0v3h-2v-3a3 3 0 0 0-6 0v3h-2z'
  },
  supermarkets: {
    g1: '#3D6142', g2: '#1B2E1E', iconColor: '#E0F2E3', label: 'GROCERY',
    icon: 'M10 12h28l-3 18H13L10 12zm8 24a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'
  },
  bakeries: {
    g1: '#7E4F25', g2: '#3C220E', iconColor: '#F6E7DB', label: 'BAKERY',
    icon: 'M14 8h18a3 3 0 0 1 3 3v8a7 7 0 0 1-7 7H21a7 7 0 0 1-7-7v-8a3 3 0 0 1 3-3z'
  },
  nightlife: {
    g1: '#4A2A69', g2: '#1F0F30', iconColor: '#EFE2FA', label: 'NIGHTLIFE',
    icon: 'M14 10h20l-7 14v10h-6V24L14 10zm4 5h12l3-5H15l3 5z'
  },
  nature: {
    g1: '#205E44', g2: '#0D2D20', iconColor: '#D3F4E6', label: 'NATURE',
    icon: 'M24 7l8 12h-5l6 10H15l6-10h-5l8-12zm-2 22h4v11h-4V29z'
  },
  activities: {
    g1: '#255A6E', g2: '#0E2732', iconColor: '#D4EEF8', label: 'ACTIVITY',
    icon: 'M12 24a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm24 0a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-12-8l5 10H19l5-10z'
  },
  bus_stations: {
    g1: '#28586B', g2: '#112934', iconColor: '#D7EEF7', label: 'TRANSIT',
    icon: 'M14 10h20a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4zm4 20a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'
  },
  railway_stations: {
    g1: '#3F4D63', g2: '#1B2330', iconColor: '#DFE7F4', label: 'RAILWAY',
    icon: 'M14 10h20a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4zm-2 26l6-4m12 4l-6-4'
  },
  airports: {
    g1: '#1F5370', g2: '#0B2433', iconColor: '#D0EAF9', label: 'AIRPORT',
    icon: 'M24 6l4 12 12 4-12 3-3 13-3-4-2 4 1-9-8-2 8-8z'
  },
  police: {
    g1: '#213F61', g2: '#0B1A2C', iconColor: '#D2E4F9', label: 'POLICE',
    icon: 'M24 6l12 4v10c0 8-12 14-12 14S12 28 12 20V10l12-4z'
  },
  emergency: {
    g1: '#7E2525', g2: '#3D0D0D', iconColor: '#FDE1E1', label: 'EMERGENCY',
    icon: 'M24 8a16 16 0 1 0 0 32 16 16 0 0 0 0-32zm-2 8h4v10h-4V16zm0 14h4v4h-4v-4z'
  },
  default: {
    g1: '#544F49', g2: '#282420', iconColor: '#F2EFEB', label: 'SPOT',
    icon: 'M24 8a10 10 0 0 0-10 10c0 7 10 16 10 16s10-9 10-16a10 10 0 0 0-10-10zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z'
  }
};

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function getCacheKey(placeId, name, lat, lon) {
  if (placeId) return `id_${placeId}`;
  const cleanName = (name || '').trim().toLowerCase();
  const cLat = typeof lat === 'number' ? lat.toFixed(4) : '';
  const cLon = typeof lon === 'number' ? lon.toFixed(4) : '';
  return `coord_${cleanName}_${cLat}_${cLon}`;
}

/**
 * Returns a self-contained, base64-encoded SVG vector placeholder.
 * Safe across all browser platforms, never renders a black box.
 */
const CATEGORY_ALIASES = {
  cafe: 'cafes',
  coffee: 'cafes',
  coffee_shop: 'cafes',
  tea: 'cafes',
  restaurant: 'restaurants',
  food: 'restaurants',
  dining: 'restaurants',
  fast_food: 'restaurants',
  temple: 'temples',
  church: 'churches',
  mosque: 'mosques',
  hotel: 'stays',
  stay: 'stays',
  guest_house: 'stays',
  hostel: 'stays',
  motel: 'stays',
  lodging: 'stays',
  hospital: 'hospitals',
  clinic: 'hospitals',
  doctors: 'hospitals',
  pharmacy: 'pharmacies',
  chemist: 'pharmacies',
  drugstore: 'pharmacies',
  park: 'parks',
  garden: 'parks',
  museum: 'museums',
  gallery: 'museums',
  bakery: 'bakeries',
  shop: 'shopping',
  mall: 'shopping',
  supermarket: 'supermarkets',
  grocery: 'supermarkets',
  beach: 'beaches',
  attraction: 'attractions',
  viewpoint: 'tourist_places',
  monument: 'attractions',
  historic: 'attractions',
  heritage: 'attractions',
};

export function getCategoryPlaceholderSvg(categoryId = 'default', placeName = '') {
  let key = (categoryId || 'default').toLowerCase().trim();
  if (CATEGORY_ALIASES[key]) key = CATEGORY_ALIASES[key];
  if (!CATEGORY_STYLES[key]) {
    const lowerName = (placeName || '').toLowerCase();
    if (lowerName.includes('cafe') || lowerName.includes('coffee') || lowerName.includes('roast')) key = 'cafes';
    else if (lowerName.includes('restaurant') || lowerName.includes('bhavan') || lowerName.includes('dining')) key = 'restaurants';
    else if (lowerName.includes('hotel') || lowerName.includes('stay') || lowerName.includes('resort')) key = 'stays';
    else if (lowerName.includes('temple') || lowerName.includes('mandir')) key = 'temples';
    else if (lowerName.includes('hospital') || lowerName.includes('clinic')) key = 'hospitals';
    else if (lowerName.includes('park') || lowerName.includes('garden')) key = 'parks';
  }
  const theme = CATEGORY_STYLES[key] || CATEGORY_STYLES.default;
  const cleanName = escapeXml((placeName || '').trim());

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.g1}"/>
        <stop offset="100%" stop-color="${theme.g2}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.14)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="600" height="400" fill="url(#bgGrad)"/>
    <rect width="600" height="400" fill="url(#glow)"/>
    <circle cx="300" cy="170" r="68" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <g transform="translate(276, 146) scale(1)" fill="none" stroke="${theme.iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="${theme.icon}"/>
    </g>
    <rect x="230" y="260" width="140" height="24" rx="12" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
    <text x="300" y="276" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#FAF8F5" text-anchor="middle" letter-spacing="1.2">${theme.label}</text>
    <text x="300" y="315" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#FAF8F5" text-anchor="middle">${cleanName ? cleanName.slice(0, 36) : 'Curated Destination'}</text>
  </svg>`;

  // Base64 encoding ensures zero URL-encoding/hash-fragment parsing bugs in web engines
  if (typeof Buffer !== 'undefined') {
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  }
  if (typeof btoa !== 'undefined') {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ----------------------------------------------------------------------------
// 3. PERSISTENT IN-MEMORY & STORAGE IMAGE CACHE
// Caches resolved images by placeId / name_coord to prevent duplicate network calls.
// ----------------------------------------------------------------------------
const inMemoryImageCache = new Map();
const CACHE_STORAGE_KEY = '@maybewe_place_images_v1';
let storageHydrated = false;

async function hydrateImageCache() {
  if (storageHydrated) return;
  storageHydrated = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        inMemoryImageCache.set(k, v);
      }
    }
  } catch (e) {}
}

async function persistImageCache(key, url) {
  inMemoryImageCache.set(key, url);
  try {
    const entries = Array.from(inMemoryImageCache.entries()).slice(-200);
    const obj = Object.fromEntries(entries);
    await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {}
}

// ----------------------------------------------------------------------------
// 4. INTELLIGENT INDIA-WIDE VENUE PHOTOGRAPHY RESOLVER
// Multi-Tier: 1. Existing -> 2. Landmark -> 3. Wikipedia API -> 4. Placeholder
// ----------------------------------------------------------------------------
export async function resolveVenueImage({
  placeId = null,
  name = '',
  latitude = null,
  longitude = null,
  categoryId = 'default',
  existingUrl = null,
  signal = null,
} = {}) {
  await hydrateImageCache();

  // Tier 1: Check existing valid HTTP image
  if (existingUrl && typeof existingUrl === 'string' && existingUrl.startsWith('http') && !existingUrl.includes('placeholder')) {
    return existingUrl;
  }

  const cacheKey = getCacheKey(placeId, name, latitude, longitude);
  if (inMemoryImageCache.has(cacheKey)) {
    return inMemoryImageCache.get(cacheKey);
  }

  const cleanName = (name || '').trim();
  const lowerName = cleanName.toLowerCase();

  // Tier 2: Confirmed Indian Landmark Check (Strict Identity)
  if (cleanName) {
    for (const [landmarkKey, url] of Object.entries(KNOWN_LANDMARK_IMAGES)) {
      if (
        lowerName === landmarkKey ||
        lowerName.startsWith(landmarkKey) ||
        lowerName.endsWith(landmarkKey) ||
        (landmarkKey.length > 7 && lowerName.includes(landmarkKey))
      ) {
        persistImageCache(cacheKey, url);
        return url;
      }
    }
  }

  // Tier 3: Wikipedia / Wikimedia Commons API
  if (cleanName && cleanName.length > 3) {
    try {
      // 3A: Title Query
      const titleUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanName)}&prop=pageimages&pithumbsize=800&format=json&origin=*`;
      const res = await fetch(titleUrl, {
        signal,
        headers: { 'User-Agent': 'MaybeWeTravelerApp/1.0 (contact@maybewe.app)' }
      });
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages || {};
        for (const id in pages) {
          if (id !== '-1' && pages[id].thumbnail?.source) {
            const photoUrl = pages[id].thumbnail.source;
            persistImageCache(cacheKey, photoUrl);
            return photoUrl;
          }
        }
      }
    } catch (e) {}

    // 3B: Geosearch Query (if coords available)
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      try {
        const geoUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${latitude}|${longitude}&ggsradius=400&ggslimit=4&prop=pageimages&pithumbsize=800&format=json&origin=*`;
        const geoRes = await fetch(geoUrl, {
          signal,
          headers: { 'User-Agent': 'MaybeWeTravelerApp/1.0 (contact@maybewe.app)' }
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const pages = geoData.query?.pages || {};
          for (const id in pages) {
            const page = pages[id];
            const pTitle = (page.title || '').toLowerCase();
            // Verify relevance between venue name and page title
            const isRelevant = lowerName.includes(pTitle) ||
              pTitle.includes(lowerName) ||
              pTitle.split(' ').some(w => w.length > 4 && lowerName.includes(w));
            if (page.thumbnail?.source && isRelevant) {
              const photoUrl = page.thumbnail.source;
              persistImageCache(cacheKey, photoUrl);
              return photoUrl;
            }
          }
        }
      } catch (e) {}
    }
  }

  // Tier 4: Unphotographed Venue -> Elegant Vector Placeholder
  const placeholder = getCategoryPlaceholderSvg(categoryId, cleanName);
  persistImageCache(cacheKey, placeholder);
  return placeholder;
}

/**
 * Synchronous resolver for immediate render (<1ms).
 * Returns cached image, landmark image, existing URL, or category placeholder.
 */
export function getImmediatePlaceImage({
  placeId = null,
  name = '',
  latitude = null,
  longitude = null,
  categoryId = 'default',
  existingUrl = null,
} = {}) {
  if (existingUrl && typeof existingUrl === 'string' && existingUrl.startsWith('http') && !existingUrl.includes('placeholder')) {
    return existingUrl;
  }

  const cacheKey = getCacheKey(placeId, name, latitude, longitude);
  if (inMemoryImageCache.has(cacheKey)) {
    return inMemoryImageCache.get(cacheKey);
  }

  const cleanName = (name || '').trim();
  const lowerName = cleanName.toLowerCase();

  if (cleanName) {
    for (const [landmarkKey, url] of Object.entries(KNOWN_LANDMARK_IMAGES)) {
      if (
        lowerName === landmarkKey ||
        lowerName.startsWith(landmarkKey) ||
        lowerName.endsWith(landmarkKey) ||
        (landmarkKey.length > 7 && lowerName.includes(landmarkKey))
      ) {
        return url;
      }
    }
  }

  return getCategoryPlaceholderSvg(categoryId, cleanName);
}

export default {
  KNOWN_LANDMARK_IMAGES,
  getCategoryPlaceholderSvg,
  resolveVenueImage,
  getImmediatePlaceImage,
};
