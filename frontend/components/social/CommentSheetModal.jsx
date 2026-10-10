import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RADII, FONTS } from "../../lib/theme.js";
import { fetchPostComments, createPostComment, deletePostComment } from "../../lib/posts.js";

export default function CommentSheetModal({
  visible,
  onClose,
  postId,
  postAuthorId = null,
  currentUserId = null,
  currentUserName = "Traveler",
  onCommentCountChange = null,
}) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchPostComments(postId, currentUserId);
      setComments(data || []);
    } catch (err) {
      console.warn("loadComments error:", err);
      setErrorMsg("Failed to load comments.");
    } finally {
      setLoading(false);
    }
  }, [postId, currentUserId]);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
    } else {
      setComments([]);
      setInputText("");
    }
  }, [visible, postId, loadComments]);

  const handleSendComment = async () => {
    const clean = inputText.trim();
    if (!clean || submitting || !postId || !currentUserId) return;

    setSubmitting(true);
    try {
      const newComment = await createPostComment(postId, currentUserId, clean, postAuthorId);
      setComments((prev) => [...prev, newComment]);
      setInputText("");
      if (onCommentCountChange) onCommentCountChange(comments.length + 1);
    } catch (err) {
      console.warn("handleSendComment error:", err);
      setErrorMsg(err?.message || "Could not post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId || !currentUserId) return;
    try {
      await deletePostComment(commentId, currentUserId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (onCommentCountChange) onCommentCountChange(Math.max(0, comments.length - 1));
    } catch (err) {
      console.warn("handleDeleteComment error:", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={styles.handlePill} />
          </View>

          {/* Sheet Header */}
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>Comments ({comments.length})</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#918E87" />
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Comments List */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#C8B27A" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image
                    source={{
                      uri: item.user_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
                    }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.authorName}>{item.user_name}</Text>
                      {String(item.user_id) === String(currentUserId) && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(item.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#E57373" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#918E87" />
                  <Text style={styles.emptyText}>Be the first to share your thoughts on this story.</Text>
                </View>
              }
              style={styles.list}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
            />
          )}

          {/* Input Row */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.inputField}
              placeholder="Add a thoughtful comment..."
              placeholderTextColor="#8A8882"
              value={inputText}
              onChangeText={setInputText}
              maxLength={2000}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || submitting) && styles.sendBtnDisabled]}
              onPress={handleSendComment}
              disabled={!inputText.trim() || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#121312" />
              ) : (
                <Ionicons name="arrow-up" size={16} color="#121312" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(18, 19, 18, 0.45)",
  },
  sheetContainer: {
    backgroundColor: "#FAF8F3",
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    maxHeight: "75%",
    borderWidth: 1,
    borderColor: "rgba(215, 210, 200, 0.8)",
  },
  handleRow: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C4BFB4",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(215, 210, 200, 0.5)",
  },
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: "700",
    color: "#171817",
  },
  errorBox: {
    backgroundColor: "rgba(229, 115, 115, 0.12)",
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: RADII.md,
  },
  errorText: {
    color: "#C62828",
    fontSize: 12,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 12,
    color: "#918E87",
    marginTop: 6,
  },
  list: {
    maxHeight: 320,
    paddingTop: 8,
  },
  commentItem: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(215, 210, 200, 0.35)",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2DDD2",
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  authorName: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: "700",
    color: "#171817",
  },
  commentText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "#42403B",
    lineHeight: 18,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 12,
    color: "#918E87",
    marginTop: 8,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(215, 210, 200, 0.5)",
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: "#F1EEE6",
    borderRadius: RADII.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: "#171817",
    maxHeight: 80,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E7D3B5",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
