import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { PLACE_CATEGORIES, getPlaces, getTrendingPlaces, getHiddenGems, toggleSavePlace, isPlaceSaved } from '../lib/places';
import { formatINR } from '../lib/budget';
import GlassCard from './ui/GlassCard';
import FilterChip from './ui/FilterChip';
import SkeletonCard from './ui/SkeletonCard';
import EmptyState from './ui/EmptyState';

const { width: SCREEN_W } = Dimensions.get('window');

const BUDGET_TIERS = [
  { id: 'All', label: 'All Budgets' },
  { id: '500', label: 'Under ₹500' },
  { id: '1500', label: 'Under ₹1,500' },
  { id: '3500', label: 'Under ₹3,500' },
  { id: 'luxury', label: 'Luxury ₹5,000+' },
];

export default function PlaceDiscoveryView({
  searchDestination = '',
  onSelectPlace,
  onAddToTrip,
}) {
  const { colors, isDark } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBudgetTier, setSelectedBudgetTier] = useState('All');
  const [places, setPlaces] = useState([]);
  const [trendingPlaces, setTrendingPlaces] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedPlaceIds, setSavedPlaceIds] = useState(new Set());

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    let minBudget = null;
    let maxBudget = null;

    if (selectedBudgetTier === '500') maxBudget = 500;
    else if (selectedBudgetTier === '1500') maxBudget = 1500;
    else if (selectedBudgetTier === '3500') maxBudget = 3500;
    else if (selectedBudgetTier === 'luxury') minBudget = 3500;

    const data = await getPlaces({
      destination: searchDestination,
      category: selectedCategory === 'All' ? '' : selectedCategory,
      minBudget,
      maxBudget,
    });
    setPlaces(data);

    const trending = await getTrendingPlaces(searchDestination);
    setTrendingPlaces(trending);

    const gems = await getHiddenGems(searchDestination);
    setHiddenGems(gems);

    setLoading(false);
  }, [searchDestination, selectedCategory, selectedBudgetTier]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handleToggleSave = async (placeId) => {
    const isSaved = await toggleSavePlace(placeId);
    setSavedPlaceIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.add(placeId);
      else next.delete(placeId);
      return next;
    });
  };

  return (
    <View style={styles.root}>
      {/* 1. Category Filter Carousel (All 13 categories) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        <FilterChip
          label="All Categories"
          size="small"
          selected={selectedCategory === 'All'}
          onPress={() => setSelectedCategory('All')}
        />
        {PLACE_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat.id}
            label={cat.name}
            size="small"
            selected={selectedCategory === cat.name}
            onPress={() => setSelectedCategory(cat.name)}
          />
        ))}
      </ScrollView>

      {/* 2. Budget Intelligence Quick Tiers */}
      <View style={styles.budgetRow}>
        <Ionicons name="wallet-outline" size={14} color="#B99A5E" style={{ marginRight: 6 }} />
        <Text style={[styles.budgetLabel, { color: colors.textSecondary }]}>BUDGET:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.budgetScroll}>
          {BUDGET_TIERS.map((tier) => {
            const isSelected = selectedBudgetTier === tier.id;
            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.budgetChip,
                  {
                    backgroundColor: isSelected ? '#171817' : isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7',
                    borderColor: isSelected ? '#B99A5E' : colors.border,
                  },
                ]}
                onPress={() => setSelectedBudgetTier(tier.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.budgetChipText, { color: isSelected ? '#FBFAF7' : colors.textPrimary }]}>
                  {tier.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard height={240} />
          <SkeletonCard height={240} />
        </View>
      ) : (
        <>
          {/* 3. Section: Trending Now */}
          {trendingPlaces.length > 0 && selectedCategory === 'All' && selectedBudgetTier === 'All' && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionEyebrow}>CURATED SPOTLIGHT</Text>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Trending Now in India</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardScroll}>
                {trendingPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={[styles.trendingCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => onSelectPlace(place)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: place.image_url }} style={styles.trendingCardImage} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(23, 24, 23, 0.45)', 'rgba(23, 24, 23, 0.90)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardFloatingBadges}>
                      <View style={styles.destBadge}>
                        <Text style={styles.destBadgeText}>{place.destination?.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.favCircle, { backgroundColor: savedPlaceIds.has(place.id) ? '#B99A5E' : 'rgba(23, 24, 23, 0.65)' }]}
                        onPress={() => handleToggleSave(place.id)}
                      >
                        <Ionicons
                          name={savedPlaceIds.has(place.id) ? 'bookmark' : 'bookmark-outline'}
                          size={14}
                          color={savedPlaceIds.has(place.id) ? '#171817' : '#FBFAF7'}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardContentOverlay}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{place.name}</Text>
                      <View style={styles.cardMetaRow}>
                        <Text style={styles.cardRating}>⭐ {place.rating?.toFixed(1)}</Text>
                        <Text style={styles.cardCost}>{formatINR(place.min_price)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 4. Section: Hidden Gems */}
          {hiddenGems.length > 0 && selectedCategory === 'All' && selectedBudgetTier === 'All' && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionEyebrow}>UNTOUCHED SANCTUARIES</Text>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Hidden Gems</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardScroll}>
                {hiddenGems.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={[styles.gemCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => onSelectPlace(place)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: place.image_url }} style={styles.gemCardImage} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(23, 24, 23, 0.45)', 'rgba(23, 24, 23, 0.90)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardFloatingBadges}>
                      <View style={[styles.destBadge, { backgroundColor: 'rgba(51, 70, 60, 0.75)' }]}>
                        <Text style={[styles.destBadgeText, { color: '#DCE5DF' }]}>{place.category}</Text>
                      </View>
                    </View>
                    <View style={styles.cardContentOverlay}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{place.name}</Text>
                      <Text style={styles.cardLocationText} numberOfLines={1}>{place.destination}, {place.state}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 5. Main Feed: All / Filtered Places */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionEyebrow}>EXPLORE DESTINATIONS</Text>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  {searchDestination ? `Spots in ${searchDestination}` : 'All Places & Experiences'}
                </Text>
                <Text style={[styles.feedCountSub, { color: colors.textSecondary }]}>
                  {places.length} spot{places.length === 1 ? '' : 's'} matching criteria
                </Text>
              </View>
            </View>

            {places.length > 0 ? (
              <View style={styles.placesList}>
                {places.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={[styles.fullPlaceCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}
                    onPress={() => onSelectPlace(place)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: place.image_url }} style={styles.fullPlaceImage} resizeMode="cover" />
                    <View style={styles.fullPlaceBody}>
                      <View style={styles.fullPlaceTopRow}>
                        <View style={styles.fullPlaceBadge}>
                          <Text style={styles.fullPlaceBadgeText}>{place.category}</Text>
                        </View>
                        <Text style={styles.fullPlaceRating}>⭐ {place.rating?.toFixed(1)}</Text>
                      </View>

                      <Text style={[styles.fullPlaceTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text style={[styles.fullPlaceLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                        {place.destination}, {place.state}
                      </Text>

                      <View style={styles.fullPlaceBottomRow}>
                        <View>
                          <Text style={styles.fullPlaceCostLabel}>ESTIMATED TARIFF</Text>
                          <Text style={styles.fullPlaceCostValue}>
                            {place.min_price === 0 && place.max_price === 0 ? 'Free Entry' : `${formatINR(place.min_price)} – ${formatINR(place.max_price)}`}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.addTripQuickBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (onAddToTrip) onAddToTrip(place);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="calendar-outline" size={13} color="#FBFAF7" style={{ marginRight: 4 }} />
                          <Text style={styles.addTripQuickBtnText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="compass-outline"
                title="No spots found"
                subtitle="Try loosening your budget tier or clearing the selected category."
                actionLabel="Reset Filters"
                onAction={() => {
                  setSelectedCategory('All');
                  setSelectedBudgetTier('All');
                }}
              />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 20,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  budgetLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    marginRight: 8,
  },
  budgetScroll: {
    gap: 6,
  },
  budgetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  budgetChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
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
    fontSize: 20,
    fontWeight: '800',
  },
  feedCountSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  horizontalCardScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  trendingCard: {
    width: 220,
    height: 280,
    borderRadius: RADII.lg,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    borderWidth: 1,
  },
  trendingCardImage: {
    width: '100%',
    height: '100%',
  },
  cardFloatingBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  destBadge: {
    backgroundColor: 'rgba(23, 24, 23, 0.70)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.full,
  },
  destBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FBFAF7',
    letterSpacing: 1,
  },
  favCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContentOverlay: {
    padding: 14,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#FBFAF7',
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRating: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FBFAF7',
  },
  cardCost: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#B99A5E',
  },
  gemCard: {
    width: 170,
    height: 220,
    borderRadius: RADII.lg,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    borderWidth: 1,
  },
  gemCardImage: {
    width: '100%',
    height: '100%',
  },
  cardLocationText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#D7D2C8',
  },
  placesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  fullPlaceCard: {
    flexDirection: 'row',
    borderRadius: RADII.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  fullPlaceImage: {
    width: 120,
    height: '100%',
    minHeight: 120,
  },
  fullPlaceBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  fullPlaceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fullPlaceBadge: {
    backgroundColor: 'rgba(230, 213, 175, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
  fullPlaceBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#171817',
  },
  fullPlaceRating: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  fullPlaceTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  fullPlaceLocation: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  fullPlaceBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  fullPlaceCostLabel: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: '#77766F',
    letterSpacing: 1,
  },
  fullPlaceCostValue: {
    fontFamily: FONTS.extraBold,
    fontSize: 13,
    fontWeight: '800',
    color: '#171817',
    marginTop: 1,
  },
  addTripQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  addTripQuickBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FBFAF7',
  },
});
