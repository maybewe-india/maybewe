// ============================================================================
// MAYBEWE MESSAGE ACTIONS & REACTIONS MODAL (components/MessageActionModal.jsx)
// Floating action sheet for message reactions, replies, copying, and deletion
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALLOWED_REACTIONS } from '../lib/groupChat.js';
import { SHADOWS } from '../lib/theme';

export default function MessageActionModal({
  visible,
  message,
  currentUserId,
  onClose,
  onReact,
  onReply,
  onCopy,
  onDelete,
}) {
  if (!message) return null;

  const isOwnMessage = message.sender_id === currentUserId;
  const isSystem = message.message_type === 'system';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheetContainer, SHADOWS.cardElevated]}>
              {/* Top Reaction Strip */}
              {!isSystem && (
                <View style={styles.reactionStrip}>
                  {ALLOWED_REACTIONS.map((emoji) => {
                    const hasReacted = message.reactions?.some(
                      (r) => r.reaction === emoji && r.users?.includes(currentUserId)
                    );

                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[styles.reactionBtn, hasReacted && styles.reactionBtnActive]}
                        activeOpacity={0.7}
                        onPress={() => {
                          onReact && onReact(emoji);
                          onClose();
                        }}
                      >
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Action List */}
              <View style={styles.actionList}>
                {!isSystem && (
                  <TouchableOpacity
                    style={styles.actionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      onReply && onReply(message);
                      onClose();
                    }}
                  >
                    <Ionicons name="arrow-undo-outline" size={18} color="#171817" />
                    <Text style={styles.actionText}>Reply</Text>
                  </TouchableOpacity>
                )}

                {message.content && (
                  <TouchableOpacity
                    style={styles.actionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      onCopy && onCopy(message.content);
                      onClose();
                    }}
                  >
                    <Ionicons name="copy-outline" size={18} color="#171817" />
                    <Text style={styles.actionText}>Copy Text</Text>
                  </TouchableOpacity>
                )}

                {isOwnMessage && !isSystem && (
                  <TouchableOpacity
                    style={[styles.actionRow, styles.deleteRow]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onDelete && onDelete(message.id);
                      onClose();
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#C2410C" />
                    <Text style={[styles.actionText, styles.deleteText]}>Delete Message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FAF8F3',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E0D8',
    padding: 16,
  },
  reactionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0ECE1',
    borderRadius: 14,
    padding: 6,
    marginBottom: 12,
  },
  reactionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C8B27A',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  actionList: {
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171817',
  },
  deleteRow: {
    borderTopWidth: 1,
    borderTopColor: '#EBE6DC',
    marginTop: 4,
    paddingTop: 12,
  },
  deleteText: {
    color: '#C2410C',
  },
});
