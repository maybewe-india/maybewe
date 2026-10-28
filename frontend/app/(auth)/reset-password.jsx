import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, FONTS, SHADOWS, PALETTE } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InputField from '../../components/ui/InputField';
import { useAuth } from '../../lib/authContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  handleRecoveryUrl,
  sanitizeRecoveryUrlOnWeb,
  parseRecoveryUrl,
  extractTokensFromUrl,
} from '../../lib/authRecoveryHelper';

/**
 * ResetPasswordScreen
 * Supports extractTokensFromUrl, PKCE exchangeCodeForSession, direct token setSession, and token_hash verifyOtp.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { session, recoverySession, recoveryError, clearRecoveryState, setSession, logout, setIsPasswordRecovery, verifyOtpAndResetPassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const initialEmail = searchParams?.email ? String(searchParams.email) : '';
  const [manualEmail, setManualEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handledKeysRef = useRef(new Set());
  const resolvedRef = useRef(false);
  const isSubmittingPasswordRef = useRef(false);

  useEffect(() => {
    if (recoverySession?.user || session?.user) {
      setHasValidSession(true);
      setCheckingSession(false);
      setUrlError('');
    }
  }, [recoverySession, session]);

  useEffect(() => {
    if (recoveryError) {
      setUrlError(recoveryError);
      setCheckingSession(false);
    }
  }, [recoveryError]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Set New Password — MaybeWe';
    }

    let isMounted = true;

    const onSessionEstablished = (establishedSession) => {
      if (!isMounted) return;
      resolvedRef.current = true;
      if (setSession && establishedSession) {
        setSession(establishedSession);
      }
      setHasValidSession(true);
      setIsPasswordRecovery(true);
      setCheckingSession(false);
      setUrlError('');
    };

    const onError = (msg) => {
      if (!isMounted) return;
      resolvedRef.current = true;
      setUrlError(msg || 'Invalid or expired authentication link. Please request a new link.');
      setCheckingSession(false);
    };

    const isHandled = (key) => handledKeysRef.current.has(key);
    const markHandled = (key) => handledKeysRef.current.add(key);

    async function processCandidateUrl(url) {
      if (resolvedRef.current) return;
      if (!url) return;

      // Dispatches exchangeCodeForSession or setSession via unified helper
      const res = await handleRecoveryUrl({
        url,
        supabase,
        onSessionEstablished,
        onError,
        isHandled,
        markHandled,
      });

      if (res?.handled && res?.success) {
        resolvedRef.current = true;
      }
    }

    async function verifyRecoverySession() {
      try {
        setCheckingSession(true);

        // 1. Web URL check
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          await processCandidateUrl(window.location.href);
          if (resolvedRef.current) return;
        }

        // 2. Query params check
        if (searchParams && Object.keys(searchParams).length > 0) {
          const queryEntries = Object.entries(searchParams)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
          if (queryEntries) {
            await processCandidateUrl(`solo-traveler://reset-password?${queryEntries}`);
            if (resolvedRef.current) return;
          }
        }

        // 3. Native getInitialURL check
        if (Platform.OS !== 'web') {
          try {
            const initUrl = await Linking.getInitialURL();
            if (initUrl) {
              await processCandidateUrl(initUrl);
              if (resolvedRef.current) return;
            }
          } catch (mErr) {
            console.warn('[ResetPassword] getInitialURL error:', mErr?.message);
          }
        }

        // 4. Check active session in client or context
        if (isSupabaseConfigured) {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (isMounted) {
            if (currentSession?.user || session?.user) {
              setHasValidSession(true);
              setIsPasswordRecovery(true);
            } else {
              setHasValidSession(false);
            }
            setCheckingSession(false);
          }
        } else {
          if (isMounted) {
            setHasValidSession(true);
            setCheckingSession(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setHasValidSession(false);
          setCheckingSession(false);
        }
      }
    }

    // Graceful 15-second safety timer before displaying failure fallback UI
    const safetyTimer = setTimeout(() => {
      if (isMounted && !resolvedRef.current) {
        resolvedRef.current = true;
        setUrlError('Authentication request timed out. Please request a fresh reset link.');
        setCheckingSession(false);
      }
    }, 8000);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        processCandidateUrl(url);
      }
    });

    verifyRecoverySession();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription?.remove?.();
    };
  }, []);

  const handleVerifyOtpAndUpdatePassword = async () => {
    const trimmedEmail = manualEmail.trim();
    const trimmedOtp = otpCode.trim();
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedEmail) {
      setErrorMessage("Please enter your account email.");
      return;
    }
    if (!trimmedOtp) {
      setErrorMessage("Please enter the 6-digit code or reset link from your email.");
      return;
    }
    if (!trimmedPassword) {
      setErrorMessage("Please enter your new password.");
      return;
    }
    if (trimmedPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (isSupabaseConfigured) {
        let otpSuccess = false;

        // Auto-detect pasted recovery URL
        if (
          trimmedOtp.startsWith("http://") ||
          trimmedOtp.startsWith("https://") ||
          trimmedOtp.startsWith("solo-traveler://") ||
          trimmedOtp.includes("code=") ||
          trimmedOtp.includes("token=")
        ) {
          const linkRes = await handleRecoveryUrl({
            url: trimmedOtp,
            email: trimmedEmail,
            supabase,
          });
          if (linkRes?.success) {
            const { error: updateErr } = await supabase.auth.updateUser({
              password: trimmedPassword,
            });
            if (updateErr) {
              setErrorMessage(updateErr.message || "Failed to update password. Please try again.");
              return;
            }
            setIsSuccess(true);
            return;
          } else if (linkRes?.error) {
            setErrorMessage(linkRes.error);
            return;
          }
        }

        // Try raw token or OTP code verification
        if (verifyOtpAndResetPassword) {
          const verifyRes = await verifyOtpAndResetPassword(trimmedEmail, trimmedOtp, trimmedPassword);
          if (verifyRes?.success) {
            otpSuccess = true;
            setIsSuccess(true);
            return;
          }
        }

        // Fallback: Verify OTP directly
        const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: trimmedOtp,
          type: 'recovery',
        });

        if (verifyErr || !verifyData?.session) {
          setErrorMessage(verifyErr?.message || 'Invalid or expired 6-digit code. Please request a new one.');
          return;
        }

        // Established session: update password
        const { error: updateErr } = await supabase.auth.updateUser({
          password: trimmedPassword,
        });

        if (updateErr) {
          setErrorMessage(updateErr.message || 'Failed to update password. Please try again.');
          return;
        }

        setIsSuccess(true);
      } else {
        setIsSuccess(true);
      }
    } catch (err) {
      setErrorMessage(err?.message || 'An unexpected error occurred while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (isSubmittingPasswordRef.current || loading) return;

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    isSubmittingPasswordRef.current = true;
    setLoading(true);
    setErrorMessage('');

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: trimmedPassword,
        });

        if (error) {
          setErrorMessage(error.message || 'Failed to update password. Please try again.');
          return;
        }

        // Clean teardown: clear recovery isolation flag and sign out recovery session locally
        if (setIsPasswordRecovery) setIsPasswordRecovery(false);
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutErr) {
          console.warn('Local recovery signOut error:', signOutErr);
        }

        setIsSuccess(true);
      } else {
        if (setIsPasswordRecovery) setIsPasswordRecovery(false);
        setIsSuccess(true);
      }
    } catch (err) {
      console.warn('Update user password error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while resetting password.');
    } finally {
      setLoading(false);
      isSubmittingPasswordRef.current = false;
    }
  };

  const handleNavigateToLogin = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut({ scope: 'local' });
      } else if (logout) {
        await logout();
      }
    } catch (signOutErr) {
      console.warn('SignOut error during recovery teardown:', signOutErr);
      if (logout) {
        try { await logout(); } catch {}
      }
    }
    if (clearRecoveryState) clearRecoveryState();
    if (setIsPasswordRecovery) setIsPasswordRecovery(false);
    router.replace({ pathname: '/(auth)/login', params: { email: manualEmail || initialEmail } });
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar with Brand Badge */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleNavigateToLogin}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <Ionicons name="airplane" size={14} color={COLORS.lavender} style={{ marginRight: 6 }} />
            <Text style={styles.brandBadgeText}>MAYBEWE</Text>
          </View>

          <View style={{ width: 44 }} />
        </View>

        {/* Card Container */}
        <View style={styles.cardContainer}>
          {checkingSession ? (
            <View style={styles.glassFormCard}>
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color={COLORS.sunset} style={{ marginBottom: 16 }} />
                <Text style={styles.loadingTitle}>Verifying Security Token</Text>
                <Text style={styles.loadingSubtitle}>
                  Connecting to your recovery session securely...
                </Text>
              </View>
            </View>
          ) : urlError ? (
            <View style={styles.glassFormCard}>
              <View style={styles.errorIconWrapper}>
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.25)', 'rgba(220, 38, 38, 0.10)']}
                  style={styles.errorIconBadge}
                >
                  <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
                </LinearGradient>
              </View>

              <Text style={styles.errorCardTitle}>Invalid or Expired Link</Text>
              <Text style={styles.errorCardMessage}>{urlError}</Text>
              <Text style={styles.errorCardHint}>
                Password reset links are single-use and expire for your security. Please request a fresh reset link.
              </Text>

              <PrimaryButton
                title="Request New Reset Link"
                onPress={async () => {
                  try {
                    if (logout) await logout();
                  } catch {}
                  if (setIsPasswordRecovery) setIsPasswordRecovery(false);
                  router.replace('/(auth)/forgot-password');
                }}
                size="lg"
                style={styles.actionCTA}
              />

              <TouchableOpacity
                onPress={handleNavigateToLogin}
                style={styles.secondaryActionBtn}
                accessibilityRole="button"
                accessibilityLabel="Back to Sign In"
              >
                <Text style={styles.secondaryActionText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : !hasValidSession && !session?.user ? (
            showManualEntry ? (
              <>
                <View style={styles.headingSection}>
                  <Text style={styles.headingTitle}>Reset with Code</Text>
                  <Text style={styles.headingSubtitle}>
                    Enter the 6-digit code or link from your email to set a new password.
                  </Text>
                </View>

                <View style={styles.glassFormCard}>
                  <InputField
                    label="Account Email"
                    placeholder="Enter your registered email"
                    icon="mail-outline"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={manualEmail}
                    onChangeText={(t) => {
                      setManualEmail(t);
                      if (errorMessage) setErrorMessage("");
                    }}
                  />

                  <InputField
                    label="Recovery Code or Reset Link"
                    placeholder="Enter 6-digit code or paste link"
                    icon="key-outline"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={otpCode}
                    onChangeText={(t) => {
                      setOtpCode(t);
                      if (errorMessage) setErrorMessage("");
                    }}
                  />

                  <View style={styles.inputWrapper}>
                    <InputField
                      label="New Password"
                      placeholder="At least 6 characters"
                      icon="lock-closed-outline"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={(t) => {
                        setNewPassword(t);
                        if (errorMessage) setErrorMessage("");
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeToggle}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <InputField
                      label="Confirm New Password"
                      placeholder="Re-enter your new password"
                      icon="shield-checkmark-outline"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        if (errorMessage) setErrorMessage("");
                      }}
                      onSubmitEditing={handleVerifyOtpAndUpdatePassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeToggle}
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    title="Verify & Update Password"
                    loading={loading}
                    onPress={handleVerifyOtpAndUpdatePassword}
                    size="lg"
                    style={styles.actionCTA}
                  />

                  <TouchableOpacity
                    onPress={() => setShowManualEntry(false)}
                    style={styles.secondaryActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel manual entry"
                  >
                    <Text style={styles.secondaryActionText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.glassFormCard}>
                <View style={styles.errorIconWrapper}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.25)', 'rgba(217, 119, 6, 0.10)']}
                    style={styles.errorIconBadge}
                  >
                    <Ionicons name="key-outline" size={36} color="#F59E0B" />
                  </LinearGradient>
                </View>

                <Text style={styles.errorCardTitle}>Recovery Session Required</Text>
                <Text style={styles.errorCardMessage}>
                  This password reset link is invalid or has expired. Please request a new one.
                </Text>

                <PrimaryButton
                  title="Enter 6-Digit Code Manually"
                  onPress={() => setShowManualEntry(true)}
                  size="lg"
                  style={styles.actionCTA}
                />

                <PrimaryButton
                  title="Request Reset Link"
                  variant="secondary"
                  onPress={async () => {
                    try {
                      if (logout) await logout();
                    } catch {}
                    if (setIsPasswordRecovery) setIsPasswordRecovery(false);
                    router.replace('/(auth)/forgot-password');
                  }}
                  size="md"
                  style={{ width: "100%", marginBottom: 12 }}
                />

                <TouchableOpacity
                  onPress={handleNavigateToLogin}
                  style={styles.secondaryActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Sign In"
                >
                  <Text style={styles.secondaryActionText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )
          ) : !isSuccess ? (
            <>
              <View style={styles.headingSection}>
                <Text style={styles.headingTitle}>Create New Password</Text>
                <Text style={styles.headingSubtitle}>
                  Choose a strong, unique password for your MaybeWe account.
                </Text>
              </View>

              <View style={styles.glassFormCard}>
                <View style={styles.inputWrapper}>
                  <InputField
                    label="New Password"
                    placeholder="At least 6 characters"
                    icon="lock-closed-outline"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    returnKeyType="next"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeToggle}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <InputField
                    label="Confirm New Password"
                    placeholder="Re-enter your new password"
                    icon="shield-checkmark-outline"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    returnKeyType="done"
                    onSubmitEditing={handleUpdatePassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeToggle}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  title="Update Password"
                  loading={loading}
                  onPress={handleUpdatePassword}
                  size="lg"
                  style={styles.actionCTA}
                />
              </View>
            </>
          ) : (
            <View style={styles.glassFormCard}>
              <View style={styles.successIconWrapper}>
                <LinearGradient
                  colors={['rgba(52, 211, 153, 0.25)', 'rgba(16, 185, 129, 0.10)']}
                  style={styles.successIconBadge}
                >
                  <Ionicons name="checkmark-circle" size={40} color="#10B981" />
                </LinearGradient>
              </View>

              <Text style={styles.successTitle}>Password Reset Successfully</Text>
              <Text style={styles.successMessage}>
                Your password has been changed securely. You can now sign in with your new credentials.
              </Text>

              <PrimaryButton
                title="Sign In with New Password"
                onPress={handleNavigateToLogin}
                size="lg"
                style={styles.actionCTA}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADII.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D8D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D8D3',
  },
  brandBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#171716',
    letterSpacing: 2.0,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  headingSection: {
    marginBottom: 24,
  },
  headingTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    color: '#171716',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  headingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#363633',
  },
  glassFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D9D8D3',
    ...SHADOWS.subtle,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  eyeToggle: {
    position: 'absolute',
    right: 14,
    top: 38,
    padding: 4,
    zIndex: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  actionCTA: {
    marginTop: 8,
    marginBottom: 12,
  },
  secondaryActionBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryActionText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
  loadingWrapper: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  errorIconWrapper: {
    alignItems: 'center',
    marginVertical: 12,
  },
  errorIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  errorCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  errorCardMessage: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  errorCardHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successIconWrapper: {
    alignItems: 'center',
    marginVertical: 12,
  },
  successIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  successTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  successMessage: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
});
