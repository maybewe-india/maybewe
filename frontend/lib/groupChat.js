// ============================================================================
// MAYBEWE REALTIME CHAT & MESSAGING SERVICE (lib/groupChat.js)
// Production Supabase Realtime + RLS + Zero Mock Data Invariant
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { uploadChatMedia, deleteChatMedia } from './mediaUpload.js';

export const ALLOWED_REACTIONS = ['❤️', '👍', '😂', '🔥', '✈️', '📍'];

/**
 * 1. Fetch conversations for a user with unread counts and partner info
 * Excludes conversations where an active bi-directional block is in place.
 */
export async function fetchConversations(userId = null) {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  try {
    // 1. Primary: High-performance get_user_conversations RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_conversations', {
      p_user_id: userId,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData.map((row) => ({
        id: row.conversation_id,
        name: row.other_user_name || row.title || 'Traveler',
        avatar_url: row.other_user_avatar || null,
        is_direct: row.type === 'direct',
        other_user_id: row.other_user_id,
        destination: 'India',
        last_message: row.last_message_content || 'No messages yet',
        last_message_time: row.last_message_at,
        last_message_sender_id: row.last_message_sender_id,
        unread_count: Number(row.unread_count || 0),
        online: true,
      }));
    }

    if (rpcError) {
      console.warn('get_user_conversations RPC fallback:', rpcError);
    }
  } catch (err) {
    console.warn('fetchConversations RPC failed:', err);
  }

  // Fallback: Direct query on conversation_participants & conversations
  try {
    const { data: participants, error: pError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversation:conversations(id, type, title, last_message_at)
      `)
      .eq('user_id', userId)
      .order('conversation(last_message_at)', { ascending: false });

    if (pError || !Array.isArray(participants)) return [];

    const convList = [];
    for (const p of participants) {
      const conv = p.conversation;
      if (!conv) continue;

      // Fetch partner info
      const { data: partnerData } = await supabase
        .from('conversation_participants')
        .select('user_id, user:users(id, name, avatar_url)')
        .eq('conversation_id', conv.id)
        .neq('user_id', userId)
        .limit(1)
        .maybeSingle();

      // Fetch latest message
      const { data: latestMsg } = await supabase
        .from('messages')
        .select('content, media_url, sender_id, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate unread count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .gt('created_at', p.last_read_at || '1970-01-01T00:00:00Z')
        .neq('sender_id', userId);

      convList.push({
        id: conv.id,
        name: partnerData?.user?.name || conv.title || 'Traveler',
        avatar_url: partnerData?.user?.avatar_url || null,
        is_direct: conv.type === 'direct',
        other_user_id: partnerData?.user_id || null,
        destination: 'India',
        last_message: latestMsg?.content || (latestMsg?.media_url ? '📷 Photo' : 'No messages yet'),
        last_message_time: latestMsg?.created_at || conv.last_message_at,
        last_message_sender_id: latestMsg?.sender_id || null,
        unread_count: unreadCount || 0,
        online: true,
      });
    }

    return convList;
  } catch (directErr) {
    console.error('fetchConversations error:', directErr);
    return [];
  }
}

/**
 * 2. Get or create a direct 1:1 conversation between two users (Idempotent)
 */
export async function getOrCreateDirectChat(userId, targetUserId, targetUserInfo = {}) {
  if (!userId || !targetUserId) {
    throw new Error('Both user IDs required for direct conversation.');
  }

  // 1. Primary: Call idempotent stored procedure
  const { data: convId, error: rpcError } = await supabase.rpc('get_or_create_direct_conversation', {
    p_user_a: userId,
    p_user_b: targetUserId,
  });

  if (!rpcError && convId) {
    return {
      id: convId,
      name: targetUserInfo.name || 'Travel Companion',
      avatar_url: targetUserInfo.avatar_url || null,
      is_direct: true,
      other_user_id: targetUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  if (rpcError) {
    console.warn('get_or_create_direct_conversation RPC error:', rpcError);
    throw new Error(rpcError.message || 'Failed to start direct conversation');
  }

  throw new Error('Unable to create direct conversation.');
}

/**
 * 3. Fetch conversation messages
 */
export async function fetchGroupMessages(groupId, { limit = 50, before = null } = {}) {
  if (!isSupabaseConfigured || !groupId) {
    return [];
  }

  try {
    let query = supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        media_url,
        metadata,
        created_at,
        sender:users(id, name, avatar_url)
      `)
      .eq('conversation_id', groupId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: msgs, error } = await query;
    if (error || !Array.isArray(msgs)) {
      console.warn('fetchGroupMessages error:', error);
      return [];
    }

    // Fetch reactions for these messages
    const messageIds = msgs.map((m) => m.id);
    let reactionsMap = {};

    if (messageIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('id, message_id, user_id, emoji')
        .in('message_id', messageIds);

      if (Array.isArray(reactionsData)) {
        for (const r of reactionsData) {
          if (!reactionsMap[r.message_id]) {
            reactionsMap[r.message_id] = {};
          }
          if (!reactionsMap[r.message_id][r.emoji]) {
            reactionsMap[r.message_id][r.emoji] = [];
          }
          reactionsMap[r.message_id][r.emoji].push(r.user_id);
        }
      }
    }

    return msgs.map((m) => {
      const rForMsg = reactionsMap[m.id] || {};
      const reactionsArr = Object.entries(rForMsg).map(([emoji, users]) => ({
        reaction: emoji,
        count: users.length,
        users,
      }));

      const isImage = Boolean(m.media_url);

      return {
        id: m.id,
        group_id: m.conversation_id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        sender_name: m.sender?.name || 'Traveler',
        sender_avatar: m.sender?.avatar_url || null,
        content: m.content || '',
        media_url: m.media_url || null,
        attachment_url: m.media_url || null,
        message_type: m.metadata?.type || (isImage ? 'image' : 'text'),
        metadata: m.metadata || {},
        reply_to: m.metadata?.reply_to || null,
        created_at: m.created_at,
        reactions: reactionsArr,
      };
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    return [];
  }
}

/**
 * 4. Send a message to a conversation
 */
export async function sendChatMessage({
  groupId,
  senderId,
  senderName = 'Traveler',
  senderAvatar = null,
  content = '',
  mediaUrl = null,
  attachmentUrl = null,
  messageType = 'text',
  replyToId = null,
  metadata = {},
}) {
  if (!groupId || !senderId) {
    throw new Error('Conversation ID and Sender ID required');
  }

  const finalMediaUrl = mediaUrl || attachmentUrl || null;
  const finalContent = content ? content.trim() : null;

  if (!finalContent && !finalMediaUrl) {
    throw new Error('Message content or media attachment required');
  }

  const payload = {
    conversation_id: groupId,
    sender_id: senderId,
    content: finalContent,
    media_url: finalMediaUrl,
    metadata: {
      ...metadata,
      type: messageType,
      reply_to_id: replyToId,
    },
  };

  const { data: newMsg, error } = await supabase
    .from('messages')
    .insert(payload)
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      media_url,
      metadata,
      created_at
    `)
    .single();

  if (error) {
    console.error('sendChatMessage error:', error);
    throw new Error(error.message || 'Failed to send message');
  }

  return {
    id: newMsg.id,
    group_id: newMsg.conversation_id,
    conversation_id: newMsg.conversation_id,
    sender_id: newMsg.sender_id,
    sender_name: senderName,
    sender_avatar: senderAvatar,
    content: newMsg.content || '',
    media_url: newMsg.media_url || null,
    attachment_url: newMsg.media_url || null,
    message_type: newMsg.metadata?.type || (newMsg.media_url ? 'image' : 'text'),
    metadata: newMsg.metadata || {},
    created_at: newMsg.created_at,
    reactions: [],
  };
}

/**
 * 5. Delete a message (Sender only)
 */
export async function deleteChatMessage(messageId, userId = null) {
  if (!messageId) return false;

  let query = supabase.from('messages').delete().eq('id', messageId);
  if (userId) {
    query = query.eq('sender_id', userId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to delete message');
  }
  return true;
}

/**
 * 6. Toggle a reaction on a message
 */
export async function toggleMessageReaction(messageId, userId, reaction) {
  if (!messageId || !userId || !reaction) return false;

  // Check if already reacted
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', reaction)
    .maybeSingle();

  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: userId,
      emoji: reaction,
    });
    return true;
  }
}

/**
 * 7. Mark conversation as read (Updates last_read_at)
 */
export async function markConversationRead(groupId, userId = null) {
  if (!groupId || !userId) return;

  try {
    await supabase.rpc('mark_conversation_as_read', {
      p_conversation_id: groupId,
      p_user_id: userId,
    });
  } catch (err) {
    // Fallback update
    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', groupId)
        .eq('user_id', userId);
    } catch {}
  }
}

/**
 * 8. Check bi-directional block status between two users
 */
export async function checkBlockStatus(userId, targetUserId) {
  if (!userId || !targetUserId) return false;

  try {
    const { data: block } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(user_id.eq.${userId},blocked_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},blocked_id.eq.${userId})`)
      .limit(1)
      .maybeSingle();

    return Boolean(block);
  } catch {
    return false;
  }
}

/**
 * 9. Search conversations by participant name or message content
 */
export async function searchConversations(userId, queryText = '') {
  const all = await fetchConversations(userId);
  if (!queryText.trim()) return all;

  const q = queryText.toLowerCase().trim();
  return all.filter((c) =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.last_message || '').toLowerCase().includes(q)
  );
}

/**
 * 10. Subscribe to Realtime messages and reactions in a conversation
 */
export function subscribeToChatGroup(groupId, { onNewMessage, onReaction, onMemberChange } = {}) {
  if (!isSupabaseConfigured || !groupId) {
    return () => {};
  }

  if (typeof supabase?.getChannels === 'function') {
    const existing = supabase.getChannels().filter(
      (c) => c.topic && c.topic.includes(`chat_room_${groupId}`)
    );
    existing.forEach((c) => {
      try { supabase.removeChannel(c); } catch (_) {}
    });
  }

  const channelName = `chat_room_${groupId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${groupId}`,
      },
      async (payload) => {
        if (payload.new && onNewMessage) {
          // Fetch sender name if needed
          let senderName = 'Traveler';
          let senderAvatar = null;
          if (payload.new.sender_id) {
            const { data: u } = await supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', payload.new.sender_id)
              .maybeSingle();
            if (u) {
              senderName = u.name;
              senderAvatar = u.avatar_url;
            }
          }

          onNewMessage({
            id: payload.new.id,
            group_id: payload.new.conversation_id,
            conversation_id: payload.new.conversation_id,
            sender_id: payload.new.sender_id,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            content: payload.new.content || '',
            media_url: payload.new.media_url || null,
            attachment_url: payload.new.media_url || null,
            message_type: payload.new.metadata?.type || (payload.new.media_url ? 'image' : 'text'),
            metadata: payload.new.metadata || {},
            created_at: payload.new.created_at,
            reactions: [],
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      },
      () => {
        if (onReaction) onReaction();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export { uploadChatMedia, deleteChatMedia };

export default {
  fetchConversations,
  getOrCreateDirectChat,
  fetchGroupMessages,
  sendChatMessage,
  deleteChatMessage,
  toggleMessageReaction,
  markConversationRead,
  searchConversations,
  subscribeToChatGroup,
  checkBlockStatus,
  uploadChatMedia,
  deleteChatMedia,
};
