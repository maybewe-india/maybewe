// ============================================================================
// MAYBEWE MESSAGES SERVICE (lib/messages.js)
// Production Direct Messaging Service on Supabase
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import {
  fetchGroupMessages,
  sendChatMessage,
  subscribeToChatGroup,
  markConversationRead,
} from './groupChat.js';

/**
 * Loads messages for a given conversation ID
 */
export async function getMessages(conversationId) {
  if (!conversationId) return [];
  return fetchGroupMessages(conversationId);
}

/**
 * Sends a message in a conversation
 */
export async function sendMessage({ conversationId, matchId, senderId, content, mediaUrl = null }) {
  const targetId = conversationId || matchId;
  if (!targetId || !senderId) return null;

  return sendChatMessage({
    groupId: targetId,
    senderId,
    content,
    mediaUrl,
  });
}

/**
 * Subscribes to realtime messages for a conversation
 */
export function subscribeToMessages(conversationId, onNewMessage) {
  if (!conversationId) return () => {};
  return subscribeToChatGroup(conversationId, { onNewMessage });
}

export { markConversationRead };

export default {
  getMessages,
  sendMessage,
  subscribeToMessages,
  markConversationRead,
};
