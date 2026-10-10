import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';
import GradientHeader from '../../components/ui/GradientHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import FilterChip from '../../components/ui/FilterChip';
import SkeletonCard from '../../components/ui/SkeletonCard';
import EmptyState from '../../components/ui/EmptyState';
import DiscoveryCard from '../../components/DiscoveryCard';
import SafetyReportModal from '../../components/SafetyReportModal';
import { useAuth } from '../../lib/authContext';
import {
  discoverTravelers,
  findNearbyTravelers,
  updateNearbyPresence,
  setNearbyVisibility,
  clearNearbyPresence,
  isValidCoordinate,
} from '../../lib/discovery';
import { sendConnectionRequest } from '../../lib/matches';
import CinematicDestinationZoom from '../../components/CinematicDestinationZoom';
import CinematicSearchModal from '../../components/CinematicSearchModal';
import StaggeredCardWrapper from '../../components/StaggeredCardWrapper';
import PlaceDiscoveryView from '../../components/PlaceDiscoveryView';
import {
  getCachedLocation,
  requestCurrentLocation,
  subscribeLocation,
} from '../../lib/locationService';
import PlaceDetailModal from '../../components/PlaceDetailModal';
import AddToTripModal from '../../components/AddToTripModal';

const FILTER_STYLES = ['All', 'Culture', 'Food', 'Adventure', 'Photography', 'Nature', 'Wellness', 'Backpacking', 'Luxury', 'Beach', 'Nightlife'];
const GENDERS = ['All', 'Female', 'Male', 'Non-binary'];
const RADIUS_OPTIONS = [5, 15, 25, 50, 100];
const DISCOVERABLE_STORAGE_KEY = '@maybewe_nearby_discoverable';

export default function DiscoveryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();

  // Mode Selection: 'nearby' (Real GPS Presence) | 'travelers' (Trip Planner Overlap) | 'places' (Spots & Experiences)
  const initialMode = params?.destination ? 'travelers' : (params?.mode || 'nearby');
  const [discoveryMode, setDiscoveryMode] = useState(initialMode);

  // --- TRIP PLANNER STATE ---
  const [travelers, setTravelers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchDestination, setSearchDestination] = useState(params?.destination || '');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(params?.style || 'All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // --- NEARBY NOW STATE (Authoritative GPS & Ephemeral Presence) ---
  const [nearbyTravelers, setNearbyTravelers] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(25);
  const [deviceCoords, setDeviceCoords] = useState(() => getCachedLocation());
  const [gpsStatus, setGpsStatus] = useState(() => (getCachedLocation() ? 'granted' : 'idle'));
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [presenceToggling, setPresenceToggling] = useState(false);

  // --- PLACES & MODALS STATE ---
  const [activePlaceDetail, setActivePlaceDetail] = useState(null);
  const [addToTripTargetPlace, setAddToTripTargetPlace] = useState(null);

  // Subscribe to centralized location updates
  useEffect(() => {
    const unsub = subscribeLocation((state) => {
      if (state.location && isValidCoordinate(state.location.latitude, state.location.longitude)) {
        setDeviceCoords(state.location);
        setGpsStatus('granted');
      } else if (state.status === 'denied') {
        setGpsStatus('denied');
      }
    });
    return unsub;
  }, []);
  const [cinematicZoomVisible, setCinematicZoomVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [activeCinematicDestination, setActiveCinematicDestination] = useState(params?.destination || 'Goa');
  const lastHandledZoomTransitionRef = useRef(null);
  const isDetectingRef = useRef(false);

  // Feedback & Safety
  const [toastMessage, setToastMessage] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingTraveler, setReportingTraveler] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fast local hydration: load cached user location on mount
  useEffect(() => {
    AsyncStorage.getItem('@maybewe_user_location')
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (
              parsed &&
              typeof parsed.lat === 'number' &&
              typeof parsed.lng === 'number' &&
              isValidCoordinate(parsed.lat, parsed.lng)
            ) {
              const loadedCoords = {
                latitude: parsed.lat,
                longitude: parsed.lng,
                accuracy: parsed.accuracy || null,
              };
              setDeviceCoords(loadedCoords);
              setGpsStatus('granted');
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // Load saved Discoverable Nearby state (Default is strictly OFF for privacy)
  useEffect(() => {
    AsyncStorage.getItem(DISCOVERABLE_STORAGE_KEY)
      .then((val) => {
        if (val !== null) {
          setIsDiscoverable(JSON.parse(val));
        }
      })
      .catch(() => {});
  }, []);

  // Synchronize route parameters whenever user searches or selects a destination
  useEffect(() => {
    if (params?.destination) {
      const dest = String(params.destination).trim();
      if (dest) {
        setSearchDestination(dest);
        setActiveCinematicDestination(dest);
        setDiscoveryMode('travelers');

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

  // --- AUTHORITATIVE DEVICE GPS DETECTION ---
  // Delegated to centralized Location Manager with single-flight request deduplication
  const detectDeviceLocation = useCallback(async (forceRefresh = false) => {
    setGpsStatus('detecting');
    try {
      const coords = await requestCurrentLocation({ forceRefresh });
      if (coords && isValidCoordinate(coords.latitude, coords.longitude)) {
        setDeviceCoords(coords);
        setGpsStatus('granted');
        return coords;
      }
      if (deviceCoords) {
        setGpsStatus('granted');
        return deviceCoords;
      }
      setGpsStatus((prev) => (prev === 'denied' ? 'denied' : 'unavailable'));
      return null;
    } catch (err) {
      console.warn('detectDeviceLocation notice:', err);
      setGpsStatus('unavailable');
      return null;
    }
  }, [deviceCoords]);

  // --- NEARBY NOW QUERY & PRESENCE REFRESH ---
  const fetchNearby = useCallback(async (coords = deviceCoords, radius = selectedRadiusKm) => {
    if (!coords || !isValidCoordinate(coords.latitude, coords.longitude)) {
      setNearbyLoading(false);
      return;
    }
    setNearbyLoading(true);
    try {
      // If user has enabled discoverability, actively refresh presence in DB
      if (isDiscoverable) {
        await updateNearbyPresence({
          coords,
          accuracy: coords.accuracy,
          isVisible: true,
        });
      }

      const results = await findNearbyTravelers({
        lat: coords.latitude,
        lng: coords.longitude,
        radiusKm: radius,
        limit: 30,
        userStyles: profile?.travel_styles || ['Culture', 'Food', 'Photography'],
      });

      let filtered = results;
      if (onlyVerified) {
        filtered = filtered.filter((t) => t.verification_status === 'verified');
      }
      setNearbyTravelers(filtered);
    } catch (err) {
      console.warn('fetchNearby error:', err);
    } finally {
      setNearbyLoading(false);
      setRefreshing(false);
    }
  }, [deviceCoords, selectedRadiusKm, isDiscoverable, profile?.travel_styles, onlyVerified]);

  // Handle toggling Discoverable Nearby ON/OFF
  const handleToggleDiscoverable = async (nextVal) => {
    setPresenceToggling(true);
    setIsDiscoverable(nextVal);
    await AsyncStorage.setItem(DISCOVERABLE_STORAGE_KEY, JSON.stringify(nextVal));

    if (nextVal) {
      showToast('Activating nearby presence with GPS... 📍');
      let currentCoords = deviceCoords;
      if (!currentCoords) {
        currentCoords = await detectDeviceLocation(true);
      }

      if (currentCoords) {
        const res = await updateNearbyPresence({
          coords: currentCoords,
          accuracy: currentCoords.accuracy,
          isVisible: true,
        });
        if (res.success) {
          showToast('You are now visible to nearby travelers for 15 minutes! ✨');
          fetchNearby(currentCoords, selectedRadiusKm);
        } else {
          showToast(`Presence update failed: ${res.error || 'Server error'}`);
        }
      } else {
        // GPS permission was denied or unavailable; revert toggle
        setIsDiscoverable(false);
        await AsyncStorage.setItem(DISCOVERABLE_STORAGE_KEY, JSON.stringify(false));
        showToast('Device location required to enable Discoverable Nearby.');
      }
    } else {
      // User opted OFF: delete presence row from DB immediately
      await clearNearbyPresence();
      showToast('Nearby presence removed. You are now invisible.');
    }
    setPresenceToggling(false);
  };

  // Trigger Nearby / Places location detection when entering 'nearby' or 'places' mode
  useEffect(() => {
    if (discoveryMode === 'nearby') {
      if (deviceCoords) {
        fetchNearby(deviceCoords, selectedRadiusKm);
      } else if (gpsStatus !== 'denied' && !isDetectingRef.current) {
        isDetectingRef.current = true;
        detectDeviceLocation(false)
          .then((coords) => {
            if (coords) {
              fetchNearby(coords, selectedRadiusKm);
            }
          })
          .finally(() => {
            isDetectingRef.current = false;
          });
      }
    } else if (discoveryMode === 'places') {
      if (!deviceCoords && gpsStatus !== 'denied' && !isDetectingRef.current) {
        isDetectingRef.current = true;
        detectDeviceLocation(false).finally(() => {
          isDetectingRef.current = false;
        });
      }
    }
  }, [discoveryMode, selectedRadiusKm, deviceCoords]);

  // --- TRIP PLANNER OVERLAP QUERY ---
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
      console.warn('Trip discovery fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, searchDestination, selectedGender, selectedStyle, minAge, maxAge, onlyVerified, profile?.travel_styles]);

  useEffect(() => {
    if (discoveryMode === 'travelers') {
      fetchTravelers();
    }
  }, [discoveryMode, fetchTravelers]);

  const onRefresh = () => {
    setRefreshing(true);
    if (discoveryMode === 'nearby') {
      if (deviceCoords) {
        fetchNearby(deviceCoords, selectedRadiusKm);
      } else {
        detectDeviceLocation(true).then((coords) => {
          if (coords) fetchNearby(coords, selectedRadiusKm);
          else setRefreshing(false);
        });
      }
    } else if (discoveryMode === 'travelers') {
      fetchTravelers();
    } else {
      setRefreshing(false);
    }
  };

  const handleConnect = async (traveler) => {
    showToast(`Connection request sent to ${traveler.name}! ✈️`);
    const note = traveler.is_nearby
      ? `Hi ${traveler.name}! I saw you are active nearby (${traveler.distance_text || 'nearby'}). Let's connect!`
      : `Hi ${traveler.name}! I noticed our travel plans to ${traveler.destination} overlap. Let's connect!`;

    await sendConnectionRequest({
      currentUserId: user?.id,
      targetUser: traveler,
      tripId: traveler.trip_id,
      note,
    });

    if (traveler.is_nearby) {
      setNearbyTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
    } else {
      setTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
    }
  };

  const handlePass = (traveler) => {
    if (traveler.is_nearby) {
      setNearbyTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
    } else {
      setTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
    }
    showToast(`Passed on ${traveler.name}`);
  };

  const handleOpenReport = (traveler) => {
    setReportingTraveler(traveler);
    setReportModalVisible(true);
  };

  const handleUserBlocked = (blockedId) => {
    setTravelers((prev) => prev.filter((t) => t.id !== blockedId));
    setNearbyTravelers((prev) => prev.filter((t) => t.id !== blockedId));
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
      setDiscoveryMode('travelers');
    }
    try {
      router.setParams({ openZoom: undefined });
    } catch {}
    showToast(`Arrived in ${destinationName || 'destination'}! Finding travel companions. ✈️`);
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
          {/* Top Header */}
          <GradientHeader
            title={
              discoveryMode === 'nearby'
                ? 'Travelers Nearby Now'
                : discoveryMode === 'travelers'
                ? 'Trip & Date Match'
                : 'Places & Experiences'
            }
            subtitle={
              discoveryMode === 'nearby'
                ? 'Real device GPS proximity. 15-minute ephemeral presence.'
                : discoveryMode === 'travelers'
                ? 'Planned trips that overlap. Vibes that connect.'
                : 'Curated spots & local hidden gems.'
            }
            rightIcon={discoveryMode === 'travelers' ? 'options-outline' : undefined}
            rightAction={discoveryMode === 'travelers' ? () => setFilterModalVisible(true) : undefined}
            transparent={true}
            style={styles.headerInsideScroll}
          />

          {/* Mode Switcher: 3 Segments */}
          <View style={[styles.modeSegmentWrapper, { backgroundColor: '#F4EFEB', borderColor: 'rgba(197, 168, 128, 0.28)' }]}>
            <TouchableOpacity
              style={[
                styles.modeSegmentBtn,
                discoveryMode === 'nearby' && [styles.modeSegmentBtnActive, { backgroundColor: '#FFFFFF', shadowColor: '#1C1917', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }],
              ]}
              onPress={() => setDiscoveryMode('nearby')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="navigate-circle-outline"
                size={15}
                color={discoveryMode === 'nearby' ? '#C5A880' : '#7D756D'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeSegmentBtnText,
                  { color: discoveryMode === 'nearby' ? '#1E1B18' : '#7D756D' },
                  discoveryMode === 'nearby' && styles.modeSegmentBtnTextActive,
                ]}
              >
                Nearby Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeSegmentBtn,
                discoveryMode === 'travelers' && [styles.modeSegmentBtnActive, { backgroundColor: '#FFFFFF', shadowColor: '#1C1917', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }],
              ]}
              onPress={() => setDiscoveryMode('travelers')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="airplane-outline"
                size={15}
                color={discoveryMode === 'travelers' ? '#C5A880' : '#7D756D'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeSegmentBtnText,
                  { color: discoveryMode === 'travelers' ? '#1E1B18' : '#7D756D' },
                  discoveryMode === 'travelers' && styles.modeSegmentBtnTextActive,
                ]}
              >
                Trip Planner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeSegmentBtn,
                discoveryMode === 'places' && [styles.modeSegmentBtnActive, { backgroundColor: '#FFFFFF', shadowColor: '#1C1917', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }],
              ]}
              onPress={() => setDiscoveryMode('places')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="compass-outline"
                size={15}
                color={discoveryMode === 'places' ? '#C5A880' : '#7D756D'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.modeSegmentBtnText,
                  { color: discoveryMode === 'places' ? '#1E1B18' : '#7D756D' },
                  discoveryMode === 'places' && styles.modeSegmentBtnTextActive,
                ]}
              >
                Places & Spots
              </Text>
            </TouchableOpacity>
          </View>

          {/* MODE A: NEARBY NOW */}
          {discoveryMode === 'nearby' && (
            <View style={styles.nearbySectionContainer}>
              {/* Opt-in Discoverability & Privacy Control Card */}
              <View style={[styles.optInCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.optInHeaderRow}>
                  <View style={styles.optInTextGroup}>
                    <View style={styles.optInStatusLine}>
                      <Text style={[styles.optInTitle, { color: colors.textPrimary }]}>Discoverable Nearby</Text>
                      <View style={[styles.statusDot, { backgroundColor: isDiscoverable ? '#10B981' : '#94A3B8' }]} />
                      <Text style={[styles.statusBadgeText, { color: isDiscoverable ? '#059669' : colors.textMuted }]}>
                        {isDiscoverable ? 'VISIBLE (15m TTL)' : 'OFF (INVISIBLE)'}
                      </Text>
                    </View>
                    <Text style={[styles.optInSubtitle, { color: colors.textSecondary }]}>
                      {isDiscoverable
                        ? 'Active travelers nearby can see your profile & real distance. Your precise GPS coordinates are NEVER exposed.'
                        : 'You are invisible. Enable to let active nearby travelers see your approximate distance.'}
                    </Text>
                  </View>
                  {presenceToggling ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                  ) : (
                    <Switch
                      value={isDiscoverable}
                      onValueChange={handleToggleDiscoverable}
                      trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: '#B99A5E' }}
                      thumbColor={isDiscoverable ? '#FFFFFF' : '#94A3B8'}
                    />
                  )}
                </View>
              </View>

              {/* Radius Filter Pills */}
              <View style={styles.radiusRow}>
                <View style={styles.radiusLabelWrap}>
                  <Ionicons name="radio-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>Radius:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusScroll}>
                  {RADIUS_OPTIONS.map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      style={[
                        styles.radiusChip,
                        selectedRadiusKm === radius && [styles.radiusChipActive, { backgroundColor: isDark ? '#B99A5E' : '#171817' }],
                        { borderColor: selectedRadiusKm === radius ? 'transparent' : colors.border },
                      ]}
                      onPress={() => setSelectedRadiusKm(radius)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.radiusChipText,
                          { color: selectedRadiusKm === radius ? '#FFFFFF' : colors.textSecondary },
                          selectedRadiusKm === radius && { fontWeight: '700' },
                        ]}
                      >
                        {radius} km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* GPS Diagnostic Alerts (Strict No-Fake-Location enforcement) */}
              {gpsStatus === 'denied' && (
                <View style={[styles.gpsAlertCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: '#FCA5A5' }]}>
                  <Ionicons name="location-outline" size={24} color="#EF4444" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.gpsAlertTitle, { color: '#B91C1C' }]}>Location Permission Required</Text>
                    <Text style={[styles.gpsAlertDesc, { color: '#7F1D1D' }]}>
                      Nearby Now calculates authentic physical distance using your device GPS. We never substitute IP location or fake coordinates.
                    </Text>
                    <TouchableOpacity
                      style={styles.gpsAlertBtn}
                      onPress={() => detectDeviceLocation(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.gpsAlertBtnText}>Grant Location Access</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {gpsStatus === 'unavailable' && (
                <View style={[styles.gpsAlertCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: '#FCD34D' }]}>
                  <Ionicons name="refresh-circle-outline" size={24} color="#D97706" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.gpsAlertTitle, { color: '#B45309' }]}>Location Signal Unavailable</Text>
                    <Text style={[styles.gpsAlertDesc, { color: '#92400E' }]}>
                      Could not acquire GPS fix from your device. Please ensure location services are enabled.
                    </Text>
                    <TouchableOpacity
                      style={[styles.gpsAlertBtn, { backgroundColor: '#D97706' }]}
                      onPress={() => detectDeviceLocation(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.gpsAlertBtnText}>Retry GPS Detection</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {gpsStatus === 'detecting' && (
                <View style={styles.detectingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.detectingText, { color: colors.textSecondary }]}>
                    Detecting authoritative device GPS...
                  </Text>
                </View>
              )}

              {/* Feed Header */}
              <View style={styles.feedHeaderRow}>
                <View>
                  <Text style={[styles.feedTitle, { color: colors.textPrimary }]}>Active Nearby People</Text>
                  <Text style={[styles.feedSubtitle, { color: colors.textSecondary }]}>
                    Within {selectedRadiusKm} km • Seen in last 15 min
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onRefresh()}
                  style={[styles.filterPillBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                >
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={[styles.filterPillText, { color: colors.primary }]}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {/* Nearby Feed */}
              {nearbyLoading ? (
                <View>
                  <SkeletonCard height={380} />
                  <SkeletonCard height={380} />
                </View>
              ) : nearbyTravelers.length > 0 ? (
                nearbyTravelers.map((traveler, index) => (
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
                  icon="navigate-circle-outline"
                  title="No travelers nearby yet"
                  description={`No active MaybeWe travelers found within ${selectedRadiusKm} km who opted into Nearby Now in the last 15 minutes. Try expanding your search radius or enable Discoverable Nearby so others can discover you.`}
                  actionTitle={selectedRadiusKm < 100 ? 'Expand to 50 km' : 'Refresh Nearby Search'}
                  onAction={() => {
                    if (selectedRadiusKm < 50) {
                      setSelectedRadiusKm(50);
                    } else if (selectedRadiusKm < 100) {
                      setSelectedRadiusKm(100);
                    } else {
                      onRefresh();
                    }
                  }}
                />
              )}
            </View>
          )}

          {/* MODE B: TRIP PLANNER (Destinations & Overlaps) */}
          {discoveryMode === 'travelers' && (
            <>
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
                        backgroundColor: isDark ? colors.cardBg : '#FFFFFF',
                        borderColor: colors.border,
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
                          if (e?.stopPropagation) e.stopPropagation();
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

              {/* Feed Header */}
              <View style={styles.feedHeaderRow}>
                <View>
                  <Text style={[styles.feedTitle, { color: colors.textPrimary }]}>Compatible Travelers</Text>
                  <Text style={[styles.feedSubtitle, { color: colors.textSecondary }]}>
                    {travelers.length} traveler{travelers.length === 1 ? '' : 's'} with planned trip overlap
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

          {/* MODE C: PLACES & SPOTS */}
          {discoveryMode === 'places' && (
            <PlaceDiscoveryView
              deviceCoords={deviceCoords}
              gpsStatus={gpsStatus}
              onRetryLocation={() => detectDeviceLocation(true)}
              searchDestination={searchDestination}
              onSelectPlace={(p) => setActivePlaceDetail(p)}
              onAddToTrip={(p) => setAddToTripTargetPlace(p)}
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
  modeSegmentWrapper: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
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
  nearbySectionContainer: {
    paddingHorizontal: 16,
  },
  optInCard: {
    borderRadius: RADII.xl,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  optInHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optInTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  optInStatusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  optInTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  optInSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  radiusLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  radiusLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  radiusScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radiusChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  radiusChipActive: {
    borderRadius: RADII.full,
  },
  radiusChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  gpsAlertCard: {
    flexDirection: 'row',
    borderRadius: RADII.lg,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  gpsAlertTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  gpsAlertDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  gpsAlertBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADII.md,
    alignSelf: 'flex-start',
  },
  gpsAlertBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  detectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  detectingText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
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
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 16,
  },
  feedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  feedSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  filterPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
    gap: 4,
  },
  filterPillText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 24,
    borderWidth: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetContent: {
    padding: 20,
  },
  filterSectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
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
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
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
  },
});
