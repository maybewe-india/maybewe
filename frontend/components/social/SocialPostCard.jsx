import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  Share,
  Animated,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { RADII, FONTS, SHADOWS } from "../../lib/theme.js";
import { togglePostReaction, togglePostSave, deletePost } from "../../lib/posts.js";
import { blockUser } from "../../lib/social.js";

export default function SocialPostCard({
  post,
  currentUserId = null,
  onOpenComments = null,
  onCommentPress = null,
  onPostDeleted = null,
  onDeletePost = null,
  onAuthorBlocked = null,
  onBlockAuthor = null,
  onOpenReport = null,
  onReportPost = null,
  onOpenDestination = null,
  onLikeChange = null,
}) {
  const handleOpenComments = onOpenComments || onCommentPress;
  const handlePostDeleted = onPostDeleted || onDeletePost;
  const handleAuthorBlocked = onAuthorBlocked || onBlockAuthor;
  const handleOpenReport = onOpenReport || onReportPost;
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(windowWidth - 28, 480);
  const isOwner = String(post.user_id) === String(currentUserId);

  const [isLiked, setIsLiked] = useState(Boolean(post.is_liked_by_viewer));
  const [likesCount, setLikesCount] = useState(post.likes_count ?? post.like_count ?? 0);
  const [isSaved, setIsSaved] = useState(Boolean(post.is_saved_by_viewer));
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Heart pop animation for double-tap
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const likeScale = useRef(new Animated.Value(1)).current;

  const triggerLikeBounce = () => {
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 1.3, duration: 110, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const triggerHeartAnimation = () => {
    heartScale.setValue(0.4);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(heartOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleLikeToggle = async () => {
    if (likeBusy || !currentUserId) return;
    setLikeBusy(true);

    // Optimistic update
    const nextState = !isLiked;
    setIsLiked(nextState);
    if (nextState) triggerLikeBounce();
    const nextCount = nextState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(nextCount);
    onLikeChange?.(post.id, nextState, nextCount);

    try {
      const res = await togglePostReaction(post.id, currentUserId, "like", post.user_id);
      setIsLiked(res.isLiked);
      setLikesCount(res.likesCount);
      onLikeChange?.(post.id, res.isLiked, res.likesCount);
    } catch (err) {
      console.warn("handleLikeToggle error:", err);
      // Revert
      setIsLiked(!nextState);
      const revertedCount = !nextState ? likesCount + 1 : Math.max(0, likesCount - 1);
      setLikesCount(revertedCount);
      onLikeChange?.(post.id, !nextState, revertedCount);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      triggerHeartAnimation();
      if (!isLiked) handleLikeToggle();
    }
    lastTapRef.current = now;
  };

  const handleSaveToggle = async () => {
    if (!currentUserId) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      const res = await togglePostSave(post.id, currentUserId);
      setIsSaved(res.saved);
    } catch (err) {
      setIsSaved(!nextSaved);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${post.user_name}'s Journey in ${post.destination || "India"}`,
        message: `${post.content || "Check out this travel story on MaybeWe!"}`,
      });
    } catch (err) {}
  };

  const handleDelete = async () => {
    if (!isOwner || !currentUserId) return;
    Alert.alert(
      "Delete Story",
      "Are you sure you want to permanently delete this travel story?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePost(post.id, currentUserId);
              if (handlePostDeleted) handlePostDeleted(post.id);
            } catch (err) {
              Alert.alert("Error", err?.message || "Could not delete story.");
            }
          },
        },
      ]
    );
  };

  const handleBlockAuthor = async () => {
    if (isOwner || !currentUserId) return;
    Alert.alert(
      `Block ${post.user_name}?`,
      "You will no longer see each other's posts, comments, or travel updates.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(currentUserId, post.user_id);
              if (handleAuthorBlocked) handleAuthorBlocked(post.user_id);
            } catch (err) {
              Alert.alert("Error", err?.message || "Could not block user.");
            }
          },
        },
      ]
    );
  };

  const mediaList = Array.isArray(post.media) && post.media.length > 0 ? post.media : [];
  const timeAgo = formatTimeAgo(post.created_at);

  return (
    <View style={styles.cardContainer}>
      {/* 1. Author Header */}
      <View style={styles.authorRow}>
        <View style={[styles.avatarWrap, (post.user_trust_score >= 80 || post.is_verified) && styles.avatarWrapVerified]}>
          <Image
            source={{
              uri:
                post.user_avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
            }}
            style={styles.authorAvatar}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.authorName}>{post.user_name}</Text>
            {(post.user_trust_score >= 80 || post.is_verified) && (
              <Ionicons name="shield-checkmark" size={13} color="#D4AF37" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={styles.metadataPill}>
            <Text style={styles.metadataText}>
              {post.destination ? `📍 ${post.destination} · ` : ""}{timeAgo}
            </Text>
          </View>
        </View>

        {/* Menu Options Button */}
        <TouchableOpacity
          style={styles.optionsBtn}
          onPress={() => setMenuOpen((prev) => !prev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#7D756D" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Options Menu */}
      {menuOpen && (
        <View style={styles.optionsMenu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={16} color="#1E1B18" />
            <Text style={styles.menuItemText}>Share Story</Text>
          </TouchableOpacity>
          {isOwner ? (
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color="#E57373" />
              <Text style={[styles.menuItemText, { color: "#E57373" }]}>Delete Story</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  if (handleOpenReport) handleOpenReport({ type: "post", id: post.id, authorId: post.user_id });
                }}
              >
                <Ionicons name="flag-outline" size={16} color="#C62828" />
                <Text style={[styles.menuItemText, { color: "#C62828" }]}>Report Story</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleBlockAuthor}>
                <Ionicons name="ban-outline" size={16} color="#C62828" />
                <Text style={[styles.menuItemText, { color: "#C62828" }]}>Block {post.user_name}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* 2. Presentation: Media or Bespoke Text Dispatch */}
      {mediaList.length > 0 ? (
        <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={styles.mediaContainer}>
          <FlatList
            data={mediaList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
              setActiveMediaIndex(idx);
            }}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={({ item }) => (
              <View style={{ width: cardWidth, position: "relative" }}>
                <Image
                  source={{ uri: item.media_url }}
                  style={[styles.mediaImage, { width: cardWidth }]}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(28, 25, 23, 0.40)"]}
                  style={styles.mediaBottomGradient}
                  pointerEvents="none"
                />
              </View>
            )}
          />

          {/* Animated Heart Overlay on Double Tap */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartOverlay,
              {
                transform: [{ scale: heartScale }],
                opacity: heartOpacity,
              },
            ]}
          >
            <Ionicons name="heart" size={80} color="#FAF8F3" />
          </Animated.View>

          {/* Multi-Photo Carousel Dots Indicator */}
          {mediaList.length > 1 && (
            <View style={styles.dotsRow}>
              {mediaList.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeMediaIndex && styles.activeDot]}
                />
              ))}
            </View>
          )}
        </TouchableOpacity>
      ) : (
        /* Bespoke Travel Dispatch / Journal Entry */
        <View style={styles.dispatchContainer}>
          <View style={styles.dispatchTagRow}>
            <Text style={styles.dispatchTag}>✦ DISPATCH</Text>
            {post.destination ? (
              <Text style={styles.dispatchDest}>· {post.destination.toUpperCase()}</Text>
            ) : null}
          </View>
          <Text style={styles.dispatchBodyText}>
            "{post.content}"
          </Text>
        </View>
      )}

      {/* 3. Action / Reactions Dock */}
      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLikeToggle} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color={isLiked ? "#E53935" : "#1E1B18"}
              />
            </Animated.View>
            <Text style={[styles.actionCount, isLiked && { color: "#E53935" }]}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenComments && handleOpenComments(post)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={21} color="#1E1B18" />
            <Text style={styles.actionCount}>{post.comments_count ?? 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={20} color="#1E1B18" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={handleSaveToggle} activeOpacity={0.7}>
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={21}
            color={isSaved ? "#D4AF37" : "#1E1B18"}
          />
        </TouchableOpacity>
      </View>

      {/* 4. Story Caption (for media posts) */}
      {mediaList.length > 0 && Boolean(post.content) && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText} numberOfLines={captionExpanded ? undefined : 3}>
            <Text style={styles.captionAuthor}>{post.user_name} </Text>
            {post.content}
          </Text>
          {post.content.length > 120 && !captionExpanded && (
            <TouchableOpacity onPress={() => setCaptionExpanded(true)} style={{ marginTop: 2 }}>
              <Text style={styles.moreText}>more</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function formatTimeAgo(isoString) {
  if (!isoString) return "just now";
  const delta = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.25)",
    padding: 14,
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
    overflow: "hidden",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapVerified: {
    borderWidth: 1.5,
    borderColor: "#D4AF37",
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E2DDD2",
  },
  authorName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B18",
  },
  metadataPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metadataText: {
    fontSize: 11,
    color: "#7D756D",
    fontWeight: "500",
  },
  destinationText: {
    fontSize: 11,
    color: "#C5A880",
    fontWeight: "600",
  },
  dotSeparator: {
    marginHorizontal: 4,
    fontSize: 10,
    color: "#B4B0A7",
  },
  timeText: {
    fontSize: 11,
    color: "#7D756D",
  },
  optionsBtn: {
    padding: 6,
  },
  optionsMenu: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.28)",
    borderRadius: RADII.md,
    marginHorizontal: 8,
    marginBottom: 10,
    paddingVertical: 4,
    ...SHADOWS.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  menuItemText: {
    fontSize: 13,
    color: "#1E1B18",
    fontWeight: "600",
  },
  mediaContainer: {
    position: "relative",
    backgroundColor: "#F4EFEB",
    borderRadius: 18,
    overflow: "hidden",
  },
  mediaImage: {
    height: 340,
    borderRadius: 18,
  },
  mediaBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  heartOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -40,
    marginLeft: -40,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "#D4AF37",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dispatchContainer: {
    backgroundColor: "#FCFAF7",
    borderLeftWidth: 3,
    borderLeftColor: "#D4AF37",
    borderWidth: 1,
    borderColor: "rgba(197, 168, 128, 0.22)",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    marginVertical: 6,
  },
  dispatchTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  dispatchTag: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  dispatchDest: {
    color: "#7D756D",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.0,
  },
  dispatchBodyText: {
    color: "#1E1B18",
    fontSize: 15,
    lineHeight: 23,
    fontStyle: "italic",
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7D756D",
  },
  captionContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  captionText: {
    fontSize: 13,
    color: "#2B2A27",
    lineHeight: 19,
  },
  captionAuthor: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    color: "#1E1B18",
  },
  moreText: {
    fontSize: 12,
    color: "#8A8882",
    fontWeight: "600",
  },
});