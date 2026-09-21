import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';
import GradientHeader from '../../components/ui/GradientHeader';
import Avatar from '../../components/ui/Avatar';
import TrustBadge from '../../components/ui/TrustBadge';
import SkeletonCard from '../../components/ui/SkeletonCard';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../lib/authContext';
import { getMatches, updateMatchStatus } from '../../lib/matches';

const MATCHES_BG = require('../../assets/images/chat_twilight_bg.jpg');

export default function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('connections'); // 'connections' | 'requests'
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const data = await getMatches(user?.id);
      setMatches(data);
    } catch (err) {
      console.warn('Matches fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleAccept = async (matchId) => {
    await updateMatchStatus(matchId, 'accepted');
    Alert.alert('Connected! 🎉', 'You can now coordinate itineraries and chat directly.');
    fetchMatches();
  };

  const handleDecline = async (matchId) => {
    await updateMatchStatus(matchId, 'declined');
    fetchMatches();
  };

  const openChat = (match) => {
    router.push({
      pathname: `/chat/${match.id}`,
      params: {
        partnerName: match.user?.name,
        partnerAvatar: match.user?.avatar_url,
        partnerScore: match.user?.trust_score,
        partnerVerified: match.user?.verification_status === 'verified',
        destination: match.trip?.destination || 'Upcoming Trip',
      },
    });
  };

  const openReview = (match) => {
    router.push({
      pathname: `/review/${match.id}`,
      params: {
        reviewedId: match.user?.id,
        reviewedName: match.user?.name,
        tripDestination: match.trip?.destination,
      },
    });
  };

  const pendingRequests = matches.filter((m) => m.status === 'pending');
  const connections = matches.filter((m) => m.status === 'accepted');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ImageBackground
        source={MATCHES_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={colors.bgGradientOverlay}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={styles.container}>
        <GradientHeader
          title="Connections & Chat"
          subtitle="Shared journeys & active chats"
          rightIcon="shield-checkmark-outline"
          rightAction={() => router.push('/(auth)/guidelines')}
        />

        {/* Segmented Control Tabs */}
        <View style={styles.tabBarWrapper}>
          <View style={[styles.tabBar, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('connections')}
              style={[
                styles.tabBtn,
                activeTab === 'connections' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: colors.textMuted },
                  activeTab === 'connections' && [styles.activeTabBtnText, { color: colors.primaryText }],
                ]}
              >
                Connections ({connections.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('requests')}
              style={[
                styles.tabBtn,
                activeTab === 'requests' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: colors.textMuted },
                  activeTab === 'requests' && [styles.activeTabBtnText, { color: colors.primaryText }],
                ]}
              >
                Requests ({pendingRequests.length})
              </Text>
              {pendingRequests.length > 0 && <View style={[styles.tabNotificationDot, { backgroundColor: colors.danger }]} />}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {loading ? (
            <View>
              <SkeletonCard height={180} />
              <SkeletonCard height={180} />
            </View>
          ) : activeTab === 'connections' ? (
            connections.length > 0 ? (
              connections.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  onPress={() => openChat(match)}
                  activeOpacity={0.85}
                  style={[styles.connectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, SHADOWS.soft]}
                >
                  <View style={styles.cardTopRow}>
                    <Avatar
                      uri={match.user?.avatar_url}
                      name={match.user?.name}
                      size={54}
                      verified={match.user?.verification_status === 'verified'}
                      online={true}
                      ringVariant="lavender"
                    />

                    <View style={styles.cardInfo}>
                      <View style={styles.nameScoreRow}>
                        <Text style={[styles.userName, { color: colors.textPrimary }]}>{match.user?.name}</Text>
                        <TrustBadge
                          score={match.user?.trust_score || 4.9}
                          verificationStatus={match.user?.verification_status}
                          variant="compact"
                        />
                      </View>

                      <Text style={[styles.tripMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        📍 {match.trip?.destination || 'Upcoming Trip'} ({match.trip?.dates || 'Dates overlap'})
                      </Text>

                      <Text style={[styles.lastMessagePreview, { color: colors.textMuted }]} numberOfLines={1}>
                        {match.lastMessage || 'Connected! Start coordinating your journey.'}
                      </Text>
                    </View>

                    <View style={[styles.chatActionIndicator, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
                      <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
                    </View>
                  </View>

                  {/* Bottom Action Bar */}
                  <View style={[styles.connectionBottomBar, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      onPress={() => openReview(match)}
                      style={styles.reviewQuickBtn}
                    >
                      <Ionicons name="star-outline" size={13} color={colors.warning} style={{ marginRight: 4 }} />
                      <Text style={[styles.reviewQuickText, { color: colors.warning }]}>Leave Review</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openChat(match)}
                      style={[styles.openChatPill, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.openChatPillText, { color: colors.primaryText }]}>Open Chat</Text>
                      <Ionicons name="chevron-forward" size={13} color={colors.primaryText} style={{ marginLeft: 3 }} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <EmptyState
                icon="people-outline"
                title="No connections yet"
                description="Explore compatible travelers in Discover and send connection requests to start chatting."
                actionTitle="Discover Travelers"
                onAction={() => router.push('/(tabs)/discovery')}
              />
            )
          ) : (
            pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
                <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, SHADOWS.soft]}>
                  <View style={styles.cardTopRow}>
                    <Avatar
                      uri={req.user?.avatar_url}
                      name={req.user?.name}
                      size={56}
                      verified={req.user?.verification_status === 'verified'}
                      ringVariant="peach"
                    />

                    <View style={styles.cardInfo}>
                      <View style={styles.nameScoreRow}>
                        <Text style={[styles.userName, { color: colors.textPrimary }]}>{req.user?.name}</Text>
                        <TrustBadge
                          score={req.user?.trust_score || 4.8}
                          verificationStatus={req.user?.verification_status}
                          variant="compact"
                        />
                      </View>

                      <Text style={[styles.tripMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        📍 {req.trip?.destination} ({req.trip?.dates})
                      </Text>

                      {req.user?.travel_styles && (
                        <Text style={[styles.stylesNote, { color: colors.textMuted }]}>
                          Travel styles: {req.user.travel_styles.slice(0, 2).join(', ')}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Initial Note */}
                  {req.initialNote && (
                    <View style={[styles.noteBox, { backgroundColor: isDark ? 'rgba(6, 21, 34, 0.60)' : 'rgba(237, 241, 247, 0.85)', borderColor: colors.border }]}>
                      <Text style={[styles.noteText, { color: colors.textSecondary }]}>"{req.initialNote}"</Text>
                    </View>
                  )}

                  {/* Accept / Decline Action Buttons */}
                  <View style={styles.requestActionsRow}>
                    <TouchableOpacity
                      onPress={() => handleDecline(req.id)}
                      style={[styles.declineBtn, { backgroundColor: colors.chipBg, borderColor: colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.declineBtnText, { color: colors.textMuted }]}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleAccept(req.id)}
                      style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="checkmark-circle" size={17} color={colors.primaryText} style={{ marginRight: 6 }} />
                      <Text style={[styles.acceptBtnText, { color: colors.primaryText }]}>Accept Connection</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="mail-unread-outline"
                title="No pending requests"
                description="When other MaybeWe travelers reach out to join your trips, their connection requests will appear here."
              />
            )
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADII.lg,
  },
  activeTabBtn: {
    backgroundColor: '#FFFFFF',
  },
  tabBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabBtnText: {
    fontFamily: FONTS.bold,
    color: '#061522',
    fontWeight: '700',
  },
  tabNotificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 6,
  },
  scrollBody: {
    padding: 16,
  },
  connectionCard: {
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII['2xl'],
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
  },
  requestCard: {
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII['2xl'],
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  userName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  tripMeta: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 4,
  },
  stylesNote: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  lastMessagePreview: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  chatActionIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  connectionBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  reviewQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  reviewQuickText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.sunset,
    fontWeight: '700',
  },
  openChatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADII.full,
  },
  openChatPillText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#061522',
    fontWeight: '700',
  },
  noteBox: {
    backgroundColor: 'rgba(6, 21, 34, 0.60)',
    borderRadius: RADII.lg,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  noteText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  requestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  declineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADII.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  declineBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADII.xl,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  acceptBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#061522',
  },
});
