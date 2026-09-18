import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADII, SHADOWS } from '../../lib/theme';

/**
 * Premium dark glass surface card
 */
export default function GlassCard({ children, style, elevated = false, noPadding = false }) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADII['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  elevated: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.borderGlass,
  },
  noPadding: {
    padding: 0,
  },
});
