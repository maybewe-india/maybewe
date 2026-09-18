import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { DEMO_CHAT_MESSAGES } from './demoData.js';

const CHAT_STORAGE_PREFIX = '@solo_traveler_chat_';

/**
 * Loads messages for a given match ID
 */
export async function getMessages(matchId) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Error fetching Supabase messages:', err);
    }
  }

  // Demo fallback
  try {
    const key = `${CHAT_STORAGE_PREFIX}${matchId}`;
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}

  // Fallback to demo messages
  const initial = DEMO_CHAT_MESSAGES[matchId] || [];
  return initial;
}

/**
 * Sends a message in a match conversation
 */
export async function sendMessage({ matchId, senderId, content }) {
  if (!content || !content.trim()) return null;

  const newMsg = {
    id: `msg-${Date.now()}`,
    match_id: matchId,
    sender_id: senderId,
    content: content.trim(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && senderId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            match_id: matchId,
            sender_id: senderId,
            content: content.trim(),
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Error sending Supabase message, falling back to local:', err);
    }
  }

  // Demo fallback
  try {
    const key = `${CHAT_STORAGE_PREFIX}${matchId}`;
    const current = await getMessages(matchId);
    const updated = [...current, newMsg];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving demo message:', err);
  }

  return newMsg;
}

/**
 * Subscribes to realtime messages for a match
 * Returns an unsubscribe function to clean up listeners on unmount
 */
export function subscribeToMessages(matchId, onNewMessage) {
  if (isSupabaseConfigured) {
    const channel = supabase
      .channel(`chat_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.new && onNewMessage) {
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // In demo mode, no persistent socket needed
  return () => {};
}

export default {
  getMessages,
  sendMessage,
  subscribeToMessages,
};
