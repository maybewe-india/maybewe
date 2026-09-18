import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS, RADII } from '../../lib/theme';

function ShimmerBox({ width, height, borderRadius, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: borderRadius || RADII.md, opacity },
        styles.shimmer,
        style,
      ]}
    />
  );
}

export default function SkeletonCard({ height = 280 }) {
  return (
    <View style={[styles.card, { height }]}>
      {/* Image area */}
      <ShimmerBox width="100%" height={height * 0.55} borderRadius={0} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.row}>
          <ShimmerBox width={44} height={44} borderRadius={22} />
          <View style={styles.textBlock}>
            <ShimmerBox width={120} height={14} style={{ marginBottom: 6 }} />
            <ShimmerBox width={80} height={11} />
          </View>
        </View>
        <ShimmerBox width="90%" height={11} style={{ marginTop: 12, marginBottom: 6 }} />
        <ShimmerBox width="70%" height={11} />
        <View style={styles.chipRow}>
          <ShimmerBox width={60} height={26} borderRadius={13} style={{ marginRight: 8 }} />
          <ShimmerBox width={70} height={26} borderRadius={13} style={{ marginRight: 8 }} />
          <ShimmerBox width={55} height={26} borderRadius={13} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII['3xl'],
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shimmer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textBlock: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
});
