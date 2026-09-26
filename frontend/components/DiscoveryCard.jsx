import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GRADIENTS, RADII, SHADOWS, FONTS, PALETTE } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import TrustBadge from './ui/TrustBadge';

export default function DiscoveryCard({
  traveler,
  onConnect,
  onPass,
  style,
}) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [connecting, setConnecting] = useState(false);

  if (!traveler) return null;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handleConnectPress = () => {
    setConnecting(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.03, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onConnect?.(traveler);
      setConnecting(false);
    });
  };

  const imageSource = traveler.cover_url || traveler.avatar_url;
  const matchPercentage = traveler.compatibility || 84;

  // Dynamic match checklist reasons
  const matchReasons = [
    'Similar travel interests & pace',
    'Both enjoy authentic local food',
    'Overlapping destination dates',
    traveler.languages?.length ? `Speaks ${traveler.languages[0]}` : 'Active community verified profile',
  ];

  const connectBtnGradient = [PALETTE.nearBlack, PALETTE.nearBlack];
  const connectBtnTextColor = PALETTE.white;

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={handlePressIn}
        onResponderRelease={handlePressOut}
        style={styles.cardInner}
      >
        {/* Top Hero Image Section */}
        <View style={[styles.imageWrapper, { backgroundColor: colors.backgroundSecondary }]}>
          <Image
            source={{ uri: imageSource }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          {/* Neutral Atmospheric Gradient Overlay for Readability on the photo */}
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.55)', 'rgba(15, 23, 42, 0.88)']}
            style={styles.imageGradient}
          />

          {/* Smooth image-to-content gradient transition */}
          <LinearGradient
            colors={['transparent', 'rgba(23, 24, 23, 0.25)', isDark ? colors.cardBg : 'rgba(251, 250, 247, 0.6)']}
            style={styles.imageBottomTransition}
          />

          {/* Vibe Match Indicator Pill */}
          <View style={styles.vibePill}>
            <LinearGradient
              colors={['#FBFAF7', '#E6D5AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.vibePillGradient}
            >
              <Ionicons name="sparkles" size={12} color="#B99A5E" />
              <Text style={styles.vibeText}>{matchPercentage}% Vibe Match</Text>
            </LinearGradient>
          </View>

          {/* Destination & Dates Overlay */}
          <View style={styles.imageBottomContent}>
            <View style={styles.destinationRow}>
              <Ionicons name="location-sharp" size={16} color="#FFFFFF" />
              <Text style={styles.destinationText} numberOfLines={1}>
                {traveler.destination}
              </Text>
            </View>
            <View style={styles.datesRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255, 255, 255, 0.85)" />
              <Text style={styles.datesText}>
                {traveler.trip_date_from} – {traveler.trip_date_to}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={[styles.contentSection, { backgroundColor: colors.cardBg }]}>
          {/* Header Row: Name, Age & TrustBadge */}
          <View style={styles.nameHeaderRow}>
            <View style={styles.nameContainer}>
              <Text style={[styles.nameText, { color: colors.textPrimary }]}>
                {traveler.name}, <Text style={[styles.ageText, { color: colors.textSecondary }]}>{traveler.age}</Text>
              </Text>
              {traveler.gender && traveler.gender !== 'Not specified' && (
                <Text style={[styles.genderSubtitle, { color: colors.textMuted }]}>{traveler.gender}</Text>
              )}
            </View>
            <TrustBadge
              score={traveler.trust_score || 4.92}
              verificationStatus={traveler.verification_status || 'verified'}
              variant="compact"
            />
          </View>

          {/* Short Bio */}
          {traveler.bio ? (
            <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={3}>
              {traveler.bio}
            </Text>
          ) : null}

          {/* Looking For Callout — Natural 2-line wrap without cutoff */}
          {traveler.looking_for ? (
            <View style={[styles.lookingForBox, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
              <Ionicons name="compass-outline" size={15} color={colors.textPrimary} style={styles.lookingForIcon} />
              <Text style={[styles.lookingForText, { color: colors.textSecondary }]} numberOfLines={2}>
                Looking for: <Text style={[styles.lookingForHighlight, { color: colors.textPrimary }]}>{traveler.looking_for}</Text>
              </Text>
            </View>
          ) : null}

          {/* Travel Style Tags */}
          {traveler.travel_styles && traveler.travel_styles.length > 0 && (
            <View style={styles.tagsRow}>
              {traveler.travel_styles.slice(0, 4).map((tag, idx) => (
                <View key={idx} style={[styles.tagPill, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Why you might match section — Natural user-facing wording */}
          <View style={[styles.whyMatchBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(241, 238, 230, 0.75)', borderColor: isDark ? colors.border : '#D7D2C8' }]}>
            <View style={styles.whyMatchHeader}>
              <Ionicons name="sparkles-outline" size={13} color="#B99A5E" />
              <Text style={[styles.whyMatchTitle, { color: colors.textPrimary }]}>Why you might match</Text>
            </View>
            <View style={styles.reasonsList}>
              {matchReasons.map((reason, index) => (
                <View key={index} style={styles.reasonRow}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} style={{ marginRight: 6 }} />
                  <Text style={[styles.reasonText, { color: colors.textSecondary }]}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons: Pass & Connect — Prominently visible and spaced */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={() => onPass?.(traveler)}
              style={[styles.passButton, { backgroundColor: isDark ? colors.surface : '#F1EEE6', borderColor: isDark ? colors.border : '#D7D2C8' }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Pass traveler"
            >
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConnectPress}
              disabled={connecting}
              style={styles.connectButton}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Connect with traveler"
            >
              <View style={styles.connectGradient}>
                <Ionicons name="paper-plane" size={16} color="#B99A5E" style={{ marginRight: 8 }} />
                <Text style={styles.connectButtonText}>Connect</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: RADII.xl,
    marginBottom: 28,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...SHADOWS.card,
  },
  cardInner: {
    borderRadius: RADII.xl,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 240,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  vibePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: RADII.full,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  vibePillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
  },
  vibeText: {
    color: '#171817',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  imageBottomContent: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  destinationText: {
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datesText: {
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  contentSection: {
    padding: 20,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  nameText: {
    fontFamily: FONTS.extraBold,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  ageText: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
  },
  genderSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  bioText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  imageBottomTransition: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 52,
  },
  lookingForBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: RADII.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  lookingForIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  lookingForText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  lookingForHighlight: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  whyMatchBox: {
    borderRadius: RADII.xl,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  whyMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  whyMatchTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  reasonsList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  passButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    flex: 1,
    height: 52,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    borderWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 16px -2px rgba(29, 29, 27, 0.22)',
      },
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  connectGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#171817',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: RADII.xl,
  },
  connectButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FBFAF7',
    letterSpacing: -0.2,
  },
});
