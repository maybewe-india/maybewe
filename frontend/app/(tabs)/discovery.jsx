import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';
import GradientHeader from '../../components/ui/GradientHeader';
import InputField from '../../components/ui/InputField';
import PrimaryButton from '../../components/ui/PrimaryButton';
import FilterChip from '../../components/ui/FilterChip';
import SkeletonCard from '../../components/ui/SkeletonCard';
import EmptyState from '../../components/ui/EmptyState';
import DiscoveryCard from '../../components/DiscoveryCard';
import SafetyReportModal from '../../components/SafetyReportModal';
import { useAuth } from '../../lib/authContext';
import { discoverTravelers } from '../../lib/discovery';
import { sendConnectionRequest } from '../../lib/matches';
import CinematicDestinationZoom from '../../components/CinematicDestinationZoom';
import CinematicSearchModal from '../../components/CinematicSearchModal';
import StaggeredCardWrapper from '../../components/StaggeredCardWrapper';
import PlaceDiscoveryView from '../../components/PlaceDiscoveryView';
import PlaceDetailModal from '../../components/PlaceDetailModal';
import AddToTripModal from '../../components/AddToTripModal';

const FILTER_STYLES = ['All', 'Culture', 'Food', 'Adventure', 'Photography', 'Nature', 'Wellness', 'Backpacking', 'Luxury', 'Beach', 'Nightlife'];
const GENDERS = ['All', 'Female', 'Male', 'Non-binary'];

export default function DiscoveryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();

  const [travelers, setTravelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchDestination, setSearchDestination] = useState(params?.destination || '');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(params?.style || 'All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Discovery Mode: 'travelers' | 'places'
  const [discoveryMode, setDiscoveryMode] = useState(params?.mode === 'places' ? 'places' : 'travelers');
  const [activePlaceDetail, setActivePlaceDetail] = useState(null);
  const [addToTripTargetPlace, setAddToTripTargetPlace] = useState(null);

  // Cinematic Destination Search Transition
  const [cinematicZoomVisible, setCinematicZoomVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [activeCinematicDestination, setActiveCinematicDestination] = useState(params?.destination || 'Goa');
  const lastHandledZoomTransitionRef = useRef(null);

  // Toast Banner
  const [toastMessage, setToastMessage] = useState(null);

  // Safety Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingTraveler, setReportingTraveler] = useState(null);

  // Synchronize route parameters whenever user searches or selects a destination from Home or another screen
  useEffect(() => {
    if (params?.destination) {
      const dest = String(params.destination).trim();
      if (dest) {
        setSearchDestination(dest);
        setActiveCinematicDestination(dest);

        // Only open cinematic full-screen zoom if explicitly requested via openZoom === 'true'
        // and strictly once per navigation trigger
        const transitionKey = `${dest}_${params?.t || 'direct'}`;
        if (params?.openZoom === 'true' && lastHandledZoomTransitionRef.current !== transitionKey) {
          lastHandledZoomTransitionRef.current = transitionKey;
          setCinematicZoomVisible(true);
        }
      }
    }
    if (params?.style && params.style !== 'All') {
      setSelectedStyle(String(params.style));
    }
  }, [params?.destination, params?.style, params?.t, params?.openZoom]);

  const fetchTravelers = useCallback(async () => {
    try {
      const results = await discoverTravelers({
        userId: user?.id,
        destination: searchDestination,
        gender: selectedGender,
        travelStyle: selectedStyle,
        minAge,
        maxAge,
        userStyles: profile?.travel_styles || ['Culture', 'Food', 'Photography'],
      });

      let filtered = results;
      if (onlyVerified) {
        filtered = filtered.filter((t) => t.verification_status === 'verified');
      }

      setTravelers(filtered);
    } catch (err) {
      console.warn('Discovery fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, searchDestination, selectedGender, selectedStyle, minAge, maxAge, onlyVerified, profile?.travel_styles]);

  useEffect(() => {
    fetchTravelers();
  }, [fetchTravelers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTravelers();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleConnect = async (traveler) => {
    showToast(`Connection request sent to ${traveler.name}! ✈️`);
    await sendConnectionRequest({
      currentUserId: user?.id,
      targetUser: traveler,
      tripId: traveler.trip_id,
      note: `Hi ${traveler.name}! I noticed our travel plans to ${traveler.destination} overlap. Let's connect!`,
    });

    setTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
  };

  const handlePass = (traveler) => {
    setTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
    showToast(`Passed on ${traveler.name}`);
  };

  const handleOpenReport = (traveler) => {
    setReportingTraveler(traveler);
    setReportModalVisible(true);
  };

  const handleUserBlocked = (blockedId) => {
    setTravelers((prev) => prev.filter((t) => t.id !== blockedId));
    showToast('Traveler blocked and removed from discovery.');
  };

  const resetFilters = () => {
    setSelectedStyle('All');
    setSelectedGender('All');
    setMinAge(18);
    setMaxAge(60);
    setOnlyVerified(false);
    setSearchDestination('');
  };

  const handleStartCinematicJourney = (destinationName) => {
    if (!destinationName) return;
    setActiveCinematicDestination(destinationName);
    setSearchModalVisible(false);
    setCinematicZoomVisible(true);
  };

  const handleCinematicArrivalComplete = (destinationName) => {
    setCinematicZoomVisible(false);
    if (destinationName) {
      setSearchDestination(destinationName);
    }
    try {
      router.setParams({ openZoom: undefined });
    } catch {}
    showToast(`Arrived in ${destinationName || 'destination'}! Finding compatible travel partners. ✈️`);
  };

  const handleCinematicClose = (destinationName) => {
    setCinematicZoomVisible(false);
    if (destinationName) {
      setSearchDestination(destinationName);
    }
    try {
      router.setParams({ openZoom: undefined });
    } catch {}
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Toast Notification */}
        {toastMessage && (
          <View style={[styles.toastBanner, { top: insets.top + 16, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Ionicons name="sparkles" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.toastText, { color: colors.textPrimary }]}>{toastMessage}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24) + 160 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Top Header - Transparent background */}
          <GradientHeader
            title="Find your travel people."
            subtitle="Plans that overlap. Vibes that connect."
            rightIcon="options-outline"
            rightAction={() => setFilterModalVisible(true)}
            transparent={true}
            style={styles.headerInsideScroll}
          />

          {/* Search Launcher Bar */}
          <View style={styles.searchBarContainer}>
            <TouchableOpacity
              style={styles.searchLauncherBtn}
              onPress={() => setSearchModalVisible(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Search destination or district"
            >
              <View
                style={[
                  styles.searchLauncherContent,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.searchLauncherIcon}
                />
                <Text
                  style={[
                    styles.searchLauncherText,
                    {
                      color: searchDestination ? colors.textPrimary : colors.textDisabled,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {searchDestination || 'Search destination or district (Goa, Guntur, Wayanad)...'}
                </Text>
                {searchDestination ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSearchDestination('');
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.searchLauncherClear}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {FILTER_STYLES.map((style) => (
                <FilterChip
                  key={style}
                  label={style}
                  size="small"
                  selected={selectedStyle === style}
                  onPress={() => setSelectedStyle(style)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Mode Switcher: Companions vs Places & Experiences */}
          <View style={[styles.modeSegmentWrapper, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1EEE6', borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.modeSegmentBtn,
                discoveryMode === 'travelers' && [styles.modeSegmentBtnActive, { backgroundColor: '#171817' }],
              ]}
              onPress={() => setDiscoveryMode('travelers')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={discoveryMode === 'travelers' ? '#B99A5E' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeSegmentBtnText,
                  { color: discoveryMode === 'travelers' ? '#FBFAF7' : colors.textSecondary },
                  discoveryMode === 'travelers' && styles.modeSegmentBtnTextActive,
                ]}
              >
                Companions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeSegmentBtn,
                discoveryMode === 'places' && [styles.modeSegmentBtnActive, { backgroundColor: '#171817' }],
              ]}
              onPress={() => setDiscoveryMode('places')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="compass-outline"
                size={14}
                color={discoveryMode === 'places' ? '#B99A5E' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeSegmentBtnText,
                  { color: discoveryMode === 'places' ? '#FBFAF7' : colors.textSecondary },
                  discoveryMode === 'places' && styles.modeSegmentBtnTextActive,
                ]}
              >
                Places & Spots
              </Text>
            </TouchableOpacity>
          </View>

          {discoveryMode === 'places' ? (
            <PlaceDiscoveryView
              searchDestination={searchDestination}
              onSelectPlace={(p) => setActivePlaceDetail(p)}
              onAddToTrip={(p) => setAddToTripTargetPlace(p)}
            />
          ) : (
            <>
              {/* Feed Header */}
              <View style={styles.feedHeaderRow}>
                <View>
                  <Text style={[styles.feedTitle, { color: colors.textPrimary }]}>Compatible Travelers</Text>
                  <Text style={[styles.feedSubtitle, { color: colors.textSecondary }]}>
                    {travelers.length} traveler{travelers.length === 1 ? '' : 's'} matching your travel criteria
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFilterModalVisible(true)}
                  style={[styles.filterPillBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                >
                  <Ionicons name="filter" size={14} color={colors.primary} />
                  <Text style={[styles.filterPillText, { color: colors.primary }]}>Filters</Text>
                </TouchableOpacity>
              </View>

              {/* Discovery Feed */}
              {loading ? (
                <View>
                  <SkeletonCard height={380} />
                  <SkeletonCard height={380} />
                </View>
              ) : travelers.length > 0 ? (
                travelers.map((traveler, index) => (
                  <StaggeredCardWrapper key={traveler.id} index={index} style={styles.cardWrapper}>
                    <DiscoveryCard
                      traveler={traveler}
                      onConnect={handleConnect}
                      onPass={handlePass}
                    />
                    <TouchableOpacity
                      onPress={() => handleOpenReport(traveler)}
                      style={styles.reportBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="flag-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.reportBtnText, { color: colors.textMuted }]}>Report traveler</Text>
                    </TouchableOpacity>
                  </StaggeredCardWrapper>
                ))
              ) : (
                <EmptyState
                  icon="earth-outline"
                  title="No travelers found yet"
                  description="Try changing your search destination, clearing active filters, or posting a trip to attract fellow travelers."
                  actionTitle="Reset All Filters"
                  onAction={resetFilters}
                />
              )}
            </>
          )}
        </ScrollView>

        {/* Filter Bottom Sheet Modal */}
        <Modal
          visible={filterModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: colors.modalBg, borderColor: colors.borderGlass }]}>
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Discovery Filters</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Gender Preference</Text>
                <View style={styles.chipsWrap}>
                  {GENDERS.map((g) => (
                    <FilterChip
                      key={g}
                      label={g}
                      selected={selectedGender === g}
                      onPress={() => setSelectedGender(g)}
                    />
                  ))}
                </View>

                <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Travel Vibe & Style</Text>
                <View style={styles.chipsWrap}>
                  {FILTER_STYLES.map((st) => (
                    <FilterChip
                      key={st}
                      label={st}
                      selected={selectedStyle === st}
                      onPress={() => setSelectedStyle(st)}
                    />
                  ))}
                </View>

                {/* Verified Toggle */}
                <TouchableOpacity
                  onPress={() => setOnlyVerified(!onlyVerified)}
                  style={[styles.verifiedToggleRow, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Verified Travelers Only</Text>
                    <Text style={[styles.toggleSubtitle, { color: colors.textSecondary }]}>
                      Show only travelers with confirmed community selfie identity verification.
                    </Text>
                  </View>
                  <Ionicons
                    name={onlyVerified ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={onlyVerified ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.sheetFooter}>
                <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
                  <Text style={[styles.resetBtnText, { color: colors.textMuted }]}>Reset</Text>
                </TouchableOpacity>
                <PrimaryButton
                  title="Apply Filters"
                  onPress={() => {
                    setFilterModalVisible(false);
                    fetchTravelers();
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

      {/* Safety Report Modal */}
      <SafetyReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        targetUser={reportingTraveler}
        currentUserId={user?.id}
        onUserBlocked={handleUserBlocked}
      />

      {/* Cinematic Destination Zoom Map Overlay */}
      <CinematicDestinationZoom
        visible={cinematicZoomVisible}
        destinationName={activeCinematicDestination}
        onComplete={handleCinematicArrivalComplete}
        onClose={handleCinematicClose}
        onSelectAnotherDestination={() => {
          setSearchModalVisible(true);
        }}
      />

      {/* Cinematic Search Interface & Popular Destinations Modal */}
      <CinematicSearchModal
        visible={searchModalVisible}
        initialQuery={searchDestination}
        onSelectDestination={handleStartCinematicJourney}
        onClose={() => setSearchModalVisible(false)}
      />

      {/* Place Detail Modal */}
      <PlaceDetailModal
        visible={!!activePlaceDetail}
        place={activePlaceDetail}
        onClose={() => setActivePlaceDetail(null)}
        onAddToTrip={(p) => setAddToTripTargetPlace(p)}
      />

      {/* Add to Trip Modal */}
      <AddToTripModal
        visible={!!addToTripTargetPlace}
        place={addToTripTargetPlace}
        onClose={() => setAddToTripTargetPlace(null)}
        onAdded={() => showToast(`Added to your trip! ✨`)}
      />
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
  },
  toastBanner: {
    position: 'absolute',
    top: 96,
    left: 20,
    right: 20,
    zIndex: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  toastText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  scrollBody: {
    paddingTop: 4,
  },
  headerInsideScroll: {
    paddingTop: 4,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  searchBarContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchLauncherBtn: {
    marginBottom: 12,
  },
  searchLauncherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: RADII.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  searchLauncherIcon: {
    marginRight: 12,
  },
  searchLauncherText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  searchLauncherClear: {
    padding: 4,
    marginLeft: 8,
  },
  chipsScroll: {
    paddingVertical: 2,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  feedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  feedSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    gap: 4,
  },
  filterPillText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardWrapper: {
    marginBottom: 16,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  reportBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetContent: {
    padding: 20,
  },
  filterSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  verifiedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADII.xl,
    backgroundColor: '#F8FAFC',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  resetBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  resetBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  modeSegmentWrapper: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: RADII.full,
    padding: 3,
    borderWidth: 1,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADII.full,
  },
  modeSegmentBtnActive: {
    borderRadius: RADII.full,
  },
  modeSegmentBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  modeSegmentBtnTextActive: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
