
/**
 * Sanitizes an email address for authentication:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase for consistent uniqueness across virtual keyboards
 */
export function sanitizeAuthEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Classifies Supabase Auth error responses to prevent false-positive
 * 'email already registered' mapping on unexpected error codes.
 */
export function classifyAuthError(authError, authData) {
  // 1. Identity array collision check (Supabase GoTrue user enumeration defense)
  if (authData?.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    return {
      isCollision: true,
      userMessage: 'This email is already registered. Please sign in or reset your password.',
      code: 'user_already_registered',
    };
  }

  if (!authError) return null;

  const msg = String(authError.message || '');
  const lowerMsg = msg.toLowerCase();
  const status = authError.status || authError.statusCode;

  // 2. Rate limit (429)
  if (status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('security purposes')) {
    return {
      isCollision: false,
      userMessage: 'Too many requests. Please wait a moment before trying again.',
      code: 'over_rate_limit',
    };
  }

  // 3. Network or connection errors
  if (
    authError.name === 'AuthRetryableFetchError' ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('failed to fetch')
  ) {
    return {
      isCollision: false,
      userMessage: 'Network connection error. Please check your internet connection and try again.',
      code: 'network_error',
    };
  }

  // 4. Password validation errors
  if (lowerMsg.includes('password')) {
    return {
      isCollision: false,
      userMessage: msg,
      code: 'invalid_password',
    };
  }

  // 5. Genuine collision
  if (
    lowerMsg.includes('already registered') ||
    lowerMsg.includes('already in use') ||
    (status === 400 && lowerMsg.includes('user already exists'))
  ) {
    return {
      isCollision: true,
      userMessage: 'This email is already registered. Please sign in or reset your password.',
      code: 'user_already_registered',
    };
  }

  // 6. Generic/other error - preserve provider message honestly
  return {
    isCollision: false,
    userMessage: msg || 'Unable to complete authentication request.',
    code: authError.code || status || 'unknown_auth_error',
  };
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { DEMO_CURRENT_USER } from './demoData.js';
import { analyzeSelfieOnDevice } from './faceVerification.js';
import { handleRecoveryUrl, parseRecoveryUrl, classifyRecoveryError } from './authRecoveryHelper.js';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({
  session: null,
  setSession: () => { },
  user: null,
  profile: null,
  setProfile: () => { },
  isLoading: true,
  isDemoMode: false,
  setIsDemoMode: () => { },
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => { },
  recoverySession: null,
  setRecoverySession: () => { },
  recoveryError: null,
  setRecoveryError: () => { },
  isVerifyingRecovery: false,
  handleIncomingRecoveryUrl: async () => ({ handled: false }),
  clearRecoveryState: () => { },
  login: async () => { },
  loginWithGoogle: async () => { },
  signInWithGoogle: async () => { },
  loginWithApple: async () => { },
  signInWithApple: async () => { },
  signup: async () => { },
  resendConfirmationEmail: async () => { },
  resetPassword: async () => { },
  verifyRecoveryOtp: async () => { },
  verifyOtpAndResetPassword: async () => { },
  validateSignupCredentials: async () => { },
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


/**
 * Generates a cryptographically random raw nonce and computes its SHA-256 hash.
 * Supabase requires raw nonce during signInWithIdToken to match Apple's token hash.
 */
export async function generateCryptoNonce() {
  let rawNonce = '';
  try {
    if (Crypto && typeof Crypto.getRandomBytesAsync === 'function') {
      const bytes = await Crypto.getRandomBytesAsync(32);
      rawNonce = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {}

  if (!rawNonce) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    for (let i = 0; i < 32; i++) {
      rawNonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  let hashedNonce = rawNonce;
  try {
    if (Crypto && typeof Crypto.digestStringAsync === 'function') {
      hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
    }
  } catch {}

  return { rawNonce, hashedNonce };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [hasAgreedToGuidelines, setHasAgreedToGuidelines] = useState(false);
  const [recoverySession, setRecoverySession] = useState(null);
  const [recoveryError, setRecoveryError] = useState(null);
  const [isVerifyingRecovery, setIsVerifyingRecovery] = useState(false);
  const handledRecoveryKeysRef = React.useRef(new Set());

  const handleIncomingRecoveryUrl = async (candidateUrl) => {
    if (!candidateUrl || !isSupabaseConfigured) return { handled: false };
    setIsVerifyingRecovery(true);
    setRecoveryError(null);

    const res = await handleRecoveryUrl({
      url: candidateUrl,
      supabase,
      onSessionEstablished: (s) => {
        setRecoverySession(s);
        setSession(s);
        setIsPasswordRecovery(true);
        setIsVerifyingRecovery(false);
        setRecoveryError(null);
      },
      onError: (err) => {
        setRecoveryError(err);
        setIsVerifyingRecovery(false);
        setIsPasswordRecovery(true);
      },
      isHandled: (key) => handledRecoveryKeysRef.current.has(key),
      markHandled: (key) => handledRecoveryKeysRef.current.add(key),
    });

    if (!res?.handled) {
      setIsVerifyingRecovery(false);
    }
    return res;
  };

  const clearRecoveryState = () => {
    setRecoverySession(null);
    setRecoveryError(null);
    setIsVerifyingRecovery(false);
    setIsPasswordRecovery(false);
  };

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
              const isLocCleared = await AsyncStorage.getItem('@maybewe_profile_location_cleared');
              if (isLocCleared === 'true') {
                parsedProfile.city = '';
                parsedProfile.state = '';
                parsedProfile.location = '';
              }
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
        const parsedRecovery = parseRecoveryUrl(url);
        const isRecovery =
          parsedRecovery.kind !== 'none' ||
          url.includes('type=recovery') ||
          url.includes('reset-password') ||
          url.includes('auth/callback');

        if (isRecovery) {
          await handleIncomingRecoveryUrl(url);
          return;
        }

        let code = null;
        let accessToken = null;
        let refreshToken = null;
        let errorParam = null;

        try {
          const parsedUrl = new URL(url.replace('#', '?'));
          code = parsedUrl.searchParams.get('code');
          accessToken = parsedUrl.searchParams.get('access_token');
          refreshToken = parsedUrl.searchParams.get('refresh_token');
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
          const errorMatch =
            url.match(/[?&#]error_description=([^&#]+)/) ||
            url.match(/[?&#]error=([^&#]+)/);
          if (errorMatch) errorParam = decodeURIComponent(errorMatch[1]);
        }

        if (errorParam) {
          console.warn('Auth deep link error:', errorParam);
          return;
        }

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
          const parsed = JSON.parse(savedProfile);
          const isLocCleared = await AsyncStorage.getItem('@maybewe_profile_location_cleared');
          if (isLocCleared === 'true') {
            parsed.city = '';
            parsed.state = '';
            parsed.location = '';
          }
          setProfile(parsed);
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
        const localVerified = await AsyncStorage.getItem(`@maybewe_verified_${userId}`);
        if (localVerified === 'true' || data.verification_status === 'verified') {
          data.verification_status = 'verified';
          const localVerifiedAt = await AsyncStorage.getItem(`@maybewe_verified_at_${userId}`);
          data.verified_at = data.verified_at || localVerifiedAt || new Date().toISOString();
        } else {
          // Cross-table check: verify if user_verifications holds approved verification
          try {
            const { data: verif } = await supabase
              .from('user_verifications')
              .select('status, reviewed_at')
              .eq('user_id', userId)
              .maybeSingle();
            if (verif?.status === 'verified') {
              data.verification_status = 'verified';
              data.verified_at = data.verified_at || verif.reviewed_at || new Date().toISOString();
              await AsyncStorage.setItem(`@maybewe_verified_${userId}`, 'true');
            } else if (verif?.status) {
              data.verification_status = verif.status;
            }
          } catch (verifErr) {
            console.warn('[Auth] Error querying user_verifications in fetchSupabaseProfile:', verifErr);
          }
        }

        if (data.verification_status === 'verified') {
          setHasAgreedToGuidelines(true);
          AsyncStorage.setItem(GUIDELINES_KEY, 'true').catch(() => {});
        } else {
          try {
            const storedGuidelines = await AsyncStorage.getItem(GUIDELINES_KEY);
            if (storedGuidelines === 'true') {
              setHasAgreedToGuidelines(true);
            }
          } catch {}
        }
        const userEmail = session?.user?.email;
        const meta = session?.user?.user_metadata || {};
        let city = data.city || meta.city || '';
        let state = data.state || meta.state || '';
        let location = data.location || meta.location || '';
        if (!location && (city || state)) {
          location = [city, state].filter(Boolean).join(', ');
        }

        const isLocCleared = await AsyncStorage.getItem('@maybewe_profile_location_cleared');
        if (isLocCleared === 'true') {
          city = '';
          state = '';
          location = '';
        } else if (!location) {
          try {
            // Phase 3 & 5B: Check isolated profile location storage, then shape-check legacy @maybewe_user_location
            const profStr = await AsyncStorage.getItem('@maybewe_profile_location');
            let locObj = null;
            if (profStr) {
              locObj = JSON.parse(profStr);
            } else {
              const locStr = await AsyncStorage.getItem('@maybewe_user_location');
              if (locStr) {
                const legacyParsed = JSON.parse(locStr);
                const hasCity = typeof legacyParsed?.city === 'string' && legacyParsed.city.trim().length > 0;
                const hasLoc = typeof legacyParsed?.location === 'string' && legacyParsed.location.trim().length > 0;
                if (legacyParsed?.isGPS !== true && (legacyParsed?.isGPS === false || hasCity || hasLoc)) {
                  locObj = legacyParsed;
                }
              }
            }
            if (locObj) {
              city = city || locObj.city || '';
              state = state || locObj.state || '';
              location = locObj.location || [locObj.city, locObj.state].filter(Boolean).join(', ');
            }
          } catch {}
          if (!location) {
            try {
              const cachedStr = await AsyncStorage.getItem('@maybewe_cached_profile');
              if (cachedStr) {
                const cachedObj = JSON.parse(cachedStr);
                city = city || cachedObj.city || '';
                state = state || cachedObj.state || '';
                location = location || cachedObj.location || '';
              }
            } catch {}
          }
        }
        const enrichedProfile = {
          ...data,
          email: data.email || userEmail,
          city: city || data.city || '',
          state: state || data.state || '',
          location: location || data.location || '',
        };
        setProfile(enrichedProfile);
        AsyncStorage.setItem('@maybewe_cached_profile', JSON.stringify(enrichedProfile)).catch(() => { });
        return enrichedProfile;
      }

      // Check if we have pending signup profile data saved locally
      try {
        const pendingStr = await AsyncStorage.getItem("@maybewe_pending_signup_profile");
        if (pendingStr) {
          const pendingData = JSON.parse(pendingStr);
          if (pendingData && pendingData.name) {
            const recoveryFromPending = {
              id: userId,
              name: pendingData.name,
              age: parseInt(pendingData.age, 10) || 21,
              gender: pendingData.gender || "Not specified",
              bio: pendingData.bio || "",
              avatar_url: pendingData.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
              travel_styles: Array.isArray(pendingData.travel_styles) ? pendingData.travel_styles : [],
              languages: Array.isArray(pendingData.languages) ? pendingData.languages : ["English"],
              verification_status: "not_started",
              trust_score: 5.00,
              subscription_tier: "free",
              theme_preference: "light",
            };
            const { data: createdPending, error: pendingErr } = await supabase
              .from("users")
              .upsert([recoveryFromPending], { onConflict: "id" })
              .select()
              .single();
            if (!pendingErr && createdPending) {
              await AsyncStorage.removeItem("@maybewe_pending_signup_profile");
              setProfile({ ...createdPending, email: userEmail });
              return;
            }
          }
        }
      } catch (pendingCatch) { }

      // If public.users row is missing for the authenticated user, query user_verifications to capture real status (pending/not_started)
      let verifStatus = 'not_started';
      const localVerified = await AsyncStorage.getItem(`@maybewe_verified_${userId}`);
      if (localVerified === 'true') {
        verifStatus = 'verified';
      }
      if (verifStatus !== 'verified') {
        try {
          const { data: verif } = await supabase
            .from('user_verifications')
            .select('status')
            .eq('user_id', userId)
            .maybeSingle();
          if (verif?.status) {
            verifStatus = verif.status;
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
        const sanitizedEmail = sanitizeAuthEmail(email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
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
        const userProfile = await fetchSupabaseProfile(data.session.user.id);
        const storedGuidelines = await AsyncStorage.getItem(GUIDELINES_KEY);
        const agreed = storedGuidelines === 'true' || userProfile?.verification_status === 'verified';
        return {
          success: true,
          session: data.session,
          user: data.session.user,
          profile: userProfile,
          hasAgreedToGuidelines: agreed,
        };
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

  // Sign in with Apple via Supabase (Native iOS id_token + Android/Web OAuth fallback)
  const loginWithApple = async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Fallback for offline / demo environment
        const demoAppleUser = {
          ...DEMO_CURRENT_USER,
          id: 'apple-demo-user',
          name: 'Priya Sharma',
          email: 'priya.sharma@icloud.com',
        };
        await AsyncStorage.setItem(DEMO_AUTH_KEY, 'true');
        await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(demoAppleUser));
        setProfile(demoAppleUser);
        setIsDemoMode(true);
        return { success: true, isDemo: true };
      }

      if (Platform.OS === 'ios') {
        // Native iOS Apple Sign-In flow
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        if (!isAvailable) {
          throw new Error('Sign in with Apple is not supported on this device.');
        }

        const { rawNonce, hashedNonce } = await generateCryptoNonce();

        let credential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
          });
        } catch (appleErr) {
          if (
            appleErr?.code === 'ERR_REQUEST_CANCELED' ||
            appleErr?.code === 'ERR_CANCELED' ||
            appleErr?.code === '1001' ||
            String(appleErr?.message || '').toLowerCase().includes('cancel')
          ) {
            return { success: false, cancelled: true };
          }
          throw appleErr;
        }

        if (!credential?.identityToken) {
          throw new Error('Apple identity token was not returned from authorization.');
        }

        const { data: sessionData, error: idTokenError } =
          await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: rawNonce,
          });

        if (idTokenError) throw idTokenError;

        if (sessionData?.session) {
          await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY]);
          setProfile(null);
          setSession(sessionData.session);
          setIsDemoMode(false);

          // Extract single-shot name metadata if supplied during initial authorization
          const givenName = credential.fullName?.givenName || '';
          const familyName = credential.fullName?.familyName || '';
          const appleName = [givenName, familyName].filter(Boolean).join(' ').trim();

          const userId = sessionData.session.user.id;

          if (appleName) {
            try {
              await supabase.auth.updateUser({
                data: { name: appleName, full_name: appleName },
              });
            } catch {}

            try {
              const { data: existingUser } = await supabase
                .from('users')
                .select('id, name')
                .eq('id', userId)
                .maybeSingle();

              if (existingUser) {
                // Only update name if not already set, NEVER overwrite existing name with null
                if (!existingUser.name) {
                  await supabase
                    .from('users')
                    .update({ name: appleName })
                    .eq('id', userId);
                }
              } else {
                const initialUserRecord = {
                  id: userId,
                  name: appleName,
                  age: 21,
                  gender: 'Not specified',
                  bio: '',
                  avatar_url:
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
                  travel_styles: [],
                  languages: ['English'],
                  verification_status: 'not_started',
                  trust_score: 5.0,
                  subscription_tier: 'free',
                  theme_preference: 'light',
                };
                await supabase.from('users').upsert([initialUserRecord], { onConflict: 'id' });
              }
            } catch {}
          }

          await fetchSupabaseProfile(userId);
          return { success: true, user: sessionData.session.user };
        }
        return { success: false, error: 'Failed to establish session with Apple credentials.' };
      } else if (Platform.OS === 'web') {
        // Web Apple OAuth flow
        const currentOrigin =
          typeof window !== 'undefined' ? window.location.origin : undefined;
        const redirectTo = currentOrigin || undefined;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo,
          },
        });
        if (error) throw error;
        if (typeof window !== 'undefined' && data?.url) {
          window.location.assign(data.url);
        }
        return { success: true, redirecting: true };
      } else {
        // Android Native Apple OAuth flow via browser session
        const redirectUrl = Linking.createURL('auth/callback', { scheme: 'solo-traveler' });
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
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
                const userProfile = await fetchSupabaseProfile(sessionData.session.user.id);
                const storedGuidelines = await AsyncStorage.getItem(GUIDELINES_KEY);
                const agreed = storedGuidelines === 'true' || userProfile?.verification_status === 'verified';
                return {
                  success: true,
                  session: sessionData.session,
                  user: sessionData.session.user,
                  profile: userProfile,
                  hasAgreedToGuidelines: agreed,
                };
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
                const userProfile = await fetchSupabaseProfile(sessionData.session.user.id);
                const storedGuidelines = await AsyncStorage.getItem(GUIDELINES_KEY);
                const agreed = storedGuidelines === 'true' || userProfile?.verification_status === 'verified';
                return {
                  success: true,
                  session: sessionData.session,
                  user: sessionData.session.user,
                  profile: userProfile,
                  hasAgreedToGuidelines: agreed,
                };
              }
            }
            return { success: true };
          } else if (res.type === 'cancel' || res.type === 'dismiss') {
            return { success: false, cancelled: true };
          }
          return { success: false, error: 'Apple sign-in was not completed.' };
        } else {
          return { success: false, error: 'Failed to retrieve Apple sign-in URL from Supabase.' };
        }
      }
    } catch (error) {
      if (
        error?.code === 'ERR_REQUEST_CANCELED' ||
        error?.code === 'ERR_CANCELED' ||
        error?.code === '1001' ||
        String(error?.message || '').toLowerCase().includes('cancel')
      ) {
        return { success: false, cancelled: true };
      }
      console.warn('Apple Sign-In error:', error.message);
      let userMessage = error.message || 'Failed to sign in with Apple. Please try again.';
      if (
        error.name === 'AuthRetryableFetchError' ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('Network request failed')
      ) {
        userMessage =
          'Network connection error. Please check your internet connection and try again.';
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
                const userProfile = await fetchSupabaseProfile(sessionData.session.user.id);
                const storedGuidelines = await AsyncStorage.getItem(GUIDELINES_KEY);
                const agreed = storedGuidelines === 'true' || userProfile?.verification_status === 'verified';
                return {
                  success: true,
                  session: sessionData.session,
                  user: sessionData.session.user,
                  profile: userProfile,
                  hasAgreedToGuidelines: agreed,
                };
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
                const userProfile = await fetchSupabaseProfile(sessionData.session.user.id);
                const storedGuidelines = await AsyncStorage.getItem(GUIDELINES_KEY);
                const agreed = storedGuidelines === 'true' || userProfile?.verification_status === 'verified';
                return {
                  success: true,
                  session: sessionData.session,
                  user: sessionData.session.user,
                  profile: userProfile,
                  hasAgreedToGuidelines: agreed,
                };
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


  // Resend signup confirmation email via Supabase
  const resendConfirmationEmail = async (emailToResend) => {
    try {
      const trimmed = sanitizeAuthEmail(emailToResend);
      if (!trimmed) {
        return { success: false, error: 'Please enter your email address.' };
      }
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: trimmed,
        });
        if (error) {
          return { success: false, error: error.message || 'Failed to resend confirmation email.' };
        }
        return { success: true, message: 'Confirmation email resent! Please check your inbox.' };
      }
      return { success: true, message: 'Demo mode: confirmation email simulated.' };
    } catch (err) {
      return { success: false, error: err.message || 'An error occurred resending confirmation email.' };
    }
  };

  // Password reset handler via Supabase
  const resetPassword = async (emailToReset, customRedirectUrl) => {
    try {
      const trimmed = sanitizeAuthEmail(emailToReset);
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
          const lower = String(error.message || '').toLowerCase();
          // Safe handling for unknown accounts: prevent email enumeration
          const isUnknownUser =
            lower.includes('user not found') ||
            lower.includes('email not found') ||
            error.status === 404 ||
            error.code === 'user_not_found';
          if (isUnknownUser) {
            return { success: true };
          }
          // Rate limit handling
          if (
            error.status === 429 ||
            lower.includes('rate limit') ||
            lower.includes('too many requests') ||
            lower.includes('security purposes') ||
            lower.includes('over_email_send_rate_limit')
          ) {
            return {
              success: false,
              error: 'Too many reset requests. Please wait a few minutes before trying again.',
            };
          }
          // Network errors: friendly user message
          if (
            lower.includes('failed to fetch') ||
            lower.includes('network') ||
            lower.includes('timeout') ||
            lower.includes('offline') ||
            lower.includes('network request failed')
          ) {
            return {
              success: false,
              error: "You're offline. Check your internet connection and try again.",
            };
          }
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

function parseRecoveryToken(tokenOrUrl) {
  let str = String(tokenOrUrl || '').trim();
  if (!str) return { error: 'Please enter your recovery code or paste your reset link.' };

  // 1. Unwrap Google Mail / SafeLinks wrapped URLs if present
  if (str.includes('google.com/url') || str.includes('/safelinks.')) {
    try {
      const wrapped = new URL(str.replace(/^[<"'`]+|[>"'`]+$/g, ''));
      const realTarget = wrapped.searchParams.get('q') || wrapped.searchParams.get('url');
      if (realTarget) str = decodeURIComponent(realTarget);
    } catch {}
  }

  // 2. Direct 6-digit numeric OTP code
  if (/^\d{6}$/.test(str)) {
    return { token: str };
  }

  // 3. Inspect URL or parameter string
  if (
    str.includes('://') ||
    str.includes('token=') ||
    str.includes('token_hash=') ||
    str.includes('code=') ||
    str.includes('access_token=')
  ) {
    try {
      const cleanStr = str.replace(/^[<"'`]+|[>"'`]+$/g, '');
      const url = new URL(cleanStr.replace('#', '?'));

      // Check for error parameters passed back by Supabase
      const errorDesc = url.searchParams.get('error_description') || url.searchParams.get('error');
      if (errorDesc) {
        const cleanErr = decodeURIComponent(errorDesc).replace(/\+/g, ' ');
        return {
          error: cleanErr.toLowerCase().includes('expired')
            ? 'This password reset link has expired. Please request a new link.'
            : cleanErr,
        };
      }

      const type = url.searchParams.get('type');
      if (type && type !== 'recovery') {
        return {
          error: 'This confirmation link is for ' + type + ', not password recovery. Please use the password reset link from your email.',
        };
      }

      if (
        url.protocol.startsWith('http') &&
        !url.hostname.includes('supabase') &&
        !url.pathname.includes('auth') &&
        !url.pathname.includes('reset-password') &&
        type !== 'recovery'
      ) {
        return { error: 'No valid password recovery token found in this link.' };
      }

      // Check for PKCE authorization code (?code=...)
      const code = url.searchParams.get('code');
      if (code) {
        return { code };
      }

      // Check for implicit tokens in URL / fragment
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }

      // Check for Supabase verify token parameter
      const token = url.searchParams.get('token') || url.searchParams.get('token_hash');
      if (token) {
        return { token_hash: token };
      }
    } catch {
      // Regex fallback for partial URL strings
      const errMatch = str.match(/(?:[?&]|^)(?:error_description|error)=([^&#\s]+)/);
      if (errMatch) {
        return { error: decodeURIComponent(errMatch[1]).replace(/\+/g, ' ') };
      }

      const typeMatch = str.match(/(?:[?&]|^)type=([^&#\s]+)/);
      if (typeMatch && decodeURIComponent(typeMatch[1]) !== 'recovery') {
        return {
          error: 'This confirmation link is for ' + decodeURIComponent(typeMatch[1]) + ', not password recovery. Please use the password reset link from your email.',
        };
      }

      const codeMatch = str.match(/(?:[?&]|^)code=([^&#\s]+)/);
      if (codeMatch) {
        return { code: decodeURIComponent(codeMatch[1]) };
      }

      const accessMatch = str.match(/(?:[?&#]|^)access_token=([^&#\s]+)/);
      const refreshMatch = str.match(/(?:[?&#]|^)refresh_token=([^&#\s]+)/);
      if (accessMatch && refreshMatch) {
        return {
          accessToken: decodeURIComponent(accessMatch[1]),
          refreshToken: decodeURIComponent(refreshMatch[1]),
        };
      }

      const match = str.match(/(?:[?&]|^)(?:token|token_hash)=([^&#\s]+)/);
      if (match) return { token_hash: decodeURIComponent(match[1]) };
    }
  }

  // 4. Raw token hash string (alphanumeric >= 20 chars)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) {
    return { token_hash: str };
  }

  // 5. Malformed or unrecognized input (distinguish invalid format from API errors)
  return {
    error: "Invalid recovery format. Please paste the complete reset link from your email or enter a valid 6-digit code.",
  };
}

  // Verify recovery OTP code or reset link to establish authenticated recovery session (Session Gate)
  const verifyRecoveryOtp = async (emailAddress, tokenCode) => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'Supabase authentication is not configured.' };
      }
      const trimmedEmail = sanitizeAuthEmail(emailAddress);
      const rawInput = String(tokenCode || '').trim();

      if (!rawInput) {
        return { success: false, error: 'Please enter your recovery code or paste your reset link.' };
      }

      const parsed = parseRecoveryToken(rawInput);
      if (parsed.error) {
        return { success: false, error: parsed.error };
      }

      let session = null;
      let user = null;

      // Modality 1: PKCE authorization code exchange (?code=...)
      if (parsed.code) {
        console.log('[Auth] Exchanging PKCE code for session (code len:', parsed.code.length, ')');
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (error || !data?.session) {
          console.warn('[Auth] exchangeCodeForSession error:', error?.message);
          return {
            success: false,
            error: error?.message || 'Invalid or expired authorization code. Please request a fresh reset link.',
          };
        }
        session = data.session;
        user = data.user;
      }
      // Modality 2: Set session from implicit access/refresh tokens (#access_token=...)
      else if (parsed.accessToken && parsed.refreshToken) {
        console.log('[Auth] Setting session from URL tokens (access_token len:', parsed.accessToken.length, ')');
        const { data, error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });
        if (error || !data?.session) {
          console.warn('[Auth] setSession error:', error?.message);
          return {
            success: false,
            error: error?.message || 'Invalid or expired session token. Please request a fresh reset link.',
          };
        }
        session = data.session;
        user = data.user;
      }
      // Modality 3: Direct token_hash from default Supabase verification link (?token=... / ?token_hash=...)
      else if (parsed.token_hash) {
        console.log('[Auth] Verifying recovery token_hash (len:', parsed.token_hash.length, ', type: recovery)');
        let { data, error } = await supabase.auth.verifyOtp({
          token_hash: parsed.token_hash,
          type: 'recovery',
        });
        // Dual-modality fallback: If rejected and email is provided, attempt email+token verification
        if ((error || !data?.session) && trimmedEmail) {
          const fallback = await supabase.auth.verifyOtp({
            email: trimmedEmail,
            token: parsed.token_hash,
            type: 'recovery',
          });
          if (!fallback.error && fallback.data?.session) {
            data = fallback.data;
            error = null;
          }
        }
        if (error || !data?.session) {
          console.warn('[Auth] verifyOtp token_hash error:', error?.message);
          const isExpired = error?.message?.toLowerCase().includes('expired') || error?.code === 'otp_expired';
          const isAlreadyUsed = error?.message?.toLowerCase().includes('already');
          const isInvalid = error?.message?.toLowerCase().includes('invalid');
          let errMsg = error?.message || 'Verification failed. Please check the link or request a new one.';
          if (isExpired) {
            errMsg = 'This reset link or code has expired. Please request a fresh reset link.';
          } else if (isAlreadyUsed) {
            errMsg = 'This reset link has already been opened or used. Please request a fresh reset link.';
          } else if (isInvalid) {
            errMsg = 'The recovery link or code is invalid. Please make sure you copied the complete link from your latest email.';
          }
          return {
            success: false,
            error: errMsg,
          };
        }
        session = data.session;
        user = data.user;
      }
      // Modality 4: 6-digit numeric OTP code
      else if (parsed.token) {
        if (!trimmedEmail) {
          return { success: false, error: 'Please enter your email address.' };
        }
        console.log('[Auth] Verifying recovery OTP code (len:', parsed.token.length, ', type: recovery)');
        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: parsed.token,
          type: 'recovery',
        });
        if (error || !data?.session) {
          console.warn('[Auth] verifyOtp token error:', error?.message);
          const isExpired = error?.message?.toLowerCase().includes('expired') || error?.code === 'otp_expired';
          const isInvalid = error?.message?.toLowerCase().includes('invalid');
          let errMsg = error?.message || 'Invalid or expired recovery code. Please check your email or request a new code.';
          if (isExpired) {
            errMsg = 'This 6-digit recovery code has expired. Please request a new code.';
          } else if (isInvalid) {
            errMsg = 'Invalid 6-digit code. Note: If your email only provides a reset link, please paste the full link instead.';
          }
          return {
            success: false,
            error: errMsg,
          };
        }
        session = data.session;
        user = data.user;
      } else {
        return { success: false, error: 'No valid recovery token found in input.' };
      }

      setSession(session);
      setUser(user);
      setIsPasswordRecovery(true);
      setIsDemoMode(false);
      return { success: true, session, user };
    } catch (err) {
      console.warn('verifyRecoveryOtp unexpected error:', err);
      return { success: false, error: err?.message || 'Failed to verify recovery code. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify recovery OTP code and update password directly in-app without relying on browser redirects
  const verifyOtpAndResetPassword = async (emailAddress, tokenCode, newPassword) => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'Supabase authentication is not configured.' };
      }
      const trimmedEmail = sanitizeAuthEmail(emailAddress);
      const rawInput = String(tokenCode || '').trim();
      const trimmedPassword = String(newPassword || '').trim();

      if (!rawInput) {
        return { success: false, error: 'Please enter your recovery code or paste your reset link.' };
      }
      if (!trimmedPassword || trimmedPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters.' };
      }

      const parsed = parseRecoveryToken(rawInput);
      if (parsed.error) {
        return { success: false, error: parsed.error };
      }

      let session = null;

      if (parsed.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (error || !data?.session) {
          return { success: false, error: error?.message || 'Invalid or expired authorization code.' };
        }
        session = data.session;
      } else if (parsed.accessToken && parsed.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });
        if (error || !data?.session) {
          return { success: false, error: error?.message || 'Invalid or expired session token.' };
        }
        session = data.session;
      } else if (parsed.token_hash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: parsed.token_hash,
          type: 'recovery',
        });
        if (error || !data?.session) {
          return { success: false, error: error?.message || 'Invalid or expired recovery code.' };
        }
        session = data.session;
      } else if (parsed.token) {
        if (!trimmedEmail) {
          return { success: false, error: 'Please enter your email address.' };
        }
        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: parsed.token,
          type: 'recovery',
        });
        if (error || !data?.session) {
          return { success: false, error: error?.message || 'Invalid or expired recovery code.' };
        }
        session = data.session;
      } else {
        return { success: false, error: 'No valid recovery token recognized.' };
      }

      setSession(session);
      setIsDemoMode(false);

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (updateError) {
        console.warn('[Auth] updateUser password error after OTP verify:', updateError?.message);
        return {
          success: false,
          error: updateError?.message || 'Failed to update password after code verification.',
        };
      }

      setIsPasswordRecovery(false);
      return { success: true, user: updateData?.user, session };
    } catch (err) {
      console.warn('verifyOtpAndResetPassword unexpected error:', err);
      return { success: false, error: err?.message || 'An unexpected error occurred. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-validate signup credentials at Step 1 (pure client-side validation, zero network side-effects)
  const validateSignupCredentials = async ({ email, password, age, name }) => {
    try {
      const trimmedName = String(name || "").trim();
      if (!trimmedName) {
        return { success: false, error: "Please enter your full name." };
      }
      const sanitizedEmail = sanitizeAuthEmail(email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
        return { success: false, error: "Please enter a valid email address." };
      }
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 18) {
        return { success: false, error: "You must be at least 18 years old to join MaybeWe." };
      }
      if (!password || password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters." };
      }

      // Defer account creation exclusively to final submission (Step 5)
      return {
        success: true,
        email: sanitizedEmail,
      };
    } catch (err) {
      console.warn("validateSignupCredentials error:", err);
      return { success: false, error: err?.message || "Validation error." };
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

      const sanitizedEmail = sanitizeAuthEmail(userData.email);
      const sanitizedName = String(userData.name || '').trim();
      const sanitizedBio = String(userData.bio || '').trim();

      if (isSupabaseConfigured) {
        console.log('[Auth] Attempting signUp for:', sanitizedEmail);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: userData.password,
          options: {
            data: {
              name: sanitizedName,
              age: ageNum,
              gender: userData.gender || 'Not specified',
              bio: sanitizedBio,
              avatar_url: userData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
              travel_styles: userData.travel_styles || [],
              languages: userData.languages || ['English'],
            },
          },
        });

        console.log('[Auth] signUp result:', {
          hasUser: !!authData?.user,
          hasSession: !!authData?.session,
          identitiesCount: authData?.user?.identities?.length ?? 'none',
          userId: authData?.user?.id || 'NONE',
          error: authError?.message || null,
        });

        if (authError) {
          const classified = classifyAuthError(authError, authData);
          return {
            success: false,
            error: classified?.userMessage || authError.message || 'Unable to complete signup.',
            code: classified?.code || authError.status,
          };
        }

        if (authData.user) {
          // Check for existing user collision when identities array is empty (Supabase GoTrue enumeration defense)
          if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
            return {
              success: false,
              error: 'This email is already registered. Please sign in or reset your password.',
              alreadyRegistered: true,
              code: 'user_already_registered',
            };
          }

          let resolvedAvatarUrl = userData.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80";
          if (authData.session && resolvedAvatarUrl && !resolvedAvatarUrl.startsWith("http://") && !resolvedAvatarUrl.startsWith("https://")) {
            try {
              const { uploadAvatarMedia } = await import("./mediaUpload");
              const uploadedUrl = await uploadAvatarMedia({
                userId: authData.user.id,
                photoUri: resolvedAvatarUrl,
              });
              if (uploadedUrl) {
                resolvedAvatarUrl = uploadedUrl;
              }
            } catch (mediaErr) {
              console.warn("[Signup] Avatar upload deferred or failed, keeping URI:", mediaErr);
            }
          }

          const profilePayload = {
            id: authData.user.id,
            name: sanitizedName,
            age: ageNum,
            gender: userData.gender || "Not specified",
            bio: sanitizedBio,
            avatar_url: resolvedAvatarUrl,
            travel_styles: userData.travel_styles || [],
            languages: userData.languages || ["English"],
            verification_status: "not_started",
            trust_score: 5.00,
            subscription_tier: "free",
            theme_preference: "light",
          };

          // If email confirmation is enabled and session is not immediately returned
          if (!authData.session) {
            await AsyncStorage.setItem(
              "@maybewe_pending_signup_profile",
              JSON.stringify({ ...profilePayload, email: sanitizedEmail })
            );
            return {
              success: true,
              needsEmailConfirmation: true,
              message: "Account created! Please check your email to confirm your account before signing in.",
            };
          }

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

          await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY, '@maybewe_cached_profile', GUIDELINES_KEY]);
          setHasAgreedToGuidelines(false);
          setProfile({ ...profilePayload, email: sanitizedEmail });
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
          name: sanitizedName || 'Solo Explorer',
          email: sanitizedEmail || 'explorer@traveler.io',
          age: ageNum,
          gender: userData.gender || 'Not specified',
          bio: sanitizedBio || 'Eager to discover hidden corners and friendly travel companions.',
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
        await AsyncStorage.removeItem(GUIDELINES_KEY);
        setHasAgreedToGuidelines(false);
        setProfile(newProfile);
        setIsDemoMode(true);
        return { success: true };
      }
    } catch (error) {
      console.warn('Signup error:', error.message);
      const classified = classifyAuthError(error, null);
      return { success: false, error: classified?.userMessage || error.message || 'Unable to complete signup.' };
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
      await AsyncStorage.multiRemove([DEMO_AUTH_KEY, DEMO_PROFILE_KEY, '@maybewe_cached_profile', GUIDELINES_KEY]);
      setHasAgreedToGuidelines(false);
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

  // Delete Account handler (Full Cascade Purge & Session Termination)
  const deleteAccount = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        // Invoke delete-account Edge Function (official Supabase Storage API + admin cascade)
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('delete-account', {
          method: 'POST',
        });

        if (edgeErr) {
          console.warn('[Auth] delete-account Edge Function invoke error:', edgeErr);
          return {
            success: false,
            error: edgeErr.message || 'Failed to securely delete account and storage files.',
          };
        }

        if (edgeData && !edgeData.success) {
          return {
            success: false,
            error: edgeData.error || 'Server error occurred during account deletion.',
          };
        }

        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          console.warn('[Auth] Sign out error post-deletion:', signOutErr);
        }
      }

      // Comprehensive local storage & session state purge
      await AsyncStorage.multiRemove([
        DEMO_AUTH_KEY,
        DEMO_PROFILE_KEY,
        '@maybewe_cached_profile',
        GUIDELINES_KEY,
        '@solo_traveler_stored_trips',
        '@solo_traveler_chat_reads',
        '@maybewe_theme_preference',
      ]);

      setHasAgreedToGuidelines(false);
      setSession(null);
      setProfile(null);
      setIsPasswordRecovery(false);
      setIsDemoMode(false);

      return { success: true };
    } catch (err) {
      console.warn('[Auth] deleteAccount exception:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during account deletion.' };
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

        const isClearingLocation =
          (updates.location !== undefined && (updates.location === null || (typeof updates.location === 'string' && updates.location.trim() === ''))) &&
          (!updates.city || (typeof updates.city === 'string' && updates.city.trim() === ''));

        const hasNewLocation =
          Boolean(updates.city || updates.location) &&
          ((typeof updates.location === 'string' && updates.location.trim().length > 0) ||
           (typeof updates.city === 'string' && updates.city.trim().length > 0));

        if (isClearingLocation) {
          try {
            await AsyncStorage.removeItem('@maybewe_profile_location');
            await AsyncStorage.setItem('@maybewe_profile_location_cleared', 'true');
            const legacyStr = await AsyncStorage.getItem('@maybewe_user_location');
            if (legacyStr) {
              const legacyObj = JSON.parse(legacyStr);
              if (legacyObj && legacyObj.isGPS !== true) {
                await AsyncStorage.removeItem('@maybewe_user_location');
              }
            }
          } catch (e) {}
        } else if (hasNewLocation) {
          try {
            await AsyncStorage.removeItem('@maybewe_profile_location_cleared');
            const locCity = updates.city || (updates.location ? updates.location.split(',')[0].trim() : '');
            const locState = updates.state || (updates.location && updates.location.includes(',') ? updates.location.split(',')[1].trim() : 'India');
            const locFull = updates.location || [locCity, locState].filter(Boolean).join(', ');
            const locObj = {
              city: locCity,
              district: locCity,
              state: locState,
              location: locFull,
              country: 'India',
              status: 'granted',
              isGPS: false,
            };
            await AsyncStorage.setItem('@maybewe_profile_location', JSON.stringify(locObj));
          } catch (e) {}
        }

        const merged = {
          ...(profile || {}),
          ...(updatedDbData || {}),
          ...updates,
        };
        if (isClearingLocation) {
          merged.location = '';
          merged.city = '';
          merged.state = '';
        }

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
        const isClearingLocation =
          (updates.location !== undefined && (updates.location === null || (typeof updates.location === 'string' && updates.location.trim() === ''))) &&
          (!updates.city || (typeof updates.city === 'string' && updates.city.trim() === ''));

        const hasNewLocation =
          Boolean(updates.city || updates.location) &&
          ((typeof updates.location === 'string' && updates.location.trim().length > 0) ||
           (typeof updates.city === 'string' && updates.city.trim().length > 0));

        const updated = { ...profile, ...updates };
        if (isClearingLocation) {
          updated.city = '';
          updated.state = '';
          updated.location = '';
          try {
            await AsyncStorage.removeItem('@maybewe_profile_location');
            await AsyncStorage.setItem('@maybewe_profile_location_cleared', 'true');
            const legacyStr = await AsyncStorage.getItem('@maybewe_user_location');
            if (legacyStr) {
              const legacyObj = JSON.parse(legacyStr);
              if (legacyObj && legacyObj.isGPS !== true) {
                await AsyncStorage.removeItem('@maybewe_user_location');
              }
            }
          } catch (e) {}
        } else if (hasNewLocation) {
          try {
            await AsyncStorage.removeItem('@maybewe_profile_location_cleared');
            const locCity = updates.city || (updates.location ? updates.location.split(',')[0].trim() : '');
            const locState = updates.state || (updates.location && updates.location.includes(',') ? updates.location.split(',')[1].trim() : 'India');
            const locFull = updates.location || [locCity, locState].filter(Boolean).join(', ');
            const locObj = {
              city: locCity,
              district: locCity,
              state: locState,
              location: locFull,
              country: 'India',
              status: 'granted',
              isGPS: false,
            };
            await AsyncStorage.setItem('@maybewe_profile_location', JSON.stringify(locObj));
          } catch (e) {}
        }
        await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(updated));
        await AsyncStorage.setItem('@maybewe_cached_profile', JSON.stringify(updated));
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

        // 3. Record pending state in user_verifications
        try {
          await supabase
            .from('user_verifications')
            .upsert({
              user_id: userId,
              selfie_path: selfiePath,
              status: 'pending',
              submitted_at: new Date().toISOString(),
              reviewed_at: null,
            }, { onConflict: 'user_id' });
        } catch (uvErr) {
          console.warn('Error recording user_verifications:', uvErr);
        }

        // 4. Invoke validate-selfie Edge Function
        let edgeVerified = false;
        try {
          const edgeRes = await supabase.functions.invoke('validate-selfie', {
            body: { selfiePath },
          });
          if (edgeRes?.data?.success && edgeRes?.data?.status === 'verified') {
            edgeVerified = true;
          }
        } catch (edgeErr) {
          console.log('[Verification] Edge function note:', edgeErr?.message || edgeErr);
        }

        // 5. Authoritative backend status handling:
        // Do not mark user verified locally if backend verification did not confirm approval!
        if (edgeVerified) {
          const nowIso = new Date().toISOString();
          await AsyncStorage.setItem(`@maybewe_verified_${userId}`, 'true');
          await AsyncStorage.setItem(`@maybewe_verified_at_${userId}`, nowIso);
          const updatedProfile = {
            ...(profile || {}),
            id: userId,
            verification_status: 'verified',
            verified_at: nowIso,
          };
          setProfile(updatedProfile);
          AsyncStorage.setItem('@maybewe_cached_profile', JSON.stringify(updatedProfile)).catch(() => {});

          return {
            success: true,
            status: 'verified',
            faceCount: 1,
            message: localResult.message || 'Face verified successfully. Welcome to MaybeWe!',
          };
        } else {
          // Verification submitted to backend; status is pending review
          const updatedProfile = {
            ...(profile || {}),
            id: userId,
            verification_status: 'pending',
          };
          setProfile(updatedProfile);
          AsyncStorage.setItem('@maybewe_cached_profile', JSON.stringify(updatedProfile)).catch(() => {});

          return {
            success: true,
            status: 'pending',
            isPending: true,
            faceCount: 1,
            message: 'Verification selfie uploaded. Verification is pending approval.',
          };
        }
      } else {
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

        const localVerified = await AsyncStorage.getItem(`@maybewe_verified_${userId}`);
        if (localVerified === 'true') {
          const localVerifiedAt = await AsyncStorage.getItem(`@maybewe_verified_at_${userId}`);
          const verifiedAt = localVerifiedAt || new Date().toISOString();
          setProfile((prev) => ({
            ...prev,
            verification_status: 'verified',
            verified_at: verifiedAt,
          }));
          return { success: true, status: 'verified', verified_at: verifiedAt };
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
            .eq('user_id', userId)
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
        setSession,
        user: session?.user || (profile ? { id: profile.id, email: profile.email } : null),
        profile,
        setProfile,
        isLoading,
        isDemoMode,
        setIsDemoMode,
        isPasswordRecovery,
        setIsPasswordRecovery,
        recoverySession,
        setRecoverySession,
        recoveryError,
        setRecoveryError,
        isVerifyingRecovery,
        handleIncomingRecoveryUrl,
        clearRecoveryState,
        hasAgreedToGuidelines,
        login,
        loginWithGoogle,
        signInWithGoogle: loginWithGoogle,
        loginWithApple,
        signInWithApple: loginWithApple,
        signup,
        resendConfirmationEmail,
        resetPassword,
        verifyRecoveryOtp,
        verifyOtpAndResetPassword,
        validateSignupCredentials,
        updateUserPassword,
        logout,
        deleteAccount,
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
