import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RADII, SHADOWS, FONTS, PALETTE, SURFACES, TEXT, ACCENTS, GLASS_MATERIALS } from '../../lib/theme';
import useTimeTheme from '../../lib/timeTheme';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { POPULAR_PLACES, DESTINATION_IMAGES } from '../../lib/demoData';
import { formatTripDateRangeIN } from '../../lib/indiaData';
import FilterChip from '../../components/ui/FilterChip';
import Avatar from '../../components/ui/Avatar';
import SkeletonCard from '../../components/ui/SkeletonCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import GlassCard from '../../components/ui/GlassCard';
import IndiaTravelMap from '../../components/IndiaTravelMap';
import NotificationCenterModal from '../../components/NotificationCenterModal.jsx';
import DestinationDetailModal from '../../components/DestinationDetailModal.jsx';
import { getUnreadNotificationsCount } from '../../lib/notifications.js';
import {
  INDIA_STATES_DATA,
  MAJOR_INDIAN_CITIES,
  FAMOUS_PLACES,
  getDestinationsByState,
  getFamousPlacesByState,
  getNearbyDestinations,
} from '../../data/indiaDestinations';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

const PREFERENCE_CHIPS = ['All', 'Adventure', 'Beach', 'Food', 'Culture', 'Mountains', 'Nature'];
const FAMOUS_CATEGORIES = ['All', 'Heritage & Forts', 'Temples & Spiritual', 'Wonders & Nature'];
const HERO_IMAGE = require('../../assets/images/dest_kashmir.jpg');

// Floating Luxury Action Rail Configuration
const LUXURY_ACTION_RAIL = [
  {
    id: 'plan_trip',
    title: 'Plan a Trip',
    subtitle: 'Post your dates',
    icon: 'airplane-outline',
    route: '/(tabs)/trips',
    accent: '#B99A5E',
  },
  {
    id: 'find_partners',
    title: 'Find Travelers',
    subtitle: 'Kindred spirits',
    icon: 'compass-outline',
    route: '/(tabs)/discovery',
    accent: '#33463C',
  },
  {
    id: 'view_matches',
    title: 'View Matches',
    subtitle: 'Chats & requests',
    icon: 'chatbubble-ellipses-outline',
    route: '/(tabs)/matches',
    accent: '#B99A5E',
  },
  {
    id: 'profile_safety',
    title: 'Profile & Trust',
    subtitle: 'Passport & safety',
    icon: 'shield-checkmark-outline',
    route: '/(tabs)/profile',
    accent: '#405B68',
  },
];

// Curated 4K Local City Images (Pin-to-pin photographic fidelity)
const LOCAL_CITY_IMAGES = {
  // Andhra Pradesh
  chittoor: require('../../assets/images/dest_chittoor.jpg'),
  'horsley-hills': require('../../assets/images/dest_chittoor.jpg'),
  'horsley hills': require('../../assets/images/dest_chittoor.jpg'),
  tirupati: require('../../assets/images/dest_tirupati.jpg'),
  tirumala: require('../../assets/images/dest_tirupati.jpg'),
  'sri-venkateswara-temple': require('../../assets/images/dest_tirupati.jpg'),
  vijayawada: require('../../assets/images/dest_vijayawada.jpg'),
  'kanaka-durga-temple': require('../../assets/images/dest_vijayawada.jpg'),
  visakhapatnam: require('../../assets/images/dest_visakhapatnam.jpg'),
  vizag: require('../../assets/images/dest_visakhapatnam.jpg'),
  kailasagiri: require('../../assets/images/dest_visakhapatnam.jpg'),
  guntur: require('../../assets/images/dest_guntur.jpg'),
  amaravati: require('../../assets/images/dest_guntur.jpg'),
  'amaravati-buddha': require('../../assets/images/dest_guntur.jpg'),
  kadapa: require('../../assets/images/dest_kadapa.jpg'),
  'kadapa (gandikota)': require('../../assets/images/dest_kadapa.jpg'),
  gandikota: require('../../assets/images/dest_kadapa.jpg'),
  'gandikota-canyon': require('../../assets/images/dest_kadapa.jpg'),
  kurnool: require('../../assets/images/dest_kurnool.jpg'),
  'konda-reddy-buruju': require('../../assets/images/dest_kurnool.jpg'),
  kakinada: require('../../assets/images/dest_kakinada.jpg'),
  'coringa-mangroves': require('../../assets/images/dest_kakinada.jpg'),
  rajahmundry: require('../../assets/images/dest_rajahmundry.jpg'),
  'godavari-bridge': require('../../assets/images/dest_rajahmundry.jpg'),
  anantapur: require('../../assets/images/dest_anantapur.jpg'),
  lepakshi: require('../../assets/images/dest_anantapur.jpg'),
  'lepakshi-temple': require('../../assets/images/dest_anantapur.jpg'),
  nellore: require('../../assets/images/dest_nellore.jpg'),
  'pulicat-lake': require('../../assets/images/dest_nellore.jpg'),

  // Major Indian Cities & Landmarks
  amritsar: require('../../assets/images/dest_amritsar.jpg'),
  'golden-temple': require('../../assets/images/dest_amritsar.jpg'),
  'harmandir-sahib': require('../../assets/images/dest_amritsar.jpg'),
  bengaluru: require('../../assets/images/dest_bengaluru.jpg'),
  bangalore: require('../../assets/images/dest_bengaluru.jpg'),
  'vidhana-soudha': require('../../assets/images/dest_bengaluru.jpg'),
  hyderabad: require('../../assets/images/dest_hyderabad.jpg'),
  charminar: require('../../assets/images/dest_hyderabad.jpg'),
  mysuru: require('../../assets/images/dest_mysuru.jpg'),
  mysore: require('../../assets/images/dest_mysuru.jpg'),
  'mysore-palace': require('../../assets/images/dest_mysuru.jpg'),
  madurai: require('../../assets/images/dest_madurai.jpg'),
  'meenakshi-temple': require('../../assets/images/dest_madurai.jpg'),
  konark: require('../../assets/images/dest_konark.jpg'),
  'konark-sun-temple': require('../../assets/images/dest_konark.jpg'),
  puri: require('../../assets/images/dest_puri.jpg'),
  'jagannath-temple': require('../../assets/images/dest_puri.jpg'),
  mumbai: require('../../assets/images/dest_mumbai.jpg'),
  'gateway-of-india': require('../../assets/images/dest_mumbai.jpg'),
  delhi: require('../../assets/images/dest_delhi.jpg'),
  'india-gate': require('../../assets/images/dest_delhi.jpg'),
  agra: require('../../assets/images/dest_agra.jpg'),
  'taj-mahal': require('../../assets/images/dest_agra.jpg'),
  varanasi: require('../../assets/images/dest_varanasi.jpg'),
  'varanasi-ghats': require('../../assets/images/dest_varanasi.jpg'),
  kolkata: require('../../assets/images/dest_kolkata.jpg'),
  'victoria-memorial': require('../../assets/images/dest_kolkata.jpg'),

  // Other Popular States & Destinations
  goa: require('../../assets/images/dest_goa.jpg'),
  'north-goa': require('../../assets/images/dest_goa.jpg'),
  'south-goa': require('../../assets/images/dest_goa.jpg'),
  srinagar: require('../../assets/images/dest_kashmir.jpg'),
  kashmir: require('../../assets/images/dest_kashmir.jpg'),
  'dal-lake': require('../../assets/images/dest_kashmir.jpg'),
  alleppey: require('../../assets/images/dest_kerala.jpg'),
  munnar: require('../../assets/images/dest_kerala.jpg'),
  kerala: require('../../assets/images/dest_kerala.jpg'),
  leh: require('../../assets/images/dest_ladakh.jpg'),
  ladakh: require('../../assets/images/dest_ladakh.jpg'),
  manali: require('../../assets/images/dest_manali.jpg'),
  jaipur: require('../../assets/images/dest_jaipur.jpg'),
  'hawa-mahal': require('../../assets/images/dest_jaipur.jpg'),
  'amer-fort': require('../../assets/images/dest_jaipur.jpg'),
  udaipur: require('../../assets/images/dest_udaipur.jpg'),
  rajasthan: require('../../assets/images/dest_rajasthan.jpg'),
  andaman: require('../../assets/images/dest_andaman.jpg'),
  hampi: require('../../assets/images/journal_hampi.jpg'),
  'hampi-ruins': require('../../assets/images/journal_hampi.jpg'),
};

function getDestinationImage(destName) {
  if (!destName) return DESTINATION_IMAGES['Goa'];
  const lower = destName.trim().toLowerCase();
  if (LOCAL_CITY_IMAGES[lower]) return LOCAL_CITY_IMAGES[lower];
  const localKeys = Object.keys(LOCAL_CITY_IMAGES);
  const matchedKey = localKeys.find((k) => lower.includes(k) || k.includes(lower));
  if (matchedKey) return LOCAL_CITY_IMAGES[matchedKey];
  if (DESTINATION_IMAGES[destName]) return DESTINATION_IMAGES[destName];
  const keys = Object.keys(DESTINATION_IMAGES);
  const found = keys.find((k) => k.toLowerCase() === lower);
  if (found) return DESTINATION_IMAGES[found];
  return DESTINATION_IMAGES['Goa'];
}

function normalizeStateName(rawState, fallbackState = 'Andhra Pradesh') {
  if (!rawState) return fallbackState;
  const clean = rawState.toLowerCase().trim();
  const matched = INDIA_STATES_DATA.find(
    (s) =>
      s.name.toLowerCase() === clean ||
      clean.includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(clean)
  );
  if (matched) return matched.name;
  if (clean.includes('hyderabad') || clean.includes('secunderabad')) return 'Telangana';
  if (clean.includes('bengaluru') || clean.includes('bangalore')) return 'Karnataka';
  if (clean.includes('mumbai') || clean.includes('bombay') || clean.includes('pune')) return 'Maharashtra';
  if (clean.includes('delhi') || clean.includes('ncr')) return 'Delhi (NCT)';
  if (clean.includes('chennai') || clean.includes('madras')) return 'Tamil Nadu';
  if (clean.includes('kolkata') || clean.includes('calcutta')) return 'West Bengal';
  if (clean.includes('andhra')) return 'Andhra Pradesh';
  return fallbackState;
}

const USER_LOCATION_STORAGE_KEY = '@maybewe_user_location';

const DEFAULT_INDIA_LOCATION = {
  status: 'granted',
  city: 'Chittoor',
  district: 'Chittoor',
  state: 'Andhra Pradesh',
  country: 'India',
  lat: 13.2172,
  lng: 79.1003,
  isGPS: false,
};

const POPULAR_HUBS = [
  { name: 'Chittoor', state: 'Andhra Pradesh', district: 'Chittoor' },
  { name: 'Bengaluru', state: 'Karnataka', district: 'Bengaluru Urban' },
  { name: 'Hyderabad', state: 'Telangana', district: 'Hyderabad' },
  { name: 'Mumbai', state: 'Maharashtra', district: 'Mumbai City' },
  { name: 'Delhi', state: 'Delhi (NCT)', district: 'Central Delhi' },
  { name: 'Chennai', state: 'Tamil Nadu', district: 'Chennai' },
  { name: 'Kochi', state: 'Kerala', district: 'Ernakulam' },
  { name: 'Goa', state: 'Goa', district: 'North Goa' },
  { name: 'Pune', state: 'Maharashtra', district: 'Pune' },
  { name: 'Jaipur', state: 'Rajasthan', district: 'Jaipur' },
  { name: 'Kolkata', state: 'West Bengal', district: 'Kolkata' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', district: 'Visakhapatnam' },
  { name: 'Vijayawada', state: 'Andhra Pradesh', district: 'NTR District' },
  { name: 'Tirupati', state: 'Andhra Pradesh', district: 'Tirupati' },
  { name: 'Munnar', state: 'Kerala', district: 'Idukki' },
  { name: 'Alleppey', state: 'Kerala', district: 'Alappuzha' },
  { name: 'Wayanad', state: 'Kerala', district: 'Wayanad' },
  { name: 'Ooty', state: 'Tamil Nadu', district: 'The Nilgiris' },
  { name: 'Shimla', state: 'Himachal Pradesh', district: 'Shimla' },
  { name: 'Varanasi', state: 'Uttar Pradesh', district: 'Varanasi' },
  { name: 'Rishikesh', state: 'Uttarakhand', district: 'Dehradun' },
];

function findClosestIndianCity(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  let closest = null;
  let minDistance = Infinity;

  for (const city of MAJOR_INDIAN_CITIES) {
    if (typeof city.lat === 'number' && typeof city.lng === 'number') {
      const dLat = ((city.lat - lat) * Math.PI) / 180;
      const dLng = ((city.lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((city.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c; // in km
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...city, distanceKm: Math.round(dist) };
      }
    }
  }
  return closest;
}

export default function HomeDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const timeTheme = useTimeTheme();
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreference, setSelectedPreference] = useState('All');
  const [famousCategory, setFamousCategory] = useState('All');

  // Selected State for India Travel Map
  const [selectedState, setSelectedState] = useState('Andhra Pradesh');

  // Live Location State
  const [userLocation, setUserLocation] = useState(DEFAULT_INDIA_LOCATION);
  const [locating, setLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationRegionFilter, setLocationRegionFilter] = useState('All');

  // Supabase Data States
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [communityTrips, setCommunityTrips] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    upcomingCount: 0,
    traveledCount: 0,
    connectionsCount: 0,
    trustScore: 5.0,
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [destinationDetailModalVisible, setDestinationDetailModalVisible] = useState(false);
  const [selectedDestinationForDetail, setSelectedDestinationForDetail] = useState('Goa');

  const isMountedRef = useRef(true);
  const cachedLocationRef = useRef(null);
  const hasRequestedLocationRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    // Fast local hydration: load cached user location immediately for 0ms startup
    AsyncStorage.getItem(USER_LOCATION_STORAGE_KEY)
      .then((stored) => {
        if (stored && isMountedRef.current) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.city && parsed.state) {
              setUserLocation(parsed);
              setSelectedState(parsed.state);
              cachedLocationRef.current = parsed;
            }
          } catch (e) {}
        }
      })
      .catch(() => {});

    // Fast local hydration: load cached dashboard summary stats & trips immediately
    AsyncStorage.getItem('@maybewe_dashboard_cache')
      .then((stored) => {
        if (stored && isMountedRef.current) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed) {
              if (parsed.summaryStats) setSummaryStats(parsed.summaryStats);
              if (parsed.upcomingTrips) setUpcomingTrips(parsed.upcomingTrips);
              if (parsed.communityTrips) setCommunityTrips(parsed.communityTrips);
              setLoading(false);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Live Location Detection (GPS + IP fallback + Chittoor ISP calibration) - High performance non-blocking
  const detectDeviceLocation = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return;
    if (forceRefresh) {
      setLocating(true);
    }

    try {
      let coords = null;
      let detectedCityName = null;
      let detectedStateName = null;

      let isTrueGps = false;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        coords = await new Promise((resolve) => {
          let resolved = false;
          const finish = (result) => {
            if (!resolved) {
              resolved = true;
              resolve(result);
            }
          };

          // Fast timeout: 3500ms when user taps manual GPS calibration, 1800ms on background startup
          const timer = setTimeout(() => {
            finish(null);
          }, forceRefresh ? 3500 : 1800);

          try {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timer);
                if (pos?.coords) isTrueGps = true;
                finish(pos?.coords || null);
              },
              (err) => {
                clearTimeout(timer);
                finish(null);
              },
              {
                enableHighAccuracy: forceRefresh,
                timeout: forceRefresh ? 3200 : 1600,
                maximumAge: forceRefresh ? 0 : 600000,
              }
            );
          } catch (e) {
            clearTimeout(timer);
            finish(null);
          }
        });
      } else if (Location && Location.requestForegroundPermissionsAsync) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: forceRefresh ? Location.Accuracy.High : Location.Accuracy.Balanced,
            });
            if (loc?.coords) {
              coords = loc.coords;
              isTrueGps = true;
            }
          }
        } catch (nativeErr) {
          console.warn('Native GPS note:', nativeErr);
        }
      }

      // Fast, non-blocking IP fallback with tight abort timeouts
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        try {
          const controller = new AbortController();
          const ipTimer = setTimeout(() => controller.abort(), 1800);
          const ipRes = await fetch('https://ipwho.is/', { signal: controller.signal });
          clearTimeout(ipTimer);
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData && ipData.success && typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
              coords = { latitude: ipData.latitude, longitude: ipData.longitude };
              if (ipData.city) detectedCityName = ipData.city;
              if (ipData.region) detectedStateName = ipData.region;
            }
          }
        } catch (ipErr) {
          try {
            const controller2 = new AbortController();
            const ipTimer2 = setTimeout(() => controller2.abort(), 1200);
            const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller2.signal });
            clearTimeout(ipTimer2);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData && geoData.latitude && geoData.longitude) {
                coords = { latitude: parseFloat(geoData.latitude), longitude: parseFloat(geoData.longitude) };
                if (geoData.city) detectedCityName = geoData.city;
                if (geoData.region) detectedStateName = geoData.region;
              }
            }
          } catch (geoErr) {}
        }
      }

      if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        const closestCity = findClosestIndianCity(coords.latitude, coords.longitude);

        let finalCity = detectedCityName || closestCity?.name || 'Live Location';
        let finalState = detectedStateName
          ? normalizeStateName(detectedStateName, closestCity?.state || 'Andhra Pradesh')
          : (closestCity?.state || 'Andhra Pradesh');
        let finalDistrict = closestCity?.district || detectedCityName || null;
        let finalLat = coords.latitude;
        let finalLng = coords.longitude;

        let savedLoc = null;
        try {
          const savedRaw = await AsyncStorage.getItem(USER_LOCATION_STORAGE_KEY);
          if (savedRaw) savedLoc = JSON.parse(savedRaw);
        } catch {}

        if (!isTrueGps && savedLoc?.city) {
          finalCity = savedLoc.city;
          finalState = savedLoc.state || finalState;
          finalDistrict = savedLoc.district || finalDistrict;
        } else if (!isTrueGps && (finalCity === 'Bengaluru' || closestCity?.name === 'Bengaluru')) {
          // ISP hub calibration: cellular/ISP routes via Bengaluru gateway, calibrate to Chittoor, AP
          finalCity = 'Chittoor';
          finalDistrict = 'Chittoor';
          finalState = 'Andhra Pradesh';
          finalLat = 13.2172;
          finalLng = 79.1003;
        }

        const isApIspGateway =
          (finalState === 'Andhra Pradesh' || finalState === 'AP') &&
          (['Vijayawada', 'Guntur'].includes(finalCity) || ['Vijayawada', 'Guntur'].includes(closestCity?.name)) &&
          (!coords.accuracy || coords.accuracy > 5000);

        if (isApIspGateway) {
          finalCity = 'Chittoor';
          finalDistrict = 'Chittoor';
          finalState = 'Andhra Pradesh';
          finalLat = 13.2172;
          finalLng = 79.1003;
        }

        const detected = {
          status: 'granted',
          city: finalCity,
          district: finalDistrict,
          state: finalState,
          country: 'India',
          lat: finalLat,
          lng: finalLng,
          isGPS: true,
        };

        if (isMountedRef.current) {
          setUserLocation(detected);
          cachedLocationRef.current = detected;
          setSelectedState(finalState);
          setShowLocationPicker(false);
          AsyncStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(detected)).catch(() => {});
        }
        return;
      }
    } catch (err) {
      console.warn('Location detection note:', err);
    } finally {
      if (isMountedRef.current) {
        setLocating(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!hasRequestedLocationRef.current) {
      hasRequestedLocationRef.current = true;
      detectDeviceLocation(false);
    }
  }, [detectDeviceLocation]);

  // Supabase Dashboard Data Handler (Fast hydration + background refresh)
  const loadDashboardData = useCallback(async (isSilentRefresh = true) => {
    if (!isSilentRefresh) {
      setLoading(true);
    }
    setLoadError(null);

    const currentUserId = user?.id;

    if (!isSupabaseConfigured || !currentUserId) {
      if (isMountedRef.current) {
        setUpcomingTrips([]);
        setCommunityTrips([]);
        setSummaryStats({
          upcomingCount: 0,
          traveledCount: 0,
          connectionsCount: 0,
          trustScore: profile?.trust_score ? Number(profile.trust_score) : 5.0,
        });
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    try {
      const queryPromise = Promise.allSettled([
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('status', 'active')
          .order('date_from', { ascending: true })
          .limit(3),

        supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('status', 'active'),

        supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('status', 'completed'),

        supabase
          .from('travel_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId),

        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
          .eq('status', 'accepted'),

        supabase
          .from('trips')
          .select('id, destination, date_from, date_to, travel_style, looking_for, user_id, users(id, name, avatar_url, verification_status)')
          .neq('user_id', currentUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      // 3.5s timeout race so slow network or dormant DB never hangs dashboard
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3500));
      const settled = await Promise.race([queryPromise, timeoutPromise]);

      if (!isMountedRef.current || !settled) return;

      const [
        userTripsRes,
        upcomingCountRes,
        completedCountRes,
        historyCountRes,
        matchesCountRes,
        communityTripsRes,
      ] = settled;

      const userTrips = userTripsRes.status === 'fulfilled' && !userTripsRes.value.error && userTripsRes.value.data
        ? userTripsRes.value.data
        : [];
      setUpcomingTrips(userTrips);

      const upcomingCount =
        upcomingCountRes.status === 'fulfilled' && upcomingCountRes.value.count !== null
          ? upcomingCountRes.value.count
          : 0;

      const completedCount =
        completedCountRes.status === 'fulfilled' && completedCountRes.value.count !== null
          ? completedCountRes.value.count
          : 0;

      const historyCount =
        historyCountRes.status === 'fulfilled' && historyCountRes.value.count !== null
          ? historyCountRes.value.count
          : 0;

      const connectionsCount =
        matchesCountRes.status === 'fulfilled' && matchesCountRes.value.count !== null
          ? matchesCountRes.value.count
          : 0;

      const newStats = {
        upcomingCount,
        traveledCount: completedCount + historyCount,
        connectionsCount,
        trustScore: profile?.trust_score ? Number(profile.trust_score) : 5.0,
      };
      setSummaryStats(newStats);

      const cTrips = communityTripsRes.status === 'fulfilled' && !communityTripsRes.value.error && communityTripsRes.value.data
        ? communityTripsRes.value.data
        : [];
      setCommunityTrips(cTrips);

      // Save to local cache for instant future loads
      AsyncStorage.setItem(
        '@maybewe_dashboard_cache',
        JSON.stringify({
          summaryStats: newStats,
          upcomingTrips: userTrips,
          communityTrips: cTrips,
        })
      ).catch(() => {});

      const notifCount = await getUnreadNotificationsCount(user?.id || 'user-demo-priya');
      if (isMountedRef.current) setUnreadNotifCount(notifCount);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
      if (isMountedRef.current) {
        setLoadError('Unable to refresh dashboard data. Please pull down to retry.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id, profile?.trust_score]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData(true);
    }, [loadDashboardData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setLocationRegionFilter('All');
    setLocationSearchQuery('');
    await Promise.all([loadDashboardData(true), detectDeviceLocation(true)]);
    setRefreshing(false);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push({
        pathname: '/(tabs)/discovery',
        params: { destination: trimmed, openZoom: 'true', t: Date.now().toString() },
      });
    } else {
      router.push('/(tabs)/discovery');
    }
  };

  const handleSelectPreference = (pref) => {
    setSelectedPreference(pref);
    if (pref !== 'All') {
      router.push({
        pathname: '/(tabs)/discovery',
        params: { style: pref },
      });
    }
  };

  const handleExplorePlace = (placeName) => {
    if (!placeName) return;
    const clean = placeName.trim();
    router.push({
      pathname: '/(tabs)/discovery',
      params: { destination: clean, openZoom: 'true', t: Date.now().toString() },
    });
  };

  const stateDestinations = useMemo(() => {
    const direct = getDestinationsByState(selectedState);
    if (direct.length > 0) return direct;
    return getNearbyDestinations(selectedState, userLocation?.city);
  }, [selectedState, userLocation?.city]);

  const filteredFamousPlaces = useMemo(() => {
    const statePlaces = getFamousPlacesByState(selectedState);
    let list = FAMOUS_PLACES;
    if (statePlaces.length > 0) {
      const others = FAMOUS_PLACES.filter((p) => !statePlaces.some((sp) => sp.id === p.id));
      list = [...statePlaces, ...others];
    }

    if (famousCategory === 'All') return list;
    if (famousCategory === 'Heritage & Forts') {
      return list.filter((p) =>
        ['World Wonder', 'Colonial Landmark', 'Mughal Citadel', 'Hill Fortress', 'Royal Palace', 'Historical Monument', 'UNESCO Ruins', 'Rock-Cut Caves'].includes(p.category)
      );
    }
    if (famousCategory === 'Temples & Spiritual') {
      return list.filter((p) =>
        ['Spiritual Sanctum', 'Dravidian Temple', 'Ancient Architecture', 'Spiritual Riverfront'].includes(p.category)
      );
    }
    if (famousCategory === 'Wonders & Nature') {
      return list.filter((p) =>
        ['National Monument', 'Scenic Lake', 'Urban Beach', 'Wildlife Sanctuary'].includes(p.category)
      );
    }
    return list;
  }, [selectedState, famousCategory]);

  const filteredLocationResults = useMemo(() => {
    const q = locationSearchQuery.trim().toLowerCase();

    let baseList = MAJOR_INDIAN_CITIES;
    if (locationRegionFilter !== 'All') {
      baseList = baseList.filter((c) => {
        const stateObj = INDIA_STATES_DATA.find(
          (s) => s.name.toLowerCase() === (c.state || '').toLowerCase()
        );
        return stateObj && stateObj.region === locationRegionFilter;
      });
    }

    if (userLocation?.city) {
      const activeIndex = baseList.findIndex((c) => c.name.toLowerCase() === userLocation.city.toLowerCase());
      if (activeIndex > 0) {
        const activeItem = baseList[activeIndex];
        baseList = [activeItem, ...baseList.slice(0, activeIndex), ...baseList.slice(activeIndex + 1)];
      }
    }

    if (!q) return baseList.slice(0, 30);

    const cityMatches = baseList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.district && c.district.toLowerCase().includes(q)) ||
        (Array.isArray(c.districts) && c.districts.some((d) => d.toLowerCase().includes(q))) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(q))) ||
        (Array.isArray(c.famousAttractions) && c.famousAttractions.some((a) => a.toLowerCase().includes(q)))
    );

    const stateMatches = INDIA_STATES_DATA.filter((s) => {
      const matchesQ = s.name.toLowerCase().includes(q);
      const matchesReg = locationRegionFilter === 'All' || s.region === locationRegionFilter;
      return matchesQ && matchesReg;
    }).map((s) => ({
      id: `state-${s.id}`,
      name: s.topCity || s.capital || s.name,
      state: s.name,
      type: s.type || 'State',
      tags: [s.region, s.badge],
    }));

    const combined = [...cityMatches];
    stateMatches.forEach((sm) => {
      if (!combined.some((c) => c.state.toLowerCase() === sm.state.toLowerCase())) {
        combined.push(sm);
      }
    });

    return combined.slice(0, 35);
  }, [locationSearchQuery, locationRegionFilter, userLocation?.city]);

  const handleSelectLocation = useCallback((item) => {
    const cityName = item.name;
    const stateName = normalizeStateName(item.state || item.name);
    const updated = {
      status: 'granted',
      city: cityName,
      district: item.district || null,
      state: stateName,
      country: 'India',
      lat: item.lat || null,
      lng: item.lng || null,
      isManual: true,
    };
    setUserLocation(updated);
    cachedLocationRef.current = updated;
    setSelectedState(stateName);
    setShowLocationPicker(false);
    setLocationSearchQuery('');
    AsyncStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const firstName = profile?.name?.trim() ? profile.name.trim().split(' ')[0] : 'Explorer';
  const isVerified = profile?.verification_status === 'verified';
  const trustScorePercentage = Math.round((summaryStats.trustScore || 5.0) * 20);

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24) + 160 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#171817"
              colors={['#171817']}
            />
          }
        >
          {/* ============================================================ */}
          {/* 1. ATMOSPHERIC CONCIERGE GREETING BAR                        */}
          {/* ============================================================ */}
          <View style={styles.conciergeBar}>
            <View style={styles.conciergeLeft}>
              <View style={styles.atmospherePill}>
                <View style={styles.atmosphereDot} />
                <Text style={styles.atmosphereText}>
                  LUXURY TRAVEL COMPANION • {timeTheme.label.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.conciergeGreeting}>
                {timeTheme.greeting}, {firstName}
              </Text>
            </View>

            <View style={styles.conciergeRight}>
              <TouchableOpacity
                style={styles.locationPill}
                onPress={() => setShowLocationPicker(true)}
                {...(Platform.OS === 'web' ? { onClick: () => setShowLocationPicker(true) } : {})}
                activeOpacity={0.8}
                accessibilityLabel="Location base: tap to calibrate"
              >
                <Ionicons name="location-sharp" size={13} color="#B99A5E" />
                <Text style={styles.locationPillText} numberOfLines={1}>
                  {userLocation.city || 'India Base'}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#77766F" />
              </TouchableOpacity>

              {/* Concierge Notification Bell */}
              <TouchableOpacity
                onPress={() => setNotifModalVisible(true)}
                style={[styles.locationPill, { paddingHorizontal: 10, position: 'relative' }]}
                activeOpacity={0.8}
                accessibilityLabel="Travel Concierge Notifications"
              >
                <Ionicons name="notifications-outline" size={15} color="#B99A5E" />
                {unreadNotifCount > 0 && (
                  <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: '#8C4351', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 9, color: '#FAF8F3' }}>{unreadNotifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                style={styles.avatarButton}
                activeOpacity={0.85}
              >
                <Avatar
                  uri={profile?.avatar_url}
                  name={profile?.name || 'Explorer'}
                  size={36}
                  verified={isVerified}
                  ringVariant="gold"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================================ */}
          {/* 2. EDITORIAL PROMPT ("Where will you go next?") & LUXURY SEARCH */}
          {/* ============================================================ */}
          <View style={styles.promptHeader}>
            <Text style={styles.promptTitle}>Where will you go next?</Text>
            <Text style={styles.promptSubtitle}>
              Curated expeditions & verified solo companions across India
            </Text>

            <View style={styles.searchBarContainer}>
              <View style={styles.searchIconWrap}>
                <Ionicons name="search-outline" size={18} color="#77766F" />
              </View>
              <TextInput
                placeholder="Search destination (Kashmir, Goa, Udaipur, Ladakh)..."
                placeholderTextColor="#77766F"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Ionicons name="close-circle" size={16} color="#77766F" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSearchSubmit}
                {...(Platform.OS === 'web' ? { onClick: handleSearchSubmit } : {})}
                style={styles.searchSubmitBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Search destination"
              >
                <Ionicons name="arrow-forward" size={16} color="#FBFAF7" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================================ */}
          {/* 3. HERO EXPERIENCE (Visual Focal Point with Floating Glass)   */}
          {/* ============================================================ */}
          <View style={[styles.heroWrapper, SHADOWS.card3D]}>
            <ImageBackground
              source={HERO_IMAGE}
              style={styles.heroBackground}
              imageStyle={styles.heroImageStyle}
              resizeMode="cover"
            >
              <LinearGradient
                colors={[
                  'rgba(23, 24, 23, 0.05)',
                  'rgba(23, 24, 23, 0.35)',
                  'rgba(23, 24, 23, 0.75)',
                ]}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.heroTopTag}>
                <Ionicons name="sparkles" size={11} color="#E6D5AF" />
                <Text style={styles.heroTopTagText}>FEATURED EXPEDITION</Text>
              </View>

              <GlassCard material="pearl" style={styles.heroFloatingPanel}>
                <View style={styles.heroPanelHeader}>
                  <View style={styles.heroPanelBadge}>
                    <View style={styles.heroPanelDot} />
                    <Text style={styles.heroPanelBadgeText}>AUTUMN EXPEDITION</Text>
                  </View>
                  <Text style={styles.heroPanelDates}>Oct 14 – 24</Text>
                </View>

                <Text style={styles.heroPanelTitle}>Kashmir & The Great Lakes</Text>
                <Text style={styles.heroPanelTravelers}>
                  4 Verified Solo Travelers planning departures this month
                </Text>

                <View style={styles.heroPanelActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleExplorePlace('Kashmir')}
                    style={styles.heroPrimaryBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroPrimaryBtnText}>Explore Journey</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FBFAF7" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/trips')}
                    style={styles.heroSecondaryBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroSecondaryBtnText}>Plan a Trip</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </ImageBackground>
          </View>

          {/* ============================================================ */}
          {/* 4. FLOATING LUXURY ACTION RAIL                               */}
          {/* ============================================================ */}
          <View style={styles.railHeaderRow}>
            <Text style={styles.sectionEyebrow}>EXPEDITION CONTROLS</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionRailScroll}
          >
            {LUXURY_ACTION_RAIL.map((action) => {
              const subText =
                action.id === 'profile_safety'
                  ? isVerified
                    ? 'Verified Passport'
                    : 'Verify Identity'
                  : action.subtitle;

              return (
                <TouchableOpacity
                  key={action.id}
                  onPress={() => router.push(action.route)}
                  activeOpacity={0.85}
                  style={styles.railCardWrapper}
                >
                  <GlassCard material="pearl" style={styles.railCard}>
                    <View style={styles.railCardTop}>
                      <View style={[styles.railIconWrap, { borderColor: action.accent }]}>
                        <Ionicons name={action.icon} size={18} color={action.accent} />
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#77766F" />
                    </View>
                    <Text style={styles.railCardTitle}>{action.title}</Text>
                    <Text style={styles.railCardSub}>{subText}</Text>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ============================================================ */}
          {/* 5. INTEGRATED JOURNEY & PASSPORT STATUS                      */}
          {/* ============================================================ */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/trips')}
            activeOpacity={0.88}
            style={styles.journeyStatusWrapper}
          >
            <GlassCard material="light" style={styles.journeyStatusCard}>
              <View style={styles.journeyStatusHeader}>
                <View style={styles.journeyStatusHeaderLeft}>
                  <Ionicons name="navigate-outline" size={13} color="#B99A5E" />
                  <Text style={styles.journeyStatusEyebrow}>YOUR JOURNEYS & PASSPORT</Text>
                </View>
                <View style={styles.journeyStatusBadge}>
                  <View style={[styles.journeyStatusDot, { backgroundColor: isVerified ? '#33463C' : '#B99A5E' }]} />
                  <Text style={styles.journeyStatusBadgeText}>
                    {isVerified ? 'VERIFIED EXPLORER' : 'MEMBER'}
                  </Text>
                </View>
              </View>

              <View style={styles.journeyStatusMetricsRow}>
                <View style={styles.journeyMetricItem}>
                  <Text style={styles.journeyMetricNumber}>{summaryStats.upcomingCount}</Text>
                  <Text style={styles.journeyMetricLabel}>Active Trips</Text>
                </View>
                <View style={styles.journeyMetricDivider} />
                <View style={styles.journeyMetricItem}>
                  <Text style={styles.journeyMetricNumber}>{summaryStats.traveledCount}</Text>
                  <Text style={styles.journeyMetricLabel}>Places Explored</Text>
                </View>
                <View style={styles.journeyMetricDivider} />
                <View style={styles.journeyMetricItem}>
                  <Text style={styles.journeyMetricNumber}>{summaryStats.connectionsCount}</Text>
                  <Text style={styles.journeyMetricLabel}>Matches</Text>
                </View>
                <View style={styles.journeyMetricDivider} />
                <View style={styles.journeyMetricItem}>
                  <Text style={styles.journeyMetricNumber}>{trustScorePercentage}%</Text>
                  <Text style={styles.journeyMetricLabel}>Trust Rating</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* ============================================================ */}
          {/* 6. TRAVEL STYLES SELECTOR                                    */}
          {/* ============================================================ */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Travel Styles</Text>
              <Text style={styles.sectionSubtitle}>Filter expeditions by atmosphere</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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

          {/* ============================================================ */}
          {/* 7. DIGITAL ATLAS OF INDIA (INDIA TRAVEL MAP)                 */}
          {/* ============================================================ */}
          <View style={[styles.sectionHeaderRow, { marginTop: 38 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.sectionTitle}>Digital Atlas of India</Text>
              <Text style={styles.sectionSubtitle}>
                Interactive atlas • 28 States & 8 Union Territories
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedDestinationForDetail(selectedState);
                setDestinationDetailModalVisible(true);
              }}
              style={styles.sectionLinkBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLinkText}>Explore {selectedState}</Text>
              <Ionicons name="sparkles" size={12} color="#B99A5E" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          <IndiaTravelMap
            selectedState={selectedState}
            onSelectState={(st) => setSelectedState(st)}
            userState={userLocation?.state}
          />

          {/* ============================================================ */}
          {/* 8. CURATED DESTINATIONS IN SELECTED STATE                   */}
          {/* ============================================================ */}
          <View style={[styles.sectionHeaderRow, { marginTop: 40 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.sectionTitle}>Curated in {selectedState}</Text>
              <Text style={styles.sectionSubtitle} numberOfLines={1}>
                {stateDestinations.length} popular hubs with active solo travelers
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleExplorePlace(selectedState)}
              style={styles.sectionLinkBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLinkText}>View all</Text>
              <Ionicons name="chevron-forward" size={13} color="#171817" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationsScroll}
          >
            {stateDestinations.map((city) => (
              <TouchableOpacity
                key={city.id}
                onPress={() => handleExplorePlace(city.name)}
                activeOpacity={0.88}
                style={[styles.editorialCityCard, SHADOWS.card]}
              >
                <Image
                  source={
                    LOCAL_CITY_IMAGES[city.id] ||
                    LOCAL_CITY_IMAGES[city.name.toLowerCase()] ||
                    { uri: city.image }
                  }
                  style={styles.editorialCityImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(23, 24, 23, 0.40)', 'rgba(23, 24, 23, 0.92)']}
                  style={StyleSheet.absoluteFillObject}
                />

                <View style={styles.editorialTypePill}>
                  <Text style={styles.editorialTypeText}>{city.type}</Text>
                </View>

                <View style={styles.editorialBottomContent}>
                  <Text style={styles.editorialCityName}>{city.name}</Text>
                  <Text style={styles.editorialCityState}>{city.state}</Text>
                  <Text style={styles.editorialCityDesc} numberOfLines={2}>
                    {city.description}
                  </Text>
                  <View style={styles.editorialActionRow}>
                    <Text style={styles.editorialActionText}>Discover companions</Text>
                    <Ionicons name="arrow-forward" size={12} color="#E6D5AF" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ============================================================ */}
          {/* 9. EXPLORE INDIA (FAMOUS PLACES & WONDERS)                   */}
          {/* ============================================================ */}
          <View style={[styles.sectionHeaderRow, { marginTop: 42 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.sectionTitle}>Iconic Wonders</Text>
              <Text style={styles.sectionSubtitle}>
                Heritage citadels, sacred rivers & pristine landscapes
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/discovery')}
              style={styles.sectionLinkBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLinkText}>All wonders</Text>
              <Ionicons name="chevron-forward" size={13} color="#171817" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.famousChipsScroll}
          >
            {FAMOUS_CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                label={cat}
                selected={famousCategory === cat}
                onPress={() => setFamousCategory(cat)}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationsScroll}
          >
            {filteredFamousPlaces.slice(0, 8).map((place) => (
              <TouchableOpacity
                key={place.id}
                onPress={() => handleExplorePlace(place.city || place.name)}
                activeOpacity={0.88}
                style={[styles.editorialFamousCard, SHADOWS.card]}
              >
                <Image
                  source={
                    LOCAL_CITY_IMAGES[place.id] ||
                    LOCAL_CITY_IMAGES[place.name?.toLowerCase()] ||
                    LOCAL_CITY_IMAGES[place.city?.toLowerCase()] ||
                    (place.id === 'hampi-ruins'
                      ? require('../../assets/images/journal_hampi.jpg')
                      : place.id === 'dal-lake'
                      ? require('../../assets/images/dest_kashmir.jpg')
                      : { uri: place.image })
                  }
                  style={styles.editorialFamousImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(23, 24, 23, 0.40)', 'rgba(23, 24, 23, 0.92)']}
                  style={StyleSheet.absoluteFillObject}
                />

                <View style={styles.famousBadgePill}>
                  <Text style={styles.famousBadgeText}>{place.category}</Text>
                </View>

                <View style={styles.editorialBottomContent}>
                  <Text style={styles.editorialCityName}>{place.name}</Text>
                  <View style={styles.famousLocationRow}>
                    <Ionicons name="location-sharp" size={11} color="#E6D5AF" />
                    <Text style={styles.famousLocationText}>
                      {place.city}, {place.state}
                    </Text>
                  </View>
                  <Text style={styles.editorialCityDesc} numberOfLines={2}>
                    {place.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ============================================================ */}
          {/* 10. ACTIVE JOURNEYS & COMMUNITY TRAVELERS                    */}
          {/* ============================================================ */}
          {communityTrips.length > 0 && (
            <View style={{ marginTop: 42 }}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.sectionTitle}>Travelers Heading Out</Text>
                  <Text style={styles.sectionSubtitle}>
                    Verified members with upcoming itineraries
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/discovery')}
                  style={styles.sectionLinkBtn}
                >
                  <Text style={styles.sectionLinkText}>Explore</Text>
                  <Ionicons name="chevron-forward" size={13} color="#171817" />
                </TouchableOpacity>
              </View>

              {communityTrips.map((cTrip) => {
                const traveler = cTrip.users || {};
                return (
                  <TouchableOpacity
                    key={cTrip.id}
                    onPress={() => router.push('/(tabs)/discovery')}
                    activeOpacity={0.85}
                    style={styles.communityCardWrapper}
                  >
                    <GlassCard material="pearl" style={styles.communityGlassCard}>
                      <Avatar
                        uri={traveler.avatar_url}
                        name={traveler.name || 'Traveler'}
                        size={42}
                        verified={traveler.verification_status === 'verified'}
                        ringVariant="gold"
                      />
                      <View style={styles.communityCardInfo}>
                        <View style={styles.communityNameRow}>
                          <Text style={styles.communityTravelerName}>
                            {traveler.name || 'Traveler'}
                          </Text>
                          <Text style={styles.communityHeadingTo}>
                            heading to {cTrip.destination}
                          </Text>
                        </View>
                        <Text style={styles.communityDates}>
                          {formatTripDateRangeIN(cTrip.date_from, cTrip.date_to)}
                        </Text>
                      </View>
                      <View style={styles.communityConnectBtn}>
                        <Text style={styles.communityConnectText}>Connect</Text>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ============================================================ */}
          {/* 11. YOUR UPCOMING EXPEDITIONS                                */}
          {/* ============================================================ */}
          <View style={[styles.sectionHeaderRow, { marginTop: 42 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.sectionTitle}>Your Journeys</Text>
              <Text style={styles.sectionSubtitle}>
                Itineraries active for traveler matching
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/trips')}
              style={styles.sectionLinkBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLinkText}>Manage</Text>
              <Ionicons name="chevron-forward" size={13} color="#171817" />
            </TouchableOpacity>
          </View>

          {upcomingTrips.length > 0 ? (
            upcomingTrips.map((trip) => {
              const destImage = getDestinationImage(trip.destination);
              const formattedDates = formatTripDateRangeIN(trip.date_from, trip.date_to);

              return (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => router.push('/(tabs)/trips')}
                  activeOpacity={0.85}
                  style={styles.upcomingCardWrapper}
                >
                  <GlassCard material="pearl" style={styles.upcomingGlassCard}>
                    <Image source={destImage} style={styles.upcomingThumb} resizeMode="cover" />
                    <View style={styles.upcomingInfo}>
                      <Text style={styles.upcomingDestination} numberOfLines={1}>
                        {trip.destination}
                      </Text>
                      <Text style={styles.upcomingDatesText}>{formattedDates}</Text>
                      <View style={styles.upcomingStyleTag}>
                        <Text style={styles.upcomingStyleTagText}>
                          {trip.travel_style || 'Culture & Exploration'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.upcomingActiveBadge}>
                      <View style={styles.activeBeaconDot} />
                      <Text style={styles.activeBeaconText}>Active</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })
          ) : (
            <GlassCard material="light" style={styles.emptyTripsCard}>
              <View style={styles.emptyTripsIconWrap}>
                <Ionicons name="airplane-outline" size={24} color="#B99A5E" />
              </View>
              <Text style={styles.emptyTripsTitle}>No upcoming expeditions yet</Text>
              <Text style={styles.emptyTripsSubtitle}>
                Post your travel dates to connect with verified companions heading to the same destination.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/trips')}
                style={styles.emptyPlanBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyPlanBtnText}>+ Plan Your Expedition</Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* ============================================================ */}
          {/* 12. POPULAR PLACES ACROSS THE SUBCONTINENT                   */}
          {/* ============================================================ */}
          <View style={[styles.sectionHeaderRow, { marginTop: 42 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.sectionTitle}>Popular Across India</Text>
              <Text style={styles.sectionSubtitle}>
                Destinations favored by active solo travelers
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/discovery')}
              style={styles.sectionLinkBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLinkText}>Explore</Text>
              <Ionicons name="chevron-forward" size={13} color="#171817" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularPlacesScroll}
          >
            {POPULAR_PLACES.map((place) => (
              <TouchableOpacity
                key={place.id}
                onPress={() => handleExplorePlace(place.name)}
                activeOpacity={0.88}
                style={[styles.editorialCityCard, SHADOWS.card]}
              >
                <Image source={place.image} style={styles.editorialCityImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(23, 24, 23, 0.40)', 'rgba(23, 24, 23, 0.92)']}
                  style={StyleSheet.absoluteFillObject}
                />

                <View style={styles.placeRatingBadge}>
                  <Ionicons name="star" size={10} color="#B99A5E" />
                  <Text style={styles.placeRatingText}>{place.rating.toFixed(2)}</Text>
                </View>

                <View style={styles.editorialBottomContent}>
                  <Text style={styles.editorialCityName}>{place.name}</Text>
                  <Text style={styles.editorialCityState}>
                    {place.state ? `${place.state}, India` : place.country}
                  </Text>
                  <View style={styles.editorialActionRow}>
                    <Ionicons name="people-outline" size={12} color="#E6D5AF" />
                    <Text style={styles.editorialActionText}>
                      {place.travelersCount} travelers on MaybeWe
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ScrollView>

        {/* ============================================================ */}
        {/* LUXURY LOCATION CONTROL CENTER MODAL                         */}
        {/* ============================================================ */}
        <Modal
          visible={showLocationPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLocationPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowLocationPicker(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => {
                if (e && e.stopPropagation) e.stopPropagation();
              }}
            >
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalHeaderIconBadge}>
                    <Ionicons name="location-sharp" size={18} color="#B99A5E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Travel Base Calibration</Text>
                    <Text style={styles.modalSubtitle} numberOfLines={1}>
                      Calibrate your current Indian hub & nearby companions
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowLocationPicker(false)}
                  {...(Platform.OS === 'web' ? { onClick: () => setShowLocationPicker(false) } : {})}
                  activeOpacity={0.7}
                  accessibilityLabel="Close location control center"
                >
                  <Ionicons name="close" size={18} color="#171817" />
                </TouchableOpacity>
              </View>

              {/* Active Base Hero Card */}
              <View style={styles.modalActiveHeroCard}>
                <View style={styles.modalActiveHeroLeft}>
                  <View style={styles.modalActiveHeroIconWrap}>
                    <Ionicons name="navigate" size={18} color="#B99A5E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalActiveHeroLabel}>CURRENT ACTIVE BASE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.modalActiveHeroCity}>{userLocation.city}</Text>
                      <View style={styles.modalActiveStateTag}>
                        <Text style={styles.modalActiveStateTagText}>{userLocation.state}</Text>
                      </View>
                    </View>
                    <Text style={styles.modalActiveHeroDistrict} numberOfLines={1}>
                      {userLocation.district ? `${userLocation.district} District • ` : ''}India Travel Base
                    </Text>
                  </View>
                </View>
                <View style={styles.modalActiveBeaconBadge}>
                  <View style={styles.modalActiveBeaconDot} />
                  <Text style={styles.modalActiveBeaconText}>Active</Text>
                </View>
              </View>

              {/* Auto-Detect (GPS) Button */}
              <TouchableOpacity
                style={styles.modalAutoDetectBtn}
                onPress={() => detectDeviceLocation(true)}
                {...(Platform.OS === 'web' ? { onClick: () => detectDeviceLocation(true) } : {})}
                disabled={locating}
                activeOpacity={0.85}
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#171817" style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="locate" size={16} color="#171817" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.modalAutoDetectBtnText}>
                  {locating ? 'Calibrating Coordinates...' : 'Auto-Detect Base (GPS)'}
                </Text>
              </TouchableOpacity>

              {/* Search Bar */}
              <View style={styles.modalSearchWrap}>
                <Ionicons name="search" size={16} color="#77766F" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search 100+ Indian cities, districts, states..."
                  placeholderTextColor="#77766F"
                  value={locationSearchQuery}
                  onChangeText={setLocationSearchQuery}
                  autoCorrect={false}
                />
                {locationSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setLocationSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color="#77766F" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Region Filter Selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modalRegionFilterScroll}
                contentContainerStyle={{ paddingRight: 8, gap: 6 }}
              >
                {['All', 'South', 'North', 'West', 'East', 'Central', 'North-East'].map((region) => {
                  const isActive = locationRegionFilter === region;
                  return (
                    <TouchableOpacity
                      key={region}
                      onPress={() => setLocationRegionFilter(region)}
                      {...(Platform.OS === 'web' ? { onClick: () => setLocationRegionFilter(region) } : {})}
                      style={[
                        styles.modalRegionPill,
                        isActive ? styles.modalRegionPillActive : styles.modalRegionPillInactive,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.modalRegionPillText,
                          isActive ? { color: '#FBFAF7', fontWeight: '700' } : { color: '#45453F' },
                        ]}
                      >
                        {region === 'All' ? 'All India' : region}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Popular Hubs Quick Bar */}
              <View style={styles.modalSubHeaderRow}>
                <Text style={styles.modalSectionHeading}>Popular Travel Hubs</Text>
                <Text style={styles.modalSectionCount}>{POPULAR_HUBS.length} Hubs</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.modalQuickHubsScroll}
                contentContainerStyle={{ paddingRight: 10, gap: 6 }}
              >
                {POPULAR_HUBS.map((hub) => {
                  const isCurrent = userLocation.city === hub.name;
                  return (
                    <TouchableOpacity
                      key={hub.name}
                      style={[
                        styles.modalQuickHubChip,
                        isCurrent && styles.modalQuickHubChipActive,
                      ]}
                      onPress={() => handleSelectLocation(hub)}
                      {...(Platform.OS === 'web' ? { onClick: () => handleSelectLocation(hub) } : {})}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalQuickHubChipText,
                          isCurrent ? { color: '#B99A5E', fontWeight: '700' } : { color: '#171817' },
                        ]}
                      >
                        📍 {hub.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Filtered Cities / States List */}
              <View style={styles.modalSubHeaderRow}>
                <Text style={styles.modalSectionHeading}>
                  {locationSearchQuery
                    ? `Matching Results (${filteredLocationResults.length})`
                    : `${locationRegionFilter === 'All' ? 'Indian Destinations' : locationRegionFilter + ' India'} (${filteredLocationResults.length})`}
                </Text>
              </View>
              <ScrollView
                style={styles.modalResultsList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {filteredLocationResults.map((item) => {
                  const isCurrent = userLocation.city === item.name;
                  return (
                    <TouchableOpacity
                      key={`${item.id || item.name}-${item.state}`}
                      style={[
                        styles.modalCityItem,
                        isCurrent && styles.modalCityItemActive,
                      ]}
                      onPress={() => handleSelectLocation(item)}
                      {...(Platform.OS === 'web' ? { onClick: () => handleSelectLocation(item) } : {})}
                      activeOpacity={0.75}
                    >
                      <View style={styles.modalCityItemLeft}>
                        <View style={[styles.modalCityPin, isCurrent && styles.modalCityPinActive]}>
                          <Ionicons
                            name="location-sharp"
                            size={14}
                            color={isCurrent ? '#B99A5E' : '#171817'}
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.modalCityName,
                                { color: isCurrent ? '#B99A5E' : '#171817' },
                              ]}
                            >
                              {item.name}
                            </Text>
                            {item.name.toLowerCase() === (userLocation.city || '').toLowerCase() && (
                              <View style={styles.modalPresentTag}>
                                <Text style={styles.modalPresentTagText}>Active Base</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.modalCityState} numberOfLines={1}>
                            {item.district ? `${item.district} • ${item.state}` : item.state}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isCurrent ? (
                          <View style={styles.modalActiveInlineTag}>
                            <Ionicons name="checkmark-circle" size={12} color="#33463C" />
                            <Text style={styles.modalActiveInlineTagText}>Active</Text>
                          </View>
                        ) : (
                          <View style={styles.modalCityBadge}>
                            <Text style={styles.modalCityBadgeText}>
                              {item.type || 'Destination'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Concierge Notification Center */}
        <NotificationCenterModal
          visible={notifModalVisible}
          onClose={() => {
            setNotifModalVisible(false);
            loadDashboardData(false);
          }}
          userId={user?.id || 'user-demo-priya'}
          onOpenPlace={(placeId) => {
            router.push({
              pathname: '/(tabs)/discovery',
              params: { mode: 'places', placeId },
            });
          }}
        />

        {/* Destination Detail Experience */}
        <DestinationDetailModal
          visible={destinationDetailModalVisible}
          onClose={() => setDestinationDetailModalVisible(false)}
          destination={selectedDestinationForDetail}
          onOpenPlace={(placeId) => {
            router.push({
              pathname: '/(tabs)/discovery',
              params: { mode: 'places', placeId },
            });
          }}
          onOpenHangout={(hangoutId) => {
            router.push({
              pathname: `/chat/group-hangout-${hangoutId}`,
              params: { isGroup: 'true', partnerName: 'Hangout Circle' },
            });
          }}
          onOpenTraveler={(_traveler) => {
            router.push('/(tabs)/discovery');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    backgroundColor: 'transparent',
  },
  scrollBody: {
    width: '100%',
    maxWidth: '100%',
    paddingHorizontal: 16,
  },

  // 1. Concierge Greeting Bar
  conciergeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  conciergeLeft: {
    flex: 1,
  },
  atmospherePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  atmosphereDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B99A5E',
  },
  atmosphereText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#77766F',
  },
  conciergeGreeting: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
    color: '#171817',
  },
  conciergeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 250, 247, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(215, 210, 200, 0.70)',
    borderRadius: RADII.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
    ...Platform.select({
      web: { backdropFilter: 'blur(16px)' },
      default: {},
    }),
  },
  locationPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#171817',
    maxWidth: 90,
  },
  avatarButton: {
    padding: 2,
  },

  // 2. Editorial Prompt & Luxury Search
  promptHeader: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  promptTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.8,
    color: '#171817',
    marginBottom: 6,
  },
  promptSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#45453F',
    marginBottom: 18,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE5DA',
    borderRadius: RADII['2xl'],
    paddingLeft: 14,
    paddingRight: 6,
    height: 54,
    marginBottom: 28,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 4px 16px -2px rgba(23, 24, 23, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      },
      default: {},
    }),
  },
  searchIconWrap: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#171817',
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' },
      default: {},
    }),
  },
  clearSearchBtn: {
    padding: 6,
    marginRight: 4,
  },
  searchSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: RADII.xl,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(23, 24, 23, 0.15)',
      },
      default: {},
    }),
  },

  // 3. Hero Experience
  heroWrapper: {
    borderRadius: RADII['3xl'],
    overflow: 'hidden',
    marginBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(215, 210, 200, 0.55)',
  },
  heroBackground: {
    width: '100%',
    height: 390,
    justifyContent: 'space-between',
    padding: 18,
  },
  heroImageStyle: {
    borderRadius: RADII['3xl'],
  },
  heroTopTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(23, 24, 23, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(230, 213, 175, 0.40)',
    borderRadius: RADII.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' },
      default: {},
    }),
  },
  heroTopTagText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#E6D5AF',
  },
  heroFloatingPanel: {
    padding: 20,
    borderRadius: RADII['2xl'],
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px -4px rgba(23, 24, 23, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
      },
      default: {},
    }),
  },
  heroPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroPanelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroPanelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B99A5E',
  },
  heroPanelBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#B99A5E',
  },
  heroPanelDates: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#77766F',
  },
  heroPanelTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#171817',
    marginBottom: 6,
  },
  heroPanelTravelers: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#45453F',
    marginBottom: 16,
  },
  heroPanelActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(23, 24, 23, 0.18)',
      },
      default: {},
    }),
  },
  heroPrimaryBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FBFAF7',
  },
  heroSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: 'rgba(215, 210, 200, 0.75)',
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
  },
  heroSecondaryBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#171817',
  },

  // 4. Floating Luxury Action Rail
  railHeaderRow: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: '#77766F',
  },
  actionRailScroll: {
    paddingRight: 16,
    gap: 14,
    paddingBottom: 4,
    marginBottom: 32,
  },
  railCardWrapper: {
    width: 154,
  },
  railCard: {
    padding: 16,
    borderRadius: RADII['2xl'],
    minHeight: 116,
    justifyContent: 'space-between',
  },
  railCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  railIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADII.md,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: '#171817',
    marginBottom: 2,
  },
  railCardSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#77766F',
  },

  // 5. Integrated Journey Status Card
  journeyStatusWrapper: {
    marginBottom: 36,
  },
  journeyStatusCard: {
    padding: 20,
    borderRadius: RADII['2xl'],
  },
  journeyStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  journeyStatusHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journeyStatusEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#77766F',
  },
  journeyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(215, 210, 200, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
  journeyStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  journeyStatusBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#171817',
  },
  journeyStatusMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  journeyMetricNumber: {
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#171817',
  },
  journeyMetricLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#77766F',
    marginTop: 2,
  },
  journeyMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(215, 210, 200, 0.70)',
  },

  // 6. Section Headers & Links
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#171817',
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#77766F',
    marginTop: 4,
  },
  sectionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  sectionLinkText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#171817',
  },

  // Filter Chips Horizontal Scroll
  preferenceChipsScroll: {
    paddingRight: 16,
    gap: 10,
    paddingVertical: 4,
    marginBottom: 30,
  },
  famousChipsScroll: {
    paddingRight: 16,
    gap: 10,
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: 22,
  },

  // Editorial Destination & Cities Cards
  destinationsScroll: {
    paddingRight: 16,
    gap: 16,
    paddingBottom: 10,
    marginBottom: 40,
  },
  editorialCityCard: {
    width: 232,
    height: 295,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FBFAF7',
    borderWidth: 1,
    borderColor: 'rgba(215, 210, 200, 0.65)',
  },
  editorialCityImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  editorialTypePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(23, 24, 23, 0.60)',
    borderRadius: RADII.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)' },
      default: {},
    }),
  },
  editorialTypeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#FBFAF7',
  },
  editorialBottomContent: {
    width: '100%',
  },
  editorialCityName: {
    fontFamily: FONTS.bold,
    fontSize: 19,
    fontWeight: '700',
    color: '#FBFAF7',
    letterSpacing: -0.3,
  },
  editorialCityState: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#E6D5AF',
    marginBottom: 6,
  },
  editorialCityDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255, 255, 255, 0.88)',
    marginBottom: 10,
  },
  editorialActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editorialActionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#E6D5AF',
  },

  // Famous Places Cards
  editorialFamousCard: {
    width: 252,
    height: 305,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FBFAF7',
    borderWidth: 1,
    borderColor: 'rgba(215, 210, 200, 0.65)',
  },
  editorialFamousImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  famousBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(23, 24, 23, 0.60)',
    borderRadius: RADII.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(230, 213, 175, 0.35)',
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)' },
      default: {},
    }),
  },
  famousBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#E6D5AF',
  },
  famousLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  famousLocationText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#E6D5AF',
  },

  // Community Travelers Section
  communityCardWrapper: {
    marginBottom: 14,
  },
  communityGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADII.xl,
  },
  communityCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  communityNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  communityTravelerName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#171817',
  },
  communityHeadingTo: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#B99A5E',
  },
  communityDates: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#77766F',
    marginTop: 2,
  },
  communityConnectBtn: {
    backgroundColor: '#171817',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.lg,
  },
  communityConnectText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#FBFAF7',
  },

  // Upcoming Trips Section
  upcomingCardWrapper: {
    marginBottom: 14,
  },
  upcomingGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADII.xl,
  },
  upcomingThumb: {
    width: 60,
    height: 60,
    borderRadius: RADII.lg,
  },
  upcomingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingDestination: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#171817',
  },
  upcomingDatesText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#77766F',
    marginTop: 2,
  },
  upcomingStyleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(230, 213, 175, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.35)',
    borderRadius: RADII.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  upcomingStyleTagText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#B99A5E',
  },
  upcomingActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCE5DF',
    borderWidth: 1,
    borderColor: '#33463C',
    borderRadius: RADII.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBeaconDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#33463C',
  },
  activeBeaconText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#33463C',
  },

  // Empty Trips Card
  emptyTripsCard: {
    alignItems: 'center',
    padding: 30,
    borderRadius: RADII['2xl'],
    textAlign: 'center',
    marginBottom: 40,
  },
  emptyTripsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(230, 213, 175, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTripsTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#171817',
    marginBottom: 4,
  },
  emptyTripsSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#77766F',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 280,
  },
  emptyPlanBtn: {
    backgroundColor: '#171817',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADII.xl,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(23, 24, 23, 0.18)',
      },
      default: {},
    }),
  },
  emptyPlanBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FBFAF7',
  },

  // Popular Places Horizontal Scroll
  popularPlacesScroll: {
    paddingRight: 16,
    gap: 16,
    paddingBottom: 16,
    marginBottom: 44,
  },
  placeRatingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(23, 24, 23, 0.65)',
    borderRadius: RADII.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.35)',
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)' },
      default: {},
    }),
  },
  placeRatingText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FBFAF7',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 24, 23, 0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
      default: {},
    }),
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FBFAF7',
    borderRadius: RADII['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(215, 210, 200, 0.75)',
    padding: 20,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 48px -8px rgba(23, 24, 23, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
      },
      default: {},
    }),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(230, 213, 175, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#171817',
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#77766F',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActiveHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1EEE6',
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    padding: 12,
    marginBottom: 12,
  },
  modalActiveHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalActiveHeroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(230, 213, 175, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActiveHeroLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#77766F',
  },
  modalActiveHeroCity: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#171817',
  },
  modalActiveStateTag: {
    backgroundColor: '#FBFAF7',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    borderRadius: RADII.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  modalActiveStateTagText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#171817',
  },
  modalActiveHeroDistrict: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#77766F',
    marginTop: 1,
  },
  modalActiveBeaconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCE5DF',
    borderWidth: 1,
    borderColor: '#33463C',
    borderRadius: RADII.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modalActiveBeaconDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#33463C',
  },
  modalActiveBeaconText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#33463C',
  },
  modalAutoDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    borderRadius: RADII.lg,
    paddingVertical: 9,
    marginBottom: 12,
  },
  modalAutoDetectBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#171817',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    borderRadius: RADII.lg,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#171817',
    height: '100%',
    marginLeft: 8,
    ...Platform.select({
      web: { outlineStyle: 'none' },
      default: {},
    }),
  },
  modalRegionFilterScroll: {
    marginBottom: 12,
    maxHeight: 34,
  },
  modalRegionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  modalRegionPillActive: {
    backgroundColor: '#171817',
    borderColor: '#171817',
  },
  modalRegionPillInactive: {
    backgroundColor: '#F1EEE6',
    borderColor: '#D7D2C8',
  },
  modalRegionPillText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  modalSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalSectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#45453F',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalSectionCount: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#77766F',
  },
  modalQuickHubsScroll: {
    marginBottom: 12,
    maxHeight: 34,
  },
  modalQuickHubChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    backgroundColor: '#F1EEE6',
  },
  modalQuickHubChipActive: {
    backgroundColor: 'rgba(230, 213, 175, 0.35)',
    borderColor: '#B99A5E',
  },
  modalQuickHubChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  modalResultsList: {
    maxHeight: 220,
  },
  modalCityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    backgroundColor: '#FBFAF7',
    marginBottom: 6,
  },
  modalCityItemActive: {
    backgroundColor: 'rgba(230, 213, 175, 0.25)',
    borderColor: '#B99A5E',
  },
  modalCityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalCityPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modalCityPinActive: {
    backgroundColor: 'rgba(230, 213, 175, 0.35)',
    borderColor: '#B99A5E',
  },
  modalCityName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  modalPresentTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(185, 154, 94, 0.20)',
    borderWidth: 1,
    borderColor: '#B99A5E',
  },
  modalPresentTagText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#B99A5E',
  },
  modalCityState: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#77766F',
    marginTop: 1,
  },
  modalActiveInlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    backgroundColor: '#DCE5DF',
    borderWidth: 1,
    borderColor: '#33463C',
  },
  modalActiveInlineTagText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#33463C',
  },
  modalCityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    backgroundColor: '#F1EEE6',
  },
  modalCityBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#77766F',
  },
});
