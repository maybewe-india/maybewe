import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const REVIEWS_STORAGE_PREFIX = '@solo_traveler_reviews_';

/**
 * Loads reviews for a traveler
 */
export async function getReviews(userId) {
  if (!userId) return [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:users!reviewer_id(id, name, avatar_url)
        `)
        .eq('reviewed_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const formatted = data.map(r => ({
          id: r.id,
          reviewer_name: r.reviewer?.name || 'Fellow Traveler',
          reviewer_avatar: r.reviewer?.avatar_url,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        }));
        const key = `${REVIEWS_STORAGE_PREFIX}${userId}`;
        AsyncStorage.setItem(key, JSON.stringify(formatted)).catch(() => {});
        return formatted;
      }
    } catch (err) {
      console.warn('Error fetching Supabase reviews:', err);
    }
  }

  // Local storage cached reviews
  try {
    const key = `${REVIEWS_STORAGE_PREFIX}${userId}`;
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}

  // Pure production empty state
  return [];
}

/**
 * Submits a new post-trip review
 */
export async function submitReview({ reviewerId, reviewedId, tripId, rating, comment, reviewerName }) {
  const newReview = {
    id: `rev-${Date.now()}`,
    reviewer_name: reviewerName || 'Verified Traveler',
    rating: Number(rating),
    comment: comment?.trim() || '',
    date: 'Just now',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && reviewerId && reviewedId) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([
          {
            reviewer_id: reviewerId,
            reviewed_id: reviewedId,
            trip_id: tripId || null,
            rating: Number(rating),
            comment: comment?.trim() || '',
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return { success: true, review: data };
      }
    } catch (err) {
      console.warn('Error saving Supabase review:', err);
    }
  }

  // Local storage cache fallback
  try {
    const key = `${REVIEWS_STORAGE_PREFIX}${reviewedId}`;
    const current = await getReviews(reviewedId);
    const updated = [newReview, ...current];
    await AsyncStorage.setItem(key, JSON.stringify(updated));

    // Calculate new community trust score
    const validRatings = updated.filter((r) => r.rating && !isNaN(Number(r.rating)));
    const newTrustScore = validRatings.length > 0
      ? (validRatings.reduce((acc, r) => acc + Number(r.rating), 0) / validRatings.length).toFixed(2)
      : '5.00';

    return {
      success: true,
      review: newReview,
      newTrustScore: Number(newTrustScore),
      totalReviews: updated.length,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  getReviews,
  submitReview,
};
