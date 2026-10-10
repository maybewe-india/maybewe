import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { useAuth } from '../../lib/authContext';

const GUIDELINES = [
  {
    icon: 'heart-circle-outline',
    title: 'Respect others',
    desc: 'Treat fellow travelers with warmth and courtesy. We celebrate diversity of cultures, backgrounds, and travel rhythms.',
  },
  {
    icon: 'chatbubbles-outline',
    title: 'Keep conversations safe',
    desc: 'Get to know your matches within MaybeWe before deciding to share external contact details.',
  },
  {
    icon: 'cafe-outline',
    title: 'Meet in public places',
    desc: 'For your first meeting, always choose a busy, well-lit cafe, museum, landmark, or transit hub.',
  },
  {
    icon: 'card-outline',
    title: 'Never share financial info',
    desc: 'Never wire money, cover upfront travel bookings for strangers, or share banking credentials.',
  },
  {
    icon: 'warning-outline',
    title: 'Report suspicious behavior',
    desc: 'Help protect the community. Easily report or block any traveler who crosses boundaries or acts suspiciously.',
  },
];

export default function GuidelinesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, user, profile, agreeToGuidelines } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAgree = async () => {
    setLoading(true);
    await agreeToGuidelines();
    console.log('[Guidelines] session immediately before navigation to verification:', {
      hasSession: !!session,
      userId: session?.user?.id || user?.id || profile?.id || 'NONE',
    });
    setLoading(false);
    router.push('/(auth)/verification');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        {/* Top Bar with Back Button */}
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
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={PALETTE.nearBlack} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={16} color="#C5A880" />
            <Text style={styles.badgeText}>COMMUNITY SAFETY</Text>
          </View>
          <Text style={styles.title}>Our Travel Principles</Text>
          <Text style={styles.subtitle}>
            MaybeWe is founded on mutual trust, shared adventures, and personal security.
          </Text>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {GUIDELINES.map((item, idx) => (
            <View key={idx} style={[styles.card, SHADOWS.card]}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={22} color="#C5A880" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title="I Agree & Continue"
            size="lg"
            loading={loading}
            onPress={handleAgree}
            icon="checkmark-circle-outline"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 22,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE.borderGrey,
  },
  backButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "#1E1B18",
    marginLeft: 6,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: PALETTE.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: PALETTE.borderGrey,
    gap: 6,
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.nearBlack,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: PALETTE.nearBlack,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#7D756D",
    lineHeight: 21,
  },
  list: {
    flex: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3EFE6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.35)",
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.nearBlack,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: PALETTE.mediumGrey,
    lineHeight: 19,
  },
  footer: {
    paddingTop: 12,
  },
});
