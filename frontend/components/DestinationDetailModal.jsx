import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../lib/theme.js';
import { useTheme } from '../lib/themeContext.jsx';
import { getDestinationImage } from '../lib/destinationImageResolver.js';
import { PLACES_DATA } from '../data/placesData.js';
import { getDemoTravelers } from '../lib/demoData.js';
import { getDemoHangouts } from '../lib/hangouts.js';
import { togglePlaceSaved, isPlaceSaved } from '../lib/places.js';
import Avatar from './ui/Avatar.jsx';

const { width: SCREEN_W } = Dimensions.get('window');

const DESTINATION_EDITORIALS = {
  Goa: {
    state: 'Goa',
    tagline: 'Sun-drenched golden shores, bohemian coastal culture & Portuguese heritage.',
    bestSeason: 'Nov – Feb',
    vibe: ['Beach', 'Culture', 'Nightlife', 'Seafood'],
  },
  Kashmir: {
    state: 'Jammu & Kashmir',
    tagline: 'Snow-capped peaks, alpine meadows, Dal Lake houseboats & fragrant saffron valleys.',
    bestSeason: 'Apr – Oct',
    vibe: ['Mountains', 'Nature', 'Romantic', 'Scenic'],
  },
  Kerala: {
    state: 'Kerala',
    tagline: 'Emerald backwaters, Ayurvedic retreats, spice plantations & misty tea gardens.',
    bestSeason: 'Sep – Mar',
    vibe: ['Wellness', 'Nature', 'Culture', 'Food'],
  },
  Rajasthan: {
    state: 'Rajasthan',
    tagline: 'Towering sandstone fortresses, royal Havelis, Thar desert dunes & timeless lore.',
    bestSeason: 'Oct – Mar',
    vibe: ['Heritage', 'Culture', 'Photography', 'Royal'],
  },
  Jaipur: {
    state: 'Rajasthan',
    tagline: 'The iconic Pink City of terracotta facades, astronomical wonders & regal courts.',
    bestSeason: 'Oct – Mar',
    vibe: ['Heritage', 'Shopping', 'Architecture'],
  },
  Ladakh: {
    state: 'Ladakh',
    tagline: 'High-altitude cold desert, ancient Buddhist gompas & crystal Pangong waters.',
    bestSeason: 'Jun – Sep',
    vibe: ['Adventure', 'Mountains', 'Spiritual'],
  },
  Hampi: {
    state: 'Karnataka',
    tagline: 'UNESCO World Heritage boulder landscape & magnificent ruins of Vijayanagara.',
    bestSeason: 'Oct – Feb',
    vibe: ['Archaeology', 'Bouldering', 'History'],
  },
  Varanasi: {
    state: 'Uttar Pradesh',
    tagline: 'The eternal spiritual capital on the sacred Ganges, evening Aarti & ghats.',
    bestSeason: 'Oct – Mar',
    vibe: ['Spiritual', 'Culture', 'Photography'],
  },
};

export default function DestinationDetailModal({
  visible,
  onClose,
  destination = 'Goa',
  onOpenPlace = null,
  onOpenHangout = null,
  onOpenTraveler = null,
  onOpenTrip = null,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('places'); // 'places' | 'travelers' | 'hangouts' | 'itineraries'

  const destName = destination || 'Goa';
  const editorial = DESTINATION_EDITORIALS[destName] || {
    state: 'India',
    tagline: `Immersive cultural encounters, picturesque vistas, and authentic local traditions in ${destName}.`,
    bestSeason: 'Oct – Mar',
    vibe: ['Culture', 'Adventure', 'Photography'],
  };

  const heroImageUri = useMemo(() => {
    return getDestinationImage(destName);
  }, [destName]);

  // Filter curated places matching destination
  const matchingPlaces = useMemo(() => {
    return PLACES_DATA.filter((p) =>
      p.destination?.toLowerCase().includes(destName.toLowerCase()) ||
      destName.toLowerCase().includes(p.destination?.toLowerCase())
    );
  }, [destName]);

  // Filter demo travelers matching destination or active
  const matchingTravelers = useMemo(() => {
    const all = getDemoTravelers();
    return all.filter((t) =>
      t.trip_destination?.toLowerCase().includes(destName.toLowerCase()) ||
      t.city?.toLowerCase().includes(destName.toLowerCase())
    );
  }, [destName]);

  // Filter demo hangouts matching destination
  const matchingHangouts = useMemo(() => {
    const all = getDemoHangouts();
    return all.filter((h) =>
      h.destination?.toLowerCase().includes(destName.toLowerCase()) ||
      destName.toLowerCase().includes(h.destination?.toLowerCase())
    );
  }, [destName]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Hero Banner with Photographic Backdrop */}
          <View style={styles.heroWrapper}>
            <Image
              source={typeof heroImageUri === 'string' ? { uri: heroImageUri } : heroImageUri}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(23, 24, 23, 0.2)', 'rgba(23, 24, 23, 0.85)']}
              style={StyleSheet.absoluteFill}
            />

            {/* Top Bar with Close button */}
            <View style={[styles.heroTopBar, { paddingTop: Math.max(insets.top, 14) }]}>
              <View style={styles.stateBadge}>
                <Ionicons name="location" size={11} color="#C8B27A" />
                <Text style={styles.stateBadgeText}>{editorial.state.toUpperCase()}</Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="#FAF8F3" />
              </TouchableOpacity>
            </View>

            {/* Destination Title & Editorial Tagline */}
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{destName}</Text>
              <Text style={styles.heroTagline} numberOfLines={2}>
                {editorial.tagline}
              </Text>

              {/* Best Season & Vibes Row */}
              <View style={styles.metaRow}>
                <View style={styles.seasonChip}>
                  <Ionicons name="calendar-outline" size={12} color="#C8B27A" style={{ marginRight: 4 }} />
                  <Text style={styles.seasonText}>Best: {editorial.bestSeason}</Text>
                </View>

                {editorial.vibe.slice(0, 3).map((vibe, idx) => (
                  <View key={idx} style={styles.vibeChip}>
                    <Text style={styles.vibeText}>{vibe}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Section Navigation Tabs */}
          <View style={styles.tabNavRow}>
            {[
              { id: 'places', label: `Places (${matchingPlaces.length})` },
              { id: 'travelers', label: `Travelers (${matchingTravelers.length})` },
              { id: 'hangouts', label: `Hangouts (${matchingHangouts.length})` },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tabNavItem, isSelected && styles.tabNavItemActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabNavLabel, isSelected ? styles.tabNavLabelActive : { color: colors.textSecondary }]}>
                    {tab.label}
                  </Text>
                  {isSelected && <View style={styles.activeTabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Content Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.contentScroll, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
          >
            {/* PLACES TAB */}
            {activeTab === 'places' && (
              <View style={styles.tabSection}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Curated Landmarks & Stays</Text>
                {matchingPlaces.length === 0 ? (
                  <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                    No places currently cataloged for {destName}.
                  </Text>
                ) : (
                  matchingPlaces.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      style={[styles.placeCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose && onClose();
                        onOpenPlace ? onOpenPlace(place.id) : router.push('/(tabs)/discovery');
                      }}
                    >
                      <Image source={{ uri: place.image_url }} style={styles.placeThumb} />
                      <View style={styles.placeInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.placeName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {place.name}
                          </Text>
                          <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={11} color="#C8B27A" />
                            <Text style={styles.ratingText}>{place.rating || 4.8}</Text>
                          </View>
                        </View>
                        <Text style={[styles.placeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {place.description}
                        </Text>
                        <View style={styles.placeFooter}>
                          <Text style={styles.categoryChipText}>{place.category || 'Sight'}</Text>
                          <Text style={[styles.viewDetailsText, { color: '#B99A5E' }]}>Explore landmark →</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* TRAVELERS TAB */}
            {activeTab === 'travelers' && (
              <View style={styles.tabSection}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Travelers Visiting or Nearby
                </Text>
                {matchingTravelers.length === 0 ? (
                  <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                    No active travelers scheduled for {destName} yet. Plan your journey to be the pioneer!
                  </Text>
                ) : (
                  matchingTravelers.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.travelerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose && onClose();
                        onOpenTraveler ? onOpenTraveler(t) : router.push('/(tabs)/discovery');
                      }}
                    >
                      <Avatar uri={t.avatar_url} name={t.name} size={48} isVerified={t.is_verified} />
                      <View style={styles.travelerInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.travelerName, { color: colors.textPrimary }]}>{t.name}, {t.age || 26}</Text>
                          <View style={styles.compatPill}>
                            <Text style={styles.compatPillText}>{t.compatibility || 88}% Match</Text>
                          </View>
                        </View>
                        <Text style={[styles.travelerBio, { color: colors.textSecondary }]} numberOfLines={1}>
                          {t.bio || 'Passionate explorer of Indian architecture and cuisine.'}
                        </Text>
                        <View style={styles.styleTagsRow}>
                          {(t.travel_style || ['Culture', 'Adventure']).map((s, idx) => (
                            <Text key={idx} style={[styles.styleTag, { color: colors.textSecondary }]}>#{s}</Text>
                          ))}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* HANGOUTS TAB */}
            {activeTab === 'hangouts' && (
              <View style={styles.tabSection}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Open Meetup Circles in {destName}
                </Text>
                {matchingHangouts.length === 0 ? (
                  <Text style={[styles.emptySectionText, { color: colors.textSecondary }]}>
                    No open circles yet in {destName}. Start one from the Hangouts menu!
                  </Text>
                ) : (
                  matchingHangouts.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      style={[styles.hangoutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose && onClose();
                        onOpenHangout ? onOpenHangout(h.id) : router.push('/(tabs)/discovery');
                      }}
                    >
                      <View style={styles.hangoutIconBox}>
                        <Ionicons name="chatbubbles" size={20} color="#C8B27A" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.hangoutTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {h.title}
                        </Text>
                        <Text style={[styles.hangoutNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                          {h.notes || 'Gathering kindred spirits for sunset and dining.'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 }}>
                          <Text style={styles.memberCountText}>
                            👥 {h.members?.length || 2} members
                          </Text>
                          <Text style={[styles.viewCircleText, { color: '#B99A5E' }]}>View Circle →</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 24, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '94%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 20,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 24, 23, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  stateBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FAF8F3',
    letterSpacing: 1.1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(23, 24, 23, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    zIndex: 2,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    fontWeight: '800',
    color: '#FAF8F3',
  },
  heroTagline: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#E8E5DE',
    lineHeight: 16,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  seasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 178, 122, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  seasonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#FAF8F3',
  },
  vibeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vibeText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#FAF8F3',
  },
  tabNavRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
  },
  tabNavItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabNavItemActive: {},
  tabNavLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  tabNavLabelActive: {
    color: '#B99A5E',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '60%',
    height: 2.5,
    backgroundColor: '#B99A5E',
    borderRadius: 2,
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptySectionText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 20,
    textAlign: 'center',
  },
  placeCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  placeThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  placeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  placeName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#B99A5E',
  },
  placeDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  placeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  categoryChipText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: '#8C8983',
    textTransform: 'uppercase',
  },
  viewDetailsText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  travelerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  travelerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  travelerName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  compatPill: {
    backgroundColor: 'rgba(185, 154, 94, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compatPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#756345',
  },
  travelerBio: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  styleTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  styleTag: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  hangoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  hangoutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangoutTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  hangoutNotes: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  memberCountText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#8C8983',
  },
  viewCircleText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
});
