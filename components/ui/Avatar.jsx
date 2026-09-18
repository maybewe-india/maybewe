import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, RADII } from '../../lib/theme';

export default function Avatar({
  uri,
  size = 48,
  name,
  online = false,
  verified = false,
  style,
  ringVariant = 'default', // 'default' | 'lavender' | 'peach' | 'none'
}) {
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
      ? GRADIENTS.lavenderViolet
      : ringVariant === 'peach'
      ? [COLORS.peach, COLORS.sunset]
      : ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.10)'];

  return (
    <View style={[styles.container, style]}>
      {ringVariant !== 'none' ? (
        <LinearGradient
          colors={ringColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
        >
          <View style={[styles.ringInner, { width: size, height: size, borderRadius: size / 2 }]}>
            {uri ? (
              <Image
                source={{ uri }}
                style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
              />
            ) : (
              <View
                style={[
                  styles.placeholder,
                  { width: size, height: size, borderRadius: size / 2 },
                ]}
              >
                <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
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
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
      )}

      {online && (
        <View style={[styles.onlineDot, { right: 0, bottom: 0 }]} />
      )}

      {verified && (
        <View style={[styles.verifiedBadge, { right: -2, top: -2 }]}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.lavender} />
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
    backgroundColor: COLORS.surface,
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  initials: {
    color: COLORS.lavender,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
});
