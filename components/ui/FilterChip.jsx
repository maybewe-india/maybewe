import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADII, FONTS } from '../../lib/theme';

export default function FilterChip({
  label,
  selected,
  onPress,
  size = 'md',
  style,
}) {
  const paddingV = size === 'small' ? 6 : 9;
  const paddingH = size === 'small' ? 12 : 16;
  const fontSize = size === 'small' ? 12 : 13;

  if (selected) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.base, style]}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        accessibilityLabel={label}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F0F4F8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { paddingVertical: paddingV, paddingHorizontal: paddingH }]}
        >
          <Text style={[styles.selectedText, { fontSize }]}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles.unselected,
        { paddingVertical: paddingV, paddingHorizontal: paddingH },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: false }}
      accessibilityLabel={label}
    >
      <Text style={[styles.unselectedText, { fontSize }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADII.full,
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    fontFamily: FONTS.bold,
    color: '#061522',
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  unselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  unselectedText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
