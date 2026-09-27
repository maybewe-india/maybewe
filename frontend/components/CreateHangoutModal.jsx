import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/themeContext.jsx';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme.js';
import { createHangout, getSmartHangoutSuggestions } from '../lib/hangouts.js';
import { INDIA_DESTINATIONS } from '../lib/indiaData.js';

const { width: SCREEN_W } = Dimensions.get('window');

const DESTINATION_NAMES = [
  'Goa',
  'Jaipur',
  'Udaipur',
  'Kashmir',
  'Manali',
  'Kerala',
  'Ladakh',
  'Varanasi',
  'Andaman',
];

const COMPANIONS_PRESET = [
  { id: 'user-demo-arjun', name: 'Arjun Mehta', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80', city: 'Mumbai' },
  { id: 'user-demo-rohan', name: 'Rohan Verma', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80', city: 'Delhi' },
  { id: 'user-demo-meera', name: 'Meera Patel', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80', city: 'Ahmedabad' },
  { id: 'user-demo-ananya', name: 'Ananya Roy', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80', city: 'Kolkata' },
];

export default function CreateHangoutModal({
  visible,
  onClose,
  onCreated,
  initialDestination = null,
  initialPlace = null,
  currentUser = null,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState(initialDestination || 'Goa');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('18:00');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialPlace?.id || null);
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialDestination) setDestination(initialDestination);
      if (initialPlace) setSelectedPlaceId(initialPlace.id);
      loadSuggestions(initialDestination || destination);
    }
  }, [visible, initialDestination, initialPlace]);

  const loadSuggestions = (dest) => {
    const list = getSmartHangoutSuggestions({
      destination: dest,
      limit: 4,
    });
    setSuggestions(list);
  };

  const handleDestinationChange = (dest) => {
    setDestination(dest);
    loadSuggestions(dest);
  };

  const toggleMember = (companion) => {
    if (selectedMembers.some((m) => m.id === companion.id)) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== companion.id));
    } else {
      setSelectedMembers([...selectedMembers, companion]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Please give your hangout a name.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);

    try {
      const created = await createHangout({
        creatorId: currentUser?.id || 'current-user',
        creatorName: currentUser?.name || 'Traveler',
        title,
        destination,
        description,
        targetDate: targetDate || '2026-10-25',
        targetTime: targetTime || '18:00',
        initialPlaceId: selectedPlaceId,
        invitedMembers: selectedMembers,
      });

      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Could not create hangout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={styles.eyebrow}>SOCIAL HANGOUT PLANNING</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Plan a Meetup</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#9E3A3A" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Hangout Title */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Hangout Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. Sunset Chai & Photography Walk"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={(t) => { setTitle(t); setErrorMsg(''); }}
              />
            </View>

            {/* Destination Selector */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Destination *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {DESTINATION_NAMES.map((d) => {
                  const isSelected = destination.toLowerCase() === d.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => handleDestinationChange(d)}
                      style={[
                        styles.destChip,
                        { borderColor: colors.border, backgroundColor: colors.cardBackground },
                        isSelected && styles.destChipActive,
                      ]}
                    >
                      <Ionicons
                        name="location"
                        size={13}
                        color={isSelected ? '#FAF8F3' : '#B99A5E'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.destChipText, { color: colors.textPrimary }, isSelected && styles.destChipTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Date & Time Row */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldSection, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Target Date</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={targetDate}
                  onChangeText={setTargetDate}
                />
              </View>
              <View style={[styles.fieldSection, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Target Time</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="e.g. 18:00"
                  placeholderTextColor={colors.textSecondary}
                  value={targetTime}
                  onChangeText={setTargetTime}
                />
              </View>
            </View>

            {/* Description / Notes */}
            <View style={styles.fieldSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Notes & Vibe</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="What are we doing? Dress code, meeting vibes, recommendations..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Invite Companions */}
            <View style={styles.fieldSection}>
              <View style={styles.labelWithSub}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Invite Travel Companions</Text>
                <Text style={styles.fieldSub}>Selected: {selectedMembers.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companionsRow}>
                {COMPANIONS_PRESET.map((c) => {
                  const isInvited = selectedMembers.some((m) => m.id === c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => toggleMember(c)}
                      style={[
                        styles.companionCard,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        isInvited && styles.companionCardActive,
                      ]}
                    >
                      <Image source={{ uri: c.avatar_url }} style={styles.companionAvatar} />
                      <Text style={[styles.companionName, { color: colors.textPrimary }]} numberOfLines={1}>{c.name}</Text>
                      <Text style={[styles.companionCity, { color: colors.textSecondary }]}>{c.city}</Text>
                      <View style={[styles.checkCircle, isInvited && styles.checkCircleActive]}>
                        <Ionicons
                          name={isInvited ? 'checkmark' : 'add'}
                          size={12}
                          color={isInvited ? '#FAF8F3' : '#8C8983'}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Smart Suggested Places in Destination */}
            {suggestions.length > 0 && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Smart Suggested Places</Text>
                <Text style={styles.fieldSub}>Choose an initial spot or decide together via group voting</Text>
                <View style={styles.suggGrid}>
                  {suggestions.map((p) => {
                    const isPicked = selectedPlaceId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setSelectedPlaceId(isPicked ? null : p.id)}
                        style={[
                          styles.suggCard,
                          { backgroundColor: colors.cardBackground, borderColor: colors.border },
                          isPicked && styles.suggCardActive,
                        ]}
                      >
                        <Image source={{ uri: p.cover_image_url }} style={styles.suggImage} />
                        <View style={styles.suggMeta}>
                          <Text style={[styles.suggTitle, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                          <Text style={[styles.suggCategory, { color: colors.textSecondary }]}>{p.category} • ₹{p.price_inr}</Text>
                          {p.recommendationTags && p.recommendationTags[0] ? (
                            <View style={styles.tagPill}>
                              <Text style={styles.tagPillText}>{p.recommendationTags[0]}</Text>
                            </View>
                          ) : null}
                        </View>
                        {isPicked && (
                          <View style={styles.pickedBadge}>
                            <Ionicons name="checkmark-circle" size={18} color="#B99A5E" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>

          {/* Bottom Action */}
          <View style={[styles.footerBar, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.createButton, submitting && { opacity: 0.7 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FAF8F3" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={17} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text style={styles.createButtonText}>Create Hangout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 22, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#B99A5E',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(158, 58, 58, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#9E3A3A',
  },
  fieldSection: {
    marginBottom: 18,
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    marginBottom: 8,
  },
  labelWithSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#8C8983',
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  chipRow: {
    gap: 8,
  },
  destChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  destChipActive: {
    backgroundColor: '#171716',
    borderColor: '#B99A5E',
  },
  destChipText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  destChipTextActive: {
    color: '#FAF8F3',
    fontFamily: FONTS.semiBold,
  },
  companionsRow: {
    gap: 12,
    paddingVertical: 4,
  },
  companionCard: {
    width: 108,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  companionCardActive: {
    borderColor: '#B99A5E',
    backgroundColor: 'rgba(185, 154, 94, 0.08)',
  },
  companionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  companionName: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    textAlign: 'center',
  },
  companionCity: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(140, 137, 131, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#171716',
  },
  suggGrid: {
    gap: 10,
  },
  suggCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggCardActive: {
    borderColor: '#B99A5E',
    backgroundColor: 'rgba(185, 154, 94, 0.08)',
  },
  suggImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  suggMeta: {
    flex: 1,
    marginLeft: 12,
  },
  suggTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
  suggCategory: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  tagPillText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#87692B',
  },
  pickedBadge: {
    paddingRight: 8,
  },
  footerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171716',
    height: 52,
    borderRadius: 16,
  },
  createButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#FAF8F3',
  },
});
