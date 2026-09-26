import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RADII, SHADOWS, FONTS, PALETTE } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { INDIA_STATES_DATA } from '../data/indiaDestinations';

// Sourced photorealistic orbital night satellite perspective of India
const REALISTIC_SATELLITE_MAP = require('../assets/images/india_realistic_satellite.png');

const REGION_FILTERS = ['All', 'North', 'South', 'West', 'East', 'Central', 'North-East', 'UTs'];

// Calibrated 2:3 orbital satellite perspective coordinates for all 36 States & UTs
const STATE_HOTSPOTS = {
  'Andhra Pradesh': { top: '64.5%', left: '50.5%', code: 'AP' },
  'Telangana': { top: '58.0%', left: '46.5%', code: 'TG' },
  'Tamil Nadu': { top: '73.0%', left: '47.5%', code: 'TN' },
  'Karnataka': { top: '65.5%', left: '40.5%', code: 'KA' },
  'Kerala': { top: '75.5%', left: '39.5%', code: 'KL' },
  'Maharashtra': { top: '51.5%', left: '36.0%', code: 'MH' },
  'Goa': { top: '62.0%', left: '33.0%', code: 'GA' },
  'Gujarat': { top: '43.0%', left: '23.0%', code: 'GJ' },
  'Rajasthan': { top: '34.0%', left: '30.0%', code: 'RJ' },
  'Madhya Pradesh': { top: '44.0%', left: '44.0%', code: 'MP' },
  'Delhi (NCT)': { top: '29.0%', left: '43.0%', code: 'DL' },
  'Punjab': { top: '25.0%', left: '39.0%', code: 'PB' },
  'Haryana': { top: '28.0%', left: '41.0%', code: 'HR' },
  'Himachal Pradesh': { top: '22.0%', left: '44.0%', code: 'HP' },
  'Uttarakhand': { top: '25.0%', left: '49.0%', code: 'UK' },
  'Jammu & Kashmir': { top: '18.0%', left: '38.0%', code: 'JK' },
  'Ladakh': { top: '15.0%', left: '43.0%', code: 'LA' },
  'Uttar Pradesh': { top: '33.0%', left: '53.0%', code: 'UP' },
  'Bihar': { top: '36.5%', left: '63.0%', code: 'BR' },
  'Jharkhand': { top: '41.5%', left: '61.0%', code: 'JH' },
  'West Bengal': { top: '43.0%', left: '68.0%', code: 'WB' },
  'Odisha': { top: '50.0%', left: '62.0%', code: 'OD' },
  'Chhattisgarh': { top: '48.0%', left: '53.0%', code: 'CG' },
  'Assam': { top: '37.0%', left: '81.0%', code: 'AS' },
  'Sikkim': { top: '32.0%', left: '68.0%', code: 'SK' },
  'Meghalaya': { top: '39.0%', left: '78.0%', code: 'ML' },
  'Arunachal Pradesh': { top: '30.0%', left: '85.0%', code: 'AR' },
  'Nagaland': { top: '37.0%', left: '87.0%', code: 'NL' },
  'Manipur': { top: '42.0%', left: '86.0%', code: 'MN' },
  'Mizoram': { top: '46.0%', left: '83.0%', code: 'MZ' },
  'Tripura': { top: '44.0%', left: '79.0%', code: 'TR' },
  'Andaman & Nicobar Islands': { top: '78.0%', left: '88.0%', code: 'AN' },
  'Chandigarh': { top: '26.0%', left: '42.0%', code: 'CH' },
  'Puducherry': { top: '71.0%', left: '51.0%', code: 'PY' },
  'Lakshadweep': { top: '74.0%', left: '28.0%', code: 'LD' },
  'Dadra & Nagar Haveli and Daman & Diu': { top: '48.0%', left: '30.0%', code: 'DD' },
};

export default function IndiaTravelMap({
  selectedState = 'Andhra Pradesh',
  onSelectState,
  userState = null,
}) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [activeRegionFilter, setActiveRegionFilter] = useState('All');

  // Match selected state details
  const selectedStateData = useMemo(() => {
    return (
      INDIA_STATES_DATA.find(
        (s) => s.name.toLowerCase() === selectedState.toLowerCase()
      ) || INDIA_STATES_DATA[0] // Default to Andhra Pradesh
    );
  }, [selectedState]);

  // Filtered list of states for horizontal chip picker and hotspot overlay
  const filteredStates = useMemo(() => {
    if (activeRegionFilter === 'All') return INDIA_STATES_DATA;
    if (activeRegionFilter === 'UTs') return INDIA_STATES_DATA.filter((s) => s.type === 'Union Territory');
    return INDIA_STATES_DATA.filter((s) => s.region === activeRegionFilter);
  }, [activeRegionFilter]);

  const isUserInSelectedState =
    userState && userState.toLowerCase().includes(selectedState.toLowerCase());

  const handleStateClick = (stateName) => {
    if (onSelectState) {
      onSelectState(stateName);
    }
  };

  const handleExploreStateDestinations = () => {
    router.push({
      pathname: '/(tabs)/discovery',
      params: { destination: selectedStateData.name, openZoom: 'true', t: Date.now().toString() },
    });
  };

  const selectedHotspot = STATE_HOTSPOTS[selectedStateData.name] || { top: '64.5%', left: '50.5%' };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, SHADOWS.card]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Ionicons name="map" size={18} color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>India Travel Map</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Satellite Orbit • All 28 States & 8 Union Territories
          </Text>
        </View>

        {isUserInSelectedState ? (
          <View style={[styles.liveBadge, { backgroundColor: 'rgba(200, 178, 122, 0.16)', borderColor: 'rgba(200, 178, 122, 0.45)' }]}>
            <View style={[styles.liveDot, { backgroundColor: '#C8B27A' }]} />
            <Text style={[styles.liveBadgeText, { color: '#756345' }]}>Present Base</Text>
          </View>
        ) : (
          <View style={[styles.liveBadge, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
            <Ionicons name="compass-outline" size={11} color={colors.primary} />
            <Text style={[styles.liveBadgeText, { color: colors.primary }]}>{selectedStateData.region}</Text>
          </View>
        )}
      </View>

      {/* Region Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.regionFilterScroll}
      >
        {REGION_FILTERS.map((reg) => {
          const isActive = activeRegionFilter === reg;
          return (
            <TouchableOpacity
              key={reg}
              onPress={() => setActiveRegionFilter(reg)}
              {...(Platform.OS === 'web' ? { onClick: () => setActiveRegionFilter(reg) } : {})}
              activeOpacity={0.7}
              style={[
                styles.regionChip,
                {
                  backgroundColor: isActive ? PALETTE.nearBlack : PALETTE.white,
                  borderColor: isActive ? PALETTE.nearBlack : PALETTE.borderGrey,
                },
              ]}
            >
              <Text
                style={[
                  styles.regionChipText,
                  {
                    color: isActive ? PALETTE.white : PALETTE.mediumGrey,
                    fontWeight: isActive ? '700' : '600',
                  },
                ]}
              >
                {reg}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ============================================================ */}
      {/* REALISTIC SATELLITE ORBIT PERSPECTIVE MAP STAGE               */}
      {/* ============================================================ */}
      <View style={[styles.satelliteMapWrapper, SHADOWS.large]}>
        <ImageBackground
          source={REALISTIC_SATELLITE_MAP}
          style={styles.satelliteImageBg}
          imageStyle={styles.satelliteImageStyle}
          resizeMode="cover"
        >
          {/* Subtle atmospheric vignette gradient */}
          <LinearGradient
            colors={['rgba(3, 10, 16, 0.65)', 'transparent', 'transparent', 'rgba(3, 10, 16, 0.85)']}
            locations={[0, 0.15, 0.82, 1]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Top Orbit Telemetry Tag */}
          <View style={styles.mapTelemetryBar}>
            <View style={styles.telemetryTag}>
              <Ionicons name="planet" size={12} color="#FFD0A6" />
              <Text style={styles.telemetryText}>SATELLITE NIGHT VIEW</Text>
            </View>
            <View style={styles.telemetryTagSecondary}>
              <Text style={styles.telemetrySubText}>Earth at Night • 4K Orbit</Text>
            </View>
          </View>

          {/* Ocean Reference Watermarks */}
          <View style={styles.oceanWatermarkWest} pointerEvents="none">
            <Text style={styles.oceanWatermarkText}>ARABIAN SEA</Text>
          </View>
          <View style={styles.oceanWatermarkEast} pointerEvents="none">
            <Text style={styles.oceanWatermarkText}>BAY OF BENGAL</Text>
          </View>
          <View style={styles.oceanWatermarkSouth} pointerEvents="none">
            <Text style={styles.oceanWatermarkText}>INDIAN OCEAN</Text>
          </View>

          {/* Interactive State Hotspots Overlay */}
          {filteredStates.map((stateItem) => {
            const coords = STATE_HOTSPOTS[stateItem.name];
            if (!coords) return null;

            const isSelected = stateItem.name.toLowerCase() === selectedState.toLowerCase();
            const isUserLoc = userState && userState.toLowerCase().includes(stateItem.name.toLowerCase());

            if (isSelected) {
              // Active Selected State Beacon & Callout Tooltip
              return (
                <View
                  key={`selected-${stateItem.id}`}
                  style={[
                    styles.selectedBeaconContainer,
                    { top: coords.top, left: coords.left },
                  ]}
                  pointerEvents="box-none"
                >
                  {/* Floating Glass Tooltip */}
                  <View style={styles.beaconTooltip}>
                    <Ionicons name="location-sharp" size={11} color="#C8B27A" />
                    <Text style={styles.beaconTooltipTitle} numberOfLines={1}>
                      {stateItem.name}
                    </Text>
                    <View style={styles.beaconTooltipBadge}>
                      <Text style={styles.beaconTooltipBadgeText}>{coords.code}</Text>
                    </View>
                  </View>

                  {/* Pulsing Champagne Radar Rings */}
                  <View style={styles.pulsingRadarOuter} />
                  <View style={styles.pulsingRadarInner} />

                  {/* Pin Symbol */}
                  <View style={styles.pinSymbolCenter}>
                    <Ionicons name="location-sharp" size={20} color="#C8B27A" />
                  </View>
                </View>
              );
            }

            // Inactive but interactive state hotspot dot
            return (
              <TouchableOpacity
                key={`hotspot-${stateItem.id}`}
                onPress={() => handleStateClick(stateItem.name)}
                {...(Platform.OS === 'web' ? { onClick: () => handleStateClick(stateItem.name) } : {})}
                activeOpacity={0.7}
                style={[
                  styles.hotspotTouchTarget,
                  { top: coords.top, left: coords.left },
                ]}
                accessibilityLabel={`Select ${stateItem.name}`}
              >
                <View
                  style={[
                    styles.hotspotDot,
                    isUserLoc
                      ? styles.hotspotDotUserLoc
                      : { backgroundColor: 'rgba(255, 255, 255, 0.75)', borderColor: '#FFB39A' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ImageBackground>
      </View>

      {/* Selected State Highlight Banner */}
      <View style={[styles.selectedBanner, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
        <View style={styles.selectedBannerTop}>
          <View style={styles.selectedBannerNameWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ionicons name="location-sharp" size={16} color="#FF5A5F" />
              <Text style={[styles.selectedStateName, { color: colors.textPrimary }]}>
                {selectedStateData.name}
              </Text>
              {isUserInSelectedState && (
                <View style={styles.presentBaseBadge}>
                  <Text style={styles.presentBaseBadgeText}>📍 Present Base</Text>
                </View>
              )}
            </View>
            <View style={styles.stateMetaRow}>
              <View style={[styles.metaPill, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]}>
                <Text style={[styles.metaPillText, { color: colors.primary }]}>{selectedStateData.type}</Text>
              </View>
              <Text style={[styles.metaCapitalText, { color: colors.textMuted }]}>
                Capital: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{selectedStateData.capital}</Text>
              </Text>
            </View>
          </View>

          <View style={[styles.regionTagWrap, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.regionTagText, { color: colors.textSecondary }]}>
              {selectedStateData.region} Region
            </Text>
          </View>
        </View>

        <Text style={[styles.selectedStateDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {selectedStateData.description}
        </Text>

        {/* Action Button: Explore Destinations in this state */}
        <TouchableOpacity
          onPress={handleExploreStateDestinations}
          {...(Platform.OS === 'web' ? { onClick: handleExploreStateDestinations } : {})}
          style={[styles.exploreStateBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.exploreStateBtnText, { color: colors.primary }]}>
            Explore {selectedStateData.name} Destinations
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* State Quick-Picker (All 36 States & UTs in view) */}
      <View style={styles.pickerHeaderRow}>
        <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
          Select from {filteredStates.length} {activeRegionFilter === 'All' ? 'States & UTs' : 'Territories'}:
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stateChipsScroll}
      >
        {filteredStates.map((stateItem) => {
          const isSelected = stateItem.name.toLowerCase() === selectedState.toLowerCase();
          const isUserLoc = userState && userState.toLowerCase().includes(stateItem.name.toLowerCase());

          return (
            <TouchableOpacity
              key={stateItem.id}
              onPress={() => handleStateClick(stateItem.name)}
              {...(Platform.OS === 'web' ? { onClick: () => handleStateClick(stateItem.name) } : {})}
              activeOpacity={0.75}
              style={[
                styles.stateChip,
                {
                  backgroundColor: isSelected
                    ? PALETTE.nearBlack
                    : isUserLoc
                    ? PALETTE.softIvory
                    : PALETTE.white,
                  borderColor: isSelected
                    ? PALETTE.nearBlack
                    : PALETTE.borderGrey,
                },
              ]}
            >
              {isUserLoc && (
                <View
                  style={[
                    styles.userLocIndicatorDot,
                    { backgroundColor: isSelected ? PALETTE.white : PALETTE.nearBlack },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.stateChipText,
                  {
                    color: isSelected
                      ? PALETTE.white
                      : PALETTE.nearBlack,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {stateItem.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADII.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: 36,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  regionFilterScroll: {
    paddingVertical: 4,
    gap: 8,
    marginBottom: 12,
  },
  regionChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  regionChipText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },

  // Realistic Satellite Perspective Map Styles
  satelliteMapWrapper: {
    width: '100%',
    height: 440,
    borderRadius: RADII['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#030A10',
    marginVertical: 4,
    position: 'relative',
  },
  satelliteImageBg: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  satelliteImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapTelemetryBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
  },
  telemetryText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#0F172A',
    fontWeight: '700',
  },
  telemetryTagSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
  },
  telemetrySubText: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: '#475569',
  },

  // Ocean Watermarks
  oceanWatermarkWest: {
    position: 'absolute',
    bottom: '26%',
    left: 14,
    zIndex: 2,
    transform: [{ rotate: '-90deg' }],
  },
  oceanWatermarkEast: {
    position: 'absolute',
    bottom: '36%',
    right: 14,
    zIndex: 2,
    transform: [{ rotate: '90deg' }],
  },
  oceanWatermarkSouth: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    zIndex: 2,
  },
  oceanWatermarkText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 2.0,
    color: 'rgba(255, 255, 255, 0.35)',
    textTransform: 'uppercase',
  },

  // State Hotspot Overlays
  hotspotTouchTarget: {
    position: 'absolute',
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  hotspotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  hotspotDotUserLoc: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Selected State Active Beacon
  selectedBeaconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    marginLeft: -40,
    marginTop: -42,
    width: 80,
    height: 80,
  },
  beaconTooltip: {
    position: 'absolute',
    top: -24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(250, 248, 243, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.8)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: RADII.full,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 20px -2px rgba(29, 29, 27, 0.18)',
      },
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  beaconTooltipTitle: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#171715',
    fontWeight: '700',
    maxWidth: 110,
  },
  beaconTooltipBadge: {
    backgroundColor: 'rgba(200, 178, 122, 0.22)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADII.xs,
  },
  beaconTooltipBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: '#756345',
  },
  pulsingRadarOuter: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(200, 178, 122, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.45)',
  },
  pulsingRadarInner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(229, 215, 181, 0.40)',
  },
  pinSymbolCenter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Selected State Detail Banner
  selectedBanner: {
    borderRadius: RADII.xl,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 14,
  },
  selectedBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  selectedBannerNameWrap: {
    flex: 1,
    marginRight: 10,
  },
  selectedStateName: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  presentBaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(200, 178, 122, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.45)',
  },
  presentBaseBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#756345',
  },
  stateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADII.sm,
  },
  metaPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
  },
  metaCapitalText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
  regionTagWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  regionTagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    fontWeight: '600',
  },
  selectedStateDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  exploreStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADII.xl,
    borderWidth: 1,
  },
  exploreStateBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },

  // State Chips Scroll
  pickerHeaderRow: {
    marginTop: 14,
    marginBottom: 8,
  },
  pickerLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  stateChipsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  userLocIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
});
