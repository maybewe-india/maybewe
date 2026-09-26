import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADII, FONTS, PALETTE } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

/**
 * Physical 3D Tactile Button
 * variant: 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost' | 'peach'
 * Features:
 * - Spring press physics (scale: 0.98, translateY: 1.5)
 * - Layered physical depth, inner highlights, and soft ambient drop shadows
 * - Frosted luxury glass surface for secondary variant
 */
export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  style,
  textStyle,
  size = 'md',
}) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (isDisabled) return;
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      friction: 9,
      tension: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
      friction: 9,
      tension: 300,
    }).start();
  };

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98],
  });

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.5],
  });

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 40, borderRadius: RADII.sm },
    md: { paddingVertical: 14, paddingHorizontal: 22, minHeight: 52, borderRadius: RADII.md },
    lg: { paddingVertical: 16, paddingHorizontal: 28, minHeight: 56, borderRadius: RADII.md },
  };

  const textSizes = {
    sm: { fontSize: 13 },
    md: { fontSize: 15 },
    lg: { fontSize: 16 },
  };

  // Primary: Deep graphite / near-black physical surface with subtle top highlight & 3D shadow
  if (variant === 'primary' || variant === 'peach') {
    const textColor = '#FAF8F3';

    return (
      <Animated.View style={[{ transform: [{ scale }, { translateY }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[
            styles.base,
            sizeStyles[size],
            styles.primaryButtonSurface,
            isDisabled && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <View style={styles.innerRow}>
              {icon && <Ionicons name={icon} size={18} color={textColor} style={styles.iconLeft} />}
              <Text style={[styles.primaryText, textSizes[size], { color: textColor }, textStyle]}>
                {title}
              </Text>
              {iconRight && <Ionicons name={iconRight} size={18} color={textColor} style={styles.iconRight} />}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // Secondary: Warm ivory frosted luxury glass surface with thin stone border & soft shadow
  if (variant === 'secondary' || variant === 'glass') {
    const textColor = '#1D1D1B';

    return (
      <Animated.View style={[{ transform: [{ scale }, { translateY }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[
            styles.base,
            sizeStyles[size],
            styles.secondaryGlassSurface,
            isDisabled && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <View style={styles.innerRow}>
              {icon && <Ionicons name={icon} size={18} color={textColor} style={styles.iconLeft} />}
              <Text style={[styles.secondaryText, textSizes[size], { color: textColor }, textStyle]}>
                {title}
              </Text>
              {iconRight && <Ionicons name={iconRight} size={18} color={textColor} style={styles.iconRight} />}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // Danger variant
  if (variant === 'danger') {
    return (
      <Animated.View style={[{ transform: [{ scale }, { translateY }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          style={[
            styles.base,
            sizeStyles[size],
            styles.dangerSurface,
            isDisabled && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          {loading ? (
            <ActivityIndicator color="#FAF8F3" size="small" />
          ) : (
            <View style={styles.innerRow}>
              {icon && <Ionicons name={icon} size={18} color="#FAF8F3" style={styles.iconLeft} />}
              <Text style={[styles.dangerText, textSizes[size], { color: '#FAF8F3' }, textStyle]}>
                {title}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // Ghost / text variant
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[styles.base, styles.ghostBtn, isDisabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={styles.innerRow}>
          {icon && <Ionicons name={icon} size={16} color="#66645F" style={styles.iconLeft} />}
          <Text style={[styles.ghostText, textSizes[size], { color: '#171715' }, textStyle]}>
            {title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonSurface: {
    backgroundColor: '#1D1D1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#111210',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 6px 16px -2px rgba(23, 23, 21, 0.28), 0 2px 4px -1px rgba(23, 23, 21, 0.16)',
        transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s ease',
      },
    }),
  },
  secondaryGlassSurface: {
    backgroundColor: 'rgba(250, 248, 243, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 14px -2px rgba(29, 29, 27, 0.08), 0 1px 3px rgba(29, 29, 27, 0.04)',
        transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s ease',
      },
    }),
  },
  dangerSurface: {
    backgroundColor: '#9E3A3A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#9E3A3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(158, 58, 58, 0.25)',
      },
    }),
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  primaryText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dangerText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  ghostText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  disabled: {
    opacity: 0.45,
  },
});
