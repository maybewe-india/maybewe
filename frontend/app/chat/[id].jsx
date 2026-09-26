import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import Avatar from '../../components/ui/Avatar';
import InChatSafetyWarning from '../../components/InChatSafetyWarning';
import LiveLocationShare from '../../components/LiveLocationShare';
import SafetyReportModal from '../../components/SafetyReportModal';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { getMessages, sendMessage, subscribeToMessages } from '../../lib/messages';
import { scanMessageForSafety } from '../../lib/safety';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: matchId, partnerName, partnerAvatar, partnerScore, partnerVerified, destination, dates } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [safetyAlertReason, setSafetyAlertReason] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const flatListRef = useRef(null);

  const resolvedMatchId = matchId || 'match-001';
  const partnerDisplayName = partnerName || 'Alex Chen';
  const partnerDisplayScore = partnerScore || '4.92';
  const partnerTripDestination = destination || 'Tokyo, Japan';
  const partnerTripDates = dates || 'Oct 10 — Oct 22, 2026';

  useEffect(() => {
    let isMounted = true;
    let cleanupSubscription = () => {};

    async function initChat() {
      if (!resolvedMatchId) return;

      try {
        const history = await getMessages(resolvedMatchId);
        if (!isMounted) return;
        setMessages(history);

        // Subscribe to realtime messages
        const unsub = subscribeToMessages(resolvedMatchId, (newMsg) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        });

        if (!isMounted) {
          unsub();
        } else {
          cleanupSubscription = unsub;
        }
      } catch (err) {
        console.warn('Chat init error:', err);
      }
    }

    initChat();

    return () => {
      isMounted = false;
      cleanupSubscription();
    };
  }, [resolvedMatchId]);

  const handleTextChange = (text) => {
    setInputText(text);

    // In-chat safety scanner check
    const scan = scanMessageForSafety(text);
    if (scan.containsSensitiveInfo) {
      setSafetyAlertReason(scan.reason);
    } else {
      setSafetyAlertReason(null);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const content = inputText.trim();
    setInputText('');
    setSafetyAlertReason(null);

    const sent = await sendMessage({
      matchId: resolvedMatchId,
      senderId: user?.id || 'current-user-uuid-101',
      content,
    });

    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleLocationShared = async (locationMsg) => {
    const sent = await sendMessage({
      matchId: resolvedMatchId,
      senderId: user?.id || 'current-user-uuid-101',
      content: locationMsg,
    });

    if (sent) {
      setMessages((prev) => [...prev, sent]);
    }
  };

  const renderMessageItem = ({ item, index }) => {
    const isMine = item.sender_id === (user?.id || 'current-user-uuid-101');
    const isLocation = item.content?.startsWith('📍 Shared Meeting Location:');

    const formattedTime = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '10:45 AM';

    // Show date divider for first message
    const showDateDivider = index === 0;

    return (
      <View>
        {showDateDivider && (
          <View style={styles.dateSeparatorWrapper}>
            <View style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]} />
            <View style={[styles.dateSeparatorBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.dateSeparatorText, { color: colors.textMuted }]}>TODAY</Text>
            </View>
            <View style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]} />
          </View>
        )}

        <View style={[styles.messageBubbleWrapper, isMine ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
          {isMine ? (
            /* Current User Message: Tactile obsidian physical bubble */
            <View
              style={[styles.messageBubble, styles.myBubble, { backgroundColor: '#171817', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }]}
            >
              {isLocation && (
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={15} color="#B99A5E" style={{ marginRight: 5 }} />
                  <Text style={[styles.locationTitleMine, { color: '#FBFAF7' }]}>Meeting Point Shared</Text>
                </View>
              )}

              <Text style={[styles.myMessageText, { color: '#FBFAF7' }]}>{item.content}</Text>
              <View style={styles.messageFooterMine}>
                <Text style={[styles.myMessageTime, { color: 'rgba(251, 250, 247, 0.65)' }]}>{formattedTime}</Text>
                <Ionicons name="checkmark-done" size={13} color="#B99A5E" style={{ marginLeft: 4 }} />
              </View>
            </View>
          ) : (
            /* Other Traveler Message: Frosted Silk Card with Subtle Stone Border */
            <View style={[styles.messageBubble, styles.theirBubble, { backgroundColor: '#FBFAF7', borderColor: '#D7D2C8', borderWidth: 1 }, isLocation && styles.theirLocationBubble]}>
              {isLocation && (
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={15} color="#171817" style={{ marginRight: 5 }} />
                  <Text style={[styles.locationTitleTheir, { color: '#171817' }]}>Meeting Point Shared</Text>
                </View>
              )}

              <Text style={[styles.theirMessageText, { color: '#171817' }]}>{item.content}</Text>
              <View style={styles.messageFooterTheir}>
                <Text style={[styles.theirMessageTime, { color: '#77766F' }]}>{formattedTime}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: '#F7F5F0' }]}
    >
      {/* Header: Back, Avatar, Verification Badge, Name, Trust Score, Destination Context */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 6, backgroundColor: 'rgba(251, 250, 247, 0.95)', borderBottomColor: '#D7D2C8', borderBottomWidth: 1 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color="#171817" />
        </TouchableOpacity>

        <Avatar
          uri={partnerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
          name={partnerDisplayName}
          size={42}
          verified={partnerVerified === 'true' || partnerVerified === true || true}
          online={true}
          ringVariant="lavender"
        />

        <View style={styles.headerTitleBox}>
          <View style={styles.headerNameRow}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {partnerDisplayName}
            </Text>
            <View style={[styles.trustScorePill, { backgroundColor: 'rgba(200, 178, 122, 0.16)', borderColor: 'rgba(200, 178, 122, 0.45)', borderWidth: 1 }]}>
              <Ionicons name="shield-checkmark" size={11} color="#C8B27A" style={{ marginRight: 3 }} />
              <Text style={[styles.trustScoreText, { color: '#756345' }]}>{Number(partnerDisplayScore).toFixed(1)} Trust</Text>
            </View>
          </View>

          <Text style={[styles.headerContextSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {partnerTripDestination} • {partnerTripDates}
          </Text>
        </View>

        {/* Safety Actions Menu */}
        <TouchableOpacity
          onPress={() => setReportModalVisible(true)}
          style={[styles.headerActionBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.surfaceElevated }]}
          accessibilityLabel="Report or Block Traveler"
        >
          <Ionicons name="shield-half-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Subtle Trip Context Card pinned near the top */}
      <View style={[styles.tripContextCard, { borderColor: colors.cardBorder }]}>
        <LinearGradient
          colors={isDark ? ['rgba(16, 40, 58, 0.75)', 'rgba(11, 29, 45, 0.65)'] : [colors.cardBg, colors.cardBg]}
          style={styles.tripContextCardGradient}
        >
          <View style={[styles.tripContextIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.surfaceElevated, borderColor: colors.border }]}>
            <Ionicons name="airplane" size={18} color={colors.primary} />
          </View>
          <View style={styles.tripContextTextBox}>
            <View style={styles.tripContextDestinationRow}>
              <Text style={[styles.tripContextDestination, { color: colors.textPrimary }]}>
                {partnerTripDestination.toUpperCase()}
              </Text>
              <View style={[styles.vibeMatchBadge, { backgroundColor: 'rgba(230, 213, 175, 0.35)', borderColor: 'rgba(185, 154, 94, 0.45)' }]}>
                <Ionicons name="sparkles" size={10} color="#B99A5E" style={{ marginRight: 3 }} />
                <Text style={[styles.vibeMatchText, { color: '#171817' }]}>94% Match</Text>
              </View>
            </View>
            <Text style={[styles.tripContextDates, { color: '#B99A5E' }]}>{partnerTripDates}</Text>
            <Text style={[styles.tripContextNotice, { color: '#77766F' }]}>You both are planning this journey.</Text>
          </View>
        </LinearGradient>
      </View>

      {/* In-Chat Safety Scanner Warning Banner */}
      {safetyAlertReason && (
        <InChatSafetyWarning
          warningReason={safetyAlertReason}
          onDismiss={() => setSafetyAlertReason(null)}
        />
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Composer: Message input, Attachment button, Send button */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) + 4, backgroundColor: 'rgba(251, 250, 247, 0.95)', borderTopColor: '#D7D2C8', borderTopWidth: 1 }]}>
        {/* Attachment / Location Share Button */}
        <TouchableOpacity
          onPress={() => setLocationModalVisible(true)}
          style={[styles.attachActionBtn, { backgroundColor: '#F1EEE6', borderColor: '#D7D2C8' }]}
          accessibilityLabel="Share meeting location"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#171817" />
        </TouchableOpacity>

        {/* Text Input in Glass Container */}
        <View style={[styles.textInputContainer, { backgroundColor: '#FBFAF7', borderColor: 'rgba(215, 210, 200, 0.8)' }]}>
          <TextInput
            value={inputText}
            onChangeText={handleTextChange}
            placeholder="Message..."
            placeholderTextColor="#918E87"
            style={[styles.textInputField, { color: '#171715' }]}
            multiline
            maxLength={1000}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim()}
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          activeOpacity={0.85}
          accessibilityLabel="Send message"
        >
          <LinearGradient
            colors={inputText.trim() ? ['#171817', '#171817'] : ['#D7D2C8', '#D7D2C8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendBtnGradient}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={inputText.trim() ? '#B99A5E' : '#77766F'}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <LiveLocationShare
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onShareLocation={handleLocationShared}
        matchDestination={partnerTripDestination}
      />

      <SafetyReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        travelerId={resolvedMatchId}
        travelerName={partnerDisplayName}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#D7D2C8',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginLeft: -4,
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  headerName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: -0.2,
  },
  trustScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.35)',
  },
  trustScoreText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#B99A5E',
  },
  headerContextSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#77766F',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Trip Context Card */
  tripContextCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: RADII.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    ...SHADOWS.card,
  },
  tripContextCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  tripContextIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tripContextTextBox: {
    flex: 1,
  },
  tripContextDestinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tripContextDestination: {
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  vibeMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.peach,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
  vibeMatchText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  tripContextDates: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.peach,
    fontWeight: '600',
    marginBottom: 2,
  },
  tripContextNotice: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#475569',
  },

  /* Date Separator */
  dateSeparatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dateSeparatorBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADII.full,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateSeparatorText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.0,
  },

  /* Message List & Bubbles */
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  messageBubbleWrapper: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  myBubbleWrapper: {
    alignSelf: 'flex-end',
  },
  theirBubbleWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FBFAF7',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    borderBottomLeftRadius: 4,
  },
  theirLocationBubble: {
    borderLeftWidth: 3,
    borderLeftColor: '#B99A5E',
  },
  myMessageText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#FBFAF7',
    lineHeight: 21,
    fontWeight: '500',
  },
  theirMessageText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#171817',
    lineHeight: 21,
  },
  messageFooterMine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  myMessageTime: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: 'rgba(251, 250, 247, 0.65)',
    fontWeight: '500',
  },
  messageFooterTheir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  theirMessageTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#77766F',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#D7D2C8',
  },
  locationTitleMine: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#FBFAF7',
  },
  locationTitleTheir: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#171817',
  },

  /* Composer */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#D7D2C8',
  },
  attachActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1EEE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D7D2C8',
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F1EEE6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginRight: 10,
    maxHeight: 110,
  },
  textInputField: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#171817',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
