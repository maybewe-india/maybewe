import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../lib/theme';

export const ALL_SCREENS = [
  // Authentication
  {
    id: 'welcome',
    title: '🌟 Welcome / Splash',
    description: 'Cinematic brand hero & entry point',
    route: '/(auth)/welcome',
    category: 'Authentication',
  },
  {
    id: 'login',
    title: '🔑 Login Screen',
    description: 'Glass inputs & 1-tap demo sign-in',
    route: '/(auth)/login',
    category: 'Authentication',
  },
  {
    id: 'signup',
    title: '📝 Signup (5 Steps)',
    description: 'Styles, Indian languages & photo upload',
    route: '/(auth)/signup',
    category: 'Authentication',
  },

  // Onboarding
  {
    id: 'guidelines',
    title: '🛡️ Safety Guidelines',
    description: 'Community principles & safety pledge',
    route: '/(auth)/guidelines',
    category: 'Onboarding',
  },
  {
    id: 'verification',
    title: '🪪 Selfie ID Verification',
    description: 'Mandatory selfie check & trust badge',
    route: '/(auth)/verification',
    category: 'Onboarding',
  },
  {
    id: 'theme-selection',
    title: '🎨 Theme Selection',
    description: 'Mandatory post-verification theme choice',
    route: '/(auth)/theme-selection',
    category: 'Onboarding',
    badge: 'MANDATORY',
  },

  // Main App
  {
    id: 'home',
    title: '🏠 Home Dashboard',
    description: 'Dynamic time theme & hero cards',
    route: '/',
    category: 'Main App',
  },
  {
    id: 'discovery',
    title: '🧭 Discovery Matching',
    description: 'Vibe Match & Indian traveler profiles',
    route: '/(tabs)/discovery',
    category: 'Main App',
  },
  {
    id: 'trips',
    title: '✈️ Trips Planner',
    description: 'Indian destinations & trip planner',
    route: '/(tabs)/trips',
    category: 'Main App',
  },
  {
    id: 'matches',
    title: '💬 Matches & Connections',
    description: 'Active connections & pending requests',
    route: '/(tabs)/matches',
    category: 'Main App',
  },
  {
    id: 'profile',
    title: '👤 Profile & Travel Journal',
    description: 'Trust score, badge & visual journal',
    route: '/(tabs)/profile',
    category: 'Main App',
  },

  // Other & Features
  {
    id: 'trip-details',
    title: '🗺️ Trip Details & Itinerary',
    description: 'View active trip plans & itineraries',
    route: '/(tabs)/trips',
    category: 'Other',
  },
  {
    id: 'chat',
    title: '💌 In-Chat Screen',
    description: 'Real-time safety scanner & chat',
    route: '/chat/match-001',
    category: 'Other',
  },
  {
    id: 'review',
    title: '⭐ Post-Trip Reviews',
    description: '5-star rating & trust score impact',
    route: '/review/match-001',
    category: 'Other',
  },
  {
    id: 'settings',
    title: '⚙️ Settings',
    description: 'Theme switch, safety, India locale & sign-out',
    route: '/settings',
    category: 'Other',
  },
  {
    id: 'showcase',
    title: '🚀 All-in-One Showcase',
    description: 'Merged interactive multi-screen tester',
    route: '/showcase',
    category: 'Other',
    badge: 'MERGED',
  },
];

export default function TestNavigatorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = (route) => {
    setIsOpen(false);
    const separator = route.includes('?') ? '&' : '?';
    router.push(`${route}${separator}preview=true`);
  };

  const categories = ['Authentication', 'Onboarding', 'Main App', 'Other'];

  return (
    <>
      {/* Floating Pill Trigger */}
      <View style={styles.floatingTriggerContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatingPill}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.pulsingDot} />
          <Ionicons name="apps" size={14} color={COLORS.lavender} />
          <Text style={styles.floatingPillText}>Test Navigator</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{ALL_SCREENS.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Navigation Switcher Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>MAYBEWE</Text>
                <Text style={styles.modalSubtitle}>Select any screen to test instantly</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Merged Button */}
            <TouchableOpacity
              style={styles.heroMergedButton}
              onPress={() => handleNavigate('/showcase')}
              activeOpacity={0.85}
            >
              <View style={styles.heroMergedIcon}>
                <Ionicons name="layers" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.heroMergedTitle}>All-In-One Merged Tester</Text>
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>RECOMMENDED</Text>
                  </View>
                </View>
                <Text style={styles.heroMergedDesc}>
                  Test all 12 screens in a single interactive view with quick switching
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.lavender} />
            </TouchableOpacity>

            {/* Screens List grouped by Category */}
            <ScrollView style={styles.screenList} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const items = ALL_SCREENS.filter((s) => s.category === cat && s.id !== 'showcase');
                if (items.length === 0) return null;

                return (
                  <View key={cat} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{cat.toUpperCase()}</Text>
                    <View style={styles.gridContainer}>
                      {items.map((item) => {
                        const isActive = pathname === item.route;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.screenItem,
                              isActive && styles.screenItemActive,
                            ]}
                            onPress={() => handleNavigate(item.route)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.screenItemContent}>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.screenItemTitle,
                                    isActive && styles.screenItemTitleActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.title}
                                </Text>
                                <Text
                                  style={styles.screenItemDesc}
                                  numberOfLines={1}
                                >
                                  {item.description}
                                </Text>
                              </View>
                              {isActive ? (
                                <View style={styles.activePill}>
                                  <Text style={styles.activePillText}>ACTIVE</Text>
                                </View>
                              ) : (
                                <Ionicons
                                  name="arrow-forward-circle-outline"
                                  size={18}
                                  color={COLORS.textMuted}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingTriggerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 88 : 102,
    right: 16,
    zIndex: 999999,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(11, 29, 45, 0.92)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  floatingPillText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 20, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '88%',
    backgroundColor: '#0B1D2D',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.lavender,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  modalSubtitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMergedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: SPACING.md,
  },
  heroMergedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMergedTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  featuredBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    color: '#061522',
    fontSize: 9,
    fontWeight: '800',
  },
  heroMergedDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  screenList: {
    flex: 1,
  },
  categorySection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  categoryTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  gridContainer: {
    gap: 6,
  },
  screenItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16, 40, 58, 0.6)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  screenItemActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  screenItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  screenItemTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  screenItemTitleActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  screenItemDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  activePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    color: '#061522',
    fontSize: 9,
    fontWeight: '800',
  },
});
