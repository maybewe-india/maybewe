import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InputField from '../../components/ui/InputField';
import FilterChip from '../../components/ui/FilterChip';
import EmptyState from '../../components/ui/EmptyState';
import { DEMO_MY_TRIPS, DESTINATION_IMAGES } from '../../lib/demoData';
import { formatTripDateRangeIN } from '../../lib/indiaData';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import CalendarPickerModal from '../../components/ui/CalendarPickerModal';
import { getDestinationImage, resolveDestinationImageUri } from '../../lib/destinationImageResolver';

const { width: SCREEN_W } = Dimensions.get('window');
const TRIPS_STORAGE_KEY = '@solo_traveler_stored_trips';

const TRIP_STYLES = [
  'Culture & Food',
  'Adventure & Hiking',
  'Photography & Wandering',
  'Wellness & Yoga',
  'Coastal & Islands',
  'City Exploration',
];

const LOOKING_FOR_OPTIONS = [
  'Photography buddies & local food explorers',
  'Hiking partner & sunrise adventurer',
  'Museum lover & cafe companion',
  'Someone to split stays & explore with',
  'Quiet co-traveler & road trip buddy',
];

// Mock compatible traveler avatars for cluster
const COMPATIBLE_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
];

function formatTripDates(from, to) {
  return formatTripDateRangeIN(from, to);
}

export default function TripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  // 'upcoming' (active) | 'past' (completed)
  const [sectionFilter, setSectionFilter] = useState('upcoming');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Trip Modal State
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Plan a Trip Modal State
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postStep, setPostStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(TRIP_STYLES[0]);
  const [selectedLookingFor, setSelectedLookingFor] = useState(LOOKING_FOR_OPTIONS[0]);
  const [isPosting, setIsPosting] = useState(false);

  // Edit Trip Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editDestination, setEditDestination] = useState('');
  const [editDateFrom, setEditDateFrom] = useState('');
  const [editDateTo, setEditDateTo] = useState('');
  const [editStyle, setEditStyle] = useState(TRIP_STYLES[0]);
  const [editLookingFor, setEditLookingFor] = useState(LOOKING_FOR_OPTIONS[0]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Calendar Range Picker State
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState('create'); // 'create' | 'edit'
  const [calendarActiveField, setCalendarActiveField] = useState('departure'); // 'departure' | 'return'

  const openCalendarForCreate = (field = 'departure') => {
    setCalendarTarget('create');
    setCalendarActiveField(field);
    setCalendarVisible(true);
  };

  const openCalendarForEdit = (field = 'departure') => {
    setCalendarTarget('edit');
    setCalendarActiveField(field);
    setCalendarVisible(true);
  };

  const handleSelectDateRange = ({ dateFrom: fromVal, dateTo: toVal }) => {
    if (calendarTarget === 'create') {
      setDateFrom(fromVal);
      setDateTo(toVal);
    } else {
      setEditDateFrom(fromVal);
      setEditDateTo(toVal);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    // 1. Instant local hydration first (zero blocking delay)
    try {
      const stored = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
      if (stored) {
        setTrips(JSON.parse(stored));
        setLoading(false);
      } else {
        setTrips(DEMO_MY_TRIPS);
        setLoading(false);
        AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(DEMO_MY_TRIPS)).catch(() => {});
      }
    } catch {
      setTrips(DEMO_MY_TRIPS);
      setLoading(false);
    }

    // 2. Silent background sync with Supabase (if configured)
    if (isSupabaseConfigured && user?.id) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Trips query timeout')), 2500)
        );
        const fetchPromise = supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('date_from', { ascending: true });

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
        if (!error && data && data.length > 0) {
          setTrips(data);
          AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(data)).catch(() => {});
        }
      } catch (err) {
        // Silently keep local cached trips
      }
    }
  };

  const handleCreateTrip = async () => {
    if (!destination.trim() || !dateFrom.trim() || !dateTo.trim()) {
      Alert.alert('Missing Details', 'Please specify destination and dates.');
      return;
    }

    setIsPosting(true);
    const coverUrl = resolveDestinationImageUri(destination.trim());
    const newTrip = {
      id: `trip-${Date.now()}`,
      user_id: user?.id || 'current-user-uuid-101',
      destination: destination.trim(),
      date_from: dateFrom.trim(),
      date_to: dateTo.trim(),
      travel_style: selectedStyle,
      looking_for: selectedLookingFor,
      cover_url: coverUrl,
      status: 'active',
      created_at: new Date().toISOString(),
      matched_count: 3,
    };

    if (isSupabaseConfigured && user?.id) {
      try {
        const dbPayload = {
          user_id: user.id,
          destination: destination.trim(),
          date_from: dateFrom.trim(),
          date_to: dateTo.trim(),
          travel_style: selectedStyle,
          looking_for: selectedLookingFor,
          cover_url: coverUrl,
          status: 'active',
        };

        const { data, error } = await supabase
          .from('trips')
          .insert([dbPayload])
          .select()
          .single();

        if (!error && data) {
          newTrip.id = data.id;
        } else if (error) {
          console.warn('Supabase trip insert error:', error);
        }
      } catch (err) {
        console.warn('Supabase trip insert error:', err);
      }
    }

    const updated = [newTrip, ...trips];
    setTrips(updated);
    await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updated));

    setIsPosting(false);
    setPostModalVisible(false);
    resetPostForm();
    Alert.alert('Trip Published! ✈️', 'Your itinerary is active and visible to overlapping travelers.');
  };

  const handleCancelTrip = (tripId) => {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip itinerary? It will be archived.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Cancel Trip',
          style: 'destructive',
          onPress: async () => {
            const updated = trips.map((t) => (t.id === tripId ? { ...t, status: 'cancelled' } : t));
            setTrips(updated);
            await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updated));
            if (viewModalVisible) setViewModalVisible(false);
          },
        },
      ]
    );
  };

  const openEditModal = (trip) => {
    setEditingTripId(trip.id);
    setEditDestination(trip.destination || '');
    setEditDateFrom(trip.date_from || '');
    setEditDateTo(trip.date_to || '');
    setEditStyle(trip.travel_style || TRIP_STYLES[0]);
    setEditLookingFor(trip.looking_for || LOOKING_FOR_OPTIONS[0]);
    setEditModalVisible(true);
  };

  const handleSaveEditTrip = async () => {
    if (!editDestination.trim() || !editDateFrom.trim() || !editDateTo.trim()) {
      Alert.alert('Missing Info', 'Please provide a destination and travel dates.');
      return;
    }

    setIsSavingEdit(true);
    const coverUrl = resolveDestinationImageUri(editDestination.trim());
    const updatedTrips = trips.map((t) => {
      if (t.id === editingTripId) {
        return {
          ...t,
          destination: editDestination.trim(),
          date_from: editDateFrom.trim(),
          date_to: editDateTo.trim(),
          travel_style: editStyle,
          looking_for: editLookingFor,
          cover_url: coverUrl,
        };
      }
      return t;
    });

    setTrips(updatedTrips);
    await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updatedTrips));

    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase
          .from('trips')
          .update({
            destination: editDestination.trim(),
            date_from: editDateFrom.trim(),
            date_to: editDateTo.trim(),
            travel_style: editStyle,
            looking_for: editLookingFor,
            cover_url: coverUrl,
          })
          .eq('id', editingTripId)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('Error updating Supabase trip:', err);
      }
    }

    setIsSavingEdit(false);
    setEditModalVisible(false);
    if (selectedTrip && selectedTrip.id === editingTripId) {
      setSelectedTrip({
        ...selectedTrip,
        destination: editDestination.trim(),
        date_from: editDateFrom.trim(),
        date_to: editDateTo.trim(),
        travel_style: editStyle,
        looking_for: editLookingFor,
        cover_url: coverUrl,
      });
    }
    Alert.alert('Trip Updated! ✈️', 'Your itinerary changes have been saved.');
  };

  const resetPostForm = () => {
    setPostStep(1);
    setDestination('');
    setDateFrom('');
    setDateTo('');
    setSelectedStyle(TRIP_STYLES[0]);
    setSelectedLookingFor(LOOKING_FOR_OPTIONS[0]);
  };

  const openViewModal = (trip) => {
    setSelectedTrip(trip);
    setViewModalVisible(true);
  };

  // Filter trips by section
  const upcomingTrips = trips.filter((t) => t.status === 'active');
  const pastTrips = trips.filter((t) => t.status === 'completed' || t.status === 'cancelled');
  const displayedTrips = sectionFilter === 'upcoming' ? upcomingTrips : pastTrips;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Top Header matching exact specification */}
        <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) + 12, borderBottomColor: '#D7D2C8' }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextGroup}>
              <Text style={[styles.headerEyebrow, { color: '#77766F' }]}>YOUR EXPEDITIONS</Text>
              <Text style={[styles.headerTitle, { color: '#171817' }]}>Your Trips</Text>
              <Text style={[styles.headerSubtitle, { color: '#45453F' }]}>Places you're going. Stories you're about to make.</Text>
            </View>

            {/* Primary Action Button: + Plan a Trip */}
            <TouchableOpacity
              onPress={() => setPostModalVisible(true)}
              style={styles.planTripBtn}
              activeOpacity={0.85}
              accessibilityLabel="Plan a Trip"
            >
              <View style={[styles.planTripBtnGradient, { backgroundColor: '#171817' }]}>
                <Ionicons name="add" size={18} color="#B99A5E" style={{ marginRight: 4 }} />
                <Text style={[styles.planTripBtnText, { color: '#FBFAF7' }]}>Plan a Trip</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section Segmented Switcher: UPCOMING & PAST JOURNEYS */}
          <View style={[styles.segmentWrapper, { backgroundColor: 'rgba(251, 250, 247, 0.90)', borderColor: '#D7D2C8', borderWidth: 1, borderRadius: RADII.full }]}>
            <TouchableOpacity
              onPress={() => setSectionFilter('upcoming')}
              style={[styles.segmentBtn, { borderRadius: RADII.full }, sectionFilter === 'upcoming' && [styles.segmentBtnActive, { backgroundColor: '#171817' }]]}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentBtnText, { color: '#77766F' }, sectionFilter === 'upcoming' && [styles.segmentBtnTextActive, { color: '#FBFAF7' }]]}>
                UPCOMING ({upcomingTrips.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSectionFilter('past')}
              style={[styles.segmentBtn, { borderRadius: RADII.full }, sectionFilter === 'past' && [styles.segmentBtnActive, { backgroundColor: '#171817' }]]}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentBtnText, { color: '#77766F' }, sectionFilter === 'past' && [styles.segmentBtnTextActive, { color: '#FBFAF7' }]]}>
                PAST JOURNEYS ({pastTrips.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: Math.max(insets.bottom, 24) + 160 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {displayedTrips.length > 0 ? (
            displayedTrips.map((trip) => {
              const destImg = getDestinationImage(trip.destination, trip.cover_url);
              const formattedDateRange = formatTripDates(trip.date_from, trip.date_to);
              const isCompleted = trip.status === 'completed';
              const isCancelled = trip.status === 'cancelled';

              return (
                <View key={trip.id} style={[styles.tripCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, SHADOWS.card]}>
                  {/* Full-width Destination Imagery with Gradient */}
                  <View style={styles.cardImageContainer}>
                    <Image source={destImg} style={styles.cardImage} resizeMode="cover" />
                    <LinearGradient
                      colors={['rgba(23, 24, 23, 0.15)', 'rgba(23, 24, 23, 0.45)', 'rgba(251, 250, 247, 0.95)']}
                      locations={[0, 0.55, 1]}
                      style={StyleSheet.absoluteFill}
                    />

                  {/* Top Badges: Status & Compass */}
                  <View style={styles.cardTopBadgeRow}>
                    <View
                      style={[
                        styles.statusPill,
                        isCompleted ? styles.completedPill : isCancelled ? styles.cancelledPill : styles.activePill,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          isCompleted ? styles.completedDot : isCancelled ? styles.cancelledDot : styles.activeDot,
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          isCompleted ? styles.completedPillText : isCancelled ? styles.cancelledPillText : styles.activePillText,
                        ]}
                      >
                        {isCompleted ? 'COMPLETED' : isCancelled ? 'CANCELLED' : 'UPCOMING'}
                      </Text>
                    </View>

                    <View style={[styles.styleBadgePill, { backgroundColor: 'rgba(230, 213, 175, 0.35)', borderColor: 'rgba(185, 154, 94, 0.45)' }]}>
                      <Ionicons name="sparkles" size={11} color="#B99A5E" style={{ marginRight: 4 }} />
                      <Text style={[styles.styleBadgeText, { color: '#171817' }]}>{trip.travel_style || 'Culture • Photography'}</Text>
                    </View>
                  </View>

                  {/* Destination & Country & Dates Hero Info */}
                  <View style={styles.cardHeroInfo}>
                    <Text style={styles.destinationTitle}>{trip.destination?.toUpperCase()}</Text>
                    <View style={styles.datesRow}>
                      <Ionicons name="calendar-outline" size={13} color="#B99A5E" style={{ marginRight: 6 }} />
                      <Text style={styles.datesText}>{formattedDateRange}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Lower Details & Actions */}
                <View style={[styles.cardBody, { backgroundColor: '#FBFAF7' }]}>
                  {/* Looking For block */}
                  <View style={[styles.lookingForSection, { backgroundColor: '#F1EEE6', borderColor: '#D7D2C8' }]}>
                    <Text style={[styles.lookingForLabel, { color: '#B99A5E' }]}>LOOKING FOR</Text>
                    <Text style={[styles.lookingForValue, { color: '#171817' }]}>
                      {trip.looking_for || 'Photography buddies & local food explorers'}
                    </Text>
                  </View>

                  {/* Compatible Travelers Row with Overlapping Avatars */}
                  <TouchableOpacity
                    style={[styles.compatibleRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceElevated, borderColor: colors.border }]}
                    onPress={() => router.push('/(tabs)/discovery')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarCluster}>
                      {COMPATIBLE_AVATARS.map((uri, idx) => (
                        <Image
                          key={idx}
                          source={{ uri }}
                          style={[styles.clusterAvatar, { marginLeft: idx === 0 ? 0 : -10, borderColor: colors.border }]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.compatibleText, { color: colors.textSecondary }]}>
                      <Text style={[styles.compatibleNumber, { color: colors.accent }]}>{trip.matched_count || 3} compatible travelers</Text> in {trip.destination?.split(',')[0]}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>

                  {/* Card Action Row: View Trip & Edit */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      onPress={() => openViewModal(trip)}
                      style={[styles.viewTripBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.surfaceElevated, borderColor: colors.border }]}
                      activeOpacity={0.8}
                      accessibilityLabel="View Trip Details"
                    >
                      <Text style={[styles.viewTripBtnText, { color: colors.textPrimary }]}>View Trip</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.textPrimary} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>

                    {trip.status === 'active' && (
                      <TouchableOpacity
                        onPress={() => openEditModal(trip)}
                        style={[styles.editBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceElevated, borderColor: colors.border }]}
                        activeOpacity={0.8}
                        accessibilityLabel="Edit Itinerary"
                      >
                        <Ionicons name="create-outline" size={15} color={colors.primary} style={{ marginRight: 5 }} />
                        <Text style={[styles.editBtnText, { color: colors.textPrimary }]}>Edit</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleCancelTrip(trip.id)}
                      style={[styles.deleteIconBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.surfaceElevated }]}
                      activeOpacity={0.7}
                      accessibilityLabel="Archive Trip"
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          /* Empty state matching exact user copy */
          <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceElevated, borderColor: colors.border }]}>
              <Ionicons name="compass-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No journeys yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Start planning somewhere you've always wanted to go.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => setPostModalVisible(true)}
              activeOpacity={0.85}
            >
              <View
                style={[styles.emptyActionGradient, { backgroundColor: '#171817', borderRadius: RADII.xl }]}
              >
                <Ionicons name="paper-plane" size={16} color="#B99A5E" style={{ marginRight: 6 }} />
                <Text style={[styles.emptyActionText, { color: '#FBFAF7' }]}>Plan Your First Trip</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* View Trip Details Modal */}
      <Modal
        visible={viewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.modalBg }]}>
          {selectedTrip && (
            <>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setViewModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Trip Itinerary</Text>
                <TouchableOpacity onPress={() => { setViewModalVisible(false); openEditModal(selectedTrip); }}>
                  <Text style={[styles.modalHeaderAction, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.viewModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.viewModalHero}>
                  <Image
                    source={getDestinationImage(selectedTrip.destination, selectedTrip.cover_url)}
                    style={styles.viewModalImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(246, 248, 251, 0.95)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.viewModalHeroInfo}>
                    <Text style={[styles.viewModalDestination, { color: colors.textPrimary }]}>{selectedTrip.destination}</Text>
                    <Text style={styles.viewModalDates}>{formatTripDates(selectedTrip.date_from, selectedTrip.date_to)}</Text>
                  </View>
                </View>

                <View style={[styles.viewModalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.viewModalSectionTitle, { color: colors.primary }]}>TRIP STYLE</Text>
                  <Text style={[styles.viewModalSectionText, { color: colors.textPrimary }]}>{selectedTrip.travel_style || 'Culture & Food'}</Text>
                </View>

                <View style={[styles.viewModalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.viewModalSectionTitle, { color: colors.primary }]}>LOOKING FOR</Text>
                  <Text style={[styles.viewModalSectionText, { color: colors.textPrimary }]}>{selectedTrip.looking_for}</Text>
                </View>

                <View style={[styles.viewModalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.viewModalSectionTitle, { color: colors.primary }]}>COMPATIBLE TRAVELERS</Text>
                  <Text style={[styles.viewModalSectionSubtitle, { color: colors.textSecondary }]}>
                    {selectedTrip.matched_count || 3} travelers are visiting {selectedTrip.destination?.split(',')[0]} during your dates.
                  </Text>
                  <TouchableOpacity
                    style={[styles.findBuddiesBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]}
                    onPress={() => {
                      setViewModalVisible(false);
                      router.push('/(tabs)/discovery');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={15} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={[styles.findBuddiesBtnText, { color: '#0F172A' }]}>Browse Overlapping Travelers</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      {/* Plan A Trip Modal */}
      <Modal
        visible={postModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPostModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setPostModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Plan a New Journey</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.postModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>DESTINATION</Text>
              <InputField
                placeholder="e.g. Tokyo, Japan / Bali, Indonesia / Paris"
                value={destination}
                onChangeText={setDestination}
                icon="location-outline"
              />
            </View>

            <View style={styles.formRow}>
              <TouchableOpacity
                style={[styles.formGroup, { flex: 1, marginRight: 8 }]}
                onPress={() => openCalendarForCreate('departure')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select departure date"
              >
                <Text style={[styles.formLabel, { color: colors.primary }]}>DEPARTURE DATE</Text>
                <View
                  style={[
                    styles.dateTriggerBox,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: dateFrom ? '#B99A5E' : colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={17} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.dateTriggerText,
                      { color: dateFrom ? colors.textPrimary : colors.textDisabled },
                    ]}
                    numberOfLines={1}
                  >
                    {dateFrom || 'YYYY-MM-DD'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}
                onPress={() => openCalendarForCreate('return')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select return date"
              >
                <Text style={[styles.formLabel, { color: colors.primary }]}>RETURN DATE</Text>
                <View
                  style={[
                    styles.dateTriggerBox,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: dateTo ? '#B99A5E' : colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={17} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.dateTriggerText,
                      { color: dateTo ? colors.textPrimary : colors.textDisabled },
                    ]}
                    numberOfLines={1}
                  >
                    {dateTo || 'YYYY-MM-DD'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>TRAVEL STYLE</Text>
              <View style={styles.styleChipsCloud}>
                {TRIP_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setSelectedStyle(style)}
                    style={[
                      styles.postStyleChip,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      selectedStyle === style && [styles.postStyleChipActive, { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }]
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.postStyleChipText,
                      { color: colors.textSecondary },
                      selectedStyle === style && [styles.postStyleChipTextActive, { color: '#0F172A' }]
                    ]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>WHAT ARE YOU LOOKING FOR?</Text>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setSelectedLookingFor(opt)}
                  style={[
                    styles.lookingForOption,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surfaceElevated, borderColor: colors.border },
                    selectedLookingFor === opt && [styles.lookingForOptionActive, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(125, 211, 252, 0.15)', borderColor: colors.primary }]
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={selectedLookingFor === opt ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={selectedLookingFor === opt ? colors.primary : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[
                    styles.lookingForOptionText,
                    { color: colors.textSecondary },
                    selectedLookingFor === opt && [styles.lookingForOptionTextActive, { color: colors.textPrimary }]
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreateTrip}
              style={[styles.submitTripBtn, isPosting && { opacity: 0.6 }]}
              disabled={isPosting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitTripGradient}
              >
                <Text style={styles.submitTripText}>{isPosting ? 'Publishing...' : 'Publish Trip Itinerary'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Trip Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Edit Itinerary</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.postModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>DESTINATION</Text>
              <InputField
                placeholder="e.g. Tokyo, Japan"
                value={editDestination}
                onChangeText={setEditDestination}
                icon="location-outline"
              />
            </View>

            <View style={styles.formRow}>
              <TouchableOpacity
                style={[styles.formGroup, { flex: 1, marginRight: 8 }]}
                onPress={() => openCalendarForEdit('departure')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select edit departure date"
              >
                <Text style={[styles.formLabel, { color: colors.primary }]}>DEPARTURE DATE</Text>
                <View
                  style={[
                    styles.dateTriggerBox,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: editDateFrom ? '#B99A5E' : colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={17} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.dateTriggerText,
                      { color: editDateFrom ? colors.textPrimary : colors.textDisabled },
                    ]}
                    numberOfLines={1}
                  >
                    {editDateFrom || 'YYYY-MM-DD'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}
                onPress={() => openCalendarForEdit('return')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select edit return date"
              >
                <Text style={[styles.formLabel, { color: colors.primary }]}>RETURN DATE</Text>
                <View
                  style={[
                    styles.dateTriggerBox,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: editDateTo ? '#B99A5E' : colors.inputBorder,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={17} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.dateTriggerText,
                      { color: editDateTo ? colors.textPrimary : colors.textDisabled },
                    ]}
                    numberOfLines={1}
                  >
                    {editDateTo || 'YYYY-MM-DD'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>TRAVEL STYLE</Text>
              <View style={styles.styleChipsCloud}>
                {TRIP_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setEditStyle(style)}
                    style={[
                      styles.postStyleChip,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      editStyle === style && [styles.postStyleChipActive, { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' }]
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.postStyleChipText,
                      { color: colors.textSecondary },
                      editStyle === style && [styles.postStyleChipTextActive, { color: '#0F172A' }]
                    ]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>WHAT ARE YOU LOOKING FOR?</Text>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setEditLookingFor(opt)}
                  style={[
                    styles.lookingForOption,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surfaceElevated, borderColor: colors.border },
                    editLookingFor === opt && [styles.lookingForOptionActive, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(125, 211, 252, 0.15)', borderColor: colors.primary }]
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={editLookingFor === opt ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={editLookingFor === opt ? colors.primary : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[
                    styles.lookingForOptionText,
                    { color: colors.textSecondary },
                    editLookingFor === opt && [styles.lookingForOptionTextActive, { color: colors.textPrimary }]
                  ]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSaveEditTrip}
              style={[styles.submitTripBtn, isSavingEdit && { opacity: 0.6 }]}
              disabled={isSavingEdit}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitTripGradient}
              >
                <Text style={styles.submitTripText}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Interactive Luxury Travel Calendar Date Range Picker */}
      <CalendarPickerModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onSelectRange={handleSelectDateRange}
        initialDateFrom={calendarTarget === 'create' ? dateFrom : editDateFrom}
        initialDateTo={calendarTarget === 'create' ? dateTo : editDateTo}
        activeField={calendarActiveField}
        title={calendarTarget === 'create' ? 'Select Trip Dates' : 'Edit Itinerary Dates'}
      />
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

  /* Header */
  headerContainer: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  headerEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.lavender,
    letterSpacing: 2.0,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 18,
  },

  /* Plan a Trip Button */
  planTripBtn: {
    borderRadius: RADII.full,
    overflow: 'hidden',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  planTripBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  planTripBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.1,
  },

  /* Section Segment Tabs */
  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADII.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADII.full,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 1.0,
  },
  segmentBtnTextActive: {
    fontFamily: FONTS.bold,
    color: '#0F172A',
    fontWeight: '700',
  },

  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  /* Destination Card */
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardTopBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    backdropFilter: 'blur(8px)',
  },
  activePill: {
    backgroundColor: 'rgba(121, 217, 176, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(121, 217, 176, 0.5)',
  },
  completedPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cancelledPill: {
    backgroundColor: 'rgba(255, 125, 138, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 125, 138, 0.45)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  activeDot: { backgroundColor: '#79D9B0' },
  completedDot: { backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  cancelledDot: { backgroundColor: '#FF7D8A' },
  statusPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  activePillText: { color: '#79D9B0' },
  completedPillText: { color: '#64748B' },
  cancelledPillText: { color: '#FF7D8A' },

  styleBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  styleBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },

  cardHeroInfo: {
    marginTop: 'auto',
  },
  destinationTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datesText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.peach,
    letterSpacing: 0.1,
  },

  cardBody: {
    padding: 16,
    backgroundColor: 'rgba(10, 26, 40, 0.55)',
  },
  lookingForSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  lookingForLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.lavender,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  lookingForValue: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },

  compatibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  clusterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  compatibleText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#475569',
  },
  compatibleNumber: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.peach,
  },

  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  viewTripBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  editBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  deleteIconBtn: {
    padding: 10,
    borderRadius: RADII.full,
    backgroundColor: '#F1F5F9',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 4,
    ...SHADOWS.card,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyActionBtn: {
    borderRadius: RADII.full,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADII.full,
  },
  emptyActionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.1,
  },

  /* Modals */
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalHeaderAction: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.lavender,
  },

  /* View Modal Body */
  viewModalBody: {
    paddingBottom: 40,
  },
  viewModalHero: {
    width: '100%',
    height: 220,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 20,
  },
  viewModalImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  viewModalHeroInfo: {
    zIndex: 1,
  },
  viewModalDestination: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  viewModalDates: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.peach,
  },
  viewModalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  viewModalSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.lavender,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  viewModalSectionText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 22,
  },
  viewModalSectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  findBuddiesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lavender,
    paddingVertical: 12,
    borderRadius: RADII.full,
  },
  findBuddiesBtnText: {
    fontFamily: FONTS.bold,
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Post / Edit Modal Body */
  postModalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 18,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.lavender,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  styleChipsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  postStyleChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADII.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  postStyleChipActive: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  postStyleChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#475569',
  },
  postStyleChipTextActive: {
    fontFamily: FONTS.bold,
    color: '#0F172A',
    fontWeight: '700',
  },

  lookingForOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  lookingForOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  lookingForOptionText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  lookingForOptionTextActive: {
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  submitTripBtn: {
    marginTop: 12,
    borderRadius: RADII.full,
    overflow: 'hidden',
  },
  submitTripGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADII.full,
  },
  submitTripText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  dateTriggerBox: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: RADII.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  dateTriggerText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
