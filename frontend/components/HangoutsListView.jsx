import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/themeContext.jsx';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme.js';
import { fetchUserHangouts } from '../lib/hangouts.js';

export default function HangoutsListView({
  onSelectHangout,
  onCreateNewHangout,
  currentUser = null,
}) {
  const { colors } = useTheme();
  const [hangouts, setHangouts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all | planning | scheduled
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHangouts();
  }, [currentUser]);

  const loadHangouts = async () => {
    setLoading(true);
    try {
      const list = await fetchUserHangouts(currentUser?.id);
      setHangouts(list);
    } catch (e) {
      console.warn('Error loading hangouts:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHangouts = hangouts.filter((h) => {
    if (statusFilter === 'all') return true;
    return h.status === statusFilter;
  });

  return (
    <View style={styles.container}>
      {/* Top Bar with Filter Pills & Create Button */}
      <View style={styles.topControlRow}>
        <View style={styles.filterPills}>
          {['all', 'planning', 'scheduled'].map((s) => {
            const isSelected = statusFilter === s;
            const label = s === 'all' ? 'All' : s === 'planning' ? 'Planning' : 'Confirmed';
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setStatusFilter(s)}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isSelected && styles.filterPillActive,
                ]}
              >
                <Text style={[styles.filterPillText, { color: colors.textPrimary }, isSelected && styles.filterPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={onCreateNewHangout}
          style={styles.createBtn}
        >
          <Ionicons name="add" size={16} color="#FAF8F3" />
          <Text style={styles.createBtnText}>Plan Meetup</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {filteredHangouts.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="people-outline" size={36} color="#B99A5E" style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Hangouts Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Plan a spontaneous meetup with fellow travelers in Goa, Jaipur, or Kashmir.
          </Text>
          <TouchableOpacity onPress={onCreateNewHangout} style={styles.emptyActionBtn}>
            <Text style={styles.emptyActionBtnText}>+ Plan Your First Hangout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {filteredHangouts.map((h) => {
            const isScheduled = h.status === 'scheduled';
            return (
              <TouchableOpacity
                key={h.id}
                onPress={() => onSelectHangout(h)}
                style={[styles.hangoutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, isScheduled ? styles.statusBadgeScheduled : styles.statusBadgePlanning]}>
                      <View style={[styles.statusDot, isScheduled ? styles.statusDotScheduled : styles.statusDotPlanning]} />
                      <Text style={[styles.statusText, isScheduled ? styles.statusTextScheduled : styles.statusTextPlanning]}>
                        {isScheduled ? 'CONFIRMED' : 'VOTING'}
                      </Text>
                    </View>
                    <Text style={[styles.destinationTag, { color: colors.textSecondary }]}>• {h.destination}</Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {h.title}
                  </Text>
                </View>

                {h.description ? (
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {h.description}
                  </Text>
                ) : null}

                {/* Finalized Summary or Voting info */}
                {isScheduled && h.finalized_plan ? (
                  <View style={styles.scheduledInfoBox}>
                    <Ionicons name="location" size={13} color="#B99A5E" style={{ marginRight: 6 }} />
                    <Text style={styles.scheduledPlaceName} numberOfLines={1}>
                      {h.finalized_plan.place_name} ({h.finalized_plan.time || '18:00'})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.votingInfoRow}>
                    <Ionicons name="thumbs-up-outline" size={13} color="#B99A5E" style={{ marginRight: 6 }} />
                    <Text style={[styles.votingInfoText, { color: colors.textSecondary }]}>
                      {h.suggestions?.length || 0} Places in voting • {h.target_date || 'Date TBD'}
                    </Text>
                  </View>
                )}

                {/* Card Footer: Members Avatars */}
                <View style={styles.cardFooter}>
                  <View style={styles.avatarStack}>
                    {(h.members || []).slice(0, 4).map((m, idx) => (
                      <Image
                        key={m.id || idx}
                        source={{ uri: m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' }}
                        style={[styles.stackAvatar, { marginLeft: idx > 0 ? -10 : 0 }]}
                      />
                    ))}
                    {(h.members?.length || 0) > 4 && (
                      <View style={[styles.stackAvatarMore, { marginLeft: -10 }]}>
                        <Text style={styles.stackAvatarMoreText}>+{(h.members?.length || 0) - 4}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.viewPlanLink}>View Plan →</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: '#171716',
    borderColor: '#171716',
  },
  filterPillText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  filterPillTextActive: {
    color: '#FAF8F3',
    fontFamily: FONTS.semiBold,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171716',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  createBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#FAF8F3',
    marginLeft: 4,
  },
  listContent: {
    gap: 12,
    paddingBottom: 20,
  },
  hangoutCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgePlanning: {
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
  },
  statusBadgeScheduled: {
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  statusDotPlanning: {
    backgroundColor: '#B99A5E',
  },
  statusDotScheduled: {
    backgroundColor: '#2E7D32',
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  statusTextPlanning: {
    color: '#87692B',
  },
  statusTextScheduled: {
    color: '#2E7D32',
  },
  destinationTag: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginLeft: 6,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  scheduledInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 154, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  scheduledPlaceName: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#87692B',
  },
  votingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  votingInfoText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(140, 137, 131, 0.15)',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#FAF8F3',
  },
  stackAvatarMore: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#171716',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarMoreText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: '#FAF8F3',
  },
  viewPlanLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#B99A5E',
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#171716',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FAF8F3',
  },
});
