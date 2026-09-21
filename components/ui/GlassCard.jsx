import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { RADII, SHADOWS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

/**
 * Premium glass surface card supporting dynamic dark/light themes
 */
export default function GlassCard({ children, style, elevated = false, noPadding = false }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surfaceGlass,
          borderColor: elevated ? colors.borderGlass : colors.border,
        },
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
    borderRadius: RADII['2xl'],
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        backdropFilter: 'blur(16px)',
      },
    }),
  },
  elevated: {
    ...SHADOWS.card,
  },
  noPadding: {
    padding: 0,
  },
});
