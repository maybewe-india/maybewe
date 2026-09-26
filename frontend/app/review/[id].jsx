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
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { submitReview } from '../../lib/reviews';

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
  const { colors, isDark } = useTheme();

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
      <View style={[styles.root, { backgroundColor: '#F7F5F0' }]}>
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.confirmationWrapper}>
            <View style={styles.confirmBadgeCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#B99A5E" />
            </View>

            <Text style={styles.confirmTitle}>Review Submitted</Text>
            <Text style={styles.confirmSubtitle}>
              Your reflections help preserve exceptional travel standards across the MaybeWe community.
            </Text>

            <View style={styles.confirmDetailsCard}>
              <View style={styles.confirmDetailRow}>
                <Ionicons name="star" size={16} color="#B99A5E" style={{ marginRight: 8 }} />
                <Text style={styles.confirmDetailText}>
                  Rating: <Text style={styles.boldWhite}>{rating}.0 / 5.0</Text> for {companionName}
                </Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Ionicons name="shield-checkmark" size={16} color="#33463C" style={{ marginRight: 8 }} />
                <Text style={styles.confirmDetailText}>Verified Community Trust contribution applied</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.returnBtnText}>Return to Connections</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: '#F7F5F0' }]}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) + 6, paddingBottom: insets.bottom + 20 }]}>
        {/* Top Bar with Close button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityLabel="Close"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#171817" />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Companion Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Header Eyebrow & Title */}
        <View style={styles.titleSection}>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>EXPEDITION CONCLUDED</Text>
          </View>
          <Text style={styles.mainTitle}>How was your journey?</Text>
        </View>

        {/* Travel Companion Card */}
        <View style={styles.companionCard}>
          <Image source={{ uri: companionAvatar }} style={styles.companionAvatar} />
          <View style={styles.companionInfo}>
            <Text style={styles.companionName}>{companionName}</Text>
            <View style={styles.destinationRow}>
              <Ionicons name="location-sharp" size={13} color="#B99A5E" style={{ marginRight: 4 }} />
              <Text style={styles.destinationText}>{destination}</Text>
            </View>
            <Text style={styles.datesText}>{dates}</Text>
          </View>
          <View style={styles.badgeVerified}>
            <Ionicons name="shield-checkmark" size={16} color="#B99A5E" />
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
                      size={36}
                      color={isFilled ? '#B99A5E' : '#D7D2C8'}
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
                  style={[
                    styles.tagPill,
                    isSelected && styles.tagPillActive,
                  ]}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={13} color="#FBFAF7" style={{ marginRight: 5 }} />
                  )}
                  <Text style={[
                    styles.tagPillText,
                    isSelected && styles.tagPillTextActive,
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Write a Review Section */}
        <View style={styles.reviewTextSection}>
          <Text style={styles.sectionLabel}>TRAVEL REFLECTIONS</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share reflections on pace, communication, and shared adventures..."
              placeholderTextColor="#77766F"
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
            <Ionicons name="paper-plane" size={16} color="#B99A5E" style={{ marginRight: 8 }} />
            <Text style={styles.submitReviewBtnText}>
              {submitting ? 'Publishing Review...' : 'Submit Companion Review'}
            </Text>
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
    backgroundColor: '#F7F5F0',
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
    borderBottomColor: '#D7D2C8',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(251, 250, 247, 0.88)',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#171817',
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
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.35)',
    marginBottom: 8,
  },
  eyebrowText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#B99A5E',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: '#171817',
    letterSpacing: -0.4,
  },

  /* Companion Card */
  companionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    marginBottom: 24,
    ...SHADOWS.card,
  },
  companionAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#B99A5E',
    marginRight: 14,
  },
  companionInfo: {
    flex: 1,
  },
  companionName: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#171817',
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
    color: '#B99A5E',
    fontWeight: '600',
  },
  datesText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#77766F',
  },
  badgeVerified: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.35)',
  },

  /* Rating Section */
  ratingSection: {
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    marginBottom: 22,
    ...SHADOWS.card,
  },
  ratingQuestion: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#171817',
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
    backgroundColor: '#F1EEE6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    width: '100%',
  },
  descriptorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#171817',
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
    color: '#77766F',
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
    backgroundColor: '#F1EEE6',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#D7D2C8',
  },
  tagPillActive: {
    backgroundColor: '#171817',
    borderColor: '#171817',
  },
  tagPillText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#45453F',
  },
  tagPillTextActive: {
    fontFamily: FONTS.bold,
    color: '#FBFAF7',
    fontWeight: '700',
  },

  /* Text Area */
  reviewTextSection: {
    marginBottom: 24,
  },
  textAreaContainer: {
    backgroundColor: '#F1EEE6',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    padding: 14,
    ...SHADOWS.soft,
  },
  textAreaField: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#171817',
    minHeight: 90,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#77766F',
    textAlign: 'right',
    marginTop: 6,
  },

  /* Actions */
  actionsContainer: {
    gap: 12,
  },
  submitReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171817',
    borderRadius: RADII.full,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  submitReviewBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FBFAF7',
    letterSpacing: 0.1,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(251, 250, 247, 0.88)',
    borderWidth: 1,
    borderColor: '#D7D2C8',
  },
  skipBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#77766F',
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
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#171817',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#77766F',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmDetailsCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    marginBottom: 28,
    gap: 12,
    ...SHADOWS.card,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmDetailText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#45453F',
  },
  boldWhite: {
    fontFamily: FONTS.bold,
    color: '#171817',
    fontWeight: '700',
  },
  returnBtn: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#171817',
    borderRadius: RADII.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  returnBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FBFAF7',
  },
});
