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
  { name: 'social', label: 'Feed', iconFocused: 'newspaper', iconBlur: 'newspaper-outline' },
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
        { bottom: Platform.OS === 'web' ? 16 : Math.max(insets.bottom, 12) + 6 },
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
              activeOpacity={0.75}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.tabIconWrap, isFocused && styles.tabIconWrapActive]}>
                <Ionicons
                  name={isFocused ? tab.iconFocused : tab.iconBlur}
                  size={19}
                  color={isFocused ? "#B99A5E" : "#7D756D"}
                />
              </View>
              <Text
                style={[styles.tabLabel, isFocused ? styles.activeLabel : styles.inactiveLabel]}
                numberOfLines={1}
                ellipsizeMode="tail"
                allowFontScaling={true}
                maxFontSizeMultiplier={1.15}
              >
                {tab.label}
              </Text>
              {isFocused ? (
                <View style={styles.champagneActiveDot} />
              ) : (
                <View style={styles.dotPlaceholder} />
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
      <Tabs.Screen name="social" options={{ title: 'Feed' }} />
      <Tabs.Screen name="matches" options={{ title: 'Chat' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(250, 248, 245, 0.85)',
    borderRadius: RADII.full,
    paddingVertical: 5,
    paddingHorizontal: 8,
    width: '94%',
    maxWidth: 460,
    minHeight: 58,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.25)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 168, 128, 0.25)',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#1D1D1B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 8px 24px -2px rgba(29, 29, 27, 0.12)',
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  tabBarTopHighlight: {
    display: 'none',
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 1,
    minHeight: 46,
  },
  tabItemActive: {},
  tabIconWrap: {
    width: 26,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.1,
    marginTop: 1,
    textAlign: "center",
    width: "100%",
    includeFontPadding: false,
  },
  activeLabel: {
    color: "#1C1917",
    fontWeight: "700",
  },
  inactiveLabel: {
    color: "#7D756D",
    fontWeight: "500",
  },
  champagneActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#B99A5E",
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
