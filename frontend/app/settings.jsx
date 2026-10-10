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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import { COLORS, GRADIENTS, RADIUS, SPACING, SHADOWS, PALETTE } from '../lib/theme';
import { INDIA_PHONE_CODE, INDIA_CURRENCY_SYMBOL, INDIA_LOCALE } from '../lib/indiaData';

import GlassCard from '../components/ui/GlassCard';
import EmergencyContactsModal from '../components/EmergencyContactsModal';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = () => {
    try {
      if (typeof router.canGoBack === "function" && router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/profile");
      }
    } catch (err) {
      router.replace("/(tabs)/profile");
    }
  };
  const { user, profile, logout, deleteAccount } = useAuth();
  const { isDark, colors } = useTheme();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = React.useState(false);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm('Are you sure you want to sign out of MaybeWe?')
        : true;
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

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    const res = await deleteAccount();
    setIsDeleting(false);
    if (res?.success) {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Account Deleted: Your MaybeWe account and associated travel data have been permanently removed.');
      }
      router.replace('/(auth)/welcome');
    } else {
      const err = res?.error || 'Failed to delete account. Please try again.';
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(err);
      } else {
        Alert.alert('Deletion Error', err);
      }
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm('⚠️ Delete Account Permanently?\n\nThis will permanently delete your profile, verified trust credentials, travel itineraries, companion matches, messages, and uploaded photos. This action cannot be undone.\n\nDo you wish to proceed?')
        : true;
      if (confirmed) {
        confirmDeleteAccount();
      }
    } else {
      Alert.alert(
        'Delete Account Permanently?',
        'This will permanently delete your profile, verified trust credentials, travel itineraries, companion matches, messages, and uploaded photos. This action cannot be undone.\n\nDo you wish to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: confirmDeleteAccount,
          },
        ]
      );
    }
  };

  const isVerified = profile?.verification_status === 'verified';

  return (
    <View style={[styles.container, { backgroundColor: '#F7F5F0' }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color="#171817" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>MAYBEWE • LUXURY CONCIERGE</Text>
          <Text style={styles.headerTitle}>Account & Region</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <GlassCard material="pearl" style={styles.cardPadding}>
          <View style={styles.userRow}>
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarInitial}>
                {profile?.name ? profile.name[0].toUpperCase() : 'P'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>
                  {profile?.name || 'Priya Sharma'}
                </Text>
                {isVerified && (
                  <Ionicons name="shield-checkmark" size={16} color="#C5A880" />
                )}
              </View>
              <Text style={styles.userEmail}>
                {profile?.email || 'priya.sharma@example.in'}
              </Text>
              <View style={styles.trustRow}>
                <Ionicons name="sparkles" size={13} color="#C5A880" />
                <Text style={styles.trustText}>
                  {Number(profile?.trust_score || 5.0).toFixed(2)} Community Trust
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Section: Trust & Verification */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRUST & SAFETY</Text>
        </View>
        <GlassCard material="pearl" style={styles.cardNoPadding}>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => router.push('/(auth)/verification')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#C5A880" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Selfie ID Verification</Text>
                <Text style={[styles.settingDesc, { color: isVerified ? '#33463C' : '#C5A880' }]}>
                  {isVerified ? '✓ Verified Community Member' : 'Action Required: Submit verification'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#77766F" />
          </TouchableOpacity>

                    <TouchableOpacity
            style={[styles.rowButton, { borderTopWidth: 1, borderTopColor: 'rgba(197, 168, 128, 0.28)' }]}
            onPress={() => setEmergencyModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="people-circle-outline" size={18} color="#C5A880" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Emergency Contacts & Safety Circle</Text>
                <Text style={styles.settingDesc}>
                  Manage trusted contacts for instant SOS & travel alerts
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#77766F" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowButton, { borderTopWidth: 1, borderTopColor: 'rgba(197, 168, 128, 0.28)' }]}
            onPress={() => router.push('/(auth)/guidelines')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="book-outline" size={18} color="#171817" />
              </View>
              <View>
                <Text style={styles.settingLabel}>Community Guidelines</Text>
                <Text style={styles.settingDesc}>
                  Zero tolerance harassment pledge & safety rules
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#77766F" />
          </TouchableOpacity>
        </GlassCard>

        {/* Section: India-Only Localization */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>REGION & LOCALIZATION</Text>
        </View>
        <GlassCard material="pearl" style={styles.cardNoPadding}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target Market</Text>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>🇮🇳 India Only (IN)</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: 'rgba(197, 168, 128, 0.28)' }]}>
            <Text style={styles.infoLabel}>Currency</Text>
            <Text style={styles.infoValue}>
              {INDIA_CURRENCY_SYMBOL} INR (Indian Rupee)
            </Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: 'rgba(197, 168, 128, 0.28)' }]}>
            <Text style={styles.infoLabel}>Phone Code</Text>
            <Text style={styles.infoValue}>{INDIA_PHONE_CODE}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: 'rgba(197, 168, 128, 0.28)' }]}>
            <Text style={styles.infoLabel}>Locale</Text>
            <Text style={styles.infoValue}>{INDIA_LOCALE}</Text>
          </View>
        </GlassCard>

        {/* Section: Legal & Data Governance */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LEGAL & DATA GOVERNANCE</Text>
        </View>
        <GlassCard material="pearl" style={styles.cardNoPadding}>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => router.push("/privacy")}
            activeOpacity={0.7}
          >
            <View style={styles.rowButtonLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#F4EFEB" }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#B99A5E" />
              </View>
              <View>
                <Text style={styles.rowButtonLabel}>Privacy Policy</Text>
                <Text style={styles.rowButtonSub}>Data governance & location privacy</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#77766F" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowButton, { borderTopWidth: 1, borderTopColor: "#EDE5DA" }]}
            onPress={() => router.push("/terms")}
            activeOpacity={0.7}
          >
            <View style={styles.rowButtonLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#F4EFEB" }]}>
                <Ionicons name="document-text-outline" size={16} color="#B99A5E" />
              </View>
              <View>
                <Text style={styles.rowButtonLabel}>Terms of Service</Text>
                <Text style={styles.rowButtonSub}>Community standards & solo traveler rules</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#77766F" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowButton, { borderTopWidth: 1, borderTopColor: "#EDE5DA" }]}
            onPress={() => router.push("/delete-account")}
            activeOpacity={0.7}
          >
            <View style={styles.rowButtonLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#F4EFEB" }]}>
                <Ionicons name="trash-outline" size={16} color="#A96F5C" />
              </View>
              <View>
                <Text style={styles.rowButtonLabel}>Delete Account Portal</Text>
                <Text style={styles.rowButtonSub}>Permanent GDPR & store compliant data purge</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#77766F" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowButton, { borderTopWidth: 1, borderTopColor: "#EDE5DA" }]}
            onPress={() => Linking.openURL("mailto:maybewe2026@gmail.com?subject=Support%20Request%20-%20MaybeWe")}
            activeOpacity={0.7}
          >
            <View style={styles.rowButtonLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#F4EFEB" }]}>
                <Ionicons name="mail-outline" size={16} color="#B99A5E" />
              </View>
              <View>
                <Text style={styles.rowButtonLabel}>Contact Support & Legal</Text>
                <Text style={styles.rowButtonSub}>maybewe2026@gmail.com</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#77766F" />
          </TouchableOpacity>
        </GlassCard>

        {/* Section: Account Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>
        </View>
        <GlassCard material="pearl" style={styles.cardNoPadding}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#171817" />
            <Text style={styles.logoutText}>Sign Out of MaybeWe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { borderTopWidth: 1, borderTopColor: '#EDE5DA' }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={18} color="#A96F5C" />
            <Text style={styles.deleteText}>
              {isDeleting ? 'Deleting Account...' : 'Delete Account Permanently'}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            MaybeWe v1.0.0 • Luxury Travel Companion
          </Text>
          <Text style={[styles.footerText, { marginTop: 2 }]}>
            Curated verified travel pairing for India
          </Text>
        </View>
      </ScrollView>
      <EmergencyContactsModal
        visible={emergencyModalVisible}
        onClose={() => setEmergencyModalVisible(false)}
        userId={user?.id || profile?.id}
      />
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
    backgroundColor: 'rgba(251, 250, 247, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.28)',
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
    color: '#77766F',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 1,
    color: '#171817',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardPadding: {
    padding: 0,
    overflow: 'hidden',
  },
  cardNoPadding: {
    padding: 0,
    overflow: 'hidden',
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
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    color: '#171817',
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
    color: '#171817',
  },
  userEmail: {
    fontSize: 12,
    color: '#77766F',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#171817',
  },
  sectionHeader: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#77766F',
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
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171817',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
    color: '#77766F',
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
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  infoLabel: {
    fontSize: 13,
    color: '#77766F',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171817',
  },
  badgeWrap: {
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#171817',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: SPACING.md,
    backgroundColor: '#FAF8F3',
  },
  logoutText: {
    color: '#171817',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: SPACING.md,
    backgroundColor: 'rgba(169, 111, 92, 0.08)',
  },
  deleteText: {
    color: '#A96F5C',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  footerText: {
    fontSize: 11,
    color: '#77766F',
  },
});
