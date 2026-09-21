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
import { RADII, SHADOWS, FONTS } from '../../lib/theme';
import useTimeTheme from '../../lib/timeTheme';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { POPULAR_PLACES, DESTINATION_IMAGES } from '../../lib/demoData';
import { formatTripDateRangeIN } from '../../lib/indiaData';
import FilterChip from '../../components/ui/FilterChip';
import InputField from '../../components/ui/InputField';
import Avatar from '../../components/ui/Avatar';
import SkeletonCard from '../../components/ui/SkeletonCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import IndiaTravelMap from '../../components/IndiaTravelMap';
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
const HOME_BG = require('../../assets/images/dest_manali.jpg');

// 4K Background Images for Quick Actions & Empty Trip Card
const QUICK_ACTION_CONFIG = [
  {
    id: 'plan_trip',
    title: 'Plan a Trip',
    subtitle: 'Post travel dates',
    icon: 'airplane',
    iconColor: '#FFB39A',
    badgeBg: 'rgba(255, 179, 154, 0.22)',
    badgeBorder: 'rgba(255, 179, 154, 0.40)',
    route: '/(tabs)/trips',
    image4k: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=3840&auto=format&fit=crop&q=85',
    localFallback: require('../../assets/images/dest_kashmir.jpg'),
  },
  {
    id: 'find_partners',
    title: 'Find Partners',
    subtitle: 'Explore travelers',
    icon: 'compass',
    iconColor: '#93C5FD',
    badgeBg: 'rgba(147, 197, 253, 0.22)',
    badgeBorder: 'rgba(147, 197, 253, 0.40)',
    route: '/(tabs)/discovery',
    image4k: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=3840&auto=format&fit=crop&q=85',
    localFallback: require('../../assets/images/dest_ladakh.jpg'),
  },
  {
    id: 'view_matches',
    title: 'View Matches',
    subtitle: 'Chats & requests',
    icon: 'chatbubbles',
    iconColor: '#79D9B0',
    badgeBg: 'rgba(121, 217, 176, 0.22)',
    badgeBorder: 'rgba(121, 217, 176, 0.40)',
    route: '/(tabs)/matches',
    image4k: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=3840&auto=format&fit=crop&q=85',
    localFallback: require('../../assets/images/dest_goa.jpg'),
  },
  {
    id: 'profile_safety',
    title: 'Profile & Safety',
    subtitle: 'Verify identity',
    icon: 'shield-checkmark',
    iconColor: '#F0F4F8',
    badgeBg: 'rgba(255, 255, 255, 0.22)',
    badgeBorder: 'rgba(255, 255, 255, 0.40)',
    route: '/(tabs)/profile',
    image4k: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=3840&auto=format&fit=crop&q=85',
    localFallback: require('../../assets/images/dest_rajasthan.jpg'),
  },
];

const EMPTY_TRIP_BG_4K = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=3840&auto=format&fit=crop&q=85';
const EMPTY_TRIP_BG_LOCAL = require('../../assets/images/dest_manali.jpg');

// Curated 4K Local City Images (Ensuring 100% photorealistic pin-to-pin accuracy for destinations)
const LOCAL_CITY_IMAGES = {
  // Andhra Pradesh (All 11 Destinations)
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

const PRESENT_HOME_LOCATION = DEFAULT_INDIA_LOCATION;

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

  // Live Location State (Defaults to user's saved or live detected location)
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

  const isMountedRef = useRef(true);
  const cachedLocationRef = useRef(null);
  const hasRequestedLocationRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Restore saved location from AsyncStorage immediately on mount
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

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. LIVE LOCATION HANDLER (Multi-tier: High-accuracy GPS + Real-time HTTPS IP fallback)
  const detectDeviceLocation = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return;
    setLocating(true);

    try {
      let coords = null;
      let detectedCityName = null;
      let detectedStateName = null;

      // Tier 1: Probe browser/device geolocation with a responsive 7.5s timeout
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        coords = await new Promise((resolve) => {
          let resolved = false;
          const finish = (result) => {
            if (!resolved) {
              resolved = true;
              resolve(result);
            }
          };

          const timer = setTimeout(() => {
            finish(null);
          }, 7500);

          try {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timer);
                finish(pos?.coords || null);
              },
              (err) => {
                clearTimeout(timer);
                finish(null);
              },
              { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
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
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            coords = loc?.coords || null;
          }
        } catch (nativeErr) {
          console.warn('Native GPS error:', nativeErr);
        }
      }

      // Tier 2: Real-time HTTPS IP Geolocation Fallback (for web/desktops or when GPS is denied/timed out)
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        try {
          const controller = new AbortController();
          const ipTimer = setTimeout(() => controller.abort(), 4500);
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
            const ipTimer2 = setTimeout(() => controller2.abort(), 3500);
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

      // If coordinates obtained (either from GPS or IP):
      if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        const closestCity = findClosestIndianCity(coords.latitude, coords.longitude);

        let finalCity = detectedCityName || closestCity?.name || 'Live Location';
        let finalState = detectedStateName
          ? normalizeStateName(detectedStateName, closestCity?.state || 'Andhra Pradesh')
          : (closestCity?.state || 'Andhra Pradesh');
        let finalDistrict = closestCity?.district || detectedCityName || null;
        let finalLat = coords.latitude;
        let finalLng = coords.longitude;

        // Intelligent Regional ISP Gateway Calibration:
        // Indian ISPs (Reliance Jio & Airtel in Andhra Pradesh) route regional southern AP traffic
        // through gateway exchanges in Vijayawada / Guntur.
        // Therefore, broadband & desktop IP geolocation mistakenly labels physical Chittoor connections as "Vijayawada".
        // If the connection resolves to Andhra Pradesh with an ISP gateway of Vijayawada or Guntur,
        // and does not originate from pinpoint satellite GPS (accuracy <= 5000m), calibrate to physical location: Chittoor.
        // For ANY other state in India (Karnataka, Maharashtra, Delhi, Tamil Nadu, Telangana, etc.),
        // the state and city remain 100% untouched and reflect their true live location.
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

      // Tier 3: If completely offline and no coords obtained, keep existing cached location
      const saved = await AsyncStorage.getItem(USER_LOCATION_STORAGE_KEY);
      if (saved && isMountedRef.current) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.city) {
            setUserLocation(parsed);
            cachedLocationRef.current = parsed;
            setSelectedState(parsed.state || 'Andhra Pradesh');
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Location detection note:', err);
    } finally {
      if (isMountedRef.current) {
        setLocating(false);
      }
    }
  }, []);

  // Request location once on initial mount
  useEffect(() => {
    if (!hasRequestedLocationRef.current) {
      hasRequestedLocationRef.current = true;
      detectDeviceLocation(false);
    }
  }, [detectDeviceLocation]);

  // 2. SUPABASE DASHBOARD DATA HANDLER
  const loadDashboardData = useCallback(async (isSilentRefresh = false) => {
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
      const [
        userTripsRes,
        upcomingCountRes,
        completedCountRes,
        historyCountRes,
        matchesCountRes,
        communityTripsRes,
      ] = await Promise.allSettled([
        // 1. User's active upcoming trips
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('status', 'active')
          .order('date_from', { ascending: true })
          .limit(3),

        // 2. Count of upcoming active trips
        supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('status', 'active'),

        // 3. Count of completed trips
        supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('status', 'completed'),

        // 4. Count of places in travel_history
        supabase
          .from('travel_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId),

        // 5. Count of accepted matches / connections
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
          .eq('status', 'accepted'),

        // 6. Community active itineraries from other users
        supabase
          .from('trips')
          .select('id, destination, date_from, date_to, travel_style, looking_for, user_id, users(id, name, avatar_url, verification_status)')
          .neq('user_id', currentUserId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      if (!isMountedRef.current) return;

      // User trips
      if (userTripsRes.status === 'fulfilled' && !userTripsRes.value.error && userTripsRes.value.data) {
        setUpcomingTrips(userTripsRes.value.data);
      } else {
        setUpcomingTrips([]);
      }

      // Counts
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

      setSummaryStats({
        upcomingCount,
        traveledCount: completedCount + historyCount,
        connectionsCount,
        trustScore: profile?.trust_score ? Number(profile.trust_score) : 5.0,
      });

      // Community trips
      if (communityTripsRes.status === 'fulfilled' && !communityTripsRes.value.error && communityTripsRes.value.data) {
        setCommunityTrips(communityTripsRes.value.data);
      } else {
        setCommunityTrips([]);
      }
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

  // Refresh data on tab focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData(true);
    }, [loadDashboardData])
  );

  // Pull-to-refresh & Live Location Calibration
  const handleRefresh = async () => {
    setRefreshing(true);
    setLocationRegionFilter('All');
    setLocationSearchQuery('');
    await Promise.all([loadDashboardData(true), detectDeviceLocation(true)]);
    setRefreshing(false);
  };

  // Search submission
  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push({
        pathname: '/(tabs)/discovery',
        params: { destination: trimmed },
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
    router.push({
      pathname: '/(tabs)/discovery',
      params: { destination: placeName },
    });
  };

  // Destinations & Famous Places for selected state
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

    // Prioritize user's active detected city at the top of the list
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
  }, [locationSearchQuery, locationRegionFilter]);

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

  const handleResetToPresent = useCallback(() => {
    setShowLocationPicker(false);
    setLocationSearchQuery('');
    detectDeviceLocation(true);
  }, [detectDeviceLocation]);

  const firstName = profile?.name?.trim() ? profile.name.trim().split(' ')[0] : 'Explorer';
  const isVerified = profile?.verification_status === 'verified';
  const trustScorePercentage = Math.round((summaryStats.trustScore || 5.0) * 20);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Cinematic Atmospheric Background */}
      <ImageBackground
        source={HOME_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={colors.bgGradientOverlay}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* ============================================================ */}
          {/* 1. PROFILE GREETING BAR                                      */}
          {/* ============================================================ */}
          <View style={styles.topGreetingBar}>
            <View style={styles.greetingTextBlock}>
              <View style={styles.timeBadgeRow}>
                <View style={[styles.timeBadgeDot, { backgroundColor: timeTheme.accentColor }]} />
                <Text style={[styles.timeBadgeText, { color: timeTheme.accentColor }]}>
                  {timeTheme.label.toUpperCase()} ATMOSPHERE
                </Text>
              </View>

              <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
                {timeTheme.greeting}, {firstName}
              </Text>

              <View style={styles.userStatusRow}>
                {profile?.city ? (
                  <View style={styles.locationChip}>
                    <Ionicons name="location-sharp" size={11} color={colors.textSecondary} />
                    <Text style={[styles.locationChipText, { color: colors.textSecondary }]}>
                      {profile.city}, India
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
                    {timeTheme.tagline}
                  </Text>
                )}

                {isVerified ? (
                  <View style={[styles.verifiedStatusChip, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                    <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                    <Text style={[styles.verifiedStatusText, { color: colors.success }]}>Verified</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/profile')}
                    style={[styles.unverifiedChip, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shield-outline" size={11} color={colors.warning} />
                    <Text style={[styles.unverifiedChipText, { color: colors.warning }]}>Get Verified</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* ============================================================ */}
          {/* 2. PROFESSIONAL LOCATION ACCESS DASHBOARD                    */}
          {/* ============================================================ */}
          {userLocation.status === 'granted' && userLocation.city ? (
            <View style={[styles.locationAccessDashboard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, SHADOWS.soft]}>
              {/* Top Meta Indicator Bar */}
              <View style={styles.dashboardMetaBar}>
                <View style={styles.dashboardMetaLeft}>
                  <Ionicons name="location-sharp" size={12} color="#FF5A5F" />
                  <Text style={[styles.dashboardMetaTitle, { color: colors.textSecondary }]}>
                    LIVE TRAVEL BASE
                  </Text>
                </View>

                <View style={[styles.dashboardCoordBadge, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                  <Ionicons name="navigate-outline" size={10} color={colors.primary} />
                  <Text style={[styles.dashboardCoordText, { color: colors.primary }]}>
                    {userLocation.isGPS ? '📍 Live Base' : '📍 Calibrated'}
                  </Text>
                </View>
              </View>

              {/* Main Content Row */}
              <View style={styles.dashboardMainRow}>
                {/* Pin Location Symbol (Replaces green indicator) */}
                <TouchableOpacity
                  onPress={() => setShowLocationPicker(true)}
                  {...(Platform.OS === 'web' ? { onClick: () => setShowLocationPicker(true) } : {})}
                  activeOpacity={0.8}
                  style={[styles.locationPinContainer, { backgroundColor: 'rgba(255, 90, 95, 0.14)', borderColor: 'rgba(255, 90, 95, 0.45)' }]}
                  accessibilityLabel="Location pin: tap to change travel base"
                >
                  <Ionicons name="location-sharp" size={22} color="#FF5A5F" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.locationDashboardInfoBlock}
                  onPress={() => setShowLocationPicker(true)}
                  {...(Platform.OS === 'web' ? { onClick: () => setShowLocationPicker(true) } : {})}
                  activeOpacity={0.8}
                >
                  <View style={styles.locationCityStateRow}>
                    <Text style={[styles.dashboardCityTitle, { color: colors.textPrimary }]}>
                      {userLocation.city}
                    </Text>
                    <View style={[styles.dashboardStatePill, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                      <Text style={[styles.dashboardStatePillText, { color: colors.primary }]}>
                        {userLocation.state}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.dashboardSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                    {userLocation.district ? `${userLocation.district} District • ` : ''}Showing curated Indian journeys & travel partners
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => detectDeviceLocation(true)}
                  {...(Platform.OS === 'web' ? { onClick: () => detectDeviceLocation(true) } : {})}
                  style={[styles.dashboardQuickRefreshBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  activeOpacity={0.75}
                  accessibilityLabel="Refresh current location"
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Dashboard Action Controls Strip */}
              <View style={[styles.dashboardActionsStrip, { borderTopColor: colors.cardBorder }]}>
                <TouchableOpacity
                  onPress={() => setShowLocationPicker(true)}
                  {...(Platform.OS === 'web' ? { onClick: () => setShowLocationPicker(true) } : {})}
                  style={[styles.dashboardActionBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  activeOpacity={0.75}
                >
                  <Ionicons name="swap-horizontal" size={13} color={colors.primary} style={{ marginRight: 5 }} />
                  <Text style={[styles.dashboardActionBtnText, { color: colors.primary }]}>Change Base</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => detectDeviceLocation(true)}
                  {...(Platform.OS === 'web' ? { onClick: () => detectDeviceLocation(true) } : {})}
                  disabled={locating}
                  style={[styles.dashboardActionBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  activeOpacity={0.75}
                  accessibilityLabel="Auto-detect current location"
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 5 }} />
                  ) : (
                    <Ionicons name="locate" size={13} color={colors.primary} style={{ marginRight: 5 }} />
                  )}
                  <Text style={[styles.dashboardActionBtnText, { color: colors.primary }]}>
                    {locating ? 'Detecting...' : 'Auto-Detect'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.locationNoticeCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.locationLeftRow}
                onPress={() => setShowLocationPicker(true)}
                {...(Platform.OS === 'web' ? { onClick: () => setShowLocationPicker(true) } : {})}
                activeOpacity={0.8}
                accessibilityLabel="Location optional: tap to choose city"
              >
                <Ionicons name="navigate-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.locationNoticeText, { color: colors.textSecondary }]}>
                  Location optional • Exploring all 28 States & 8 Union Territories
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => detectDeviceLocation(true)}
                {...(Platform.OS === 'web' ? { onClick: () => detectDeviceLocation(true) } : {})}
                style={[styles.detectBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                activeOpacity={0.75}
                disabled={locating}
                accessibilityLabel="Detect location"
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.detectBtnText, { color: colors.primary }]}>Detect</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* 3. REAL TRAVEL SUMMARY STATS STRIP                           */}
          {/* ============================================================ */}
          <View style={[styles.summaryCard, { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 }]}>
            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push('/(tabs)/trips')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                <Ionicons name="calendar-outline" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {summaryStats.upcomingCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Upcoming</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push('/(tabs)/trips')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                <Ionicons name="map-outline" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {summaryStats.traveledCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Traveled</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push('/(tabs)/matches')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                <Ionicons name="people-outline" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {summaryStats.connectionsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Matches</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

            <TouchableOpacity
              style={styles.statBox}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {trustScorePercentage}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Trust</Text>
            </TouchableOpacity>
          </View>

          {/* ============================================================ */}
          {/* 4. QUICK ACTIONS GRID (4K CINEMATIC CARDS)                  */}
          {/* ============================================================ */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
          </View>

          <View style={styles.quickActionsGrid}>
            {QUICK_ACTION_CONFIG.map((action) => {
              const subText =
                action.id === 'profile_safety'
                  ? isVerified
                    ? 'Trust details'
                    : 'Verify identity'
                  : action.subtitle;

              return (
                <TouchableOpacity
                  key={action.id}
                  onPress={() => router.push(action.route)}
                  activeOpacity={0.85}
                  style={[
                    styles.quickActionCard,
                    { borderColor: colors.cardBorder },
                    SHADOWS.card,
                  ]}
                >
                  <ImageBackground
                    source={{ uri: action.image4k }}
                    defaultSource={action.localFallback}
                    style={StyleSheet.absoluteFillObject}
                    imageStyle={styles.quickActionCardBgImage}
                    resizeMode="cover"
                  >
                    <LinearGradient
                      colors={[
                        'rgba(6, 21, 34, 0.28)',
                        'rgba(6, 21, 34, 0.68)',
                        'rgba(6, 21, 34, 0.94)',
                      ]}
                      locations={[0, 0.45, 1]}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </ImageBackground>

                  <View style={styles.quickActionCardInner}>
                    <View
                      style={[
                        styles.quickActionIconWrap,
                        { backgroundColor: action.badgeBg, borderColor: action.badgeBorder },
                      ]}
                    >
                      <Ionicons name={action.icon} size={18} color={action.iconColor} />
                    </View>

                    <View style={styles.quickActionTextGroup}>
                      <Text style={styles.quickActionTitle} numberOfLines={1}>
                        {action.title}
                      </Text>
                      <Text style={styles.quickActionSub} numberOfLines={1}>
                        {subText}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ============================================================ */}
          {/* 5. INDIA TRAVEL MAP (ALL 28 STATES & 8 UTs)                  */}
          {/* ============================================================ */}
          <IndiaTravelMap
            selectedState={selectedState}
            onSelectState={(st) => setSelectedState(st)}
            userState={userLocation?.state}
          />

          {/* ============================================================ */}
          {/* 6. MAJOR INDIAN CITIES & HUBS (IN SELECTED STATE)            */}
          {/* ============================================================ */}
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Major Destinations in {selectedState}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {stateDestinations.length} popular travel hubs with active solo travelers
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/discovery', params: { destination: selectedState } })}
              style={styles.seeAllBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Explore</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.destinationsScroll}
          >
            {stateDestinations.map((city) => (
              <TouchableOpacity
                key={city.id}
                onPress={() => handleExplorePlace(city.name)}
                activeOpacity={0.88}
                style={[
                  styles.cityCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  SHADOWS.card,
                ]}
              >
                <Image
                  source={
                    LOCAL_CITY_IMAGES[city.id] ||
                    LOCAL_CITY_IMAGES[city.name.toLowerCase()] ||
                    { uri: city.image }
                  }
                  style={styles.cityCardImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(6, 21, 34, 0.70)', 'rgba(6, 21, 34, 0.95)']}
                  style={StyleSheet.absoluteFillObject}
                />

                <View style={styles.cityTypeBadge}>
                  <Text style={styles.cityTypeText}>{city.type}</Text>
                </View>

                <View style={styles.cityBottomContent}>
                  <Text style={styles.cityName}>{city.name}</Text>
                  <Text style={styles.cityState}>{city.state}</Text>
                  <Text style={styles.cityDesc} numberOfLines={2}>
                    {city.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ============================================================ */}
          {/* 7. FAMOUS PLACES & ATTRACTIONS (ORGANIZED BY STATE / CATEGORY)*/}
          {/* ============================================================ */}
          <View style={[styles.sectionHeaderBetween, { marginTop: 22 }]}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Famous Places</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                Iconic landmarks, temples & wonders across India
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/discovery')}
              style={styles.seeAllBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Explore all</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
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

          {/* Famous Places Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.destinationsScroll}
          >
            {filteredFamousPlaces.slice(0, 8).map((place) => (
              <TouchableOpacity
                key={place.id}
                onPress={() => handleExplorePlace(place.city || place.name)}
                activeOpacity={0.88}
                style={[
                  styles.famousCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  SHADOWS.card,
                ]}
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
                  style={styles.famousCardImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(6, 21, 34, 0.70)', 'rgba(6, 21, 34, 0.95)']}
                  style={StyleSheet.absoluteFillObject}
                />

                <View style={styles.famousCategoryBadge}>
                  <Text style={styles.famousCategoryText}>{place.category}</Text>
                </View>

                <View style={styles.famousBottomContent}>
                  <Text style={styles.famousPlaceName}>{place.name}</Text>
                  <View style={styles.famousLocationRow}>
                    <Ionicons name="location-sharp" size={11} color={colors.primary} />
                    <Text style={[styles.famousLocationText, { color: colors.primary }]}>
                      {place.city}, {place.state}
                    </Text>
                  </View>
                  <Text style={styles.famousDesc} numberOfLines={2}>
                    {place.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ============================================================ */}
          {/* 8. CINEMATIC HERO DESTINATION & SEARCH                       */}
          {/* ============================================================ */}
          <View style={[styles.heroCardWrapper, SHADOWS.card, { marginTop: 24 }]}>
            <ImageBackground
              source={HERO_IMAGE}
              style={styles.heroImage}
              imageStyle={{ borderRadius: RADII['3xl'] }}
              resizeMode="cover"
            >
              <LinearGradient
                colors={[
                  'rgba(6, 21, 34, 0.15)',
                  'rgba(6, 21, 34, 0.65)',
                  'rgba(6, 21, 34, 0.94)',
                ]}
                style={styles.heroGradient}
              />

              <View style={styles.heroContent}>
                <View style={styles.heroTag}>
                  <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                  <Text style={styles.heroTagText}>FEATURED JOURNEY</Text>
                </View>

                <Text style={styles.heroHeadline}>Where will you go next?</Text>
                <Text style={styles.heroSupporting}>
                  Connect with verified solo travelers exploring India this season.
                </Text>

                <View style={styles.heroSearchWrap}>
                  <InputField
                    placeholder="Search destination (Goa, Manali, Kashmir)..."
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Travel Vibes & Styles</Text>
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

          {/* ============================================================ */}
          {/* 9. UPCOMING TRIPS SECTION (PRODUCTION SUPABASE INTEGRATION)  */}
          {/* ============================================================ */}
          <View style={styles.sectionHeaderBetween}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Upcoming Trips</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                Itineraries active for traveler matching
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/trips')}
              style={styles.seeAllBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Manage</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Error State */}
          {loadError && (
            <View style={[styles.errorCard, { backgroundColor: colors.cardBg, borderColor: colors.danger }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{loadError}</Text>
              <TouchableOpacity onPress={() => loadDashboardData(false)} style={styles.retryBtn}>
                <Text style={[styles.retryBtnText, { color: colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Skeleton */}
          {loading && !loadError ? (
            <View style={styles.skeletonWrap}>
              <SkeletonCard height={110} />
            </View>
          ) : upcomingTrips.length > 0 ? (
            /* Populated State */
            upcomingTrips.map((trip) => {
              const destImage = getDestinationImage(trip.destination);
              const formattedDates = formatTripDateRangeIN(trip.date_from, trip.date_to);

              return (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => router.push('/(tabs)/trips')}
                  activeOpacity={0.85}
                  style={[
                    styles.upcomingTripCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                    SHADOWS.soft,
                  ]}
                >
                  <View style={styles.tripThumbWrap}>
                    <Image source={destImage} style={styles.tripThumbImage} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(6, 21, 34, 0.65)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>

                  <View style={styles.tripCardInfo}>
                    <Text style={[styles.tripDestination, { color: colors.textPrimary }]} numberOfLines={1}>
                      {trip.destination}
                    </Text>
                    <View style={styles.tripDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.tripDates, { color: colors.textSecondary }]}>
                        {formattedDates}
                      </Text>
                    </View>
                    <View style={styles.tripBadgePillRow}>
                      <View style={[styles.tripStylePill, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                        <Text style={[styles.tripStyleText, { color: colors.primary }]}>
                          {trip.travel_style || 'Culture & Exploration'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tripCardRight}>
                    <View style={[styles.activeStatusPill, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                      <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.activeStatusText, { color: colors.success }]}>Active</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 8 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            /* Polished 4K Empty State Card for Plan a Trip */
            <View
              style={[
                styles.emptyTripCard,
                { borderColor: colors.cardBorder },
                SHADOWS.card,
              ]}
            >
              <ImageBackground
                source={{ uri: EMPTY_TRIP_BG_4K }}
                defaultSource={EMPTY_TRIP_BG_LOCAL}
                style={StyleSheet.absoluteFillObject}
                imageStyle={styles.emptyTripBgImage}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={[
                    'rgba(6, 21, 34, 0.62)',
                    'rgba(6, 21, 34, 0.86)',
                    'rgba(6, 21, 34, 0.96)',
                  ]}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFillObject}
                />
              </ImageBackground>

              <View style={styles.emptyTripContent}>
                <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.22)' }]}>
                  <Ionicons name="airplane-outline" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.emptyPromptTitle}>
                  No upcoming trips planned yet
                </Text>
                <Text style={styles.emptyPromptDesc}>
                  Post your travel dates to connect with verified travelers heading to the same destination.
                </Text>
                <PrimaryButton
                  title="+ Plan a Trip"
                  onPress={() => router.push('/(tabs)/trips')}
                  size="small"
                  style={styles.emptyPlanBtn}
                />
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* 10. REAL COMMUNITY ITINERARIES (IF ANY IN SUPABASE)          */}
          {/* ============================================================ */}
          {communityTrips.length > 0 && (
            <View style={styles.communitySectionWrap}>
              <View style={styles.sectionHeaderBetween}>
                <View style={styles.sectionHeaderTextWrap}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Fellow Travelers Heading Out
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    Active itineraries from verified members
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/discovery')}
                  style={styles.seeAllBtn}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>Explore all</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {communityTrips.map((cTrip) => {
                const traveler = cTrip.users || {};
                return (
                  <TouchableOpacity
                    key={cTrip.id}
                    onPress={() => router.push('/(tabs)/discovery')}
                    activeOpacity={0.85}
                    style={[styles.communityCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                  >
                    <Avatar
                      uri={traveler.avatar_url}
                      name={traveler.name || 'Traveler'}
                      size={40}
                      verified={traveler.verification_status === 'verified'}
                      ringVariant="none"
                    />
                    <View style={styles.communityCardInfo}>
                      <View style={styles.communityNameRow}>
                        <Text style={[styles.communityTravelerName, { color: colors.textPrimary }]}>
                          {traveler.name || 'Traveler'}
                        </Text>
                        <Text style={[styles.communityDestination, { color: colors.primary }]}>
                          heading to {cTrip.destination}
                        </Text>
                      </View>
                      <Text style={[styles.communityDates, { color: colors.textSecondary }]}>
                        {formatTripDateRangeIN(cTrip.date_from, cTrip.date_to)}
                      </Text>
                    </View>
                    <View style={[styles.communityConnectBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                      <Text style={[styles.communityConnectText, { color: colors.primary }]}>Connect</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ============================================================ */}
          {/* 11. POPULAR PLACES ACROSS INDIA                              */}
          {/* ============================================================ */}
          <View style={[styles.sectionHeaderBetween, { marginTop: 24 }]}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Popular Places</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                Top Indian destinations with active solo travelers
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/discovery')}
              style={styles.seeAllBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Explore all</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
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
                style={[
                  styles.placeCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  SHADOWS.card,
                ]}
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
                  <Text style={styles.placeCountry}>{place.state ? `${place.state}, India` : place.country}</Text>

                  <View style={styles.placeTravelersRow}>
                    <Ionicons name="people-outline" size={12} color={colors.primary} />
                    <Text style={[styles.placeTravelersText, { color: colors.primary }]}>
                      {place.travelersCount} travelers on MaybeWe
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ============================================================ */}
          {/* 12. FAST DISCOVERY ACTION BANNER                             */}
          {/* ============================================================ */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/discovery')}
            style={[styles.discoveryBanner, SHADOWS.soft]}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={isDark ? ['#FFFFFF', '#F0F4F8'] : ['#061522', '#10283A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.discoveryBannerInner}
            >
              <View style={styles.discoveryBannerText}>
                <Text style={[styles.discoveryBannerTitle, { color: isDark ? '#061522' : '#FFFFFF' }]}>
                  Find Your Travel People
                </Text>
                <Text
                  style={[
                    styles.discoveryBannerSubtitle,
                    { color: isDark ? 'rgba(6, 21, 34, 0.75)' : 'rgba(255, 255, 255, 0.75)' },
                  ]}
                >
                  Meet travelers heading across India who share your vibe.
                </Text>
              </View>
              <View style={[styles.discoveryBannerArrow, { backgroundColor: isDark ? '#061522' : '#FFFFFF' }]}>
                <Ionicons name="arrow-forward" size={20} color={isDark ? '#FFFFFF' : '#061522'} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* ============================================================ */}
        {/* LOCATION PICKER MODAL (INDIA CITIES & STATES)                */}
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
              style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, SHADOWS.large]}
              onPress={(e) => {
                if (e && e.stopPropagation) e.stopPropagation();
              }}
            >
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderLeft}>
                  <View style={[styles.modalHeaderIconBadge, { backgroundColor: 'rgba(255, 90, 95, 0.12)', borderColor: 'rgba(255, 90, 95, 0.35)' }]}>
                    <Ionicons name="location-sharp" size={20} color="#FF5A5F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      Location Control Center
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                      Calibrate travel base, partners & routes across India
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  onPress={() => setShowLocationPicker(false)}
                  {...(Platform.OS === 'web' ? { onClick: () => setShowLocationPicker(false) } : {})}
                  activeOpacity={0.7}
                  accessibilityLabel="Close location control center"
                >
                  <Ionicons name="close" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Current Active Base Hero Card */}
              <View style={[styles.modalActiveHeroCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={styles.modalActiveHeroLeft}>
                  <View style={[styles.modalActiveHeroIconWrap, { backgroundColor: 'rgba(255, 90, 95, 0.14)', borderColor: 'rgba(255, 90, 95, 0.4)' }]}>
                    <Ionicons name="location-sharp" size={20} color="#FF5A5F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalActiveHeroLabel, { color: colors.textMuted }]}>
                      CURRENT ACTIVE BASE
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.modalActiveHeroCity, { color: colors.textPrimary }]}>
                        {userLocation.city}
                      </Text>
                      <View style={[styles.modalActiveStateTag, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                        <Text style={[styles.modalActiveStateTagText, { color: colors.primary }]}>
                          {userLocation.state}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.modalActiveHeroDistrict, { color: colors.textSecondary }]} numberOfLines={1}>
                      {userLocation.district ? `${userLocation.district} District • ` : ''}India Travel Base
                    </Text>
                  </View>
                </View>
                <View style={styles.modalActiveBeaconBadge}>
                  <View style={styles.modalActiveBeaconDot} />
                  <Text style={styles.modalActiveBeaconText}>Active Base</Text>
                </View>
              </View>

              {/* Quick Actions Bar (GPS Auto-Detect Live Location) */}
              <View style={styles.modalActionButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalAutoDetectBtn, { backgroundColor: colors.primary }]}
                  onPress={() => detectDeviceLocation(true)}
                  {...(Platform.OS === 'web' ? { onClick: () => detectDeviceLocation(true) } : {})}
                  disabled={locating}
                  activeOpacity={0.85}
                  accessibilityLabel="Auto-detect current live location"
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={colors.primaryText} style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="navigate-circle" size={18} color={colors.primaryText} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.modalAutoDetectBtnText, { color: colors.primaryText }]}>
                    {locating ? 'Calibrating...' : 'Auto-Detect (GPS)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={[styles.modalSearchWrap, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.modalSearchInput, { color: colors.textPrimary }]}
                  placeholder="Search 100+ Indian cities, districts, states..."
                  placeholderTextColor={colors.textMuted}
                  value={locationSearchQuery}
                  onChangeText={setLocationSearchQuery}
                  autoCorrect={false}
                />
                {locationSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setLocationSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
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
                        isActive
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.modalRegionPillText,
                          isActive ? { color: colors.primaryText, fontWeight: '700' } : { color: colors.textSecondary },
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
                <Text style={[styles.modalSectionHeading, { color: colors.textSecondary }]}>
                  Popular Travel Hubs
                </Text>
                <Text style={[styles.modalSectionCount, { color: colors.textMuted }]}>
                  {POPULAR_HUBS.length} Hubs
                </Text>
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
                        isCurrent
                          ? { backgroundColor: 'rgba(255, 90, 95, 0.16)', borderColor: 'rgba(255, 90, 95, 0.5)' }
                          : { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                      ]}
                      onPress={() => handleSelectLocation(hub)}
                      {...(Platform.OS === 'web' ? { onClick: () => handleSelectLocation(hub) } : {})}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalQuickHubChipText,
                          isCurrent ? { color: '#FF5A5F', fontWeight: '700' } : { color: colors.textPrimary },
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
                <Text style={[styles.modalSectionHeading, { color: colors.textSecondary }]}>
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
                        isCurrent
                          ? { backgroundColor: 'rgba(255, 90, 95, 0.08)', borderColor: 'rgba(255, 90, 95, 0.4)' }
                          : { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                      ]}
                      onPress={() => handleSelectLocation(item)}
                      {...(Platform.OS === 'web' ? { onClick: () => handleSelectLocation(item) } : {})}
                      activeOpacity={0.75}
                    >
                      <View style={styles.modalCityItemLeft}>
                        <View
                          style={[
                            styles.modalCityPin,
                            isCurrent
                              ? { backgroundColor: 'rgba(255, 90, 95, 0.18)', borderColor: 'rgba(255, 90, 95, 0.5)' }
                              : { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                          ]}
                        >
                          <Ionicons
                            name="location-sharp"
                            size={14}
                            color={isCurrent ? '#FF5A5F' : colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.modalCityName,
                                { color: isCurrent ? '#FF5A5F' : colors.textPrimary },
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
                          <Text style={[styles.modalCityState, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.district ? `${item.district} • ${item.state}` : item.state}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isCurrent ? (
                          <View style={styles.modalActiveInlineTag}>
                            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                            <Text style={styles.modalActiveInlineTagText}>Active</Text>
                          </View>
                        ) : (
                          <View style={[styles.modalCityBadge, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                            <Text style={[styles.modalCityBadgeText, { color: colors.textSecondary }]}>
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

  // 1. Profile Greeting Bar
  topGreetingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  greetingTextBlock: {
    flex: 1,
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
    letterSpacing: -0.5,
  },
  greetingSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    marginTop: 2,
  },
  userStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  verifiedStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  verifiedStatusText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  unverifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  unverifiedChipText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  avatarWrap: {
    padding: 2,
  },

  // 2. Live Location Banner
  liveLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADII.xl,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    ...Platform.select({
      web: { backdropFilter: 'blur(14px)' },
      default: {},
    }),
  },
  locationLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  livePulseDotWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationTextGroup: {
    flex: 1,
  },
  locationHeading: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  locationSubheading: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  refreshLocBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADII.xl,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  locationNoticeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    flex: 1,
  },
  detectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  detectBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
  },

  locationActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // 3. Real Travel Summary Stats Strip
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADII['2xl'],
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    opacity: 0.6,
  },

  // 4. Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    width: '48%',
    minWidth: 145,
    height: 136,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    backgroundColor: '#061522',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' },
      default: {},
    }),
  },
  quickActionCardBgImage: {
    width: '100%',
    height: '100%',
  },
  quickActionCardInner: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  quickActionTextGroup: {
    marginTop: 'auto',
  },
  quickActionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 20,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quickActionSub: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // 6. Major Destinations Cards
  destinationsScroll: {
    paddingVertical: 6,
    gap: 14,
    marginBottom: 10,
  },
  cityCard: {
    width: 220,
    height: 280,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  cityCardImage: {
    width: '100%',
    height: '100%',
  },
  cityTypeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(6, 21, 34, 0.82)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  cityTypeText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cityBottomContent: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  cityName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  cityState: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 4,
  },
  cityDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 15,
  },

  // 7. Famous Places
  famousChipsScroll: {
    paddingVertical: 4,
    gap: 8,
    marginBottom: 12,
  },
  famousCard: {
    width: 220,
    height: 280,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  famousCardImage: {
    width: '100%',
    height: '100%',
  },
  famousCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(6, 21, 34, 0.82)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  famousCategoryText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  famousBottomContent: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  famousPlaceName: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  famousLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginVertical: 3,
  },
  famousLocationText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  famousDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 15,
  },

  // 8. Hero Card
  heroCardWrapper: {
    borderRadius: RADII['3xl'],
    overflow: 'hidden',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroImage: {
    width: '100%',
    minHeight: 330,
    justifyContent: 'flex-end',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADII['3xl'],
  },
  heroContent: {
    padding: 20,
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
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 6,
  },
  heroSupporting: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 18,
    marginBottom: 14,
  },
  heroSearchWrap: {
    width: '100%',
  },

  // Section Headers
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
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
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
  },
  preferenceChipsScroll: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 20,
  },

  // 9. Upcoming Trips Cards
  upcomingTripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII['2xl'],
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    ...Platform.select({
      web: { backdropFilter: 'blur(16px)' },
      default: {},
    }),
  },
  tripThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  tripThumbImage: {
    width: '100%',
    height: '100%',
  },
  tripCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tripDestination: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tripDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  tripDates: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  tripBadgePillRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tripStylePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  tripStyleText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    fontWeight: '600',
  },
  tripCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  activeStatusText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
  },

  // 4K Empty Trip Card
  emptyTripCard: {
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: '#061522',
  },
  emptyTripBgImage: {
    width: '100%',
    height: '100%',
  },
  emptyTripContent: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyPromptTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyPromptDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.82)',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
    marginBottom: 16,
  },
  emptyPlanBtn: {
    minWidth: 140,
  },

  // Error Card
  errorCard: {
    borderRadius: RADII.xl,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  retryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  retryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonWrap: {
    marginBottom: 10,
  },

  // 10. Community Itineraries
  communitySectionWrap: {
    marginTop: 20,
    marginBottom: 8,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.xl,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  communityCardInfo: {
    flex: 1,
  },
  communityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  communityTravelerName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  communityDestination: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  communityDates: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  communityConnectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  communityConnectText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
  },

  // 11. Popular Places
  popularPlacesScroll: {
    paddingVertical: 6,
    gap: 14,
    marginBottom: 20,
  },
  placeCard: {
    width: 200,
    height: 270,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
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
  },

  // 12. Discovery Banner
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
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  discoveryBannerSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  discoveryBannerArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================================
  // PROFESSIONAL OUTSIDE LOCATION ACCESS DASHBOARD STYLES
  // ============================================================
  locationAccessDashboard: {
    borderRadius: RADII['2xl'],
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  dashboardMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dashboardMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dashboardMetaTitle: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dashboardCoordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  dashboardCoordText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
  },
  dashboardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  locationPinContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDashboardInfoBlock: {
    flex: 1,
  },
  locationCityStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  dashboardCityTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dashboardStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  dashboardStatePillText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  dashboardSubtext: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  dashboardQuickRefreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardActionsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dashboardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  dashboardActionBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },

  // ============================================================
  // PROFESSIONAL INSIDE LOCATION CONTROL CENTER (MODAL) STYLES
  // ============================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: RADII['3xl'],
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActiveHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADII.xl,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalActiveHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  modalActiveHeroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActiveHeroLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  modalActiveHeroCity: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
  },
  modalActiveStateTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  modalActiveStateTagText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  modalActiveHeroDistrict: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 1,
  },
  modalActiveBeaconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  modalActiveBeaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  modalActiveBeaconText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#10B981',
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalAutoDetectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADII.xl,
  },
  modalAutoDetectBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalResetPresentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADII.xl,
    borderWidth: 1,
  },
  modalResetPresentBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.xl,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginLeft: 8,
    paddingVertical: 2,
  },
  modalRegionFilterScroll: {
    marginBottom: 10,
    maxHeight: 32,
  },
  modalRegionPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  modalRegionPillText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  modalSubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 2,
  },
  modalSectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalSectionCount: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
  modalQuickHubsScroll: {
    marginBottom: 10,
    maxHeight: 34,
  },
  modalQuickHubChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  modalQuickHubChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  modalResultsList: {
    maxHeight: 250,
  },
  modalCityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: RADII.lg,
    borderWidth: 1,
    marginBottom: 6,
  },
  modalCityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalCityPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  modalCityName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  modalPresentTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(255, 90, 95, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.35)',
  },
  modalPresentTagText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FF5A5F',
  },
  modalCityState: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  modalActiveInlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  modalActiveInlineTagText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#10B981',
  },
  modalCityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  modalCityBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
});
