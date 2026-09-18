import React from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, RADII, SHADOWS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

const TABS = [
  { name: 'index', label: 'Home', iconFocused: 'compass', iconBlur: 'compass-outline' },
  { name: 'discovery', label: 'Discover', iconFocused: 'sparkles', iconBlur: 'sparkles-outline' },
  { name: 'matches', label: 'Chat', iconFocused: 'chatbubbles', iconBlur: 'chatbubbles-outline' },
  { name: 'trips', label: 'Trips', iconFocused: 'briefcase', iconBlur: 'briefcase-outline' },
  { name: 'profile', label: 'Profile', iconFocused: 'person', iconBlur: 'person-outline' },
];

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  return (
    <View
      style={[
        styles.floatingWrapper,
        { bottom: Math.max(insets.bottom, 12) + 4 },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.tabBarContainer,
          SHADOWS.card,
          {
            backgroundColor: isDark ? 'rgba(6, 21, 34, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(6, 21, 34, 0.12)',
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name) || {
            label: route.name,
            iconFocused: 'ellipse',
            iconBlur: 'ellipse-outline',
          };
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={tab.label}
            >
              {isFocused ? (
                <LinearGradient
                  colors={isDark ? ['#FFFFFF', '#F0F4F8'] : ['#061522', '#10283A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activePill}
                >
                  <Ionicons name={tab.iconFocused} size={17} color={isDark ? '#061522' : '#FFFFFF'} />
                  <Text style={[styles.activeLabel, { color: isDark ? '#061522' : '#FFFFFF' }]}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveItem}>
                  <Ionicons name={tab.iconBlur} size={20} color={colors.textMuted} />
                  <Text style={[styles.inactiveLabel, { color: colors.textMuted }]}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="discovery" options={{ title: 'Discover' }} />
      <Tabs.Screen name="matches" options={{ title: 'Chat' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 100,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(6, 21, 34, 0.92)',
    borderRadius: RADII['4xl'],
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADII['3xl'],
    gap: 5,
    ...SHADOWS.soft,
  },
  activeLabel: {
    color: '#061522',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  inactiveItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  inactiveLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
