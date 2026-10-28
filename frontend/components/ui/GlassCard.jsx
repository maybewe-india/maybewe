import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { RADII, SHADOWS, GLASS_MATERIALS, ANDROID_CARD_SURFACES } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

/**
 * Properties that govern internal child layout and content padding.
 * On Android two-tier cards, these are routed to the inner clipping container.
 */
const INNER_STYLE_KEYS = new Set([
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'alignContent',
  'flexWrap',
  'gap',
  'rowGap',
  'columnGap',
]);

const BORDER_RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
];

/**
 * Splits and partitions style definitions for Android native cards:
 * - Outer View: elevation shadow, outer bounds, margins, solid background, borders, overflow: 'visible'
 * - Inner View: overflow: 'hidden' (child clipping), transparent background, inner padding, child flex alignment
 */
function partitionAndroidCardStyles(flatStyle = {}, options = {}) {
  const {
    elevated = false,
    noPadding = false,
    variant = 'glass',
    material = 'pearl',
    colors = {},
  } = options;

  const defaultBorderColor = ANDROID_CARD_SURFACES?.surfaceBorder || 'rgba(197, 168, 128, 0.40)';
  const defaultBgColor =
    variant === 'glass'
      ? (material === 'champagne'
          ? (ANDROID_CARD_SURFACES?.champagne || '#FAF6F0')
          : material === 'sage'
          ? (ANDROID_CARD_SURFACES?.sage || '#F5F2EC')
          : '#FFFFFF')
      : (elevated ? (colors?.surfaceElevated || '#FFFFFF') : (colors?.cardBg || '#FFFFFF'));

  const outerStyle = {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: defaultBorderColor,
    backgroundColor: defaultBgColor,
    elevation: elevated ? 4 : 2,
    position: 'relative',
    overflow: 'visible',
  };

  const innerStyle = {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    width: '100%',
    flexGrow: 1,
    padding: noPadding ? 0 : 20,
  };

  for (const [key, value] of Object.entries(flatStyle)) {
    if (value === undefined) continue;

    if (INNER_STYLE_KEYS.has(key)) {
      innerStyle[key] = value;
    } else {
      outerStyle[key] = value;
      if (BORDER_RADIUS_KEYS.includes(key)) {
        innerStyle[key] = value;
      }
    }
  }

  // Enforce critical rendering invariants for Android elevation vs child clipping
  outerStyle.overflow = 'visible';
  innerStyle.overflow = 'hidden';
  innerStyle.backgroundColor = 'transparent';

  return { outerStyle, innerStyle };
}

/**
 * Frosted Luxury Glass Card
 * Clean, consistent styling across Web, iOS, and Native Android.
 * - Native Android: two-tier architecture fixes child clipping while preserving elevation shadows
 * - Web/iOS: single View with backdrop blur and subtle diffuse ambient shadow
 * - Eliminates internal highlight collision with card borders
 */
export default function GlassCard({
  children,
  style,
  elevated = false,
  noPadding = false,
  variant = 'glass', // 'glass' | 'solid'
  material = 'pearl', // 'pearl' | 'light' | 'champagne' | 'sage'
  ...rest
}) {
  const { colors, isDark } = useTheme();
  const glassStyle = GLASS_STYLES[material] || GLASS_STYLES.pearl;

  // Single-view structure for Web and iOS: 100% byte-for-byte fidelity and zero wrapper overhead
  if (Platform.OS !== 'android') {
    return (
      <View
        style={[
          styles.card,
          variant === 'glass'
            ? [styles.glassBase, glassStyle]
            : { backgroundColor: elevated ? colors?.surfaceElevated : colors?.cardBg },
          elevated ? styles.elevated : styles.standard,
          noPadding && styles.noPadding,
          style,
        ]}
        {...rest}
      >
        {Platform.OS === 'web' && (
          <View style={styles.topInnerHighlight} pointerEvents="none" />
        )}
        {children}
      </View>
    );
  }

  // Android: Decouple outer elevation container (overflow: visible) from inner clipping view (overflow: hidden)
  const flatStyle = StyleSheet.flatten ? StyleSheet.flatten(style) || {} : (Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : (style || {}));
  const { outerStyle, innerStyle } = partitionAndroidCardStyles(flatStyle, {
    elevated,
    noPadding,
    variant,
    material,
    colors,
  });

  return (
    <View style={outerStyle} {...rest}>
      <View style={innerStyle}>
        {children}
      </View>
    </View>
  );
}

const GLASS_STYLES = StyleSheet.create({
  pearl: {
    backgroundColor: Platform.select({
      android: '#FFFFFF',
      default: 'rgba(255, 255, 255, 0.92)',
    }),
    borderColor: Platform.select({
      android: ANDROID_CARD_SURFACES?.surfaceBorder || 'rgba(197, 168, 128, 0.40)',
      default: 'rgba(197, 168, 128, 0.28)',
    }),
  },
  light: {
    backgroundColor: Platform.select({
      android: '#FFFFFF',
      default: 'rgba(255, 255, 255, 0.96)',
    }),
    borderColor: Platform.select({
      android: ANDROID_CARD_SURFACES?.surfaceBorder || 'rgba(197, 168, 128, 0.40)',
      default: 'rgba(197, 168, 128, 0.28)',
    }),
  },
  champagne: {
    backgroundColor: Platform.select({
      android: ANDROID_CARD_SURFACES?.champagne || '#FAF6F0',
      default: 'rgba(197, 168, 128, 0.16)',
    }),
    borderColor: Platform.select({
      android: ANDROID_CARD_SURFACES?.surfaceBorder || 'rgba(197, 168, 128, 0.40)',
      default: 'rgba(197, 168, 128, 0.32)',
    }),
  },
  sage: {
    backgroundColor: Platform.select({
      android: ANDROID_CARD_SURFACES?.sage || '#F5F2EC',
      default: 'rgba(244, 239, 235, 0.75)',
    }),
    borderColor: Platform.select({
      android: ANDROID_CARD_SURFACES?.surfaceBorder || 'rgba(197, 168, 128, 0.40)',
      default: 'rgba(197, 168, 128, 0.22)',
    }),
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.28)',
    position: 'relative',
    ...Platform.select({
      android: {
        borderColor: ANDROID_CARD_SURFACES?.surfaceBorder || 'rgba(197, 168, 128, 0.40)',
        overflow: 'visible',
      },
      default: {
        overflow: 'hidden',
      },
    }),
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
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    zIndex: 1,
  },
  standard: {
    ...Platform.select({
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
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
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 12px 28px -4px rgba(29, 29, 27, 0.08), 0 3px 8px -1px rgba(29, 29, 27, 0.04)',
      },
    }),
  },
  noPadding: {
    padding: 0,
  },
});
