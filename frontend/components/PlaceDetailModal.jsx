import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { formatINR, findBudgetAlternatives } from '../lib/budget';
import { isPlaceSaved, toggleSavePlace } from '../lib/places';
import { fetchPlaceTravelMoments } from '../lib/posts';
import GlassCard from './ui/GlassCard';

const { width: SCREEN_W } = Dimensions.get('window');

export default function PlaceDetailModal({
  visible,
  place,
  onClose,
  onAddToTrip,
  onPlanHangoutHere,
  onOpenPostDetail,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [saved, setSaved] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [travelMoments, setTravelMoments] = useState([]);

  useEffect(() => {
    if (place?.id) {
      isPlaceSaved(place.id).then(setSaved);
      fetchPlaceTravelMoments(place.id).then(setTravelMoments);
    }
  }, [place?.id]);

  if (!place) return null;

  const images = place.images && place.images.length > 0 ? place.images : [place.image_url];
  const alternatives = findBudgetAlternatives(place);

  const handleToggleSave = async () => {
    const nextSaved = await toggleSavePlace(place.id);
    setSaved(nextSaved);
  };

  const handleShare = async () => {
    try {
      const shareMsg = `✨ ${place.name} in ${place.destination}, ${place.state}\n⭐ Rating: ${place.rating} (${place.review_count} reviews)\n💰 Price: ${formatINR(place.min_price)} – ${formatINR(place.max_price)}\n${place.description}\n\nDiscovered on MaybeWe`;
      await Share.share({
        message: shareMsg,
        title: place.name,
      });
    } catch {
      Alert.alert('Place Shared', `Copied details for ${place.name}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.modalBg }]}>
        {/* Floating Top Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity
            style={[styles.roundBtn, { backgroundColor: 'rgba(23, 24, 23, 0.65)' }]}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color="#FBFAF7" />
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[styles.roundBtn, { backgroundColor: 'rgba(23, 24, 23, 0.65)', marginRight: 10 }]}
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityLabel="Share place"
            >
              <Ionicons name="share-outline" size={19} color="#FBFAF7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roundBtn,
                { backgroundColor: saved ? '#B99A5E' : 'rgba(23, 24, 23, 0.65)' },
              ]}
              onPress={handleToggleSave}
              activeOpacity={0.8}
              accessibilityLabel="Bookmark place"
            >
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={19}
                color={saved ? '#171817' : '#FBFAF7'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Image Gallery */}
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: images[activeImageIndex] || place.image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(23, 24, 23, 0.35)', 'rgba(23, 24, 23, 0.90)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Destination & Category overlay */}
            <View style={styles.heroOverlayContent}>
              <View style={styles.heroTagRow}>
                <View style={styles.badgePill}>
                  <Ionicons name="location" size={11} color="#B99A5E" style={{ marginRight: 4 }} />
                  <Text style={styles.badgePillText}>{place.destination?.toUpperCase()}, {place.state?.toUpperCase()}</Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: 'rgba(220, 229, 223, 0.35)' }]}>
                  <Text style={[styles.badgePillText, { color: '#DCE5DF' }]}>{place.category}</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>{place.name}</Text>

              {/* Rating & Review Count */}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#B99A5E" style={{ marginRight: 4 }} />
                <Text style={styles.ratingNumber}>{place.rating?.toFixed(1) || '4.9'}</Text>
                <Text style={styles.ratingCount}>({place.review_count || 120} traveler reviews)</Text>
                {place.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#4ADE80" style={{ marginRight: 3 }} />
                    <Text style={styles.verifiedText}>Verified Spot</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Pricing & Budget Intelligence Card */}
          <View style={styles.contentPadded}>
            <GlassCard material="pearl" style={styles.priceCard}>
              <View style={styles.priceHeaderRow}>
                <View>
                  <Text style={styles.priceLabel}>ESTIMATED TARIFF / EXPENSE</Text>
                  <Text style={styles.priceValue}>
                    {place.min_price === 0 && place.max_price === 0
                      ? 'Free Access'
                      : `${formatINR(place.min_price)} – ${formatINR(place.max_price)}`}
                  </Text>
                  <Text style={styles.priceSubtext}>Per person in Indian Rupees (INR)</Text>
                </View>

                <View style={[styles.tierTag, { backgroundColor: place.min_price > 3000 ? '#F1EEE6' : '#DCE5DF' }]}>
                  <Text style={[styles.tierTagText, { color: '#33463C' }]}>
                    {place.min_price === 0 ? 'Free' : place.min_price > 3000 ? 'Luxury' : place.min_price > 1000 ? 'Moderate' : 'Budget'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Description */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>About the Experience</Text>
              <Text style={[styles.descriptionBody, { color: colors.textSecondary }]}>
                {place.description}
              </Text>
            </View>

            {/* Highlights */}
            {place.highlights && place.highlights.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Curated Highlights</Text>
                <View style={styles.highlightsWrap}>
                  {place.highlights.map((h, i) => (
                    <View key={i} style={[styles.highlightChip, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1EEE6', borderColor: colors.border }]}>
                      <Ionicons name="sparkles" size={12} color="#B99A5E" style={{ marginRight: 6 }} />
                      <Text style={[styles.highlightChipText, { color: colors.textPrimary }]}>{h}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Practical Details */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Planning Essentials</Text>

              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Ionicons name="time-outline" size={16} color="#B99A5E" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailRowTitle, { color: colors.textPrimary }]}>Best Time to Visit</Text>
                  <Text style={[styles.detailRowSubtitle, { color: colors.textSecondary }]}>{place.best_time_to_visit || 'Morning or golden hour'}</Text>
                </View>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Ionicons name="alarm-outline" size={16} color="#B99A5E" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailRowTitle, { color: colors.textPrimary }]}>Opening Hours</Text>
                  <Text style={[styles.detailRowSubtitle, { color: colors.textSecondary }]}>{place.opening_hours || 'Daylight access'}</Text>
                </View>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Ionicons name="navigate-outline" size={16} color="#B99A5E" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailRowTitle, { color: colors.textPrimary }]}>Location & Coordinates</Text>
                  <Text style={[styles.detailRowSubtitle, { color: colors.textSecondary }]}>
                    {place.address || `${place.destination}, ${place.state}`} ({place.latitude?.toFixed(4)}, {place.longitude?.toFixed(4)})
                  </Text>
                </View>
              </View>
            </View>

            {/* Travel Moments from This Place */}
            {travelMoments.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.altHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Travel Moments from Here</Text>
                  <Text style={styles.altBadge}>COMMUNITY STORIES</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentsRow}>
                  {travelMoments.map((moment) => (
                    <TouchableOpacity
                      key={moment.id}
                      onPress={() => {
                        if (onOpenPostDetail) onOpenPostDetail(moment);
                      }}
                      style={[styles.momentCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: moment.media?.[0]?.media_url || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500&auto=format&fit=crop&q=80' }}
                        style={styles.momentThumb}
                      />
                      <View style={styles.momentContent}>
                        <View style={styles.momentAuthorRow}>
                          <Image source={{ uri: moment.user_avatar }} style={styles.momentAuthorAvatar} />
                          <Text style={[styles.momentAuthorName, { color: colors.textPrimary }]} numberOfLines={1}>{moment.user_name}</Text>
                        </View>
                        <Text style={[styles.momentCaption, { color: colors.textSecondary }]} numberOfLines={2}>
                          {moment.content}
                        </Text>
                        <View style={styles.momentLikesRow}>
                          <Ionicons name="heart" size={11} color="#C84C4C" style={{ marginRight: 4 }} />
                          <Text style={styles.momentLikesCount}>{moment.like_count || 0}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Budget Alternatives */}
            {alternatives.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.altHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Budget-Friendly Alternatives</Text>
                  <Text style={styles.altBadge}>SMART SAVER</Text>
                </View>
                <Text style={[styles.altSubtext, { color: colors.textSecondary }]}>
                  Similar {place.category?.toLowerCase()} spots in {place.destination} with lower entry cost:
                </Text>

                {alternatives.map((alt) => (
                  <View key={alt.id} style={[styles.altCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.altName, { color: colors.textPrimary }]}>{alt.name}</Text>
                      <Text style={[styles.altCost, { color: '#B99A5E' }]}>
                        {alt.min_price === 0 ? 'Free' : `${formatINR(alt.min_price)} – ${formatINR(alt.max_price)}`}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Bottom Action CTA */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopColor: colors.border }]}>
          {onPlanHangoutHere ? (
            <TouchableOpacity
              style={[styles.hangoutBtn, { borderColor: colors.border }]}
              onPress={() => {
                onClose();
                onPlanHangoutHere(place);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={16} color="#B99A5E" style={{ marginRight: 6 }} />
              <Text style={[styles.hangoutBtnText, { color: colors.textPrimary }]}>Plan Hangout</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.addTripBtn, onPlanHangoutHere && { flex: 1.4 }]}
            onPress={() => {
              onClose();
              if (onAddToTrip) onAddToTrip(place);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#171817', '#2B2C29']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addTripBtnGradient}
            >
              <Ionicons name="calendar-outline" size={17} color="#B99A5E" style={{ marginRight: 8 }} />
              <Text style={styles.addTripBtnText}>Add to Itinerary</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroContainer: {
    width: SCREEN_W,
    height: 360,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayContent: {
    padding: 20,
  },
  heroTagRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 24, 23, 0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADII.full,
    marginRight: 8,
  },
  badgePillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#FBFAF7',
  },
  heroTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#FBFAF7',
    lineHeight: 32,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FBFAF7',
    marginRight: 4,
  },
  ratingCount: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#D7D2C8',
    marginRight: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
  verifiedText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#4ADE80',
  },
  contentPadded: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  priceCard: {
    padding: 16,
    borderRadius: RADII.lg,
    marginBottom: 20,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#77766F',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  priceValue: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#171817',
    letterSpacing: -0.5,
  },
  priceSubtext: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#77766F',
    marginTop: 2,
  },
  tierTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
  },
  tierTagText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  descriptionBody: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  highlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  highlightChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailRowTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailRowSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  altHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  altBadge: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#B99A5E',
    letterSpacing: 1.2,
  },
  altSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginBottom: 10,
  },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  altName: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  altCost: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hangoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADII.xl,
    borderWidth: 1,
  },
  hangoutBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
  addTripBtn: {
    flex: 1,
    borderRadius: RADII.xl,
    overflow: 'hidden',
  },
  addTripBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  addTripBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FBFAF7',
  },
  momentsRow: {
    gap: 12,
    paddingVertical: 4,
  },
  momentCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  momentThumb: {
    width: '100%',
    height: 110,
  },
  momentContent: {
    padding: 10,
  },
  momentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  momentAuthorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  momentAuthorName: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    flex: 1,
  },
  momentCaption: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  momentLikesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  momentLikesCount: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#8C8983',
  },
});
