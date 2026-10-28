import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADII, FONTS } from "../../lib/theme.js";
import { useTheme } from "../../lib/themeContext.jsx";

export default function FeedEmptyState({ onCreatePost, onCreatePress, onRefresh, destination = "All" }) {
  const { isDark, colors } = useTheme();
  const handleCreate = onCreatePost || onCreatePress;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#17181C" : "#FFFFFF",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
        },
      ]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="images-outline" size={36} color="#D4AF37" />
      </View>
      <Text style={[styles.title, { color: isDark ? "#FAF8F3" : "#1C1917" }]}>
        {destination && destination !== "All" ? `No Stories in ${destination}` : "No Travel Stories Yet"}
      </Text>
      <Text style={[styles.subtitle, { color: isDark ? "#918E87" : "#6E6B65" }]}>
        No posts yet — be the first to share your journey.
      {/* No posts yet. Follow travelers or create your first post! */}
      </Text>
      <View style={styles.btnRow}>
        {handleCreate && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={18} color="#0B0C0E" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Share Story</Text>
          </TouchableOpacity>
        )}
        {onRefresh && (
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)" },
            ]}
            onPress={onRefresh}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={isDark ? "#FAF8F3" : "#1C1917"} style={{ marginRight: 6 }} />
            <Text style={[styles.secondaryBtnText, { color: isDark ? "#FAF8F3" : "#1C1917" }]}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 28,
    borderRadius: RADII.xl,
    marginVertical: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D4AF37",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  primaryBtnText: {
    fontFamily: FONTS.bold,
    color: "#0B0C0E",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: "600",
  },
});
