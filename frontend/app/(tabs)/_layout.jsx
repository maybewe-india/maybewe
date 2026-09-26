import React from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADII, SHADOWS } from '../../lib/theme';
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
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.floatingWrapper,
        { bottom: Math.max(insets.bottom, 12) + 6 },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.tabBarContainer}>
        {/* Top inner glass highlight */}
        <View style={styles.tabBarTopHighlight} pointerEvents="none" />

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
              activeOpacity={0.8}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={tab.label}
            >
              {isFocused ? (
                <View style={styles.activePill}>
                  <View style={styles.champagneActiveDot} />
                  <Ionicons name={tab.iconFocused} size={15} color="#FAF8F3" />
                  <Text style={styles.activeLabel}>{tab.label}</Text>
                </View>
              ) : (
                <View style={styles.inactiveItem}>
                  <Ionicons name={tab.iconBlur} size={18} color="#918E87" />
                  <Text style={styles.inactiveLabel}>{tab.label}</Text>
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
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(250, 248, 243, 0.92)', // Frosted Ivory Glass
    borderRadius: RADII.xl,
    paddingVertical: 6,
    paddingHorizontal: 6,
    width: '100%',
    maxWidth: 450,
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.75)', // Soft stone border
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
      web: {
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 16px 36px -4px rgba(29, 29, 27, 0.12), 0 4px 12px -2px rgba(29, 29, 27, 0.06)',
      },
    }),
  },
  tabBarTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D1D1B', // Deep graphite physical surface
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(29, 29, 27, 0.22)',
      },
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  champagneActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C8B27A', // Champagne active indicator
  },
  activeLabel: {
    color: '#FAF8F3', // Soft pearl text
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inactiveItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  inactiveLabel: {
    color: '#918E87', // Warm grey
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
