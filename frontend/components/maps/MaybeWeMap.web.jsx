// ============================================================================
// MaybeWeMap — Provider-Abstracted Interactive Map Component (Web)
// Renders real MapLibre GL vector tiles natively via iframe/DOM WebGL container.
// Zero Mapbox / Zero Google Keys. OpenFreeMap & OpenStreetMap cartography.
// ============================================================================

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
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
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Handle container resizing to trigger map.resize() on Web
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ type: 'RESIZE' }),
          '*'
        );
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);



  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ type: 'RESIZE' }),
          '*'
        );
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Use Blob URL or Data URI instead of srcDoc to allow MapLibre Web Worker communication in Chromium
  const iframeSrc = useMemo(() => {
    if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        const blob = new Blob([mapHtml], { type: 'text/html;charset=utf-8' });
        return URL.createObjectURL(blob);
      } catch (e) {}
    }
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(mapHtml);
  }, [mapHtml]);

  // Sync mode changes (street, dark, satellite) into iframe without remount
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'SET_MAP_MODE',
          mode,
        }),
        '*'
      );
    }
  }, [mode]);

  // Sync camera position on searched coordinates (FLY_TO)
  useEffect(() => {
    if (
      iframeRef.current &&
      iframeRef.current.contentWindow &&
      targetCoords &&
      typeof targetCoords.latitude === 'number' &&
      typeof targetCoords.longitude === 'number'
    ) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'FLY_TO',
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          zoom: targetCoords.zoom || 15,
        }),
        '*'
      );
    }
  }, [targetCoords?.latitude, targetCoords?.longitude, targetCoords?.zoom]);

  // Handle messages dispatched from MapLibre markers & controls
  useEffect(() => {
    const handleWindowMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || !data.type) return;

        if (data.type === 'SELECT_PLACE' && data.placeId) {
          const match = places.find((p) => p.place_id === data.placeId);
          if (match && onSelectPlace) {
            onSelectPlace(match);
          }
        } else if (data.type === 'MAP_MOVED') {
          if (onMapMove) {
            onMapMove({
              latitude: data.latitude,
              longitude: data.longitude,
              zoom: data.zoom,
            });
          }
        } else if (data.type === 'MAP_LOADED' || data.type === 'STYLE_LOADED') {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'RESIZE' }), '*');
          }
          if (onMapLoaded) {
            onMapLoaded(data);
          }
        } else if (data.type === 'REQUEST_GPS') {
          if (onRetryLocation) {
            onRetryLocation();
          }
        }
      } catch (err) {
        // Ignore non-json messages
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [places, onSelectPlace, onMapMove, onMapLoaded, onRetryLocation]);

  // Sync places updates into the iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
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
        }),
        '*'
      );
    }
  }, [places, fitBoundsOnChange]);

  // Sync selected place highlight
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow && selectedPlace?.place_id) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'SELECT_PLACE',
          placeId: selectedPlace.place_id,
        }),
        '*'
      );
    }
  }, [selectedPlace?.place_id]);

  // Sync route updates into iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify(
          routeGeoJson
            ? { type: 'SET_ROUTE', route: routeGeoJson }
            : { type: 'CLEAR_ROUTE' }
        ),
        '*'
      );
    }
  }, [routeGeoJson]);

  // Responsive Resize Observer: Invalidate map size on layout/container dimension changes
  useEffect(() => {
    const notifyResize = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: "RESIZE" }), "*");
      }
    };

    let ro = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        notifyResize();
      });
      ro.observe(containerRef.current);
    }

    const t1 = setTimeout(notifyResize, 80);
    const t2 = setTimeout(notifyResize, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
    };
  }, [isFullscreen]);

  // If GPS is explicitly denied and user coordinates are strictly required for a non-search context
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
    <View ref={containerRef} style={[styles.container, style, { backgroundColor: '#FAF8F5' }, isFullscreen && { minHeight: '100vh' }]}>
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
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#FAF8F5',
          display: 'block',
        }}
        title="MaybeWe MapLibre Map"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FAF8F5',
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
