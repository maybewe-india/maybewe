import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import { useAuth } from '../../lib/authContext';
import { submitReview } from '../../lib/reviews';

const REVIEW_BG = require('../../assets/images/review_sunset_bg.jpg');
const { width: SCREEN_W } = Dimensions.get('window');

const RATING_DESCRIPTORS = {
  5: '🌟 Outstanding travel companion! Highly recommended for solo wanderers.',
  4: '👍 Great travel partner, reliable, friendly, and communicative.',
  3: '🙂 Decent journey together, some minor travel pace differences.',
  2: '⚠️ Challenging travel rhythm or unreliable communication.',
  1: '🚫 Not recommended for MaybeWe travel pairing.',
};

const EXPERIENCE_TAGS = [
  'Great conversation',
  'Reliable',
  'Fun',
  'Respectful',
  'Adventurous',
  'Easygoing',
  'Organized',
  'Would travel again',
];

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: matchId, reviewedId, reviewedName, tripDestination, tripDates } = useLocalSearchParams();
  const { user, profile } = useAuth();

  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['Great conversation', 'Respectful', 'Would travel again']);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Animated Star Scales
  const starScales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  const companionName = reviewedName || 'Alex Chen';
  const companionAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80';
  const destination = tripDestination || 'Tokyo, Japan';
  const dates = tripDates || 'Oct 10 — Oct 22, 2026';

  const handleStarPress = (starVal) => {
    setRating(starVal);
    const targetAnim = starScales[starVal - 1];
    Animated.sequence([
      Animated.timing(targetAnim, { toValue: 1.35, duration: 110, useNativeDriver: true }),
      Animated.timing(targetAnim, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const tagSummary = selectedTags.length > 0 ? `Tags: ${selectedTags.join(', ')}. ` : '';
    const fullComment = `${tagSummary}${comment.trim()}`.trim();

    const res = await submitReview({
      reviewerId: user?.id,
      reviewedId: reviewedId || matchId || 'user-001',
      tripId: null,
      rating,
      comment: fullComment,
      reviewerName: profile?.name || 'Verified Traveler',
    });
    setSubmitting(false);

    if (res.success) {
      setSubmittedSuccess(true);
    } else {
      Alert.alert('Error', res.error || 'Failed to submit review.');
    }
  };

  // If already successfully submitted, show confirmation state
  if (submittedSuccess) {
    return (
      <View style={styles.root}>
        {/* Full-Screen Cinematic Warm Sunset Photography Background */}
      <ImageBackground
        source={REVIEW_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(6, 21, 34, 0.50)', 'rgba(6, 21, 34, 0.76)', 'rgba(6, 21, 34, 0.94)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.confirmationWrapper}>
            <View style={[styles.confirmBadgeCircle, SHADOWS.lavender]}>
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmBadgeGradient}
              >
                <Ionicons name="checkmark-circle" size={48} color="#061522" />
              </LinearGradient>
            </View>

            <Text style={styles.confirmTitle}>Review submitted</Text>
            <Text style={styles.confirmSubtitle}>
              Thanks for helping keep MaybeWe trustworthy.
            </Text>

            <View style={styles.confirmDetailsCard}>
              <View style={styles.confirmDetailRow}>
                <Ionicons name="star" size={16} color={COLORS.sunset} style={{ marginRight: 8 }} />
                <Text style={styles.confirmDetailText}>
                  Rating: <Text style={styles.boldWhite}>{rating}.0 / 5.0</Text> for {companionName}
                </Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.lavender} style={{ marginRight: 8 }} />
                <Text style={styles.confirmDetailText}>Trust Score contribution applied</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.returnBtnGradient}
              >
                <Text style={styles.returnBtnText}>Return to Connections</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Full-Screen Cinematic Warm Sunset Photography Background */}
      <ImageBackground
        source={REVIEW_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(6, 21, 34, 0.50)', 'rgba(6, 21, 34, 0.76)', 'rgba(6, 21, 34, 0.94)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) + 6, paddingBottom: insets.bottom + 20 }]}>
        {/* Top Bar with Close button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityLabel="Close"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Leave a Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Header Eyebrow & Title */}
        <View style={styles.titleSection}>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>TRIP COMPLETE</Text>
          </View>
          <Text style={styles.mainTitle}>How was your journey?</Text>
        </View>

        {/* Travel Companion Card */}
        <View style={[styles.companionCard, SHADOWS.card]}>
          <Image source={{ uri: companionAvatar }} style={styles.companionAvatar} />
          <View style={styles.companionInfo}>
            <Text style={styles.companionName}>{companionName}</Text>
            <View style={styles.destinationRow}>
              <Ionicons name="location-outline" size={13} color={COLORS.peach} style={{ marginRight: 4 }} />
              <Text style={styles.destinationText}>{destination}</Text>
            </View>
            <Text style={styles.datesText}>{dates}</Text>
          </View>
          <View style={styles.badgeVerified}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.lavender} />
          </View>
        </View>

        {/* Question: How was traveling together? */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingQuestion}>How was traveling together?</Text>

          {/* 5 Tactile Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((starVal) => {
              const isFilled = starVal <= rating;
              const scaleAnim = starScales[starVal - 1];

              return (
                <TouchableOpacity
                  key={starVal}
                  onPress={() => handleStarPress(starVal)}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                  accessibilityLabel={`Rate ${starVal} stars`}
                >
                  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons
                      name={isFilled ? 'star' : 'star-outline'}
                      size={38}
                      color={isFilled ? COLORS.sunset : 'rgba(255, 255, 255, 0.25)'}
                    />
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dynamic Descriptor Pill */}
          <View style={styles.descriptorCard}>
            <Text style={styles.descriptorText}>{RATING_DESCRIPTORS[rating]}</Text>
          </View>
        </View>

        {/* Experience Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.sectionLabel}>EXPERIENCE HIGHLIGHTS</Text>
          <View style={styles.tagsCloud}>
            {EXPERIENCE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tagPill, isSelected && styles.tagPillActive]}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={13} color="#061522" style={{ marginRight: 5 }} />
                  )}
                  <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Write a Review Section */}
        <View style={styles.reviewTextSection}>
          <Text style={styles.sectionLabel}>WRITE A REVIEW</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share reflections on your rhythm, communication, and shared adventures..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              numberOfLines={4}
              style={styles.textAreaField}
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length} / 500</Text>
          </View>
        </View>

        {/* Actions Row: Submit Review & Skip for now */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitReviewBtn, submitting && { opacity: 0.6 }]}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRADIENTS.lavenderViolet}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitReviewGradient}
            >
              <Text style={styles.submitReviewBtnText}>
                {submitting ? 'Publishing Review...' : 'Submit Review'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#061522',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  /* Title Section */
  titleSection: {
    marginBottom: 20,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 179, 154, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 154, 0.35)',
    marginBottom: 8,
  },
  eyebrowText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.peach,
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  /* Companion Card */
  companionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginBottom: 24,
    backdropFilter: 'blur(16px)',
  },
  companionAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.lavender,
    marginRight: 14,
  },
  companionInfo: {
    flex: 1,
  },
  companionName: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  destinationText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.peach,
    fontWeight: '600',
  },
  datesText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  badgeVerified: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },

  /* Rating Section */
  ratingSection: {
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginBottom: 22,
    backdropFilter: 'blur(16px)',
  },
  ratingQuestion: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  starTouch: {
    padding: 4,
  },
  descriptorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
  },
  descriptorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Tags Section */
  tagsSection: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  tagsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  tagPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  tagPillText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tagPillTextActive: {
    fontFamily: FONTS.bold,
    color: '#061522',
    fontWeight: '700',
  },

  /* Text Area */
  reviewTextSection: {
    marginBottom: 24,
  },
  textAreaContainer: {
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: 14,
    backdropFilter: 'blur(16px)',
  },
  textAreaField: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#FFFFFF',
    minHeight: 90,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'right',
    marginTop: 6,
  },

  /* Actions */
  actionsContainer: {
    gap: 12,
  },
  submitReviewBtn: {
    borderRadius: RADII.full,
    overflow: 'hidden',
  },
  submitReviewGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADII.full,
  },
  submitReviewBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#061522',
    letterSpacing: 0.1,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  skipBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },

  /* Confirmation View */
  confirmationWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmBadgeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    marginBottom: 20,
  },
  confirmBadgeGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmDetailsCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginBottom: 28,
    gap: 12,
    backdropFilter: 'blur(16px)',
  },
  confirmDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmDetailText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  boldWhite: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  returnBtn: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADII.full,
    overflow: 'hidden',
  },
  returnBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADII.full,
  },
  returnBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#061522',
  },
});
