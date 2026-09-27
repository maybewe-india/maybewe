import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { getUserNotificationPreferences } from './privacySettings.js';

const NOTIFICATIONS_STORAGE_KEY = '@maybewe_app_notifications_v1';

export const NOTIFICATION_CATEGORIES = {
  CHAT_MESSAGE: 'chat_message',
  NEW_MESSAGE: 'new_message',
  CHAT_REPLY: 'chat_reply',
  CHAT_MENTION: 'chat_mention',
  CHAT_INVITE: 'chat_invite',
  MATCH_REQUEST: 'match_request',
  CONNECTION_ACCEPTED: 'connection_accepted',
  HANGOUT_INVITATION: 'hangout_invitation',
  HANGOUT_INVITE: 'hangout_invite',
  HANGOUT_JOIN: 'hangout_join',
  HANGOUT_VOTE: 'hangout_vote',
  HANGOUT_FINALIZED: 'hangout_finalized',
  HANGOUT_SCHEDULE_UPDATE: 'hangout_schedule_update',
  PLACE_SUGGESTION: 'place_suggestion',
  TRIP_COLLABORATION: 'trip_collaboration',
  TRIP_SHARE: 'trip_share',
  POST_INTERACTION: 'post_interaction',
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  REVIEW_TRUST: 'review_trust',
  LIVE_LOCATION: 'live_location',
};

/**
 * Log a notification event
 * Foundation for follow, like, hangout joined, vote, trip, and chat events.
 */
export async function logNotificationEvent({
  userId,
  user_id,
  recipient_id,
  actorId = null,
  actor_id = null,
  type,
  entityId = null,
  entity_id = null,
  title = null,
  message = '',
  data = {},
}) {
  const targetUserId = userId || user_id || recipient_id;
  const targetActorId = actorId || actor_id;
  const targetEntityId = entityId || entity_id;

  if (!targetUserId || !type) return { success: false, error: 'Missing targetUserId or type' };

  // 1. Check user notification preferences before generating non-critical notification
  try {
    const prefs = await getUserNotificationPreferences(targetUserId);
    if (['chat_message', 'new_message', 'chat_reply', 'chat_mention'].includes(type) && !prefs.messages_enabled) {
      return { success: false, filtered: true, reason: 'Messages disabled in preferences' };
    }
    if (['match_request', 'connection_accepted'].includes(type) && !prefs.connections_enabled) {
      return { success: false, filtered: true, reason: 'Connections disabled in preferences' };
    }
    if (['hangout_invitation', 'hangout_invite', 'hangout_join', 'hangout_vote', 'hangout_finalized', 'hangout_schedule_update'].includes(type) && !prefs.hangouts_enabled) {
      return { success: false, filtered: true, reason: 'Hangouts disabled in preferences' };
    }
    if (['trip_collaboration', 'trip_share', 'place_suggestion'].includes(type) && !prefs.trips_enabled) {
      return { success: false, filtered: true, reason: 'Trips disabled in preferences' };
    }
    if (['post_interaction', 'like', 'comment', 'follow'].includes(type) && !prefs.social_enabled) {
      return { success: false, filtered: true, reason: 'Social activity disabled in preferences' };
    }
    if (['review_trust'].includes(type) && !prefs.trust_enabled) {
      return { success: false, filtered: true, reason: 'Trust updates disabled in preferences' };
    }
  } catch (prefErr) {
    console.warn('Preference check warning:', prefErr);
  }

  const defaultTitle = title || `${type ? type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ') : 'Travel'} Update`;

  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    user_id: targetUserId,
    actor_id: targetActorId,
    type,
    entity_id: targetEntityId,
    title: defaultTitle,
    message: message || `New ${type} event received.`,
    data: data || {},
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // Local storage cache update
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const updated = [notification, ...list.slice(0, 99)];
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed saving notification locally:', err);
  }

  // Supabase persist
  if (isSupabaseConfigured && targetActorId) {
    try {
      await supabase.from('app_notifications').insert([
        {
          user_id: targetUserId,
          actor_id: targetActorId,
          type,
          entity_id: targetEntityId,
          title: defaultTitle,
          message: notification.message,
          data: notification.data,
          is_read: false,
        },
      ]);
    } catch (e) {
      console.warn('Failed logging notification in Supabase:', e);
    }
  }

  return { success: true, notification };
}

/**
 * Fetch all notifications for a user
 */
export async function fetchUserNotifications(userId, limit = 50) {
  if (!userId) return [];

  let notifications = [];

  // Try Supabase first if available
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        notifications = data;
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
        return notifications;
      }
    } catch (e) {
      console.warn('Supabase fetchUserNotifications error:', e);
    }
  }

  // Fallback to local storage
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      notifications = list.filter((n) => n.user_id === userId);
    }
  } catch (e) {
    console.warn('Local storage fetchUserNotifications error:', e);
  }

  // If empty, generate friendly concierge starter notifications for demo
  if (notifications.length === 0) {
    notifications = getConciergeStarterNotifications(userId);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  }

  return notifications;
}

/**
 * Fetch unread notifications count
 */
export async function getUnreadNotificationsCount(userId) {
  if (!userId) return 0;

  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return 0;
    const list = JSON.parse(raw);
    return list.filter((n) => n.user_id === userId && !n.is_read).length;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notificationId, userId) {
  if (!notificationId) return { success: false };

  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Error marking notification read locally:', e);
  }

  if (isSupabaseConfigured && userId) {
    try {
      await supabase
        .from('app_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Supabase markNotificationRead error:', e);
    }
  }

  return { success: true };
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsRead(userId) {
  if (!userId) return { success: false };

  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map((n) => (n.user_id === userId ? { ...n, is_read: true } : n));
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Error marking all notifications read locally:', e);
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('app_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    } catch (e) {
      console.warn('Supabase markAllNotificationsRead error:', e);
    }
  }

  return { success: true };
}

/**
 * Clear notifications locally
 */
export async function clearNotifications(userId) {
  if (!userId) return { success: false };

  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter((n) => n.user_id !== userId);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(filtered));
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Scoped Realtime subscription for user notifications
 * Must strictly scope to: user_id = auth.uid()
 */
export function subscribeToUserNotifications(userId, onNotificationReceived) {
  if (!userId || !isSupabaseConfigured) {
    return () => {};
  }

  const channelName = `user_notifications:${userId}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload?.new && onNotificationReceived) {
          onNotificationReceived(payload.new);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload?.new && onNotificationReceived) {
          onNotificationReceived(payload.new);
        }
      }
    )
    .subscribe();

  // Return clean cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ----------------------------------------------------------------------------
// SPECIFIC ACTION NOTIFICATION GENERATORS
// ----------------------------------------------------------------------------

export async function notifyNewMessage({ recipientId, senderId, senderName, conversationId, messageSnippet }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: senderId,
    type: 'new_message',
    entityId: conversationId,
    title: `Message from ${senderName}`,
    message: messageSnippet || 'Sent you a new journey message.',
    data: { conversation_id: conversationId, sender_name: senderName, route: `/chat/${conversationId}` },
  });
}

export async function notifyChatReply({ recipientId, senderId, senderName, conversationId, replyText }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: senderId,
    type: 'chat_reply',
    entityId: conversationId,
    title: `${senderName} replied to your message`,
    message: replyText || 'Replied to you in chat.',
    data: { conversation_id: conversationId, sender_name: senderName, route: `/chat/${conversationId}` },
  });
}

export async function notifyConnectionRequest({ recipientId, senderId, senderName }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: senderId,
    type: 'match_request',
    title: `Connection Request`,
    message: `${senderName} requested to connect for upcoming travels.`,
    data: { sender_id: senderId, sender_name: senderName, route: '/(tabs)/matches' },
  });
}

export async function notifyConnectionAccepted({ recipientId, partnerId, partnerName }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: partnerId,
    type: 'connection_accepted',
    title: `Connection Confirmed`,
    message: `${partnerName} accepted your travel connection! Start planning.`,
    data: { partner_id: partnerId, partner_name: partnerName, route: '/(tabs)/matches' },
  });
}

export async function notifyHangoutInvite({ recipientId, organizerId, organizerName, hangoutId, hangoutTitle, destination }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: organizerId,
    type: 'hangout_invitation',
    entityId: hangoutId,
    title: `Hangout Invitation`,
    message: `${organizerName} invited you to "${hangoutTitle}" in ${destination}.`,
    data: { hangout_id: hangoutId, hangout_title: hangoutTitle, destination, route: `/chat/group-hangout-${hangoutId}` },
  });
}

export async function notifyHangoutVote({ recipientId, voterId, voterName, hangoutId, hangoutTitle, placeName }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: voterId,
    type: 'hangout_vote',
    entityId: hangoutId,
    title: `New Hangout Vote`,
    message: `${voterName} voted for "${placeName}" in ${hangoutTitle}.`,
    data: { hangout_id: hangoutId, hangout_title: hangoutTitle, place_name: placeName, route: `/chat/group-hangout-${hangoutId}` },
  });
}

export async function notifyHangoutFinalized({ recipientId, organizerId, organizerName, hangoutId, hangoutTitle, placeName, meetingTime }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: organizerId,
    type: 'hangout_finalized',
    entityId: hangoutId,
    title: `Hangout Itinerary Finalized!`,
    message: `${organizerName} confirmed plan: ${placeName} at ${meetingTime}.`,
    data: { hangout_id: hangoutId, hangout_title: hangoutTitle, route: `/chat/group-hangout-${hangoutId}` },
  });
}

export async function notifyNewFollower({ recipientId, followerId, followerName }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId: followerId,
    type: 'follow',
    title: `New Follower`,
    message: `${followerName} started following your travel stories.`,
    data: { follower_id: followerId, follower_name: followerName, route: '/(tabs)/profile' },
  });
}

export async function notifyPostInteraction({ recipientId, actorId, actorName, postId, interactionType = 'like' }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId,
    type: 'post_interaction',
    entityId: postId,
    title: interactionType === 'like' ? `${actorName} liked your story` : `${actorName} commented on your story`,
    message: interactionType === 'like' ? 'Loved your photographic journey update.' : 'Added thoughts to your journey.',
    data: { post_id: postId, route: '/(tabs)/profile' },
  });
}

export async function notifyTripCollaboration({ recipientId, actorId, actorName, tripId, tripDestination }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId,
    type: 'trip_collaboration',
    entityId: tripId,
    title: `Trip Collaboration`,
    message: `${actorName} shared an itinerary update for ${tripDestination}.`,
    data: { trip_id: tripId, destination: tripDestination, route: '/(tabs)/trips' },
  });
}

export async function notifyPlaceSuggestion({ recipientId, actorId, actorName, placeId, placeName, destination }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId,
    type: 'place_suggestion',
    entityId: placeId,
    title: `Curated Landmark Shared`,
    message: `${actorName} recommended ${placeName} in ${destination}.`,
    data: { place_id: placeId, place_name: placeName, destination, route: '/(tabs)/discovery' },
  });
}

export async function notifyTrustMilestone({ recipientId, title, message, eventType }) {
  return logNotificationEvent({
    userId: recipientId,
    type: 'review_trust',
    title: title || 'Trust Foundation Update',
    message: message || 'Your community traveler trust score was updated.',
    data: { event_type: eventType, route: '/(tabs)/profile' },
  });
}

export async function notifyLiveLocationEvent({ recipientId, actorId, actorName, sessionId, message }) {
  return logNotificationEvent({
    userId: recipientId,
    actorId,
    type: 'live_location',
    entityId: sessionId,
    title: `Live Travel Presence`,
    message: message || `${actorName} started sharing real-time location.`,
    data: { session_id: sessionId, route: `/chat/${sessionId}` },
  });
}

/**
 * Curated concierge seed notifications for pristine first impression
 */
function getConciergeStarterNotifications(userId) {
  const now = Date.now();
  return [
    {
      id: `seed-1`,
      user_id: userId,
      actor_id: 'user-demo-arjun',
      type: 'hangout_invitation',
      entity_id: 'hangout-1',
      title: 'Sunset Meetup Invitation',
      message: 'Arjun Mehta invited you to "Anjuna Golden Hour & Seafood" in Goa.',
      data: {
        hangout_id: 'hangout-1',
        hangout_title: 'Anjuna Golden Hour & Seafood',
        destination: 'Goa',
        actor_name: 'Arjun Mehta',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      },
      is_read: false,
      created_at: new Date(now - 1000 * 60 * 18).toISOString(), // 18m ago (Today)
    },
    {
      id: `seed-2`,
      user_id: userId,
      actor_id: 'user-demo-maya',
      type: 'place_suggestion',
      entity_id: 'goa-1',
      title: 'Hidden Landmark Recommendation',
      message: 'Maya Patel recommended Chapora Fort Sunset Spot in Goa.',
      data: {
        place_id: 'goa-1',
        place_name: 'Chapora Fort',
        destination: 'Goa',
        actor_name: 'Maya Patel',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
      },
      is_read: false,
      created_at: new Date(now - 1000 * 60 * 60 * 3).toISOString(), // 3h ago (Today)
    },
    {
      id: `seed-3`,
      user_id: userId,
      actor_id: 'user-demo-rohan',
      type: 'match_request',
      title: 'New Connection Request',
      message: 'Rohan Verma wants to coordinate for Rajasthan Desert Heritage.',
      data: {
        sender_id: 'user-demo-rohan',
        actor_name: 'Rohan Verma',
        destination: 'Rajasthan',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      },
      is_read: false,
      created_at: new Date(now - 1000 * 60 * 60 * 22).toISOString(), // 22h ago (Yesterday)
    },
    {
      id: `seed-4`,
      user_id: userId,
      type: 'review_trust',
      title: 'Trust Milestone Achieved',
      message: 'Completed your first verified circle journey in Goa. Trust Score updated to 4.95.',
      data: {
        event_type: 'successful_hangout',
        destination: 'Goa',
      },
      is_read: true,
      created_at: new Date(now - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago (Earlier)
    },
  ];
}
