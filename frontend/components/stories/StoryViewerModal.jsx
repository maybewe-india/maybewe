import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { recordStoryView, deleteStory, fetchStoryViewers } from "../../lib/stories.js";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewerModal({
  visible,
  userGroups = [],
  initialUserIndex = 0,
  currentUserId = null,
  onClose,
  onStoryDeleted,
}) {
  const insets = useSafeAreaInsets();

  const [currentUserIdx, setCurrentUserIdx] = useState(initialUserIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation progress for current story (0 to 1)
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const timerStartTime = useRef(Date.now());
  const elapsedBeforePause = useRef(0);

  // Reset indices when modal opens with initialUserIndex
  useEffect(() => {
    if (visible) {
      setCurrentUserIdx(Math.max(0, Math.min(initialUserIndex, userGroups.length - 1)));
      setCurrentStoryIdx(0);
      progressAnim.setValue(0);
      elapsedBeforePause.current = 0;
    }
  }, [visible, initialUserIndex, userGroups.length]);

  const currentUserGroup = userGroups[currentUserIdx] || null;
  const currentStories = currentUserGroup?.stories || [];
  const currentStory = currentStories[currentStoryIdx] || null;

  const isOwner = Boolean(
    currentUserId && currentStory && currentStory.userId === currentUserId
  );

  // Record view automatically when a story appears and viewer is not the owner
  useEffect(() => {
    if (visible && currentStory && currentUserId && !isOwner) {
      recordStoryView(currentStory.id, currentUserId);
    }
  }, [visible, currentStory?.id, currentUserId, isOwner]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentStoryIdx < currentStories.length - 1) {
      // Next story in current group
      progressAnim.setValue(0);
      elapsedBeforePause.current = 0;
      setCurrentStoryIdx((prev) => prev + 1);
    } else if (currentUserIdx < userGroups.length - 1) {
      // Next user group
      progressAnim.setValue(0);
      elapsedBeforePause.current = 0;
      setCurrentUserIdx((prev) => prev + 1);
      setCurrentStoryIdx(0);
    } else {
      // End of all stories
      onClose();
    }
  }, [currentStoryIdx, currentStories.length, currentUserIdx, userGroups.length, onClose, progressAnim]);

  const handlePrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      // Previous story in same group
      progressAnim.setValue(0);
      elapsedBeforePause.current = 0;
      setCurrentStoryIdx((prev) => prev - 1);
    } else if (currentUserIdx > 0) {
      // Previous user group (last story of prev group)
      const prevGroup = userGroups[currentUserIdx - 1];
      const lastIdx = prevGroup?.stories ? prevGroup.stories.length - 1 : 0;
      progressAnim.setValue(0);
      elapsedBeforePause.current = 0;
      setCurrentUserIdx((prev) => prev - 1);
      setCurrentStoryIdx(Math.max(0, lastIdx));
    } else {
      // Re-run first story from start
      progressAnim.setValue(0);
      elapsedBeforePause.current = 0;
      startProgress(STORY_DURATION);
    }
  }, [currentStoryIdx, currentUserIdx, userGroups, progressAnim]);

  // Start progress bar animation
  const startProgress = useCallback(
    (durationRemaining) => {
      progressAnim.stopAnimation();
      timerStartTime.current = Date.now();

      animRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: durationRemaining,
        useNativeDriver: false,
      });

      animRef.current.start(({ finished }) => {
        if (finished) {
          handleNext();
        }
      });
    },
    [progressAnim, handleNext]
  );

  // Story progression effect
  useEffect(() => {
    if (!visible || !currentStory || isPaused || imageLoading || showViewersModal) {
      progressAnim.stopAnimation();
      return;
    }

    const remaining = STORY_DURATION * (1 - (elapsedBeforePause.current / STORY_DURATION));
    startProgress(Math.max(200, remaining));

    return () => {
      progressAnim.stopAnimation();
    };
  }, [visible, currentStory?.id, isPaused, imageLoading, showViewersModal, startProgress]);

  // Reset image loading on story switch
  useEffect(() => {
    setImageLoading(true);
    progressAnim.setValue(0);
    elapsedBeforePause.current = 0;
  }, [currentStory?.id]);

  const handlePressIn = () => {
    setIsPaused(true);
    progressAnim.stopAnimation((currentVal) => {
      elapsedBeforePause.current = currentVal * STORY_DURATION;
    });
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  const handleDeleteCurrentStory = () => {
    if (!currentStory) return;

    const executeDelete = async () => {
      try {
        setIsDeleting(true);
        await deleteStory(currentStory.id, currentStory.mediaUrl);
        if (onStoryDeleted) {
          onStoryDeleted(currentStory.id);
        }
        if (currentStories.length <= 1) {
          onClose();
        } else {
          handleNext();
        }
      } catch (err) {
        Alert.alert("Delete Error", err.message || "Could not delete story.");
      } finally {
        setIsDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this story?")) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Delete Story",
        "Are you sure you want to delete this travel story?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ]
      );
    }
  };

  const handleOpenViewers = async () => {
    if (!currentStory) return;
    setIsPaused(true);
    setShowViewersModal(true);
    setLoadingViewers(true);
    try {
      const list = await fetchStoryViewers(currentStory.id);
      setViewersList(list);
    } catch {
      setViewersList([]);
    } finally {
      setLoadingViewers(false);
    }
  };

  const formatRemainingTime = (expiresAt) => {
    if (!expiresAt) return "";
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return "Expired";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins}m left`;
  };

  if (!visible || !currentUserGroup || !currentStory) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Fullscreen Story Image */}
        <Image
          source={{ uri: currentStory.mediaUrl }}
          style={styles.storyImage}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />

        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#E8C547" />
          </View>
        )}

        {/* Top Vignette Gradient Shade */}
        <View style={[styles.topVignette, { height: insets.top + 90 }]} />

        {/* Bottom Vignette Gradient Shade */}
        <View style={[styles.bottomVignette, { height: insets.bottom + 140 }]} />

        {/* Top Segmented Progress Bar */}
        <View style={[styles.progressBarRow, { top: insets.top + 8 }]}>
          {currentStories.map((s, idx) => {
            let progressWidth = "0%";
            if (idx < currentStoryIdx) {
              progressWidth = "100%";
            } else if (idx === currentStoryIdx) {
              progressWidth = progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              });
            }

            return (
              <View key={s.id || idx} style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: progressWidth },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Header: Author info & Close button */}
        <View style={[styles.headerRow, { top: insets.top + 24 }]}>
          <View style={styles.authorContainer}>
            {currentUserGroup.userAvatar ? (
              <Image
                source={{ uri: currentUserGroup.userAvatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color="#0D1117" />
              </View>
            )}

            <View style={styles.authorMeta}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {currentUserGroup.userName}
                </Text>
                {currentStory.destination && (
                  <View style={styles.destBadge}>
                    <Ionicons name="location-sharp" size={11} color="#E8C547" />
                    <Text style={styles.destText} numberOfLines={1}>
                      {currentStory.destination}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.timeMeta}>
                {formatRemainingTime(currentStory.expiresAt)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close story"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Interactive Touch Areas (Left/Right Tap & Long-Press Pause) */}
        <View style={styles.touchAreaContainer}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.touchAreaLeft}
            onPress={handlePrev}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
          <TouchableOpacity
            activeOpacity={1}
            style={styles.touchAreaRight}
            onPress={handleNext}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
        </View>

        {/* Caption & Footer Actions */}
        <View style={[styles.footerContainer, { bottom: insets.bottom + 16 }]}>
          {Boolean(currentStory.caption) && (
            <View style={styles.captionBubble}>
              <Text style={styles.captionText}>{currentStory.caption}</Text>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            {isOwner ? (
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={styles.viewsCounter}
                  onPress={handleOpenViewers}
                >
                  <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewsCountText}>
                    {currentStory.viewsCount || 0} {currentStory.viewsCount === 1 ? "view" : "views"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDeleteCurrentStory}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.viewerBadge}>
                <Ionicons name="time-outline" size={14} color="#8A99AD" />
                <Text style={styles.viewerBadgeText}>24h Ephemeral Story</Text>
              </View>
            )}
          </View>
        </View>

        {/* Viewers Bottom Sheet Modal */}
        {showViewersModal && (
          <Modal
            visible={showViewersModal}
            transparent
            animationType="slide"
            onRequestClose={() => {
              setShowViewersModal(false);
              setIsPaused(false);
            }}
          >
            <View style={styles.viewersModalOverlay}>
              <View style={[styles.viewersSheet, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.viewersSheetHeader}>
                  <Text style={styles.viewersSheetTitle}>
                    Viewers ({viewersList.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowViewersModal(false);
                      setIsPaused(false);
                    }}
                  >
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {loadingViewers ? (
                  <View style={styles.viewersLoading}>
                    <ActivityIndicator size="small" color="#E8C547" />
                  </View>
                ) : viewersList.length === 0 ? (
                  <View style={styles.viewersEmpty}>
                    <Text style={styles.viewersEmptyText}>No views yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={viewersList}
                    keyExtractor={(item) => item.userId + item.viewedAt}
                    renderItem={({ item }) => (
                      <View style={styles.viewerItem}>
                        {item.avatarUrl ? (
                          <Image
                            source={{ uri: item.avatarUrl }}
                            style={styles.viewerAvatar}
                          />
                        ) : (
                          <View style={[styles.viewerAvatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={14} color="#0D1117" />
                          </View>
                        )}
                        <Text style={styles.viewerName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                    )}
                  />
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  bottomVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  progressBarRow: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 5,
    zIndex: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#E8C547",
    borderRadius: 2,
  },
  headerRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#E8C547",
  },
  avatarPlaceholder: {
    backgroundColor: "#E8C547",
    justifyContent: "center",
    alignItems: "center",
  },
  authorMeta: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    maxWidth: 130,
  },
  destBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(232, 197, 71, 0.2)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(232, 197, 71, 0.35)",
  },
  destText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E8C547",
    maxWidth: 90,
  },
  timeMeta: {
    fontSize: 11,
    color: "#8A99AD",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  touchAreaContainer: {
    position: "absolute",
    top: 90,
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  touchAreaLeft: {
    flex: 1,
  },
  touchAreaRight: {
    flex: 2,
  },
  footerContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  captionBubble: {
    backgroundColor: "rgba(13, 17, 23, 0.75)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 12,
  },
  captionText: {
    fontSize: 14,
    color: "#F0F6FC",
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ownerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  viewsCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  viewsCountText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  viewerBadgeText: {
    fontSize: 12,
    color: "#8A99AD",
  },
  viewersModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  viewersSheet: {
    backgroundColor: "#161B22",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.5,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  viewersSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewersSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  viewersLoading: {
    paddingVertical: 30,
    alignItems: "center",
  },
  viewersEmpty: {
    paddingVertical: 30,
    alignItems: "center",
  },
  viewersEmptyText: {
    fontSize: 13,
    color: "#8A99AD",
  },
  viewerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  viewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  viewerName: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
