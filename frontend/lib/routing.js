// ============================================================================
// MAYBEWE ROUTING ENGINE & PROVIDER ABSTRACTION (frontend/lib/routing.js)
// Zero Mapbox / Zero Google Keys
// Strict Production Separation: REAL ROAD ROUTE vs ORIENTATION ESTIMATE
// Never presents geometric approximations as real road navigation
// ============================================================================

export const ROUTE_TYPES = {
  REAL_ROAD: 'real_road',
  ORIENTATION_ESTIMATE: 'orientation_estimate',
  UNAVAILABLE: 'unavailable',
};

// Maximum distance for road routing requests (500 km safety guard)
const MAX_ROUTE_DISTANCE_METERS = 500000;

/**
 * Calculate Great-Circle distance in meters using Haversine formula
 */
export function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
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

/**
 * Format meters into clean distance string
 */
export function formatDistance(meters) {
  if (!meters || meters < 50) return '< 50 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Format minutes into clean duration string
 */
export function formatDuration(minutes) {
  if (!minutes || minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = Math.round(minutes % 60);
  return remMin > 0 ? `${hours} hr ${remMin} min` : `${hours} hr`;
}

/**
 * Generate a clear 2-point straight-line orientation GeoJSON.
 * Explicitly marked with isEstimate: true for dashed rendering.
 * Never presented as a street road route.
 */
export function generateOrientationGeometry(start, end) {
  return {
    type: 'Feature',
    properties: {
      isEstimate: true,
      provider: 'maybewe-orientation',
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [Number(start.longitude.toFixed(6)), Number(start.latitude.toFixed(6))],
        [Number(end.longitude.toFixed(6)), Number(end.latitude.toFixed(6))],
      ],
    },
  };
}

/**
 * Primary routing function for MaybeWe.
 *
 * 1. Checks if a private/self-hosted OSRM/Valhalla routing backend is configured
 *    via EXPO_PUBLIC_ROUTING_API_URL.
 * 2. If configured and responsive: returns genuine road-network route (REAL_ROAD)
 *    with real road distance, real driving/walking duration, and turn-by-turn geometry.
 * 3. If NOT configured or unreachable: returns an ORIENTATION_ESTIMATE with straight-line
 *    geometry, labeled explicitly as an estimate, prompting the traveler to open native
 *    turn-by-turn navigation for real road directions.
 */
export async function calculateRoute({
  startCoords,
  endCoords,
  mode = 'walking', // 'walking' | 'driving'
}) {
  if (!startCoords || !endCoords) {
    return null;
  }

  // WGS84 Coordinate validation
  const { latitude: lat1, longitude: lon1 } = startCoords;
  const { latitude: lat2, longitude: lon2 } = endCoords;

  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    lat1 < -90 || lat1 > 90 || lon1 < -180 || lon1 > 180 ||
    lat2 < -90 || lat2 > 90 || lon2 < -180 || lon2 > 180
  ) {
    return {
      type: ROUTE_TYPES.UNAVAILABLE,
      isRealRoadRoute: false,
      error: 'Invalid coordinates',
      geojson: null,
    };
  }

  const straightMeters = calculateHaversineMeters(lat1, lon1, lat2, lon2);

  // Safety cap: routes over 500km are out of local navigation scope
  if (straightMeters > MAX_ROUTE_DISTANCE_METERS) {
    return {
      type: ROUTE_TYPES.UNAVAILABLE,
      isRealRoadRoute: false,
      error: 'Destination exceeds maximum route distance (500 km).',
      geojson: null,
    };
  }

  // 1. Attempt Genuine Road Network Routing via Configured Private Backend
  const privateRoutingUrl =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_ROUTING_API_URL : null;

  if (privateRoutingUrl && typeof privateRoutingUrl === 'string' && privateRoutingUrl.trim() !== '') {
    try {
      const cleanUrl = privateRoutingUrl.trim().replace(/\/+$/, '');
      const endpoint = `${cleanUrl}/route/v1/${mode}/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
      
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        const primaryRoute = data?.routes?.[0];
        if (primaryRoute && primaryRoute.geometry?.coordinates?.length > 1) {
          return {
            type: ROUTE_TYPES.REAL_ROAD,
            isRealRoadRoute: true,
            distanceMeters: Math.round(primaryRoute.distance),
            distanceText: formatDistance(primaryRoute.distance),
            durationMinutes: Math.round(primaryRoute.duration / 60),
            durationText: formatDuration(primaryRoute.duration / 60),
            geojson: {
              type: 'Feature',
              properties: {
                isEstimate: false,
                mode,
                provider: 'osrm-private-road',
              },
              geometry: primaryRoute.geometry,
            },
            message: 'Real road network route',
          };
        }
      }
    } catch (err) {
      console.warn('Private routing endpoint unavailable, falling back to orientation estimate:', err);
    }
  }

  // 2. Safe Transparent Fallback: Orientation Estimate
  // Never claims to be a road route. Uses a straight-line dashed orientation vector.
  const geojson = generateOrientationGeometry(startCoords, endCoords);

  return {
    type: ROUTE_TYPES.ORIENTATION_ESTIMATE,
    isRealRoadRoute: false,
    distanceMeters: straightMeters,
    distanceText: formatDistance(straightMeters),
    durationMinutes: null,
    durationText: null,
    geojson,
    message: 'Direct line orientation only. Tap Navigate for turn-by-turn road routing.',
  };
}

export default {
  ROUTE_TYPES,
  calculateHaversineMeters,
  formatDistance,
  formatDuration,
  calculateRoute,
  generateOrientationGeometry,
};
