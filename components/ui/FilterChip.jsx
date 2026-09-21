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

  const activeGradient = isDark ? ['#FFFFFF', '#F0F4F8'] : ['#061522', '#10283A'];
  const activeTextColor = isDark ? '#061522' : '#FFFFFF';

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
          colors={activeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { paddingVertical: paddingV, paddingHorizontal: paddingH }]}
        >
          <Text style={[styles.selectedText, { fontSize, color: activeTextColor }]}>{label}</Text>
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
        {
          backgroundColor: colors.chipBg,
          borderColor: colors.chipBorder,
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
      <Text style={[styles.unselectedText, { fontSize, color: colors.textSecondary }]}>{label}</Text>
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
