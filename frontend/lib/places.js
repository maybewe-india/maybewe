// ============================================================================
// MaybeWe — Place Discovery Plus Service
// Phase A: Curation, Categorization, Recommendation & Budget Filtering
// ============================================================================

import AsyncStorage from './safeStorage.js';
import { PLACES_DATA, PLACE_CATEGORIES } from '../data/placesData.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const SAVED_PLACES_STORAGE_KEY = '@maybewe_saved_places';
const RECENT_PLACES_STORAGE_KEY = '@maybewe_recent_places';

export { PLACE_CATEGORIES };
export function getAllPlaces() {
  return PLACES_DATA;
}
export const filterPlaces = getPlaces;

/**
 * Fetch places with robust filtering and offline fallback.
 * Queries Supabase `public.places` if connected; falls back to `PLACES_DATA`.
 */
export async function getPlaces(options = {}) {
  const {
    destination = '',
    category = '',
    minBudget = null,
    maxBudget = null,
    filter = 'all', // 'all' | 'trending' | 'hidden_gems' | 'popular' | 'saved'
    searchQuery = '',
    limit = 50,
  } = options;

  let results = [...PLACES_DATA];

  // Try live Supabase query first if configured
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('places').select('*');
      if (destination && destination !== 'All') {
        query = query.ilike('destination', `%${destination}%`);
      }
      if (minBudget !== null && minBudget !== undefined) {
        query = query.gte('min_price', minBudget);
      }
      if (maxBudget !== null && maxBudget !== undefined) {
        query = query.lte('max_price', maxBudget);
      }
      const { data, error } = await query.limit(limit);
      if (!error && data && data.length > 0) {
        results = data;
      }
    } catch {
      // Fallback silently to curated local dataset
    }
  }

  // 1. Destination filter
  if (destination && destination !== 'All' && destination.trim() !== '') {
    const destNorm = destination.toLowerCase().trim();
    results = results.filter((p) => {
      const pDest = (p.destination || '').toLowerCase();
      const pState = (p.state || '').toLowerCase();
      return pDest.includes(destNorm) || destNorm.includes(pDest) || pState.includes(destNorm);
    });
  }

  // 2. Category filter
  if (category && category !== 'All' && category.trim() !== '') {
    const catNorm = category.toLowerCase().trim();
    results = results.filter((p) => {
      const mainCat = (p.category || '').toLowerCase();
      const catIds = (p.categoryIds || []).map((c) => c.toLowerCase());
      return mainCat === catNorm || catIds.includes(catNorm);
    });
  }

  // 3. Budget filters (INR)
  if (minBudget !== null && minBudget !== undefined && !isNaN(minBudget)) {
    results = results.filter((p) => p.max_price >= Number(minBudget));
  }
  if (maxBudget !== null && maxBudget !== undefined && !isNaN(maxBudget)) {
    results = results.filter((p) => p.min_price <= Number(maxBudget));
  }

  // 4. Feature section filter
  if (filter === 'trending') {
    results = results.filter((p) => p.is_trending);
  } else if (filter === 'hidden_gems') {
    results = results.filter((p) => p.is_hidden_gem);
  } else if (filter === 'popular') {
    results = results.filter((p) => p.is_popular);
  }

  // 5. Search query filter
  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.highlights || []).some((h) => h.toLowerCase().includes(q))
    );
  }

  return results.slice(0, limit);
}

/**
 * Get Trending Places across India or for a destination
 */
export async function getTrendingPlaces(destination = '') {
  return getPlaces({ destination, filter: 'trending', limit: 10 });
}

/**
 * Get Hidden Gems
 */
export async function getHiddenGems(destination = '') {
  return getPlaces({ destination, filter: 'hidden_gems', limit: 10 });
}

/**
 * Get Recommended Places using explainable signals:
 * - Matches destination
 * - Fits within traveler's budget limit
 * - Aligns with traveler's travel styles/interests
 */
export async function getRecommendedPlaces({ destination = '', budget = null, userStyles = [] } = {}) {
  const allInDest = await getPlaces({ destination, maxBudget: budget, limit: 20 });
  if (allInDest.length === 0) {
    return getPlaces({ limit: 10 });
  }

  // Rank by rating and style overlap
  return allInDest
    .map((place) => {
      let score = (place.rating || 4.5) * 10;
      if (place.is_verified) score += 5;
      if (place.is_trending) score += 4;
      const catMatch = userStyles.some((style) =>
        (place.category || '').toLowerCase().includes(style.toLowerCase()) ||
        (place.categoryIds || []).some((cid) => cid.includes(style.toLowerCase()))
      );
      if (catMatch) score += 15;
      return { ...place, matchScore: Math.min(score, 99) };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);
}

/**
 * Get places under a specific budget ceiling
 */
export async function getPlacesUnderBudget(maxBudget, destination = '', category = '') {
  return getPlaces({ destination, category, maxBudget, limit: 12 });
}

/**
 * Get place by ID
 */
export function getPlaceById(placeId) {
  return PLACES_DATA.find((p) => p.id === placeId) || null;
}

// ============================================================================
// SAVED / BOOKMARKED PLACES (AsyncStorage + Supabase support)
// ============================================================================

export async function getSavedPlaceIds() {
  try {
    const raw = await AsyncStorage.getItem(SAVED_PLACES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function isPlaceSaved(placeId) {
  const savedIds = await getSavedPlaceIds();
  return savedIds.includes(placeId);
}

export async function toggleSavePlace(placeId) {
  try {
    const savedIds = await getSavedPlaceIds();
    let updated;
    let isSavedNow;
    if (savedIds.includes(placeId)) {
      updated = savedIds.filter((id) => id !== placeId);
      isSavedNow = false;
    } else {
      updated = [placeId, ...savedIds];
      isSavedNow = true;
    }
    await AsyncStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
    return isSavedNow;
  } catch {
    return false;
  }
}

export const togglePlaceSaved = toggleSavePlace;

export async function getSavedPlaces() {
  const ids = await getSavedPlaceIds();
  return PLACES_DATA.filter((p) => ids.includes(p.id));
}

// ============================================================================
// RECENTLY VIEWED PLACES
// ============================================================================

export async function recordPlaceView(placeId) {
  try {
    const raw = await AsyncStorage.getItem(RECENT_PLACES_STORAGE_KEY);
    let ids = raw ? JSON.parse(raw) : [];
    ids = [placeId, ...ids.filter((id) => id !== placeId)].slice(0, 15);
    await AsyncStorage.setItem(RECENT_PLACES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Silent
  }
}

export async function getRecentlyViewedPlaces() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_PLACES_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return PLACES_DATA.filter((p) => ids.includes(p.id));
  } catch {
    return [];
  }
}
