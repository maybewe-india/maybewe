/**
 * MaybeWe — Safety Reports Service
 * Submits structured moderation reports against users, posts, comments, etc.
 * Table: public.reports (hardened in migration 03)
 * RLS: Authenticated users can INSERT only; SELECT restricted to service_role.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { blockUser } from './discovery';

export const REPORT_REASONS = [
  { id: 'harassment',            label: 'Harassment or offensive behavior',    icon: 'hand-left-outline'    },
  { id: 'fake_profile',          label: 'Fake profile or stolen photos',       icon: 'person-remove-outline' },
  { id: 'spam',                  label: 'Spam, scams or commercial activity',  icon: 'megaphone-outline'    },
  { id: 'safety_concern',        label: 'Safety or physical concern',          icon: 'warning-outline'      },
  { id: 'inappropriate',         label: 'Inappropriate language or photos',    icon: 'alert-circle-outline' },
  { id: 'other',                 label: 'Other community guideline breach',    icon: 'help-circle-outline'  },
];

/**
 * Submit a safety report.
 *
 * @param {Object} params
 * @param {string} params.reporterId - auth.uid() of the reporting user
 * @param {string} [params.reportedId] - UUID of the reported user (nullable for non-user targets)
 * @param {'user'|'post'|'comment'|'story'|'hangout'|'message'} params.targetType
 * @param {string} params.targetId - UUID/string ID of the target entity
 * @param {'harassment'|'fake_profile'|'spam'|'safety_concern'|'inappropriate'|'other'} params.reason
 * @param {string} [params.details] - Optional additional details
 * @param {boolean} [params.shouldBlock] - Whether to also block the reported user
 * @returns {Promise<{ id: string }>}
 */
export async function submitSafetyReport({
  reporterId,
  reportedId = null,
  targetType,
  targetId,
  reason,
  details = null,
  shouldBlock = false,
}) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('reports')
    .insert([{
      reporter_id: reporterId,
      reported_id: reportedId,
      target_type: targetType,
      target_id:   targetId,
      reason,
      details,
      status: 'pending',
    }])
    .select('id')
    .single();

  if (error) throw new Error(`Report submission failed: ${error.message}`);

  // Block user if requested and reportedId is present
  if (shouldBlock && reportedId) {
    try {
      await blockUser(reportedId);
    } catch (blockErr) {
      console.warn('Block after report failed (non-fatal):', blockErr.message);
    }
  }

  return data;
}

export default {
  submitSafetyReport,
  REPORT_REASONS,
};
