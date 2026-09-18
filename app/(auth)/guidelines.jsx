import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { useAuth } from '../../lib/authContext';

const GUIDELINES_BG = require('../../assets/images/dest_reykjavik.jpg');

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
  const { agreeToGuidelines } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAgree = async () => {
    setLoading(true);
    await agreeToGuidelines();
    setLoading(false);
    router.push('/(auth)/verification');
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={GUIDELINES_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(6, 21, 34, 0.40)', 'rgba(6, 21, 34, 0.72)', 'rgba(6, 21, 34, 0.94)']}
          locations={[0, 0.40, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
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
                <Ionicons name={item.icon} size={22} color="#FFFFFF" />
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
            title="I Agree & Continue  →"
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
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 22,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    gap: 6,
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  list: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII['2xl'],
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  footer: {
    paddingTop: 12,
  },
});
