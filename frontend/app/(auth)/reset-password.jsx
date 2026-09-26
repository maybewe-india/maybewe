import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, FONTS, SHADOWS, PALETTE } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InputField from '../../components/ui/InputField';
import { useAuth } from '../../lib/authContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, logout, setIsPasswordRecovery } = useAuth();

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

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Set New Password — MaybeWe';
    }

    let isMounted = true;

    async function verifyRecoverySession() {
      try {
        setCheckingSession(true);

        // Check for error parameters in URL on Web (e.g. expired link)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlString = window.location.href;
          let parsedError = null;

          try {
            const parsed = new URL(urlString.replace('#', '?'));
            parsedError =
              parsed.searchParams.get('error_description') ||
              parsed.searchParams.get('error');
          } catch {
            const errorMatch =
              urlString.match(/[?&#]error_description=([^&#]+)/) ||
              urlString.match(/[?&#]error=([^&#]+)/);
            if (errorMatch) parsedError = decodeURIComponent(errorMatch[1]);
          }

          if (parsedError) {
            if (isMounted) {
              setUrlError(
                parsedError.includes('expired')
                  ? 'This password reset link has expired. Please request a new one.'
                  : parsedError
              );
              setCheckingSession(false);
            }
            return;
          }

          // Check if there is a PKCE code or access_token in the URL to exchange
          const searchParams = new URLSearchParams(window.location.search);
          const hash = window.location.hash || '';
          const code = searchParams.get('code');

          if (code && isSupabaseConfigured) {
            try {
              const { data: exData, error: exErr } =
                await supabase.auth.exchangeCodeForSession(code);
              if (!exErr && exData?.session) {
                if (isMounted) {
                  setHasValidSession(true);
                  setIsPasswordRecovery(true);
                  setCheckingSession(false);
                }
                return;
              }
            } catch (exchangeCatchErr) {
              console.warn('PKCE code exchange error:', exchangeCatchErr);
            }
          } else if (hash.includes('access_token') && isSupabaseConfigured) {
            try {
              const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              if (accessToken && refreshToken) {
                const { data: sData, error: sErr } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                if (!sErr && sData?.session) {
                  if (isMounted) {
                    setHasValidSession(true);
                    setIsPasswordRecovery(true);
                    setCheckingSession(false);
                  }
                  return;
                }
              }
            } catch (hashCatchErr) {
              console.warn('Hash session parse error:', hashCatchErr);
            }
          }
        }

        // Verify active Supabase session
        if (isSupabaseConfigured) {
          const { data: { session: currentSession } } =
            await supabase.auth.getSession();
          if (isMounted) {
            if (currentSession?.user) {
              setHasValidSession(true);
              setIsPasswordRecovery(true);
            } else {
              setHasValidSession(false);
            }
            setCheckingSession(false);
          }
        } else {
          // Demo fallback: permit reset for interface testing
          if (isMounted) {
            setHasValidSession(true);
            setCheckingSession(false);
          }
        }
      } catch (err) {
        console.warn('Error verifying recovery session:', err);
        if (isMounted) {
          setHasValidSession(false);
          setCheckingSession(false);
        }
      }
    }

    verifyRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdatePassword = async () => {
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword) {
      setErrorMessage('Please enter your new password.');
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

        setIsSuccess(true);
      } else {
        // Demo mode fallback
        setIsSuccess(true);
      }
    } catch (err) {
      console.warn('Update user password error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLogin = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch {}
    setIsPasswordRecovery(false);
    router.replace('/(auth)/login');
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
              /* Session Verification Loading State */
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
              /* URL / Link Expired Error Card */
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
                  onPress={() => router.replace('/(auth)/forgot-password')}
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
              /* No Active Recovery Session Found */
              <View style={styles.glassFormCard}>
                <View style={styles.errorIconWrapper}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.25)', 'rgba(217, 119, 6, 0.10)']}
                    style={styles.errorIconBadge}
                  >
                    <Ionicons name="key-outline" size={36} color="#F59E0B" />
                  </LinearGradient>
                </View>

                <Text style={styles.errorCardTitle}>Recovery Session Expired</Text>
                <Text style={styles.errorCardMessage}>
                  No active password recovery session was detected. Please open the link directly from your reset email or request a new one.
                </Text>

                <PrimaryButton
                  title="Request Reset Link"
                  onPress={() => router.replace('/(auth)/forgot-password')}
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
            ) : !isSuccess ? (
              /* Reset Password Form */
              <>
                <View style={styles.headingSection}>
                  <Text style={styles.headingTitle}>Create New Password</Text>
                  <Text style={styles.headingSubtitle}>
                    Choose a strong, unique password for your MaybeWe account.
                  </Text>
                </View>

                <View style={styles.glassFormCard}>
                  {/* New Password Field */}
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
                        color="rgba(255, 255, 255, 0.60)"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password Field */}
                  <View style={styles.inputWrapper}>
                    <InputField
                      label="Confirm Password"
                      placeholder="Repeat your new password"
                      icon="lock-closed-outline"
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
                        color="rgba(255, 255, 255, 0.60)"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Error Box */}
                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={COLORS.danger}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  {/* Submit CTA */}
                  <PrimaryButton
                    title="Reset Password"
                    loading={loading}
                    disabled={loading}
                    onPress={handleUpdatePassword}
                    size="lg"
                    style={styles.actionCTA}
                  />

                  <View style={styles.backPromptRow}>
                    <TouchableOpacity
                      onPress={handleNavigateToLogin}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel and return to Sign In"
                    >
                      <Text style={styles.backPromptLink}>Cancel and Return to Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              /* Success Confirmation Card */
              <View style={styles.glassFormCard}>
                <View style={styles.successIconWrapper}>
                  <LinearGradient
                    colors={['rgba(52, 211, 153, 0.25)', 'rgba(16, 185, 129, 0.10)']}
                    style={styles.successIconBadge}
                  >
                    <Ionicons name="checkmark-circle-outline" size={38} color="#34D399" />
                  </LinearGradient>
                </View>

                <Text style={styles.successTitle}>Password Reset Successfully!</Text>
                <Text style={styles.successMessage}>
                  Your password has been updated. You can now sign in to your MaybeWe account using your new password.
                </Text>

                <PrimaryButton
                  title="Sign In to MaybeWe"
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
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgImage: {
    width: '100%',
    height: '100%',
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
    width: '100%',
  },
  eyeToggle: {
    position: 'absolute',
    right: 14,
    top: 38,
    padding: 6,
    zIndex: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
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
    marginBottom: 16,
  },
  backPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  backPromptLink: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
  loadingWrapper: {
    alignItems: 'center',
    paddingVertical: 32,
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
    color: '#475569',
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
    borderColor: 'rgba(220, 38, 38, 0.35)',
    backgroundColor: 'rgba(220, 38, 38, 0.10)',
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
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#475569',
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
  secondaryActionBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryActionText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#0F172A',
    textDecorationLine: 'underline',
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
    borderColor: 'rgba(5, 150, 105, 0.35)',
    backgroundColor: 'rgba(5, 150, 105, 0.10)',
  },
  successTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  successMessage: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
});
