import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/themeContext';

export default function Avatar({
  uri,
  size = 48,
  name,
  online = false,
  verified = false,
  style,
  ringVariant = 'default', // 'default' | 'lavender' | 'peach' | 'none'
}) {
  const { colors, isDark } = useTheme();

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const ringSize = size + 6;
  const ringColors =
    ringVariant === 'lavender'
      ? ['#CBD5E1', '#E2E8F0']
      : ringVariant === 'peach'
      ? [colors.peach, colors.sunset]
      : ['#E2E8F0', '#F1F5F9'];

  return (
    <View style={[styles.container, style]}>
      {ringVariant !== 'none' ? (
        <LinearGradient
          colors={ringColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
        >
          <View style={[styles.ringInner, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }]}>
            {uri ? (
              <Image
                source={{ uri }}
                style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
              />
            ) : (
              <View
                style={[
                  styles.placeholder,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.initials, { fontSize: size * 0.35, color: colors.primary }]}>{initials}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      ) : uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.35, color: colors.primary }]}>{initials}</Text>
        </View>
      )}

      {online && (
        <View style={[styles.onlineDot, { right: 0, bottom: 0, backgroundColor: colors.success, borderColor: colors.background }]} />
      )}

      {verified && (
        <View style={[styles.verifiedBadge, { right: -2, top: -2, backgroundColor: colors.background }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  ringInner: {
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initials: {
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    borderRadius: 8,
  },
});
