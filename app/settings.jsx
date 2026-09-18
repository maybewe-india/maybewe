import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import { COLORS, GRADIENTS, RADIUS, SPACING, SHADOWS } from '../lib/theme';
import { INDIA_PHONE_CODE, INDIA_CURRENCY_SYMBOL, INDIA_LOCALE } from '../lib/indiaData';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out of MaybeWe?');
      if (confirmed) {
        logout().then(() => router.replace('/(auth)/welcome'));
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of MaybeWe?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/welcome');
            },
          },
        ]
      );
    }
  };

  const isVerified = profile?.verification_status === 'verified';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color={isDark ? '#FFFFFF' : '#061522'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerSubtitle, { color: COLORS.lavender }]}>MAYBEWE</Text>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#061522' }]}>Settings</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(11, 29, 45, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(6, 21, 34, 0.08)',
            },
          ]}
        >
          <View style={styles.userRow}>
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarInitial}>
                {profile?.name ? profile.name[0].toUpperCase() : 'P'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: isDark ? '#FFFFFF' : '#061522' }]}>
                  {profile?.name || 'Priya Sharma'}
                </Text>
                {isVerified && (
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                )}
              </View>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {profile?.email || 'priya.sharma@example.in'}
              </Text>
              <View style={styles.trustRow}>
                <Ionicons name="star" size={13} color={COLORS.sunset} />
                <Text style={[styles.trustText, { color: colors.textPrimary }]}>
                  {Number(profile?.trust_score || 5.0).toFixed(2)} Trust Score
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section: Appearance */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.lavender }]}>APPEARANCE & THEME</Text>
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(11, 29, 45, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(6, 21, 34, 0.08)',
            },
          ]}
        >
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#E2E8F0' : '#E67E22'} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#061522' }]}>Dark Theme</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  {isDark ? 'Deep navy cinematic mode' : 'Crisp clean daylight mode'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
              thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <TouchableOpacity
            style={[styles.rowButton, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}
            onPress={() => router.push('/(auth)/theme-selection')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <Ionicons name="color-palette-outline" size={18} color={COLORS.lavender} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#061522' }]}>Theme Selection Screen</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Re-visit the dedicated onboarding theme picker
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section: Trust & Verification */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.lavender }]}>TRUST & SAFETY</Text>
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(11, 29, 45, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(6, 21, 34, 0.08)',
            },
          ]}
        >
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => router.push('/(auth)/verification')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(56, 178, 172, 0.12)' : 'rgba(56, 178, 172, 0.08)' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.teal} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#061522' }]}>Selfie ID Verification</Text>
                <Text style={[styles.settingDesc, { color: isVerified ? COLORS.success : COLORS.sunset }]}>
                  {isVerified ? '✓ Verified Community Member' : 'Action Required: Submit verification'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowButton, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}
            onPress={() => router.push('/(auth)/guidelines')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <Ionicons name="book-outline" size={18} color={COLORS.lavender} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#061522' }]}>Community Guidelines</Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Zero tolerance harassment pledge & safety rules
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section: India-Only Localization */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.lavender }]}>REGION & LOCALIZATION</Text>
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(11, 29, 45, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(6, 21, 34, 0.08)',
            },
          ]}
        >
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Target Market</Text>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>🇮🇳 India Only (IN)</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Currency</Text>
            <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#061522' }]}>
              {INDIA_CURRENCY_SYMBOL} INR (Indian Rupee)
            </Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone Code</Text>
            <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#061522' }]}>{INDIA_PHONE_CODE}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Locale</Text>
            <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#061522' }]}>{INDIA_LOCALE}</Text>
          </View>
        </View>

        {/* Section: Account Actions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.lavender }]}>ACCOUNT</Text>
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(11, 29, 45, 0.85)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(6, 21, 34, 0.08)',
            },
          ]}
        >
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
            <Text style={styles.logoutText}>Sign Out of MaybeWe</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            MaybeWe v1.0.0 • Solo Traveler Matching
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted, marginTop: 2 }]}>
            Single Unified Expo Application
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: SPACING.md,
  },
  userAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: SPACING.md,
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  footerText: {
    fontSize: 11,
  },
});
