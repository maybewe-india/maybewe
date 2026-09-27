// ============================================================================
// MAYBEWE GROUP CHAT & REALTIME SERVICE (lib/groupChat.js)
// Zero TypeScript, Pure JavaScript/JSX
// Full Supabase Realtime + RLS + Safe Dual-Mode Storage Adapter
// ============================================================================

import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { getPlaceById, getAllPlaces } from './places.js';
import { getTripById } from './tripPlanner.js';
import { logNotificationEvent } from './notifications.js';

const CHAT_GROUPS_KEY = '@maybewe_chat_groups_v1';
const CHAT_MESSAGES_KEY = '@maybewe_chat_messages_v1';
const CHAT_REACTIONS_KEY = '@maybewe_chat_reactions_v1';
const CHAT_READS_KEY = '@maybewe_chat_reads_v1';

export const ALLOWED_REACTIONS = ['❤️', '👍', '😂', '🔥', '✈️', '📍'];

// Demo seed conversations for offline / demo mode
const INITIAL_DEMO_GROUPS = [
  {
    id: 'group-goa-circle',
    name: 'North Goa Sunset Circle',
    description: 'Planning golden hour at Vagator, cliffside dinner at Thalassa, and Saturday night markets.',
    avatar_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500&auto=format&fit=crop&q=80',
    creator_id: 'user-demo-priya',
    hangout_id: 'hangout-goa-sunset',
    trip_id: 'trip-demo-goa',
    is_direct: false,
    destination: 'Goa',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    members: [
      { user_id: 'user-demo-priya', name: 'Priya Sharma', role: 'admin', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', online: true },
      { user_id: 'user-demo-arjun', name: 'Arjun Mehta', role: 'member', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', online: true },
      { user_id: 'user-demo-rohan', name: 'Rohan Verma', role: 'member', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80', online: false },
    ],
  },
  {
    id: 'group-jaipur-heritage',
    name: 'Jaipur Architecture Walk',
    description: 'Old city photo walk from Hawa Mahal to City Palace at sunrise.',
    avatar_url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=500&auto=format&fit=crop&q=80',
    creator_id: 'user-demo-priya',
    hangout_id: 'hangout-jaipur-heritage',
    trip_id: null,
    is_direct: false,
    destination: 'Jaipur',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    members: [
      { user_id: 'user-demo-priya', name: 'Priya Sharma', role: 'admin', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', online: true },
      { user_id: 'user-demo-arjun', name: 'Arjun Mehta', role: 'member', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', online: true },
    ],
  },
  {
    id: 'group-direct-arjun',
    name: 'Arjun Mehta',
    description: 'Direct traveler conversation',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    creator_id: 'user-demo-arjun',
    hangout_id: null,
    trip_id: null,
    is_direct: true,
    destination: 'Goa',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    members: [
      { user_id: 'user-demo-priya', name: 'Priya Sharma', role: 'member', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80', online: true },
      { user_id: 'user-demo-arjun', name: 'Arjun Mehta', role: 'member', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', online: true },
    ],
  },
];

const INITIAL_DEMO_MESSAGES = {
  'group-goa-circle': [
    {
      id: 'msg-goa-1',
      group_id: 'group-goa-circle',
      sender_id: 'user-demo-priya',
      sender_name: 'Priya Sharma',
      sender_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      content: 'Welcome everyone to the Goa Sunset Circle! I started a hangout for Saturday golden hour.',
      message_type: 'text',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'msg-goa-2',
      group_id: 'group-goa-circle',
      sender_id: 'system',
      sender_name: 'MaybeWe Concierge',
      content: 'Priya Sharma created the hangout "Anjuna Golden Hour & Seafood"',
      message_type: 'system',
      created_at: new Date(Date.now() - 86400000 * 2 + 1000).toISOString(),
    },
    {
      id: 'msg-goa-3',
      group_id: 'group-goa-circle',
      sender_id: 'user-demo-arjun',
      sender_name: 'Arjun Mehta',
      sender_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      content: 'Check out this viewpoint place near Chapora fort — it has an incredible panoramic view of the coastline.',
      message_type: 'place_share',
      shared_place_id: 'goa-1',
      metadata: {
        place_id: 'goa-1',
        place_name: 'Chapora Fort & Vagator Bluff',
        destination: 'Goa',
        category: 'Heritage & Viewpoint',
        rating: 4.8,
        image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
      },
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'msg-goa-4',
      group_id: 'group-goa-circle',
      sender_id: 'user-demo-rohan',
      sender_name: 'Rohan Verma',
      sender_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
      content: 'Agreed! We can catch the sunset there around 5:30 PM.',
      reply_to_id: 'msg-goa-3',
      message_type: 'text',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: 'msg-goa-5',
      group_id: 'group-goa-circle',
      sender_id: 'user-demo-priya',
      sender_name: 'Priya Sharma',
      sender_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      content: 'I added the hangout schedule to our shared itinerary!',
      message_type: 'hangout_share',
      shared_hangout_id: 'hangout-goa-sunset',
      metadata: {
        hangout_id: 'hangout-goa-sunset',
        title: 'Anjuna Golden Hour & Seafood',
        destination: 'Goa',
        proposed_date: '2026-10-18',
        proposed_time: '17:30',
        proposed_place: 'Chapora Fort Steps',
        status: 'planning',
        participants_count: 3,
      },
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ],
  'group-jaipur-heritage': [
    {
      id: 'msg-jpr-1',
      group_id: 'group-jaipur-heritage',
      sender_id: 'user-demo-priya',
      sender_name: 'Priya Sharma',
      sender_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      content: 'Looking forward to the sunrise walk! Meeting outside Tattoo Cafe at 7 AM.',
      message_type: 'text',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
  ],
  'group-direct-arjun': [
    {
      id: 'msg-dir-1',
      group_id: 'group-direct-arjun',
      sender_id: 'user-demo-arjun',
      sender_name: 'Arjun Mehta',
      sender_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
      content: 'Hey Priya, do you need a ride from the airport or are you arriving by train?',
      message_type: 'text',
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ],
};

const INITIAL_DEMO_REACTIONS = [
  { message_id: 'msg-goa-3', user_id: 'user-demo-priya', reaction: '❤️' },
  { message_id: 'msg-goa-3', user_id: 'user-demo-rohan', reaction: '🔥' },
  { message_id: 'msg-goa-5', user_id: 'user-demo-arjun', reaction: '✈️' },
];

// Helper: load stored groups
async function getStoredGroups() {
  try {
    const raw = await AsyncStorage.getItem(CHAT_GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading chat groups from storage:', err);
  }
  await AsyncStorage.setItem(CHAT_GROUPS_KEY, JSON.stringify(INITIAL_DEMO_GROUPS));
  return INITIAL_DEMO_GROUPS;
}

// Helper: load stored messages map
async function getStoredMessagesMap() {
  try {
    const raw = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading chat messages from storage:', err);
  }
  await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_MESSAGES));
  return INITIAL_DEMO_MESSAGES;
}

// Helper: load stored reactions list
async function getStoredReactions() {
  try {
    const raw = await AsyncStorage.getItem(CHAT_REACTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading chat reactions from storage:', err);
  }
  await AsyncStorage.setItem(CHAT_REACTIONS_KEY, JSON.stringify(INITIAL_DEMO_REACTIONS));
  return INITIAL_DEMO_REACTIONS;
}

// Helper: load stored user read watermarks
async function getStoredReads() {
  try {
    const raw = await AsyncStorage.getItem(CHAT_READS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {}
  return {};
}

// Helper: save read watermarks
async function saveStoredReads(reads) {
  try {
    await AsyncStorage.setItem(CHAT_READS_KEY, JSON.stringify(reads));
  } catch (err) {}
}

/**
 * 1. Fetch all conversations for a user
 * Returns formatted list of Direct, Hangout, and Trip group chats with unread counts
 */
export async function fetchConversations(userId = 'user-demo-priya') {
  // If Supabase is connected, query chat_groups and chat_group_members
  if (isSupabaseConfigured && userId) {
    try {
      const { data: memberRows, error: mErr } = await supabase
        .from('chat_group_members')
        .select(`
          group_id,
          last_read_at,
          chat_groups (
            id,
            name,
            description,
            avatar_url,
            creator_id,
            hangout_id,
            trip_id,
            is_direct,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (!mErr && memberRows && memberRows.length > 0) {
        const conversations = [];
        for (const row of memberRows) {
          const g = row.chat_groups;
          if (!g) continue;

          // Fetch latest message
          const { data: latestMsg } = await supabase
            .from('chat_messages')
            .select('id, content, message_type, created_at, sender_id')
            .eq('group_id', g.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', g.id)
            .gt('created_at', row.last_read_at || '1970-01-01');

          conversations.push({
            id: g.id,
            name: g.name,
            description: g.description,
            avatar_url: g.avatar_url,
            is_direct: g.is_direct,
            hangout_id: g.hangout_id,
            trip_id: g.trip_id,
            destination: g.description?.includes('Goa') ? 'Goa' : 'Jaipur',
            last_message: latestMsg?.content || (latestMsg?.message_type === 'place_share' ? '📍 Shared a place' : 'No messages yet'),
            last_message_time: latestMsg?.created_at || g.updated_at,
            unread_count: unreadCount || 0,
            online: true,
          });
        }
        return conversations.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
      }
    } catch (err) {
      console.warn('Supabase fetchConversations fallback to local:', err);
    }
  }

  // Local / Demo mode fallback
  const groups = await getStoredGroups();
  const messagesMap = await getStoredMessagesMap();
  const reads = await getStoredReads();

  // Filter groups where user is a member
  const userGroups = groups.filter((g) =>
    g.members.some((m) => m.user_id === userId)
  );

  const formatted = userGroups.map((g) => {
    const msgs = messagesMap[g.id] || [];
    const latest = msgs.length > 0 ? msgs[msgs.length - 1] : null;

    const userReadTime = reads[`${g.id}_${userId}`] || '1970-01-01T00:00:00Z';
    const unreadCount = msgs.filter((m) => m.created_at > userReadTime && m.sender_id !== userId).length;

    let preview = 'No messages yet';
    if (latest) {
      if (latest.message_type === 'place_share') preview = '📍 Shared a place';
      else if (latest.message_type === 'trip_share') preview = '🎒 Shared a trip';
      else if (latest.message_type === 'hangout_share') preview = '🍷 Shared hangout plan';
      else if (latest.message_type === 'activity_share') preview = '📅 Shared itinerary activity';
      else if (latest.message_type === 'image') preview = '📷 Photo';
      else preview = latest.content;
    }

    // Direct chat avatar & name calculation
    let displayName = g.name;
    let displayAvatar = g.avatar_url;
    let isOnline = true;

    if (g.is_direct) {
      const otherMember = g.members.find((m) => m.user_id !== userId) || g.members[0];
      if (otherMember) {
        displayName = otherMember.name;
        displayAvatar = otherMember.avatar_url;
        isOnline = otherMember.online !== false;
      }
    }

    return {
      id: g.id,
      name: displayName,
      description: g.description,
      avatar_url: displayAvatar,
      is_direct: g.is_direct,
      hangout_id: g.hangout_id,
      trip_id: g.trip_id,
      destination: g.destination || 'India',
      last_message: preview,
      last_message_time: latest ? latest.created_at : g.updated_at,
      unread_count: unreadCount,
      members_count: g.members.length,
      online: isOnline,
    };
  });

  return formatted.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
}

/**
 * 2. Get or create a direct 1:1 conversation between two users
 */
export async function getOrCreateDirectChat(userId, targetUserId, targetUserInfo = {}) {
  const groups = await getStoredGroups();
  const existing = groups.find((g) =>
    g.is_direct &&
    g.members.some((m) => m.user_id === userId) &&
    g.members.some((m) => m.user_id === targetUserId)
  );

  if (existing) return existing;

  const newGroup = {
    id: `direct-${Date.now()}`,
    name: targetUserInfo.name || 'Travel Companion',
    description: 'Direct traveler conversation',
    avatar_url: targetUserInfo.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
    creator_id: userId,
    hangout_id: null,
    trip_id: null,
    is_direct: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members: [
      { user_id: userId, role: 'member', name: 'You', online: true },
      { user_id: targetUserId, role: 'member', name: targetUserInfo.name || 'Companion', avatar_url: targetUserInfo.avatar_url, online: true },
    ],
  };

  groups.unshift(newGroup);
  await AsyncStorage.setItem(CHAT_GROUPS_KEY, JSON.stringify(groups));
  return newGroup;
}

/**
 * 3. Get or create a dedicated group chat for a Hangout
 */
export async function getOrCreateHangoutChat(hangoutId, creatorId = 'user-demo-priya', hangoutInfo = {}) {
  const groups = await getStoredGroups();
  const existing = groups.find((g) => g.hangout_id === hangoutId);
  if (existing) return existing;

  const newGroup = {
    id: `group-hangout-${hangoutId}`,
    name: hangoutInfo.title || 'Hangout Group Chat',
    description: hangoutInfo.description || 'Spontaneous meetup coordination',
    avatar_url: hangoutInfo.avatar_url || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500',
    creator_id: creatorId,
    hangout_id: hangoutId,
    trip_id: null,
    is_direct: false,
    destination: hangoutInfo.destination || 'Goa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members: (hangoutInfo.members || []).map((m) => ({
      user_id: m.id || m.user_id,
      name: m.name || 'Member',
      avatar_url: m.avatar_url,
      role: m.role || 'member',
      online: true,
    })),
  };

  if (newGroup.members.length === 0) {
    newGroup.members.push({ user_id: creatorId, name: 'Organizer', role: 'admin', online: true });
  }

  groups.unshift(newGroup);
  await AsyncStorage.setItem(CHAT_GROUPS_KEY, JSON.stringify(groups));

  // Seed initial system message
  await sendChatMessage({
    groupId: newGroup.id,
    senderId: 'system',
    senderName: 'MaybeWe Concierge',
    content: `Hangout group chat created for "${newGroup.name}"`,
    messageType: 'system',
  });

  return newGroup;
}

/**
 * 4. Fetch messages for a conversation
 * Enriches with reactions, reply excerpts, and travel objects
 */
export async function fetchGroupMessages(groupId, { limit = 50, before = null } = {}) {
  // If Supabase is connected
  if (isSupabaseConfigured && groupId) {
    try {
      let query = supabase
        .from('chat_messages')
        .select(`
          id,
          group_id,
          sender_id,
          content,
          message_type,
          shared_place_id,
          shared_trip_id,
          shared_activity_id,
          shared_hangout_id,
          attachment_url,
          reply_to_id,
          metadata,
          created_at,
          sender:users!chat_messages_sender_id_fkey(id, name, avatar_url, verification_status)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((m) => ({
          ...m,
          sender_name: m.sender?.name || 'Traveler',
          sender_avatar: m.sender?.avatar_url,
        }));
      }
    } catch (err) {
      console.warn('Supabase fetchGroupMessages fallback to local:', err);
    }
  }

  // Local / Demo mode
  const messagesMap = await getStoredMessagesMap();
  const reactions = await getStoredReactions();

  const groupMsgs = messagesMap[groupId] || [];

  // Enrich with reactions and reply excerpts
  const enriched = groupMsgs.map((msg) => {
    // Collect reactions for this message
    const msgReactions = reactions.filter((r) => r.message_id === msg.id);
    const reactionCounts = {};
    msgReactions.forEach((r) => {
      if (!reactionCounts[r.reaction]) {
        reactionCounts[r.reaction] = { reaction: r.reaction, count: 0, users: [] };
      }
      reactionCounts[r.reaction].count += 1;
      reactionCounts[r.reaction].users.push(r.user_id);
    });

    // Lookup reply preview if reply_to_id
    let replyPreview = null;
    if (msg.reply_to_id) {
      const parent = groupMsgs.find((m) => m.id === msg.reply_to_id);
      if (parent) {
        replyPreview = {
          id: parent.id,
          sender_name: parent.sender_name || 'Traveler',
          content: parent.content,
          message_type: parent.message_type,
        };
      }
    }

    return {
      ...msg,
      reactions: Object.values(reactionCounts),
      reply_to: replyPreview,
    };
  });

  return enriched;
}

/**
 * 5. Send a chat message (text, media, place, trip, activity, hangout, or reply)
 */
export async function sendChatMessage({
  groupId,
  senderId = 'user-demo-priya',
  senderName = 'Priya Sharma',
  senderAvatar = null,
  content = '',
  messageType = 'text',
  replyToId = null,
  sharedPlaceId = null,
  sharedTripId = null,
  sharedActivity = null,
  sharedHangoutId = null,
  attachmentUrl = null,
  metadata = {},
}) {
  if (!content.trim() && !sharedPlaceId && !sharedTripId && !sharedActivity && !sharedHangoutId && !attachmentUrl) {
    return null;
  }

  // Enrich travel metadata if applicable
  const resolvedMetadata = { ...metadata };

  if (sharedPlaceId) {
    resolvedMetadata.place_id = sharedPlaceId;
    const place = getPlaceById(sharedPlaceId) || (typeof getAllPlaces === 'function' ? getAllPlaces().find((p) => p.id.includes(sharedPlaceId) || p.slug?.includes(sharedPlaceId)) : null);
    if (place) {
      resolvedMetadata.place_name = resolvedMetadata.place_name || place.name;
      resolvedMetadata.destination = resolvedMetadata.destination || place.destination;
      resolvedMetadata.category = resolvedMetadata.category || place.category;
      resolvedMetadata.rating = resolvedMetadata.rating || place.rating;
      resolvedMetadata.image_url = resolvedMetadata.image_url || place.image_url;
      resolvedMetadata.tier = resolvedMetadata.tier || place.tier;
    } else {
      resolvedMetadata.place_name = resolvedMetadata.place_name || 'Curated Place';
      resolvedMetadata.destination = resolvedMetadata.destination || 'India';
      resolvedMetadata.category = resolvedMetadata.category || 'Spot';
      resolvedMetadata.rating = resolvedMetadata.rating || 4.8;
      resolvedMetadata.image_url = resolvedMetadata.image_url || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800';
    }
  }

  if (sharedTripId) {
    resolvedMetadata.trip_id = sharedTripId;
    const trip = await getTripById(sharedTripId);
    if (trip) {
      resolvedMetadata.trip_name = resolvedMetadata.trip_name || trip.title;
      resolvedMetadata.destination = resolvedMetadata.destination || trip.destination;
      resolvedMetadata.dates = resolvedMetadata.dates || `${trip.start_date || 'Upcoming'} — ${trip.end_date || 'Return'}`;
      resolvedMetadata.cover_image = resolvedMetadata.cover_image || trip.cover_image;
    } else {
      resolvedMetadata.trip_name = resolvedMetadata.trip_name || 'Curated Trip';
      resolvedMetadata.destination = resolvedMetadata.destination || 'India';
      resolvedMetadata.dates = resolvedMetadata.dates || 'Upcoming Journey';
      resolvedMetadata.cover_image = resolvedMetadata.cover_image || 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800';
    }
  }

  if (sharedHangoutId) {
    resolvedMetadata.hangout_id = sharedHangoutId;
    resolvedMetadata.title = resolvedMetadata.title || 'Spontaneous Meetup';
    resolvedMetadata.destination = resolvedMetadata.destination || 'India';
    resolvedMetadata.status = resolvedMetadata.status || 'planning';
  }

  if (sharedActivity) {
    resolvedMetadata.activity = sharedActivity;
  }

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    group_id: groupId,
    sender_id: senderId,
    sender_name: senderName,
    sender_avatar: senderAvatar,
    content: content.trim(),
    message_type: messageType,
    reply_to_id: replyToId,
    shared_place_id: sharedPlaceId,
    shared_trip_id: sharedTripId,
    shared_activity_id: sharedActivity?.id || null,
    shared_hangout_id: sharedHangoutId,
    attachment_url: attachmentUrl,
    metadata: resolvedMetadata,
    created_at: new Date().toISOString(),
  };

  // If Supabase is connected
  if (isSupabaseConfigured && senderId && senderId !== 'system') {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            group_id: groupId,
            sender_id: senderId,
            content: newMsg.content,
            message_type: newMsg.message_type,
            reply_to_id: newMsg.reply_to_id,
            shared_place_id: newMsg.shared_place_id,
            shared_trip_id: newMsg.shared_trip_id,
            shared_hangout_id: newMsg.shared_hangout_id,
            attachment_url: newMsg.attachment_url,
            metadata: newMsg.metadata,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        newMsg.id = data.id;
      }
    } catch (err) {
      console.warn('Supabase sendChatMessage error, continuing with local persistence:', err);
    }
  }

  // Save to local message store
  const messagesMap = await getStoredMessagesMap();
  if (!messagesMap[groupId]) messagesMap[groupId] = [];
  messagesMap[groupId].push(newMsg);
  await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messagesMap));

  // Update group updated_at
  const groups = await getStoredGroups();
  const groupIdx = groups.findIndex((g) => g.id === groupId);
  if (groupIdx !== -1) {
    groups[groupIdx].updated_at = newMsg.created_at;
    await AsyncStorage.setItem(CHAT_GROUPS_KEY, JSON.stringify(groups));
  }

  // Dispatch notification for non-system messages
  if (senderId !== 'system') {
    try {
      await logNotificationEvent({
        recipient_id: 'group_members',
        actor_id: senderId,
        type: replyToId ? 'chat_reply' : 'chat_message',
        entity_id: newMsg.id,
        data: {
          group_id: groupId,
          group_name: groups[groupIdx]?.name || 'Chat',
          message_type: messageType,
        },
      });
    } catch (err) {}
  }

  return newMsg;
}

/**
 * 6. Delete a message
 * Enforces ownership authorization: only sender can delete own message
 */
export async function deleteChatMessage(messageId, userId = 'user-demo-priya') {
  const messagesMap = await getStoredMessagesMap();

  let targetGroupId = null;
  let targetMsg = null;

  for (const [gid, msgs] of Object.entries(messagesMap)) {
    const found = msgs.find((m) => m.id === messageId);
    if (found) {
      targetGroupId = gid;
      targetMsg = found;
      break;
    }
  }

  if (!targetMsg) {
    throw new Error('Message not found');
  }

  // Authorization check
  if (targetMsg.sender_id !== userId) {
    throw new Error('Unauthorized: You can only delete your own messages');
  }

  // Remove message or mask content
  messagesMap[targetGroupId] = messagesMap[targetGroupId].filter((m) => m.id !== messageId);
  await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messagesMap));

  if (isSupabaseConfigured) {
    try {
      await supabase.from('chat_messages').delete().eq('id', messageId).eq('sender_id', userId);
    } catch (err) {}
  }

  return { success: true, deleted_id: messageId };
}

/**
 * 7. Toggle message reaction
 * Restrained set: ❤️, 👍, 😂, 🔥, ✈️, 📍
 * Duplicate prevention: toggles off if user already reacted with this emoji
 */
export async function toggleMessageReaction(messageId, userId, reaction) {
  if (!ALLOWED_REACTIONS.includes(reaction)) {
    throw new Error(`Invalid reaction. Allowed: ${ALLOWED_REACTIONS.join(', ')}`);
  }

  const reactions = await getStoredReactions();
  const existingIdx = reactions.findIndex(
    (r) => r.message_id === messageId && r.user_id === userId && r.reaction === reaction
  );

  let action = 'added';
  if (existingIdx !== -1) {
    // Remove own reaction
    reactions.splice(existingIdx, 1);
    action = 'removed';
  } else {
    // Add reaction
    reactions.push({
      id: `react-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      message_id: messageId,
      user_id: userId,
      reaction,
      created_at: new Date().toISOString(),
    });
    action = 'added';
  }

  await AsyncStorage.setItem(CHAT_REACTIONS_KEY, JSON.stringify(reactions));

  if (isSupabaseConfigured && userId) {
    try {
      if (action === 'added') {
        await supabase.from('chat_message_reactions').insert([
          { message_id: messageId, user_id: userId, reaction }
        ]);
      } else {
        await supabase.from('chat_message_reactions').delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('reaction', reaction);
      }
    } catch (err) {
      console.warn('Supabase toggle reaction error:', err);
    }
  }

  // Return updated reactions for this message
  const msgReactions = reactions.filter((r) => r.message_id === messageId);
  return { action, reactions: msgReactions };
}

/**
 * 8. Mark a conversation as read
 * Resets unread counter by updating user watermark
 */
export async function markConversationRead(groupId, userId = 'user-demo-priya') {
  const reads = await getStoredReads();
  reads[`${groupId}_${userId}`] = new Date().toISOString();
  await saveStoredReads(reads);

  if (isSupabaseConfigured && userId) {
    try {
      await supabase.rpc('mark_chat_group_read', { p_group_id: groupId });
    } catch (err) {}
  }

  return { success: true, read_at: reads[`${groupId}_${userId}`] };
}

/**
 * 9. Search conversations and messages
 * Supports message content, tagged destinations, and shared place names
 */
export async function searchConversations(userId, queryText = '') {
  if (!queryText || !queryText.trim()) {
    return fetchConversations(userId);
  }

  const query = queryText.toLowerCase().trim();
  const allConversations = await fetchConversations(userId);
  const messagesMap = await getStoredMessagesMap();

  return allConversations.filter((c) => {
    // Match conversation name or destination
    if (c.name.toLowerCase().includes(query)) return true;
    if (c.destination?.toLowerCase().includes(query)) return true;

    // Match messages inside conversation
    const msgs = messagesMap[c.id] || [];
    return msgs.some((m) => {
      if (m.content && m.content.toLowerCase().includes(query)) return true;
      if (m.metadata?.place_name && m.metadata.place_name.toLowerCase().includes(query)) return true;
      if (m.metadata?.trip_name && m.metadata.trip_name.toLowerCase().includes(query)) return true;
      return false;
    });
  });
}

/**
 * 10. Realtime Subscription Lifecycle
 * Safely manages Supabase Realtime channel subscription with unmount cleanup
 */
export function subscribeToChatGroup(groupId, { onNewMessage, onReaction, onRead, onMemberChange } = {}) {
  if (isSupabaseConfigured && groupId) {
    const channelName = `group_chat_${groupId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (payload.new && onNewMessage) {
            onNewMessage(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_message_reactions',
        },
        (payload) => {
          if (onReaction) {
            onReaction(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (onMemberChange) {
            onMemberChange(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {}
    };
  }

  // Safe no-op cleanup in offline/demo mode
  return () => {};
}

/**
 * 11. Post Hangout System Event
 * Dispatches informational system announcements to the group chat
 */
export async function sendHangoutSystemEvent(hangoutId, eventType, eventData = {}) {
  const groups = await getStoredGroups();
  const group = groups.find((g) => g.hangout_id === hangoutId);
  if (!group) return null;

  let messageText = 'Hangout updated.';
  switch (eventType) {
    case 'created':
      messageText = `${eventData.organizer_name || 'Organizer'} created the hangout "${eventData.title || group.name}"`;
      break;
    case 'member_joined':
      messageText = `${eventData.member_name || 'A traveler'} joined the hangout circle`;
      break;
    case 'suggestion_added':
      messageText = `New place suggested: ${eventData.place_name || 'A scenic spot'}`;
      break;
    case 'voting_opened':
      messageText = 'Voting is now open for suggested places';
      break;
    case 'plan_finalized':
      messageText = `Hangout confirmed! Destination: ${eventData.place_name || 'Selected Place'} at ${eventData.time || '17:30'}`;
      break;
    default:
      messageText = eventData.text || 'Hangout activity updated';
  }

  return sendChatMessage({
    groupId: group.id,
    senderId: 'system',
    senderName: 'MaybeWe Concierge',
    content: messageText,
    messageType: 'system',
    sharedHangoutId: hangoutId,
  });
}
