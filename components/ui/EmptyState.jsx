import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RADII, FONTS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

export default function EmptyState({
  icon = 'earth-outline',
  title,
  description,
  actionTitle,
  onAction,
  style,
  accentColor,
}) {
  const { colors, isDark } = useTheme();
  const accent = accentColor || colors.primary;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
        <LinearGradient
          colors={isDark ? ['#FFFFFF', '#F0F4F8'] : ['#061522', '#10283A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Ionicons name={icon} size={32} color={isDark ? '#061522' : '#FFFFFF'} />
        </LinearGradient>
      </View>

      {title && <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>}
      {description && <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>}

      {actionTitle && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: accent }]}>{actionTitle}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 24,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
});
