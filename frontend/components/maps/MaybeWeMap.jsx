// ============================================================================
// MaybeWeMap — Provider-Abstracted Interactive Map Component (Native Android/iOS)
// Renders real MapLibre GL vector & raster tiles via hardware-accelerated WebView.
// Zero Mapbox / Zero Google Keys. OpenFreeMap & OpenStreetMap cartography.
// ============================================================================

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/themeContext';
import { COLORS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import { buildMapLibreHtml } from './mapHtmlBuilder';
import { getMapStyle, MAP_MODES } from '../../lib/maps/tileProviders';

export default function MaybeWeMap({
  userCoords = null,
  places = [],
  selectedPlace = null,
  onSelectPlace,
  gpsStatus = 'idle',
  onRetryLocation,
  requireGps = false,
  provider = 'maplibre',
  style,
  initialZoom = 14,
  mode = MAP_MODES.STREET,
  routeGeoJson = null,
  customStyleUrl = null,
  targetCoords = null,
  isFullscreen = false,
  onToggleFullscreen,
  onMapMove = null,
  onMapLoaded = null,
  fitBoundsOnChange = false,
}) {
  const { colors, isDark } = useTheme();
  const webViewRef = useRef(null);

  // Dynamic vector style URL from open tile provider abstraction
  const styleUrl = useMemo(() => {
    return getMapStyle({ mode, isDark, customStyleUrl });
  }, [mode, isDark, customStyleUrl]);

  // Generate self-contained HTML payload
  // Generate self-contained HTML payload once on mount to keep iframe persistent
  const mapHtml = useMemo(() => {
    return buildMapLibreHtml({
      userCoords,
      places,
      selectedPlaceId: selectedPlace?.place_id,
      initialZoom,
      mode,
      styleUrl,
      routeGeoJson,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mode changes (street, dark, satellite) into WebView without remount
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'SET_MAP_MODE',
          mode,
        })
      );
    }
  }, [mode]);

  // Sync camera position on searched coordinates (FLY_TO)
  useEffect(() => {
    if (
      webViewRef.current &&
      targetCoords &&
      typeof targetCoords.latitude === 'number' &&
      typeof targetCoords.longitude === 'number'
    ) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'FLY_TO',
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          zoom: targetCoords.zoom || 15,
        })
      );
    }
  }, [targetCoords?.latitude, targetCoords?.longitude, targetCoords?.zoom]);

  // Handle messages dispatched from MapLibre markers & controls
  const handleWebViewMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === 'SELECT_PLACE' && data.placeId) {
          const match = places.find((p) => p.place_id === data.placeId);
          if (match && onSelectPlace) {
            onSelectPlace(match);
          }
        } else if (data?.type === 'MAP_MOVED') {
          if (onMapMove) {
            onMapMove({
              latitude: data.latitude,
              longitude: data.longitude,
              zoom: data.zoom,
            });
          }
        } else if (data?.type === 'MAP_LOADED' || data?.type === 'STYLE_LOADED') {
          if (onMapLoaded) {
            onMapLoaded(data);
          }
        } else if (data?.type === 'REQUEST_GPS') {
          if (onRetryLocation) {
            onRetryLocation();
          }
        }
      } catch (err) {
        // Ignore non-json messages
      }
    },
    [places, onSelectPlace, onMapMove, onMapLoaded, onRetryLocation]
  );

  // Sync places updates into the WebView
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_PLACES',
          places: places.map((p) => ({
            place_id: p.place_id,
            name: p.name,
            category: p.category,
            category_id: p.category_id,
            latitude: p.latitude,
            longitude: p.longitude,
          })),
          fitBounds: fitBoundsOnChange,
        })
      );
    }
  }, [places, fitBoundsOnChange]);

  // Sync selected place highlight
  useEffect(() => {
    if (webViewRef.current && selectedPlace?.place_id) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'SELECT_PLACE',
          placeId: selectedPlace.place_id,
        })
      );
    }
  }, [selectedPlace?.place_id]);

  // Sync route updates into WebView
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify(
          routeGeoJson
            ? { type: 'SET_ROUTE', route: routeGeoJson }
            : { type: 'CLEAR_ROUTE' }
        ),
        '*'
      );
    }
  }, [routeGeoJson]);

  // If GPS is explicitly denied
  if (requireGps && gpsStatus === 'denied' && !userCoords) {
    return (
      <View
        style={[
          styles.container,
          styles.emptyContainer,
          style,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <View style={styles.deniedIconWrap}>
          <Ionicons name="location-outline" size={36} color="#C84C4C" />
        </View>
        <Text style={[styles.deniedTitle, { color: colors.textPrimary }]}>
          Device Location Required
        </Text>
        <Text style={[styles.deniedSubtext, { color: colors.textSecondary }]}>
          MaybeWe maps stream real vector tiles and nearby spots around your authoritative GPS position. We never guess your city or use IP fallbacks.
        </Text>
        {onRetryLocation && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetryLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate" size={16} color="#141514" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Enable Device GPS</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style, { backgroundColor: '#121312' }]}>
      {onToggleFullscreen && (
        <TouchableOpacity
          style={[
            styles.fullscreenBtn,
            { backgroundColor: isDark ? 'rgba(23, 24, 23, 0.85)' : 'rgba(255, 255, 255, 0.92)' },
          ]}
          onPress={onToggleFullscreen}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isFullscreen ? 'Exit full screen' : 'Full screen map'}
        >
          <Ionicons name={isFullscreen ? 'contract' : 'expand'} size={17} color="#C8B27A" />
        </TouchableOpacity>
      )}
      <WebView
        ref={webViewRef}
        androidHardwareAccelerationDisabled={false}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#C8B27A" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#121312',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121312',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
  },
  deniedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(200, 76, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deniedTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  deniedSubtext: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
    marginBottom: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8B27A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#141514',
  },
  fullscreenBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
