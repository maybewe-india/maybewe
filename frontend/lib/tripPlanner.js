// ============================================================================
// MaybeWe — Trip Planner Plus Intelligence Engine
// Phase A: Scheduling Conflict Detection, Empty-Day Auto-Suggestions,
// Packing Checklist, Itinerary Storage & Sharing
// ============================================================================

import AsyncStorage from './safeStorage.js';
import { PLACES_DATA } from '../data/placesData.js';

const ITINERARY_STORAGE_PREFIX = '@maybewe_trip_itinerary_';
const PACKING_STORAGE_PREFIX = '@maybewe_trip_packing_';
const NOTES_STORAGE_PREFIX = '@maybewe_trip_notes_';

export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', icon: 'sunny-outline', timeRange: '08:00 AM – 12:00 PM' },
  { id: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline', timeRange: '12:00 PM – 05:00 PM' },
  { id: 'evening', label: 'Evening', icon: 'sunset-outline', timeRange: '05:00 PM – 09:00 PM' },
  { id: 'night', label: 'Night', icon: 'moon-outline', timeRange: '09:00 PM onwards' },
];

/**
 * Generate default seed itinerary days for a trip duration
 */
export function generateDefaultItinerary(trip) {
  const daysCount = calculateTripDaysCount(trip?.date_from, trip?.date_to);
  const days = [];

  for (let i = 1; i <= daysCount; i++) {
    days.push({
      day_number: i,
      title: i === 1 ? 'Arrival & First Impressions' : i === daysCount ? 'Farewells & Golden Hour' : `Exploring ${trip?.destination || 'Destination'}`,
      notes: '',
      activities: [],
    });
  }

  // Pre-seed 1-2 curated activities for Day 1 and Day 2 if destination matches
  const matchingPlaces = PLACES_DATA.filter((p) =>
    (trip?.destination || '').toLowerCase().includes((p.destination || '').toLowerCase())
  );

  if (matchingPlaces.length > 0 && days.length > 0) {
    days[0].activities.push({
      id: `act-seed-${Date.now()}-1`,
      title: matchingPlaces[0].name,
      description: matchingPlaces[0].description,
      place_id: matchingPlaces[0].id,
      time_slot: 'afternoon',
      start_time: '14:30',
      end_time: '16:30',
      estimated_cost: matchingPlaces[0].min_price || 350,
      currency: 'INR',
      order_index: 0,
    });
  }

  if (matchingPlaces.length > 1 && days.length > 1) {
    days[1].activities.push({
      id: `act-seed-${Date.now()}-2`,
      title: matchingPlaces[1].name,
      description: matchingPlaces[1].description,
      place_id: matchingPlaces[1].id,
      time_slot: 'morning',
      start_time: '09:30',
      end_time: '12:00',
      estimated_cost: matchingPlaces[1].min_price || 500,
      currency: 'INR',
      order_index: 0,
    });
  }

  return days;
}

/**
 * Calculate total days count between two YYYY-MM-DD dates
 */
export function calculateTripDaysCount(from, to) {
  if (!from || !to) return 3;
  try {
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(30, diff + 1));
  } catch {
    return 3;
  }
}

/**
 * Load trip itinerary from local storage
 */
export async function loadTripItinerary(trip) {
  if (!trip?.id) return [];
  try {
    const raw = await AsyncStorage.getItem(ITINERARY_STORAGE_PREFIX + trip.id);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fall back to generated default
  }
  const defaultItinerary = generateDefaultItinerary(trip);
  await saveTripItinerary(trip.id, defaultItinerary);
  return defaultItinerary;
}

/**
 * Save trip itinerary to storage
 */
export async function saveTripItinerary(tripId, days) {
  if (!tripId || !Array.isArray(days)) return;
  try {
    await AsyncStorage.setItem(ITINERARY_STORAGE_PREFIX + tripId, JSON.stringify(days));
  } catch {
    // Silent
  }
}

/**
 * Add an activity to a specific trip itinerary day
 */
export async function addActivityToTrip(tripId, activityData, dayNumber = 1) {
  const itinerary = await loadTripItinerary({ id: tripId });
  const targetDay = itinerary.find((d) => d.day_number === dayNumber) || itinerary[0];
  const newActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: activityData.title || 'Activity',
    description: activityData.notes || activityData.description || '',
    place_id: activityData.place_id || null,
    time_slot: activityData.time_slot || 'afternoon',
    start_time: activityData.start_time || '15:00',
    end_time: activityData.end_time || '17:00',
    estimated_cost: activityData.estimated_cost || 500,
    currency: 'INR',
    order_index: targetDay ? targetDay.activities.length : 0,
  };

  if (targetDay) {
    targetDay.activities.push(newActivity);
  }
  await saveTripItinerary(tripId, itinerary);
  return { success: true, activity: newActivity, itinerary };
}

/**
 * Fetch trips for the active user
 */
export async function getUserTrips() {
  return [
    {
      id: 'trip-demo-goa',
      title: 'Goa Coastal Exploration',
      destination: 'Goa',
      start_date: '2026-10-15',
      end_date: '2026-10-20',
      budget_category: 'balanced',
      companion_mode: 'active',
      days: [{}, {}, {}, {}],
    },
    {
      id: 'trip-demo-hampi',
      title: 'Hampi Heritage Wandering',
      destination: 'Hampi',
      start_date: '2026-11-04',
      end_date: '2026-11-08',
      budget_category: 'luxury',
      companion_mode: 'quiet',
      days: [{}, {}, {}, {}],
    },
  ];
}

/**
 * Fetch single trip by ID
 */
export async function getTripById(tripId) {
  const trips = await getUserTrips();
  return trips.find((t) => t.id === tripId) || null;
}

/**
 * PLANNING INTELLIGENCE:
 * 1. Detect overlapping activities
 * 2. Detect impossible or suspicious scheduling (end <= start)
 * 3. Warn about excessive activities in one day (> 5)
 */
export function analyzeDaySchedule(activities = []) {
  const issues = [];
  const overlaps = [];

  // Check count
  if (activities.length > 5) {
    issues.push({
      id: 'issue-excessive',
      type: 'warning',
      title: 'Dense Schedule',
      message: `${activities.length} activities scheduled today. We recommend pacing yourself with at least 1 free-time block.`,
    });
  }

  // Sort by start_time if available
  const timed = activities.filter((a) => a.start_time && a.end_time);

  for (let i = 0; i < timed.length; i++) {
    const a1 = timed[i];
    const [h1Start, m1Start] = (a1.start_time || '00:00').split(':').map(Number);
    const [h1End, m1End] = (a1.end_time || '00:00').split(':').map(Number);
    const startMins1 = h1Start * 60 + m1Start;
    const endMins1 = h1End * 60 + m1End;

    // Impossible timing: end before start
    if (endMins1 <= startMins1) {
      issues.push({
        id: `issue-timing-${a1.id}`,
        type: 'danger',
        activityId: a1.id,
        title: 'Suspicious Duration',
        message: `"${a1.title}" has an end time before or equal to start time (${a1.start_time} - ${a1.end_time}).`,
      });
    }

    // Overlap comparison against subsequent activities
    for (let j = i + 1; j < timed.length; j++) {
      const a2 = timed[j];
      const [h2Start, m2Start] = (a2.start_time || '00:00').split(':').map(Number);
      const [h2End, m2End] = (a2.end_time || '00:00').split(':').map(Number);
      const startMins2 = h2Start * 60 + m2Start;
      const endMins2 = h2End * 60 + m2End;

      // Overlap condition: start1 < end2 AND start2 < end1
      if (startMins1 < endMins2 && startMins2 < endMins1) {
        overlaps.push({ a1Id: a1.id, a2Id: a2.id });
        issues.push({
          id: `issue-overlap-${a1.id}-${a2.id}`,
          type: 'danger',
          title: 'Schedule Conflict',
          message: `Overlap detected between "${a1.title}" (${a1.start_time}) and "${a2.title}" (${a2.start_time}).`,
        });
      }
    }
  }

  return {
    hasIssues: issues.length > 0,
    issues,
    overlaps,
  };
}

/**
 * PLANNING INTELLIGENCE:
 * Suggest empty-day or light-day activities based on trip destination and style
 */
export function suggestEmptyDayPlaces(destination, existingActivityPlaceIds = []) {
  const destNorm = (destination || '').toLowerCase();
  const pool = PLACES_DATA.filter((p) => {
    const pDest = (p.destination || '').toLowerCase();
    const isMatching = pDest.includes(destNorm) || destNorm.includes(pDest);
    const notScheduled = !existingActivityPlaceIds.includes(p.id);
    return isMatching && notScheduled;
  });

  return pool.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
}

/**
 * Detect free-time blocks in a day's schedule
 */
export function detectFreeTimeBlocks(activities = []) {
  const activeSlots = new Set((activities || []).map((a) => a.time_slot || 'morning'));
  return TIME_SLOTS.filter((slot) => !activeSlots.has(slot.id));
}

// ============================================================================
// PACKING CHECKLIST MANAGEMENT
// ============================================================================

export function getDefaultPackingList(destination = '') {
  const destLower = destination.toLowerCase();
  const isMountain = destLower.includes('manali') || destLower.includes('kashmir') || destLower.includes('ladakh') || destLower.includes('shimla');
  const isBeach = destLower.includes('goa') || destLower.includes('andaman') || destLower.includes('kerala') || destLower.includes('beach');

  const base = [
    { id: 'pack-1', text: 'Passport / Aadhaar & Govt Photo ID', checked: true },
    { id: 'pack-2', text: 'Flight / Train E-tickets & Boarding Passes', checked: true },
    { id: 'pack-3', text: 'Phone fast-charger & 20,000mAh Powerbank', checked: false },
    { id: 'pack-4', text: 'Emergency cash in INR notes', checked: false },
    { id: 'pack-5', text: 'Basic personal medical kit & electrolyte sachets', checked: false },
  ];

  if (isMountain) {
    base.push(
      { id: 'pack-m1', text: 'Thermal base layers & fleece pullover', checked: false },
      { id: 'pack-m2', text: 'Waterproof trekking boots with grip', checked: false },
      { id: 'pack-m3', text: 'UV polarized sunglasses & lip butter', checked: false }
    );
  } else if (isBeach) {
    base.push(
      { id: 'pack-b1', text: 'Reef-safe SPF 50+ mineral sunscreen', checked: false },
      { id: 'pack-b2', text: 'Breathable linen shirts & quick-dry shorts', checked: false },
      { id: 'pack-b3', text: 'Waterproof phone pouch for beach walks', checked: false }
    );
  } else {
    base.push(
      { id: 'pack-c1', text: 'Modest lightweight cottons for heritage temples', checked: false },
      { id: 'pack-c2', text: 'Comfortable slip-on walking footwear', checked: false }
    );
  }

  return base;
}

export async function loadPackingList(trip) {
  if (!trip?.id) return [];
  try {
    const raw = await AsyncStorage.getItem(PACKING_STORAGE_PREFIX + trip.id);
    if (raw) return JSON.parse(raw);
  } catch {}
  const list = getDefaultPackingList(trip.destination);
  await savePackingList(trip.id, list);
  return list;
}

export async function savePackingList(tripId, items) {
  try {
    await AsyncStorage.setItem(PACKING_STORAGE_PREFIX + tripId, JSON.stringify(items));
  } catch {}
}

// ============================================================================
// TRIP NOTES MANAGEMENT
// ============================================================================

export async function loadTripNotes(tripId) {
  try {
    const notes = await AsyncStorage.getItem(NOTES_STORAGE_PREFIX + tripId);
    return notes || '';
  } catch {
    return '';
  }
}

export async function saveTripNotes(tripId, notes) {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_PREFIX + tripId, notes);
  } catch {}
}

// ============================================================================
// ITINERARY SHARING FORMATTER
// ============================================================================

export function formatItineraryForSharing(trip, day) {
  if (!trip) return '';
  const lines = [
    `✨ MAYBEWE ITINERARY: ${trip.destination?.toUpperCase()}`,
    `📅 ${trip.date_from} – ${trip.date_to}`,
  ];

  if (day) {
    lines.push(`\n📌 DAY ${day.day_number}: ${day.title}`);
    if (day.activities?.length > 0) {
      day.activities.forEach((act) => {
        lines.push(`• [${(act.time_slot || 'Plan').toUpperCase()}] ${act.title} (${act.start_time || ''} - ${act.end_time || ''}) ~ ₹${act.estimated_cost}`);
      });
    } else {
      lines.push('• Leisure day / Open exploration');
    }
  }

  lines.push('\nSent via MaybeWe — Curated Solo Traveler Companion');
  return lines.join('\n');
}

// ============================================================================
// SAVED / BOOKMARKED TRIPS (Section 13)
// ============================================================================
const SAVED_TRIPS_STORAGE_KEY = '@maybewe_saved_trips_v1';

export async function getSavedTripIds(userId = 'user-demo-priya') {
  try {
    const raw = await AsyncStorage.getItem(`${SAVED_TRIPS_STORAGE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function isTripSaved(tripId, userId = 'user-demo-priya') {
  if (!tripId) return false;
  const saved = await getSavedTripIds(userId);
  return saved.includes(tripId);
}

export async function toggleTripSave(tripId, userId = 'user-demo-priya') {
  if (!tripId) return { saved: false };
  const current = await getSavedTripIds(userId);
  let updated;
  let isSavedNow;

  if (current.includes(tripId)) {
    updated = current.filter((id) => id !== tripId);
    isSavedNow = false;
  } else {
    updated = [tripId, ...current];
    isSavedNow = true;
  }

  try {
    await AsyncStorage.setItem(`${SAVED_TRIPS_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error persisting saved trips:', e);
  }

  return { saved: isSavedNow };
}

export async function getSavedTrips(userId = 'user-demo-priya') {
  const savedIds = await getSavedTripIds(userId);
  const allTrips = await getUserTrips();
  return allTrips.filter((t) => savedIds.includes(t.id));
}

