import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { RADII } from "../../lib/theme.js";

export default function FeedSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.card}>
      {/* Author Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.avatar, { opacity: pulseAnim }]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Animated.View style={[styles.line, { width: 120, height: 14, opacity: pulseAnim }]} />
          <Animated.View style={[styles.line, { width: 80, height: 10, marginTop: 6, opacity: pulseAnim }]} />
        </View>
      </View>

      {/* Media Box */}
      <Animated.View style={[styles.mediaBox, { opacity: pulseAnim }]} />

      {/* Action Row */}
      <View style={styles.actions}>
        <Animated.View style={[styles.actionBtn, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.actionBtn, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.actionBtn, { opacity: pulseAnim }]} />
      </View>

      {/* Text lines */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Animated.View style={[styles.line, { width: "90%", height: 12, opacity: pulseAnim }]} />
        <Animated.View style={[styles.line, { width: "60%", height: 12, marginTop: 6, opacity: pulseAnim }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FAF8F3",
    borderRadius: RADII.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(215, 210, 200, 0.6)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E2DDD2",
  },
  line: {
    backgroundColor: "#E2DDD2",
    borderRadius: 4,
  },
  mediaBox: {
    width: "100%",
    height: 280,
    backgroundColor: "#E2DDD2",
  },
  actions: {
    flexDirection: "row",
    padding: 14,
    gap: 16,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2DDD2",
  },
});
