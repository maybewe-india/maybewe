import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADII, SHADOWS, FONTS } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import InputField from './ui/InputField';
import {
  CINEMATIC_DESTINATIONS,
  INDIAN_DISTRICTS_DATA,
  POPULAR_SEARCH_DESTINATIONS,
} from '../lib/cinematicDestinations';

export default function CinematicSearchModal({
  visible = false,
  initialQuery = '',
  onSelectDestination,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Sync search query when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery(initialQuery || '');
    }
  }, [visible, initialQuery]);

  // Combined suggestions matching cities, districts, states, and travel styles
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return CINEMATIC_DESTINATIONS;
    }
    const q = searchQuery.toLowerCase().trim();

    // 1. Matches in primary destinations
    const matchedPrimary = CINEMATIC_DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        (d.district && d.district.toLowerCase().includes(q)) ||
        d.styles.some((st) => st.toLowerCase().includes(q))
    );

    // 2. Matches in district dataset
    const matchedDistricts = INDIAN_DISTRICTS_DATA.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.district.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q)
    ).map((d) => ({
      id: `district-${d.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: d.name,
      state: d.state,
      region: d.region,
      district: d.district,
      dates: 'Oct – Nov',
      isDistrict: true,
    }));

    // Deduplicate by name
    const seenNames = new Set(matchedPrimary.map((d) => d.name.toLowerCase()));
    const additionalDistricts = matchedDistricts.filter(
      (d) => !seenNames.has(d.name.toLowerCase())
    );

    return [...matchedPrimary, ...additionalDistricts].slice(0, 15);
  }, [searchQuery]);

  const handleSelect = (destName) => {
    Keyboard.dismiss();
    onClose?.();
    onSelectDestination?.(destName);
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        {/* Top Floating Glass Search Container */}
        <View
          style={[
            styles.searchCard,
            {
              paddingTop: insets.top + 10,
              backgroundColor: isDark ? 'rgba(23, 24, 23, 0.96)' : 'rgba(251, 250, 247, 0.96)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(200, 178, 122, 0.45)',
            },
          ]}
        >
          {/* Top Bar with Input & Explicit Cancel Button */}
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <InputField
                placeholder="Search city or district (Goa, Guntur, Wayanad)..."
                icon="search-outline"
                value={searchQuery}
                onChangeText={setSearchQuery}
                rightActionIcon={searchQuery ? 'close-circle' : null}
                rightAction={searchQuery ? () => setSearchQuery('') : null}
                style={{ marginBottom: 0 }}
                onSubmitEditing={() => {
                  if (searchQuery.trim()) {
                    handleSelect(searchQuery.trim());
                  }
                }}
                returnKeyType="search"
              />
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={handleCancel}
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1EEE6',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(215, 210, 200, 0.7)',
                },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel search"
            >
              <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Trending Destinations & Districts Pills */}
          <View style={styles.quickHeaderRow}>
            <Ionicons name="trending-up" size={13} color="#C8B27A" />
            <Text style={[styles.quickHeaderText, { color: colors.textMuted }]}>
              POPULAR CITIES & DISTRICTS
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickChipsScroll}
          >
            {POPULAR_SEARCH_DESTINATIONS.map((dest) => (
              <TouchableOpacity
                key={dest}
                onPress={() => handleSelect(dest)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: isDark ? colors.border : '#D7D2C8',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={10} color="#C8B27A" style={{ marginRight: 5 }} />
                <Text style={[styles.quickChipText, { color: colors.textPrimary }]}>{dest}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Curated Suggestions & District Matches List */}
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {searchQuery.trim()
                ? `Matching Cities & Districts (${filteredSuggestions.length})`
                : 'Curated Regions'}
            </Text>

            <ScrollView
              style={styles.suggestionsScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((dest) => (
                  <TouchableOpacity
                    key={dest.id}
                    onPress={() => handleSelect(dest.name)}
                    style={[
                      styles.destItemRow,
                      {
                        borderBottomColor: isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(23, 24, 23, 0.06)',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.destPinIconBox}>
                      <Ionicons
                        name={dest.isDistrict ? 'map-outline' : 'location-sharp'}
                        size={16}
                        color="#C8B27A"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.destTitleRow}>
                        <Text style={[styles.destNameText, { color: colors.textPrimary }]}>
                          {dest.name}
                        </Text>
                        <Text style={[styles.destSeasonText, { color: colors.textMuted }]}>
                          {dest.dates}
                        </Text>
                      </View>
                      <Text
                        style={[styles.destSubtitleText, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {dest.region} • {dest.state}
                        {dest.district && dest.district !== dest.name ? ` (${dest.district})` : ''}
                      </Text>
                    </View>

                    <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyResultsBox}>
                  <Text style={[styles.emptyResultsText, { color: colors.textMuted }]}>
                    No destination or district found matching "{searchQuery}".
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSelect(searchQuery)}
                    style={styles.searchCustomBtn}
                  >
                    <Ionicons name="compass-outline" size={16} color="#0B131E" style={{ marginRight: 6 }} />
                    <Text style={styles.searchCustomBtnText}>Explore "{searchQuery}" on Map</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Dismiss Backdrop Touch Area */}
        <TouchableOpacity
          style={styles.backdropDismiss}
          onPress={handleCancel}
          activeOpacity={1}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 16, 0.72)',
    justifyContent: 'flex-start',
  },
  backdropDismiss: {
    flex: 1,
  },
  searchCard: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    ...SHADOWS.large,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cancelBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: RADII.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  quickHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    marginTop: 2,
  },
  quickHeaderText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  quickChipsScroll: {
    paddingVertical: 2,
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  quickChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  suggestionsContainer: {
    maxHeight: 280,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  suggestionsScroll: {
    maxHeight: 250,
  },
  destItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  destPinIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADII.md,
    backgroundColor: 'rgba(200, 178, 122, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  destNameText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  destSeasonText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '400',
  },
  destSubtitleText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  emptyResultsBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResultsText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6D5AF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  searchCustomBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#0B131E',
    fontWeight: '700',
  },
});
