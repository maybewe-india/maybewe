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
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/themeContext.jsx";
import { COLORS, RADII } from "../../lib/theme.js";
import { createPost } from "../../lib/posts.js";
import { supabase } from "../../lib/supabaseClient.js";

const POPULAR_DESTINATIONS = [
  "Goa",
  "Jaipur",
  "Udaipur",
  "Kashmir",
  "Kerala",
  "Ladakh",
  "Hampi",
  "Manali",
  "Varanasi",
  "Rishikesh",
  "Meghalaya",
  "Munnar",
];

export default function CreatePostModal({
  visible,
  onClose,
  onPostCreated,
  onCreated,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [caption, setCaption] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [destination, setDestination] = useState("Goa");
  const [customDestination, setCustomDestination] = useState("");
  const [showCustomDest, setShowCustomDest] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]); // Array of asset objects: { uri, name, type, size }
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (visible) {
      checkAuth();
    }
  }, [visible]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  };

  const resetForm = () => {
    setCaption("");
    setDestination("Goa");
    setCustomDestination("");
    setShowCustomDest(false);
    setSelectedPhotos([]);
    setErrorMsg("");
    setUploadProgress("");
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handlePickFromGallery = async () => {
    try {
      setErrorMsg("");
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access gallery is required to select travel photos.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processPickedAssets(result.assets);
      }
    } catch (err) {
      console.warn("Image picker error:", err);
      setErrorMsg("Failed to open image picker: " + (err.message || "Unknown error"));
    }
  };

  // Web Resilient File Picker Fallback with Camera capture
  const triggerWebCameraPicker = () => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.onchange = (e) => {
      const file = e.target?.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setErrorMsg("Selected image exceeds 10MB limit.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          processPickedAssets([{
            uri: reader.result,
            fileName: file.name || "camera_photo_" + Date.now() + ".jpg",
            mimeType: file.type || "image/jpeg",
            fileSize: file.size,
          }]);
        };
        reader.onerror = () => {
          setErrorMsg("Failed to load photo.");
        };
        reader.readAsDataURL(file);
      }
      try {
        document.body.removeChild(input);
      } catch {}
    };
    document.body.appendChild(input);
    input.click();
  };

  const handleTakePhoto = async () => {
    setErrorMsg("");
    if (Platform.OS === "web") {
      triggerWebCameraPicker();
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Camera access permission is required to capture photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processPickedAssets(result.assets);
      }
    } catch (err) {
      console.warn("Camera error:", err);
      setErrorMsg("Failed to capture photo: " + (err.message || "Unknown error"));
    }
  };

  const processPickedAssets = (newAssets) => {
    const validAssets = [];
    for (const asset of newAssets) {
      // Validate 10MB limit (10 * 1024 * 1024 bytes)
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        setErrorMsg("One or more images exceed the 10MB limit and were skipped.");
        continue;
      }
      validAssets.push({
        uri: asset.uri,
        name: asset.fileName || "photo_" + Date.now() + ".jpg",
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize || 0,
      });
    }

    setSelectedPhotos((prev) => {
      const combined = [...prev, ...validAssets];
      return combined.slice(0, 6); // Max 6 photos per post
    });
  };

  const removePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!caption.trim()) {
      setErrorMsg("Please write your travel story or caption.");
      return;
    }

    let user = currentUser;
    if (!user?.id) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          user = authData.user;
          setCurrentUser(user);
        }
      } catch {}
    }

    if (!user?.id) {
      setErrorMsg("You must be logged in with a real Supabase account to publish.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);
    setUploadProgress("Preparing upload...");

    try {
      const finalDest = showCustomDest
        ? customDestination.trim() || destination
        : destination;

      setUploadProgress(
        selectedPhotos.length > 0
          ? "Uploading " + selectedPhotos.length + " media item" + (selectedPhotos.length > 1 ? "s" : "") + "..."
          : "Publishing post..."
      );

      const created = await createPost(
        {
          userId: user.id,
          userName: user.user_metadata?.name || user.email?.split("@")[0] || "Traveler",
          userAvatar: user.user_metadata?.avatar_url || null,
          content: caption.trim(),
          destination: finalDest,
          mediaFiles: selectedPhotos,
          visibility: "public",
        },
        user.id
      );

      setUploadProgress("Done!");
      const notify = onPostCreated || onCreated;
      if (notify) notify(created);
      handleClose();
    } catch (err) {
      console.error("Publishing error:", err);
      setErrorMsg(err.message || "Failed to publish post. Please check your network.");
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Platform.OS === "web" ? 20 : insets.top,
            backgroundColor: "#FAF8F5",
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={submitting}
            style={styles.closeBtn}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color="#1E1B18" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>SHARE YOUR STORY</Text>
            <Text style={styles.headerSubtitle}>Real Traveler Experiences</Text>
          </View>
          <TouchableOpacity
            onPress={handlePublish}
            disabled={submitting || !caption.trim()}
            style={[
              styles.publishBtn,
              (!caption.trim() || submitting) && styles.publishBtnDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#D4AF37" />
            ) : (
              <Text
                style={[
                  styles.publishBtnText,
                  (!caption.trim() || submitting) && styles.publishBtnTextDisabled,
                ]}
              >
                Publish
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {uploadProgress ? (
          <View style={styles.progressBanner}>
            <ActivityIndicator size="small" color="#D4AF37" />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Destination Selector */}
          <Text style={styles.sectionLabel}>DESTINATION</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destList}
          >
            {POPULAR_DESTINATIONS.map((dest) => {
              const isSelected = !showCustomDest && destination === dest;
              return (
                <TouchableOpacity
                  key={dest}
                  onPress={() => {
                    setShowCustomDest(false);
                    setDestination(dest);
                  }}
                  style={[styles.destChip, isSelected && styles.destChipActive]}
                >
                  <Ionicons
                    name="location-sharp"
                    size={12}
                    color={isSelected ? "#D4AF37" : "#7D756D"}
                  />
                  <Text
                    style={[
                      styles.destChipText,
                      isSelected && styles.destChipTextActive,
                    ]}
                  >
                    {dest}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => setShowCustomDest(!showCustomDest)}
              style={[styles.destChip, showCustomDest && styles.destChipActive]}
            >
              <Ionicons
                name="add-circle-outline"
                size={14}
                color={showCustomDest ? "#D4AF37" : "#7D756D"}
              />
              <Text
                style={[
                  styles.destChipText,
                  showCustomDest && styles.destChipTextActive,
                ]}
              >
                Other
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {showCustomDest && (
            <TextInput
              style={styles.customDestInput}
              placeholder="Enter destination name (e.g. Spiti Valley)..."
              placeholderTextColor="#9E978E"
              value={customDestination}
              onChangeText={setCustomDestination}
              maxLength={60}
            />
          )}

          {/* Story / Caption Area */}
          <Text style={styles.sectionLabel}>STORY / CAPTION</Text>
          <View style={[styles.captionBox, captionFocused && styles.captionBoxFocused]}>
            <TextInput
              style={styles.captionInput}
              placeholder="Share authentic tips, trail notes, or stories from your journey..."
              placeholderTextColor="#9E978E"
              value={caption}
              onChangeText={setCaption}
              onFocus={() => setCaptionFocused(true)}
              onBlur={() => setCaptionFocused(false)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>{caption.length}/2000</Text>
          </View>

          {/* Media Attachments */}
          <View style={styles.mediaSectionHeader}>
            <Text style={styles.sectionLabel}>PHOTOS (MAX 6, 10MB EACH)</Text>
            <Text style={styles.mediaCounter}>{selectedPhotos.length}/6</Text>
          </View>

          <View style={styles.mediaActionsRow}>
            <TouchableOpacity
              style={styles.mediaActionBtn}
              onPress={handlePickFromGallery}
              disabled={selectedPhotos.length >= 6 || submitting}
              activeOpacity={0.8}
            >
              <View style={styles.mediaActionBadge}>
                <Ionicons name="images" size={20} color="#D4AF37" />
              </View>
              <Text style={styles.mediaActionBtnText}>Photo Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaActionBtn}
              onPress={handleTakePhoto}
              disabled={selectedPhotos.length >= 6 || submitting}
              activeOpacity={0.8}
            >
              <View style={styles.mediaActionBadge}>
                <Ionicons name="camera" size={20} color="#D4AF37" />
              </View>
              <Text style={styles.mediaActionBtnText}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Photos Grid */}
          {selectedPhotos.length > 0 && (
            <View style={styles.photoGrid}>
              {selectedPhotos.map((photo, idx) => (
                <View key={idx} style={styles.photoThumbWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removePhoto(idx)}
                    disabled={submitting}
                  >
                    <Ionicons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Authenticity notice */}
          <View style={styles.authenticityNotice}>
            <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
            <Text style={styles.authenticityText}>
              All photos are verified and stored securely in Supabase post-media. No synthetic or placeholder data is permitted.
            </Text>
          </View>

          <View style={{ height: insets.bottom + 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197, 168, 128, 0.28)",
    backgroundColor: "#FAF8F5",
  },
  closeBtn: {
    padding: 6,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#1E1B18",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  headerSubtitle: {
    color: "#7D756D",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  publishBtn: {
    backgroundColor: "#1C1917",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: "#1C1917",
  },
  publishBtnDisabled: {
    backgroundColor: "rgba(28, 25, 23, 0.12)",
    borderColor: "rgba(28, 25, 23, 0.12)",
  },
  publishBtnText: {
    color: "#D4AF37",
    fontWeight: "800",
    fontSize: 13,
  },
  publishBtnTextDisabled: {
    color: "#A8A29E",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    flex: 1,
  },
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  progressText: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    color: "#7D756D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  destList: {
    gap: 8,
    paddingBottom: 12,
  },
  destChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F4EFEB",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
  },
  destChipActive: {
    backgroundColor: "#1C1917",
    borderColor: "#1C1917",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  destChipText: {
    color: "#574F47",
    fontSize: 12,
    fontWeight: "600",
  },
  destChipTextActive: {
    color: "#D4AF37",
    fontWeight: "800",
  },
  customDestInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.35)",
    color: "#1E1B18",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  captionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5DFD5",
    padding: 14,
    marginBottom: 20,
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  captionBoxFocused: {
    borderColor: "#C5A880",
  },
  captionInput: {
    color: "#1E1B18",
    fontSize: 14,
    minHeight: 120,
    lineHeight: 20,
  },
  charCount: {
    color: "#7D756D",
    fontSize: 11,
    textAlign: "right",
    marginTop: 6,
  },
  mediaSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mediaCounter: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
  },
  mediaActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  mediaActionBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4EFEB",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaActionBtnText: {
    color: "#1E1B18",
    fontSize: 13,
    fontWeight: "700",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  photoThumbWrap: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F4EFEB",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.25)",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(28, 25, 23, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  authenticityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4EFEB",
    padding: 14,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.25)",
    marginTop: 10,
  },
  authenticityText: {
    color: "#574F47",
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});