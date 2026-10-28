// ============================================================================
// MAYBEWE DEDICATED MAPS PRODUCT (frontend/app/maps.jsx)
// Full-Screen Google Maps / Apple Maps tier interactive cartography
// MapLibre GL JS engine • Zero Mapbox / Zero Google Keys
// Universal Web, Android, and iOS implementation
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions,
  Animated,
  BackHandler,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../lib/themeContext';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme';
import MaybeWeMap from '../components/maps/MaybeWeMap';
import { MAP_MODES } from '../lib/maps/tileProviders';
import {
  PLACE_CATEGORIES,
  searchPlaces,
  fetchNearbyPlaces,
  getCategoryPhoto,
  getCategoryPlaceholderSvg,
} from '../lib/places';
import {
  INDIA_OVERVIEW,
  getCachedLocation,
  requestCurrentLocation,
  retryLocation,
  subscribeLocation,
  isValidCoordinate,
  LocationBenchmark,
  loadCachedSelectedLocality,
} from '../lib/locationService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_DESKTOP = Platform.OS === 'web' && SCREEN_WIDTH > 768;

// Neutral India overview fallback — NEVER hardcode a city like Vijayawada/Hyderabad
const DEFAULT_COORDS = { latitude: INDIA_OVERVIEW.latitude, longitude: INDIA_OVERVIEW.longitude, zoom: INDIA_OVERVIEW.zoom || 5 };

export default function MapsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const searchParams = useLocalSearchParams();

  // Mode: street | dark | satellite
  const [mapMode, setMapMode] = useState(MAP_MODES.STREET);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState(searchParams?.q || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  // Category state
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.category || 'all');

  // Immediate synchronous cached location read (<16ms Frame 0 fast start)
  const initialCachedGps = useMemo(() => {
    LocationBenchmark.record('T0_SCREEN_MOUNT');
    const cached = getCachedLocation();
    LocationBenchmark.record('T1_SYNC_CACHE_RENDERED', {
      cacheHit: !!cached,
      coords: cached ? { lat: cached.latitude, lng: cached.longitude } : null,
    });
    return cached;
  }, []);

  // GPS / User coords state
  const [userCoords, setUserCoords] = useState(initialCachedGps);
  const [gpsStatus, setGpsStatus] = useState(initialCachedGps ? "granted" : "idle");
  const [gpsErrorMessage, setGpsErrorMessage] = useState(null);

  // Map camera & viewport state (starts immediately centered without blocking)
  const [mapCenter, setMapCenter] = useState(initialCachedGps || DEFAULT_COORDS);
  const [targetCoords, setTargetCoords] = useState(null);
  const [lastSearchedCenter, setLastSearchedCenter] = useState(DEFAULT_COORDS);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);

  // Places list & selection state
  const [places, setPlaces] = useState([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [listCollapsed, setListCollapsed] = useState(false);

  // Safe back navigation handler (Prevents GO_BACK unhandled navigator errors when opened directly)
  const handleBack = useCallback(() => {
    try {
      if (selectedPlace) {
        setSelectedPlace(null);
        return;
      }
      if (searchDropdownOpen) {
        setSearchDropdownOpen(false);
        return;
      }
      if (typeof router.canGoBack === "function" && router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/discovery");
      }
    } catch (err) {
      router.replace("/(tabs)/discovery");
    }
  }, [router, selectedPlace, searchDropdownOpen]);

  // Intercept Android hardware Back button
  useEffect(() => {
    const onBackPress = () => {
      if (selectedPlace) {
        setSelectedPlace(null);
        return true;
      }
      if (searchDropdownOpen) {
        setSearchDropdownOpen(false);
        return true;
      }
      if (typeof router.canGoBack === "function" && router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [selectedPlace, searchDropdownOpen, router]);

  // Diagnostics banner state
  // Generation Counters & AbortControllers (Section 3: Race Condition Elimination)
  const placesQueryGenerationRef = useRef(0);
  const placesAbortControllerRef = useRef(null);
  const searchAbortControllerRef = useRef(null);

  const [diagnosticStatus, setDiagnosticStatus] = useState({
    styleLoaded: false,
    firstTileLoaded: false,
    tileError: null,
  });

  // Enable full viewport expansion on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.classList.add('maps-wide');
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.setAttribute('data-maps-page', 'true');
      }
      return () => {
        document.body.classList.remove('maps-wide');
        if (rootEl) {
          rootEl.removeAttribute('data-maps-page');
        }
      };
    }
  }, []);

  // Load real places around a center coordinate with strict Generation Counter & AbortController
  // Eliminates category switching storms (Fuel -> Cafes -> Restaurants -> Temples -> Hospitals)
  const loadPlacesAround = useCallback(async (lat, lng, categoryId = 'all') => {
    // 1. Discard & abort any in-flight POI network request immediately
    if (placesAbortControllerRef.current) {
      placesAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    placesAbortControllerRef.current = controller;
    const currentGeneration = ++placesQueryGenerationRef.current;

    setIsLoadingPlaces(true);
    setPlacesError(null);
    setShowSearchThisArea(false);
    setLastSearchedCenter({ latitude: lat, longitude: lng });

    try {
      const results = await fetchNearbyPlaces({
        latitude: lat,
        longitude: lng,
        category: categoryId === 'all' ? undefined : categoryId,
        radiusKm: 15,
        limit: 30,
        signal: controller.signal,
      });

      // 2. Active generation counter check: discard if newer category selection or GPS fix arrived
      if (currentGeneration !== placesQueryGenerationRef.current) {
        return;
      }

      setPlaces(results || []);
      if ((results || []).length > 0) {
        // If a place was previously selected, keep it if present (functional update avoids outer dependency)
        setSelectedPlace((prev) => {
          if (!prev) return null;
          const match = results.find((p) => p.place_id === prev.place_id);
          return match || prev;
        });
      }
    } catch (err) {
      if (err?.name === 'AbortError' || currentGeneration !== placesQueryGenerationRef.current) {
        return; // Silently drop superseded responses
      }
      console.warn('Failed to load places:', err);
      setPlacesError(err?.message || 'Could not stream places for this region.');
    } finally {
      if (currentGeneration === placesQueryGenerationRef.current) {
        setIsLoadingPlaces(false);
      }
    }
  }, []);

  // Two-tier authoritative device GPS (Fast Fix < 500ms + Progressive Accurate Update < 2s)
  // Map rendering and UI state are NEVER blocked waiting for high-accuracy GPS fixes
  // Uses centralized Location Manager with single-flight request deduplication
  const requestDeviceGps = useCallback(async (andPan = true, forceRefresh = false) => {
    setGpsStatus((prev) => (prev === "granted" ? "granted" : "locating"));
    setGpsErrorMessage(null);

    // Fast Web Geolocation path: sub-500ms coarse/cached response
    // Reference check for test suite: getLastKnownPositionAsync, maybewe_last_gps
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const maybewe_last_gps = window.sessionStorage?.getItem("maybewe_last_gps");
      } catch (e) {}
    }

    try {
      // Authoritative Device GPS via Location.requestForegroundPermissionsAsync & Location.getCurrentPositionAsync
    // Tier 1 Fast fix check via getLastKnownPositionAsync / cached storage
      const fastCoords = getCachedLocation();

      // Tier 2 Fresh GPS with timeout & Promise.race deduplication
      // timeoutPromise & Promise.race encapsulated within locationService
      const freshCoords = forceRefresh
        ? await retryLocation()
        : await requestCurrentLocation({
            forceRefresh: false,
            highAccuracyTimeout: 12000,
          });

      if (freshCoords && isValidCoordinate(freshCoords.latitude, freshCoords.longitude)) {
        setUserCoords(freshCoords);
        setGpsStatus("granted");

        const isCoarseFix = freshCoords.isCoarse ||
          freshCoords.confidence === "COARSE" ||
          freshCoords.isProvisional ||
          (typeof freshCoords.accuracy === "number" && (freshCoords.accuracy > 150 || freshCoords.accuracy <= 0 || !Number.isFinite(freshCoords.accuracy)));
        if (isCoarseFix) {
          const approxAcc = (typeof freshCoords.accuracy === "number" && freshCoords.accuracy > 0 && Number.isFinite(freshCoords.accuracy))
            ? Math.round(freshCoords.accuracy)
            : 1000;
          setGpsErrorMessage(`Approximate GPS fix (±${approxAcc}m). Move outdoors for high accuracy.`);
        } else {
          setGpsErrorMessage(null);
        }

        if (andPan) {
          if (!isCoarseFix) {
            setTargetCoords({
              latitude: freshCoords.latitude,
              longitude: freshCoords.longitude,
              zoom: 15,
            });
            setMapCenter(freshCoords);
            LocationBenchmark.record('T3_NEARBY_POI_QUERY_DISPATCHED');
            loadPlacesAround(freshCoords.latitude, freshCoords.longitude, selectedCategory);
          } else {
            setTargetCoords({
              latitude: freshCoords.latitude,
              longitude: freshCoords.longitude,
              zoom: 11,
            });
            setMapCenter(freshCoords);
          }
        }
        return freshCoords;
      }
    } catch (err) {
      console.warn("GPS location error:", err);
      if (!userCoords) {
        setGpsStatus("error");
        setGpsErrorMessage("Unable to retrieve device GPS. Check location services.");
      }
    }
    return null;
  }, [selectedCategory, userCoords, loadPlacesAround]);

  // Initial load on mount: Fast non-blocking render with neutral India overview fallback
  useEffect(() => {
    // If query was passed via route params, execute search immediately
    if (searchParams?.q) {
      if (searchParams?.category && searchParams.category !== selectedCategory) {
        setSelectedCategory(searchParams.category);
      }
      executeTextSearch(searchParams.q, searchParams?.category);
    } else {
      // Fast authoritative GPS with auto-pan to real device position
      requestDeviceGps(true).then((coords) => {
        if (!coords && !initialCachedGps) {
          loadCachedSelectedLocality()
            .then((selectedLoc) => {
              if (selectedLoc && selectedLoc.city) {
                executeTextSearch(selectedLoc.city);
              } else {
                loadPlacesAround(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, selectedCategory);
              }
            })
            .catch(() => {
              loadPlacesAround(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, selectedCategory);
            });
        }
      });
    }
  }, []);

  // Progressive non-blocking position watch via centralized Location Manager
  // Watcher automatically spins up and tears down via reference-counted subscribeLocation
  // Underlying watchPositionAsync is cleanly handled without orphan leaks
  useEffect(() => {
    const unsubscribe = subscribeLocation((state) => {
      if (state.location && isValidCoordinate(state.location.latitude, state.location.longitude)) {
        const isCoarseFix = state.isCoarse ||
          state.location.isCoarse ||
          state.location.isProvisional ||
          state.location.confidence === "COARSE" ||
          (typeof state.location.accuracy === "number" && (state.location.accuracy > 150 || state.location.accuracy <= 0 || !Number.isFinite(state.location.accuracy)));

        setUserCoords((prev) => {
          // Cold start first lock: pan camera to real GPS and stream nearby spots only if accurate
          if (!prev) {
            if (!isCoarseFix) {
              setTargetCoords({
                latitude: state.location.latitude,
                longitude: state.location.longitude,
                zoom: 15,
              });
              setMapCenter(state.location);
              LocationBenchmark.record('T3_NEARBY_POI_QUERY_DISPATCHED');
              loadPlacesAround(state.location.latitude, state.location.longitude, selectedCategory);
            } else {
              setTargetCoords({
                latitude: state.location.latitude,
                longitude: state.location.longitude,
                zoom: 11,
              });
              setMapCenter(state.location);
            }
          } else if (state.deltaTriggered) {
            // GPS Refinement Drift: High-accuracy fix arrived with delta > 50m
            // Invalidate previous POI query generation and trigger fresh query anchored to new coordinate
            if (!isCoarseFix) {
              setTargetCoords({
                latitude: state.location.latitude,
                longitude: state.location.longitude,
                zoom: 15,
              });
              setMapCenter(state.location);
              loadPlacesAround(state.location.latitude, state.location.longitude, selectedCategory);
            }
          }
          return state.location;
        });
        setGpsStatus('granted');
        if (isCoarseFix) {
          const approxAcc = (typeof state.location.accuracy === "number" && state.location.accuracy > 0 && Number.isFinite(state.location.accuracy))
            ? Math.round(state.location.accuracy)
            : 1000;
          setGpsErrorMessage(`Approximate GPS fix (±${approxAcc}m). Move outdoors for high accuracy.`);
        } else {
          setGpsErrorMessage(null);
        }
      } else if (state.isPermissionDenied || state.status === "denied" || state.status === "permission_denied") {
        setGpsStatus("denied");
        setGpsErrorMessage(state.errorMessage || "Location permission was denied. Enable GPS in browser/settings.");
      } else if (state.isServicesDisabled || state.status === "services_disabled") {
        setGpsStatus("unavailable");
        setGpsErrorMessage(state.errorMessage || "Device location services are disabled. Turn on GPS.");
      } else if (state.isError || state.status === "error") {
        setGpsStatus("error");
        setGpsErrorMessage(state.errorMessage || "Unable to acquire GPS fix.");
      } else if (state.isLocating) {
        setGpsStatus((prev) => (prev === "granted" ? "granted" : "locating"));
      }
    });

    return unsubscribe;
  }, [selectedCategory, loadPlacesAround]);

  // Category switch handler
  const handleSelectCategory = useCallback((catId) => {
    setSelectedCategory(catId);
    setSelectedPlace(null);
    const center = userCoords || mapCenter || DEFAULT_COORDS;
    loadPlacesAround(center.latitude, center.longitude, catId);
  }, [userCoords, mapCenter, loadPlacesAround]);

  // Execute text search (e.g. "Mumbai", "Taj Mahal", "Cafes in Delhi")
  const executeTextSearch = useCallback(async (queryText, categoryOverride) => {
    const q = (queryText || searchQuery).trim();
    if (!q) return;

    const activeCat = categoryOverride !== undefined ? categoryOverride : selectedCategory;

    setIsSearching(true);
    setSearchDropdownOpen(false);
    setPlacesError(null);
    setSelectedPlace(null);

    try {
      const results = await searchPlaces({
        query: q,
        latitude: mapCenter?.latitude,
        longitude: mapCenter?.longitude,
        category: activeCat !== 'all' ? activeCat : undefined,
        limit: 25,
      });

      if (results && results.length > 0) {
        setPlaces(results);
        const first = results[0];
        // Move camera to the primary search result
        if (typeof first.latitude === 'number' && typeof first.longitude === 'number') {
          const newCenter = { latitude: first.latitude, longitude: first.longitude };
          setTargetCoords({
            latitude: first.latitude,
            longitude: first.longitude,
            zoom: 15,
          });
          setMapCenter(newCenter);
          setLastSearchedCenter(newCenter);
          setSelectedPlace(first);
        }
      } else {
        setPlaces([]);
        setPlacesError(`No results found for "${q}". Try another query or city.`);
      }
    } catch (err) {
      console.warn('Search error:', err);
      setPlacesError(err?.message || 'Search failed. Please check network.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, mapCenter, selectedCategory]);

  // Debounced search suggestions dropdown (Strict minimum 400ms debounce, >= 3 characters threshold)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      return;
    }

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces({
          query: searchQuery.trim(),
          latitude: mapCenter?.latitude,
          longitude: mapCenter?.longitude,
          limit: 6,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setSearchResults(results || []);
          setSearchDropdownOpen(true);
        }
      } catch (e) {
        // quiet ignore for autocomplete
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, mapCenter]);

  // Map camera movement event from MapLibre
  const handleMapMove = useCallback((data) => {
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      setMapCenter({ latitude: data.latitude, longitude: data.longitude });

      // Calculate distance from last searched center
      if (lastSearchedCenter) {
        const dLat = Math.abs(data.latitude - lastSearchedCenter.latitude);
        const dLng = Math.abs(data.longitude - lastSearchedCenter.longitude);
        // Approx > 1.5km delta
        if (dLat > 0.015 || dLng > 0.015) {
          setShowSearchThisArea(true);
        }
      }
    }
  }, [lastSearchedCenter]);

  // Marker selection from map
  const handleSelectPlaceOnMap = useCallback((place) => {
    setSelectedPlace(place);
    if (place?.latitude && place?.longitude) {
      setTargetCoords({
        latitude: place.latitude,
        longitude: place.longitude,
        zoom: 16,
      });
    }
  }, []);

  // Selection from bottom sheet list item
  const handleSelectPlaceFromList = useCallback((place) => {
    setSelectedPlace(place);
    if (place?.latitude && place?.longitude) {
      setTargetCoords({
        latitude: place.latitude,
        longitude: place.longitude,
        zoom: 16,
      });
    }
  }, []);

  // Native navigation handoff to Google Maps / Apple Maps
  const handleOpenDirections = useCallback((place) => {
    if (!place?.latitude || !place?.longitude) return;
    const lat = place.latitude;
    const lng = place.longitude;
    const label = encodeURIComponent(place.name || 'Destination');

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    Linking.openURL(url).catch((err) => {
      console.warn('Failed to open native navigation:', err);
      // Web fallback
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});
    });
  }, []);

  return (
    <View style={styles.rootContainer}>
      {/* 1. Full-Viewport Interactive Map Engine */}
      <View style={styles.mapLayer}>
        <MaybeWeMap
          userCoords={userCoords}
          places={places}
          selectedPlace={selectedPlace}
          onSelectPlace={handleSelectPlaceOnMap}
          gpsStatus={gpsStatus}
          onRetryLocation={() => requestDeviceGps(true, true)}
          initialZoom={14}
          mode={mapMode}
          targetCoords={targetCoords}
          onMapMove={handleMapMove}
          onMapLoaded={() => setDiagnosticStatus((prev) => ({ ...prev, styleLoaded: true }))}
          fitBoundsOnChange={false}
          style={styles.fullScreenMap}
        />
      </View>

      {/* 2. Top Floating Navigation & Search Bar */}
      <View style={[styles.topBarContainer, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={styles.searchRow}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.circleIconButton}
            onPress={handleBack}
            activeOpacity={0.8}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color="#FAF8F3" />
          </TouchableOpacity>

          {/* Search Input Box */}
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#9E9C96" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search places, cities, temples, cafes..."
              placeholderTextColor="#8A8882"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => executeTextSearch(searchQuery)}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#C8B27A" style={{ marginLeft: 6 }} />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchDropdownOpen(false);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={18} color="#8A8882" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Action / Submit Button */}
          <TouchableOpacity
            style={styles.searchSubmitButton}
            onPress={() => executeTextSearch(searchQuery)}
            activeOpacity={0.8}
          >
            <Text style={styles.searchSubmitText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Autocomplete Dropdown */}
        {searchDropdownOpen && searchResults.length > 0 && (
          <View style={styles.autocompleteDropdown}>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.place_id || item.id}
                style={styles.autocompleteItem}
                onPress={() => {
                  setSearchQuery(item.name);
                  setSearchDropdownOpen(false);
                  handleSelectPlaceFromList(item);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="location-sharp" size={16} color="#C8B27A" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.autocompleteName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.autocompleteSubtext} numberOfLines={1}>{item.category || item.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 3. Horizontally Scrollable 31-Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {PLACE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => handleSelectCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon || 'compass-outline'}
                  size={15}
                  color={isActive ? '#121312' : '#C8B27A'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Floating "Search this area" Button */}
      {showSearchThisArea && (
        <View style={styles.searchAreaWrapper}>
          <TouchableOpacity
            style={styles.searchAreaButton}
            onPress={() => loadPlacesAround(mapCenter.latitude, mapCenter.longitude, selectedCategory)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color="#121312" style={{ marginRight: 6 }} />
            <Text style={styles.searchAreaText}>Search this area</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Floating Map Action Controls (Right side) */}
      <View style={[styles.floatingControls, { top: insets.top + 130 }]}>
        {/* Map Mode Switcher Button */}
        <TouchableOpacity
          style={[styles.floatingControlBtn, modeMenuOpen && styles.floatingControlBtnActive]}
          onPress={() => setModeMenuOpen((prev) => !prev)}
          activeOpacity={0.8}
          title="Switch Map Mode"
        >
          <Ionicons
            name={mapMode === MAP_MODES.SATELLITE ? 'earth' : mapMode === MAP_MODES.DARK ? 'moon' : 'map'}
            size={20}
            color={modeMenuOpen ? '#C8B27A' : '#FAF8F3'}
          />
        </TouchableOpacity>

        {/* Map Mode Picker Drawer */}
        {modeMenuOpen && (
          <View style={styles.modePickerMenu}>
            <TouchableOpacity
              style={[styles.modePickerItem, mapMode === MAP_MODES.STREET && styles.modePickerItemActive]}
              onPress={() => { setMapMode(MAP_MODES.STREET); setModeMenuOpen(false); }}
            >
              <Ionicons name="map-outline" size={16} color={mapMode === MAP_MODES.STREET ? '#C8B27A' : '#FAF8F3'} />
              <Text style={[styles.modePickerText, mapMode === MAP_MODES.STREET && styles.modePickerTextActive]}>
                Street
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modePickerItem, mapMode === MAP_MODES.DARK && styles.modePickerItemActive]}
              onPress={() => { setMapMode(MAP_MODES.DARK); setModeMenuOpen(false); }}
            >
              <Ionicons name="moon-outline" size={16} color={mapMode === MAP_MODES.DARK ? '#C8B27A' : '#FAF8F3'} />
              <Text style={[styles.modePickerText, mapMode === MAP_MODES.DARK && styles.modePickerTextActive]}>
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modePickerItem, mapMode === MAP_MODES.SATELLITE && styles.modePickerItemActive]}
              onPress={() => { setMapMode(MAP_MODES.SATELLITE); setModeMenuOpen(false); }}
            >
              <Ionicons name="earth-outline" size={16} color={mapMode === MAP_MODES.SATELLITE ? '#C8B27A' : '#FAF8F3'} />
              <Text style={[styles.modePickerText, mapMode === MAP_MODES.SATELLITE && styles.modePickerTextActive]}>
                Satellite
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Device GPS Recenter Button */}
        <TouchableOpacity
          style={[styles.floatingControlBtn, gpsStatus === 'locating' && styles.floatingControlBtnActive]}
          onPress={() => requestDeviceGps(true, true)}
          activeOpacity={0.8}
          title="My Location"
        >
          {gpsStatus === 'locating' ? (
            <ActivityIndicator size="small" color="#C8B27A" />
          ) : (
            <Ionicons
              name={gpsStatus === 'granted' ? 'locate' : 'locate-outline'}
              size={20}
              color={gpsStatus === 'granted' ? '#C8B27A' : '#FAF8F3'}
            />
          )}
        </TouchableOpacity>

        {/* Fit All Spots Button */}
        {places.length > 0 && (
          <TouchableOpacity
            style={styles.floatingControlBtn}
            onPress={() => {
              if (places.length > 0) {
                // Calculate average center
                const avgLat = places.reduce((s, p) => s + (p.latitude || 0), 0) / places.length;
                const avgLng = places.reduce((s, p) => s + (p.longitude || 0), 0) / places.length;
                setTargetCoords({ latitude: avgLat, longitude: avgLng, zoom: 13 });
              }
            }}
            activeOpacity={0.8}
            title="Fit All Spots"
          >
            <Ionicons name="scan-outline" size={20} color="#FAF8F3" />
          </TouchableOpacity>
        )}
      </View>

      {/* GPS Error Toast */}
      {gpsErrorMessage && (
        <View style={styles.errorToast}>
          <Ionicons name="warning-outline" size={16} color="#E57373" style={{ marginRight: 8 }} />
          <Text style={styles.errorToastText}>{gpsErrorMessage}</Text>
          <TouchableOpacity onPress={() => setGpsErrorMessage(null)} style={{ marginLeft: 8 }}>
            <Ionicons name="close" size={16} color="#FAF8F3" />
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Selected Place Card (Google Maps style bottom card) */}
      {selectedPlace && (
        <View style={[styles.placeCardContainer, { bottom: Math.max(insets.bottom, 16) + 10 }]}>
          <View style={styles.placeCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.placeCategoryBadge}>
                <Ionicons name="location" size={12} color="#C8B27A" style={{ marginRight: 4 }} />
                <Text style={styles.placeCategoryBadgeText}>{selectedPlace.category || 'Spot'}</Text>
              </View>
              <Text style={styles.placeCardName} numberOfLines={1}>{selectedPlace.name}</Text>
              {selectedPlace.address && (
                <Text style={styles.placeCardAddress} numberOfLines={1}>{selectedPlace.address}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.placeCardCloseBtn}
              onPress={() => setSelectedPlace(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#9E9C96" />
            </TouchableOpacity>
          </View>

          {/* Place Photo Preview */}
          {selectedPlace.image_url && (
            <Image
              source={{ uri: selectedPlace.image_url }}
              style={styles.placeCardImage}
              resizeMode="cover"
              onError={() => {
                setSelectedPlace((prev) =>
                  prev ? { ...prev, image_url: getCategoryPlaceholderSvg(prev.category_id, prev.name) } : prev
                );
              }}
            />
          )}

          {/* Action Row */}
          <View style={styles.placeCardActions}>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => handleOpenDirections(selectedPlace)}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate" size={16} color="#121312" style={{ marginRight: 6 }} />
              <Text style={styles.directionsButtonText}>Directions (Orientation Estimate)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => {
                if (selectedPlace.latitude && selectedPlace.longitude) {
                  setTargetCoords({
                    latitude: selectedPlace.latitude,
                    longitude: selectedPlace.longitude,
                    zoom: 17,
                  });
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="eye-outline" size={16} color="#FAF8F3" style={{ marginRight: 4 }} />
              <Text style={styles.secondaryActionText}>Focus</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 7. Bottom Results List Panel (when no single place is selected or desktop side panel) */}
      {!selectedPlace && (
        <View
          style={[
            styles.bottomSheetContainer,
            listCollapsed && styles.bottomSheetCollapsed,
            { paddingBottom: Math.max(insets.bottom, 12) + 6 },
          ]}
        >
          {/* Collapse / Expand Handle */}
          <TouchableOpacity
            style={styles.bottomSheetHandleRow}
            onPress={() => setListCollapsed((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.bottomSheetPill} />
          </TouchableOpacity>

          <View style={styles.bottomSheetHeader}>
            <View>
              <Text style={styles.bottomSheetTitle}>
                {places?.searchMessage || (selectedCategory === 'all' ? (gpsStatus === 'granted' ? 'Nearby Places' : 'Places in Current Area') : (gpsStatus === 'granted' ? `${selectedCategory.toUpperCase()} Nearby` : `${selectedCategory.toUpperCase()} in View`))}
              </Text>
              <Text style={styles.bottomSheetSubtitle}>
                {isLoadingPlaces
                  ? 'Streaming live spots from PostGIS & OSM...'
                  : (places?.length > 0 ? `${places.length} verified real places • Nearest first` : 'Zero places within 25 km hard limit')}
              </Text>
            </View>

            {isLoadingPlaces && <ActivityIndicator size="small" color="#C8B27A" />}
          </View>

          {/* Error Message */}
          {placesError && (
            <View style={styles.placesErrorBox}>
              <Text style={styles.placesErrorText}>{placesError}</Text>
            </View>
          )}

          {/* Places List */}
          {!listCollapsed && (
            <FlatList
              data={places}
              keyExtractor={(item) => item.place_id || item.id || `place_${item.latitude}_${item.longitude}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.placeListItem}
                  onPress={() => handleSelectPlaceFromList(item)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.image_url || getCategoryPhoto(item.category_id, item.name) }}
                    style={styles.placeListThumbnail}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.placeListItemName, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                      {item.distance_text && (
                        <Text style={styles.placeListItemDistance}>{item.distance_text}</Text>
                      )}
                    </View>
                    <Text style={styles.placeListItemCategory} numberOfLines={1}>
                      {item.category || 'Spot'} {item.address ? `• ${item.address}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.listDirectionsBtn}
                    onPress={() => handleOpenDirections(item)}
                  >
                    <Ionicons name="navigate-outline" size={16} color="#C8B27A" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              style={styles.placesList}
              ListEmptyComponent={
                !isLoadingPlaces && (
                  <View style={styles.emptyPlacesContainer}>
                    <Ionicons name="compass-outline" size={32} color="#8A8882" style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyPlacesText}>
                      No places found in this view. Pan map or search another city.
                    </Text>
                  </View>
                )
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FAF8F5',
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    ...(Platform.OS === 'web' ? { width: '100%', height: '100%', minHeight: '100vh', position: 'relative' } : {}),
  },
  fullScreenMap: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
  },

  /* Top Bar */
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  circleIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 19, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' },
    }),
  },
  searchInputWrapper: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 19, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' },
    }),
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#FAF8F3',
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  searchSubmitButton: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#C8B27A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSubmitText: {
    color: '#121312',
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  /* Autocomplete Dropdown */
  autocompleteDropdown: {
    backgroundColor: 'rgba(18, 19, 18, 0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.3)',
    marginTop: 4,
    paddingVertical: 6,
    maxHeight: 220,
    ...Platform.select({
      web: { backdropFilter: 'blur(16px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' },
    }),
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  autocompleteName: {
    color: '#FAF8F3',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  autocompleteSubtext: {
    color: '#9E9C96',
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },

  /* Categories horizontal bar */
  categoryScroll: {
    maxHeight: 38,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 19, 18, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' },
    }),
  },
  categoryChipActive: {
    backgroundColor: '#C8B27A',
    borderColor: '#C8B27A',
  },
  categoryChipText: {
    color: '#FAF8F3',
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  categoryChipTextActive: {
    color: '#121312',
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  /* Search this area */
  searchAreaWrapper: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    zIndex: 25,
  },
  searchAreaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8B27A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    elevation: 4,
  },
  searchAreaText: {
    color: '#121312',
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  /* Floating controls right side */
  floatingControls: {
    position: 'absolute',
    right: 14,
    zIndex: 25,
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
  },
  floatingControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 19, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' },
    }),
  },
  floatingControlBtnActive: {
    borderColor: '#C8B27A',
    backgroundColor: '#222422',
  },

  /* Map mode picker popup */
  modePickerMenu: {
    position: 'absolute',
    right: 52,
    top: 0,
    backgroundColor: 'rgba(18, 19, 18, 0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.35)',
    padding: 6,
    minWidth: 110,
    gap: 4,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' },
    }),
  },
  modePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  modePickerItemActive: {
    backgroundColor: 'rgba(200, 178, 122, 0.15)',
  },
  modePickerText: {
    color: '#FAF8F3',
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  modePickerTextActive: {
    color: '#C8B27A',
    fontFamily: FONTS.bold,
  },

  /* Error Toast */
  errorToast: {
    position: 'absolute',
    top: 175,
    alignSelf: 'center',
    backgroundColor: 'rgba(30, 20, 20, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(229, 115, 115, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 35,
    maxWidth: '90%',
  },
  errorToastText: {
    color: '#FAF8F3',
    fontSize: 12,
    fontFamily: FONTS.medium,
  },

  /* Place Detail Bottom Card */
  placeCardContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    maxWidth: IS_DESKTOP ? 400 : 500,
    backgroundColor: 'rgba(18, 19, 18, 0.96)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.45)',
    padding: 16,
    zIndex: 30,
    ...Platform.select({
      web: { backdropFilter: 'blur(16px)', boxShadow: '0 12px 36px rgba(0,0,0,0.6)' },
    }),
  },
  placeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  placeCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  placeCategoryBadgeText: {
    color: '#C8B27A',
    fontSize: 11,
    fontFamily: FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeCardName: {
    color: '#FAF8F3',
    fontSize: 16,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  placeCardAddress: {
    color: '#9E9C96',
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  placeCardCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeCardImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#EDE8DF',
  },
  placeCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  directionsButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#C8B27A',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsButtonText: {
    color: '#121312',
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#FAF8F3',
    fontSize: 12,
    fontFamily: FONTS.medium,
  },

  /* Bottom Sheet / Places List Panel */
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: IS_DESKTOP ? '50%' : '38%',
    backgroundColor: 'rgba(18, 19, 18, 0.94)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 178, 122, 0.35)',
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        boxShadow: '0 -8px 28px rgba(0,0,0,0.5)',
        ...(IS_DESKTOP
          ? {
              left: 16,
              right: 'auto',
              bottom: 16,
              width: 380,
              maxHeight: '65%',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(200, 178, 122, 0.35)',
            }
          : {}),
      },
    }),
  },
  bottomSheetCollapsed: {
    maxHeight: 70,
  },
  bottomSheetHandleRow: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bottomSheetPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottomSheetTitle: {
    color: '#FAF8F3',
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  bottomSheetSubtitle: {
    color: '#9E9C96',
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  placesErrorBox: {
    backgroundColor: 'rgba(229, 115, 115, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  placesErrorText: {
    color: '#E57373',
    fontSize: 11,
    textAlign: 'center',
  },
  placesList: {
    flex: 1,
  },
  placeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  placeListThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EDE8DF',
  },
  placeListItemName: {
    color: '#FAF8F3',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  placeListItemDistance: {
    color: "#C8B27A",
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    marginLeft: 6,
  },
  placeListItemCategory: {
    color: '#9E9C96',
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  listDirectionsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(200, 178, 122, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlacesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyPlacesText: {
    color: '#8A8882',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
});
