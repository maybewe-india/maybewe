import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../lib/theme.js';
import { useTheme } from '../lib/themeContext.jsx';
import {
  fetchUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToUserNotifications,
} from '../lib/notifications.js';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const FILTER_PILLS = [
  { id: 'all', label: 'All Updates' },
  { id: 'messages', label: 'Messages' },
  { id: 'hangouts', label: 'Hangouts' },
  { id: 'connections', label: 'Connections' },
  { id: 'travel', label: 'Travel & Trips' },
];

export default function NotificationCenterModal({
  visible,
  onClose,
  userId = 'user-demo-priya',
  onOpenHangout = null,
  onOpenPlace = null,
  onOpenPost = null,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    try {
      const items = await fetchUserNotifications(userId);
      setNotifications(items);
    } catch (e) {
      console.warn('Error loading notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadNotifications();

      // Scoped Realtime subscription
      const unsub = subscribeToUserNotifications(userId, (newNotif) => {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === newNotif.id);
          if (exists) {
            return prev.map((n) => (n.id === newNotif.id ? newNotif : n));
          }
          return [newNotif, ...prev];
        });
      });

      return () => {
        unsub && unsub();
      };
    }
  }, [visible, userId, loadNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationPress = async (item) => {
    if (!item.is_read) {
      markNotificationRead(item.id, userId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
    }

    onClose && onClose();

    // Deep Link Navigation Dispatcher
    const data = item.data || {};
    const type = item.type;

    if (type === 'chat_message' || type === 'new_message' || type === 'chat_reply' || type === 'chat_mention') {
      const convId = data.conversation_id || item.entity_id || 'group-goa-circle';
      router.push({
        pathname: `/chat/${convId}`,
        params: {
          partnerName: data.sender_name || 'Travel Companion',
          isGroup: convId.startsWith('group-') ? 'true' : 'false',
        },
      });
      return;
    }

    if (type === 'match_request' || type === 'connection_accepted') {
      router.push('/(tabs)/matches');
      return;
    }

    if (
      type === 'hangout_invitation' ||
      type === 'hangout_invite' ||
      type === 'hangout_join' ||
      type === 'hangout_vote' ||
      type === 'hangout_finalized' ||
      type === 'hangout_schedule_update'
    ) {
      const hId = data.hangout_id || item.entity_id;
      if (onOpenHangout && hId) {
        onOpenHangout(hId);
      } else {
        router.push({
          pathname: `/chat/group-hangout-${hId || '1'}`,
          params: { isGroup: 'true', partnerName: data.hangout_title || 'Hangout' },
        });
      }
      return;
    }

    if (type === 'place_suggestion') {
      const pId = data.place_id || item.entity_id;
      if (onOpenPlace && pId) {
        onOpenPlace(pId);
      } else {
        router.push('/(tabs)/discovery');
      }
      return;
    }

    if (type === 'trip_collaboration' || type === 'trip_share') {
      router.push('/(tabs)/trips');
      return;
    }

    if (type === 'post_interaction' || type === 'like' || type === 'comment') {
      const pId = data.post_id || item.entity_id;
      if (onOpenPost && pId) {
        onOpenPost(pId);
      } else {
        router.push('/(tabs)/profile');
      }
      return;
    }

    if (type === 'follow' || type === 'review_trust') {
      router.push('/(tabs)/profile');
      return;
    }

    if (type === 'live_location') {
      const sId = data.session_id || item.entity_id;
      router.push(`/chat/${sId || 'group-goa-circle'}`);
      return;
    }

    // Default fallback
    if (data.route) {
      router.push(data.route);
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'messages') {
      return notifications.filter((n) =>
        ['chat_message', 'new_message', 'chat_reply', 'chat_mention', 'chat_invite'].includes(n.type)
      );
    }
    if (activeFilter === 'hangouts') {
      return notifications.filter((n) =>
        ['hangout_invitation', 'hangout_invite', 'hangout_join', 'hangout_vote', 'hangout_finalized', 'hangout_schedule_update'].includes(n.type)
      );
    }
    if (activeFilter === 'connections') {
      return notifications.filter((n) =>
        ['match_request', 'connection_accepted', 'follow'].includes(n.type)
      );
    }
    if (activeFilter === 'travel') {
      return notifications.filter((n) =>
        ['trip_collaboration', 'trip_share', 'place_suggestion', 'review_trust', 'live_location'].includes(n.type)
      );
    }
    return notifications;
  }, [notifications, activeFilter]);

  // Group notifications into Today, Yesterday, Earlier
  const groupedNotifications = useMemo(() => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;

    filteredNotifications.forEach((item) => {
      const itemTime = new Date(item.created_at).getTime();
      if (itemTime >= todayMidnight) {
        today.push(item);
      } else if (itemTime >= yesterdayMidnight) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return [
      { title: 'Today', data: today },
      { title: 'Yesterday', data: yesterday },
      { title: 'Earlier Journeys', data: earlier },
    ].filter((g) => g.data.length > 0);
  }, [filteredNotifications]);

  const getCategoryConfig = (type) => {
    switch (type) {
      case 'chat_message':
      case 'new_message':
      case 'chat_reply':
        return { icon: 'chatbubble-ellipses', color: '#B99A5E', bg: 'rgba(185, 154, 94, 0.14)' };
      case 'match_request':
      case 'connection_accepted':
        return { icon: 'people', color: '#405B68', bg: 'rgba(64, 91, 104, 0.14)' };
      case 'hangout_invitation':
      case 'hangout_invite':
      case 'hangout_join':
      case 'hangout_vote':
      case 'hangout_finalized':
        return { icon: 'calendar', color: '#C8B27A', bg: 'rgba(200, 178, 122, 0.16)' };
      case 'place_suggestion':
        return { icon: 'location', color: '#33463C', bg: 'rgba(51, 70, 60, 0.14)' };
      case 'trip_collaboration':
      case 'trip_share':
        return { icon: 'airplane', color: '#B99A5E', bg: 'rgba(185, 154, 94, 0.14)' };
      case 'post_interaction':
      case 'like':
      case 'comment':
      case 'follow':
        return { icon: 'heart', color: '#8C4351', bg: 'rgba(140, 67, 81, 0.14)' };
      case 'review_trust':
        return { icon: 'shield-checkmark', color: '#2E7D32', bg: 'rgba(46, 125, 50, 0.14)' };
      case 'live_location':
        return { icon: 'navigate', color: '#C8B27A', bg: 'rgba(200, 178, 122, 0.16)' };
      default:
        return { icon: 'sparkles', color: '#B99A5E', bg: 'rgba(185, 154, 94, 0.12)' };
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
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
              backgroundColor: isDark ? '#1D1D1B' : '#FFFDFC',
              borderColor: colors.border,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>TRAVEL CONCIERGE UPDATES</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  style={[styles.markAllBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeIconBtn, { backgroundColor: isDark ? '#262624' : '#EAE6DC' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Pills Carousel */}
          <View style={styles.filterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {FILTER_PILLS.map((pill) => {
                const isActive = activeFilter === pill.id;
                return (
                  <TouchableOpacity
                    key={pill.id}
                    onPress={() => setActiveFilter(pill.id)}
                    style={[
                      styles.filterPill,
                      isActive ? styles.filterPillActive : [styles.filterPillInactive, { borderColor: colors.border }],
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive ? styles.filterPillTextActive : { color: colors.textSecondary },
                      ]}
                    >
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#B99A5E" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Gathering travel concierge notes...
              </Text>
            </View>
          ) : groupedNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#262624' : '#EFECE6' }]}>
                <Ionicons name="leaf-outline" size={32} color="#B99A5E" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Serene Travel Inbox</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Your concierge is watching the horizon. As kindred travelers message, invite you to circles, and share landmarks, updates will arrive here.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#B99A5E"
                />
              }
            >
              {groupedNotifications.map((group, gIdx) => (
                <View key={gIdx} style={styles.groupSection}>
                  <Text style={[styles.groupHeaderTitle, { color: colors.textSecondary }]}>
                    {group.title.toUpperCase()}
                  </Text>
                  {group.data.map((item) => {
                    const cfg = getCategoryConfig(item.type);
                    const avatarUrl = item.data?.avatar_url;
                    const destination = item.data?.destination;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleNotificationPress(item)}
                        style={[
                          styles.notificationCard,
                          {
                            backgroundColor: item.is_read
                              ? isDark ? 'rgba(32, 33, 31, 0.65)' : 'rgba(255, 255, 255, 0.85)'
                              : isDark ? '#242522' : '#FFFFFF',
                            borderColor: item.is_read ? colors.border : '#C8B27A',
                          },
                          !item.is_read && styles.unreadNotificationCard,
                        ]}
                        activeOpacity={0.82}
                      >
                        {/* Unread Accent Bar */}
                        {!item.is_read && <View style={styles.unreadAccentPill} />}

                        {/* Avatar or Category Icon */}
                        <View style={styles.avatarWrap}>
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                          ) : (
                            <View style={[styles.categoryCircle, { backgroundColor: cfg.bg }]}>
                              <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                            </View>
                          )}
                          {avatarUrl && (
                            <View style={[styles.categoryBadgeMini, { backgroundColor: cfg.bg }]}>
                              <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                            </View>
                          )}
                        </View>

                        {/* Notification Details */}
                        <View style={styles.notifDetails}>
                          <View style={styles.notifHeaderRow}>
                            <Text
                              style={[
                                styles.notifTitle,
                                { color: colors.textPrimary },
                                !item.is_read && styles.notifTitleUnread,
                              ]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Text style={styles.timeText}>{formatRelativeTime(item.created_at)}</Text>
                          </View>

                          <Text
                            style={[styles.notifMessage, { color: colors.textSecondary }]}
                            numberOfLines={2}
                          >
                            {item.message}
                          </Text>

                          {/* Destination Context Tag */}
                          {destination && (
                            <View style={styles.destinationTag}>
                              <Ionicons name="location-sharp" size={10} color="#B99A5E" />
                              <Text style={styles.destinationTagText}>{destination}</Text>
                            </View>
                          )}
                        </View>

                        {/* Chevron */}
                        <Ionicons name="chevron-forward" size={14} color="#8C8983" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 24, 23, 0.65)',
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
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8B27A',
    marginRight: 6,
  },
  eyebrowText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#B99A5E',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    fontWeight: '800',
  },
  unreadBadge: {
    backgroundColor: '#171817',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#FAF8F3',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  markAllText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#B99A5E',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: '#171817',
  },
  filterPillInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  filterPillTextActive: {
    color: '#FAF8F3',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  groupSection: {
    marginBottom: 20,
  },
  groupHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  unreadNotificationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#C8B27A',
  },
  unreadAccentPill: {
    position: 'absolute',
    top: 14,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8B27A',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  categoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeMini: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FAF8F3',
  },
  notifDetails: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  notifTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    flex: 1,
  },
  notifTitleUnread: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  timeText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: '#8C8983',
    marginLeft: 6,
  },
  notifMessage: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  destinationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
    gap: 4,
  },
  destinationTagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: '#756345',
  },
  centerContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 70,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
