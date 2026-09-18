import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../lib/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const AUTH_BG = require('../../assets/images/auth_landing_bg.jpg');
const LOGO_MARK = require('../../assets/images/app_logo_glow.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Subtle calm entrance animations
  const fadeBg = useRef(new Animated.Value(0)).current;
  const fadeBrand = useRef(new Animated.Value(0)).current;
  const slideBrand = useRef(new Animated.Value(14)).current;
  const fadeButtons = useRef(new Animated.Value(0)).current;
  const slideButtons = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeBg, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(fadeBrand, { toValue: 1, duration: 750, useNativeDriver: true }),
          Animated.timing(slideBrand, { toValue: 0, duration: 750, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeButtons, { toValue: 1, duration: 750, useNativeDriver: true }),
          Animated.timing(slideButtons, { toValue: 0, duration: 750, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Enter your email on the sign-in screen to receive password reset instructions.',
      [
        { text: 'Go to Sign In', onPress: () => router.push('/(auth)/login') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Full-Screen Cinematic Mountain Sunrise Background */}
      <Animated.View style={[styles.bgWrapper, { opacity: fadeBg }]}>
        <ImageBackground
          source={AUTH_BG}
          style={styles.bgImage}
          imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          resizeMode="cover"
        >
          {/* Subtle natural vignette for perfect contrast without darkening landscape */}
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0.08)',
              'transparent',
              'rgba(0, 0, 0, 0.06)',
              'rgba(6, 18, 30, 0.35)',
            ]}
            locations={[0, 0.3, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={[
              styles.contentContainer,
              {
                paddingTop: Math.max(insets.top, 24) + 12,
                paddingBottom: Math.max(insets.bottom, 16) + 6,
              },
            ]}
          >
            {/* Top-Center Branding */}
            <Animated.View
              style={[
                styles.brandSection,
                { opacity: fadeBrand, transform: [{ translateY: slideBrand }] },
              ]}
            >
              <View style={styles.logoWrap}>
                <Image
                  source={LOGO_MARK}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>MaybeWe</Text>
              <Text style={styles.tagline}>Meet someone. Go somewhere.</Text>
            </Animated.View>

            {/* Bottom Actions & Ethos */}
            <Animated.View
              style={[
                styles.bottomSection,
                { opacity: fadeButtons, transform: [{ translateY: slideButtons }] },
              ]}
            >
              {/* Primary Sign Up Button with arrow */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/signup')}
                style={styles.primaryButton}
                activeOpacity={0.85}
                accessibilityLabel="Sign Up"
              >
                <View style={styles.primaryButtonInner}>
                  <Text style={styles.primaryButtonText}>Sign Up</Text>
                  <Ionicons name="arrow-forward" size={17} color="#061522" style={styles.buttonArrow} />
                </View>
              </TouchableOpacity>

              {/* Secondary Sign In Button */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={styles.secondaryButton}
                activeOpacity={0.85}
                accessibilityLabel="Sign In"
              >
                <Text style={styles.secondaryButtonText}>Sign In</Text>
              </TouchableOpacity>

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotButton}
                activeOpacity={0.7}
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Spaced Bottom Navigation / Brand Pillar Text */}
              <View style={styles.ethosContainer}>
                <Text style={styles.ethosText}>TRAVEL  /  CONNECT  /  EXPLORE</Text>
              </View>
            </Animated.View>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#061522',
  },
  bgWrapper: {
    flex: 1,
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  /* Top-Center Branding */
  brandSection: {
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 16 : 8,
  },
  logoWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoImage: {
    width: 58,
    height: 58,
  },
  appName: {
    fontFamily: FONTS.extraBold,
    fontSize: 29,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.90)',
    letterSpacing: 2.0,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  /* Buttons & Footer */
  bottomSection: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    height: 58,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.90)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#061522',
    letterSpacing: -0.1,
  },
  buttonArrow: {
    marginLeft: 8,
  },
  secondaryButton: {
    width: '100%',
    height: 58,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  secondaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  forgotButton: {
    paddingVertical: 6,
    marginTop: -2,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.88)',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ethosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  ethosText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 3.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.40)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
