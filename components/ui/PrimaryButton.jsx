import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RADII, SHADOWS, FONTS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

/**
 * Premium PrimaryButton
 * variant: 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost' | 'peach'
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
  const { colors, isDark } = useTheme();
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADII.lg },
    md: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: RADII.xl },
    lg: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: RADII['2xl'] },
  };

  const textSizes = {
    sm: { fontSize: 13 },
    md: { fontSize: 15 },
    lg: { fontSize: 17 },
  };

  if (variant === 'primary') {
    const primaryGradient = isDark ? ['#FFFFFF', '#F2F5F8'] : ['#F1F5F9', '#E2E8F0'];
    const primaryTextColor = '#0F172A';

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.82}
        style={[styles.base, { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: RADII.full }, style, isDisabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <LinearGradient
          colors={primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientInner, sizeStyles[size], SHADOWS.soft]}
        >
          {loading ? (
            <ActivityIndicator color={primaryTextColor} size="small" />
          ) : (
            <View style={styles.innerRow}>
              {icon && <Ionicons name={icon} size={18} color={primaryTextColor} style={styles.iconLeft} />}
              <Text style={[styles.primaryText, textSizes[size], { color: primaryTextColor }, textStyle]}>{title}</Text>
              {iconRight && <Ionicons name={iconRight} size={18} color={primaryTextColor} style={styles.iconRight} />}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'peach') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.82}
        style={[styles.base, style, isDisabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <LinearGradient
          colors={[colors.peach, colors.sunset]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientInner, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.innerRow}>
              {icon && <Ionicons name={icon} size={18} color="#FFFFFF" style={styles.iconLeft} />}
              <Text style={[styles.primaryText, textSizes[size], { color: '#FFFFFF' }, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.base,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1',
            alignItems: 'center',
            justifyContent: 'center',
          },
          sizeStyles[size],
          style,
          isDisabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} size="small" />
        ) : (
          <View style={styles.innerRow}>
            {icon && <Ionicons name={icon} size={18} color={colors.textPrimary} style={styles.iconLeft} />}
            <Text style={[styles.secondaryText, textSizes[size], { color: colors.textPrimary }, textStyle]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'glass') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.base,
          {
            backgroundColor: colors.surfaceGlass,
            borderWidth: 1.5,
            borderColor: colors.borderGlass,
            alignItems: 'center',
            justifyContent: 'center',
          },
          sizeStyles[size],
          style,
          isDisabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} size="small" />
        ) : (
          <View style={styles.innerRow}>
            {icon && <Ionicons name={icon} size={18} color={colors.textPrimary} style={styles.iconLeft} />}
            <Text style={[styles.glassText, textSizes[size], { color: colors.textPrimary }, textStyle]}>{title}</Text>
            {iconRight && <Ionicons name={iconRight} size={18} color={colors.textPrimary} style={styles.iconRight} />}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.82}
        style={[
          styles.base,
          {
            backgroundColor: colors.dangerBg,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255, 125, 138, 0.30)' : 'rgba(220, 38, 38, 0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          },
          sizeStyles[size],
          style,
          isDisabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color={colors.danger} size="small" />
        ) : (
          <View style={styles.innerRow}>
            {icon && <Ionicons name={icon} size={18} color={colors.danger} style={styles.iconLeft} />}
            <Text style={[styles.dangerText, textSizes[size], { color: colors.danger }, textStyle]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ghost / text
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[styles.base, styles.ghostBtn, style, isDisabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.innerRow}>
        {icon && <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.iconLeft} />}
        <Text style={[styles.ghostText, textSizes[size], { color: colors.textMuted }, textStyle]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  gradientInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  glassText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dangerText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  ghostText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
});
