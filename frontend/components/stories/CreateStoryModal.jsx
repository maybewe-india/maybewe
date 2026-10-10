import React, { useState, useEffect, useRef } from "react";
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
import { RADII } from "../../lib/theme.js";
import { createStory } from "../../lib/stories.js";
import { supabase } from "../../lib/supabaseClient.js";

const POPULAR_DESTINATIONS = [
  "Goa",
  "Jaipur",
  "Kashmir",
  "Kerala",
  "Ladakh",
  "Hampi",
  "Manali",
  "Varanasi",
  "Rishikesh",
  "Udaipur",
];

export default function CreateStoryModal({
  visible,
  onClose,
  onStoryCreated,
}) {
  const insets = useSafeAreaInsets();

  const [caption, setCaption] = useState("");
  const [destination, setDestination] = useState("Goa");
  const [customDestination, setCustomDestination] = useState("");
  const [showCustomDest, setShowCustomDest] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // { uri, size, type }
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Web Live Camera Viewfinder State
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamFacing, setWebcamFacing] = useState("user");

  useEffect(() => {
    if (visible) {
      checkAuth();
    } else {
      stopWebcamStream();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      stopWebcamStream();
    };
  }, []);

  const stopWebcamStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping webcam tracks:", e);
      }
      streamRef.current = null;
    }
    setWebcamActive(false);
  };

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
    setSelectedPhoto(null);
    setErrorMsg("");
    stopWebcamStream();
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  // Gallery Picker (Native & Web)
  const handlePickFromGallery = async () => {
    try {
      setErrorMsg("");
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access gallery is required.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          setErrorMsg("Selected image exceeds 10MB limit.");
          return;
        }
        setSelectedPhoto({
          uri: asset.uri,
          size: asset.fileSize || 0,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch (err) {
      setErrorMsg("Failed to open gallery: " + (err.message || "Unknown error"));
    }
  };

  // Web Resilient File Picker Fallback with Camera capture hint
  const triggerWebFilePicker = () => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
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
          setSelectedPhoto({
            uri: reader.result,
            size: file.size,
            type: file.type || "image/jpeg",
          });
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

  // Universal Camera Capture Handler (Web, iOS, Android)
  const handleTakePhoto = async () => {
    setErrorMsg("");

    // 1. Web Desktop / Laptop Pipeline
    if (Platform.OS === "web") {
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getUserMedia === "function"
        ) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: webcamFacing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
          streamRef.current = stream;
          setWebcamActive(true);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          }, 80);
          return;
        }
      } catch (camErr) {
        console.warn("Webcam direct stream access unavailable, using resilient capture fallback:", camErr);
      }
      // Resilient fallback for insecure origins or browser blocks
      triggerWebFilePicker();
      return;
    }

    // 2. Native Mobile (iOS & Android) Pipeline
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Camera permission is required to capture travel stories.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          setErrorMsg("Captured image exceeds 10MB limit.");
          return;
        }
        setSelectedPhoto({
          uri: asset.uri,
          size: asset.fileSize || 0,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch (err) {
      setErrorMsg("Failed to capture photo: " + (err.message || "Unknown error"));
    }
  };

  // Web Webcam Snapshot Trigger
  const captureWebcamPhoto = () => {
    try {
      if (!videoRef.current || typeof document === "undefined") return;
      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (webcamFacing === "user") {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      stopWebcamStream();
      setSelectedPhoto({
        uri: dataUrl,
        size: Math.round((dataUrl.length * 3) / 4),
        type: "image/jpeg",
      });
    } catch (err) {
      console.error("Failed to capture from webcam:", err);
      setErrorMsg("Failed to snapshot webcam: " + (err.message || "Unknown error"));
      stopWebcamStream();
    }
  };

  // Web Webcam Flip Trigger
  const flipWebcam = async () => {
    const nextFacing = webcamFacing === "user" ? "environment" : "user";
    setWebcamFacing(nextFacing);
    stopWebcamStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch {
      handleTakePhoto();
    }
  };

  const handlePublish = async () => {
    if (!selectedPhoto) {
      setErrorMsg("Please select or capture a story photo.");
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
      setErrorMsg("You must be logged in to post a travel story.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      const finalDest = showCustomDest
        ? customDestination.trim() || destination
        : destination;

      const created = await createStory({
        mediaFile: selectedPhoto,
        caption: caption.trim(),
        destination: finalDest,
        visibility: "public",
      });

      if (onStoryCreated) onStoryCreated(created);
      handleClose();
    } catch (err) {
      console.error("Story creation error:", err);
      setErrorMsg(err.message || "Could not publish story. Please check your network.");
    } finally {
      setSubmitting(false);
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
            <Text style={styles.headerTitle}>ADD TO STORY</Text>
            <Text style={styles.headerSubtitle}>Expires in 24 Hours</Text>
          </View>
          <TouchableOpacity
            onPress={handlePublish}
            disabled={submitting || !selectedPhoto}
            style={[
              styles.publishBtn,
              (!selectedPhoto || submitting) && styles.publishBtnDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#D4AF37" />
            ) : (
              <Text style={[styles.publishBtnText, (!selectedPhoto || submitting) && styles.publishBtnTextDisabled]}>
                Share
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#C84C4C" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Picker / Viewfinder / Preview */}
          <View style={styles.mediaContainer}>
            {webcamActive ? (
              <View style={styles.webcamWrap}>
                {Platform.OS === "web" && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: 380,
                      borderRadius: 20,
                      objectFit: "cover",
                      backgroundColor: "#1E1B18",
                      transform: webcamFacing === "user" ? "scaleX(-1)" : "none",
                    }}
                  />
                )}
                <View style={styles.webcamControls}>
                  <TouchableOpacity
                    style={styles.webcamSecondaryBtn}
                    onPress={stopWebcamStream}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color="#1E1B18" />
                    <Text style={styles.webcamSecondaryText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.webcamCaptureBtn}
                    onPress={captureWebcamPhoto}
                    activeOpacity={0.85}
                  >
                    <View style={styles.webcamCaptureInner}>
                      <Ionicons name="camera" size={24} color="#1E1B18" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.webcamSecondaryBtn}
                    onPress={flipWebcam}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-reverse-outline" size={18} color="#1E1B18" />
                    <Text style={styles.webcamSecondaryText}>Flip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : selectedPhoto ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={() => setSelectedPhoto(null)}
                  disabled={submitting}
                >
                  <Ionicons name="close-circle" size={26} color="#FAF8F5" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickerChoices}>
                <TouchableOpacity
                  style={styles.choiceCard}
                  onPress={handlePickFromGallery}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <View style={styles.choiceIconCircle}>
                    <Ionicons name="images" size={26} color="#D4AF37" />
                  </View>
                  <Text style={styles.choiceTitle}>Photo Library</Text>
                  <Text style={styles.choiceSubtitle}>Upload from device (Max 10MB)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.choiceCard}
                  onPress={handleTakePhoto}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <View style={styles.choiceIconCircle}>
                    <Ionicons name="camera" size={26} color="#D4AF37" />
                  </View>
                  <Text style={styles.choiceTitle}>Camera</Text>
                  <Text style={styles.choiceSubtitle}>Capture a live travel moment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

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
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="location-sharp"
                    size={13}
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
              activeOpacity={0.8}
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
              placeholder="Enter destination name..."
              placeholderTextColor="#9E978E"
              value={customDestination}
              onChangeText={setCustomDestination}
              maxLength={60}
            />
          )}

          {/* Story Caption */}
          <Text style={styles.sectionLabel}>CAPTION (OPTIONAL)</Text>
          <View style={styles.captionBox}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a thought or highlight from this moment..."
              placeholderTextColor="#9E978E"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
              maxLength={280}
            />
            <Text style={styles.charCount}>{caption.length}/280</Text>
          </View>

          {/* Expiration badge */}
          <View style={styles.expirationNotice}>
            <Ionicons name="time-outline" size={18} color="#D4AF37" />
            <Text style={styles.expirationText}>
              Your story will be visible to travelers for 24 hours, after which it automatically expires.
            </Text>
          </View>

          <View style={{ height: insets.bottom + 40 }} />
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
    letterSpacing: 1.5,
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
    backgroundColor: "rgba(200, 76, 76, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#C84C4C",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    color: "#C84C4C",
    fontSize: 12,
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  mediaContainer: {
    marginBottom: 20,
  },
  pickerChoices: {
    flexDirection: "row",
    gap: 12,
  },
  choiceCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  choiceIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F4EFEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  choiceTitle: {
    color: "#1E1B18",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  choiceSubtitle: {
    color: "#7D756D",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
  previewWrap: {
    width: "100%",
    aspectRatio: 9 / 14,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F4EFEB",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  changePhotoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(28, 25, 23, 0.65)",
    borderRadius: 16,
    padding: 2,
  },
  webcamWrap: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1E1B18",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.35)",
  },
  webcamControls: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  webcamSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(250, 248, 245, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
  },
  webcamSecondaryText: {
    color: "#1E1B18",
    fontSize: 12,
    fontWeight: "700",
  },
  webcamCaptureBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(212, 175, 55, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  webcamCaptureInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    borderColor: "rgba(197, 168, 128, 0.38)",
    color: "#1E1B18",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  captionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5DFD5",
    padding: 14,
    marginBottom: 16,
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  captionInput: {
    color: "#1E1B18",
    fontSize: 14,
    minHeight: 64,
    lineHeight: 20,
  },
  charCount: {
    color: "#7D756D",
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  expirationNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4EFEB",
    padding: 14,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.32)",
    marginTop: 8,
  },
  expirationText: {
    color: "#574F47",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
