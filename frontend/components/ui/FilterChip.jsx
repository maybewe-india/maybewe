import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADII, FONTS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

export default function FilterChip({
  label,
  selected,
  onPress,
  size = 'md',
  style,
}) {
  const { colors, isDark } = useTheme();
  const paddingV = size === 'small' ? 6 : 9;
  const paddingH = size === 'small' ? 12 : 16;
  const fontSize = size === 'small' ? 12 : 13;

  if (selected) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          styles.base,
          {
            backgroundColor: '#1D1D1B',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            paddingVertical: paddingV,
            paddingHorizontal: paddingH,
          },
          style,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        accessibilityLabel={label}
      >
        <Text style={[styles.selectedText, { fontSize, color: '#FAF8F3' }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: 'rgba(250, 248, 243, 0.92)',
          borderColor: 'rgba(216, 212, 203, 0.75)',
          borderWidth: 1,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: false }}
      accessibilityLabel={label}
    >
      <Text style={[styles.unselectedText, { fontSize, color: '#66645F' }]}>{label}</Text>
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
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  unselectedText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
