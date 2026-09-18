import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { DEMO_CURRENT_USER } from './demoData.js';

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isDemoMode: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  submitVerification: async () => {},
  setThemePreference: async () => {},
  agreeToGuidelines: async () => {},
});

const DEMO_AUTH_KEY = '@solo_traveler_demo_auth';
const DEMO_PROFILE_KEY = '@solo_traveler_demo_profile';
const GUIDELINES_KEY = '@solo_traveler_guidelines_agreed';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);
  const [hasAgreedToGuidelines, setHasAgreedToGuidelines] = useState(false);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const storedGuidelines = await AsyncStorage.getItem(GUIDELINES_KEY);
        if (storedGuidelines === 'true' && isMounted) {
          setHasAgreedToGuidelines(true);
        }

        if (isSupabaseConfigured) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (isMounted) {
            setSession(initialSession);
            if (initialSession?.user) {
              await fetchSupabaseProfile(initialSession.user.id);
            } else {
              // Check if local demo session was active
              await checkLocalDemoSession();
            }
          }
        } else {
          // Demo mode by default if Supabase is not configured
          await checkLocalDemoSession();
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth events if configured
    let subscription = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        if (newSession?.user) {
          setIsDemoMode(false);
          await fetchSupabaseProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  async function checkLocalDemoSession() {
    const demoAuth = await AsyncStorage.getItem(DEMO_AUTH_KEY);
    if (demoAuth === 'true') {
      const savedProfile = await AsyncStorage.getItem(DEMO_PROFILE_KEY);
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile));
        } catch {
          setProfile(DEMO_CURRENT_USER);
        }
      } else {
        setProfile(DEMO_CURRENT_USER);
      }
      setIsDemoMode(true);
    }
  }

  async function fetchSupabaseProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      } else {
        console.warn('Profile fetch error or missing profile:', error);
      }
    } catch (err) {
      console.warn('Error fetching user profile:', err);
    }
  }

  // Login handler
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSession(data.session);
        setIsDemoMode(false);
        await fetchSupabaseProfile(data.session.user.id);
        return { success: true };
      } else {
        // Instant Demo Login
        await AsyncStorage.setItem(DEMO_AUTH_KEY, 'true');
        const customProfile = {
          ...DEMO_CURRENT_USER,
          email: email || DEMO_CURRENT_USER.email,
        };
        await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(customProfile));
        setProfile(customProfile);
        setIsDemoMode(true);
        return { success: true };
      }
    } catch (error) {
      // If Supabase authentication fails with network or credentials, offer demo mode gracefully
      console.warn('Login error:', error.message);
      return { success: false, error: error.message || 'Failed to sign in. Please verify your credentials.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Signup handler
  const signup = async (userData) => {
    setIsLoading(true);
    try {
      // Validate age
      const ageNum = parseInt(userData.age, 10);
      if (isNaN(ageNum) || ageNum < 18) {
        throw new Error('You must be at least 18 years old to join MaybeWe.');
      }

      if (isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const profilePayload = {
            id: authData.user.id,
            name: userData.name,
            age: ageNum,
            gender: userData.gender || 'Not specified',
            bio: userData.bio || '',
            avatar_url: userData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            travel_styles: userData.travel_styles || [],
            languages: userData.languages || ['English'],
            verification_status: 'not_started',
            trust_score: 5.00,
            subscription_tier: 'free',
            theme_preference: null,
          };

          const { error: profileError } = await supabase
            .from('users')
            .insert([profilePayload]);

          if (profileError) throw profileError;
          setProfile(profilePayload);
          setSession(authData.session);
          setIsDemoMode(false);
        }
        return { success: true };
      } else {
        // Demo signup: start strictly as unverified (not_started)
        const newProfile = {
          id: `user-${Date.now()}`,
          name: userData.name || 'Solo Explorer',
          email: userData.email || 'explorer@traveler.io',
          age: ageNum,
          gender: userData.gender || 'Not specified',
          bio: userData.bio || 'Eager to discover hidden corners and friendly travel companions.',
          avatar_url: userData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
          travel_styles: userData.travel_styles || ['Culture', 'Adventure'],
          languages: userData.languages || ['English'],
          verification_status: 'not_started',
          trust_score: 5.00,
          subscription_tier: 'free',
          theme_preference: null,
          created_at: new Date().toISOString(),
        };

        await AsyncStorage.setItem(DEMO_AUTH_KEY, 'true');
        await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProfile));
        setProfile(newProfile);
        setIsDemoMode(true);
        return { success: true };
      }
    } catch (error) {
      console.warn('Signup error:', error.message);
      return { success: false, error: error.message || 'Unable to complete signup.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY]);
      setSession(null);
      setProfile(null);
      setIsDemoMode(!isSupabaseConfigured);
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    try {
      if (isSupabaseConfigured && session?.user) {
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', session.user.id)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
      } else {
        const updated = { ...profile, ...updates };
        await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(updated));
        setProfile(updated);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Submit verification selfie - stores selfie in private verification field, updates status
  const submitVerification = async (selfieUri, outcome = 'verified') => {
    try {
      if (!selfieUri) {
        throw new Error('Please capture your selfie before submitting verification.');
      }
      const updates = {
        verification_status: outcome, // 'verified' | 'failed' | 'pending'
        verification_selfie: selfieUri, // Private field, separate from public avatar_url
        verified_at: outcome === 'verified' ? new Date().toISOString() : null,
      };
      await updateProfile(updates);
      return { success: outcome === 'verified', status: outcome };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const setVerificationStatus = async (status) => {
    try {
      await updateProfile({ verification_status: status });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const setThemePreference = async (theme) => {
    try {
      await updateProfile({ theme_preference: theme });
      await AsyncStorage.setItem('@maybewe_theme_preference', theme);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const agreeToGuidelines = async () => {
    await AsyncStorage.setItem(GUIDELINES_KEY, 'true');
    setHasAgreedToGuidelines(true);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || (profile ? { id: profile.id, email: profile.email } : null),
        profile,
        isLoading,
        isDemoMode,
        hasAgreedToGuidelines,
        login,
        signup,
        logout,
        updateProfile,
        submitVerification,
        setVerificationStatus,
        setThemePreference,
        agreeToGuidelines,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
