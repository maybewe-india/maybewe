import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import {
  PLACE_CATEGORIES,
  fetchNearbyPlaces,
  searchPlaces,
  toggleSavePlace,
  isPlaceSaved,
  getCategoryPhoto,
  getCategoryPlaceholderSvg,
  getNearbyRadiusMessage,
  getCategoryDisplayName,
} from '../lib/places';
import FilterChip from './ui/FilterChip';
import SkeletonCard from './ui/SkeletonCard';
import EmptyState from './ui/EmptyState';
import MaybeWeMap from './maps/MaybeWeMap';
import { calculateRoute } from '../lib/routing';
import {
  getCachedLocation,
  subscribeLocation,
  isValidCoordinate,
  requestCurrentLocation,
} from '../lib/locationService';

export default function PlaceDiscoveryView({
  searchDestination = '',
  deviceCoords = null,
  gpsStatus = 'idle',
  onRetryLocation,
  onSelectPlace,
  onAddToTrip,
}) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Mode: 'nearby' (Real Device GPS Proximity) vs 'destination' (City/Destination Search)
  const [placesMode, setPlacesMode] = useState(searchDestination ? 'destination' : 'nearby');
  // Format: 'map' (Interactive Map + Spots) vs 'cards' (Cards List only)
  const [viewFormat, setViewFormat] = useState('map');
  const [selectedPlaceOnMap, setSelectedPlaceOnMap] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  // Generation Counters & AbortControllers (Section 3: Race Condition Elimination)
  const queryGenerationRef = useRef(0);
  const abortControllerRef = useRef(null);

  const [places, setPlaces] = useState([]);
  const [radiusMessage, setRadiusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [savedPlaceIds, setSavedPlaceIds] = useState(new Set());
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [targetCoords, setTargetCoords] = useState(null);

  // Synchronous cache read (<16ms Frame 0) + Singleton location subscription
  const [activeCoords, setActiveCoords] = useState(() => getCachedLocation());

  // Subscribe to centralized location updates
  useEffect(() => {
    const unsub = subscribeLocation((state) => {
      if (state.location && isValidCoordinate(state.location.latitude, state.location.longitude)) {
        setActiveCoords(state.location);
      }
    });
    return unsub;
  }, []);

  const effectiveCoords = (deviceCoords && isValidCoordinate(deviceCoords.latitude, deviceCoords.longitude))
    ? deviceCoords
    : activeCoords;

  // Switch to destination mode if parent searchDestination changes
  useEffect(() => {
    if (searchDestination && searchDestination.trim() !== '') {
      setPlacesMode('destination');
    }
  }, [searchDestination]);

  // Calculate walking route polyline & ETA when a place is selected on map
  useEffect(() => {
    let isMounted = true;
    if (
      selectedPlaceOnMap &&
      effectiveCoords &&
      typeof selectedPlaceOnMap.latitude === 'number' &&
      typeof selectedPlaceOnMap.longitude === 'number'
    ) {
      calculateRoute({
        startCoords: effectiveCoords,
        endCoords: {
          latitude: selectedPlaceOnMap.latitude,
          longitude: selectedPlaceOnMap.longitude,
        },
        mode: 'walking',
      })
        .then((route) => {
          if (isMounted) setActiveRoute(route);
        })
        .catch(() => {
          if (isMounted) setActiveRoute(null);
        });
    } else {
      setActiveRoute(null);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedPlaceOnMap, effectiveCoords]);

  const loadPlaces = useCallback(async () => {
    // 1. Abort prior in-flight network request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentGen = ++queryGenerationRef.current;

    setLoading(true);
    setErrorState(null);

    try {
      if (placesMode === 'nearby') {
        if (!effectiveCoords || typeof effectiveCoords.latitude !== 'number') {
          if (currentGen === queryGenerationRef.current) {
            setPlaces([]);
            setLoading(false);
          }
          return;
        }

        const data = await fetchNearbyPlaces({
          latitude: effectiveCoords.latitude,
          longitude: effectiveCoords.longitude,
          category: selectedCategory,
          limit: 25,
          signal: controller.signal,
        });

        if (currentGen !== queryGenerationRef.current) return;

        const loaded = data || [];
        setPlaces(loaded);
        setRadiusMessage(loaded.searchMessage || getNearbyRadiusMessage(loaded, selectedCategory));
        if (loaded.length > 0) {
          setTargetCoords({ latitude: loaded[0].latitude, longitude: loaded[0].longitude, zoom: 14 });
        }
      } else {
        const query = searchDestination ? searchDestination.trim() : 'India';
        const data = await searchPlaces({
          query: selectedCategory !== 'all' ? (selectedCategory + ' in ' + query) : query,
          latitude: effectiveCoords?.latitude,
          longitude: effectiveCoords?.longitude,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          limit: 25,
          signal: controller.signal,
        });

        if (currentGen !== queryGenerationRef.current) return;

        // Filter by category if not 'all'
        let filtered = data || [];
        if (selectedCategory !== 'all') {
          filtered = filtered.filter(
            (p) =>
              (p.category_id || '').toLowerCase() === selectedCategory.toLowerCase() ||
              (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase())
          );
        }
        setPlaces(filtered);
        if (filtered.length > 0) {
          setTargetCoords({ latitude: filtered[0].latitude, longitude: filtered[0].longitude, zoom: 14 });
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError' || currentGen !== queryGenerationRef.current) return;
      console.warn('PlaceDiscoveryView loadPlaces error:', err);
      setErrorState(err.message || 'Unable to connect to location places provider.');
      setPlaces([]);
    } finally {
      if (currentGen === queryGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [placesMode, effectiveCoords, selectedCategory, searchDestination]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const handleToggleSave = async (place) => {
    const isSaved = await toggleSavePlace(place);
    const id = place.place_id || place.id;
    setSavedPlaceIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleOpenNavigation = (place) => {
    const url =
      place.navigation_url ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name}, ${place.address || ''}`
      )}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.root}>
      {/* 0. Primary Dedicated Maps Navigation Button */}
      <TouchableOpacity
        style={styles.openMapsHeroCard}
        onPress={() => router.push('/maps')}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Open Full-Screen Maps"
      >
        <View style={styles.openMapsHeroLeft}>
          <View style={styles.openMapsHeroIcon}>
            <Ionicons name="map" size={20} color="#121312" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={styles.openMapsHeroTitle}>Open Dedicated Maps</Text>
              <View style={styles.openMapsBadge}>
                <Text style={styles.openMapsBadgeText}>FULL SCREEN</Text>
              </View>
            </View>
            <Text style={styles.openMapsHeroSubtitle}>
              Google Maps-like view • Satellite imagery • Dark mode • 31 categories
            </Text>
          </View>
        </View>
        <Ionicons name="arrow-forward-circle" size={24} color="#C8B27A" />
      </TouchableOpacity>

      {/* 1. Sub-Mode Selector: Nearby Spots (GPS) vs Destination Search */}
      <View style={[styles.subModeWrapper, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1EEE6', borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.subModeBtn,
            placesMode === 'nearby' && [styles.subModeBtnActive, { backgroundColor: '#F4EFEB', borderWidth: 1, borderColor: 'rgba(197, 168, 128, 0.35)' }],
          ]}
          onPress={() => setPlacesMode('nearby')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="navigate-circle-outline"
            size={14}
            color={placesMode === 'nearby' ? '#1C1917' : colors.textSecondary}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.subModeBtnText,
              { color: placesMode === 'nearby' ? '#1C1917' : colors.textSecondary },
              placesMode === 'nearby' && styles.subModeBtnTextActive,
            ]}
          >
            Nearby Spots (GPS)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.subModeBtn,
            placesMode === 'destination' && [styles.subModeBtnActive, { backgroundColor: '#F4EFEB', borderWidth: 1, borderColor: 'rgba(197, 168, 128, 0.35)' }],
          ]}
          onPress={() => setPlacesMode('destination')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="search-outline"
            size={14}
            color={placesMode === 'destination' ? '#1C1917' : colors.textSecondary}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.subModeBtnText,
              { color: placesMode === 'destination' ? '#1C1917' : colors.textSecondary },
              placesMode === 'destination' && styles.subModeBtnTextActive,
            ]}
          >
            {searchDestination ? `In ${searchDestination}` : 'Search City'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. GPS Diagnostics / Permission Required for Nearby Spots */}
      {placesMode === 'nearby' && gpsStatus === 'denied' && (
        <View style={[styles.gpsAlertCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: '#FCA5A5' }]}>
          <Ionicons name="location-outline" size={24} color="#EF4444" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.gpsAlertTitle, { color: '#B91C1C' }]}>Device Location Required</Text>
            <Text style={[styles.gpsAlertDesc, { color: '#7F1D1D' }]}>
              Nearby Spots requires device GPS to show authentic venues within walking and driving distance. We never use IP or fake locations.
            </Text>
            <TouchableOpacity
              style={styles.gpsAlertBtn}
              onPress={() => onRetryLocation?.()}
              activeOpacity={0.8}
            >
              <Text style={styles.gpsAlertBtnText}>Enable Device Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {placesMode === 'nearby' && gpsStatus === 'unavailable' && (
        <View style={[styles.gpsAlertCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: '#FCD34D' }]}>
          <Ionicons name="refresh-circle-outline" size={24} color="#D97706" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.gpsAlertTitle, { color: '#B45309' }]}>Location Signal Unavailable</Text>
            <Text style={[styles.gpsAlertDesc, { color: '#92400E' }]}>
              Could not acquire GPS fix from your device. Please ensure location services are enabled.
            </Text>
            <TouchableOpacity
              style={[styles.gpsAlertBtn, { backgroundColor: '#D97706' }]}
              onPress={() => onRetryLocation?.()}
              activeOpacity={0.8}
            >
              <Text style={styles.gpsAlertBtnText}>Retry GPS Fix</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {placesMode === 'nearby' && gpsStatus === 'detecting' && (
        <View style={styles.detectingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.detectingText, { color: colors.textSecondary }]}>
            Detecting device location for real nearby spots...
          </Text>
        </View>
      )}

      {/* 3. Category Filter Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {PLACE_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat.id}
            label={cat.name}
            size="small"
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
          />
        ))}
      </ScrollView>

      {/* 4. Section Feed Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.sectionEyebrow}>
            {placesMode === 'nearby' ? (gpsStatus === 'granted' && effectiveCoords?.isGPS !== false ? 'GPS-VERIFIED PROXIMITY' : 'MANUAL LOCATION • PROXIMITY') : 'REAL-WORLD VENUES'}
          </Text>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]} numberOfLines={2}>
            {placesMode === 'nearby'
              ? (radiusMessage || getNearbyRadiusMessage(places, selectedCategory))
              : searchDestination ? `Spots in ${searchDestination}` : 'Destination Spots'}
          </Text>
          <Text style={[styles.feedCountSub, { color: colors.textSecondary }]}>
            {placesMode === 'nearby'
              ? (places.length > 0
                  ? `${places.length} verified venue${places.length === 1 ? '' : 's'} • Nearest first`
                  : 'Zero places within 25 km hard limit')
              : `${places.length} real spot${places.length === 1 ? '' : 's'} found`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Format Toggle: Map vs List */}
          <View style={[styles.formatToggleGroup, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.formatToggleBtn,
                viewFormat === 'map' && [styles.formatToggleBtnActive, { backgroundColor: isDark ? '#262626' : '#171817' }],
              ]}
              onPress={() => setViewFormat('map')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="map"
                size={13}
                color={viewFormat === 'map' ? '#FBFAF7' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.formatToggleText,
                  { color: viewFormat === 'map' ? '#FBFAF7' : colors.textSecondary },
                ]}
              >
                Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatToggleBtn,
                viewFormat === 'cards' && [styles.formatToggleBtnActive, { backgroundColor: isDark ? '#262626' : '#171817' }],
              ]}
              onPress={() => setViewFormat('cards')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="list"
                size={13}
                color={viewFormat === 'cards' ? '#FBFAF7' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.formatToggleText,
                  { color: viewFormat === 'cards' ? '#FBFAF7' : colors.textSecondary },
                ]}
              >
                List
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => loadPlaces()}
            style={[styles.refreshPill, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. Interactive Map View */}
      {viewFormat === 'map' && (
        <View style={[styles.mapContainer, { backgroundColor: '#FAF8F5' }]}>
          <MaybeWeMap
            userCoords={deviceCoords}
            places={places}
            selectedPlace={selectedPlaceOnMap}
            onSelectPlace={(place) => {
              setSelectedPlaceOnMap(place);
              setTargetCoords({ latitude: place.latitude, longitude: place.longitude, zoom: 15 });
              onSelectPlace?.(place);
            }}
            gpsStatus={gpsStatus}
            onRetryLocation={onRetryLocation}
            provider="maplibre"
            routeGeoJson={activeRoute?.geojson}
            targetCoords={targetCoords}
            isFullscreen={false}
            onToggleFullscreen={() => setIsFullscreenMap(true)}
            style={{ height: 340, width: '100%', position: 'relative', backgroundColor: '#FAF8F5' }}
          />

          {/* Selected Place Preview Card on Map */}
          {selectedPlaceOnMap && (
            <TouchableOpacity
              style={[styles.mapPreviewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              activeOpacity={0.85}
              onPress={() => onSelectPlace?.(selectedPlaceOnMap)}
            >
              <Image
                source={{ uri: selectedPlaceOnMap.image_url || getCategoryPhoto(selectedPlaceOnMap.category_id, selectedPlaceOnMap.name) }}
                style={styles.mapPreviewThumb}
              />
                            <View style={styles.mapPreviewInfo}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.mapPreviewTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedPlaceOnMap.name}
                  </Text>
                  {selectedPlaceOnMap.distance_text && (
                    <Text style={styles.mapPreviewDistance}>{selectedPlaceOnMap.distance_text}</Text>
                  )}
                </View>

                {/* Routing / Orientation Label */}
                {activeRoute && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 }}>
                    <Ionicons
                      name={activeRoute.isRealRoadRoute ? 'navigate' : 'compass-outline'}
                      size={12}
                      color={activeRoute.isRealRoadRoute ? '#4CAF50' : '#C8B27A'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={{ fontSize: 10, color: activeRoute.isRealRoadRoute ? '#4CAF50' : '#8A867E', fontWeight: '600' }}>
                      {activeRoute.isRealRoadRoute
                        ? `Road route: ${activeRoute.durationText || ''} (${activeRoute.distanceText || ''})`
                        : `Direct line: ${activeRoute.distanceText} (Orientation)`}
                    </Text>
                  </View>
                )}

                <Text style={[styles.mapPreviewDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedPlaceOnMap.address || selectedPlaceOnMap.destination}
                </Text>
                <View style={styles.mapPreviewFooter}>
                  <Text style={styles.mapPreviewCategory}>{selectedPlaceOnMap.category}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    {selectedPlaceOnMap.navigation_url && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL(selectedPlaceOnMap.navigation_url).catch(() => {});
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#C8B27A', fontWeight: '700' }}>Turn-by-Turn ↗</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={{ fontSize: 11, color: '#B99A5E', fontWeight: '700' }}>Details →</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 5. Main Feed */}
      {loading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard height={240} />
          <SkeletonCard height={240} />
        </View>
      ) : errorState ? (
        <View style={[styles.errorCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Ionicons name="cloud-offline-outline" size={32} color="#D97706" style={{ marginBottom: 8 }} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to load places</Text>
          <Text style={[styles.errorDesc, { color: colors.textSecondary }]}>{errorState}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: isDark ? '#B99A5E' : '#171817' }]}
            onPress={() => loadPlaces()}
          >
            <Text style={styles.retryBtnText}>Retry Search</Text>
          </TouchableOpacity>
        </View>
      ) : places.length > 0 ? (
        <View style={styles.placesList}>
          {places.map((place) => {
            const placeId = place.place_id || place.id;
            const isSaved = savedPlaceIds.has(placeId);
            const coverImage = place.image_url || getCategoryPhoto(place.category_id, place.name);

            return (
              <TouchableOpacity
                key={placeId}
                style={[
                  styles.fullPlaceCard,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border },
                ]}
                onPress={() => onSelectPlace?.(place)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: coverImage }} style={styles.fullPlaceImage} resizeMode="cover" onError={(e) => {}} />
                <LinearGradient
                  colors={['transparent', 'rgba(23, 24, 23, 0.05)', 'rgba(23, 24, 23, 0.45)']}
                  style={styles.imageGradient}
                />

                <View style={styles.cardFloatingBadges}>
                  <View style={styles.destBadge}>
                    <Text style={styles.destBadgeText}>{place.category?.toUpperCase() || 'SPOT'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.favCircle,
                      { backgroundColor: isSaved ? '#B99A5E' : 'rgba(23, 24, 23, 0.65)' },
                    ]}
                    onPress={() => handleToggleSave(place)}
                  >
                    <Ionicons
                      name={isSaved ? 'bookmark' : 'bookmark-outline'}
                      size={14}
                      color={isSaved ? '#171817' : '#FBFAF7'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.fullPlaceBody}>
                  <View style={styles.fullPlaceTopRow}>
                    {place.distance_text ? (
                      <View style={styles.distanceBadge}>
                        <Ionicons name="navigate-circle" size={13} color="#059669" style={{ marginRight: 3 }} />
                        <Text style={styles.distanceText}>{place.distance_text}</Text>
                      </View>
                    ) : null}
                    {place.rating ? (
                      <Text style={styles.fullPlaceRating}>⭐ {place.rating.toFixed(1)}</Text>
                    ) : null}
                  </View>

                  <Text style={[styles.fullPlaceTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={[styles.fullPlaceLocation, { color: colors.textSecondary }]} numberOfLines={2}>
                    {place.address || `${place.destination || ''}, ${place.state || ''}`}
                  </Text>

                  <View style={styles.fullPlaceBottomRow}>
                    <TouchableOpacity
                      style={styles.navQuickBtn}
                      onPress={(e) => {
                        if (e?.stopPropagation) e.stopPropagation();
                        handleOpenNavigation(place);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="navigate-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.navQuickBtnText, { color: colors.primary }]}>Directions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.addTripQuickBtn}
                      onPress={(e) => {
                        if (e?.stopPropagation) e.stopPropagation();
                        onAddToTrip?.(place);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={13} color="#FBFAF7" style={{ marginRight: 4 }} />
                      <Text style={styles.addTripQuickBtnText}>Add to Trip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="compass-outline"
          title={
            placesMode === 'nearby'
              ? (radiusMessage || `No ${getCategoryDisplayName(selectedCategory)} places found nearby.`)
              : 'No spots found'
          }
          description={
            placesMode === 'nearby'
              ? `We searched up to 25 km around your verified device GPS coordinates, but found no real ${getCategoryDisplayName(selectedCategory)} venues. We never fabricate distant or fake places.`
              : `No venues found matching "${searchDestination}". Try searching for another city or landmark.`
          }
          actionTitle={selectedCategory !== 'all' ? 'Show All Categories' : 'Refresh Search'}
          onAction={() => {
            if (selectedCategory !== 'all') {
              setSelectedCategory('all');
            } else {
              loadPlaces();
            }
          }}
        />
      )}

      {/* 6. Attribution Footer (Terms compliance) */}
      <View style={styles.attributionContainer}>
        <Ionicons name="map-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
        <Text style={[styles.attributionText, { color: colors.textMuted }]}>
          Points of interest powered by OpenStreetMap. © OpenStreetMap contributors.
        </Text>
      </View>

      {/* 6. Fullscreen Map Modal */}
      <Modal
        visible={isFullscreenMap}
        animationType="slide"
        onRequestClose={() => setIsFullscreenMap(false)}
      >
        <View style={[styles.fullscreenRoot, { backgroundColor: '#FAF8F5' }]}>
          <MaybeWeMap
            userCoords={deviceCoords}
            places={places}
            selectedPlace={selectedPlaceOnMap}
            onSelectPlace={(place) => {
              setSelectedPlaceOnMap(place);
              setTargetCoords({ latitude: place.latitude, longitude: place.longitude, zoom: 15 });
            }}
            gpsStatus={gpsStatus}
            onRetryLocation={onRetryLocation}
            provider="maplibre"
            routeGeoJson={activeRoute?.geojson}
            targetCoords={targetCoords}
            isFullscreen={true}
            onToggleFullscreen={() => setIsFullscreenMap(false)}
            style={{ flex: 1, width: "100%", height: "100%", borderRadius: 0, backgroundColor: "#FAF8F5", ...(Platform.OS === "web" ? { minHeight: "100vh", position: "relative" } : {}) }}
          />

          {/* Top Floating Controls */}
          <View style={styles.fullscreenTopOverlay}>
            <View style={styles.fullscreenHeaderRow}>
              <TouchableOpacity
                style={[styles.fullscreenControlBtn, { backgroundColor: isDark ? "rgba(23, 24, 23, 0.88)" : "rgba(255, 255, 255, 0.92)" }]}
                onPress={() => setIsFullscreenMap(false)}
                activeOpacity={0.8}
                accessibilityLabel="Exit full screen"
              >
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={[styles.fullscreenTitlePill, { backgroundColor: isDark ? "rgba(23, 24, 23, 0.88)" : "rgba(255, 255, 255, 0.92)" }]}>
                <Text style={[styles.fullscreenTitleText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {searchDestination || (placesMode === "nearby" ? "Nearby Discovery" : "India Directory")}
                </Text>
                <Text style={styles.fullscreenCountBadge}>{places.length} spots</Text>
              </View>
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fullscreenChipsScroll}
            >
              {PLACE_CATEGORIES.map((cat) => (
                <FilterChip
                  key={cat.id}
                  label={cat.label}
                  icon={cat.icon}
                  selected={selectedCategory === cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Bottom Floating Place Preview */}
          {selectedPlaceOnMap && (
            <View style={styles.fullscreenBottomOverlay}>
              <TouchableOpacity
                style={[styles.mapPreviewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                activeOpacity={0.85}
                onPress={() => onSelectPlace?.(selectedPlaceOnMap)}
              >
                <Image
                  source={{ uri: selectedPlaceOnMap.image_url || getCategoryPhoto(selectedPlaceOnMap.category_id, selectedPlaceOnMap.name) }}
                  style={styles.mapPreviewThumb}
                />
                <View style={styles.mapPreviewInfo}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.mapPreviewTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {selectedPlaceOnMap.name}
                    </Text>
                    {selectedPlaceOnMap.distance_text && (
                      <Text style={styles.mapPreviewDistance}>{selectedPlaceOnMap.distance_text}</Text>
                    )}
                  </View>
                  <Text style={[styles.mapPreviewDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedPlaceOnMap.address || selectedPlaceOnMap.destination}
                  </Text>
                  <View style={styles.mapPreviewFooter}>
                    <Text style={styles.mapPreviewCategory}>{selectedPlaceOnMap.category}</Text>
                    {selectedPlaceOnMap.navigation_url && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL(selectedPlaceOnMap.navigation_url)}
                        style={styles.navQuickBtn}
                      >
                        <Ionicons name="navigate" size={12} color="#C8B27A" style={{ marginRight: 4 }} />
                        <Text style={[styles.navQuickBtnText, { color: "#C8B27A" }]}>Navigate ↗</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  openMapsHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 25, 23, 0.88)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  openMapsHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  openMapsHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C8B27A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openMapsHeroTitle: {
    color: '#FAF8F3',
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  openMapsBadge: {
    backgroundColor: 'rgba(200, 178, 122, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.4)',
  },
  openMapsBadgeText: {
    color: '#C8B27A',
    fontSize: 9,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  openMapsHeroSubtitle: {
    color: '#9E9C96',
    fontSize: 11,
    fontFamily: FONTS.regular,
    lineHeight: 15,
  },
  root: {
    paddingBottom: 20,
  },
  subModeWrapper: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: RADII.full,
    padding: 3,
    borderWidth: 1,
  },
  subModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADII.full,
  },
  subModeBtnActive: {
    backgroundColor: '#F4EFEB',
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.35)',
    borderRadius: RADII.full,
  },
  subModeBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  subModeBtnTextActive: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  gpsAlertCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: RADII.lg,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
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
    paddingVertical: 7,
    paddingHorizontal: 12,
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
    paddingVertical: 10,
    gap: 8,
  },
  detectingText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#B99A5E',
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  sectionHeading: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    fontWeight: '800',
  },
  feedCountSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADII.full,
    borderWidth: 1,
    gap: 4,
  },
  refreshPillText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  placesList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  fullPlaceCard: {
    borderRadius: RADII.xl,
    overflow: 'hidden',
    borderWidth: 1,
    ...SHADOWS.card,
  },
  fullPlaceImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#EDE8DF',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  cardFloatingBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  destBadge: {
    backgroundColor: 'rgba(23, 24, 23, 0.75)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.sm,
  },
  destBadgeText: {
    color: '#FBFAF7',
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.8,
  },
  favCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPlaceBody: {
    padding: 14,
  },
  fullPlaceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
  },
  distanceText: {
    color: '#059669',
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  fullPlaceRating: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  fullPlaceTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  fullPlaceLocation: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  fullPlaceBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  navQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  navQuickBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  addTripQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
  },
  addTripQuickBtnText: {
    color: '#FBFAF7',
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: RADII.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  errorTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: RADII.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  formatToggleGroup: {
    flexDirection: 'row',
    borderRadius: RADII.full,
    padding: 3,
    borderWidth: 1,
    gap: 2,
  },
  formatToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: RADII.full,
    gap: 4,
  },
  formatToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  formatToggleText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  mapContainer: {
    position: "relative",
    marginBottom: 20,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  mapPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: -4,
    padding: 14,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  mapPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: '#EDE8DF',
  },
  mapPreviewInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  mapPreviewTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  mapPreviewDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginBottom: 4,
  },
  mapPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapPreviewCategory: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#B99A5E',
  },
  mapPreviewDistance: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#10B981',
  },
  attributionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  attributionText: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  fullscreenRoot: {
    flex: 1,
    position: "relative",
  },
  fullscreenTopOverlay: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  fullscreenHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  fullscreenControlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fullscreenTitlePill: {
    flex: 1,
    height: 42,
    borderRadius: RADII.full,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fullscreenTitleText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    flex: 1,
  },
  fullscreenCountBadge: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: "#C8B27A",
    marginLeft: 8,
  },
  fullscreenChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  fullscreenBottomOverlay: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    zIndex: 50,
  },
});
