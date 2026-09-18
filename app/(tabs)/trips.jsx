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
  ImageBackground,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InputField from '../../components/ui/InputField';
import FilterChip from '../../components/ui/FilterChip';
import EmptyState from '../../components/ui/EmptyState';
import { DEMO_MY_TRIPS, DESTINATION_IMAGES } from '../../lib/demoData';
import { formatTripDateRangeIN } from '../../lib/indiaData';
import { useAuth } from '../../lib/authContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

const TRIPS_BG = require('../../assets/images/dest_manali.jpg');
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

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('date_from', { ascending: true });

        if (!error && data && data.length > 0) {
          setTrips(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Error fetching Supabase trips:', err);
      }
    }

    try {
      const stored = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
      if (stored) {
        setTrips(JSON.parse(stored));
      } else {
        setTrips(DEMO_MY_TRIPS);
        await AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(DEMO_MY_TRIPS));
      }
    } catch {
      setTrips(DEMO_MY_TRIPS);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!destination.trim() || !dateFrom.trim() || !dateTo.trim()) {
      Alert.alert('Missing Details', 'Please specify destination and dates.');
      return;
    }

    setIsPosting(true);
    const newTrip = {
      id: `trip-${Date.now()}`,
      user_id: user?.id || 'current-user-uuid-101',
      destination: destination.trim(),
      date_from: dateFrom.trim(),
      date_to: dateTo.trim(),
      travel_style: selectedStyle,
      looking_for: selectedLookingFor,
      status: 'active',
      created_at: new Date().toISOString(),
      matched_count: 3,
    };

    if (isSupabaseConfigured && user?.id) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .insert([newTrip])
          .select()
          .single();

        if (!error && data) {
          newTrip.id = data.id;
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
    const updatedTrips = trips.map((t) => {
      if (t.id === editingTripId) {
        return {
          ...t,
          destination: editDestination.trim(),
          date_from: editDateFrom.trim(),
          date_to: editDateTo.trim(),
          travel_style: editStyle,
          looking_for: editLookingFor,
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
    <View style={styles.root}>
      {/* Full-Screen Cinematic Travel Photography Background */}
      <ImageBackground
        source={TRIPS_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(6, 21, 34, 0.55)', 'rgba(6, 21, 34, 0.76)', 'rgba(6, 21, 34, 0.94)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={styles.container}>
        {/* Top Header matching exact specification */}
        <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerEyebrow}>YOUR JOURNEYS</Text>
              <Text style={styles.headerTitle}>Your Trips</Text>
              <Text style={styles.headerSubtitle}>Places you're going. Stories you're about to make.</Text>
            </View>

            {/* Primary Action Button: + Plan a Trip */}
            <TouchableOpacity
              onPress={() => setPostModalVisible(true)}
              style={styles.planTripBtn}
              activeOpacity={0.85}
              accessibilityLabel="Plan a Trip"
            >
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.planTripBtnGradient}
              >
                <Ionicons name="add" size={18} color="#061522" style={{ marginRight: 4 }} />
                <Text style={styles.planTripBtnText}>Plan a Trip</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Section Segmented Switcher: UPCOMING & PAST JOURNEYS */}
          <View style={styles.segmentWrapper}>
            <TouchableOpacity
              onPress={() => setSectionFilter('upcoming')}
              style={[styles.segmentBtn, sectionFilter === 'upcoming' && styles.segmentBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentBtnText, sectionFilter === 'upcoming' && styles.segmentBtnTextActive]}>
                UPCOMING ({upcomingTrips.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSectionFilter('past')}
              style={[styles.segmentBtn, sectionFilter === 'past' && styles.segmentBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentBtnText, sectionFilter === 'past' && styles.segmentBtnTextActive]}>
                PAST JOURNEYS ({pastTrips.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {displayedTrips.length > 0 ? (
            displayedTrips.map((trip) => {
              const destImg = DESTINATION_IMAGES[trip.destination] || DESTINATION_IMAGES['Kyoto, Japan'];
              const formattedDateRange = formatTripDates(trip.date_from, trip.date_to);
              const isCompleted = trip.status === 'completed';
              const isCancelled = trip.status === 'cancelled';

              return (
                <View key={trip.id} style={[styles.tripCard, SHADOWS.card]}>
                  {/* Full-width Destination Imagery with Gradient */}
                  <View style={styles.cardImageContainer}>
                    <Image source={destImg} style={styles.cardImage} resizeMode="cover" />
                    <LinearGradient
                      colors={['rgba(6, 21, 34, 0.15)', 'rgba(6, 21, 34, 0.55)', 'rgba(16, 40, 58, 0.95)']}
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

                    <View style={styles.styleBadgePill}>
                      <Ionicons name="sparkles" size={11} color={COLORS.lavender} style={{ marginRight: 4 }} />
                      <Text style={styles.styleBadgeText}>{trip.travel_style || 'Culture • Photography'}</Text>
                    </View>
                  </View>

                  {/* Destination & Country & Dates Hero Info */}
                  <View style={styles.cardHeroInfo}>
                    <Text style={styles.destinationTitle}>{trip.destination?.toUpperCase()}</Text>
                    <View style={styles.datesRow}>
                      <Ionicons name="calendar-outline" size={13} color={COLORS.peach} style={{ marginRight: 6 }} />
                      <Text style={styles.datesText}>{formattedDateRange}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Lower Details & Actions */}
                <View style={styles.cardBody}>
                  {/* Looking For block */}
                  <View style={styles.lookingForSection}>
                    <Text style={styles.lookingForLabel}>LOOKING FOR</Text>
                    <Text style={styles.lookingForValue}>
                      {trip.looking_for || 'Photography buddies & local food explorers'}
                    </Text>
                  </View>

                  {/* Compatible Travelers Row with Overlapping Avatars */}
                  <TouchableOpacity
                    style={styles.compatibleRow}
                    onPress={() => router.push('/(tabs)/discovery')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarCluster}>
                      {COMPATIBLE_AVATARS.map((uri, idx) => (
                        <Image
                          key={idx}
                          source={{ uri }}
                          style={[styles.clusterAvatar, { marginLeft: idx === 0 ? 0 : -10 }]}
                        />
                      ))}
                    </View>
                    <Text style={styles.compatibleText}>
                      <Text style={styles.compatibleNumber}>{trip.matched_count || 3} compatible travelers</Text> in {trip.destination?.split(',')[0]}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.lavender} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>

                  {/* Card Action Row: View Trip & Edit */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      onPress={() => openViewModal(trip)}
                      style={styles.viewTripBtn}
                      activeOpacity={0.8}
                      accessibilityLabel="View Trip Details"
                    >
                      <Text style={styles.viewTripBtnText}>View Trip</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>

                    {trip.status === 'active' && (
                      <TouchableOpacity
                        onPress={() => openEditModal(trip)}
                        style={styles.editBtn}
                        activeOpacity={0.8}
                        accessibilityLabel="Edit Itinerary"
                      >
                        <Ionicons name="create-outline" size={15} color={COLORS.lavender} style={{ marginRight: 5 }} />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleCancelTrip(trip.id)}
                      style={styles.deleteIconBtn}
                      activeOpacity={0.7}
                      accessibilityLabel="Archive Trip"
                    >
                      <Ionicons name="trash-outline" size={17} color="rgba(255, 255, 255, 0.45)" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          /* Empty state matching exact user copy */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="compass-outline" size={48} color={COLORS.lavender} />
            </View>
            <Text style={styles.emptyTitle}>No journeys yet</Text>
            <Text style={styles.emptySubtitle}>
              Start planning somewhere you've always wanted to go.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => setPostModalVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyActionGradient}
              >
                <Ionicons name="paper-plane" size={16} color="#061522" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Plan Your First Trip</Text>
              </LinearGradient>
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
        <View style={styles.modalRoot}>
          {selectedTrip && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setViewModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.modalHeaderTitle}>Trip Itinerary</Text>
                <TouchableOpacity onPress={() => { setViewModalVisible(false); openEditModal(selectedTrip); }}>
                  <Text style={styles.modalHeaderAction}>Edit</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.viewModalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.viewModalHero}>
                  <Image
                    source={DESTINATION_IMAGES[selectedTrip.destination] || DESTINATION_IMAGES['Kyoto, Japan']}
                    style={styles.viewModalImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(6, 21, 34, 0.95)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.viewModalHeroInfo}>
                    <Text style={styles.viewModalDestination}>{selectedTrip.destination}</Text>
                    <Text style={styles.viewModalDates}>{formatTripDates(selectedTrip.date_from, selectedTrip.date_to)}</Text>
                  </View>
                </View>

                <View style={styles.viewModalCard}>
                  <Text style={styles.viewModalSectionTitle}>TRIP STYLE</Text>
                  <Text style={styles.viewModalSectionText}>{selectedTrip.travel_style || 'Culture & Food'}</Text>
                </View>

                <View style={styles.viewModalCard}>
                  <Text style={styles.viewModalSectionTitle}>LOOKING FOR</Text>
                  <Text style={styles.viewModalSectionText}>{selectedTrip.looking_for}</Text>
                </View>

                <View style={styles.viewModalCard}>
                  <Text style={styles.viewModalSectionTitle}>COMPATIBLE TRAVELERS</Text>
                  <Text style={styles.viewModalSectionSubtitle}>
                    {selectedTrip.matched_count || 3} travelers are visiting {selectedTrip.destination?.split(',')[0]} during your dates.
                  </Text>
                  <TouchableOpacity
                    style={styles.findBuddiesBtn}
                    onPress={() => {
                      setViewModalVisible(false);
                      router.push('/(tabs)/discovery');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={15} color="#061522" style={{ marginRight: 6 }} />
                    <Text style={styles.findBuddiesBtnText}>Browse Overlapping Travelers</Text>
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
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPostModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Plan a New Journey</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.postModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>DESTINATION</Text>
              <InputField
                placeholder="e.g. Tokyo, Japan / Bali, Indonesia / Paris"
                value={destination}
                onChangeText={setDestination}
                icon="location-outline"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>DEPARTURE DATE</Text>
                <InputField
                  placeholder="YYYY-MM-DD"
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  icon="calendar-outline"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>RETURN DATE</Text>
                <InputField
                  placeholder="YYYY-MM-DD"
                  value={dateTo}
                  onChangeText={setDateTo}
                  icon="calendar-outline"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>TRAVEL STYLE</Text>
              <View style={styles.styleChipsCloud}>
                {TRIP_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setSelectedStyle(style)}
                    style={[styles.postStyleChip, selectedStyle === style && styles.postStyleChipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.postStyleChipText, selectedStyle === style && styles.postStyleChipTextActive]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>WHAT ARE YOU LOOKING FOR?</Text>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setSelectedLookingFor(opt)}
                  style={[styles.lookingForOption, selectedLookingFor === opt && styles.lookingForOptionActive]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={selectedLookingFor === opt ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={selectedLookingFor === opt ? COLORS.lavender : 'rgba(255, 255, 255, 0.4)'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.lookingForOptionText, selectedLookingFor === opt && styles.lookingForOptionTextActive]}>
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
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Edit Itinerary</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.postModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>DESTINATION</Text>
              <InputField
                placeholder="e.g. Tokyo, Japan"
                value={editDestination}
                onChangeText={setEditDestination}
                icon="location-outline"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>DEPARTURE DATE</Text>
                <InputField
                  placeholder="YYYY-MM-DD"
                  value={editDateFrom}
                  onChangeText={setEditDateFrom}
                  icon="calendar-outline"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>RETURN DATE</Text>
                <InputField
                  placeholder="YYYY-MM-DD"
                  value={editDateTo}
                  onChangeText={setEditDateTo}
                  icon="calendar-outline"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>TRAVEL STYLE</Text>
              <View style={styles.styleChipsCloud}>
                {TRIP_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setEditStyle(style)}
                    style={[styles.postStyleChip, editStyle === style && styles.postStyleChipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.postStyleChipText, editStyle === style && styles.postStyleChipTextActive]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>WHAT ARE YOU LOOKING FOR?</Text>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setEditLookingFor(opt)}
                  style={[styles.lookingForOption, editLookingFor === opt && styles.lookingForOptionActive]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={editLookingFor === opt ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={editLookingFor === opt ? COLORS.lavender : 'rgba(255, 255, 255, 0.4)'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.lookingForOptionText, editLookingFor === opt && styles.lookingForOptionTextActive]}>
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
    color: '#061522',
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
    color: '#061522',
    fontWeight: '700',
  },

  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  /* Destination Card */
  tripCard: {
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(16px)',
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
  completedPillText: { color: '#FFFFFF' },
  cancelledPillText: { color: '#FF7D8A' },

  styleBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 21, 34, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  styleBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 18,
  },

  compatibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
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
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  compatibleText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  viewTripBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  editBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteIconBtn: {
    padding: 10,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginHorizontal: 4,
    backdropFilter: 'blur(16px)',
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  emptyTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
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
    color: '#061522',
    letterSpacing: 0.1,
  },

  /* Modals */
  modalRoot: {
    flex: 1,
    backgroundColor: '#081A2A',
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
    backgroundColor: 'rgba(16, 40, 58, 0.72)',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(12px)',
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
    color: '#FFFFFF',
    lineHeight: 22,
  },
  viewModalSectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: '#061522',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  postStyleChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  postStyleChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  postStyleChipTextActive: {
    fontFamily: FONTS.bold,
    color: '#061522',
    fontWeight: '700',
  },

  lookingForOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#061522',
    letterSpacing: 0.1,
  },
});
