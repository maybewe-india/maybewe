import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONTS, RADII } from "../../lib/theme";
import PrimaryButton from "../../components/ui/PrimaryButton";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const shapeAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver }),
      Animated.timing(slideAnim, { toValue: 0, duration: 750, useNativeDriver }),
      Animated.spring(shapeAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver }),
    ]).start();

    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "MaybeWe — Meet someone. Go somewhere.";
    }
  }, []);

  const handleForgotPassword = () => {
    router.push("/(auth)/forgot-password");
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Ambient Lighting Layer */}
      <View style={styles.ambientLightingLayer} pointerEvents="none">
        <Animated.View
          style={[
            styles.ambientRadialGlow,
            { transform: [{ scale: shapeAnim }] },
          ]}
        />
        <View style={styles.dimensionalSubtleContour} />
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 24) + (Platform.OS === "android" ? 16 : 30),
            paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "android" ? 20 : 50),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Editorial Brand Hero */}
          <View style={styles.brandHero}>
            {/* Frosted Glass Medallion with Dual-Ring Border */}
            <View style={styles.medallionOuterRing}>
              <View style={styles.medallionInnerRing}>
                <View style={styles.goldMedallionBadge}>
                  <Text style={styles.medallionTrackedText}>
                    • TRAVEL CONCIERGE & NETWORK •
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.wordmark}>MaybeWe</Text>
            <Text style={styles.tagline}>Meet someone. Go somewhere.</Text>
          </View>

          {/* Floating Action Surface with Tactile Luxury Buttons */}
          <View style={styles.controlsSurface}>
            {/* Primary Sign Up: Warm Espresso Capsule (#1C1917) with inner gold rim */}
            <PrimaryButton
              title="Sign Up"
              variant="primary"
              size="lg"
              onPress={() => router.push("/(auth)/signup")}
              style={styles.actionButton}
            />

            {/* Secondary Sign In: Frosted Silk Glass with Sand Micro-Border */}
            <PrimaryButton
              title="Sign In"
              variant="secondary"
              size="lg"
              onPress={() => router.push("/(auth)/login")}
              style={styles.actionButton}
            />

            {/* Forgot Password Link - Generous Android touch target & hitSlop */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Forgot password?"
            >
              <Text
                style={styles.forgotText}
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.3}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Legal Links */}
            <View style={styles.legalLinksRow}>
              <TouchableOpacity
                onPress={() => router.push("/terms")}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Terms of Service"
              >
                <Text style={styles.legalLinkText}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>•</Text>
              <TouchableOpacity
                onPress={() => router.push("/privacy")}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
              >
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            {/* Editorial Footer Tag */}
            <View style={styles.footerPillar}>
              <Text style={styles.footerPillarText}>QUIET LUXURY • CURATED EXPLORATION</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF8F5", // Alabaster French Linen
    position: "relative",
    overflow: "hidden",
  },
  ambientLightingLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ambientRadialGlow: {
    position: "absolute",
    width: "130%",
    aspectRatio: 1,
    maxWidth: 500,
    borderRadius: 250,
    top: "10%",
    backgroundColor: "rgba(197, 168, 128, 0.08)", // Champagne Gold glow
    ...Platform.select({
      web: {
        filter: "blur(80px)",
      },
    }),
  },
  dimensionalSubtleContour: {
    position: "absolute",
    width: "70%",
    aspectRatio: 1,
    maxWidth: 290,
    borderRadius: 145,
    top: "22%",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.20)",
    backgroundColor: "rgba(244, 239, 235, 0.35)",
  },
  scrollView: {
    flex: 1,
    width: "100%",
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    width: "100%",
  },
  container: {
    flexGrow: 1,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    zIndex: 10,
  },
  brandHero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 24,
  },
  medallionOuterRing: {
    padding: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.40)", // Subtle champagne gold outer ring
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.50)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 24px rgba(197, 168, 128, 0.15)",
      },
    }),
  },
  medallionInnerRing: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.30)", // Dual-ring inner
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  goldMedallionBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  medallionTrackedText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: "700",
    color: "#7D756D", // Cashmere Taupe
    letterSpacing: 2.2,
  },
  wordmark: {
    fontFamily: FONTS.extraBold,
    fontSize: 50,
    fontWeight: "800",
    color: "#1E1B18", // Deep Warm Charcoal
    letterSpacing: -1.2,
    marginBottom: 12,
    textAlign: "center",
  },
  tagline: {
    fontFamily: FONTS.medium,
    fontStyle: "italic",
    fontSize: 18,
    fontWeight: "500",
    color: "#4A443E", // Refined italic charcoal
    letterSpacing: 0.2,
    textAlign: "center",
  },
  controlsSurface: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 14,
  },
  actionButton: {
    width: "100%",
  },
  forgotBtn: {
    alignSelf: "stretch",
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
    zIndex: 10,
  },
  forgotText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: "600",
    color: "#5C554E",
    letterSpacing: 0.2,
    textDecorationLine: "underline",
    includeFontPadding: false,
    textAlign: "center",
    flexShrink: 1,
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    gap: 8,
  },
  legalLinkText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "#7D756D",
    letterSpacing: 0.2,
  },
  legalDivider: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(125, 117, 109, 0.5)",
  },
  footerPillar: {
    paddingTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footerPillarText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: "700",
    color: "#7D756D",
    letterSpacing: 2.5,
    textAlign: "center",
  },
});
