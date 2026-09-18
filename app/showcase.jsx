import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../lib/theme';

// Import all 12 screen components for unified testing
import WelcomeScreen from './(auth)/welcome';
import LoginScreen from './(auth)/login';
import SignupScreen from './(auth)/signup';
import GuidelinesScreen from './(auth)/guidelines';
import VerificationScreen from './(auth)/verification';
import HomeScreen from './(tabs)/index';
import DiscoveryScreen from './(tabs)/discovery';
import MatchesScreen from './(tabs)/matches';
import TripsScreen from './(tabs)/trips';
import ProfileScreen from './(tabs)/profile';
import ChatScreen from './chat/[id]';
import ReviewScreen from './review/[id]';

const SCREENS = [
  {
    id: 'welcome',
    title: 'Welcome',
    icon: 'sparkles',
    route: '/(auth)/welcome',
    category: 'Auth',
    component: WelcomeScreen,
    description: 'Cinematic splash with brand headline, glass buttons, and guest access.',
  },
  {
    id: 'login',
    title: 'Login',
    icon: 'log-in',
    route: '/(auth)/login',
    category: 'Auth',
    component: LoginScreen,
    description: 'Dark glass inputs with 1-tap demo credentials and social pills.',
  },
  {
    id: 'signup',
    title: 'Signup',
    icon: 'person-add',
    route: '/(auth)/signup',
    category: 'Auth',
    component: SignupScreen,
    description: '5-step onboarding wizard for styles, languages, and photo upload.',
  },
  {
    id: 'guidelines',
    title: 'Guidelines',
    icon: 'shield-checkmark',
    route: '/(auth)/guidelines',
    category: 'Safety',
    component: GuidelinesScreen,
    description: 'Community Safety Principles and verification pledge.',
  },
  {
    id: 'verification',
    title: 'Verification',
    icon: 'finger-print',
    route: '/(auth)/verification',
    category: 'Safety',
    component: VerificationScreen,
    description: 'Selfie verification preview and TrustBadge level calculator.',
  },
  {
    id: 'home',
    title: 'Home Feed',
    icon: 'home',
    route: '/',
    category: 'Tabs',
    component: HomeScreen,
    description: 'Dynamic time-of-day atmosphere, hero cards, search, and places.',
  },
  {
    id: 'discovery',
    title: 'Discovery',
    icon: 'compass',
    route: '/discovery',
    category: 'Tabs',
    component: DiscoveryScreen,
    description: 'Vibe Match pills, "Why you might match" checklist, and connect/pass.',
  },
  {
    id: 'matches',
    title: 'Matches',
    icon: 'chatbubbles',
    route: '/matches',
    category: 'Tabs',
    component: MatchesScreen,
    description: 'Active connections, pending requests, and direct chat shortcuts.',
  },
  {
    id: 'trips',
    title: 'Trips',
    icon: 'airplane',
    route: '/trips',
    category: 'Tabs',
    component: TripsScreen,
    description: 'Active/completed trips, destination cards, and itinerary creator.',
  },
  {
    id: 'profile',
    title: 'Profile',
    icon: 'person',
    route: '/profile',
    category: 'Tabs',
    component: ProfileScreen,
    description: 'Cover photo, trust score badge, stats, and visual travel journal.',
  },
  {
    id: 'chat',
    title: 'Chat Detail',
    icon: 'chatbubble-ellipses',
    route: '/chat/match-001',
    category: 'Messaging',
    component: ChatScreen,
    description: 'Dual bubble styling, in-chat safety scanner, and location share.',
  },
  {
    id: 'review',
    title: 'Post-Trip Review',
    icon: 'star',
    route: '/review/match-001',
    category: 'Review',
    component: ReviewScreen,
    description: 'Interactive 5-star rating, positive descriptor tags, and trust score impact.',
  },
];

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Showcase Screen Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FFB39A" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Screen Load Error</Text>
          <Text style={styles.errorMsg}>{this.state.error?.message || 'An error occurred in this screen.'}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false, error: null })}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry Screen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function ShowcaseScreen() {
  const params = useLocalSearchParams();
  const screenParam = params?.screen;

  const initialIndex = React.useMemo(() => {
    if (!screenParam) return 0;
    const found = SCREENS.findIndex((s) => s.id === screenParam || s.route === screenParam);
    return found !== -1 ? found : 0;
  }, [screenParam]);

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState('mobile'); // 'mobile' | 'full'
  const { width } = useWindowDimensions();
  const router = useRouter();

  React.useEffect(() => {
    if (screenParam) {
      const found = SCREENS.findIndex((s) => s.id === screenParam || s.route === screenParam);
      if (found !== -1) setSelectedIndex(found);
    }
  }, [screenParam]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.classList.add('showcase-wide');
      return () => {
        document.body.classList.remove('showcase-wide');
      };
    }
  }, []);

  const currentScreen = SCREENS[selectedIndex];
  const ActiveComponent = currentScreen.component;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : SCREENS.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < SCREENS.length - 1 ? prev + 1 : 0));
  };

  const isWide = width > 768;

  return (
    <View style={styles.container} dataSet={{ showcase: 'true' }}>
      {/* Top Test Control Center */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="layers" size={14} color={COLORS.primary} />
            <Text style={styles.brandBadgeText}>MERGED TEST SUITE</Text>
          </View>
          <Text style={styles.brandTitle}>MAYBEWE</Text>
          <Text style={styles.brandTagline}>• All 12 URLs Unified</Text>

          {/* Viewport Mode Switcher (Web/Desktop) */}
          {isWide && (
            <View style={styles.viewModeContainer}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'mobile' && styles.viewModeButtonActive,
                ]}
                onPress={() => setViewMode('mobile')}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={14}
                  color={viewMode === 'mobile' ? '#061522' : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === 'mobile' && styles.viewModeTextActive,
                  ]}
                >
                  Mobile (390px)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'full' && styles.viewModeButtonActive,
                ]}
                onPress={() => setViewMode('full')}
              >
                <Ionicons
                  name="expand-outline"
                  size={14}
                  color={viewMode === 'full' ? '#061522' : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === 'full' && styles.viewModeTextActive,
                  ]}
                >
                  Full Width
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Screen Selector Chips Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {SCREENS.map((screen, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <TouchableOpacity
                key={screen.id}
                style={[
                  styles.screenChip,
                  isSelected && styles.screenChipActive,
                ]}
                onPress={() => setSelectedIndex(idx)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={screen.icon}
                  size={14}
                  color={isSelected ? '#061522' : COLORS.lavender}
                />
                <Text
                  style={[
                    styles.screenChipText,
                    isSelected && styles.screenChipTextActive,
                  ]}
                >
                  {screen.title}
                </Text>
                <View
                  style={[
                    styles.stepBadge,
                    isSelected && styles.stepBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBadgeText,
                      isSelected && styles.stepBadgeTextActive,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action / Context Bar */}
        <View style={styles.contextBar}>
          <View style={styles.screenMeta}>
            <View style={styles.screenIndexPill}>
              <Text style={styles.screenIndexText}>
                {selectedIndex + 1} / {SCREENS.length}
              </Text>
            </View>
            <Text style={styles.currentScreenName}>{currentScreen.title}</Text>
            <Text style={styles.screenDescription} numberOfLines={1}>
              {currentScreen.description}
            </Text>
          </View>

          <View style={styles.navButtonsGroup}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrev}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={16} color={COLORS.textPrimary} />
              <Text style={styles.navButtonText}>Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text style={styles.navButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.standaloneLinkButton}
              onPress={() => router.push(currentScreen.route)}
              activeOpacity={0.7}
              title={`Open route: ${currentScreen.route}`}
            >
              <Ionicons name="open-outline" size={14} color={COLORS.lavender} />
              <Text style={styles.standaloneLinkText}>Open Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Screen Presentation Stage */}
      <View style={styles.stage}>
        <View
          style={[
            styles.screenContainer,
            viewMode === 'mobile' && isWide && styles.screenContainerMobile,
          ]}
        >
          <ScreenErrorBoundary key={currentScreen.id}>
            <ActiveComponent />
          </ScreenErrorBoundary>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040E18',
  },
  topBar: {
    backgroundColor: '#081726',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Platform.OS === 'web' ? 10 : 44,
    zIndex: 100,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 179, 154, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 154, 0.3)',
  },
  brandBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandTagline: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.full,
    padding: 2,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  viewModeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  viewModeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: '#061522',
  },
  chipsScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    gap: 8,
  },
  screenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16, 40, 58, 0.8)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  screenChipActive: {
    backgroundColor: COLORS.lavender,
    borderColor: COLORS.lavender,
  },
  screenChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  screenChipTextActive: {
    color: '#061522',
    fontWeight: '800',
  },
  stepBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: '#061522',
  },
  stepBadgeText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  stepBadgeTextActive: {
    color: COLORS.lavender,
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'rgba(6, 21, 34, 0.7)',
    flexWrap: 'wrap',
    gap: 8,
  },
  screenMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 260,
  },
  screenIndexPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  screenIndexText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  currentScreenName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  screenDescription: {
    color: COLORS.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADIUS.md,
  },
  navButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  standaloneLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
  },
  standaloneLinkText: {
    color: '#061522',
    fontSize: 12,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#040E18',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.background,
  },
  screenContainerMobile: {
    maxWidth: 420,
    height: '94%',
    maxHeight: 880,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#10283A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
    marginVertical: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#061522',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.lavender,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
  },
  retryBtnText: {
    color: '#061522',
    fontWeight: '600',
    fontSize: 14,
  },
});
