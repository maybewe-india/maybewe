// ============================================================================
// MAYBEWE LUXURY CHAT INBOX VIEW (components/ChatInboxView.jsx)
// Boutique travel concierge inbox for Direct Chats, Hangouts, and Trips
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchConversations, searchConversations } from '../lib/groupChat.js';
import { SHADOWS } from '../lib/theme';

export default function ChatInboxView({
  userId = 'user-demo-priya',
  onSelectConversation,
  onCreateHangout,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'direct' | 'hangouts'
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async (query = '') => {
    try {
      if (query.trim()) {
        const results = await searchConversations(userId, query);
        setConversations(results);
      } else {
        const data = await fetchConversations(userId);
        setConversations(data);
      }
    } catch (err) {
      console.warn('Error loading conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations(searchQuery);
  }, [loadConversations, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations(searchQuery);
  };

  const filteredList = conversations.filter((c) => {
    if (filterType === 'direct') return c.is_direct;
    if (filterType === 'hangouts') return !c.is_direct;
    return true;
  });

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#8A867E" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search travel circles, spots, destinations..."
          placeholderTextColor="#A19E95"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#8A867E" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterStrip}>
        <TouchableOpacity
          style={[styles.filterPill, filterType === 'all' && styles.filterPillActive]}
          onPress={() => setFilterType('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterPillText, filterType === 'all' && styles.filterPillTextActive]}>
            All Circles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filterType === 'hangouts' && styles.filterPillActive]}
          onPress={() => setFilterType('hangouts')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="wine"
            size={12}
            color={filterType === 'hangouts' ? '#FAF8F3' : '#77766F'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterPillText, filterType === 'hangouts' && styles.filterPillTextActive]}>
            Hangouts & Trips
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filterType === 'direct' && styles.filterPillActive]}
          onPress={() => setFilterType('direct')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={12}
            color={filterType === 'direct' ? '#FAF8F3' : '#77766F'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterPillText, filterType === 'direct' && styles.filterPillTextActive]}>
            1:1 Direct
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8B27A" />
        }
      >
        {loading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={styles.skeletonAvatar} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.skeletonLineShort} />
                  <View style={styles.skeletonLineLong} />
                </View>
              </View>
            ))}
          </View>
        ) : filteredList.length > 0 ? (
          filteredList.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.convCard, SHADOWS.card]}
              activeOpacity={0.8}
              onPress={() => onSelectConversation && onSelectConversation(item)}
            >
              {/* Avatar with Online/Active Badge */}
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500' }}
                  style={styles.avatar}
                />
                {item.online && <View style={styles.onlineDot} />}
                {!item.is_direct && (
                  <View style={styles.groupBadge}>
                    <Ionicons name="wine" size={9} color="#FAF8F3" />
                  </View>
                )}
              </View>

              {/* Info Column */}
              <View style={styles.convInfo}>
                <View style={styles.topRow}>
                  <Text style={styles.convName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.convTime}>
                    {formatTimestamp(item.last_message_time)}
                  </Text>
                </View>

                {/* Subtitle / Context badge */}
                <View style={styles.contextRow}>
                  {item.destination && (
                    <View style={styles.destBadge}>
                      <Text style={styles.destBadgeText}>📍 {item.destination}</Text>
                    </View>
                  )}
                  {item.hangout_id && (
                    <View style={[styles.destBadge, { backgroundColor: '#FDF4DC' }]}>
                      <Text style={[styles.destBadgeText, { color: '#B99A5E' }]}>Hangout</Text>
                    </View>
                  )}
                </View>

                {/* Latest Message Preview */}
                <View style={styles.bottomRow}>
                  <Text style={[styles.lastMsgText, item.unread_count > 0 && styles.lastMsgUnread]} numberOfLines={1}>
                    {item.last_message}
                  </Text>
                  {item.unread_count > 0 && (
                    <View style={styles.unreadBubble}>
                      <Text style={styles.unreadCountText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="chatbubbles-outline" size={32} color="#C8B27A" />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Connect with fellow travelers in Discover or plan a spontaneous meetup in Hangouts.
            </Text>
            {onCreateHangout && (
              <TouchableOpacity style={styles.createHangoutBtn} activeOpacity={0.8} onPress={onCreateHangout}>
                <Ionicons name="add" size={15} color="#FAF8F3" style={{ marginRight: 4 }} />
                <Text style={styles.createHangoutBtnText}>Start a Hangout Circle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DCD1',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#171817',
    padding: 0,
  },
  filterStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0ECE1',
    borderWidth: 1,
    borderColor: '#E2DCD1',
  },
  filterPillActive: {
    backgroundColor: '#171817',
    borderColor: '#171817',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#77766F',
  },
  filterPillTextActive: {
    color: '#FAF8F3',
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E3D8',
  },
  avatarWrapper: {
    position: 'relative',
    width: 50,
    height: 50,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EBE6DC',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  convInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 6,
  },
  convTime: {
    fontSize: 11,
    color: '#8A867E',
    fontWeight: '500',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 3,
  },
  destBadge: {
    backgroundColor: '#F5F2EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  destBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4A4B45',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  lastMsgText: {
    fontSize: 12,
    color: '#8A867E',
    flex: 1,
    marginRight: 8,
  },
  lastMsgUnread: {
    fontWeight: '700',
    color: '#171817',
  },
  unreadBubble: {
    backgroundColor: '#171817',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCountText: {
    color: '#FAF8F3',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171817',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8A867E',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  createHangoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createHangoutBtnText: {
    color: '#FAF8F3',
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonContainer: {
    gap: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0ECE1',
    padding: 12,
    borderRadius: 14,
    opacity: 0.6,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E0D8',
    marginRight: 12,
  },
  skeletonLineShort: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E5E0D8',
  },
  skeletonLineLong: {
    width: '75%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E5E0D8',
  },
});
