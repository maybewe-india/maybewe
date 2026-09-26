import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Reset Password — MaybeWe';
    }
  }, []);

  const handleResetPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await resetPassword(trimmed);
    setLoading(false);

    if (res.success) {
      setSubmittedEmail(trimmed);
      setIsSubmitted(true);
    } else {
      setErrorMessage(res.error || 'Failed to send password reset email. Please try again.');
    }
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setErrorMessage('');
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
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.brandBadge}>
              <Ionicons name="airplane" size={14} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.brandBadgeText}>MAYBEWE</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Card Form or Success State */}
          <View style={styles.cardContainer}>
            {!isSubmitted ? (
              <>
                {/* Header Texts */}
                <View style={styles.headingSection}>
                  <Text style={styles.headingTitle}>Reset Password</Text>
                  <Text style={styles.headingSubtitle}>
                    Enter the email associated with your account and we'll send you instructions to reset your password.
                  </Text>
                </View>

                {/* Form Card */}
                <View style={styles.glassFormCard}>
                  <InputField
                    label="Email Address"
                    placeholder="name@traveler.io"
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    title="Send Reset Link"
                    loading={loading}
                    onPress={handleResetPassword}
                    size="lg"
                    style={styles.actionCTA}
                  />

                  <View style={styles.signInPromptRow}>
                    <Text style={styles.signInPromptText}>Remember your password? </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(auth)/login')}
                      accessibilityRole="button"
                      accessibilityLabel="Sign in"
                    >
                      <Text style={styles.signInLinkText}>Sign In</Text>
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
                    <Ionicons name="mail-unread-outline" size={36} color="#34D399" />
                  </LinearGradient>
                </View>

                <Text style={styles.successTitle}>Check your inbox</Text>
                <Text style={styles.successMessage}>
                  We have sent password recovery instructions to:
                </Text>
                <Text style={styles.successEmail}>{submittedEmail}</Text>

                <Text style={styles.successHint}>
                  Follow the link in that email to choose a new password. If you don't see it within a few minutes, please check your spam folder.
                </Text>

                <PrimaryButton
                  title="Back to Sign In"
                  onPress={() => router.push('/(auth)/login')}
                  size="lg"
                  style={styles.actionCTA}
                />

                <TouchableOpacity
                  onPress={handleTryAgain}
                  style={styles.tryAgainButton}
                  accessibilityRole="button"
                  accessibilityLabel="Try a different email"
                >
                  <Text style={styles.tryAgainText}>Didn't receive it? Try a different email</Text>
                </TouchableOpacity>
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
    marginBottom: 16,
  },
  signInPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signInPromptText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#475569',
  },
  signInLinkText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
  /* Success View Styles */
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
    fontSize: 24,
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
  },
  successEmail: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
    marginVertical: 8,
  },
  successHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  tryAgainButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tryAgainText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
});
