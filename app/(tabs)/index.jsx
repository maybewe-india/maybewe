import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import useTimeTheme from '../../lib/timeTheme';
import { useAuth } from '../../lib/authContext';
import { POPULAR_PLACES, DEMO_MY_TRIPS } from '../../lib/demoData';
import FilterChip from '../../components/ui/FilterChip';
import InputField from '../../components/ui/InputField';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

const PREFERENCE_CHIPS = ['Adventure', 'Beach', 'Food', 'Culture', 'Nightlife', 'Nature'];
const HERO_IMAGE = require('../../assets/images/dest_kashmir.jpg');
const HOME_BG = require('../../assets/images/dest_manali.jpg');
const TRIPS_STORAGE_KEY = '@solo_traveler_stored_trips';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const timeTheme = useTimeTheme();
  const { profile, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreference, setSelectedPreference] = useState('Culture');
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Explorer';

  useEffect(() => {
    loadUpcomingTrips();
  }, []);

  const loadUpcomingTrips = async () => {
    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('date_from', { ascending: true })
          .limit(2);

        if (!error && data && data.length > 0) {
          setUpcomingTrips(data);
          return;
        }
      } catch (err) {
        console.warn('Error loading trips from Supabase:', err);
      }
    }

    try {
      const stored = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setUpcomingTrips(parsed.filter((t) => t.status === 'active').slice(0, 2));
        } else {
          setUpcomingTrips(DEMO_MY_TRIPS.filter((t) => t.status === 'active').slice(0, 2));
        }
      } else {
        setUpcomingTrips(DEMO_MY_TRIPS.filter((t) => t.status === 'active').slice(0, 2));
      }
    } catch {
      setUpcomingTrips(DEMO_MY_TRIPS.slice(0, 2));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUpcomingTrips();
    setRefreshing(false);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/(tabs)/discovery',
        params: { destination: searchQuery.trim() },
      });
    } else {
      router.push('/(tabs)/discovery');
    }
  };

  const handleSelectPreference = (pref) => {
    setSelectedPreference(pref);
  };

  const handleExplorePlace = (placeName) => {
    router.push({
      pathname: '/(tabs)/discovery',
      params: { destination: placeName },
    });
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={HOME_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(6, 21, 34, 0.45)',
            'rgba(6, 21, 34, 0.75)',
            'rgba(6, 21, 34, 0.95)',
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
          ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.lavender} />
        }
      >
        {/* Top Atmosphere Bar & Profile Shortcut */}
        <View style={styles.topGreetingBar}>
          <View style={styles.greetingTextBlock}>
            <View style={styles.timeBadgeRow}>
              <View style={[styles.timeBadgeDot, { backgroundColor: timeTheme.accentColor }]} />
              <Text style={[styles.timeBadgeText, { color: timeTheme.accentColor }]}>
                {timeTheme.label.toUpperCase()} ATMOSPHERE
              </Text>
            </View>
            <Text style={styles.greetingTitle}>
              {timeTheme.greeting}, {firstName}
            </Text>
            <Text style={styles.greetingSub}>{timeTheme.tagline}</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatarButton}
            activeOpacity={0.8}
            accessibilityLabel="View profile"
          >
            <LinearGradient
              colors={GRADIENTS.lavenderViolet}
              style={styles.avatarRing}
            >
              <Image
                source={{
                  uri:
                    profile?.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
                }}
                style={styles.avatarImage}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Cinematic Hero Destination Card */}
        <View style={[styles.heroCardWrapper, SHADOWS.card]}>
          <ImageBackground
            source={HERO_IMAGE}
            style={styles.heroImage}
            imageStyle={{ borderRadius: RADII['3xl'] }}
            resizeMode="cover"
          >
            {/* Ambient Time-Based Gradient Overlay */}
            <LinearGradient
              colors={[
                'rgba(6, 21, 34, 0.20)',
                'rgba(6, 21, 34, 0.65)',
                'rgba(6, 21, 34, 0.94)',
              ]}
              style={styles.heroGradient}
            />

            <View style={styles.heroContent}>
              <View style={styles.heroTag}>
                <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                <Text style={styles.heroTagText}>FEATURED JOURNEY</Text>
              </View>

              <Text style={styles.heroHeadline}>Where will you go next?</Text>
              <Text style={styles.heroSupporting}>
                Over 120+ travelers on MaybeWe are planning trips to Goa, Manali, Kashmir, and Kerala this season.
              </Text>

              {/* Instant Search Bar */}
              <View style={styles.heroSearchWrap}>
                <InputField
                  placeholder="Search destinations, travelers..."
                  icon="search-outline"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                  inputStyle={{ color: '#FFFFFF' }}
                  style={{ marginBottom: 0 }}
                />
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Travel Preference Chips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Travel Vibes & Styles</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.preferenceChipsScroll}
        >
          {PREFERENCE_CHIPS.map((chip) => (
            <FilterChip
              key={chip}
              label={chip}
              selected={selectedPreference === chip}
              onPress={() => handleSelectPreference(chip)}
            />
          ))}
        </ScrollView>

        {/* Upcoming Trips Section */}
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionHeaderTextWrap}>
            <Text style={styles.sectionTitle}>Your Upcoming Trips</Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1}>Itineraries active for traveler matching</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/trips')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {upcomingTrips.length > 0 ? (
          upcomingTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              onPress={() => router.push('/(tabs)/trips')}
              activeOpacity={0.85}
              style={[styles.upcomingTripCard, SHADOWS.soft]}
            >
              <View style={styles.tripCardLeft}>
                <View style={styles.airplaneCircle}>
                  <Ionicons name="airplane" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.tripCardInfo}>
                  <Text style={styles.tripDestination}>{trip.destination}</Text>
                  <Text style={styles.tripDates}>
                    {trip.date_from} – {trip.date_to}
                  </Text>
                  <Text style={styles.tripStyleNote}>
                    {trip.travel_style || 'Culture & Exploration'}
                  </Text>
                </View>
              </View>

              <View style={styles.tripCardRight}>
                <View style={styles.matchedBadge}>
                  <Ionicons name="people" size={13} color={COLORS.success} style={{ marginRight: 4 }} />
                  <Text style={styles.matchedCountText}>
                    {trip.matched_count !== undefined ? trip.matched_count : 3} matches
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/trips')}
            style={styles.emptyTripPrompt}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={24} color={COLORS.lavender} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyPromptTitle}>No upcoming trips planned yet</Text>
            <Text style={styles.emptyPromptDesc}>Post your upcoming travel dates to find travelers heading your way.</Text>
          </TouchableOpacity>
        )}

        {/* Popular Places Section (Horizontal Cards) */}
        <View style={[styles.sectionHeaderBetween, { marginTop: 24 }]}>
          <View style={styles.sectionHeaderTextWrap}>
            <Text style={styles.sectionTitle}>Popular Places</Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1}>Top Indian destinations with active solo travelers</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/discovery')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>Explore all</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.popularPlacesScroll}
        >
          {POPULAR_PLACES.map((place) => (
            <TouchableOpacity
              key={place.id}
              onPress={() => handleExplorePlace(place.name)}
              activeOpacity={0.88}
              style={[styles.placeCard, SHADOWS.card]}
            >
              <Image source={place.image} style={styles.placeImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(6, 21, 34, 0.70)', 'rgba(6, 21, 34, 0.95)']}
                style={styles.placeGradient}
              />

              <View style={styles.placeTopBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.placeRatingText}>{place.rating.toFixed(2)}</Text>
              </View>

              <View style={styles.placeBottomInfo}>
                <View style={styles.placeTagPill}>
                  <Text style={styles.placeTagText}>{place.tag}</Text>
                </View>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeCountry}>{place.country}</Text>

                <View style={styles.placeTravelersRow}>
                  <Ionicons name="people-outline" size={12} color={COLORS.lavender} />
                  <Text style={styles.placeTravelersText}>{place.travelersCount} travelers on MaybeWe</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Fast Discovery Action Banner */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/discovery')}
          style={[styles.discoveryBanner, SHADOWS.lavender]}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={GRADIENTS.lavenderViolet}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.discoveryBannerInner}
          >
            <View style={styles.discoveryBannerText}>
              <Text style={styles.discoveryBannerTitle}>Find Your Travel People</Text>
              <Text style={styles.discoveryBannerSubtitle}>
                Meet travelers heading across India who share your vibe.
              </Text>
            </View>
            <View style={styles.discoveryBannerArrow}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  scrollBody: {
    width: '100%',
    maxWidth: '100%',
    paddingHorizontal: 16,
  },
  horizontalScroll: {
    width: '100%',
    maxWidth: '100%',
  },
  topGreetingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  greetingTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  timeBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  greetingTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  greetingSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  avatarButton: {
    padding: 2,
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  testerPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 179, 154, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 154, 0.35)',
  },
  testerPillButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  heroCardWrapper: {
    borderRadius: RADII['3xl'],
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderGlass,
  },
  heroImage: {
    width: '100%',
    minHeight: 340,
    justifyContent: 'flex-end',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADII['3xl'],
  },
  heroContent: {
    padding: 22,
    zIndex: 2,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 5,
    marginBottom: 10,
  },
  heroTagText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroHeadline: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSupporting: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.80)',
    lineHeight: 19,
    marginBottom: 16,
  },
  heroSearchWrap: {
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  seeAllText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  preferenceChipsScroll: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  upcomingTripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII['2xl'],
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
  },
  tripCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  airplaneCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tripCardInfo: {
    flex: 1,
  },
  tripDestination: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  tripDates: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tripStyleNote: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '600',
  },
  tripCardRight: {
    marginLeft: 12,
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(121, 217, 176, 0.16)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(121, 217, 176, 0.30)',
  },
  matchedCountText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
  emptyTripPrompt: {
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII['2xl'],
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
  },
  emptyPromptTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyPromptDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  popularPlacesScroll: {
    paddingVertical: 6,
    gap: 14,
    marginBottom: 24,
  },
  placeCard: {
    width: 200,
    height: 270,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  placeTopBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 21, 34, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: RADII.sm,
    gap: 4,
  },
  placeRatingText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  placeBottomInfo: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  placeTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
    marginBottom: 6,
  },
  placeTagText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeName: {
    fontFamily: FONTS.bold,
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  placeCountry: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.70)',
    marginBottom: 8,
  },
  placeTravelersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeTravelersText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.lavender,
  },
  discoveryBanner: {
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 16,
  },
  discoveryBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  discoveryBannerText: {
    flex: 1,
    marginRight: 12,
  },
  discoveryBannerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#061522',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  discoveryBannerSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(6, 21, 34, 0.75)',
  },
  discoveryBannerArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#061522',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
