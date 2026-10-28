import React, { useState, useEffect } from "react";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../lib/themeContext.jsx";
import { COLORS, RADII, SHADOWS, FONTS } from "../lib/theme.js";
import { createHangout, getSmartHangoutSuggestions } from "../lib/hangouts.js";
import { uploadHangoutMedia } from "../lib/mediaUpload.js";
import { INDIA_DESTINATIONS } from "../lib/indiaData.js";

const DESTINATION_NAMES = [
  "Goa",
  "Jaipur",
  "Udaipur",
  "Kashmir",
  "Manali",
  "Kerala",
  "Ladakh",
  "Varanasi",
  "Andaman",
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

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState(initialDestination || "Goa");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetTime, setTargetTime] = useState("18:00");
  const [maxTravelers, setMaxTravelers] = useState(6);
  const [coverUri, setCoverUri] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialPlace?.id || null);
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (visible) {
      if (initialDestination) setDestination(initialDestination);
      if (initialPlace) setSelectedPlaceId(initialPlace.id);

      // Default date to tomorrow if empty
      if (!targetDate) {
        const tomorrow = new Date(Date.now() + 86400000);
        setTargetDate(tomorrow.toISOString().split("T")[0]);
      }
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

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCoverUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Cover image pick error:", e);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg("Please give your hangout a title (at least 3 characters).");
      return;
    }
    if (!destination.trim() || destination.trim().length < 2) {
      setErrorMsg("Please enter or select a valid destination (at least 2 characters).");
      return;
    }
    if (!currentUser?.id) {
      setErrorMsg("You must be logged in to create a meetup.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      let finalCoverUrl = null;
      if (coverUri) {
        try {
          finalCoverUrl = await uploadHangoutMedia({
            uri: coverUri,
            userId: currentUser.id,
          });
        } catch (mediaErr) {
          console.warn("Could not upload cover image, proceeding without cover:", mediaErr);
        }
      }

      // Compute ISO start_time
      const startTimeIso = new Date(`${targetDate}T${targetTime}:00Z`).toISOString();

      const created = await createHangout({
        creatorId: currentUser.id,
        title: title.trim(),
        destination: destination.trim(),
        place_name: destination.trim(),
        description: description.trim(),
        start_time: startTimeIso,
        max_travelers: maxTravelers,
        place_id: selectedPlaceId,
        cover_url: finalCoverUrl,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCoverUri(null);
      setErrorMsg("");

      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Could not create hangout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={styles.eyebrow}>REAL-TIME TRAVEL HANGOUTS</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Host a Meetup</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#D32F2F" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Meetup Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>MEETUP TITLE *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. Sunset Seafood Feast & Live Music"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />
            </View>

            {/* Destination Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>DESTINATION / REGION *</Text>

              {/* Text Input for Custom or Typed Destination */}
              <View
                style={[
                  styles.destinationInputContainer,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="location-outline" size={18} color="#B99A5E" style={styles.destinationInputIcon} />
                <TextInput
                  style={[styles.destinationTextInput, { color: colors.textPrimary }]}
                  placeholder="Enter destination, city, or region..."
                  placeholderTextColor={colors.textSecondary}
                  value={destination}
                  onChangeText={handleDestinationChange}
                  autoCapitalize="words"
                  accessibilityLabel="Destination or region"
                />
                {destination.length > 0 && (
                  <TouchableOpacity
                    onPress={() => handleDestinationChange("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.destinationClearBtn}
                    accessibilityLabel="Clear destination"
                  >
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Predefined Suggestion Chips */}
              <Text style={[styles.chipsSubLabel, { color: colors.textSecondary }]}>POPULAR DESTINATIONS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {DESTINATION_NAMES.map((d) => {
                  const isSelected = destination.trim().toLowerCase() === d.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => handleDestinationChange(d)}
                      style={[
                        styles.destChip,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        isSelected && styles.destChipActive,
                      ]}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${d}`}
                    >
                      <Text style={[styles.destChipText, { color: colors.textPrimary }, isSelected && styles.destChipTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Description / Vibe */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>THE PLAN & VIBE</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border },
                ]}
                placeholder="What are we doing? Meeting spot, budget expectations, chill/active vibe..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={1000}
              />
            </View>

            {/* Date & Time Row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="2026-10-25"
                  placeholderTextColor={colors.textSecondary}
                  value={targetDate}
                  onChangeText={setTargetDate}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>TIME (24H)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="18:00"
                  placeholderTextColor={colors.textSecondary}
                  value={targetTime}
                  onChangeText={setTargetTime}
                />
              </View>
            </View>

            {/* Capacity Stepper */}
            <View style={styles.inputGroup}>
              <View style={styles.capacityHeader}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 0 }]}>MAX TRAVELERS (2 - 50)</Text>
                <Text style={styles.capacityValueText}>{maxTravelers} travelers</Text>
              </View>
              <View style={styles.stepperRow}>
                {[2, 4, 6, 8, 12, 20].map((num) => (
                  <TouchableOpacity
                    key={num}
                    onPress={() => setMaxTravelers(num)}
                    style={[
                      styles.stepperBtn,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                      maxTravelers === num && styles.stepperBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepperBtnText,
                        { color: colors.textPrimary },
                        maxTravelers === num && styles.stepperBtnTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cover Photo Picker */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>COVER PHOTO (OPTIONAL)</Text>
              {coverUri ? (
                <View style={styles.coverPreviewContainer}>
                  <Image source={{ uri: coverUri }} style={styles.coverPreview} />
                  <TouchableOpacity onPress={() => setCoverUri(null)} style={styles.removeCoverBtn}>
                    <Ionicons name="trash" size={16} color="#FAF8F3" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={pickCoverImage} style={[styles.pickCoverBtn, { borderColor: colors.border }]} activeOpacity={0.8}>
                  <Ionicons name="image-outline" size={20} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text style={[styles.pickCoverText, { color: colors.textPrimary }]}>Choose Meetup Banner</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FAF8F3" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Publish Meetup & Open Chat</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: "#B99A5E",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingBottom: 30,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(211, 47, 47, 0.12)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 12,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  textArea: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlignVertical: "top",
  },
  destinationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  destinationInputIcon: {
    marginRight: 8,
  },
  destinationTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    paddingVertical: 0,
  },
  destinationClearBtn: {
    padding: 4,
  },
  chipsSubLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  destChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  destChipActive: {
    backgroundColor: "#171716",
    borderColor: "#171716",
  },
  destChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  destChipTextActive: {
    color: "#FAF8F3",
    fontFamily: FONTS.semiBold,
  },
  rowInputs: {
    flexDirection: "row",
  },
  capacityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  capacityValueText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#B99A5E",
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepperBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  stepperBtnActive: {
    backgroundColor: "#171716",
    borderColor: "#171716",
  },
  stepperBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  stepperBtnTextActive: {
    color: "#FAF8F3",
    fontFamily: FONTS.bold,
  },
  coverPreviewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  coverPreview: {
    width: "100%",
    height: 140,
    borderRadius: 12,
  },
  removeCoverBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    padding: 6,
    borderRadius: 14,
  },
  pickCoverBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
  },
  pickCoverText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: "#171716",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    color: "#FAF8F3",
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
});
