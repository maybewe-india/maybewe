import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { FONTS } from "../lib/theme";
import InputField from "../components/ui/InputField";
import { useAuth } from "../lib/authContext";
import { requestCurrentLocation, reverseGeocodeLocation } from "../lib/locationService";
import { uploadAvatarMedia } from "../lib/mediaUpload";

function sanitizeProfileLocation(p) {
  if (p?.location && typeof p.location === "string" && p.location.trim().length > 0) {
    return p.location.trim();
  }
  if (p?.city && typeof p.city === "string" && p.city.trim().length > 0) {
    return p.state ? `${p.city.trim()}, ${p.state.trim()}` : p.city.trim();
  }
  return "";
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useAuth();

  const [name, setName] = useState(profile?.name || "");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [location, setLocation] = useState(sanitizeProfileLocation(profile));
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age ? String(profile.age) : "");
      setLocation(sanitizeProfileLocation(profile));
      setBio(profile.bio || "");
      setAvatar(profile.avatar_url || "");
    }
  }, [profile]);

  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setAvatar(res.assets[0].uri);
      }
    } catch (e) {
      console.warn("Image picker error:", e);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setAvatar(res.assets[0].uri);
      }
    } catch (e) {
      console.warn("Camera error:", e);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await requestCurrentLocation({ forceRefresh: true });
      if (loc && typeof loc.latitude === "number") {
        const applyLocation = async () => {
          const geo = await reverseGeocodeLocation(loc.latitude, loc.longitude);
          if (geo && (geo.city || geo.state)) {
            const label = [geo.city, geo.state].filter(Boolean).join(", ");
            setLocation(label);
          } else {
            setLocation(`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
          }
        };

        const isCoarse = loc.isCoarse || loc.isProvisional || loc.confidence === "COARSE" || (typeof loc.accuracy === "number" && loc.accuracy > 150);
        if (isCoarse) {
          const approxRadius = Math.round(loc.accuracy || loc.accuracyRadiusMeters || 1000);
          Alert.alert(
            "Approximate Location Warning",
            `GPS fix is approximate (±${approxRadius}m). You can use this approximate location, wait for better satellite reception, or enter your city manually.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Use Approximate", onPress: applyLocation },
            ]
          );
        } else {
          await applyLocation();
        }
      } else {
        Alert.alert("GPS Notice", "Could not acquire fresh GPS fix. Please ensure location services are enabled.");
      }
    } catch (e) {
      Alert.alert("GPS Notice", "Could not determine current location.");
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let city = "";
      let state = "";
      const cleanLoc = location.trim();
      if (cleanLoc.length > 0) {
        const parts = cleanLoc.split(",").map((s) => s.trim());
        city = parts[0] || "";
        state = parts[1] || "";
      }

      let finalAvatarUrl = avatar;
      if (
        avatar &&
        typeof avatar === 'string' &&
        (avatar.startsWith('file://') ||
          avatar.startsWith('content://') ||
          avatar.startsWith('blob:') ||
          avatar.startsWith('data:'))
      ) {
        try {
          finalAvatarUrl = await uploadAvatarMedia({
            uri: avatar,
            userId: profile?.id || 'anonymous',
          });
        } catch (uploadErr) {
          console.warn('[EditProfile] Avatar upload to Supabase storage failed:', uploadErr);
        }
      }

      if (updateProfile) {
        await updateProfile({
          name: name.trim(),
          age: parseInt(age, 10) || null,
          location: cleanLoc,
          city,
          state,
          bio: bio.trim(),
          avatar_url: finalAvatarUrl,
        });
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/profile");
      }
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "android" ? "height" : "padding"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
      style={styles.root}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to Profile"
            >
              <Ionicons name="chevron-back" size={20} color="#1E1B18" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollBody,
              { paddingBottom: Math.max(insets.bottom, 24) + 40 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo Uploader with Clean Pill Actions */}
            <View style={styles.photoContainer}>
              <View style={styles.photoWrap}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.photoImg} />
                ) : (
                  <View style={styles.photoEmpty}>
                    <Ionicons name="person" size={40} color="#C5A880" />
                  </View>
                )}
              </View>

              <View style={styles.photoBtnRow}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={15} color="#1E1B18" style={{ marginRight: 6 }} />
                  <Text style={styles.actionPillText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={15} color="#1E1B18" style={{ marginRight: 6 }} />
                  <Text style={styles.actionPillText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Crisp Ivory Floating Fields with Warm Micro-Labels */}
            <View style={styles.floatingCard}>
              <InputField
                label="FULL NAME"
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                icon="person-outline"
              />

              <InputField
                label="AGE"
                value={age}
                onChangeText={setAge}
                placeholder="24"
                keyboardType="numeric"
                icon="calendar-outline"
              />

              <View style={styles.fieldSection}>
                <View style={styles.locationHeaderRow}>
                  <Text style={styles.fieldSubLabel}>LOCATION</Text>
                  <TouchableOpacity
                    onPress={handleUseCurrentLocation}
                    disabled={locating}
                    style={styles.useGpsPill}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Use current GPS location"
                  >
                    {locating ? (
                      <ActivityIndicator size="small" color="#A1824A" style={{ marginRight: 4 }} />
                    ) : (
                      <Ionicons name="navigate-outline" size={13} color="#A1824A" style={{ marginRight: 4 }} />
                    )}
                    <Text style={styles.useGpsText}>
                      {locating ? "Acquiring GPS..." : "Use Current Location"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <InputField
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Chennai, Tamil Nadu"
                  icon="location-outline"
                />
              </View>

              <InputField
                label="TRAVEL PHILOSOPHY & BIO"
                value={bio}
                onChangeText={setBio}
                placeholder="Share your travel philosophy..."
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Save Button: Warm Espresso Capsule with subtle gold highlight */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save Profile Changes"
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving Changes..." : "Save Profile Changes"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(28, 25, 23, 0.06)",
    backgroundColor: "#FAF8F5",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: "#1E1B18",
  },
  scrollBody: {
    padding: 20,
    flexGrow: 1,
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  photoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#C5A880",
    backgroundColor: "#F4EFEB",
    marginBottom: 16,
  },
  photoImg: {
    width: "100%",
    height: "100%",
  },
  photoEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  actionPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: "#1E1B18",
  },
  floatingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 24,
  },
  fieldSection: {
    marginBottom: 12,
  },
  locationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldSubLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: "#7D756D",
    letterSpacing: 1.2,
  },
  useGpsPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: "rgba(197, 168, 128, 0.12)",
  },
  useGpsText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: "#A1824A",
  },
  saveBtn: {
    width: "100%",
    height: 52,
    borderRadius: 9999,
    backgroundColor: "#1C1917",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.40)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 14,
    elevation: 4,
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: "#FAF8F5",
    letterSpacing: 0.2,
  },
});
