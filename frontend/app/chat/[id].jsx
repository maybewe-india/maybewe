// ============================================================================
// MAYBEWE LUXURY CHAT & REALTIME COLLABORATION SCREEN (app/chat/[id].jsx)
// Phase C: Group Chat, Realtime, Replies, Reactions, Travel Cards & Hangouts
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import Avatar from '../../components/ui/Avatar';
import InChatSafetyWarning from '../../components/InChatSafetyWarning';
import LiveLocationShare from '../../components/LiveLocationShare';
import SafetyReportModal from '../../components/SafetyReportModal';
import TravelMessageCard from '../../components/TravelMessageCard';
import ChatSharePickerModal from '../../components/ChatSharePickerModal';
import MessageActionModal from '../../components/MessageActionModal';
import PlaceDetailModal from '../../components/PlaceDetailModal';
import AddToTripModal from '../../components/AddToTripModal';
import HangoutDetailModal from '../../components/HangoutDetailModal';
import LiveLocationCard from '../../components/LiveLocationCard';
import LiveLocationConsentModal from '../../components/LiveLocationConsentModal';
import LiveLocationMapModal from '../../components/LiveLocationMapModal';
import { getActiveLiveLocationSession, formatRemainingTime } from '../../lib/liveLocation.js';

import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import {
  fetchGroupMessages,
  sendChatMessage,
  subscribeToChatGroup,
  toggleMessageReaction,
  deleteChatMessage,
  markConversationRead,
  ALLOWED_REACTIONS,
} from '../../lib/groupChat';
import { getMessages, sendMessage, subscribeToMessages } from '../../lib/messages';
import { scanMessageForSafety } from '../../lib/safety';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    id: conversationId,
    partnerName,
    partnerAvatar,
    partnerScore,
    partnerVerified,
    destination,
    dates,
    isGroup,
  } = useLocalSearchParams();

  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [safetyAlertReason, setSafetyAlertReason] = useState(null);

  // Modals state
  const [sharePickerVisible, setSharePickerVisible] = useState(false);
  const [actionModalMessage, setActionModalMessage] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [locationChoiceModalVisible, setLocationChoiceModalVisible] = useState(false);
  const [liveLocationConsentVisible, setLiveLocationConsentVisible] = useState(false);
  const [liveLocationMapVisible, setLiveLocationMapVisible] = useState(false);
  const [activeLiveSession, setActiveLiveSession] = useState(null);
  const [selectedMapSession, setSelectedMapSession] = useState(null);

  // Travel detail modals
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [addToTripPlaceId, setAddToTripPlaceId] = useState(null);
  const [selectedHangoutId, setSelectedHangoutId] = useState(null);

  const flatListRef = useRef(null);

  const currentUserId = user?.id || 'user-demo-priya';
  const currentUserName = user?.user_metadata?.name || 'Priya Sharma';
  const currentUserAvatar = user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';

  const resolvedId = conversationId || 'group-goa-circle';
  const isGroupChat = resolvedId.startsWith('group-') || Boolean(isGroup);

  const displayName = partnerName || (isGroupChat ? 'North Goa Sunset Circle' : 'Alex Chen');
  const displayAvatar = partnerAvatar || (isGroupChat ? 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500' : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500');
  const displayDestination = destination || 'Goa, India';

  // Load chat history & initialize realtime subscription
  const loadChat = useCallback(async () => {
    try {
      if (isGroupChat || resolvedId.startsWith('direct-')) {
        const history = await fetchGroupMessages(resolvedId);
        setMessages(history);
        await markConversationRead(resolvedId, currentUserId);
      } else {
        const legacyHistory = await getMessages(resolvedId);
        setMessages(legacyHistory);
      }

      // Check active live location session
      const activeSess = await getActiveLiveLocationSession({
        chatGroupId: isGroupChat ? resolvedId : null,
        targetUserId: !isGroupChat ? 'user-demo-arjun' : null,
        currentUserId,
      });
      setActiveLiveSession(activeSess);
    } catch (err) {
      console.warn('Error loading chat:', err);
    }
  }, [resolvedId, isGroupChat, currentUserId]);

  useEffect(() => {
    let isMounted = true;
    let cleanup = () => {};

    loadChat();

    // Subscribe to Realtime messages and reactions
    if (isGroupChat || resolvedId.startsWith('direct-')) {
      cleanup = subscribeToChatGroup(resolvedId, {
        onNewMessage: (newMsg) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 150);
        },
        onReaction: () => {
          if (!isMounted) return;
          loadChat();
        },
        onMemberChange: () => {
          if (!isMounted) return;
          loadChat();
        },
      });
    } else {
      cleanup = subscribeToMessages(resolvedId, (newMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      });
    }

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [resolvedId, isGroupChat, loadChat]);

  // Input change with safety scanner
  const handleTextChange = (text) => {
    setInputText(text);
    const scan = scanMessageForSafety(text);
    if (scan.containsSensitiveInfo) {
      setSafetyAlertReason(scan.reason);
    } else {
      setSafetyAlertReason(null);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const content = inputText.trim();
    const replyParent = replyingTo;
    setInputText('');
    setReplyingTo(null);
    setSafetyAlertReason(null);

    try {
      if (isGroupChat || resolvedId.startsWith('direct-')) {
        const sent = await sendChatMessage({
          groupId: resolvedId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderAvatar: currentUserAvatar,
          content,
          messageType: 'text',
          replyToId: replyParent?.id || null,
        });

        if (sent) {
          setMessages((prev) => [...prev, sent]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      } else {
        const sent = await sendMessage({
          matchId: resolvedId,
          senderId: currentUserId,
          content,
        });
        if (sent) {
          setMessages((prev) => [...prev, sent]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
    }
  };

  // Travel Sharing Handlers
  const handleSharePlace = async (place) => {
    try {
      const sent = await sendChatMessage({
        groupId: resolvedId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        content: `Check out ${place.name} in ${place.destination}!`,
        messageType: 'place_share',
        sharedPlaceId: place.id,
      });
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {}
  };

  const handleShareTrip = async (trip) => {
    try {
      const sent = await sendChatMessage({
        groupId: resolvedId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        content: `Take a look at our itinerary for ${trip.destination}!`,
        messageType: 'trip_share',
        sharedTripId: trip.id,
      });
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {}
  };

  const handleShareHangout = async (hangout) => {
    try {
      const sent = await sendChatMessage({
        groupId: resolvedId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        content: `Join our meetup "${hangout.title}"!`,
        messageType: 'hangout_share',
        sharedHangoutId: hangout.id,
        metadata: {
          hangout_id: hangout.id,
          title: hangout.title,
          destination: hangout.destination,
          proposed_place: hangout.finalized_plan?.place_name || hangout.suggestions?.[0]?.custom_place_name || 'Meetup Point',
          proposed_date: hangout.target_date,
          proposed_time: hangout.target_time,
          status: hangout.status,
          participants_count: hangout.members?.length || 2,
        },
      });
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {}
  };

  const handleSharePhoto = async (photoUrl) => {
    try {
      const sent = await sendChatMessage({
        groupId: resolvedId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        content: 'Shared a travel photograph',
        messageType: 'image',
        attachmentUrl: photoUrl,
      });
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {}
  };

  // Live Location session start / stop handlers
  const handleLiveSessionStarted = async (session) => {
    setActiveLiveSession(session);
    try {
      const modeText = session.privacy_mode === 'approximate' ? 'Approximate' : 'Precise';
      const sent = await sendChatMessage({
        groupId: resolvedId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        content: `📍 Live Location shared (${modeText})`,
        messageType: 'live_location_share',
        metadata: session,
      });
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.warn('Live location session message error:', err);
    }
  };

  const handleLiveSessionStopped = (sessionId) => {
    setActiveLiveSession((prev) => (prev?.id === sessionId ? null : prev));
    loadChat();
  };

  // Reaction toggle
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await toggleMessageReaction(messageId, currentUserId, emoji);
      loadChat();
    } catch (err) {
      console.warn('Reaction error:', err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to remove this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChatMessage(messageId, currentUserId);
              setMessages((prev) => prev.filter((m) => m.id !== messageId));
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Copy message text
  const handleCopyMessage = async (text) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      Alert.alert('Copied', 'Message copied to clipboard.');
    } catch (err) {}
  };

  // Scroll to referenced message when reply is clicked
  const handleScrollToMessage = (targetMsgId) => {
    const idx = messages.findIndex((m) => m.id === targetMsgId);
    if (idx !== -1) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  };

  // Format message time
  const formatTime = (isoString) => {
    if (!isoString) return '10:45 AM';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render individual message bubble
  const renderMessageItem = ({ item, index }) => {
    const isMine = item.sender_id === currentUserId;
    const isSystem = item.message_type === 'system';
    const isImage = item.message_type === 'image' && item.attachment_url;
    const isTravelCard =
      item.message_type === 'place_share' ||
      item.message_type === 'trip_share' ||
      item.message_type === 'activity_share' ||
      item.message_type === 'hangout_share';
    const isLiveLocation = item.message_type === 'live_location_share';

    // Day separator check
    const showDaySeparator =
      index === 0 ||
      new Date(item.created_at).toDateString() !==
        new Date(messages[index - 1]?.created_at).toDateString();

    const dayText = new Date(item.created_at).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    if (isSystem) {
      return (
        <View style={styles.systemMessageWrapper}>
          {showDaySeparator && (
            <View style={styles.daySeparator}>
              <Text style={styles.daySeparatorText}>{dayText}</Text>
            </View>
          )}
          <View style={styles.systemBubble}>
            <Ionicons name="sparkles" size={11} color="#C8B27A" style={{ marginRight: 5 }} />
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageRowWrapper}>
        {showDaySeparator && (
          <View style={styles.daySeparator}>
            <Text style={styles.daySeparatorText}>{dayText}</Text>
          </View>
        )}

        <View style={[styles.messageRow, isMine ? styles.myRow : styles.theirRow]}>
          {/* Avatar for group messages */}
          {!isMine && isGroupChat && (
            <Image
              source={{ uri: item.sender_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500' }}
              style={styles.senderAvatarMini}
            />
          )}

          <View style={{ maxWidth: '82%' }}>
            {/* Sender Name in Group Chat */}
            {!isMine && isGroupChat && item.sender_name && (
              <Text style={styles.senderNameLabel}>{item.sender_name}</Text>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => setActionModalMessage(item)}
              style={[
                styles.messageBubble,
                isMine ? styles.myBubble : styles.theirBubble,
                SHADOWS.card,
              ]}
            >
              {/* Reply Preview Header if replying to another message */}
              {item.reply_to && (
                <TouchableOpacity
                  style={[styles.replyExcerptBox, isMine ? styles.replyExcerptMine : styles.replyExcerptTheir]}
                  activeOpacity={0.7}
                  onPress={() => handleScrollToMessage(item.reply_to.id)}
                >
                  <View style={styles.replyExcerptBar} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.replyExcerptSender, isMine && { color: '#FAF8F3' }]}>
                      {item.reply_to.sender_name}
                    </Text>
                    <Text style={[styles.replyExcerptContent, isMine && { color: 'rgba(250, 248, 243, 0.75)' }]} numberOfLines={1}>
                      {item.reply_to.content || 'Travel card'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Photo Message */}
              {isImage && (
                <View style={styles.imageAttachmentBox}>
                  <Image source={{ uri: item.attachment_url }} style={styles.imageAttachment} resizeMode="cover" />
                </View>
              )}

              {/* Text Content */}
              {item.content && (!isTravelCard && !isLiveLocation || item.message_type === 'image') && (
                <Text style={isMine ? styles.myMessageText : styles.theirMessageText}>
                  {item.content}
                </Text>
              )}

              {/* Rich Travel Cards */}
              {isTravelCard && (
                <TravelMessageCard
                  type={item.message_type}
                  data={item.metadata}
                  onViewPlace={(pId) => setSelectedPlaceId(pId)}
                  onAddToTrip={(pId) => setAddToTripPlaceId(pId)}
                  onViewTrip={(tId) => router.push('/(tabs)/trips')}
                  onOpenHangout={(hId) => setSelectedHangoutId(hId)}
                />
              )}

              {/* Live Location Card */}
              {isLiveLocation && (
                <LiveLocationCard
                  session={item.metadata}
                  currentUserId={currentUserId}
                  onViewLiveMap={(sess) => {
                    setSelectedMapSession(sess || item.metadata);
                    setLiveLocationMapVisible(true);
                  }}
                  onSessionStopped={handleLiveSessionStopped}
                />
              )}

              {/* Timestamp & Status */}
              <View style={styles.bubbleFooter}>
                <Text style={isMine ? styles.myTimeText : styles.theirTimeText}>
                  {formatTime(item.created_at)}
                </Text>
                {isMine && (
                  <Ionicons name="checkmark-done" size={13} color="#C8B27A" style={{ marginLeft: 4 }} />
                )}
              </View>
            </TouchableOpacity>

            {/* Reactions Pills Strip */}
            {item.reactions && item.reactions.length > 0 && (
              <View style={[styles.reactionsStrip, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                {item.reactions.map((r) => {
                  const userReacted = r.users?.includes(currentUserId);
                  return (
                    <TouchableOpacity
                      key={r.reaction}
                      style={[styles.reactionPill, userReacted && styles.reactionPillActive]}
                      activeOpacity={0.7}
                      onPress={() => handleToggleReaction(item.id, r.reaction)}
                    >
                      <Text style={styles.reactionPillEmoji}>{r.reaction}</Text>
                      <Text style={[styles.reactionPillCount, userReacted && styles.reactionPillCountActive]}>
                        {r.count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: '#FAF8F3' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#171817" />
          </TouchableOpacity>

          <Avatar
            uri={displayAvatar}
            name={displayName}
            size={42}
            online={true}
            verified={partnerVerified === 'true' || partnerVerified === true}
          />

          <View style={styles.headerTitleColumn}>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              📍 {displayDestination}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => setLocationChoiceModalVisible(true)}
          >
            <Ionicons name="location-outline" size={20} color="#171817" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => setReportModalVisible(true)}
          >
            <Ionicons name="shield-outline" size={20} color="#171817" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Live Location Top Banner */}
      {activeLiveSession && activeLiveSession.status === 'active' && (
        <TouchableOpacity
          style={styles.activeLiveBanner}
          activeOpacity={0.8}
          onPress={() => {
            setSelectedMapSession(activeLiveSession);
            setLiveLocationMapVisible(true);
          }}
        >
          <View style={styles.activeLiveBannerLeft}>
            <View style={styles.outerPulseMini}>
              <View style={styles.innerDotMini} />
            </View>
            <Text style={styles.activeLiveBannerText}>
              Live location on • {formatRemainingTime(activeLiveSession.expires_at)}
            </Text>
          </View>
          <View style={styles.activeLiveBannerRight}>
            <Text style={styles.activeLiveBannerAction}>View Live Map</Text>
            <Ionicons name="chevron-forward" size={13} color="#FAF8F3" />
          </View>
        </TouchableOpacity>
      )}

      {/* Safety Warning Banner if triggered */}
      {safetyAlertReason && (
        <InChatSafetyWarning
          reason={safetyAlertReason}
          onDismiss={() => setSafetyAlertReason(null)}
        />
      )}

      {/* Messages FlatList */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id || `msg-${Math.random()}`}
        renderItem={renderMessageItem}
        contentContainerStyle={[styles.messagesContainer, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Composer & Safe Keyboard Layout */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* Reply Bar Preview */}
        {replyingTo && (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyPreviewIndicator} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyPreviewName}>Replying to {replyingTo.sender_name || 'Traveler'}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyingTo.content || 'Travel card'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyDismissBtn}>
              <Ionicons name="close" size={16} color="#8A867E" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Travel Objects Sharing Button (+) */}
          <TouchableOpacity
            style={styles.attachBtn}
            activeOpacity={0.8}
            onPress={() => setSharePickerVisible(true)}
          >
            <Ionicons name="add" size={22} color="#171817" />
          </TouchableOpacity>

          {/* Multiline Text Input */}
          <View style={styles.inputFieldWrapper}>
            <TextInput
              style={styles.inputField}
              placeholder="Coordinate journey, share ideas..."
              placeholderTextColor="#A19E95"
              multiline
              value={inputText}
              onChangeText={handleTextChange}
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="arrow-up" size={18} color="#FAF8F3" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Travel Sharing Modal */}
      <ChatSharePickerModal
        visible={sharePickerVisible}
        onClose={() => setSharePickerVisible(false)}
        onSharePlace={handleSharePlace}
        onShareTrip={handleShareTrip}
        onShareHangout={handleShareHangout}
        onSharePhoto={handleSharePhoto}
        onStartLiveLocation={() => setLiveLocationConsentVisible(true)}
        onShareMeetingSpot={() => setLocationModalVisible(true)}
        userId={currentUserId}
      />

      {/* Message Long Press Action Sheet */}
      <MessageActionModal
        visible={Boolean(actionModalMessage)}
        message={actionModalMessage}
        currentUserId={currentUserId}
        onClose={() => setActionModalMessage(null)}
        onReact={(emoji) => handleToggleReaction(actionModalMessage?.id, emoji)}
        onReply={(msg) => setReplyingTo(msg)}
        onCopy={handleCopyMessage}
        onDelete={handleDeleteMessage}
      />

      {/* Travel Modals */}
      {selectedPlaceId && (
        <PlaceDetailModal
          visible={Boolean(selectedPlaceId)}
          placeId={selectedPlaceId}
          onClose={() => setSelectedPlaceId(null)}
          onAddToTrip={(p) => setAddToTripPlaceId(p?.id || selectedPlaceId)}
        />
      )}

      {addToTripPlaceId && (
        <AddToTripModal
          visible={Boolean(addToTripPlaceId)}
          place={selectedPlaceId ? { id: addToTripPlaceId } : { id: addToTripPlaceId }}
          onClose={() => setAddToTripPlaceId(null)}
        />
      )}

      {selectedHangoutId && (
        <HangoutDetailModal
          visible={Boolean(selectedHangoutId)}
          hangoutId={selectedHangoutId}
          onClose={() => setSelectedHangoutId(null)}
        />
      )}

      {/* Safety & Location Modals */}
      <LiveLocationShare
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        matchId={resolvedId}
        onLocationShared={(msg) => {
          handleSend();
        }}
      />

      {/* Location Sharing Options Dialog */}
      <Modal
        visible={locationChoiceModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setLocationChoiceModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.choiceCard, SHADOWS.cardElevated]}>
            <View style={styles.choiceHeaderRow}>
              <Text style={styles.choiceHeaderTitle}>Location Sharing</Text>
              <TouchableOpacity onPress={() => setLocationChoiceModalVisible(false)}>
                <Ionicons name="close" size={20} color="#77766F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.choiceHeaderSub}>Choose how to coordinate with your travel circle:</Text>

            <TouchableOpacity
              style={styles.choiceOptionBtn}
              activeOpacity={0.8}
              onPress={() => {
                setLocationChoiceModalVisible(false);
                setLiveLocationConsentVisible(true);
              }}
            >
              <View style={[styles.choiceIconCircle, { backgroundColor: '#171817' }]}>
                <Ionicons name="navigate" size={18} color="#C8B27A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceOptionTitle}>Share Live Location</Text>
                <Text style={styles.choiceOptionDesc}>Real-time foreground presence (15m, 1h, 4h). Ephemeral & safe.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#77766F" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choiceOptionBtn}
              activeOpacity={0.8}
              onPress={() => {
                setLocationChoiceModalVisible(false);
                setLocationModalVisible(true);
              }}
            >
              <View style={[styles.choiceIconCircle, { backgroundColor: '#EBE6DC' }]}>
                <Ionicons name="pin" size={18} color="#171817" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceOptionTitle}>Share Meeting Landmark</Text>
                <Text style={styles.choiceOptionDesc}>One-time static public cafe, station, or landmark.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#77766F" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Live Location Consent Sheet */}
      <LiveLocationConsentModal
        visible={liveLocationConsentVisible}
        onClose={() => setLiveLocationConsentVisible(false)}
        targetName={displayName}
        targetUserId={!isGroupChat ? 'user-demo-arjun' : null}
        chatGroupId={isGroupChat ? resolvedId : null}
        currentUserId={currentUserId}
        onSessionStarted={handleLiveSessionStarted}
      />

      {/* Live Location Luxury Map Modal */}
      <LiveLocationMapModal
        visible={liveLocationMapVisible}
        onClose={() => setLiveLocationMapVisible(false)}
        session={selectedMapSession || activeLiveSession}
        companionName={displayName}
        currentUserId={currentUserId}
        onSessionStopped={handleLiveSessionStopped}
      />

      <SafetyReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        reportedUserId="user-demo-arjun"
        reportedUserName={displayName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FAF8F3',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3D8',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleColumn: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8A867E',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  daySeparator: {
    alignSelf: 'center',
    backgroundColor: '#EBE6DC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 12,
  },
  daySeparatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#77766F',
  },
  systemMessageWrapper: {
    marginVertical: 6,
    alignItems: 'center',
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderColor: '#E2DCD1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemText: {
    fontSize: 11,
    color: '#65635C',
    fontWeight: '500',
  },
  messageRowWrapper: {
    marginVertical: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  senderAvatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 4,
  },
  senderNameLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A867E',
    marginBottom: 3,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#171817',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3D8',
    borderBottomLeftRadius: 4,
  },
  myMessageText: {
    fontSize: 14,
    color: '#FAF8F3',
    lineHeight: 20,
    fontWeight: '500',
  },
  theirMessageText: {
    fontSize: 14,
    color: '#171817',
    lineHeight: 20,
    fontWeight: '400',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  myTimeText: {
    fontSize: 10,
    color: 'rgba(250, 248, 243, 0.65)',
    fontWeight: '500',
  },
  theirTimeText: {
    fontSize: 10,
    color: '#8A867E',
    fontWeight: '500',
  },
  replyExcerptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    gap: 6,
  },
  replyExcerptMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyExcerptTheir: {
    backgroundColor: '#F5F2EB',
  },
  replyExcerptBar: {
    width: 3,
    height: '100%',
    backgroundColor: '#C8B27A',
    borderRadius: 1.5,
  },
  replyExcerptSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#171817',
  },
  replyExcerptContent: {
    fontSize: 11,
    color: '#8A867E',
  },
  imageAttachmentBox: {
    width: 220,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  imageAttachment: {
    width: '100%',
    height: '100%',
  },
  reactionsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E2DCD1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  reactionPillActive: {
    borderColor: '#C8B27A',
    backgroundColor: '#FDFCF7',
  },
  reactionPillEmoji: {
    fontSize: 12,
  },
  reactionPillCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#77766F',
  },
  reactionPillCountActive: {
    color: '#171817',
    fontWeight: '700',
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0ECE1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2DCD1',
  },
  replyPreviewIndicator: {
    width: 3,
    height: 24,
    backgroundColor: '#C8B27A',
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyPreviewName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#171817',
  },
  replyPreviewText: {
    fontSize: 11,
    color: '#8A867E',
  },
  replyDismissBtn: {
    padding: 4,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E3D8',
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2DCD1',
  },
  inputFieldWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2DCD1',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
  },
  inputField: {
    fontSize: 14,
    color: '#171817',
    padding: 0,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  /* Active Live Location Floating Banner */
  activeLiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171817',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 178, 122, 0.3)',
  },
  activeLiveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outerPulseMini: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(200, 178, 122, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8B27A',
  },
  activeLiveBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FAF8F3',
  },
  activeLiveBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeLiveBannerAction: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C8B27A',
  },
  /* Location Choice Modal */
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  choiceCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FAF8F3',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E3D8',
  },
  choiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  choiceHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#171817',
  },
  choiceHeaderSub: {
    fontSize: 12,
    color: '#77766F',
    marginBottom: 16,
  },
  choiceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2DCD1',
  },
  choiceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171817',
  },
  choiceOptionDesc: {
    fontSize: 11,
    color: '#77766F',
    marginTop: 2,
    lineHeight: 15,
  },
});
