import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://demo-solo-traveler.supabase.co';

const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '');

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key-placeholder';

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('demo-solo-traveler') &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== 'demo-anon-key-placeholder'
);
console.log('[Supabase] configured:', isSupabaseConfigured);
console.log('[Supabase] URL:', supabaseUrl);

// Resilient storage wrapper compatible with React Native, Web, and Test environments
const nodeStorage = new Map();
const storageAdapter = {
  getItem: (key) => {
    if (typeof AsyncStorage?.getItem === 'function') {
      return AsyncStorage.getItem(key);
    }
    return Promise.resolve(nodeStorage.get(key) || null);
  },
  setItem: (key, value) => {
    if (typeof AsyncStorage?.setItem === 'function') {
      return AsyncStorage.setItem(key, value);
    }
    nodeStorage.set(key, String(value));
    return Promise.resolve();
  },
  removeItem: (key) => {
    if (typeof AsyncStorage?.removeItem === 'function') {
      return AsyncStorage.removeItem(key);
    }
    nodeStorage.delete(key);
    return Promise.resolve();
  },
};

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

export default supabase;
