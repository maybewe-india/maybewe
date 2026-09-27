import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADII, FONTS } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import { loadTripItinerary, saveTripItinerary, TIME_SLOTS } from '../lib/tripPlanner';
import { formatINR } from '../lib/budget';
import PrimaryButton from './ui/PrimaryButton';

const TRIPS_STORAGE_KEY = '@solo_traveler_stored_trips';

export default function AddToTripModal({
  visible,
  place,
  onClose,
  onAdded,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState('morning');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTrips();
    }
  }, [visible]);

  const loadTrips = async () => {
    try {
      const raw = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const active = parsed.filter((t) => t.status === 'active');
        setTrips(active);
        if (active.length > 0) {
          // Pre-select trip matching destination if available
          const matching = active.find((t) =>
            (t.destination || '').toLowerCase().includes((place?.destination || '').toLowerCase())
          );
          setSelectedTripId(matching ? matching.id : active[0].id);
        }
      }
    } catch {
      // Silent
    }
  };

  const handleConfirmAdd = async () => {
    if (!selectedTripId) {
      Alert.alert('No Trip Selected', 'Please select a trip first.');
      return;
    }

    setIsAdding(true);
    try {
      const selectedTrip = trips.find((t) => t.id === selectedTripId);
      const itinerary = await loadTripItinerary(selectedTrip);

      const targetDay = itinerary.find((d) => d.day_number === selectedDayNumber) || itinerary[0];
      if (targetDay) {
        if (!Array.isArray(targetDay.activities)) {
          targetDay.activities = [];
        }

        const newActivity = {
          id: `act-${Date.now()}`,
          place_id: place.id,
          title: place.name,
          description: place.description || '',
          time_slot: selectedSlot,
          start_time: selectedSlot === 'morning' ? '09:30' : selectedSlot === 'afternoon' ? '14:00' : selectedSlot === 'evening' ? '18:00' : '21:00',
          end_time: selectedSlot === 'morning' ? '11:30' : selectedSlot === 'afternoon' ? '16:00' : selectedSlot === 'evening' ? '20:00' : '23:00',
          estimated_cost: place.min_price || 0,
          currency: 'INR',
          order_index: targetDay.activities.length,
          category: place.category || 'Activity',
        };

        targetDay.activities.push(newActivity);
        await saveTripItinerary(selectedTripId, itinerary);
      }

      setIsAdding(false);
      onClose();
      Alert.alert('Added to Itinerary! ✨', `"${place.name}" has been added to Day ${selectedDayNumber}.`);
      if (onAdded) onAdded(selectedTripId);
    } catch {
      setIsAdding(false);
      Alert.alert('Error', 'Unable to save to itinerary. Please try again.');
    }
  };

  if (!place) return null;

  const currentTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.modalBg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 16) + 4 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add to Itinerary</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Target Place Summary */}
          <View style={[styles.placeSummaryCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1EEE6', borderColor: colors.border }]}>
            <Ionicons name="sparkles" size={18} color="#B99A5E" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.placeName, { color: colors.textPrimary }]}>{place.name}</Text>
              <Text style={[styles.placeMeta, { color: colors.textSecondary }]}>
                {place.destination} • {place.category} • {formatINR(place.min_price)}
              </Text>
            </View>
          </View>

          {/* Select Expedition */}
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>SELECT TRIP</Text>
          {trips.length > 0 ? (
            <View style={styles.tripsList}>
              {trips.map((t) => {
                const isSelected = t.id === selectedTripId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.tripOption,
                      {
                        backgroundColor: isSelected ? '#171817' : isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7',
                        borderColor: isSelected ? '#B99A5E' : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTripId(t.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="airplane-outline"
                      size={16}
                      color={isSelected ? '#B99A5E' : colors.textSecondary}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripDestination, { color: isSelected ? '#FBFAF7' : colors.textPrimary }]}>
                        {t.destination}
                      </Text>
                      <Text style={[styles.tripDates, { color: isSelected ? '#D7D2C8' : colors.textSecondary }]}>
                        {t.date_from} – {t.date_to}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#B99A5E" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.noTripsBanner, { backgroundColor: '#F1EEE6', borderColor: colors.border }]}>
              <Text style={[styles.noTripsText, { color: colors.textSecondary }]}>
                You have no active trips yet. Create a trip first in the Trips tab.
              </Text>
            </View>
          )}

          {/* Select Day */}
          {currentTrip && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 22 }]}>SELECT DAY</Text>
              <View style={styles.daysRow}>
                {[1, 2, 3, 4, 5].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: selectedDayNumber === d ? '#171817' : isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7',
                        borderColor: selectedDayNumber === d ? '#B99A5E' : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDayNumber(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayChipText, { color: selectedDayNumber === d ? '#FBFAF7' : colors.textPrimary }]}>
                      Day {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Select Time Slot */}
              <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 22 }]}>TIME OF DAY</Text>
              <View style={styles.slotGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedSlot === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotCard,
                        {
                          backgroundColor: isSelected ? '#171817' : isDark ? 'rgba(255, 255, 255, 0.05)' : '#FBFAF7',
                          borderColor: isSelected ? '#B99A5E' : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedSlot(slot.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={slot.icon}
                        size={18}
                        color={isSelected ? '#B99A5E' : colors.textSecondary}
                        style={{ marginBottom: 4 }}
                      />
                      <Text style={[styles.slotLabel, { color: isSelected ? '#FBFAF7' : colors.textPrimary }]}>
                        {slot.label}
                      </Text>
                      <Text style={[styles.slotRange, { color: isSelected ? '#D7D2C8' : colors.textSecondary }]}>
                        {slot.timeRange.split('–')[0].trim()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Confirm Button */}
          <View style={{ marginTop: 32 }}>
            <PrimaryButton
              title={isAdding ? 'Adding to Itinerary...' : 'Confirm & Add Activity'}
              onPress={handleConfirmAdd}
              disabled={isAdding || trips.length === 0}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    padding: 20,
    paddingBottom: 60,
  },
  placeSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADII.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  placeName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  placeMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  tripsList: {
    gap: 8,
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  tripDestination: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  tripDates: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  noTripsBanner: {
    padding: 16,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  noTripsText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  dayChipText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  slotGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  slotLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  slotRange: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    marginTop: 2,
  },
});
