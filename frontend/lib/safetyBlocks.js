// ============================================================================
// MAYBEWE SAFETY BLOCKS & TRUST FOUNDATION SERVICE (lib/safetyBlocks.js)
// Zero TypeScript, Pure JavaScript/JSX
// Enforces user blocking, safety reporting, and authentic trust events
// ============================================================================

import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const BLOCKS_STORAGE_KEY = '@maybewe_user_blocks_v1';
const TRUST_EVENTS_STORAGE_KEY = '@maybewe_trust_events_v1';
const REPORTS_STORAGE_KEY = '@maybewe_safety_reports_v1';

// Helper: load stored blocks
async function getStoredBlocks() {
  try {
    const raw = await AsyncStorage.getItem(BLOCKS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {}
  return [];
}

// Helper: save stored blocks
async function saveStoredBlocks(blocks) {
  try {
    await AsyncStorage.setItem(BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
  } catch (err) {}
}

/**
 * 1. Block a user
 * Mutual safety barrier: stops live location and prevents future interactions
 */
export async function blockUser(blockerId, blockedId) {
  if (!blockerId || !blockedId) throw new Error('Both user IDs required for block');
  if (blockerId === blockedId) throw new Error('Cannot block yourself');

  const blocks = await getStoredBlocks();
  const existing = blocks.find(
    (b) => b.blocker_user_id === blockerId && b.blocked_user_id === blockedId
  );

  if (existing) {
    return { success: true, alreadyBlocked: true };
  }

  const newBlock = {
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    blocker_user_id: blockerId,
    blocked_user_id: blockedId,
    created_at: new Date().toISOString(),
  };

  blocks.push(newBlock);
  await saveStoredBlocks(blocks);

  if (isSupabaseConfigured && blockerId) {
    try {
      await supabase.from('user_blocks').insert([
        { blocker_user_id: blockerId, blocked_user_id: blockedId }
      ]);
    } catch (err) {
      console.warn('Supabase blockUser fallback:', err);
    }
  }

  return { success: true, alreadyBlocked: false, block: newBlock };
}

/**
 * 2. Unblock a user
 */
export async function unblockUser(blockerId, blockedId) {
  const blocks = await getStoredBlocks();
  const filtered = blocks.filter(
    (b) => !(b.blocker_user_id === blockerId && b.blocked_user_id === blockedId)
  );

  await saveStoredBlocks(filtered);

  if (isSupabaseConfigured && blockerId) {
    try {
      await supabase.from('user_blocks').delete()
        .eq('blocker_user_id', blockerId)
        .eq('blocked_user_id', blockedId);
    } catch (err) {}
  }

  return { success: true };
}

/**
 * 3. Check if two users have an active block between them
 * Either user blocking the other creates a mutual safety barrier
 */
export async function isUserBlocked(userAId, userBId) {
  if (!userAId || !userBId) return false;

  const blocks = await getStoredBlocks();
  return blocks.some(
    (b) =>
      (b.blocker_user_id === userAId && b.blocked_user_id === userBId) ||
      (b.blocker_user_id === userBId && b.blocked_user_id === userAId)
  );
}

/**
 * 4. Get list of blocked user IDs for a user
 */
export async function getUserBlockedIds(userId) {
  const blocks = await getStoredBlocks();
  return blocks
    .filter((b) => b.blocker_user_id === userId)
    .map((b) => b.blocked_user_id);
}

/**
 * Get full list of blocked user entries for a user
 */
export async function getBlockedUsers(userId) {
  const blocks = await getStoredBlocks();
  return blocks.filter((b) => b.blocker_user_id === userId);
}

/**
 * 5. Submit safety report
 * Supports user, message, or hangout reporting with complete reporter privacy
 */
export async function submitSafetyReport({
  reporterId,
  reportedId = null,
  targetType = 'user',
  targetId = null,
  reason,
  messageId = null,
  hangoutId = null,
  details = '',
}) {
  if (!reporterId) throw new Error('Reporter ID is required');
  if (reporterId === reportedId) throw new Error('Cannot report yourself');
  if (!reason || !reason.trim()) throw new Error('Report reason is required');

  const resolvedTargetType = targetType || (messageId ? 'message' : hangoutId ? 'hangout' : 'user');
  const resolvedTargetId = String(targetId || messageId || hangoutId || reportedId || 'unknown');

  const validTargetTypes = ['user', 'post', 'comment', 'story', 'hangout', 'message'];
  if (!validTargetTypes.includes(resolvedTargetType)) {
    throw new Error(`Invalid target_type: ${resolvedTargetType}`);
  }

  const validReasons = ['harassment', 'spam', 'inappropriate_content', 'safety_concern', 'scam', 'other'];
  const normalizedReason = validReasons.includes(reason.trim()) ? reason.trim() : 'other';

  const report = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    reporter_id: reporterId,
    reported_id: reportedId || null,
    target_type: resolvedTargetType,
    target_id: resolvedTargetId,
    reason: normalizedReason,
    details: (details || '').trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  // Local storage
  try {
    const raw = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    const reports = raw ? JSON.parse(raw) : [];
    reports.push(report);
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {}

  if (isSupabaseConfigured && reporterId) {
    try {
      const { data, error } = await supabase.from('reports').insert([
        {
          reporter_id: reporterId,
          reported_id: reportedId || null,
          target_type: resolvedTargetType,
          target_id: resolvedTargetId,
          reason: normalizedReason,
          details: report.details,
          status: 'pending',
        }
      ]).select();
      if (error) {
        console.warn('Supabase submitSafetyReport error:', error.message);
        throw error;
      }
      if (data && data[0]) {
        return { success: true, report_id: data[0].id };
      }
    } catch (err) {
      console.warn('Supabase submitSafetyReport fallback:', err);
      throw err;
    }
  }

  return { success: true, report_id: report.id };
}

/**
 * 6. Record authentic trust event milestone
 * Verification completion, verified review received, safety resolution, etc.
 */
export async function recordTrustEvent({
  userId,
  actorId = null,
  eventType,
  entityId = null,
  metadata = {},
}) {
  const allowedEvents = [
    'verification_completed',
    'review_received',
    'report_resolved',
    'successful_hangout',
    'successful_connection',
  ];

  if (!allowedEvents.includes(eventType)) {
    throw new Error(`Invalid trust event type: ${eventType}`);
  }

  const event = {
    id: `trust-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    user_id: userId,
    actor_id: actorId,
    event_type: eventType,
    entity_id: entityId,
    metadata,
    created_at: new Date().toISOString(),
  };

  try {
    const raw = await AsyncStorage.getItem(TRUST_EVENTS_STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];
    events.unshift(event);
    await AsyncStorage.setItem(TRUST_EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {}

  if (isSupabaseConfigured) {
    try {
      await supabase.from('user_trust_events').insert([
        {
          user_id: userId,
          actor_id: actorId,
          event_type: eventType,
          entity_id: entityId,
          metadata,
        }
      ]);
    } catch (err) {}
  }

  return event;
}

/**
 * 7. Fetch trust events for a user
 */
export async function getUserTrustEvents(userId) {
  try {
    const raw = await AsyncStorage.getItem(TRUST_EVENTS_STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];
    return events.filter((e) => e.user_id === userId);
  } catch (err) {
    return [];
  }
}
