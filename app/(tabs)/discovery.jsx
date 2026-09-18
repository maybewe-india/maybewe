import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS } from '../../lib/theme';
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

const DISCOVERY_BG = require('../../assets/images/dest_goa.jpg');

const FILTER_STYLES = ['All', 'Culture', 'Food', 'Adventure', 'Photography', 'Nature', 'Wellness', 'Backpacking', 'Luxury', 'Beach', 'Nightlife'];
const GENDERS = ['All', 'Female', 'Male', 'Non-binary'];

export default function DiscoveryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();

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

  // Toast Banner
  const [toastMessage, setToastMessage] = useState(null);

  // Safety Report Modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingTraveler, setReportingTraveler] = useState(null);

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

  return (
    <View style={styles.root}>
      <ImageBackground
        source={DISCOVERY_BG}
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
        {/* Top Header */}
        <GradientHeader
        title="Find your travel people."
        subtitle="Plans that overlap. Vibes that connect."
        rightIcon="options-outline"
        rightAction={() => setFilterModalVisible(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Search Field & Filter Chips Bar */}
        <View style={styles.searchBarContainer}>
          <InputField
            placeholder="Search destination (Tokyo, Bali, Kyoto, Lisbon)..."
            icon="search-outline"
            value={searchDestination}
            onChangeText={setSearchDestination}
            style={{ marginBottom: 12 }}
          />

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

        {/* Feed Header */}
        <View style={styles.feedHeaderRow}>
          <View>
            <Text style={styles.feedTitle}>Compatible Travelers</Text>
            <Text style={styles.feedSubtitle}>
              {travelers.length} traveler{travelers.length === 1 ? '' : 's'} matching your travel criteria
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={styles.filterPillBtn}
          >
            <Ionicons name="filter" size={14} color="#FFFFFF" />
            <Text style={styles.filterPillText}>Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Discovery Feed */}
        {loading ? (
          <View>
            <SkeletonCard height={380} />
            <SkeletonCard height={380} />
          </View>
        ) : travelers.length > 0 ? (
          travelers.map((traveler) => (
            <View key={traveler.id} style={styles.cardWrapper}>
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
                <Ionicons name="flag-outline" size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.reportBtnText}>Report traveler</Text>
              </TouchableOpacity>
            </View>
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
      </ScrollView>

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Discovery Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionTitle}>Gender Preference</Text>
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

              <Text style={styles.filterSectionTitle}>Travel Vibe & Style</Text>
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
                style={styles.verifiedToggleRow}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.toggleTitle}>Verified Travelers Only</Text>
                  <Text style={styles.toggleSubtitle}>
                    Show only travelers with confirmed community selfie identity verification.
                  </Text>
                </View>
                <Ionicons
                  name={onlyVerified ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={onlyVerified ? COLORS.lavender : COLORS.textMuted}
                />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Reset</Text>
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
    backgroundColor: 'rgba(16, 40, 58, 0.85)',
    borderRadius: RADII.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    ...SHADOWS.card,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  scrollBody: {
    paddingTop: 12,
  },
  searchBarContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chipsScroll: {
    paddingVertical: 2,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
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
    marginBottom: 6,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  reportBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 21, 34, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'rgba(16, 40, 58, 0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
  },
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sheetContent: {
    padding: 20,
  },
  filterSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
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
});
