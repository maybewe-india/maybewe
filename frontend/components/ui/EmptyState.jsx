import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADII, FONTS, PALETTE } from '../../lib/theme';
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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }]}>
        <View style={[styles.iconInner, { backgroundColor: 'rgba(244, 241, 234, 0.70)' }]}>
          <Ionicons name={icon} size={28} color="#756345" />
        </View>
      </View>

      {title && <Text style={[styles.title, { color: '#171715' }]}>{title}</Text>}
      {description && <Text style={[styles.description, { color: '#66645F' }]}>{description}</Text>}

      {actionTitle && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: '#1D1D1B', borderColor: 'rgba(255, 255, 255, 0.12)' }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: '#FAF8F3' }]}>{actionTitle}</Text>
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
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 24,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
});
