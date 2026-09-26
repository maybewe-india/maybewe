import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, RADII, PALETTE } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Smooth entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const shapeAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver }),
      Animated.timing(slideAnim, { toValue: 0, duration: 750, useNativeDriver }),
      Animated.spring(shapeAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver }),
    ]).start();

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'MaybeWe — Meet someone. Go somewhere.';
    }
  }, []);

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ============================================================ */}
      {/* SUBTLE DIMENSIONAL LUXURY ENVIRONMENT (Layered 3D Depth)     */}
      {/* ============================================================ */}
      <View style={styles.ambientLightingLayer} pointerEvents="none">
        {/* Soft radial ambient glow */}
        <Animated.View
          style={[
            styles.ambientRadialGlow,
            { transform: [{ scale: shapeAnim }] },
          ]}
        />

        {/* Subtle dimensional translucent glass ring */}
        <View style={styles.dimensionalGlassRing} />

        {/* Secondary soft contour shape */}
        <View style={styles.dimensionalSubtleContour} />

        {/* Horizon light accent */}
        <View style={styles.ambientLightReflection} />
      </View>

      {/* Main Content Area */}
      <Animated.View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 24) + 30,
            paddingBottom: Math.max(insets.bottom, 20) + 70,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Editorial Brand Hero (Wordmark ONLY — ZERO Graphical Logos) */}
        <View style={styles.brandHero}>
          {/* Subtle quiet-luxury pedigree label */}
          <View style={styles.prestigePill}>
            <View style={styles.champagneAccentDot} />
            <Text style={styles.prestigeText}>TRAVEL CONCIERGE & NETWORK</Text>
          </View>

          <Text style={styles.wordmark}>MaybeWe</Text>
          <Text style={styles.tagline}>Meet someone. Go somewhere.</Text>
        </View>

        {/* Floating Action Surface with Tactile 3D Buttons */}
        <View style={styles.controlsSurface}>
          {/* Sign Up — Tactile Deep Graphite Physical Button */}
          <PrimaryButton
            title="Sign Up"
            variant="primary"
            size="lg"
            onPress={() => router.push('/(auth)/signup')}
            style={styles.actionButton}
          />

          {/* Sign In — Frosted Warm Ivory Glass Button */}
          <PrimaryButton
            title="Sign In"
            variant="secondary"
            size="lg"
            onPress={() => router.push('/(auth)/login')}
            style={styles.actionButton}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Forgot Password?"
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Editorial Footer Tag */}
          <View style={styles.footerPillar}>
            <Text style={styles.footerPillarText}>QUIET LUXURY • CURATED EXPLORATION</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F5F0', // Pearl Base
    position: 'relative',
    overflow: 'hidden',
  },

  /* Ambient Lighting & 3D Depth Environment */
  ambientLightingLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientRadialGlow: {
    position: 'absolute',
    width: 560,
    height: 560,
    borderRadius: 280,
    top: '12%',
    backgroundColor: 'rgba(200, 178, 122, 0.07)', // Soft Champagne Radial glow
    ...Platform.select({
      web: {
        filter: 'blur(80px)',
      },
    }),
  },
  dimensionalGlassRing: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    top: '18%',
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.45)', // Soft Stone outline
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(40px)',
        boxShadow: '0 20px 60px -10px rgba(117, 99, 69, 0.05)',
      },
    }),
  },
  dimensionalSubtleContour: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: '24%',
    borderWidth: 1,
    borderColor: 'rgba(229, 215, 181, 0.35)', // Soft champagne highlight contour
    backgroundColor: 'rgba(250, 248, 243, 0.25)',
  },
  ambientLightReflection: {
    position: 'absolute',
    width: '100%',
    height: 1,
    top: '46%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },

  /* Main Layout */
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    zIndex: 10,
  },

  /* Editorial Hero */
  brandHero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  prestigePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.65)',
    marginBottom: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  champagneAccentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#B99A5E', // Champagne Gold
    marginRight: 7,
  },
  prestigeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#33463C', // Deep Olive
    letterSpacing: 2.2,
  },
  wordmark: {
    fontFamily: FONTS.extraBold,
    fontSize: 48,
    fontWeight: '800',
    color: '#171817', // Obsidian
    letterSpacing: -1.2,
    marginBottom: 12,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '400',
    color: '#45453F', // Warm Charcoal
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  /* Controls Surface */
  controlsSurface: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 14,
  },
  actionButton: {
    width: '100%',
  },
  forgotBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  forgotText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    fontWeight: '500',
    color: '#918E87', // Warm grey
    letterSpacing: 0.1,
  },
  footerPillar: {
    paddingTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPillarText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#918E87',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
});
