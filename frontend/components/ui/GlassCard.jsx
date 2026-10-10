import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { RADII, SHADOWS, GLASS_MATERIALS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

/**
 * Frosted Luxury Glass Card
 * Features:
 * - Translucent luxury glass materials (pearl, light, champagne, sage)
 * - Realistic backdrop blur
 * - 1px refined translucent border
 * - Physical 3D ambient shadow separation
 * - Internal top reflection highlight
 */
export default function GlassCard({
  children,
  style,
  elevated = false,
  noPadding = false,
  variant = 'glass', // 'glass' | 'solid'
  material = 'pearl', // 'pearl' | 'light' | 'champagne' | 'sage'
}) {
  const { colors } = useTheme();
  const glassStyle = GLASS_STYLES[material] || GLASS_STYLES.pearl;

  return (
    <View
      style={[
        styles.card,
        variant === 'glass'
          ? [styles.glassBase, glassStyle]
          : { backgroundColor: elevated ? colors.surfaceElevated : colors.cardBg },
        elevated ? styles.elevated : styles.standard,
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {/* Subtle top inner reflection line */}
      <View style={styles.topInnerHighlight} pointerEvents="none" />
      {children}
    </View>
  );
}

const GLASS_STYLES = StyleSheet.create({
  pearl: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderColor: "rgba(197, 168, 128, 0.28)",
  },
  light: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "rgba(197, 168, 128, 0.28)",
  },
  champagne: {
    backgroundColor: "rgba(197, 168, 128, 0.16)",
    borderColor: "rgba(197, 168, 128, 0.35)",
  },
  sage: {
    backgroundColor: "rgba(244, 239, 235, 0.70)",
    borderColor: "rgba(197, 168, 128, 0.20)",
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.28)',
    overflow: 'hidden',
    position: 'relative',
  },
  glassBase: {
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      },
      default: {},
    }),
  },
  topInnerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    zIndex: 1,
  },
  standard: {
    ...Platform.select({
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 16px -2px rgba(29, 29, 27, 0.06), 0 1px 3px rgba(29, 29, 27, 0.03)',
      },
    }),
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 12px 28px -4px rgba(29, 29, 27, 0.10), 0 3px 8px -1px rgba(29, 29, 27, 0.05)',
      },
    }),
  },
  noPadding: {
    padding: 0,
  },
});
