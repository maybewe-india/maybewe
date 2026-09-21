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
import { GRADIENTS, RADII, SHADOWS, FONTS } from '../lib/theme';
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

  const connectBtnGradient = isDark ? ['#FFFFFF', '#F0F4F8'] : ['#061522', '#10283A'];
  const connectBtnTextColor = isDark ? '#061522' : '#FFFFFF';

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
          {/* Deep Navy Gradient Overlay for Readability on the photo */}
          <LinearGradient
            colors={['rgba(6, 21, 34, 0.1)', 'rgba(6, 21, 34, 0.65)', 'rgba(6, 21, 34, 0.95)']}
            style={styles.imageGradient}
          />

          {/* Vibe Match Indicator Pill */}
          <View style={styles.vibePill}>
            <LinearGradient
              colors={['#FFFFFF', '#F0F4F8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.vibePillGradient}
            >
              <Ionicons name="sparkles" size={13} color="#061522" />
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
              score={traveler.trust_score || 4.9}
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

          {/* Looking For Callout */}
          {traveler.looking_for ? (
            <View style={[styles.lookingForBox, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
              <Ionicons name="compass-outline" size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.lookingForText, { color: colors.textSecondary }]} numberOfLines={1}>
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

          {/* Why you might match section */}
          <View style={[styles.whyMatchBox, { backgroundColor: isDark ? 'rgba(6, 21, 34, 0.60)' : 'rgba(237, 241, 247, 0.85)', borderColor: colors.border }]}>
            <View style={styles.whyMatchHeader}>
              <Ionicons name="git-network-outline" size={13} color={colors.textPrimary} />
              <Text style={[styles.whyMatchTitle, { color: colors.textPrimary }]}>Why you might match</Text>
              <Text style={[styles.whyMatchNotice, { color: colors.textMuted }]}>(Criteria match)</Text>
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

          {/* Action Buttons: Pass & Connect */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={() => onPass?.(traveler)}
              style={[styles.passButton, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Pass traveler"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConnectPress}
              disabled={connecting}
              style={styles.connectButton}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Connect with traveler"
            >
              <LinearGradient
                colors={connectBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.connectGradient}
              >
                <Ionicons name="paper-plane" size={16} color={connectBtnTextColor} style={{ marginRight: 8 }} />
                <Text style={[styles.connectButtonText, { color: connectBtnTextColor }]}>Connect</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: RADII['3xl'],
    marginBottom: 20,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backdropFilter: 'blur(16px)',
    ...SHADOWS.card,
  },
  cardInner: {
    borderRadius: RADII['3xl'],
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
    color: '#061522',
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
    padding: 18,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    marginTop: 2,
    fontWeight: '500',
  },
  bioText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  lookingForBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADII.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  lookingForText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    flex: 1,
  },
  lookingForHighlight: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tagPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
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
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  whyMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  whyMatchTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  whyMatchNotice: {
    fontFamily: FONTS.regular,
    fontSize: 10,
  },
  reasonsList: {
    gap: 5,
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
    gap: 12,
  },
  passButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    flex: 1,
    height: 48,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  connectGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  connectButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
