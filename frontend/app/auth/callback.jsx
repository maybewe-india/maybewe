import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADII, FONTS, SHADOWS } from "../../lib/theme";
import PrimaryButton from "../../components/ui/PrimaryButton";
import { useAuth } from "../../lib/authContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  handleRecoveryUrl,
  sanitizeRecoveryUrlOnWeb,
  parseRecoveryUrl,
  extractTokensFromUrl,
} from "../../lib/authRecoveryHelper";

/**
 * AuthCallbackScreen
 * Supports extractTokensFromUrl, PKCE exchangeCodeForSession, direct token setSession, and token_hash verifyOtp.
 * Connects directly to root AuthProvider recovery synchronization to eliminate warm-start deep link race conditions.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const {
    session,
    recoverySession,
    recoveryError,
    isVerifyingRecovery,
    handleIncomingRecoveryUrl,
    logout,
    setSession,
    setIsPasswordRecovery,
    setIsDemoMode,
    clearRecoveryState,
  } = useAuth();

  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const handledKeysRef = useRef(new Set());
  const resolvedRef = useRef(false);

  // 1. Reactive transition if session already established in root context
  useEffect(() => {
    if (recoverySession?.user || session?.user) {
      resolvedRef.current = true;
      setStatus("success");
      if (setIsDemoMode) setIsDemoMode(false);
      if (setIsPasswordRecovery) setIsPasswordRecovery(true);
      router.replace('/(auth)/reset-password');
    }
  }, [recoverySession, session]);

  // 2. Reactive transition if root context captured recovery error
  useEffect(() => {
    if (recoveryError) {
      resolvedRef.current = true;
      setStatus("error");
      setErrorMessage(recoveryError);
    }
  }, [recoveryError]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "Authenticating — MaybeWe";
    }

    let isMounted = true;

    const onSessionEstablished = (establishedSession) => {
      if (!isMounted) return;
      resolvedRef.current = true;
      if (setSession) setSession(establishedSession);
      if (setIsDemoMode) setIsDemoMode(false);
      if (setIsPasswordRecovery) setIsPasswordRecovery(true);
      setStatus("success");
      router.replace('/(auth)/reset-password');
    };

    const onError = (msg) => {
      if (!isMounted) return;
      resolvedRef.current = true;
      setStatus("error");
      setErrorMessage(msg || "Invalid or expired authentication link. Please request a new link.");
    };

    const isHandled = (key) => handledKeysRef.current.has(key);
    const markHandled = (key) => handledKeysRef.current.add(key);

    async function processIncomingUrl(candidateUrl) {
      if (resolvedRef.current) return;
      if (!candidateUrl) return;

      if (handleIncomingRecoveryUrl) {
        const res = await handleIncomingRecoveryUrl(candidateUrl);
        if (res?.handled && res?.success) {
          resolvedRef.current = true;
          return;
        }
      }

      // Fallback local dispatch for PKCE exchangeCodeForSession or setSession
      const localRes = await handleRecoveryUrl({
        url: candidateUrl,
        email: recoverySession?.user?.email || session?.user?.email || null,
        supabase,
        onSessionEstablished,
        onError,
        isHandled,
        markHandled,
      });

      if (localRes?.handled && localRes?.success) {
        resolvedRef.current = true;
      }
    }

    async function initializeAuthProcessing() {
      if (!isSupabaseConfigured) {
        if (!isMounted) return;
        resolvedRef.current = true;
        setStatus("success");
        if (setIsPasswordRecovery) setIsPasswordRecovery(true);
        router.replace('/(auth)/reset-password');
        return;
      }

      // Check existing session in client or context
      if (recoverySession?.user || session?.user) {
        onSessionEstablished(recoverySession || session);
        return;
      }

      // 1. Web origin check
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const webUrl = window.location.href;
        await processIncomingUrl(webUrl);
        if (resolvedRef.current) return;
      }

      // 2. Query params check (Expo Router route searchParams)
      if (searchParams && Object.keys(searchParams).length > 0) {
        const queryEntries = Object.entries(searchParams)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&");
        if (queryEntries) {
          await processIncomingUrl(`solo-traveler://auth/callback?${queryEntries}`);
          if (resolvedRef.current) return;
        }
      }

      // 3. Native Cold Start (getInitialURL)
      if (Platform.OS !== "web") {
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            await processIncomingUrl(initialUrl);
            if (resolvedRef.current) return;
          }
        } catch (linkErr) {
          console.warn("[AuthCallback] getInitialURL error:", linkErr?.message);
        }
      }

      // 4. Client session fallback check
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user && !resolvedRef.current) {
          onSessionEstablished(existingSession);
          return;
        }
      } catch (sessErr) {
        console.warn("[AuthCallback] getSession check error:", sessErr?.message);
      }

      // Fast, graceful resolution: never hang indefinitely
      setTimeout(() => {
        if (isMounted && !resolvedRef.current && !isVerifyingRecovery) {
          resolvedRef.current = true;
          setStatus("error");
          setErrorMessage(
            "No active password recovery session was detected. If you tapped a reset link, please return to the app or request a fresh link."
          );
        }
      }, 6000);
    }

    // Warm-start listener for background-to-foreground deep link delivery
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url) {
        processIncomingUrl(url);
      }
    });

    initializeAuthProcessing();

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, [searchParams]);

  if (status === "error") {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <View style={styles.errorIconBadge}>
            <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
          </View>
          <Text style={styles.errorTitle}>Authentication Link Invalid</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>

          <PrimaryButton
            title="Request New Reset Link"
            onPress={async () => {
              try {
                if (logout) await logout();
              } catch {}
              if (clearRecoveryState) clearRecoveryState();
              if (setIsPasswordRecovery) setIsPasswordRecovery(false);
              router.replace('/(auth)/forgot-password');
            }}
            size="lg"
            style={styles.actionBtn}
          />

          <TouchableOpacity
            onPress={() => {
              if (clearRecoveryState) clearRecoveryState();
              if (setIsPasswordRecovery) setIsPasswordRecovery(false);
              router.replace('/(auth)/reset-password');
            }}
            style={styles.manualEntryBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.manualEntryBtnText}>Enter Code or Paste Link Manually</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try {
                if (logout) await logout();
              } catch {}
              if (clearRecoveryState) clearRecoveryState();
              if (setIsPasswordRecovery) setIsPasswordRecovery(false);
              router.replace('/(auth)/login');
            }}
            style={styles.cancelBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel and Return to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#0F172A" style={styles.spinner} />
        <Text style={styles.loadingTitle}>Verifying Security Credentials</Text>
        <Text style={styles.loadingSubtitle}>
          Securing your session with MaybeWe. You will be redirected momentarily...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF8F5",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: RADII.xl,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9D8D3",
    ...SHADOWS.subtle,
  },
  spinner: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: "#171716",
    textAlign: "center",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  errorIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(220, 38, 38, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actionBtn: {
    width: "100%",
    marginBottom: 12,
  },
  manualEntryBtn: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  manualEntryBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "#0F172A",
    textAlign: "center",
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#64748B",
    textDecorationLine: "underline",
  },
});
