import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/themeContext.jsx";
import { COLORS, RADII } from "../../lib/theme.js";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchFeedPosts, deletePost, togglePostSave, isAuditOrTestPost } from "../../lib/posts.js";
import { blockUser } from "../../lib/social.js";

import SocialPostCard from "../../components/social/SocialPostCard.jsx";
import FeedSkeleton from "../../components/social/FeedSkeleton.jsx";
import FeedEmptyState from "../../components/social/FeedEmptyState.jsx";
import CommentSheetModal from "../../components/social/CommentSheetModal.jsx";
import CreatePostModal from "../../components/social/CreatePostModal.jsx";
import SafetyReportModal from "../../components/SafetyReportModal.jsx";
import StoryTray from "../../components/stories/StoryTray.jsx";

const DESTINATIONS = ["All", "Goa", "Jaipur", "Kashmir", "Kerala", "Ladakh", "Hampi", "Manali"];

export default function SocialFeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Feed state
  const [posts, setPosts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorBanner, setErrorBanner] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Filters
  const [selectedDestination, setSelectedDestination] = useState("All");

  // Pagination cursor: { createdAt, id }
  const cursorRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const subscriptionRef = useRef(null);

  // Active Modals
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  // Check auth
  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || null;
      setCurrentUserId(uid);
      if (uid) {
        const { data: prof } = await supabase.from("users").select("id, name, avatar_url").eq("id", uid).maybeSingle();
        if (prof) setCurrentUserProfile(prof);
      }
    } catch {
      setCurrentUserId(null);
    }
  };

  // Initial fetch and destination change
  useEffect(() => {
    loadFeed(true);
  }, [selectedDestination]);

  // Realtime subscription setup & teardown
  useEffect(() => {
    setupRealtimeSubscription();
    return () => {
      cleanupRealtimeSubscription();
    };
  }, []);

  const setupRealtimeSubscription = () => {
    cleanupRealtimeSubscription();

    try {
      const existingCh = supabase.getChannels ? supabase.getChannels().find(c => c.topic === "realtime:social_feed_active_screen" || c.topic?.includes("social_feed_active_screen")) : null;
    if (existingCh) {
      try { supabase.removeChannel(existingCh); } catch (e) {}
    }
    const channel = supabase.channel("social_feed_active_screen");

      // Listen for new posts
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          handleIncomingNewPost(payload.new);
        }
      );

      // Listen for post deletions
      channel.on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          handleIncomingDeletedPost(payload.old);
        }
      );

      // Listen for reactions count updates or updates
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          handleIncomingUpdatedPost(payload.new);
        }
      );

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Channel active
        }
      });

      subscriptionRef.current = channel;
    } catch (err) {
      console.warn("Realtime subscription setup failed:", err);
    }
  };

  const cleanupRealtimeSubscription = () => {
    if (subscriptionRef.current) {
      try {
        supabase.removeChannel(subscriptionRef.current);
      } catch (err) {
        console.warn("Failed to clean up realtime channel:", err);
      }
      subscriptionRef.current = null;
    }
  };

  const handleIncomingNewPost = (newRecord) => {
    if (!newRecord || !newRecord.id) return;
    if (isAuditOrTestPost(newRecord)) return;
    if (seenIdsRef.current.has(newRecord.id)) return;

    // Filter by destination if destination filter is active
    if (
      selectedDestination !== "All" &&
      (newRecord.destination || "").toLowerCase() !== selectedDestination.toLowerCase()
    ) {
      return;
    }

    // Insert formatted placeholder row at the top of the feed
    seenIdsRef.current.add(newRecord.id);
    setPosts((prev) => [
      {
        id: newRecord.id,
        user_id: newRecord.user_id,
        content: newRecord.content,
        destination: newRecord.destination,
        place_id: newRecord.place_id,
        media_urls: newRecord.media_urls || [],
        likes_count: newRecord.likes_count || 0,
        comments_count: newRecord.comments_count || 0,
        visibility: newRecord.visibility || "public",
        created_at: newRecord.created_at,
        is_liked: false,
        author: {
          id: newRecord.user_id,
          name: "Traveler",
          avatar_url: null,
          city: newRecord.destination || "India",
        },
      },
      ...prev,
    ]);
  };

  const handleIncomingDeletedPost = (oldRecord) => {
    if (!oldRecord || !oldRecord.id) return;
    seenIdsRef.current.delete(oldRecord.id);
    setPosts((prev) => prev.filter((p) => p.id !== oldRecord.id));
  };

  const handleIncomingUpdatedPost = (updatedRecord) => {
    if (!updatedRecord || !updatedRecord.id) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === updatedRecord.id) {
          return {
            ...p,
            likes_count: updatedRecord.likes_count ?? p.likes_count,
            comments_count: updatedRecord.comments_count ?? p.comments_count,
            content: updatedRecord.content ?? p.content,
          };
        }
        return p;
      })
    );
  };

  const loadFeed = async (isReset = false) => {
    if (isReset) {
      setLoadingInitial(true);
      setErrorBanner("");
      cursorRef.current = null;
      seenIdsRef.current.clear();
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const destFilter = selectedDestination === "All" ? null : selectedDestination;
      const result = await fetchFeedPosts({
        destination: destFilter,
        limit: 10,
        cursor: isReset ? null : cursorRef.current,
      });

      const newPosts = result.posts || [];

      // Deduplicate keys in-memory
      const uniquePosts = [];
      for (const p of newPosts) {
        if (!seenIdsRef.current.has(p.id)) {
          seenIdsRef.current.add(p.id);
          uniquePosts.push(p);
        }
      }

      if (isReset) {
        setPosts(uniquePosts);
      } else {
        setPosts((prev) => [...prev, ...uniquePosts]);
      }

      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Feed load error:", err);
      setErrorBanner(err.message || "Unable to load travel stories. Tap to retry.");
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(true);
  }, [selectedDestination]);

  const handleEndReached = () => {
    if (!loadingInitial && !loadingMore && hasMore) {
      loadFeed(false);
    }
  };

  // Callback from SocialPostCard when user reacts/unreacts
  const handleLikeChange = (postId, isLiked, newCount) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, is_liked: isLiked, likes_count: newCount };
        }
        return p;
      })
    );
  };

  // Callback to delete post
  const handleDeletePost = async (postId) => {
    try {
      await deletePost(postId);
      seenIdsRef.current.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      Alert.alert("Delete Failed", err.message || "Could not delete post.");
    }
  };

  // Callback to block author
  const handleBlockAuthor = async (authorId) => {
    try {
      await blockUser(authorId);
      // Immediately filter out all posts from this author in current feed
      setPosts((prev) => {
        const remaining = prev.filter((p) => p.user_id !== authorId && p.author?.id !== authorId);
        seenIdsRef.current = new Set(remaining.map((p) => p.id));
        return remaining;
      });
      Alert.alert("User Blocked", "You will no longer see posts or comments from this traveler.");
    } catch (err) {
      Alert.alert("Block Failed", err.message || "Could not block user.");
    }
  };

  // When a comment is added/removed in CommentSheetModal
  const handleCommentsCountChange = (postId, newCount) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, comments_count: newCount };
        }
        return p;
      })
    );
  };

  // When a new post is published via CreatePostModal
  const handlePostCreated = (newPost) => {
    if (newPost && newPost.id) {
      seenIdsRef.current.add(newPost.id);
      setPosts((prev) => [newPost, ...prev]);
    }
  };

  const renderPostItem = ({ item }) => (
    <SocialPostCard
      post={item}
      currentUserId={currentUserId}
      onOpenComments={(post) => setActiveCommentPost(post)}
      onCommentPress={(post) => setActiveCommentPost(post)}
      onLikeChange={handleLikeChange}
      onPostDeleted={handleDeletePost}
      onDeletePost={handleDeletePost}
      onAuthorBlocked={handleBlockAuthor}
      onBlockAuthor={handleBlockAuthor}
      onOpenReport={(post) =>
        setReportTarget({
          type: "post",
          id: post.id,
          authorName: post.author?.name || "Traveler",
        })
      }
      onReportPost={(post) =>
        setReportTarget({
          type: "post",
          id: post.id,
          authorName: post.author?.name || "Traveler",
        })
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: "#FAF8F5" }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 16 : insets.top + 6 }]}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.brandTitle}>MAYBEWE</Text>
          <Text style={styles.brandSubtitle}>TRAVEL CHRONICLES</Text>
        </View>

        <TouchableOpacity
          style={styles.createStoryBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
          accessibilityLabel="Create Story"
        >
          <Ionicons name="add" size={18} color="#D4AF37" />
          <Text style={styles.createStoryBtnText}>Create Story</Text>
        </TouchableOpacity>
      </View>

      {/* 24-Hour Ephemeral Stories Tray */}
      <StoryTray currentUserId={currentUserId} currentUserProfile={currentUserProfile} />

      {/* Destination Filter Chips */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          data={DESTINATIONS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterListContent}
          renderItem={({ item }) => {
            const isSelected = selectedDestination === item;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedDestination(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Error Banner */}
      {errorBanner ? (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => loadFeed(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle-outline" size={18} color="#FF6B6B" />
          <Text style={styles.errorBannerText}>{errorBanner}</Text>
          <Ionicons name="refresh" size={16} color="#FF6B6B" />
        </TouchableOpacity>
      ) : null}

      {/* Main Content Area */}
      {loadingInitial ? (
        <FeedSkeleton count={3} />
      ) : posts.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 120, justifyContent: "center" }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#D4AF37"
              colors={["#D4AF37"]}
            />
          }
        >
          <FeedEmptyState
            destination={selectedDestination}
            onRefresh={() => loadFeed(true)}
            onCreatePress={() => setCreateModalVisible(true)}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          contentContainerStyle={[
            styles.feedListContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#D4AF37"
              colors={["#D4AF37"]}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <FeedSkeleton count={1} />
              </View>
            ) : null
          }
        />
      )}

      {/* Comment Sheet Modal */}
      {activeCommentPost && (
        <CommentSheetModal
          visible={!!activeCommentPost}
          post={activeCommentPost}
          currentUserId={currentUserId}
          onClose={() => setActiveCommentPost(null)}
          onCommentsCountChange={handleCommentsCountChange}
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Safety Report Modal */}
      {reportTarget && (
        <SafetyReportModal
          visible={!!reportTarget}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.authorName}
          onClose={() => setReportTarget(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(28, 25, 23, 0.06)",
  },
  headerTitleBox: {
    flexDirection: "column",
  },
  brandTitle: {
    color: "#1E1B18",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2.0,
  },
  brandSubtitle: {
    color: "#7D756D",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  createStoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1917",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.35)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 5,
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  createStoryBtnText: {
    color: "#D4AF37",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  filterBar: {
    paddingVertical: 10,
    backgroundColor: "#FAF8F5",
  },
  filterListContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.25)",
  },
  filterChipActive: {
    backgroundColor: "#1C1917",
    borderColor: "#1C1917",
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  filterChipText: {
    color: "#7D756D",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#D4AF37",
    fontWeight: "800",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B6B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: RADII.sm,
  },
  errorBannerText: {
    color: "#FF6B6B",
    fontSize: 12,
    flex: 1,
  },
  feedListContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  footerLoader: {
    paddingVertical: 10,
  },
});
