import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import {
  loadTripItinerary,
  saveTripItinerary,
  analyzeDaySchedule,
  suggestEmptyDayPlaces,
  detectFreeTimeBlocks,
  loadPackingList,
  savePackingList,
  loadTripNotes,
  saveTripNotes,
  formatItineraryForSharing,
  TIME_SLOTS,
} from '../lib/tripPlanner';
import { calculateTripBudget, formatINR } from '../lib/budget';
import { getDestinationImage } from '../lib/destinationImageResolver';
import GlassCard from './ui/GlassCard';
import PrimaryButton from './ui/PrimaryButton';

export default function TripTimelineView({
  trip,
  onClose,
  onEditTrip,
}) {
  const { colors, isDark } = useTheme();

  // Navigation tab inside view: 'itinerary' | 'budget' | 'packing' | 'notes'
  const [activeTab, setActiveTab] = useState('itinerary');
  const [itineraryDays, setItineraryDays] = useState([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [loading, setLoading] = useState(true);

  // Packing list state
  const [packingItems, setPackingItems] = useState([]);
  const [newPackingText, setNewPackingText] = useState('');

  // Trip notes state
  const [tripNotes, setTripNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Manually overridden warnings
  const [dismissedWarnings, setDismissedWarnings] = useState(new Set());

  // Add activity modal / inline form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addCost, setAddCost] = useState('500');
  const [addSlot, setAddSlot] = useState('morning');
  const [addStartTime, setAddStartTime] = useState('10:00');
  const [addEndTime, setAddEndTime] = useState('12:00');

  useEffect(() => {
    if (trip) {
      loadAllTripData();
    }
  }, [trip?.id]);

  const loadAllTripData = async () => {
    setLoading(true);
    const days = await loadTripItinerary(trip);
    setItineraryDays(days);

    const pack = await loadPackingList(trip);
    setPackingItems(pack);

    const notes = await loadTripNotes(trip.id);
    setTripNotes(notes);

    setLoading(false);
  };

  const currentDay = itineraryDays.find((d) => d.day_number === selectedDayNumber) || itineraryDays[0];
  const allActivities = itineraryDays.flatMap((d) => d.activities || []);

  // Budget calculations
  const budgetInfo = calculateTripBudget({
    tripBudget: trip?.estimated_budget || 20000,
    travelDays: itineraryDays.length,
    travelersCount: 1,
    activities: allActivities,
  });

  // Schedule conflict analysis for the selected day
  const scheduleAnalysis = analyzeDaySchedule(currentDay?.activities || []);
  const activeIssues = scheduleAnalysis.issues.filter((iss) => !dismissedWarnings.has(iss.id));

  // Empty day suggestions
  const existingPlaceIds = allActivities.map((a) => a.place_id).filter(Boolean);
  const emptyDaySuggestions = suggestEmptyDayPlaces(trip?.destination, existingPlaceIds);
  const freeTimeBlocks = detectFreeTimeBlocks(currentDay?.activities || []);

  // Calculate itinerary completeness progress
  const plannedDaysCount = itineraryDays.filter((d) => (d.activities || []).length > 0).length;
  const progressPercent = itineraryDays.length > 0 ? Math.round((plannedDaysCount / itineraryDays.length) * 100) : 0;

  const handleDismissWarning = (id) => {
    setDismissedWarnings((prev) => new Set([...prev, id]));
  };

  const handleAddActivity = async () => {
    if (!addTitle.trim()) {
      Alert.alert('Required', 'Please enter an activity name.');
      return;
    }

    const newAct = {
      id: `act-${Date.now()}`,
      title: addTitle.trim(),
      time_slot: addSlot,
      start_time: addStartTime.trim(),
      end_time: addEndTime.trim(),
      estimated_cost: Number(addCost) || 0,
      currency: 'INR',
      order_index: (currentDay?.activities || []).length,
    };

    const updated = itineraryDays.map((d) => {
      if (d.day_number === selectedDayNumber) {
        return {
          ...d,
          activities: [...(d.activities || []), newAct],
        };
      }
      return d;
    });

    setItineraryDays(updated);
    await saveTripItinerary(trip.id, updated);
    setShowAddForm(false);
    setAddTitle('');
  };

  const handleDeleteActivity = async (activityId) => {
    const updated = itineraryDays.map((d) => {
      if (d.day_number === selectedDayNumber) {
        return {
          ...d,
          activities: (d.activities || []).filter((a) => a.id !== activityId),
        };
      }
      return d;
    });
    setItineraryDays(updated);
    await saveTripItinerary(trip.id, updated);
  };

  const handleMoveActivity = async (activityId, direction) => {
    const acts = [...(currentDay?.activities || [])];
    const index = acts.findIndex((a) => a.id === activityId);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= acts.length) return;

    const temp = acts[index];
    acts[index] = acts[targetIndex];
    acts[targetIndex] = temp;

    const updated = itineraryDays.map((d) => {
      if (d.day_number === selectedDayNumber) {
        return { ...d, activities: acts };
      }
      return d;
    });

    setItineraryDays(updated);
    await saveTripItinerary(trip.id, updated);
  };

  const handleAddSuggestionToDay = async (place) => {
    const newAct = {
      id: `act-${Date.now()}`,
      place_id: place.id,
      title: place.name,
      description: place.description,
      time_slot: 'afternoon',
      start_time: '14:00',
      end_time: '16:00',
      estimated_cost: place.min_price || 0,
      currency: 'INR',
      order_index: (currentDay?.activities || []).length,
      category: place.category,
    };

    const updated = itineraryDays.map((d) => {
      if (d.day_number === selectedDayNumber) {
        return {
          ...d,
          activities: [...(d.activities || []), newAct],
        };
      }
      return d;
    });

    setItineraryDays(updated);
    await saveTripItinerary(trip.id, updated);
    Alert.alert('Spot Added ✨', `Added "${place.name}" to Day ${selectedDayNumber}.`);
  };

  const handleTogglePacking = async (itemId) => {
    const updated = packingItems.map((p) => (p.id === itemId ? { ...p, checked: !p.checked } : p));
    setPackingItems(updated);
    await savePackingList(trip.id, updated);
  };

  const handleAddPackingItem = async () => {
    if (!newPackingText.trim()) return;
    const item = { id: `pack-${Date.now()}`, text: newPackingText.trim(), checked: false };
    const updated = [...packingItems, item];
    setPackingItems(updated);
    setNewPackingText('');
    await savePackingList(trip.id, updated);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await saveTripNotes(trip.id, tripNotes);
    setIsSavingNotes(false);
    Alert.alert('Notes Saved', 'Your trip notes have been synchronized.');
  };

  const handleShareItinerary = async () => {
    const text = formatItineraryForSharing(trip, currentDay);
    try {
      await Share.share({ message: text, title: `Trip to ${trip.destination}` });
    } catch {
      Alert.alert('Shared', 'Itinerary copied for sharing.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Trip Planner Plus</Text>
        <TouchableOpacity onPress={handleShareItinerary} style={styles.headerBtn}>
          <Ionicons name="share-social-outline" size={20} color="#B99A5E" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* Destination Cover & Trip Overview */}
        <View style={styles.heroCover}>
          <Image
            source={getDestinationImage(trip?.destination, trip?.cover_url)}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(23, 24, 23, 0.45)', 'rgba(23, 24, 23, 0.92)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>EXPEDITION TIMELINE</Text>
            <Text style={styles.heroDestination}>{trip?.destination?.toUpperCase()}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="calendar-outline" size={13} color="#B99A5E" style={{ marginRight: 6 }} />
              <Text style={styles.heroDates}>{trip?.date_from} – {trip?.date_to}</Text>
              <Text style={styles.heroDot}>•</Text>
              <Text style={styles.heroStyle}>{trip?.travel_style || 'Culture & Adventure'}</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressWrap}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>ITINERARY PROGRESS</Text>
                <Text style={styles.progressValue}>{progressPercent}% PLANNED</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Feature Navigation Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {[
            { id: 'itinerary', label: 'Timeline', icon: 'trail-sign-outline' },
            { id: 'budget', label: 'Budget Intelligence', icon: 'wallet-outline' },
            { id: 'packing', label: 'Packing Checklist', icon: 'checkbox-outline' },
            { id: 'notes', label: 'Trip Notes', icon: 'document-text-outline' },
          ].map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tabItem,
                  isSelected && [styles.tabItemActive, { borderBottomColor: '#B99A5E' }],
                ]}
                onPress={() => setActiveTab(t.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={isSelected ? '#B99A5E' : colors.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.tabItemText,
                    { color: isSelected ? colors.textPrimary : colors.textSecondary },
                    isSelected && styles.tabItemTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB 1: ITINERARY TIMELINE */}
        {activeTab === 'itinerary' && (
          <View style={styles.tabContent}>
            {/* Day Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
              {itineraryDays.map((d) => {
                const isSelected = d.day_number === selectedDayNumber;
                const actCount = (d.activities || []).length;
                return (
                  <TouchableOpacity
                    key={d.day_number}
                    style={[
                      styles.daySelectorCard,
                      {
                        backgroundColor: isSelected ? '#171817' : isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1EEE6',
                        borderColor: isSelected ? '#B99A5E' : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDayNumber(d.day_number)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.daySelectorTitle, { color: isSelected ? '#FBFAF7' : colors.textPrimary }]}>
                      Day {d.day_number}
                    </Text>
                    <Text style={[styles.daySelectorBadge, { color: isSelected ? '#B99A5E' : colors.textSecondary }]}>
                      {actCount === 0 ? 'Open' : `${actCount} stops`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Current Day Header */}
            <View style={styles.dayHeaderBlock}>
              <View>
                <Text style={[styles.dayTitleText, { color: colors.textPrimary }]}>
                  Day {currentDay?.day_number}: {currentDay?.title || 'Open Day'}
                </Text>
                <Text style={[styles.daySubtext, { color: colors.textSecondary }]}>
                  {(currentDay?.activities || []).length} scheduled activities • Total Day Spend: {formatINR((currentDay?.activities || []).reduce((acc, a) => acc + (Number(a.estimated_cost) || 0), 0))}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.addActBtn, { backgroundColor: '#171817' }]}
                onPress={() => setShowAddForm(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#B99A5E" style={{ marginRight: 4 }} />
                <Text style={styles.addActBtnText}>Add Stop</Text>
              </TouchableOpacity>
            </View>

            {/* Planning Intelligence: Active Conflicts / Warnings with Dismiss Override */}
            {activeIssues.map((iss) => (
              <View
                key={iss.id}
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: iss.type === 'danger' ? 'rgba(239, 68, 68, 0.10)' : 'rgba(234, 179, 8, 0.10)',
                    borderColor: iss.type === 'danger' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(234, 179, 8, 0.35)',
                  },
                ]}
              >
                <Ionicons
                  name={iss.type === 'danger' ? 'alert-circle' : 'warning-outline'}
                  size={18}
                  color={iss.type === 'danger' ? '#EF4444' : '#EAB308'}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.warningTitle, { color: iss.type === 'danger' ? '#EF4444' : '#EAB308' }]}>
                    {iss.title}
                  </Text>
                  <Text style={[styles.warningMessage, { color: colors.textPrimary }]}>
                    {iss.message}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDismissWarning(iss.id)} style={styles.dismissBtn}>
                  <Text style={styles.dismissBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Inline Add Activity Form */}
            {showAddForm && (
              <GlassCard material="pearl" style={styles.inlineFormCard}>
                <Text style={styles.formCardTitle}>Add Itinerary Stop</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: '#FBFAF7', borderColor: colors.border }]}
                  placeholder="Activity Title (e.g. Amber Fort Sunrise Walk)"
                  value={addTitle}
                  onChangeText={setAddTitle}
                  placeholderTextColor="#77766F"
                />
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.formInput, { flex: 1, marginRight: 8, backgroundColor: '#FBFAF7', borderColor: colors.border }]}
                    placeholder="Start (HH:MM)"
                    value={addStartTime}
                    onChangeText={setAddStartTime}
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1, marginLeft: 8, backgroundColor: '#FBFAF7', borderColor: colors.border }]}
                    placeholder="End (HH:MM)"
                    value={addEndTime}
                    onChangeText={setAddEndTime}
                  />
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: '#FBFAF7', borderColor: colors.border }]}
                  placeholder="Estimated Cost in INR (e.g. 500)"
                  value={addCost}
                  onChangeText={setAddCost}
                  keyboardType="numeric"
                />
                <View style={styles.formActionRow}>
                  <TouchableOpacity onPress={() => setShowAddForm(false)} style={styles.cancelFormBtn}>
                    <Text style={styles.cancelFormBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddActivity} style={styles.saveFormBtn}>
                    <Text style={styles.saveFormBtnText}>Save Stop</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            )}

            {/* Time Slot Sections & Activities */}
            {TIME_SLOTS.map((slot) => {
              const slotActivities = (currentDay?.activities || []).filter(
                (a) => (a.time_slot || 'morning') === slot.id
              );

              return (
                <View key={slot.id} style={styles.slotSection}>
                  <View style={styles.slotHeaderRow}>
                    <View style={styles.slotHeaderLeft}>
                      <Ionicons name={slot.icon} size={15} color="#B99A5E" style={{ marginRight: 6 }} />
                      <Text style={[styles.slotTitleText, { color: colors.primary }]}>{slot.label?.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.slotTimeRange, { color: colors.textSecondary }]}>{slot.timeRange}</Text>
                  </View>

                  {slotActivities.length > 0 ? (
                    slotActivities.map((act, idx) => (
                      <View
                        key={act.id}
                        style={[styles.activityCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}
                      >
                        <View style={styles.actLeftStrip}>
                          <Text style={styles.actTimeText}>{act.start_time || '10:00'}</Text>
                          <Text style={styles.actTimeEndText}>{act.end_time || '12:00'}</Text>
                        </View>

                        <View style={styles.actContent}>
                          <Text style={[styles.actTitle, { color: colors.textPrimary }]}>{act.title}</Text>
                          {act.description ? (
                            <Text style={[styles.actDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                              {act.description}
                            </Text>
                          ) : null}
                          <View style={styles.actFooter}>
                            <Text style={styles.actCostBadge}>{formatINR(act.estimated_cost)}</Text>
                          </View>
                        </View>

                        {/* Reorder and Delete Actions */}
                        <View style={styles.actActionsCol}>
                          <TouchableOpacity onPress={() => handleMoveActivity(act.id, -1)} style={styles.orderBtn}>
                            <Ionicons name="chevron-up" size={14} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleMoveActivity(act.id, 1)} style={styles.orderBtn}>
                            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteActivity(act.id)} style={styles.orderBtn}>
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.freeBlockCard, { borderColor: colors.border }]}>
                      <Ionicons name="leaf-outline" size={14} color="#33463C" style={{ marginRight: 6 }} />
                      <Text style={[styles.freeBlockText, { color: colors.textSecondary }]}>
                        Free {slot.label} • Open for leisure or spontaneous exploration
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Empty-Day Suggestions Widget */}
            {(currentDay?.activities || []).length === 0 && (
              <View style={styles.emptyDayBox}>
                <View style={styles.emptyDayHeader}>
                  <Ionicons name="sparkles" size={16} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text style={[styles.emptyDayTitle, { color: colors.textPrimary }]}>
                    Suggested Spots for Day {currentDay?.day_number}
                  </Text>
                </View>
                <Text style={[styles.emptyDaySubtitle, { color: colors.textSecondary }]}>
                  Curated highlights in {trip?.destination} matching your style:
                </Text>

                {emptyDaySuggestions.map((place) => (
                  <View key={place.id} style={[styles.suggestCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestName, { color: colors.textPrimary }]}>{place.name}</Text>
                      <Text style={[styles.suggestMeta, { color: colors.textSecondary }]}>
                        {place.category} • {formatINR(place.min_price)} • ⭐ {place.rating}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.suggestAddBtn, { backgroundColor: '#171817' }]}
                      onPress={() => handleAddSuggestionToDay(place)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.suggestAddBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: BUDGET INTELLIGENCE */}
        {activeTab === 'budget' && (
          <View style={styles.tabContent}>
            <GlassCard material="pearl" style={styles.budgetHeroCard}>
              <Text style={styles.budgetHeroLabel}>TOTAL ESTIMATED EXPENSE</Text>
              <Text style={styles.budgetHeroValue}>{formatINR(budgetInfo.totalEstimatedSpend)}</Text>
              <Text style={styles.budgetHeroSub}>
                Allocated from total budget of {formatINR(budgetInfo.totalBudget)}
              </Text>

              {/* Burn Meter */}
              <View style={styles.burnMeterWrap}>
                <View style={styles.burnMeterHeader}>
                  <Text style={styles.burnMeterLabel}>BUDGET BURN</Text>
                  <Text style={styles.burnMeterPercent}>{budgetInfo.burnPercentage}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${budgetInfo.burnPercentage}%`,
                        backgroundColor: budgetInfo.status === 'over_budget' ? '#EF4444' : budgetInfo.status === 'caution' ? '#EAB308' : '#33463C',
                      },
                    ]}
                  />
                </View>
              </View>
            </GlassCard>

            {/* Quick Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}>
                <Text style={styles.metricLabel}>DAILY BUDGET</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatINR(budgetInfo.dailyBudget)}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}>
                <Text style={styles.metricLabel}>REMAINING</Text>
                <Text style={[styles.metricValue, { color: budgetInfo.remainingBudget < 0 ? '#EF4444' : '#33463C' }]}>
                  {formatINR(budgetInfo.remainingBudget)}
                </Text>
              </View>
            </View>

            {/* Category Breakdown */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Category Spend Breakdown</Text>
              {[
                { label: 'Activities & Sightseeing', val: budgetInfo.breakdown.activities, icon: 'compass-outline' },
                { label: 'Food & Dining', val: budgetInfo.breakdown.food, icon: 'restaurant-outline' },
                { label: 'Stays & Stays', val: budgetInfo.breakdown.stays, icon: 'bed-outline' },
                { label: 'Experiences & Culture', val: budgetInfo.breakdown.experiences, icon: 'sparkles-outline' },
                { label: 'Local Transport', val: budgetInfo.breakdown.transport, icon: 'bus-outline' },
              ].map((c, i) => (
                <View key={i} style={[styles.catRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={c.icon} size={15} color="#B99A5E" style={{ marginRight: 10 }} />
                    <Text style={[styles.catLabel, { color: colors.textPrimary }]}>{c.label}</Text>
                  </View>
                  <Text style={[styles.catVal, { color: colors.textPrimary }]}>{formatINR(c.val)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 3: PACKING CHECKLIST */}
        {activeTab === 'packing' && (
          <View style={styles.tabContent}>
            <View style={styles.checklistHeader}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Expedition Packing Checklist</Text>
              <Text style={[styles.checklistSub, { color: colors.textSecondary }]}>
                Intelligently tailored for {trip?.destination}
              </Text>
            </View>

            {/* Add new packing item */}
            <View style={styles.addPackRow}>
              <TextInput
                style={[styles.addPackInput, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="+ Add personal gear / item..."
                value={newPackingText}
                onChangeText={setNewPackingText}
                placeholderTextColor="#77766F"
              />
              <TouchableOpacity onPress={handleAddPackingItem} style={styles.addPackBtn}>
                <Ionicons name="add" size={20} color="#FBFAF7" />
              </TouchableOpacity>
            </View>

            {packingItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.packItemRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border }]}
                onPress={() => handleTogglePacking(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.checked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={item.checked ? '#B99A5E' : colors.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={[
                    styles.packItemText,
                    { color: item.checked ? colors.textSecondary : colors.textPrimary },
                    item.checked && styles.packItemChecked,
                  ]}
                >
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB 4: TRIP NOTES */}
        {activeTab === 'notes' && (
          <View style={styles.tabContent}>
            <View style={styles.checklistHeader}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Trip Journal & Confirmations</Text>
              <Text style={[styles.checklistSub, { color: colors.textSecondary }]}>
                Keep flight PNRs, hotel confirmations, contact numbers, and local recommendations.
              </Text>
            </View>

            <TextInput
              style={[styles.notesArea, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7', borderColor: colors.border, color: colors.textPrimary }]}
              multiline
              numberOfLines={10}
              placeholder="Jot down booking references, recommended cafes from locals, driver contacts..."
              value={tripNotes}
              onChangeText={setTripNotes}
              placeholderTextColor="#77766F"
              textAlignVertical="top"
            />

            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                title={isSavingNotes ? 'Saving Notes...' : 'Save Trip Notes'}
                onPress={handleSaveNotes}
                disabled={isSavingNotes}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollBody: {
    paddingBottom: 80,
  },
  heroCover: {
    width: '100%',
    height: 220,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    padding: 18,
  },
  heroEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#B99A5E',
    marginBottom: 2,
  },
  heroDestination: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    fontWeight: '800',
    color: '#FBFAF7',
    marginBottom: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroDates: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#FBFAF7',
  },
  heroDot: {
    color: '#B99A5E',
    marginHorizontal: 8,
  },
  heroStyle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#D7D2C8',
  },
  progressWrap: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#B99A5E',
    letterSpacing: 1.2,
  },
  progressValue: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FBFAF7',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: RADII.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#B99A5E',
    borderRadius: RADII.full,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabItemText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
  },
  tabItemTextActive: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  tabContent: {
    padding: 16,
  },
  daysScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  daySelectorCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  daySelectorTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  daySelectorBadge: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 2,
  },
  dayHeaderBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  dayTitleText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
  },
  daySubtext: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  addActBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADII.full,
  },
  addActBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#FBFAF7',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  warningTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  warningMessage: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 1,
  },
  dismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dismissBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#77766F',
  },
  inlineFormCard: {
    padding: 16,
    borderRadius: RADII.lg,
    marginBottom: 16,
  },
  formCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#171817',
    marginBottom: 10,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: FONTS.regular,
    fontSize: 13,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelFormBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelFormBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#77766F',
  },
  saveFormBtn: {
    backgroundColor: '#171817',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.md,
  },
  saveFormBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FBFAF7',
  },
  slotSection: {
    marginBottom: 18,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotTitleText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  slotTimeRange: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  actLeftStrip: {
    width: 60,
    alignItems: 'center',
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#D7D2C8',
  },
  actTimeText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#B99A5E',
  },
  actTimeEndText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#77766F',
  },
  actContent: {
    flex: 1,
    paddingHorizontal: 10,
  },
  actTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
  },
  actDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  actFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actCostBadge: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#33463C',
  },
  actActionsCol: {
    gap: 4,
  },
  orderBtn: {
    padding: 3,
  },
  freeBlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADII.md,
  },
  freeBlockText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  emptyDayBox: {
    padding: 16,
    borderRadius: RADII.lg,
    backgroundColor: '#F7F5F0',
    marginTop: 10,
  },
  emptyDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyDayTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyDaySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginBottom: 12,
  },
  suggestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginBottom: 6,
  },
  suggestName: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  suggestMeta: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  suggestAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
  },
  suggestAddBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#FBFAF7',
  },
  budgetHeroCard: {
    padding: 18,
    borderRadius: RADII.lg,
    marginBottom: 16,
  },
  budgetHeroLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#77766F',
    letterSpacing: 1.5,
  },
  budgetHeroValue: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#171817',
    marginVertical: 4,
  },
  budgetHeroSub: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#77766F',
  },
  burnMeterWrap: {
    marginTop: 14,
  },
  burnMeterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  burnMeterLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#77766F',
    letterSpacing: 1.2,
  },
  burnMeterPercent: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#171817',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  metricLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#77766F',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionBlock: {
    marginTop: 10,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  catLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  catVal: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  checklistHeader: {
    marginBottom: 14,
  },
  checklistSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  addPackRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  addPackInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  addPackBtn: {
    backgroundColor: '#171817',
    width: 44,
    height: 44,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  packItemText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    flex: 1,
  },
  packItemChecked: {
    textDecorationLine: 'line-through',
  },
  notesArea: {
    borderWidth: 1,
    borderRadius: RADII.lg,
    padding: 14,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 180,
  },
});
