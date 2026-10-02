import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { DEMO_CURRENT_USER } from './demoData.js';
import { analyzeSelfieOnDevice } from './faceVerification.js';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isDemoMode: false,
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => { },
  login: async () => { },
  loginWithGoogle: async () => { },
  signInWithGoogle: async () => { },
  signup: async () => { },
  resetPassword: async () => { },
  updateUserPassword: async () => { },
  logout: async () => { },
  updateProfile: async () => { },
  submitVerification: async () => { },
  setThemePreference: async () => { },
  agreeToGuidelines: async () => { },
});

const DEMO_AUTH_KEY = '@solo_traveler_demo_auth';
const DEMO_PROFILE_KEY = '@solo_traveler_demo_profile';
const GUIDELINES_KEY = '@solo_traveler_guidelines_agreed';
const isVerificationDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
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

        // Fast hydration: load locally cached profile immediately so app opens with 0ms delay
        try {
          const cachedProfileStr = await AsyncStorage.getItem('@maybewe_cached_profile');
          if (cachedProfileStr && isMounted) {
            const parsedProfile = JSON.parse(cachedProfileStr);
            if (parsedProfile && parsedProfile.id) {
              setProfile(parsedProfile);
              setIsLoading(false);
            }
          }
        } catch (e) { }

        // Check if Web URL contains password recovery context
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          const search = window.location.search || '';
          const pathname = window.location.pathname || '';
          if (
            hash.includes('type=recovery') ||
            search.includes('type=recovery') ||
            pathname.includes('reset-password')
          ) {
            if (isMounted) setIsPasswordRecovery(true);
          }
        }

        if (isSupabaseConfigured) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          const initialSession = sessionData?.session;
          console.log('[Auth] getSession result during init:', {
            hasSession: !!initialSession,
            userId: initialSession?.user?.id || 'NONE',
            error: sessionErr?.message || null,
          });

          if (isMounted) {
            if (initialSession?.user) {
              setSession(initialSession);
              setIsDemoMode(false);
              await fetchSupabaseProfile(initialSession.user.id);
            } else {
              // Check if local demo session was active or fallback to demo
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

    // Listen to Supabase auth events (e.g. PASSWORD_RECOVERY, SIGNED_IN, INITIAL_SESSION, SIGNED_OUT)
    let subscription = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('[Auth] onAuthStateChange event:', event, 'session user:', newSession?.user?.id || 'NONE');
        if (!isMounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          setSession(newSession);
          setIsDemoMode(false);
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          setIsDemoMode(false);
          await fetchSupabaseProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          AsyncStorage.removeItem('@maybewe_cached_profile').catch(() => { });
        }
      });
      subscription = data.subscription;
    }

    // Handle deep links (such as solo-traveler://auth/callback with recovery tokens or PKCE codes)
    const handleIncomingDeepLink = async ({ url }) => {
      if (!url || !isSupabaseConfigured) return;
      try {
        let code = null;
        let accessToken = null;
        let refreshToken = null;
        let type = null;
        let errorParam = null;

        try {
          const parsedUrl = new URL(url.replace('#', '?'));
          code = parsedUrl.searchParams.get('code');
          accessToken = parsedUrl.searchParams.get('access_token');
          refreshToken = parsedUrl.searchParams.get('refresh_token');
          type = parsedUrl.searchParams.get('type');
          errorParam =
            parsedUrl.searchParams.get('error_description') ||
            parsedUrl.searchParams.get('error');
        } catch {
          const codeMatch = url.match(/[?&]code=([^&#]+)/);
          if (codeMatch) code = decodeURIComponent(codeMatch[1]);
          const accessMatch = url.match(/[?&#]access_token=([^&#]+)/);
          if (accessMatch) accessToken = decodeURIComponent(accessMatch[1]);
          const refreshMatch = url.match(/[?&#]refresh_token=([^&#]+)/);
          if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
          const typeMatch = url.match(/[?&#]type=([^&#]+)/);
          if (typeMatch) type = decodeURIComponent(typeMatch[1]);
          const errorMatch =
            url.match(/[?&#]error_description=([^&#]+)/) ||
            url.match(/[?&#]error=([^&#]+)/);
          if (errorMatch) errorParam = decodeURIComponent(errorMatch[1]);
        }

        if (errorParam) {
          console.warn('Auth deep link error:', errorParam);
          return;
        }

        const isRecovery =
          type === 'recovery' ||
          url.includes('type=recovery') ||
          url.includes('reset-password');

        let incomingSession = null;
        if (code) {
          const { data, error: exchangeErr } =
            await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeErr && data?.session) {
            incomingSession = data.session;
          }
        } else if (accessToken && refreshToken) {
          const { data, error: setSessionErr } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          if (!setSessionErr && data?.session) {
            incomingSession = data.session;
          }
        }

        if (isRecovery && isMounted) {
          setIsPasswordRecovery(true);
          if (incomingSession) {
            setSession(incomingSession);
          }
          return;
        }

        if (incomingSession?.user && isMounted) {
          setSession(incomingSession);
          setIsDemoMode(false);
          await fetchSupabaseProfile(incomingSession.user.id);
        }
      } catch (err) {
        console.warn('Error processing auth deep link:', err);
      }
    };

    const linkSub = Linking.addEventListener('url', handleIncomingDeepLink);
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && isMounted) {
        handleIncomingDeepLink({ url: initialUrl });
      }
    });

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
      linkSub.remove();
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
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 8000)
      );
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!error && data) {
        const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
        if (isDemo) {
          if (data.verification_status === 'pending') {
            data.verification_status = 'verified';
            data.verified_at = data.verified_at || new Date().toISOString();
            AsyncStorage.setItem(`@maybewe_dev_verified_${userId}`, 'true').catch(() => { });
          } else {
            try {
              const isDevApproved = await AsyncStorage.getItem(`@maybewe_dev_verified_${userId}`);
              if (isDevApproved === 'true') {
                data.verification_status = 'verified';
                data.verified_at = data.verified_at || new Date().toISOString();
              }
            } catch { }
          }
        }
        const userEmail = session?.user?.email;
        const enrichedProfile = { ...data, email: data.email || userEmail };
        setProfile(enrichedProfile);
        AsyncStorage.setItem('@maybewe_cached_profile', JSON.stringify(enrichedProfile)).catch(() => { });
        return;
      }

      // If public.users row is missing for the authenticated user, query user_verifications to capture real status (pending/not_started)
      let verifStatus = 'not_started';
      const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
      if (isDemo) {
        try {
          const isDevApproved = await AsyncStorage.getItem(`@maybewe_dev_verified_${userId}`);
          if (isDevApproved === 'true') {
            verifStatus = 'verified';
          }
        } catch { }
      }
      if (verifStatus !== 'verified') {
        try {
          const { data: verif } = await supabase
            .from('user_verifications')
            .select('status')
            .eq('user_id', userId)
            .maybeSingle();
          if (verif?.status) {
            if (isDemo && verif.status === 'pending') {
              verifStatus = 'verified';
              AsyncStorage.setItem(`@maybewe_dev_verified_${userId}`, 'true').catch(() => { });
            } else {
              verifStatus = verif.status;
            }
          }
        } catch { }
      }

      const { data: authUserData } = await supabase.auth.getUser();
      const meta = authUserData?.user?.user_metadata || session?.user?.user_metadata || {};
      const userEmail = authUserData?.user?.email || session?.user?.email;

      const realName = meta?.name && typeof meta.name === 'string' && meta.name.trim().length > 0 ? meta.name.trim() : null;
      const parsedAge = parseInt(meta?.age, 10);
      const hasValidAge = !isNaN(parsedAge) && parsedAge >= 18;

      // Recover ONLY when sufficient real profile data exists (real name and real age >= 18 from signup metadata)
      // Do NOT fabricate age, gender, avatar, or other profile fields!
      if (realName && hasValidAge) {
        const recoveredPayload = {
          id: userId,
          name: realName,
          age: parsedAge,
          gender: meta.gender || 'Not specified',
          bio: meta.bio || '',
          avatar_url: meta.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
          travel_styles: Array.isArray(meta.travel_styles) ? meta.travel_styles : [],
          languages: Array.isArray(meta.languages) ? meta.languages : ['English'],
          verification_status: verifStatus,
          trust_score: 5.00,
          subscription_tier: 'free',
          theme_preference: 'light',
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('users')
          .upsert([recoveredPayload], { onConflict: 'id' })
          .select()
          .single();

        if (!createError && createdProfile) {
          if (isVerificationDemo) {
            try {
              const isDevApproved = await AsyncStorage.getItem(`@maybewe_dev_verified_${userId}`);
              if (isDevApproved === 'true') {
                createdProfile.verification_status = 'verified';
                createdProfile.verified_at = createdProfile.verified_at || new Date().toISOString();
              }
            } catch { }
          }
          setProfile(createdProfile);
          return;
        }
      }

      // If sufficient real profile data does not exist in auth.users, do NOT invent fields.
      // Clearly surface that the profile needs to be completed/repaired.
      setProfile({
        id: userId,
        email: userEmail,
        name: realName || userEmail?.split('@')[0] || 'Traveler',
        verification_status: verifStatus,
        theme_preference: 'light',
        needsProfileRepair: true,
        profileError: 'User profile row is missing in public.users and required data (name, age 18+) is incomplete. Profile completion is required.',
      });

      console.warn('Profile missing or incomplete for user:', userId, error);
    } catch (err) {
      console.warn('Error fetching user profile:', err);
    }
  }

  // Login handler
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        console.log('[Auth] Attempting signInWithPassword for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        console.log('[Auth] signInWithPassword result:', {
          hasSession: !!data?.session,
          userId: data?.session?.user?.id || 'NONE',
          error: error?.message || null,
        });
        if (error) throw error;
        // Clear leftover demo session flags and reset profile before fetching real Supabase profile
        await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY]);
        setProfile(null);
        setSession(data.session);
        setIsDemoMode(false);
        await fetchSupabaseProfile(data.session.user.id);
        return { success: true, session: data.session, user: data.session.user };
      } else {
        return {
          success: false,
          error: 'Supabase authentication is not configured. Real Supabase connection required.',
        };
      }
    } catch (error) {
      console.warn('Login error:', error.message);
      let userMessage = error.message || 'Failed to sign in. Please verify your credentials.';
      if (error.message?.includes('Invalid login credentials')) {
        userMessage = 'Invalid email or password. Please check your credentials or reset your password.';
      } else if (error.message?.includes('Email not confirmed')) {
        userMessage = 'Your email address has not been confirmed yet. Please check your inbox.';
      } else if (
        error.name === 'AuthRetryableFetchError' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('Network request failed')
      ) {
        userMessage = 'Network connection error. Please check your internet connection and try again.';
      }
      return { success: false, error: userMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth sign-in via Supabase
  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Fallback for offline / demo environment
        const demoGoogleUser = {
          ...DEMO_CURRENT_USER,
          id: 'google-demo-user',
          name: 'Priya Sharma',
          email: 'priya.sharma@gmail.com',
        };
        await AsyncStorage.setItem(DEMO_AUTH_KEY, 'true');
        await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(demoGoogleUser));
        setProfile(demoGoogleUser);
        setIsDemoMode(true);
        return { success: true, isDemo: true };
      }

      if (Platform.OS === 'web') {
        // Use the full current URL origin so it works on both localhost AND tunnel URLs (ngrok, etc.)
        const currentOrigin = typeof window !== 'undefined'
          ? window.location.origin
          : undefined;
        // Build redirect back to the app root so Supabase returns to the correct host
        const redirectTo = currentOrigin || undefined;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });
        if (error) throw error;
        if (typeof window !== 'undefined' && data?.url) {
          window.location.assign(data.url);
        }
        return { success: true, redirecting: true };
      } else {
        // Native (Android / iOS)
        const redirectUrl = Linking.createURL('auth/callback', { scheme: 'solo-traveler' });
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;

        if (data?.url) {
          const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (res.type === 'success' && res.url) {
            const urlString = res.url;
            let code = null;
            let accessToken = null;
            let refreshToken = null;
            let errorParam = null;

            try {
              const parsedUrl = new URL(urlString.replace('#', '?'));
              code = parsedUrl.searchParams.get('code');
              accessToken = parsedUrl.searchParams.get('access_token');
              refreshToken = parsedUrl.searchParams.get('refresh_token');
              errorParam =
                parsedUrl.searchParams.get('error_description') ||
                parsedUrl.searchParams.get('error');
            } catch {
              const codeMatch = urlString.match(/[?&]code=([^&#]+)/);
              if (codeMatch) code = decodeURIComponent(codeMatch[1]);
              const accessMatch = urlString.match(/[?&#]access_token=([^&#]+)/);
              if (accessMatch) accessToken = decodeURIComponent(accessMatch[1]);
              const refreshMatch = urlString.match(/[?&#]refresh_token=([^&#]+)/);
              if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
              const errorMatch =
                urlString.match(/[?&#]error_description=([^&#]+)/) ||
                urlString.match(/[?&#]error=([^&#]+)/);
              if (errorMatch) errorParam = decodeURIComponent(errorMatch[1]);
            }

            if (errorParam) {
              return { success: false, error: errorParam };
            }

            if (code) {
              const { data: sessionData, error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) throw exchangeError;
              if (sessionData?.session) {
                await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY]);
                setProfile(null);
                setSession(sessionData.session);
                setIsDemoMode(false);
                await fetchSupabaseProfile(sessionData.session.user.id);
                return { success: true };
              }
            } else if (accessToken && refreshToken) {
              const { data: sessionData, error: setSessionError } =
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
              if (setSessionError) throw setSessionError;
              if (sessionData?.session) {
                await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY]);
                setProfile(null);
                setSession(sessionData.session);
                setIsDemoMode(false);
                await fetchSupabaseProfile(sessionData.session.user.id);
                return { success: true };
              }
            }
            return { success: true };
          } else if (res.type === 'cancel' || res.type === 'dismiss') {
            return { success: false, cancelled: true };
          }
          return { success: false, error: 'Google sign-in was not completed.' };
        } else {
          return { success: false, error: 'Failed to retrieve Google sign-in URL from Supabase.' };
        }
      }
    } catch (error) {
      console.warn('Google Sign-In error:', error.message);
      let userMessage = error.message || 'Failed to sign in with Google. Please try again.';
      if (
        error.name === 'AuthRetryableFetchError' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('Network request failed')
      ) {
        userMessage = 'Network connection error. Please check your internet connection and try again.';
      }
      return { success: false, error: userMessage };
    } finally {
      setIsLoading(false);
    }
  };


  // Password reset handler via Supabase
  const resetPassword = async (emailToReset, customRedirectUrl) => {
    try {
      const trimmed = emailToReset?.trim();
      if (!trimmed) {
        return { success: false, error: 'Please enter your email address.' };
      }
      if (isSupabaseConfigured) {
        let redirectTo = customRedirectUrl;
        if (!redirectTo) {
          if (Platform.OS === 'web') {
            const origin =
              typeof window !== 'undefined' && window.location?.origin
                ? window.location.origin
                : undefined;
            redirectTo = origin ? `${origin}/reset-password` : undefined;
          } else {
            // Mobile: preserve existing solo-traveler://auth/callback scheme/deep-link configuration
            redirectTo = Linking.createURL('auth/callback', { scheme: 'solo-traveler' });
          }
        }

        const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
          redirectTo,
        });
        if (error) {
          return { success: false, error: error.message || 'Failed to send password reset email.' };
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Supabase authentication is not configured. Real Supabase connection required.',
        };
      }
    } catch (error) {
      console.warn('Password reset error:', error.message);
      return { success: false, error: error.message || 'An unexpected error occurred. Please try again.' };
    }
  };

  // Update password for user in recovery session
  const updateUserPassword = async (newPassword) => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'Supabase authentication is not configured.' };
      }
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        return { success: false, error: error.message || 'Failed to update password.' };
      }
      setIsPasswordRecovery(false);
      return { success: true, data };
    } catch (err) {
      console.warn('Update user password error:', err);
      return { success: false, error: err.message || 'Failed to update password. Please try again.' };
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
        console.log('[Auth] Attempting signUp for:', userData.email);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              name: userData.name,
              age: ageNum,
              gender: userData.gender || 'Not specified',
              bio: userData.bio || '',
              avatar_url: userData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
              travel_styles: userData.travel_styles || [],
              languages: userData.languages || ['English'],
            },
          },
        });

        console.log('[Auth] signUp result:', {
          hasUser: !!authData?.user,
          hasSession: !!authData?.session,
          userId: authData?.user?.id || 'NONE',
          error: authError?.message || null,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Confirm Email is OFF for development: require the returned session before attempting the authenticated upsert
          if (!authData.session) {
            return {
              success: false,
              error: 'Signup requires email confirmation before profile creation can proceed.',
            };
          }

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
            theme_preference: 'light',
          };

          const { error: profileError } = await supabase
            .from('users')
            .upsert([profilePayload], { onConflict: 'id' });

          if (profileError) {
            console.warn('Profile creation error during signup:', profileError);
            return {
              success: false,
              error: `Profile creation failed: ${profileError.message || 'Database error'}.`,
            };
          }

          await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY]);
          setProfile({ ...profilePayload, email: userData.email });
          setSession(authData.session);
          setIsDemoMode(false);
        } else {
          return {
            success: false,
            error: 'User registration failed to establish session credentials.',
          };
        }
        return { success: true, session: authData.session, user: authData.user };
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
          theme_preference: 'light',
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
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.warn('Supabase signOut error, continuing with local cleanup:', signOutError);
        }
      }
      await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY, '@maybewe_cached_profile']);
      setSession(null);
      setProfile(null);
      setIsPasswordRecovery(false);
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
      let activeUser = session?.user;
      if (!activeUser && isSupabaseConfigured) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) activeUser = userData.user;
        } catch {}
      }

      if (isSupabaseConfigured && activeUser) {
        const userId = activeUser.id;
        // Security restriction: client cannot set verified/failed/rejected or alter verified_at
        const sanitizedUpdates = { ...updates };
        if (
          sanitizedUpdates.verification_status &&
          ['verified', 'failed', 'rejected'].includes(sanitizedUpdates.verification_status)
        ) {
          delete sanitizedUpdates.verification_status;
        }
        delete sanitizedUpdates.verified_at;

        // DB columns strictly present in public.users table
        const VALID_DB_COLUMNS = [
          'name', 'age', 'gender', 'bio', 'avatar_url',
          'travel_styles', 'languages', 'theme_preference',
          'subscription_tier'
        ];
        const dbUpdates = {};
        for (const key of Object.keys(sanitizedUpdates)) {
          if (VALID_DB_COLUMNS.includes(key)) {
            dbUpdates[key] = sanitizedUpdates[key];
          }
        }

        let updatedDbData = null;
        if (Object.keys(dbUpdates).length > 0) {
          const { data, error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', userId)
            .select()
            .maybeSingle();

          if (!error && data) {
            updatedDbData = data;
          }
        }

        // Always sync Supabase auth user_metadata so custom fields (city, state, location, avatar) persist
        try {
          await supabase.auth.updateUser({
            data: {
              ...(session?.user?.user_metadata || {}),
              ...updates,
            },
          });
        } catch (authMetaErr) {
          console.warn('Sync auth user_metadata note:', authMetaErr);
        }

        if (updates.city) {
          const locObj = {
            city: updates.city,
            district: updates.city,
            state: updates.state || 'Andhra Pradesh',
            country: 'India',
            status: 'granted',
            isGPS: false,
          };
          AsyncStorage.setItem('@maybewe_user_location', JSON.stringify(locObj)).catch(() => { });
        }

        const merged = {
          ...(profile || {}),
          ...(updatedDbData || {}),
          ...updates,
        };

        const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
        if (isDemo) {
          if (merged.verification_status === 'pending') {
            merged.verification_status = 'verified';
            merged.verified_at = merged.verified_at || new Date().toISOString();
          } else {
            try {
              const isDevApproved = await AsyncStorage.getItem(`@maybewe_dev_verified_${session.user.id}`);
              if (isDevApproved === 'true') {
                merged.verification_status = 'verified';
                merged.verified_at = merged.verified_at || new Date().toISOString();
              }
            } catch { }
          }
        }

        setProfile(merged);
        AsyncStorage.setItem('@maybewe_cached_profile', JSON.stringify(merged)).catch(() => { });
        return { success: true, profile: merged };

        // Missing-profile recovery: recover ONLY when sufficient real profile data exists
        // Do NOT invent age or required fields.
        const meta = session.user.user_metadata || {};
        const candName = (updates.name && typeof updates.name === 'string' && updates.name.trim().length > 0)
          ? updates.name.trim()
          : (meta.name && typeof meta.name === 'string' && meta.name.trim().length > 0 ? meta.name.trim() : null);
        const candAge = parseInt(updates.age !== undefined ? updates.age : meta.age, 10);
        const hasValidAge = !isNaN(candAge) && candAge >= 18;

        if (candName && hasValidAge) {
          // Determine preserved verification status:
          // Must NEVER auto-verify; preserve 'pending' if user_verifications or profile indicates pending
          let preservedVerifStatus = 'not_started';
          if (profile?.verification_status === 'pending' || sanitizedUpdates.verification_status === 'pending') {
            preservedVerifStatus = 'pending';
          } else {
            try {
              const { data: verif } = await supabase
                .from('user_verifications')
                .select('status')
                .eq('user_id', session.user.id)
                .maybeSingle();
              if (verif?.status === 'pending') {
                preservedVerifStatus = 'pending';
              }
            } catch { }
          }

          const recoveryPayload = {
            id: session.user.id,
            name: candName,
            age: candAge,
            gender: updates.gender || meta.gender || 'Not specified',
            bio: updates.bio !== undefined ? updates.bio : (meta.bio || ''),
            avatar_url: updates.avatar_url || meta.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            travel_styles: updates.travel_styles || meta.travel_styles || [],
            languages: updates.languages || meta.languages || ['English'],
            verification_status: preservedVerifStatus,
            trust_score: 5.00,
            subscription_tier: 'free',
            theme_preference: 'light',
            ...sanitizedUpdates,
          };
          delete recoveryPayload.verified_at;
          delete recoveryPayload.needsProfileRepair;
          delete recoveryPayload.profileError;
          recoveryPayload.name = candName;
          recoveryPayload.age = candAge;
          // Guardrail: Client can NEVER self-verify; preserve status (pending or not_started)
          recoveryPayload.verification_status = preservedVerifStatus;

          const { data: upsertData, error: upsertError } = await supabase
            .from('users')
            .upsert([recoveryPayload], { onConflict: 'id' })
            .select()
            .single();

          if (upsertError) {
            return {
              success: false,
              error: `Failed to create profile: ${upsertError.message || 'Database error'}`,
            };
          }

          // Also update Supabase auth user_metadata so future logins have real name and age
          try {
            await supabase.auth.updateUser({
              data: {
                name: candName,
                age: candAge,
                gender: recoveryPayload.gender,
              },
            });
          } catch (authMetaErr) {
            console.warn('Could not sync user_metadata with auth:', authMetaErr);
          }

          if (isVerificationDemo) {
            try {
              const isDevApproved = await AsyncStorage.getItem(`@maybewe_dev_verified_${session.user.id}`);
              if (isDevApproved === 'true') {
                upsertData.verification_status = 'verified';
                upsertData.verified_at = upsertData.verified_at || new Date().toISOString();
              }
            } catch { }
          }

          setProfile(upsertData);
          return { success: true, profile: upsertData };
        }

        // If sufficient real profile data does not exist, clearly surface error without fabricating data
        return {
          success: false,
          error: 'User profile row is missing in the database and required profile information (name and age >= 18) is missing. Profile completion is required.',
        };
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

  // Submit verification selfie - uploads image to private storage bucket, calls validate-selfie Edge Function,
  // and updates user profile based on Google Cloud Vision face detection.
  // Rules:
  // - Exactly 1 face -> VERIFIED
  // - 0 faces -> FAILED ("No face detected. Please upload a clear photo showing your face.")
  // - >1 faces -> FAILED ("Multiple faces detected. Please upload a photo with only you visible.")
  const submitVerification = async (selfieUri) => {
    let activeSession = session;
    if (!activeSession && isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          activeSession = sessionData.session;
          setSession(activeSession);
        }
      } catch (err) {
        console.warn('[Verification] Error retrieving session from Supabase:', err);
      }
    }

    let activeUser = activeSession?.user;
    if (!activeUser && isSupabaseConfigured) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          activeUser = userData.user;
        }
      } catch (err) {
        console.warn('[Verification] Error retrieving user from Supabase:', err);
      }
    }

    console.log('[Verification] session exists:', !!activeSession);
    console.log('[Verification] user exists:', !!activeUser);
    console.log('[Verification] user ID:', activeUser?.id || 'NONE');
    try {

      if (!selfieUri) {
        throw new Error('Please capture your selfie before submitting verification.');
      }

      // 1. Local On-Device Face Analysis via MediaPipe BlazeFace
      // Analyzes selfie on-device: requires exactly 1 face, confidence >= 0.60, and valid landmark pose
      const localResult = await analyzeSelfieOnDevice(selfieUri);
      if (!localResult.success) {
        return {
          success: false,
          status: 'failed',
          faceCount: localResult.faceCount ?? 0,
          error: localResult.error || 'Face verification failed on-device analysis.',
        };
      }

      if (isSupabaseConfigured && activeUser) {
        const userId = activeUser.id;
        const timestamp = Date.now();
        const selfiePath = `${userId}/selfie_${timestamp}.jpg`;

        // 1. Convert/read the local URI into a Supabase Storage-compatible file blob
        let fileData;
        try {
          const response = await fetch(selfieUri);
          fileData = await response.blob();
        } catch (fetchErr) {
          console.warn('Error reading selfie URI for upload:', fetchErr);
          return {
            success: false,
            status: 'failed',
            error: 'Failed to process verification selfie image. Please recapture and try again.',
          };
        }

        // 2. Upload actual selfie to private storage bucket 'verification-selfies' (NO public URL)
        const { error: uploadError } = await supabase.storage
          .from('verification-selfies')
          .upload(selfiePath, fileData, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Verification selfie upload failed:', uploadError.message);
          return {
            success: false,
            status: 'failed',
            error: `Failed to upload verification selfie: ${uploadError.message || 'Storage error'}. Please retry.`,
          };
        }

        // 3. Record pending state in user_verifications and user profile
        await supabase
          .from('user_verifications')
          .upsert({
            user_id: userId,
            selfie_path: selfiePath,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            reviewed_at: null,
          }, { onConflict: 'user_id' });

        await updateProfile({
          verification_status: 'pending',
        });

        // Isolated demo mode check (only active if explicitly set to 'demo')
        const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
        if (isDemo) {
          const nowIso = new Date().toISOString();
          await AsyncStorage.setItem(`@maybewe_dev_verified_${userId}`, 'true');
          setProfile((prev) => ({
            ...prev,
            verification_status: 'verified',
            verified_at: nowIso,
          }));
          return { success: true, status: 'verified', faceCount: 1, isDemo: true };
        }

        // 4. Call server-side 'validate-selfie' Edge Function
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('validate-selfie', {
          body: { selfiePath },
        });

        if (edgeError) {
          console.warn('validate-selfie invocation error:', edgeError);
          return {
            success: false,
            status: 'failed',
            error: edgeError.message || 'Face verification service unavailable. Please retry.',
          };
        }

        if (edgeData?.success && edgeData?.status === 'verified') {
          // Re-fetch profile from database to reflect server-side verification status and timestamp
          await fetchSupabaseProfile(userId);
          return {
            success: true,
            status: 'verified',
            faceCount: 1,
            message: edgeData.message || 'Face verified successfully. Welcome to MaybeWe!',
          };
        }

        // Specific rejection responses from server-side face detection
        if (edgeData?.faceCount === 0) {
          return {
            success: false,
            status: 'failed',
            faceCount: 0,
            error: 'No face detected. Please upload a clear photo showing your face.',
          };
        }

        if (edgeData?.faceCount > 1) {
          return {
            success: false,
            status: 'failed',
            faceCount: edgeData.faceCount,
            error: 'Multiple faces detected. Please upload a photo with only you visible.',
          };
        }

        return {
          success: false,
          status: edgeData?.status || 'failed',
          faceCount: edgeData?.faceCount,
          error: edgeData?.error || 'Face verification could not verify your photo. Please retry.',
        };
      } else {
        // Isolated offline development fallback
        const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
        if (isDemo) {
          const simulatedVerifiedAt = new Date().toISOString();
          const updates = {
            verification_status: 'verified',
            verified_at: simulatedVerifiedAt,
          };
          await updateProfile(updates);
          return { success: true, status: 'verified', faceCount: 1, isDemo: true, simulated: true };
        }

        return {
          success: false,
          status: 'failed',
          error: 'Verification service requires an active network session.',
        };
      }
    } catch (error) {
      return { success: false, status: 'failed', error: error.message };
    }
  };

  // Check current verification status from trusted database
  const checkVerificationStatus = async () => {
    try {
      let activeUser = session?.user;
      if (!activeUser && isSupabaseConfigured) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) activeUser = userData.user;
        } catch {}
      }

      if (isSupabaseConfigured && activeUser) {
        const userId = activeUser.id;
        const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
        if (isDemo) {
          const nowIso = new Date().toISOString();
          await AsyncStorage.setItem(`@maybewe_dev_verified_${userId}`, 'true');
          setProfile((prev) => ({
            ...prev,
            verification_status: 'verified',
            verified_at: prev?.verified_at || nowIso,
          }));
          return { success: true, status: 'verified', verified_at: nowIso };
        }

        let userVerificationStatus = null;
        let userVerifiedAt = null;

        // 1. Try reading verification status from public.users
        try {
          const { data, error } = await supabase
            .from('users')
            .select('verification_status, verified_at')
            .eq('id', userId)
            .maybeSingle();

          if (!error && data) {
            userVerificationStatus = data.verification_status;
            userVerifiedAt = data.verified_at;
          }
        } catch (usersErr) {
          console.warn('Could not read verification status from users table:', usersErr);
        }

        if (userVerificationStatus) {
          setProfile((prev) => ({
            ...prev,
            verification_status: userVerificationStatus,
            verified_at: userVerifiedAt,
          }));
          return { success: true, status: userVerificationStatus, verified_at: userVerifiedAt };
        }

        // 2. Fallback: If public.users is missing or unreadable, query user_verifications for the real status
        try {
          const { data: verif, error: verifErr } = await supabase
            .from('user_verifications')
            .select('status')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!verifErr && verif?.status) {
            setProfile((prev) => ({
              ...prev,
              verification_status: verif.status,
            }));
            return {
              success: true,
              status: verif.status,
              isPending: verif.status === 'pending',
            };
          }
        } catch (verifCatchErr) {
          console.warn('Error reading from user_verifications:', verifCatchErr);
        }

        return {
          success: true,
          status: profile?.verification_status || 'pending',
          isPending: true,
        };
      } else {
        // Demo mode simulation: tapping Check Status simulates moderator approval for testing
        const simulatedVerifiedAt = new Date().toISOString();
        await updateProfile({
          verification_status: 'verified',
          verified_at: simulatedVerifiedAt,
        });
        return { success: true, status: 'verified', isDemo: true, simulated: true };
      }
      return { success: false, status: profile?.verification_status || 'not_started' };
    } catch (error) {
      console.warn('Error checking verification status:', error);
      return { success: false, error: error.message };
    }
  };

  // Status update guard: Normal clients cannot assign 'verified', 'failed', or 'rejected'
  const setVerificationStatus = async (status) => {
    try {
      if (isSupabaseConfigured && session?.user) {
        if (status === 'verified' || status === 'failed' || status === 'rejected') {
          return {
            success: false,
            error: 'Security restriction: Verification decisions can only be assigned by trusted backend.',
          };
        }
        await supabase
          .from('user_verifications')
          .update({ status })
          .eq('user_id', session.user.id);
        await updateProfile({ verification_status: status });
      } else {
        // Demo mode simulation only
        const verifiedAt = status === 'verified' ? new Date().toISOString() : null;
        await updateProfile({ verification_status: status, verified_at: verifiedAt });
      }
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

  // Profile repair helper for accounts missing public.users row
  const repairProfile = async (profileData) => {
    return await updateProfile(profileData);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || (profile ? { id: profile.id, email: profile.email } : null),
        profile,
        isLoading,
        isDemoMode,
        isPasswordRecovery,
        setIsPasswordRecovery,
        hasAgreedToGuidelines,
        login,
        loginWithGoogle,
        signInWithGoogle: loginWithGoogle,
        signup,
        resetPassword,
        updateUserPassword,
        logout,
        updateProfile,
        repairProfile,
        submitVerification,
        checkVerificationStatus,
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
