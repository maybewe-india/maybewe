import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../lib/theme';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';

export default function DeleteAccountPublicPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, user, profile, deleteAccount } = useAuth();
  const { colors, isDark } = useTheme();

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const isLoggedIn = !!(session?.user || user);

  const handleDeleteNow = async () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm('⚠️ Permanently Delete Your MaybeWe Account?\n\nThis will immediately purge your profile, identity verification selfies, travel itineraries, companion matches, and messages. This action cannot be reversed.\n\nAre you sure you want to proceed?')
        : true;
      if (!confirmed) return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    const res = await deleteAccount();
    setIsDeleting(false);

    if (res?.success) {
      setDeleted(true);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('Your MaybeWe account and associated data have been permanently deleted.');
      }
    } else {
      const msg = res?.error || 'Account deletion could not be completed. Your account and login credentials remain active. Please retry or contact support.';
      setErrorMessage(msg);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(msg);
      } else {
        Alert.alert('Deletion Incomplete', msg);
      }
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: '#F8F6F0' }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 20,
            paddingBottom: Math.max(insets.bottom, 24) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="shield-outline" size={14} color="#B99A5E" style={{ marginRight: 6 }} />
              <Text style={styles.eyebrow}>MAYBEWE • PRIVACY & DATA SAFETY</Text>
            </View>
            <Text style={styles.title}>Account & Data Deletion Request</Text>
            <Text style={styles.subtitle}>
              MaybeWe is committed to user privacy, control, and transparent data rights under Google Play & Apple App Store guidelines.
            </Text>
          </View>

          {deleted ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={48} color="#33463C" style={{ marginBottom: 12 }} />
              <Text style={styles.successTitle}>Account Successfully Deleted</Text>
              <Text style={styles.successDesc}>
                Your MaybeWe account, profile credentials, verification selfies, and travel records have been permanently purged from our servers.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/(auth)/welcome')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Return to MaybeWe</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Section 1: What is deleted */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>What Data Is Deleted</Text>
                <Text style={styles.paragraph}>
                  When you delete your MaybeWe account, the following information is permanently and immediately deleted from our active databases and private storage buckets:
                </Text>

                <View style={styles.bulletList}>
                  <View style={styles.bulletRow}>
                    <Ionicons name="trash-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}><Text style={styles.bold}>User Profile & Identity:</Text> Full name, email, age, gender, travel bio, and preferences.</Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <Ionicons name="trash-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}><Text style={styles.bold}>Verification Selfies & Biometrics:</Text> All photos uploaded for selfie ID verification in private cloud storage.</Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <Ionicons name="trash-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}><Text style={styles.bold}>Travel Itineraries & Trips:</Text> Destination plans, travel dates, styles, and saved trips.</Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <Ionicons name="trash-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}><Text style={styles.bold}>Messages & Chat History:</Text> Direct messages, group chat participation, and reactions.</Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <Ionicons name="trash-outline" size={16} color="#A96F5C" style={styles.bulletIcon} />
                    <Text style={styles.bulletText}><Text style={styles.bold}>Safety & Privacy Settings:</Text> User block lists, notification preferences, and location permissions.</Text>
                  </View>
                </View>
              </View>

              {/* Section 2: Retention Policy */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Data Retention & Infrastructure Telemetry</Text>
                <Text style={styles.paragraph}>
                  MaybeWe does not retain personal user data after account deletion. Deletion takes effect immediately upon confirmation, removing your authentication identity, database records across tables, and media files across configured storage buckets (including avatars, travel-photos, trip-covers, post-media, story-media, chat-media, hangout-media, verification-selfies, and verification-documents). Standard operational server and edge infrastructure access logs may persist temporarily in accordance with cloud infrastructure provider operational defaults.
                </Text>
              </View>

              {/* Error Banner when deletion fails */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <View style={styles.errorHeader}>
                    <Ionicons name="alert-circle" size={20} color="#8A2C1D" style={{ marginRight: 8 }} />
                    <Text style={styles.errorTitle}>Account Deletion Incomplete</Text>
                  </View>
                  <Text style={styles.errorMsgText}>{errorMessage}</Text>
                  <Text style={styles.errorNotice}>
                    Your account and login credentials remain active. No data was deleted in an orphaned state. If retrying does not resolve this issue, you may request manual administrative assistance:
                  </Text>
                  <TouchableOpacity
                    style={styles.errorSupportBtn}
                    onPress={() => Linking.openURL("mailto:maybewe2026@gmail.com?subject=Account%20Deletion%20Assistance%20-%20MaybeWe")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mail" size={16} color="#FAF8F3" style={{ marginRight: 6 }} />
                    <Text style={styles.errorSupportBtnText}>Request Assistance via Email</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Section 3: Action Panel */}
              <View style={styles.actionSection}>
                {isLoggedIn ? (
                  <View style={styles.loggedInBox}>
                    <View style={styles.userBadge}>
                      <Ionicons name="person-circle-outline" size={24} color="#171817" />
                      <Text style={styles.userBadgeText}>
                        Logged in as: <Text style={styles.bold}>{profile?.name || user?.email || 'Active User'}</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteNowBtn}
                      onPress={handleDeleteNow}
                      activeOpacity={0.8}
                      disabled={isDeleting}
                    >
                      <Ionicons name="trash" size={18} color="#FAF8F3" style={{ marginRight: 8 }} />
                      <Text style={styles.deleteNowBtnText}>
                        {isDeleting ? 'Deleting Account...' : 'Delete My Account Immediately'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.loggedOutBox}>
                    <Text style={styles.loggedOutTitle}>How to Request Deletion</Text>
                    <Text style={styles.paragraph}>
                      You can delete your account at any time directly inside the MaybeWe mobile app or web app under <Text style={styles.bold}>Settings → Account Actions → Delete Account Permanently</Text>.
                    </Text>

                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => router.push('/(auth)/login')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.primaryBtnText}>Sign In to Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

              {/* Section 4: Deletion Assistance & Support */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Account Deletion Assistance</Text>
                <Text style={styles.paragraph}>
                  If you cannot access your account, have lost credentials, or need manual assistance with your deletion request, contact our administrative team at:
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL("mailto:maybewe2026@gmail.com?subject=Account%20Deletion%20Assistance%20-%20MaybeWe")}
                  style={styles.supportEmailBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={16} color="#A96F5C" style={{ marginRight: 8 }} />
                  <Text style={styles.supportEmailText}>maybewe2026@gmail.com</Text>
                </TouchableOpacity>
                <Text style={[styles.paragraph, { marginTop: 6, fontSize: 11, color: "#918E87" }]}>
                  Requests are reviewed without a guaranteed response timeframe or dedicated support staff.
                </Text>
              </View>

              {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              MaybeWe v1.0.0 • Privacy & Data Governance Compliance
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    maxWidth: 680,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EDE5DA',
    padding: 28,
    ...SHADOWS.card,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE5DA',
    paddingBottom: 16,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#B99A5E',
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    fontWeight: '800',
    color: '#171817',
    lineHeight: 30,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#77766F',
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#171817',
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#45453F',
    lineHeight: 20,
  },
  bold: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#171817',
  },
  bulletList: {
    marginTop: 10,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F6F0',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE5DA',
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#45453F',
    lineHeight: 17,
  },
  actionSection: {
    marginTop: 10,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: '#E4B8B0',
    borderLeftWidth: 4,
    borderLeftColor: '#8A2C1D',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#8A2C1D',
    fontWeight: '700',
  },
  errorMsgText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#331B17',
    lineHeight: 18,
    marginBottom: 8,
  },
  errorNotice: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#5C4A47',
    lineHeight: 16,
    marginBottom: 12,
  },
  errorSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A2C1D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  errorSupportBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FAF8F3',
    fontWeight: '700',
  },
  loggedInBox: {
    backgroundColor: 'rgba(169, 111, 92, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(169, 111, 92, 0.25)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  userBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#171817',
  },
  deleteNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A96F5C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
  },
  deleteNowBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FAF8F3',
    fontWeight: '700',
  },
  loggedOutBox: {
    backgroundColor: '#F8F6F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE5DA',
    padding: 16,
  },
  loggedOutTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#171817',
    marginBottom: 6,
  },
  btnRow: {
    marginTop: 14,
  },
  primaryBtn: {
    backgroundColor: '#171817',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FAF8F3',
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  successTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#171817',
    marginBottom: 8,
    textAlign: 'center',
  },
  successDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#77766F',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  supportEmailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(169, 111, 92, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(169, 111, 92, 0.30)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  supportEmailText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: "#A96F5C",
    fontWeight: "700",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#EDE5DA',
    paddingTop: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#918E87',
  },
});
