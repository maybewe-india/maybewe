// ============================================================================
// MaybeWe — Budget Intelligence Engine
// Phase A: Spend Forecasting, Category Breakdowns, Threshold Alerts & Alternatives
// Strict INR currency support for India expeditions
// ============================================================================

import { PLACES_DATA } from '../data/placesData.js';

/**
 * Format currency in Indian Rupee format with ₹ symbol
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹ —';
  }
  const num = Math.round(Number(amount));
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Calculate comprehensive budget health and breakdown for a trip
 * @param {Object} params
 * @param {number} params.tripBudget - Overall user-defined trip budget
 * @param {number} params.travelDays - Duration of the trip in days
 * @param {number} params.travelersCount - Number of travelers (default 1)
 * @param {Array} params.activities - Scheduled activities with costs
 */
export function calculateTripBudget({
  tripBudget = 15000,
  travelDays = 5,
  travelersCount = 1,
  activities = [],
} = {}) {
  const safeDays = Math.max(1, Number(travelDays) || 1);
  const safeTravelers = Math.max(1, Number(travelersCount) || 1);
  const totalBudget = Number(tripBudget) || 0;

  // Compute daily allowance
  const dailyBudget = totalBudget > 0 ? Math.round(totalBudget / safeDays) : 0;
  const perPersonBudget = totalBudget > 0 ? Math.round(totalBudget / safeTravelers) : 0;

  // Breakdown accumulator
  const breakdown = {
    stays: 0,
    food: 0,
    activities: 0,
    transport: 0,
    experiences: 0,
    misc: 0,
  };

  let totalEstimatedSpend = 0;

  (activities || []).forEach((act) => {
    const cost = Number(act.estimated_cost) || 0;
    totalEstimatedSpend += cost;

    const cat = (act.category || act.time_slot || '').toLowerCase();
    const title = (act.title || '').toLowerCase();

    if (cat.includes('stay') || cat.includes('hotel') || title.includes('resort') || title.includes('villa')) {
      breakdown.stays += cost;
    } else if (cat.includes('cafe') || cat.includes('restaurant') || cat.includes('food') || title.includes('breakfast') || title.includes('dinner') || title.includes('lunch')) {
      breakdown.food += cost;
    } else if (cat.includes('adventure') || cat.includes('trek') || cat.includes('tour') || cat.includes('activity')) {
      breakdown.activities += cost;
    } else if (cat.includes('transport') || title.includes('cab') || title.includes('ferry') || title.includes('train')) {
      breakdown.transport += cost;
    } else if (cat.includes('experience') || cat.includes('culture') || cat.includes('aarti') || cat.includes('shikara')) {
      breakdown.experiences += cost;
    } else {
      breakdown.misc += cost;
    }
  });

  const remainingBudget = totalBudget - totalEstimatedSpend;
  const burnPercentage = totalBudget > 0 ? Math.min(100, Math.round((totalEstimatedSpend / totalBudget) * 100)) : 0;
  const dailyAverageSpend = Math.round(totalEstimatedSpend / safeDays);

  // Status computation: 'healthy' | 'caution' | 'over_budget'
  let status = 'healthy';
  const warnings = [];

  if (totalBudget > 0) {
    if (totalEstimatedSpend > totalBudget) {
      status = 'over_budget';
      warnings.push({
        id: 'warn-exceeded',
        type: 'danger',
        title: 'Budget Exceeded',
        message: `Your planned activities exceed your budget by ${formatINR(totalEstimatedSpend - totalBudget)}. Consider exploring budget-friendly alternatives.`,
      });
    } else if (burnPercentage >= 85) {
      status = 'caution';
      warnings.push({
        id: 'warn-near-limit',
        type: 'warning',
        title: 'Approaching Budget Limit',
        message: `You have allocated ${burnPercentage}% of your total budget. Only ${formatINR(remainingBudget)} remains unreserved.`,
      });
    }
  }

  // Check for high-cost single days
  const daySpendMap = {};
  (activities || []).forEach((act) => {
    const day = act.day_number || 1;
    daySpendMap[day] = (daySpendMap[day] || 0) + (Number(act.estimated_cost) || 0);
  });

  Object.entries(daySpendMap).forEach(([dayNum, spend]) => {
    if (dailyBudget > 0 && spend > dailyBudget * 1.5) {
      warnings.push({
        id: `warn-day-${dayNum}`,
        type: 'info',
        title: `Heavy Spend on Day ${dayNum}`,
        message: `Day ${dayNum} spend (${formatINR(spend)}) is significantly above your daily average target of ${formatINR(dailyBudget)}.`,
      });
    }
  });

  return {
    totalBudget,
    totalEstimatedSpend,
    dailyBudget,
    dailyAverageSpend,
    perPersonBudget,
    remainingBudget,
    burnPercentage,
    status,
    warnings,
    breakdown,
  };
}

/**
 * Suggest lower-cost or free alternative places in the same destination and category
 */
export function findBudgetAlternatives(place, customPlacesPool = null) {
  if (!place) return [];
  const pool = customPlacesPool || PLACES_DATA;
  const currentCost = Number(place.min_price || place.estimated_cost || 0);
  const destNorm = (place.destination || '').toLowerCase();
  const catNorm = (place.category || '').toLowerCase();

  return pool
    .filter((p) => {
      if (p.id === place.id) return false;
      const pDest = (p.destination || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pCost = Number(p.min_price || 0);

      // Must be same destination, comparable category, and strictly lower cost
      const sameDest = pDest.includes(destNorm) || destNorm.includes(pDest);
      const sameCat = pCat === catNorm || (p.categoryIds || []).includes(catNorm);
      const lowerCost = pCost < currentCost;
      return sameDest && sameCat && lowerCost;
    })
    .sort((a, b) => (a.min_price || 0) - (b.min_price || 0))
    .slice(0, 3);
}

/**
 * Filter places by min and max budget thresholds
 */
export function filterPlacesByBudget(places, minBudget = 0, maxBudget = Infinity) {
  if (!Array.isArray(places)) return [];
  return places.filter((p) => {
    const min = p.min_price !== undefined ? p.min_price : 0;
    const max = p.max_price !== undefined ? p.max_price : min;
    return max >= minBudget && min <= maxBudget;
  });
}
