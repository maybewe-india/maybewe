import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../lib/theme.js';
import { useTheme } from '../lib/themeContext.jsx';
import {
  getUserPrivacySettings,
  updateUserPrivacySettings,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../lib/privacySettings.js';
import { getBlockedUsers, unblockUser } from '../lib/safetyBlocks.js';

export default function PrivacySettingsModal({
  visible,
  onClose,
  userId = 'user-demo-priya',
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' | 'notifications' | 'safety'
  const [privacySettings, setPrivacySettings] = useState(DEFAULT_PRIVACY_SETTINGS);
  const [notifPreferences, setNotifPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, userId]);

  const loadData = async () => {
    try {
      const [priv, notif, blocked] = await Promise.all([
        getUserPrivacySettings(userId),
        getUserNotificationPreferences(userId),
        getBlockedUsers(userId),
      ]);
      setPrivacySettings(priv);
      setNotifPreferences(notif);
      setBlockedUsers(blocked);
    } catch (e) {
      console.warn('Error loading privacy settings:', e);
    }
  };

  const handleUpdatePrivacy = async (key, val) => {
    const updated = { ...privacySettings, [key]: val };
    setPrivacySettings(updated);
    await updateUserPrivacySettings(userId, updated);
  };

  const handleToggleNotif = async (key) => {
    const updated = { ...notifPreferences, [key]: !notifPreferences[key] };
    setNotifPreferences(updated);
    await updateUserNotificationPreferences(userId, updated);
  };

  const handleUnblock = async (blockedUserId) => {
    const res = await unblockUser(userId, blockedUserId);
    if (res.success) {
      setBlockedUsers((prev) => prev.filter((u) => u.blocked_user_id !== blockedUserId));
      Alert.alert('User Unblocked', 'You have removed this traveler from your block list.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.eyebrowRow}>
                <Ionicons name="shield-checkmark" size={12} color="#C8B27A" style={{ marginRight: 5 }} />
                <Text style={styles.eyebrowText}>TRAVELER SAFETY & CONTROLS</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy & Preferences</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#262624' : '#EAE6DC' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs */}
          <View style={styles.tabsBar}>
            {[
              { id: 'privacy', label: 'Privacy' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'safety', label: `Blocked (${blockedUsers.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.tabItem,
                    isActive ? styles.tabItemActive : { borderColor: colors.border },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : { color: colors.textSecondary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <View>
                {/* Discovery Visibility */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Discovery Visibility</Text>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        Show your profile to compatible travelers visiting the same Indian destinations.
                      </Text>
                    </View>
                    <Switch
                      value={privacySettings.discovery_visibility}
                      onValueChange={(val) => handleUpdatePrivacy('discovery_visibility', val)}
                      trackColor={{ false: '#918E87', true: '#B99A5E' }}
                      thumbColor="#FAF8F3"
                    />
                  </View>
                </View>

                {/* Profile Visibility Mode */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Profile Visibility</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Control who can view your travel bio, companion stories, and itineraries.
                  </Text>

                  <View style={styles.optionsCol}>
                    {[
                      { id: 'public', label: 'Public to Community', desc: 'All registered travelers on MaybeWe' },
                      { id: 'verified_only', label: 'Verified Travelers Only', desc: 'Only members with verified trust credentials' },
                      { id: 'connections_only', label: 'Confirmed Connections Only', desc: 'Only travelers you have matched with' },
                    ].map((opt) => {
                      const isSel = privacySettings.profile_visibility === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.optionRow, isSel && styles.optionRowSelected]}
                          onPress={() => handleUpdatePrivacy('profile_visibility', opt.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSel ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSel ? '#B99A5E' : '#918E87'}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.optionLabel, isSel && { color: '#B99A5E', fontWeight: '700' }]}>
                              {opt.label}
                            </Text>
                            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Who Can Message */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Direct Messaging Permission</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Enforce server-side access to protect your travel communications.
                  </Text>

                  <View style={styles.optionsCol}>
                    {[
                      { id: 'all', label: 'Any Traveler', desc: 'Allows introductory greetings' },
                      { id: 'matches_only', label: 'Confirmed Connections Only', desc: 'Requires mutual connection acceptance' },
                      { id: 'verified_only', label: 'Verified Profiles Only', desc: 'Only identity-verified solo travelers' },
                    ].map((opt) => {
                      const isSel = privacySettings.who_can_message === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.optionRow, isSel && styles.optionRowSelected]}
                          onPress={() => handleUpdatePrivacy('who_can_message', opt.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSel ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSel ? '#B99A5E' : '#918E87'}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.optionLabel, isSel && { color: '#B99A5E', fontWeight: '700' }]}>
                              {opt.label}
                            </Text>
                            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Live Location Default */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Live Location Default Mode</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Choose default precision when sharing foreground live location in chats and circles.
                  </Text>

                  <View style={styles.optionsCol}>
                    {[
                      { id: 'approximate', label: 'Approximate (~1 km radius)', desc: 'Hides exact GPS coordinates to protect privacy' },
                      { id: 'precise', label: 'Precise GPS Pin', desc: 'Exact coordinates for immediate street-level meetups' },
                    ].map((opt) => {
                      const isSel = privacySettings.live_location_default_mode === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.optionRow, isSel && styles.optionRowSelected]}
                          onPress={() => handleUpdatePrivacy('live_location_default_mode', opt.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSel ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSel ? '#B99A5E' : '#918E87'}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.optionLabel, isSel && { color: '#B99A5E', fontWeight: '700' }]}>
                              {opt.label}
                            </Text>
                            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <View>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Concierge Notification Categories</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Toggle categories of updates you wish to receive. Safety and verification alerts remain active at all times.
                  </Text>

                  <View style={{ marginTop: 12 }}>
                    {[
                      { key: 'messages_enabled', label: 'Messages & Chat Replies', desc: 'Direct chats, group conversations, and mentions' },
                      { key: 'connections_enabled', label: 'Connection Requests', desc: 'Incoming requests and accepted travel pairings' },
                      { key: 'hangouts_enabled', label: 'Hangout Invitations & Votes', desc: 'Circle planning, landmark voting, and schedules' },
                      { key: 'trips_enabled', label: 'Trip Activity & Shared Places', desc: 'Collaborative itinerary additions and suggestions' },
                      { key: 'social_enabled', label: 'Travel Stories & Followers', desc: 'Likes, comments, and new story followers' },
                      { key: 'trust_enabled', label: 'Trust & Verification Milestones', desc: 'Community trust score progress and verification status' },
                    ].map((item) => (
                      <View key={item.key} style={styles.notifToggleRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                          <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                        </View>
                        <Switch
                          value={notifPreferences[item.key]}
                          onValueChange={() => handleToggleNotif(item.key)}
                          trackColor={{ false: '#918E87', true: '#B99A5E' }}
                          thumbColor="#FAF8F3"
                        />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* SAFETY & BLOCKED USERS TAB */}
            {activeTab === 'safety' && (
              <View>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Blocked Travelers</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Blocked travelers cannot message you, view your live location, or invite you to circles. Blocking establishes a mutual safety barrier.
                  </Text>

                  {blockedUsers.length === 0 ? (
                    <View style={styles.emptyBlocked}>
                      <Ionicons name="shield-outline" size={28} color="#C8B27A" style={{ marginBottom: 8 }} />
                      <Text style={[styles.emptyBlockedTitle, { color: colors.textPrimary }]}>No Blocked Travelers</Text>
                      <Text style={[styles.emptyBlockedDesc, { color: colors.textSecondary }]}>
                        Your travel circle is in good standing. If anyone behaves inappropriately, you can block them from their profile or chat.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 12 }}>
                      {blockedUsers.map((b) => (
                        <View key={b.id || b.blocked_user_id} style={styles.blockedItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.blockedName, { color: colors.textPrimary }]}>
                              User ID: {b.blocked_user_id?.slice(0, 16)}...
                            </Text>
                            <Text style={[styles.blockedDate, { color: colors.textSecondary }]}>
                              Blocked {new Date(b.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleUnblock(b.blocked_user_id)}
                            style={styles.unblockBtn}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.unblockText}>Unblock</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 24, 23, 0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrowText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#B99A5E',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabItemActive: {
    backgroundColor: '#171817',
    borderColor: '#171817',
  },
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  tabLabelActive: {
    color: '#FAF8F3',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  optionsCol: {
    marginTop: 12,
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(185, 154, 94, 0.05)',
  },
  optionRowSelected: {
    backgroundColor: 'rgba(185, 154, 94, 0.14)',
  },
  optionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  optionDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  toggleLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  toggleDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  emptyBlocked: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptyBlockedTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBlockedDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  blockedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  blockedName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  blockedDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  unblockBtn: {
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  unblockText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#B99A5E',
  },
});
