import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADII, FONTS } from "../../lib/theme.js";

export default function FeedEmptyState({ onCreatePost, onCreatePress, onRefresh, destination = "All" }) {
  const handleCreate = onCreatePost || onCreatePress;
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="images-outline" size={36} color="#D4AF37" />
      </View>
      <Text style={styles.title}>
        {destination && destination !== "All" ? `No Stories in ${destination}` : "No Travel Stories Yet"}
      </Text>
      <Text style={styles.subtitle}>
        No posts yet. Follow travelers or create your first post!
      </Text>
      <View style={styles.btnRow}>
        {handleCreate && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={18} color="#0B0C0E" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Share Story</Text>
          </TouchableOpacity>
        )}
        {onRefresh && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onRefresh} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color="#FAF8F3" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Refresh</Text>
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
    backgroundColor: "#17181C",
    borderRadius: RADII.xl,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    color: "#FAF8F3",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#918E87",
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bold,
    color: "#FAF8F3",
    fontSize: 13,
    fontWeight: "600",
  },
});
