import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InputField from '../../components/ui/InputField';
import { useAuth } from '../../lib/authContext';

const LOGIN_BG = require('../../assets/images/auth_landing_bg.jpg');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success) {
      router.replace('/(tabs)');
    } else {
      setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    await login('elena@traveler.io', 'demo1234');
    setLoading(false);
    router.replace('/(tabs)');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'If an account exists for this email, password reset instructions will be sent.',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ImageBackground
        source={LOGIN_BG}
        style={styles.bg}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        {/* Atmospheric mountain sunrise gradient overlay */}
        <LinearGradient
          colors={[
            'rgba(6, 21, 34, 0.40)',
            'rgba(6, 21, 34, 0.68)',
            'rgba(6, 21, 34, 0.90)',
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Back to welcome"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.brandBadge}>
              <Ionicons name="airplane" size={14} color={COLORS.lavender} style={{ marginRight: 6 }} />
              <Text style={styles.brandBadgeText}>MAYBEWE</Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {/* Header Texts */}
          <View style={styles.headingSection}>
            <Text style={styles.headingTitle}>Welcome back</Text>
            <Text style={styles.headingSubtitle}>Continue your journey.</Text>
          </View>

          {/* Glassmorphism Card Form */}
          <View style={styles.glassFormCard}>
            <InputField
              label="Email"
              placeholder="name@traveler.io"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
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
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <PrimaryButton
              title="Sign In"
              loading={loading}
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
                onPress={() => Alert.alert('Google Sign-In', 'Google authentication is available via Supabase OAuth in production builds.')}
                accessibilityLabel="Sign in with Google"
              >
                <Ionicons name="logo-google" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => Alert.alert('Apple Sign-In', 'Apple authentication is available via Apple ID in production builds.')}
                accessibilityLabel="Sign in with Apple"
              >
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Demo Login Option */}
            <TouchableOpacity
              onPress={handleDemoSignIn}
              style={styles.demoLoginBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="sparkles" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.demoLoginText}>Sign in as Demo Traveler (Elena)</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Switch to Signup */}
          <View style={styles.signupPromptRow}>
            <Text style={styles.signupPromptText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLinkText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  brandBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  headingSection: {
    marginBottom: 24,
  },
  headingTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  headingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  glassFormCard: {
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII['3xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(16px)',
    ...SHADOWS.card,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 125, 138, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 125, 138, 0.35)',
    borderRadius: RADII.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  signInCTA: {
    marginBottom: 20,
    borderRadius: RADII.xl,
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
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  divText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginBottom: 18,
  },
  socialBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  demoLoginText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  signupPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupPromptText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signupLinkText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
