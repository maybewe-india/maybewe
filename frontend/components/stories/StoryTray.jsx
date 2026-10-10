import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchActiveStories } from "../../lib/stories.js";
import { supabase } from "../../lib/supabaseClient.js";
import StoryViewerModal from "./StoryViewerModal.jsx";
import CreateStoryModal from "./CreateStoryModal.jsx";

export default function StoryTray({
  currentUserId = null,
  currentUserProfile = null,
  onStoriesChanged = null,
}) {
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIndex, setSelectedUserIndex] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Load active stories
  const loadStories = useCallback(async () => {
    try {
      const groups = await fetchActiveStories({ viewerId: currentUserId });
      setUserGroups(groups);
      if (onStoriesChanged) {
        onStoriesChanged(groups);
      }
    } catch (err) {
      console.warn("Error loading stories tray:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, onStoriesChanged]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Realtime subscription for live stories updates
  useEffect(() => {
    // Unique channel identifier scoped by active_stories_tray_channel to prevent
    // channel collision and "cannot add postgres_changes callbacks after subscribe" error
    const channelName = `active_stories_tray_channel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories" },
        () => {
          loadStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStories]);

  // Split into current user's group and other travelers' groups
  const { myStoryGroup, otherStoryGroups, allOrderedGroups } = useMemo(() => {
    let myGroup = null;
    const others = [];

    for (const group of userGroups) {
      if (currentUserId && group.userId === currentUserId) {
        myGroup = group;
      } else {
        others.push(group);
      }
    }

    // Combined ordered list where current user's group is first if present
    const combined = myGroup ? [myGroup, ...others] : others;

    return {
      myStoryGroup: myGroup,
      otherStoryGroups: others,
      allOrderedGroups: combined,
    };
  }, [userGroups, currentUserId]);

  const handleOpenMyStory = () => {
    if (myStoryGroup && myStoryGroup.stories.length > 0) {
      setSelectedUserIndex(0);
      setIsViewerOpen(true);
    } else {
      setIsCreateOpen(true);
    }
  };

  const handleOpenTravelerStory = (group) => {
    const idx = allOrderedGroups.findIndex((g) => g.userId === group.userId);
    setSelectedUserIndex(idx >= 0 ? idx : 0);
    setIsViewerOpen(true);
  };

  const handleStoryCreated = () => {
    setIsCreateOpen(false);
    loadStories();
  };

  const handleStoryDeleted = () => {
    loadStories();
  };

  if (loading && userGroups.length === 0) {
    return (
      <View style={styles.trayContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonItem}>
              <View style={styles.skeletonCircle} />
              <View style={styles.skeletonLabel} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.trayContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Item 0: Your Story / Add Story */}
        <View style={styles.storyItem}>
          <TouchableOpacity
            style={[
              styles.avatarRing,
              myStoryGroup
                ? styles.ringActive
                : styles.ringCreateEmpty,
            ]}
            onPress={handleOpenMyStory}
            activeOpacity={0.8}
          >
            {currentUserProfile?.avatar_url || myStoryGroup?.userAvatar ? (
              <Image
                source={{
                  uri:
                    currentUserProfile?.avatar_url ||
                    myStoryGroup?.userAvatar,
                }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarImage, styles.placeholderAvatar]}>
                <Ionicons name="person" size={20} color="#7D756D" />
              </View>
            )}

            {/* If user has no active stories, or always show a small + add button */}
            {!myStoryGroup ? (
              <View style={styles.addBadge}>
                <Ionicons name="add" size={14} color="#D4AF37" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addMoreBadge}
                onPress={() => setIsCreateOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={12} color="#D4AF37" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <Text style={styles.userNameText} numberOfLines={1}>
            Your Story
          </Text>
        </View>

        {/* Other Travelers' Stories */}
        {otherStoryGroups.map((group) => {
          const hasUnseen = group.hasUnseen;

          return (
            <TouchableOpacity
              key={group.userId}
              style={styles.storyItem}
              onPress={() => handleOpenTravelerStory(group)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.avatarRing,
                  hasUnseen ? styles.ringUnseen : styles.ringSeen,
                ]}
              >
                {group.userAvatar ? (
                  <Image
                    source={{ uri: group.userAvatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={[styles.avatarImage, styles.placeholderAvatar]}>
                    <Ionicons name="person" size={20} color="#7D756D" />
                  </View>
                )}

                {/* Multiple stories indicator badge */}
                {group.stories.length > 1 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {group.stories.length}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.userNameText} numberOfLines={1}>
                {group.userName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Story Viewer Modal */}
      {isViewerOpen && (
        <StoryViewerModal
          visible={isViewerOpen}
          userGroups={allOrderedGroups}
          initialUserIndex={selectedUserIndex ?? 0}
          currentUserId={currentUserId}
          onClose={() => setIsViewerOpen(false)}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {/* Create Story Modal */}
      {isCreateOpen && (
        <CreateStoryModal
          visible={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trayContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.22)",
    borderRadius: 24,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
    alignItems: "center",
  },
  storyItem: {
    alignItems: "center",
    width: 68,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  ringActive: {
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  ringUnseen: {
    borderWidth: 2,
    borderColor: "#D4AF37",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  ringSeen: {
    borderWidth: 1.5,
    borderColor: "rgba(197, 168, 128, 0.35)",
  },
  ringCreateEmpty: {
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.45)",
    borderStyle: "dashed",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 29,
    backgroundColor: "#F4EFEB",
  },
  placeholderAvatar: {
    backgroundColor: "#F4EFEB",
    justifyContent: "center",
    alignItems: "center",
  },
  addBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1C1917",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D4AF37",
  },
  addMoreBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1C1917",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D4AF37",
  },
  countBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#1C1917",
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D4AF37",
  },
  userNameText: {
    marginTop: 6,
    fontSize: 11,
    color: "#1E1B18",
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 64,
  },
  skeletonItem: {
    alignItems: "center",
    width: 68,
  },
  skeletonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  skeletonLabel: {
    marginTop: 6,
    width: 44,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});
