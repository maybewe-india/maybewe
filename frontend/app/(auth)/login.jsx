import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, RADII, SHADOWS, PALETTE } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InputField from '../../components/ui/InputField';
import { useAuth } from '../../lib/authContext';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, signInWithGoogle, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      console.log('[Login] Initiating sign-in for:', trimmedEmail);
      const res = await login(trimmedEmail, password);
      console.log('[Login] handleSignIn result:', { success: res?.success, error: res?.error, userId: res?.user?.id || 'NONE' });

      if (!res?.success) {
        setErrorMessage(res?.error || 'Unable to sign in. Please verify your credentials.');
        setLoading(false);
        return;
      }

      setLoading(false);
      router.replace('/(tabs)');
    } catch (err) {
      console.warn('[Login] Unexpected error in handleSignIn:', err);
      setLoading(false);
      setErrorMessage(err.message || 'An unexpected error occurred during sign-in.');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage('');
    try {
      const googleAuth = signInWithGoogle || loginWithGoogle;
      if (typeof googleAuth !== 'function') {
        throw new Error('Google sign-in service is currently initializing. Please try again.');
      }
      const res = await googleAuth();
      if (res?.error) {
        setErrorMessage(typeof res.error === 'string' ? res.error : res.error.message || 'Google sign-in could not be completed.');
      } else if (res?.success) {
        if (!res.redirecting) {
          router.replace('/(tabs)');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred with Google sign-in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleSocialNotice = (provider) => {
    const message = `${provider} authentication is coming soon. Please use email or Google for instant access.`;
    if (Platform.OS === 'web') {
      window.alert(`${provider} Sign-In: ${message}`);
    } else {
      Alert.alert(`${provider} Sign-In`, message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentWrapper}>
          {/* Top Bar with Back Button & Brand Badge */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/welcome');
                }
              }}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to welcome"
            >
              <Ionicons name="arrow-back" size={20} color="#171716" />
            </TouchableOpacity>

            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>MAYBEWE</Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {/* Editorial Header */}
          <View style={styles.headingSection}>
            <Text style={styles.headingTitle}>Welcome back</Text>
            <Text style={styles.headingSubtitle}>Sign in to continue your journey.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <InputField
              label="Email"
              placeholder="name@traveler.io"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              accessibilityLabel="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage('');
              }}
              returnKeyType="next"
            />

            <InputField
              label="Password"
              placeholder="Your password"
              icon="lock-closed-outline"
              secureTextEntry
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotRow}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#9E3A3A" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <PrimaryButton
              title="Sign In"
              loading={loading}
              disabled={loading}
              onPress={handleSignIn}
              size="lg"
              style={styles.signInCTA}
            />

            {/* Divider */}
            <View style={styles.divRow}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>OR CONTINUE WITH</Text>
              <View style={styles.divLine} />
            </View>

            {/* Social Authentication */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleSignIn}
                disabled={loading || googleLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#171716" />
                ) : (
                  <Ionicons name="logo-google" size={19} color="#171716" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialNotice('Apple')}
                disabled={loading || googleLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Apple"
              >
                <Ionicons name="logo-apple" size={20} color="#171716" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Switch to Signup */}
          <View style={styles.signupPromptRow}>
            <Text style={styles.signupPromptText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              style={styles.signupLinkBtn}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
            >
              <Text style={styles.signupLinkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(251, 250, 247, 0.90)',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(251, 250, 247, 0.90)',
    borderWidth: 1,
    borderColor: '#D7D2C8',
  },
  brandBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#B99A5E',
    letterSpacing: 2.2,
  },
  headingSection: {
    marginBottom: 24,
  },
  headingTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    fontWeight: '800',
    color: '#171817',
    letterSpacing: -0.7,
    marginBottom: 6,
  },
  headingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#45453F',
    fontWeight: '400',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    borderRadius: RADII['2xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 8px 24px -4px rgba(23, 24, 23, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
      },
      default: {},
    }),
  },
  forgotRow: {
    alignSelf: 'flex-end',
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: -4,
  },
  forgotText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#8A8984',
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9ECEC',
    borderWidth: 1,
    borderColor: '#E8C5C5',
    borderRadius: RADII.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.semiBold,
    color: '#9E3A3A',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  signInCTA: {
    marginBottom: 20,
  },
  divRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9E8E4',
  },
  divText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#8A8984',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  socialBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D8D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  signupPromptText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#363633',
  },
  signupLinkBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  signupLinkText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#171716',
  },
});
