import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS } from '../../lib/theme';

/**
 * Premium PrimaryButton
 * variant: 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost'
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
          colors={['#FFFFFF', '#F2F5F8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientInner, sizeStyles[size], SHADOWS.lavender]}
        >
          {loading ? (
            <ActivityIndicator color="#061522" size="small" />
          ) : (
            <View style={styles.innerRow}>
              {icon && <Ionicons name={icon} size={18} color="#061522" style={styles.iconLeft} />}
              <Text style={[styles.primaryText, textSizes[size], textStyle]}>{title}</Text>
              {iconRight && <Ionicons name={iconRight} size={18} color="#061522" style={styles.iconRight} />}
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
          colors={[COLORS.peach, COLORS.sunset]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientInner, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.innerRow}>
              {icon && <Ionicons name={icon} size={18} color="#FFFFFF" style={styles.iconLeft} />}
              <Text style={[styles.primaryText, textSizes[size], textStyle]}>{title}</Text>
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
          styles.secondaryBtn,
          sizeStyles[size],
          style,
          isDisabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.innerRow}>
            {icon && <Ionicons name={icon} size={18} color="#FFFFFF" style={styles.iconLeft} />}
            <Text style={[styles.secondaryText, textSizes[size], textStyle]}>{title}</Text>
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
          styles.glassBtn,
          sizeStyles[size],
          style,
          isDisabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.innerRow}>
            {icon && <Ionicons name={icon} size={18} color="#FFFFFF" style={styles.iconLeft} />}
            <Text style={[styles.glassText, textSizes[size], textStyle]}>{title}</Text>
            {iconRight && <Ionicons name={iconRight} size={18} color="#FFFFFF" style={styles.iconRight} />}
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
        style={[styles.base, styles.dangerBtn, sizeStyles[size], style, isDisabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.danger} size="small" />
        ) : (
          <View style={styles.innerRow}>
            {icon && <Ionicons name={icon} size={18} color={COLORS.danger} style={styles.iconLeft} />}
            <Text style={[styles.dangerText, textSizes[size], textStyle]}>{title}</Text>
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
        {icon && <Ionicons name={icon} size={16} color={COLORS.textMuted} style={styles.iconLeft} />}
        <Text style={[styles.ghostText, textSizes[size], textStyle]}>{title}</Text>
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
    color: '#061522',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  glassBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dangerBtn: {
    backgroundColor: 'rgba(255, 125, 138, 0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 125, 138, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {
    fontFamily: FONTS.bold,
    color: COLORS.danger,
    fontWeight: '700',
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  ghostText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
});
