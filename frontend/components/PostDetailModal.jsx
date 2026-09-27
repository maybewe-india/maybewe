import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/themeContext.jsx';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme.js';
import { getPlaceById } from '../lib/places.js';
import {
  togglePostLike,
  getPostLikeStatus,
  togglePostSave,
  getPostSaveStatus,
  deletePost,
} from '../lib/posts.js';
import { followUser, unfollowUser, getFollowStatus } from '../lib/social.js';

const { width: SCREEN_W } = Dimensions.get('window');

export default function PostDetailModal({
  visible,
  post,
  onClose,
  currentUser = null,
  onOpenPlaceDetail = null,
  onOpenAddToTrip = null,
  onPostDeleted = null,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.like_count || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    if (post && visible) {
      setLikeCount(post.like_count || 0);
      setActiveMediaIndex(0);
      checkUserStatuses();
    }
  }, [post, visible]);

  const checkUserStatuses = async () => {
    if (!post) return;
    const userId = currentUser?.id || 'current-user';

    const liked = await getPostLikeStatus(post.id, userId);
    setIsLiked(liked);

    const saved = await getPostSaveStatus(post.id, userId);
    setIsSaved(saved);

    if (post.user_id && post.user_id !== userId) {
      const following = await getFollowStatus(userId, post.user_id);
      setIsFollowing(following);
    }
  };

  if (!post) return null;

  const isAuthor = (currentUser?.id || 'current-user') === post.user_id;
  const taggedPlace = post.place_id ? getPlaceById(post.place_id) : null;
  const mediaList = post.media && post.media.length > 0 ? post.media : [
    { id: 'default', media_url: 'https://images.unsplash.com/photo-1600100397608-f010f4439c04?w=1000&auto=format&fit=crop&q=80' }
  ];

  const handleLike = async () => {
    const userId = currentUser?.id || 'current-user';
    const res = await togglePostLike(post.id, userId, currentUser?.name || 'A traveler');
    setIsLiked(res.liked);
    setLikeCount(res.likeCount);
  };

  const handleSave = async () => {
    const userId = currentUser?.id || 'current-user';
    const res = await togglePostSave(post.id, userId);
    setIsSaved(res.saved);
  };

  const handleFollowToggle = async () => {
    if (isAuthor || followingLoading) return;
    const followerId = currentUser?.id || 'current-user';
    const followingId = post.user_id;
    if (!followingId) return;

    setFollowingLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(followerId, followingId);
        setIsFollowing(false);
      } else {
        await followUser(followerId, followingId, currentUser?.name || 'Traveler');
        setIsFollowing(true);
      }
    } catch (err) {
      console.warn('Error toggling follow:', err);
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareMsg = `"${post.content}"\n\n— Travel moment from ${post.destination} on MaybeWe`;
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: 'MaybeWe Travel Story', text: shareMsg });
        } else {
          await navigator.clipboard.writeText(shareMsg);
          Alert.alert('Copied to Clipboard', 'Travel story link copied.');
        }
      } else {
        await Share.share({ message: shareMsg });
      }
    } catch {}
  };

  const handleDelete = async () => {
    Alert.alert('Delete Story', 'Are you sure you want to delete this travel story?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePost(post.id, currentUser?.id || 'current-user');
          if (onPostDeleted) onPostDeleted(post.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={styles.authorBar}>
              <Image source={{ uri: post.user_avatar }} style={styles.authorAvatar} />
              <View style={{ marginLeft: 10 }}>
                <View style={styles.authorNameRow}>
                  <Text style={[styles.authorName, { color: colors.textPrimary }]}>{post.user_name}</Text>
                  <Ionicons name="shield-checkmark" size={13} color="#B99A5E" style={{ marginLeft: 4 }} />
                </View>
                <Text style={[styles.authorLocation, { color: colors.textSecondary }]}>
                  {post.destination || post.user_location}
                </Text>
              </View>

              {/* Follow Button */}
              {!isAuthor && (
                <TouchableOpacity
                  onPress={handleFollowToggle}
                  disabled={followingLoading}
                  style={[
                    styles.followBtn,
                    isFollowing && styles.followBtnActive,
                  ]}
                >
                  <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                    {isFollowing ? 'Following' : '+ Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.headerActionsRight}>
              {isAuthor && (
                <TouchableOpacity onPress={handleDelete} style={styles.iconActionBtn}>
                  <Ionicons name="trash-outline" size={18} color="#9E3A3A" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Photography Carousel */}
            <View style={styles.photoContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(x / (SCREEN_W - 40));
                  setActiveMediaIndex(idx);
                }}
                scrollEventThrottle={16}
              >
                {mediaList.map((m, i) => (
                  <Image
                    key={m.id || i}
                    source={{ uri: m.media_url }}
                    style={styles.heroPhoto}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>

              {mediaList.length > 1 && (
                <View style={styles.paginationDots}>
                  {mediaList.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        activeMediaIndex === i && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Engagement Action Bar */}
            <View style={styles.actionBar}>
              <View style={styles.leftActions}>
                <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isLiked ? '#C84C4C' : colors.textPrimary}
                  />
                  <Text style={[styles.actionCount, { color: colors.textPrimary }]}>{likeCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSave} style={styles.actionBtn}>
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={isSaved ? '#B99A5E' : colors.textPrimary}
                  />
                  <Text style={[styles.actionCount, { color: colors.textPrimary }]}>
                    {isSaved ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                  <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {new Date(post.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            {/* Caption Story */}
            <View style={styles.captionBlock}>
              <Text style={[styles.captionText, { color: colors.textPrimary }]}>
                {post.content}
              </Text>
            </View>

            {/* Tagged Place Card with Travel Actions */}
            {taggedPlace ? (
              <View style={[styles.taggedPlaceCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.taggedPlaceHeader}>
                  <Image source={{ uri: taggedPlace.cover_image_url }} style={styles.taggedPlaceThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.taggedEyebrow}>TAGGED DESTINATION PLACE</Text>
                    <Text style={[styles.taggedPlaceName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {taggedPlace.name}
                    </Text>
                    <Text style={[styles.taggedPlaceMeta, { color: colors.textSecondary }]}>
                      {taggedPlace.category} • ₹{taggedPlace.price_inr} • ★ {taggedPlace.rating}
                    </Text>
                  </View>
                </View>

                {/* Travel Actions: View Place & Add to Trip */}
                <View style={styles.taggedActionsRow}>
                  {onOpenPlaceDetail && (
                    <TouchableOpacity
                      onPress={() => onOpenPlaceDetail(taggedPlace)}
                      style={[styles.taggedActionBtn, { borderColor: colors.border }]}
                    >
                      <Ionicons name="compass-outline" size={14} color="#B99A5E" style={{ marginRight: 6 }} />
                      <Text style={[styles.taggedActionBtnText, { color: colors.textPrimary }]}>View Place</Text>
                    </TouchableOpacity>
                  )}

                  {onOpenAddToTrip && (
                    <TouchableOpacity
                      onPress={() => onOpenAddToTrip(taggedPlace)}
                      style={[styles.taggedActionBtn, styles.taggedActionBtnPrimary]}
                    >
                      <Ionicons name="briefcase" size={14} color="#FAF8F3" style={{ marginRight: 6 }} />
                      <Text style={styles.taggedActionBtnTextPrimary}>Add to Trip</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 22, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  authorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  authorLocation: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  followBtn: {
    marginLeft: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#171716',
  },
  followBtnActive: {
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
  },
  followBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#FAF8F3',
  },
  followBtnTextActive: {
    color: '#87692B',
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconActionBtn: {
    padding: 8,
    marginRight: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroPhoto: {
    width: SCREEN_W - 40,
    height: SCREEN_W - 40,
    borderRadius: 20,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(23, 23, 22, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#FAF8F3',
    width: 14,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    marginLeft: 6,
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
  captionBlock: {
    marginBottom: 20,
  },
  captionText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 23,
  },
  taggedPlaceCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  taggedPlaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taggedPlaceThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  taggedEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#B99A5E',
  },
  taggedPlaceName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    marginTop: 2,
  },
  taggedPlaceMeta: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  taggedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  taggedActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  taggedActionBtnPrimary: {
    backgroundColor: '#171716',
    borderWidth: 0,
  },
  taggedActionBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  taggedActionBtnTextPrimary: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#FAF8F3',
  },
});
