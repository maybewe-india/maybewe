import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/themeContext.jsx";
import { COLORS, RADII, SHADOWS, FONTS } from "../lib/theme.js";
import {
  fetchUserHangouts,
  fetchDiscoverHangouts,
  subscribeToHangoutsFeed,
} from "../lib/hangouts.js";

export default function HangoutsListView({
  onSelectHangout,
  onCreateNewHangout,
  onCreateHangout,
  currentUser = null,
}) {
  const { colors } = useTheme();
  const handleOpenCreate = onCreateNewHangout || onCreateHangout;
  const [hangouts, setHangouts] = useState([]);
  const [activeTab, setActiveTab] = useState("explore"); // explore | my
  const [statusFilter, setStatusFilter] = useState("active"); // active | all | cancelled
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHangouts = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      let list = [];
      if (activeTab === "explore") {
        list = await fetchDiscoverHangouts(
          currentUser?.id,
          statusFilter === "all" ? null : statusFilter
        );
      } else {
        list = await fetchUserHangouts(currentUser?.id);
        if (statusFilter !== "all") {
          list = list.filter((h) => h.status === statusFilter);
        }
      }
      setHangouts(list || []);
    } catch (e) {
      console.warn("Error loading hangouts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHangouts();
    const unsubscribe = subscribeToHangoutsFeed(currentUser?.id, () => {
      loadHangouts(true);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [currentUser?.id, activeTab, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHangouts(true);
  };

  const formatStartTime = (timeStr) => {
    if (!timeStr) return "Upcoming";
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Scope Selector (Explore Meetups vs My Hangouts) */}
      <View style={styles.scopeRow}>
        <TouchableOpacity
          onPress={() => setActiveTab("explore")}
          style={[styles.scopeBtn, activeTab === "explore" && styles.scopeBtnActive]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="compass"
            size={14}
            color={activeTab === "explore" ? "#FAF8F3" : "#8A867E"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.scopeBtnText,
              activeTab === "explore" && styles.scopeBtnTextActive,
            ]}
          >
            Explore Meetups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("my")}
          style={[styles.scopeBtn, activeTab === "my" && styles.scopeBtnActive]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person"
            size={14}
            color={activeTab === "my" ? "#FAF8F3" : "#8A867E"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.scopeBtnText,
              activeTab === "my" && styles.scopeBtnTextActive,
            ]}
          >
            My Hangouts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Control Row with Filter & Create Button */}
      <View style={styles.topControlRow}>
        <View style={styles.filterPills}>
          {[
            { key: "active", label: "Upcoming" },
            { key: "all", label: "All" },
            { key: "cancelled", label: "Cancelled" },
          ].map((item) => {
            const isSelected = statusFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setStatusFilter(item.key)}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isSelected && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: colors.textPrimary },
                    isSelected && styles.filterPillTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleOpenCreate} style={styles.createBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#FAF8F3" />
          <Text style={styles.createBtnText}>Plan Meetup</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#B99A5E" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading live meetups...
          </Text>
        </View>
      ) : hangouts.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="people-outline" size={36} color="#B99A5E" style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {activeTab === "my" ? "You Haven't Joined Any Hangouts" : "No Meetups Found"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {activeTab === "my"
              ? "Discover upcoming hangouts or host your own travel gathering!"
              : "Be the first to host a travel hangout for fellow travelers nearby."}
          </Text>
          <TouchableOpacity onPress={handleOpenCreate} style={styles.emptyActionBtn} activeOpacity={0.85}>
            <Text style={styles.emptyActionBtnText}>+ Host a Meetup</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B99A5E" />}
        >
          {hangouts.map((h) => {
            const isCancelled = h.status === "cancelled";
            const travelersCount = h.current_travelers_count || (h.participants?.length || 1);
            const maxTravelers = h.max_travelers || 6;
            const participants = h.participants || h.members || [];
            const placeTitle = h.place_name || h.destination || "Destination Spot";

            return (
              <TouchableOpacity
                key={h.id}
                onPress={() => onSelectHangout(h)}
                style={[
                  styles.hangoutCard,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  isCancelled && styles.cardCancelled,
                ]}
                activeOpacity={0.85}
              >
                {/* Optional Cover Banner */}
                {h.cover_url ? (
                  <Image source={{ uri: h.cover_url }} style={styles.cardCoverImage} />
                ) : null}

                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        isCancelled ? styles.statusBadgeCancelled : styles.statusBadgeActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          isCancelled ? styles.statusDotCancelled : styles.statusDotActive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          isCancelled ? styles.statusTextCancelled : styles.statusTextActive,
                        ]}
                      >
                        {isCancelled ? "CANCELLED" : "ACTIVE"}
                      </Text>
                    </View>

                    <Text style={[styles.destinationTag, { color: colors.textSecondary }]}>
                      • {placeTitle}
                    </Text>

                    <View style={styles.capacityBadge}>
                      <Ionicons name="people" size={11} color="#B99A5E" style={{ marginRight: 3 }} />
                      <Text style={styles.capacityText}>
                        {travelersCount}/{maxTravelers}
                      </Text>
                    </View>
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

                {/* Timing Row */}
                <View style={styles.timeInfoRow}>
                  <Ionicons name="calendar-outline" size={13} color="#B99A5E" style={{ marginRight: 6 }} />
                  <Text style={[styles.timeInfoText, { color: colors.textSecondary }]}>
                    {formatStartTime(h.start_time)}
                  </Text>
                  {h.place_address ? (
                    <>
                      <Text style={[styles.timeInfoDot, { color: colors.textSecondary }]}>•</Text>
                      <Ionicons name="location-outline" size={13} color="#B99A5E" style={{ marginRight: 4 }} />
                      <Text style={[styles.timeInfoAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                        {h.place_address}
                      </Text>
                    </>
                  ) : null}
                </View>

                {/* Card Footer: Attendees Avatars & Host */}
                <View style={styles.cardFooter}>
                  <View style={styles.avatarStack}>
                    {participants.slice(0, 4).map((m, idx) => {
                      const avatarUri =
                        m.avatar_url ||
                        m.user?.avatar_url ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80";
                      return (
                        <Image
                          key={m.id || idx}
                          source={{ uri: avatarUri }}
                          style={[styles.stackAvatar, { marginLeft: idx > 0 ? -10 : 0 }]}
                        />
                      );
                    })}
                    {participants.length > 4 && (
                      <View style={[styles.stackAvatarMore, { marginLeft: -10 }]}>
                        <Text style={styles.stackAvatarMoreText}>+{participants.length - 4}</Text>
                      </View>
                    )}
                    {h.creator?.name ? (
                      <Text style={[styles.hostNameTag, { color: colors.textSecondary }]}>
                        Hosted by {h.creator.name}
                      </Text>
                    ) : null}
                  </View>

                  <Text style={styles.viewPlanLink}>View Details →</Text>
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
  scopeRow: {
    flexDirection: "row",
    backgroundColor: "rgba(185, 154, 94, 0.08)",
    padding: 3,
    borderRadius: 14,
    marginBottom: 12,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  scopeBtnActive: {
    backgroundColor: "#171716",
  },
  scopeBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: "#8A867E",
  },
  scopeBtnTextActive: {
    color: "#FAF8F3",
    fontWeight: "700",
  },
  topControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  filterPills: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: "#171716",
    borderColor: "#171716",
  },
  filterPillText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  filterPillTextActive: {
    color: "#FAF8F3",
    fontFamily: FONTS.semiBold,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171716",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  createBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: "#FAF8F3",
    marginLeft: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  hangoutCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
  },
  cardCancelled: {
    opacity: 0.65,
  },
  cardCoverImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(46, 125, 50, 0.15)",
  },
  statusBadgeCancelled: {
    backgroundColor: "rgba(180, 40, 40, 0.15)",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusDotActive: {
    backgroundColor: "#2E7D32",
  },
  statusDotCancelled: {
    backgroundColor: "#D32F2F",
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  statusTextActive: {
    color: "#2E7D32",
  },
  statusTextCancelled: {
    color: "#D32F2F",
  },
  destinationTag: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
  },
  capacityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(185, 154, 94, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  capacityText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#87692B",
    fontFamily: FONTS.bold,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  timeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(185, 154, 94, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  timeInfoText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
  timeInfoDot: {
    marginHorizontal: 6,
    fontSize: 10,
  },
  timeInfoAddress: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(140, 137, 131, 0.15)",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stackAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FAF8F3",
  },
  stackAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#171716",
    alignItems: "center",
    justifyContent: "center",
  },
  stackAvatarMoreText: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: "#FAF8F3",
  },
  hostNameTag: {
    marginLeft: 8,
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  viewPlanLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: "#B99A5E",
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: "#171716",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: "#FAF8F3",
  },
});
