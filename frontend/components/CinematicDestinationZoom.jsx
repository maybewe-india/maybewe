import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Platform,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RADII, SHADOWS, FONTS, PALETTE } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { SATELLITE_IMAGE, resolveDestination, getBundledImage } from '../lib/cinematicDestinations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Aspect ratio of the satellite map image is 2:3
const MAP_STAGE_WIDTH = 440;
const MAP_STAGE_HEIGHT = 660;

/**
 * CinematicDestinationZoom
 *
 * Provides a continuous, Google Earth-style geographic camera animation:
 * WORLD → REGION → COUNTRY → STATE/AREA → DESTINATION
 *
 * Destination marker remains anchored throughout the zoom.
 * Progressive geographic labels reveal during flight.
 * Settle into a luxury MaybeWe glass destination card.
 */
export default function CinematicDestinationZoom({
  destinationName = 'Goa',
  visible = false,
  onComplete,
  onClose,
  onSelectAnotherDestination,
}) {
  const { colors, isDark } = useTheme();

  // Resolve target destination profile
  const destination = useMemo(() => resolveDestination(destinationName), [destinationName]);

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [destination.id, destination.name]);

  // Robust photo source with synchronous resolution and local bundled fallback
  const photoSource = useMemo(() => {
    if (imageError) {
      return (
        getBundledImage(destination.id) ||
        getBundledImage(destination.name) ||
        getBundledImage('goa') ||
        SATELLITE_IMAGE
      );
    }
    return (
      destination.image ||
      getBundledImage(destination.id) ||
      getBundledImage(destination.name) ||
      getBundledImage('goa') ||
      SATELLITE_IMAGE
    );
  }, [destination.id, destination.name, destination.image, imageError]);

  // Main camera animation timeline (0 -> 1)
  const animProgress = useRef(new Animated.Value(0)).current;

  // Radar ping pulse loop
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Track previous coordinates for continuous fly-overs (e.g. Goa -> Kashmir)
  const prevCoordsRef = useRef({ x: 50, y: 50 });
  const currentCoords = destination.coords || { x: 33.0, y: 62.0 };

  const [currentBreadcrumbIndex, setCurrentBreadcrumbIndex] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);

  // Radar loop
  useEffect(() => {
    let loop = null;
    if (visible) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(radarAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    }
    return () => loop?.stop();
  }, [visible]);

  // Main cinematic camera flight sequence
  useEffect(() => {
    if (!visible) {
      animProgress.setValue(0);
      setPanelVisible(false);
      return;
    }

    setPanelVisible(false);
    animProgress.setValue(0);

    // Smooth, lightweight stepper with minimal mid-flight re-renders
    const id0 = setTimeout(() => setCurrentBreadcrumbIndex(0), 40);
    const id1 = setTimeout(() => setCurrentBreadcrumbIndex(2), 350);
    const id2 = setTimeout(() => {
      setCurrentBreadcrumbIndex(4);
      setPanelVisible(true);
    }, 950);

    // Eased camera flight: buttery-smooth 1.25s continuous zoom with zero lag
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1250,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start(() => {
      prevCoordsRef.current = currentCoords;
    });

    return () => {
      clearTimeout(id0);
      clearTimeout(id1);
      clearTimeout(id2);
    };
  }, [visible, destination.id]);

  if (!visible) return null;

  // Calculate translation offsets to anchor target (x%, y%) dead-center at max zoom
  // When scale = 1, center is (50, 50).
  // Target offset from center in pixels on the map stage:
  const targetOffsetX = ((50 - currentCoords.x) / 100) * MAP_STAGE_WIDTH;
  const targetOffsetY = ((50 - currentCoords.y) / 100) * MAP_STAGE_HEIGHT;

  // Camera scale: accelerates from continental view (1.0) into close destination view (9.5)
  const cameraScale = animProgress.interpolate({
    inputRange: [0, 0.25, 0.55, 0.85, 1],
    outputRange: [1.0, 1.6, 3.6, 8.8, 9.5],
  });

  // Camera translation: smoothly shifts map so destination is perfectly centered
  const cameraTranslateX = animProgress.interpolate({
    inputRange: [0, 0.2, 0.6, 1],
    outputRange: [0, targetOffsetX * 0.25, targetOffsetX * 0.85, targetOffsetX],
  });

  const cameraTranslateY = animProgress.interpolate({
    inputRange: [0, 0.2, 0.6, 1],
    outputRange: [0, targetOffsetY * 0.25, targetOffsetY * 0.85, targetOffsetY],
  });

  // Fast, smooth cross-dissolve into scenic destination layer as altitude approaches
  const scenicLayerOpacity = animProgress.interpolate({
    inputRange: [0, 0.2, 0.65, 1],
    outputRange: [0, 0.25, 0.85, 1],
  });

  // Smooth satellite layer: dissolves completely to 0 as camera settles into destination
  const satelliteOpacity = animProgress.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [1, 0.85, 0.25, 0],
  });

  // Destination Marker scale - counter-scaled against cameraScale (1.0 -> 9.5) so pin preserves an elegant physical ratio
  const markerScale = animProgress.interpolate({
    inputRange: [0, 0.25, 0.55, 0.85, 1],
    outputRange: [1.0, 0.65, 0.32, 0.16, 0.14],
  });

  // Radar ping ring
  const radarScale = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.8],
  });
  const radarOpacity = radarAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0],
  });

  // Destination glass panel entry
  const panelTranslateY = animProgress.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [240, 140, 0],
  });
  const panelOpacity = animProgress.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [0, 0.2, 1],
  });

  const activeBreadcrumb = destination.breadcrumbHierarchy[currentBreadcrumbIndex] || destination.breadcrumbHierarchy[0];

  return (
    <View style={styles.fullscreenOverlay}>
      {/* 1. Deep Midnight Space Background */}
      <View style={styles.deepSpaceCanvas}>
        <LinearGradient
          colors={['#070B10', '#0B131E', '#060A0F']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Subtle atmospheric radial lighting */}
        <View style={styles.atmosphericGlow} />
      </View>

      {/* 2. THE ZOOMING CONTINUOUS MAP STAGE */}
      <Animated.View
        style={[
          styles.mapStageContainer,
          { opacity: satelliteOpacity },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.animatedCameraRig,
            {
              transform: [
                { scale: cameraScale },
                { translateX: cameraTranslateX },
                { translateY: cameraTranslateY },
              ],
            },
          ]}
        >
          {/* Base SATELLITE MAP LAYER */}
          <Image
            source={SATELLITE_IMAGE}
            style={styles.satelliteImage}
            resizeMode="cover"
          />

          {/* Vignette border on the satellite globe */}
          <LinearGradient
            colors={['rgba(7, 11, 16, 0.4)', 'transparent', 'rgba(7, 11, 16, 0.6)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* 3. ANCHORED MAYBEWE DESTINATION MARKER */}
          <View
            style={[
              styles.markerAnchorWrapper,
              {
                top: `${currentCoords.y}%`,
                left: `${currentCoords.x}%`,
              },
            ]}
            pointerEvents="none"
          >
            {/* Concentric Pulsing Radar Rings */}
            <Animated.View
              style={[
                styles.radarPingCircle,
                {
                  transform: [{ scale: Animated.multiply(radarScale, markerScale) }],
                  opacity: radarOpacity,
                },
              ]}
            />

            {/* Core MaybeWe Champagne Luxury Pin */}
            <Animated.View
              style={[
                styles.coreMarkerContainer,
                { transform: [{ scale: markerScale }] },
              ]}
            >
              <View style={styles.markerHaloRing}>
                <View style={styles.markerInnerCore}>
                  <View style={styles.markerCenterDot} />
                </View>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* 2.5 Full-Bleed Destination Scenic Photography Layer - Dissolves smoothly over map */}
      <Animated.View
        style={[
          styles.scenicLayerContainer,
          { opacity: scenicLayerOpacity },
        ]}
        pointerEvents="none"
      >
        <Image
          source={photoSource}
          style={styles.scenicFullBleedImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
        {/* Soft luxury cinematic vignette overlay */}
        <LinearGradient
          colors={['rgba(7, 11, 16, 0.45)', 'rgba(7, 11, 16, 0.15)', 'rgba(7, 11, 16, 0.75)']}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </Animated.View>

      {/* 4. TOP HUD & PROGRESSIVE BREADCRUMBS */}
      <View style={styles.topHudContainer} pointerEvents="box-none">
        {/* Back / Cancel Button */}
        <TouchableOpacity
          onPress={() => onClose?.(destination.name)}
          style={styles.hudBackButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={18} color="#FBFAF7" />
          <Text style={styles.hudBackText}>Back</Text>
        </TouchableOpacity>

        {/* Center Live Breadcrumb Telemetry */}
        <View style={styles.hudTelemetryPill}>
          <View style={styles.hudTelemetryDot} />
          <Text style={styles.hudTelemetryLevel}>{activeBreadcrumb.level}</Text>
          <Text style={styles.hudTelemetryDivider}>•</Text>
          <Text style={styles.hudTelemetryLabel} numberOfLines={1}>
            {activeBreadcrumb.label}
          </Text>
        </View>

        {/* Quick Re-Search Icon */}
        <TouchableOpacity
          onPress={onSelectAnotherDestination}
          style={styles.hudSearchButton}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={16} color="#E6D5AF" />
        </TouchableOpacity>
      </View>

      {/* Progressive Breadcrumb Steps Indicator */}
      <View style={styles.breadcrumbBarContainer} pointerEvents="none">
        <View style={styles.breadcrumbBarInner}>
          {destination.breadcrumbHierarchy.map((crumb, idx) => {
            const isCompleted = idx <= currentBreadcrumbIndex;
            const isCurrent = idx === currentBreadcrumbIndex;
            return (
              <React.Fragment key={crumb.level}>
                <View style={[styles.crumbNode, isCompleted && styles.crumbNodeActive]}>
                  <Text
                    style={[
                      styles.crumbNodeText,
                      isCurrent && styles.crumbNodeTextCurrent,
                      isCompleted && styles.crumbNodeTextCompleted,
                    ]}
                  >
                    {crumb.label.split(' • ')[0]}
                  </Text>
                </View>
                {idx < destination.breadcrumbHierarchy.length - 1 && (
                  <Ionicons
                    name="chevron-forward"
                    size={10}
                    color={isCompleted ? '#C8B27A' : 'rgba(255, 255, 255, 0.25)'}
                    style={{ marginHorizontal: 2 }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* 5. LUXURY DESTINATION ARRIVAL GLASS PANEL */}
      <Animated.View
        style={[
          styles.arrivalCardContainer,
          {
            transform: [{ translateY: panelTranslateY }],
            opacity: panelOpacity,
          },
        ]}
      >
        <View style={styles.arrivalCardGlass}>
          {/* Header Row */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.regionBadgeRow}>
                <Ionicons name="location-sharp" size={13} color="#C8B27A" />
                <Text style={styles.regionBadgeText}>
                  {destination.state ? `${destination.state.toUpperCase()} • INDIA` : `${destination.region.toUpperCase()} • INDIA`}
                </Text>
              </View>
              <Text style={styles.destinationTitleText}>{destination.name}</Text>
            </View>

            <View style={styles.dateTagBox}>
              <Ionicons name="calendar-outline" size={12} color="#FBFAF7" style={{ marginRight: 4 }} />
              <Text style={styles.dateTagText}>{destination.dates}</Text>
            </View>
          </View>

          {/* Subtitle / Tagline */}
          <Text style={styles.taglineText} numberOfLines={2}>
            {destination.tagline}
          </Text>

          {/* Style Chips */}
          <View style={styles.styleChipsRow}>
            {destination.styles.map((st) => (
              <View key={st} style={styles.vibeChip}>
                <Text style={styles.vibeChipText}>{st}</Text>
              </View>
            ))}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => onComplete?.(destination.name)}
              style={styles.findPartnersButton}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#171817', '#252523']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.findPartnersGradient}
              >
                <Ionicons name="sparkles" size={16} color="#E6D5AF" style={{ marginRight: 8 }} />
                <Text style={styles.findPartnersText}>
                  Find Travel Partners in {destination.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSelectAnotherDestination}
              style={styles.exploreOtherButton}
              activeOpacity={0.7}
            >
              <Ionicons name="compass-outline" size={18} color="#C8B27A" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: '#070B10',
    overflow: 'hidden',
  },
  deepSpaceCanvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  atmosphericGlow: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    width: '70%',
    height: '50%',
    backgroundColor: 'rgba(200, 178, 122, 0.06)',
    borderRadius: 999,
  },
  mapStageContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenicLayerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  scenicFullBleedImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  animatedCameraRig: {
    width: MAP_STAGE_WIDTH,
    height: MAP_STAGE_HEIGHT,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADII.xl,
  },
  scenicLocalOverlay: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 178, 122, 0.55)',
    ...SHADOWS.large,
  },
  scenicLocalImage: {
    width: '100%',
    height: '100%',
  },
  markerAnchorWrapper: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPingCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E6D5AF',
    backgroundColor: 'rgba(200, 178, 122, 0.25)',
  },
  coreMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerHaloRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(230, 213, 175, 0.35)',
    borderWidth: 1.5,
    borderColor: '#C8B27A',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  markerInnerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FBFAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCenterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#171817',
  },
  topHudContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 28,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  hudBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 24, 23, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 4,
  },
  hudBackText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#FBFAF7',
    fontWeight: '500',
  },
  hudTelemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 24, 23, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.45)',
    gap: 6,
    maxWidth: '58%',
  },
  hudTelemetryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8B27A',
  },
  hudTelemetryLevel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#C8B27A',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  hudTelemetryDivider: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
  },
  hudTelemetryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#FBFAF7',
    fontWeight: '600',
    flexShrink: 1,
  },
  hudSearchButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(23, 24, 23, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbBarContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 104 : 76,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 90,
  },
  breadcrumbBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 19, 30, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  crumbNode: {
    paddingHorizontal: 4,
  },
  crumbNodeActive: {
    opacity: 1,
  },
  crumbNodeText: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  crumbNodeTextCurrent: {
    color: '#C8B27A',
    fontWeight: '800',
  },
  crumbNodeTextCompleted: {
    color: '#FBFAF7',
  },
  arrivalCardContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 92,
    left: 16,
    right: 16,
    zIndex: 110,
  },
  arrivalCardGlass: {
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    borderRadius: RADII.xxl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.65)',
    ...SHADOWS.large,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  regionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  regionBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#756345',
    letterSpacing: 1.2,
  },
  destinationTitleText: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: '#171817',
    letterSpacing: -0.5,
  },
  dateTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
  },
  dateTagText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FBFAF7',
    fontWeight: '700',
  },
  taglineText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#5C5B56',
    lineHeight: 16,
    marginBottom: 8,
  },
  styleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  vibeChip: {
    backgroundColor: '#F1EEE6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#D7D2C8',
  },
  vibeChipText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#171817',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  findPartnersButton: {
    flex: 1,
    height: 46,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  findPartnersGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.35)',
    borderRadius: RADII.xl,
  },
  findPartnersText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FBFAF7',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  exploreOtherButton: {
    width: 46,
    height: 46,
    borderRadius: RADII.xl,
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
