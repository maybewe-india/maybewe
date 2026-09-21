import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

export default function GradientHeader({
  title,
  subtitle,
  rightIcon,
  rightAction,
  leftIcon,
  leftAction,
  transparent = false,
  style,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        transparent ? styles.transparent : [styles.solid, { backgroundColor: colors.background, borderBottomColor: colors.border }],
        { paddingTop: insets.top + 10 },
        style,
      ]}
    >
      <View style={styles.inner}>
        {leftIcon && leftAction ? (
          <TouchableOpacity
            onPress={leftAction}
            style={[styles.iconBtn, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={leftIcon} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        <View style={styles.titleBlock}>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: isDark ? 'rgba(255, 255, 255, 0.85)' : colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {rightIcon && rightAction ? (
          <TouchableOpacity
            onPress={rightAction}
            style={[styles.iconBtn, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightIcon} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  solid: {
    borderBottomWidth: 1,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 40,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
