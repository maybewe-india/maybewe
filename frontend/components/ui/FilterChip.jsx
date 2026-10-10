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
            backgroundColor: '#1C1917',
            borderWidth: 1,
            borderColor: 'rgba(197, 168, 128, 0.40)',
            paddingVertical: paddingV,
            paddingHorizontal: paddingH,
          },
          style,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        accessibilityLabel={label}
      >
        <Text style={[styles.selectedText, { fontSize, color: '#D4AF37' }]}>{label}</Text>
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
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(197, 168, 128, 0.28)',
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
      <Text style={[styles.unselectedText, { fontSize, color: '#7D756D' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADII.full,
    marginRight: 8,
    marginBottom: 8,
  },
  gradient: {
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    fontFamily: FONTS.bold,
    letterSpacing: -0.1,
  },
  unselectedText: {
    fontFamily: FONTS.semiBold,
    letterSpacing: -0.1,
  },
});
