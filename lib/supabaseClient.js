import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo-solo-traveler.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key-placeholder';

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('demo-solo-traveler') &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== 'demo-anon-key-placeholder'
);

// Resilient storage wrapper compatible with React Native, Web, and Test environments
const storageAdapter = {
  getItem: async (key) => {
    try {
      const getter = AsyncStorage?.getItem || AsyncStorage?.default?.getItem;
      return getter ? await getter(key) : null;
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      const setter = AsyncStorage?.setItem || AsyncStorage?.default?.setItem;
      if (setter) await setter(key, value);
    } catch {}
  },
  removeItem: async (key) => {
    try {
      const remover = AsyncStorage?.removeItem || AsyncStorage?.default?.removeItem;
      if (remover) await remover(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
