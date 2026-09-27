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
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/themeContext.jsx';
import { COLORS, RADII, SHADOWS, FONTS } from '../lib/theme.js';
import { getPlaceById } from '../lib/places.js';
import {
  castHangoutVote,
  getUserHangoutVotes,
  addHangoutPlaceSuggestion,
  finalizeHangoutPlan,
  addHangoutToTrip,
} from '../lib/hangouts.js';
import LiveLocationConsentModal from './LiveLocationConsentModal.jsx';
import LiveLocationMapModal from './LiveLocationMapModal.jsx';
import { getActiveLiveLocationSession, formatRemainingTime } from '../lib/liveLocation.js';

const { width: SCREEN_W } = Dimensions.get('window');

export default function HangoutDetailModal({
  visible,
  hangout,
  onClose,
  onHangoutUpdated,
  currentUser = null,
  onOpenAddToTrip = null,
  onOpenPlaceDetail = null,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  const [activeHangout, setActiveHangout] = useState(hangout);
  const [userVotes, setUserVotes] = useState({});
  const [votingId, setVotingId] = useState(null);

  // Finalize Plan state
  const [showFinalizeSheet, setShowFinalizeSheet] = useState(false);
  const [selectedFinalPlaceId, setSelectedFinalPlaceId] = useState(null);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [finalNotes, setFinalNotes] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  // Suggest Place state
  const [showSuggestInput, setShowSuggestInput] = useState(false);
  const [customSuggName, setCustomSuggName] = useState('');
  const [customSuggNotes, setCustomSuggNotes] = useState('');

  // Trip association state
  const [addingToTrip, setAddingToTrip] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Live Location Presence state
  const [liveConsentVisible, setLiveConsentVisible] = useState(false);
  const [liveMapVisible, setLiveMapVisible] = useState(false);
  const [hangoutLiveSession, setHangoutLiveSession] = useState(null);

  useEffect(() => {
    if (hangout) {
      setActiveHangout(hangout);
      loadUserVotes(hangout.id);
      if (hangout.suggestions && hangout.suggestions.length > 0) {
        setSelectedFinalPlaceId(hangout.suggestions[0].place_id);
      }

      // Check for active live location session for this hangout
      getActiveLiveLocationSession({
        chatGroupId: `group-hangout-${hangout.id}`,
        currentUserId: currentUser?.id || 'user-demo-priya',
      }).then(setHangoutLiveSession).catch(() => {});
    }
  }, [hangout, currentUser?.id]);

  const loadUserVotes = async (hangoutId) => {
    const votes = await getUserHangoutVotes(hangoutId);
    setUserVotes(votes);
  };

  if (!activeHangout) return null;

  const isOrganizer =
    activeHangout.creator_id === (currentUser?.id || 'current-user') ||
    activeHangout.members?.some(
      (m) => m.id === (currentUser?.id || 'current-user') && m.role === 'organizer'
    );

  const isScheduled = activeHangout.status === 'scheduled';
  const finalizedPlan = activeHangout.finalized_plan;

  const handleVote = async (suggestionId, voteVal) => {
    setVotingId(suggestionId);
    try {
      const res = await castHangoutVote(
        activeHangout.id,
        suggestionId,
        currentUser?.id || 'current-user',
        voteVal
      );

      const updatedVotes = { ...userVotes };
      const voteKey = `${suggestionId}_${currentUser?.id || 'current-user'}`;
      if (res.newVoteValue === 0) {
        delete updatedVotes[voteKey];
      } else {
        updatedVotes[voteKey] = res.newVoteValue;
      }
      setUserVotes(updatedVotes);

      // Update local suggestion vote counts
      const updatedSugg = (activeHangout.suggestions || []).map((s) => {
        if (s.id === suggestionId) {
          const delta = res.newVoteValue === 0 ? -voteVal : voteVal;
          return {
            ...s,
            upvotes: Math.max(0, (s.upvotes || 0) + (res.newVoteValue === 1 ? 1 : res.newVoteValue === 0 ? -1 : 0)),
          };
        }
        return s;
      });

      const updatedHangout = { ...activeHangout, suggestions: updatedSugg };
      setActiveHangout(updatedHangout);
      if (onHangoutUpdated) onHangoutUpdated(updatedHangout);
    } catch (e) {
      console.warn('Error voting:', e);
    } finally {
      setVotingId(null);
    }
  };

  const handleAddCustomSuggestion = async () => {
    if (!customSuggName.trim()) return;

    try {
      const newSugg = await addHangoutPlaceSuggestion(activeHangout.id, {
        placeId: null,
        customPlaceName: customSuggName.trim(),
        notes: customSuggNotes.trim(),
        suggestedBy: currentUser?.id || 'current-user',
        suggestedByName: currentUser?.name || 'Traveler',
      });

      const updated = {
        ...activeHangout,
        suggestions: [...(activeHangout.suggestions || []), newSugg],
      };
      setActiveHangout(updated);
      if (onHangoutUpdated) onHangoutUpdated(updated);

      setCustomSuggName('');
      setCustomSuggNotes('');
      setShowSuggestInput(false);
    } catch (e) {
      console.warn('Error adding suggestion:', e);
    }
  };

  const handleFinalizePlan = async () => {
    setFinalizing(true);
    try {
      const place = selectedFinalPlaceId ? getPlaceById(selectedFinalPlaceId) : null;
      const placeName = place?.name || 'Selected Destination Spot';

      const plan = await finalizeHangoutPlan(activeHangout.id, {
        placeId: selectedFinalPlaceId,
        placeName,
        activityName: `Meet at ${placeName}`,
        date: activeHangout.target_date,
        time: activeHangout.target_time,
        meetingPoint: meetingPoint || `Main Entrance of ${placeName}`,
        budgetTier: place ? `₹${place.price_inr} per person` : 'Moderate',
        notes: finalNotes || activeHangout.description,
        finalizedBy: currentUser?.id || 'current-user',
      });

      const updated = {
        ...activeHangout,
        status: 'scheduled',
        finalized_plan: plan,
      };
      setActiveHangout(updated);
      if (onHangoutUpdated) onHangoutUpdated(updated);
      setShowFinalizeSheet(false);
    } catch (e) {
      console.warn('Error finalizing plan:', e);
    } finally {
      setFinalizing(false);
    }
  };

  const handleAddToTripCTA = () => {
    if (onOpenAddToTrip && finalizedPlan) {
      const place = finalizedPlan.place_id ? getPlaceById(finalizedPlan.place_id) : {
        id: 'hangout-place',
        name: finalizedPlan.place_name,
        price_inr: 500,
        destination: activeHangout.destination,
      };
      onOpenAddToTrip(place);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.statusPillRow}>
                <View style={[styles.statusBadge, isScheduled ? styles.statusBadgeScheduled : styles.statusBadgePlanning]}>
                  <View style={[styles.statusDot, isScheduled ? styles.statusDotScheduled : styles.statusDotPlanning]} />
                  <Text style={[styles.statusBadgeText, isScheduled ? styles.statusTextScheduled : styles.statusTextPlanning]}>
                    {isScheduled ? 'FINALIZED & SCHEDULED' : 'COLLABORATIVE PLANNING'}
                  </Text>
                </View>
                <Text style={[styles.destBadge, { color: colors.textSecondary }]}>• {activeHangout.destination}</Text>
              </View>
              <Text style={[styles.hangoutTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {activeHangout.title}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* FINALIZED PLAN HERO CARD */}
            {isScheduled && finalizedPlan ? (
              <View style={styles.finalPlanWrapper}>
                <View style={styles.finalPlanCard}>
                  <View style={styles.finalHeader}>
                    <Ionicons name="checkmark-done-circle" size={24} color="#C8B27A" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.finalEyebrow}>CONFIRMED HANGOUT PLAN</Text>
                      <Text style={styles.finalPlaceName}>{finalizedPlan.place_name}</Text>
                    </View>
                  </View>

                  <View style={styles.finalDetailsGrid}>
                    <View style={styles.finalDetailItem}>
                      <Ionicons name="calendar-outline" size={15} color="#C8B27A" />
                      <Text style={styles.finalDetailVal}>{finalizedPlan.date || 'Upcoming'}</Text>
                    </View>
                    <View style={styles.finalDetailItem}>
                      <Ionicons name="time-outline" size={15} color="#C8B27A" />
                      <Text style={styles.finalDetailVal}>{finalizedPlan.time || 'Evening'}</Text>
                    </View>
                    <View style={styles.finalDetailItem}>
                      <Ionicons name="cash-outline" size={15} color="#C8B27A" />
                      <Text style={styles.finalDetailVal}>{finalizedPlan.budget_tier || 'Budget-friendly'}</Text>
                    </View>
                    <View style={styles.finalDetailItem}>
                      <Ionicons name="location-outline" size={15} color="#C8B27A" />
                      <Text style={styles.finalDetailVal} numberOfLines={1}>{finalizedPlan.meeting_point || 'Main entrance'}</Text>
                    </View>
                  </View>

                  {finalizedPlan.notes ? (
                    <Text style={styles.finalNotesText}>"{finalizedPlan.notes}"</Text>
                  ) : null}

                  {/* Add to Trip Action */}
                  <TouchableOpacity
                    onPress={handleAddToTripCTA}
                    style={styles.addToTripBtn}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="briefcase" size={16} color="#FAF8F3" style={{ marginRight: 8 }} />
                    <Text style={styles.addToTripBtnText}>Add to My Trip Itinerary</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Target Date & Notes */}
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color="#B99A5E" style={{ marginRight: 10 }} />
                <Text style={[styles.infoLabel, { color: colors.textPrimary }]}>
                  {activeHangout.target_date || 'Date TBD'} • {activeHangout.target_time || 'Time TBD'}
                </Text>
              </View>
              {activeHangout.description ? (
                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                  {activeHangout.description}
                </Text>
              ) : null}
            </View>

            {/* Open Hangout Group Chat CTA */}
            <TouchableOpacity
              onPress={() => {
                onClose && onClose();
                router.push({
                  pathname: `/chat/group-hangout-${activeHangout.id}`,
                  params: {
                    partnerName: activeHangout.title,
                    destination: activeHangout.destination,
                    isGroup: 'true',
                  },
                });
              }}
              style={styles.openChatBarBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubbles" size={16} color="#FAF8F3" style={{ marginRight: 8 }} />
              <Text style={styles.openChatBarBtnText}>Open Hangout Group Chat</Text>
              <Ionicons name="chevron-forward" size={14} color="#C8B27A" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Live Location Presence Row */}
            <View style={[styles.hangoutLivePresenceCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.hangoutLiveHeader}>
                <View style={styles.hangoutLiveIconWrap}>
                  <Ionicons name="navigate" size={16} color="#C8B27A" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.hangoutLiveTitle, { color: colors.textPrimary }]}>
                    {hangoutLiveSession && hangoutLiveSession.status === 'active'
                      ? 'Live Location Active'
                      : 'Travel Presence'}
                  </Text>
                  <Text style={[styles.hangoutLiveSubtitle, { color: colors.textSecondary }]}>
                    {hangoutLiveSession && hangoutLiveSession.status === 'active'
                      ? formatRemainingTime(hangoutLiveSession.expires_at)
                      : 'Share real-time foreground coordinates for meetups'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.hangoutLiveActionBtn,
                    hangoutLiveSession && hangoutLiveSession.status === 'active' && styles.hangoutLiveActionBtnActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (hangoutLiveSession && hangoutLiveSession.status === 'active') {
                      setLiveMapVisible(true);
                    } else {
                      setLiveConsentVisible(true);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.hangoutLiveActionBtnText,
                      hangoutLiveSession && hangoutLiveSession.status === 'active' && styles.hangoutLiveActionBtnTextActive,
                    ]}
                  >
                    {hangoutLiveSession && hangoutLiveSession.status === 'active' ? 'View Map' : 'Share Location'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Preset Intent Tags */}
              {(!hangoutLiveSession || hangoutLiveSession.status !== 'active') && (
                <View style={styles.intentChipsRow}>
                  {['Meet me there', 'On my way', 'Arriving soon'].map((intent, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.intentChip, { borderColor: colors.border }]}
                      activeOpacity={0.7}
                      onPress={() => setLiveConsentVisible(true)}
                    >
                      <Ionicons name="footsteps-outline" size={11} color="#C8B27A" style={{ marginRight: 4 }} />
                      <Text style={[styles.intentChipText, { color: colors.textSecondary }]}>{intent}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Members Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Group Travelers</Text>
                <Text style={styles.memberCountBadge}>{activeHangout.members?.length || 1} Members</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
                {(activeHangout.members || []).map((m) => (
                  <View key={m.id} style={[styles.memberPill, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Image
                      source={{ uri: m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' }}
                      style={styles.memberAvatar}
                    />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>{m.name}</Text>
                      <Text style={styles.memberRole}>{m.role === 'organizer' ? 'Organizer' : 'Member'}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Place Suggestions & Voting */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Suggested Places & Voting</Text>
                {!isScheduled && (
                  <TouchableOpacity
                    onPress={() => setShowSuggestInput(!showSuggestInput)}
                    style={styles.addSuggBtn}
                  >
                    <Ionicons name={showSuggestInput ? 'close' : 'add'} size={15} color="#B99A5E" />
                    <Text style={styles.addSuggBtnText}>{showSuggestInput ? 'Cancel' : 'Suggest Spot'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Add Custom Suggestion Form */}
              {showSuggestInput && (
                <View style={[styles.customSuggBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Text style={[styles.customSuggHeader, { color: colors.textPrimary }]}>Propose a Place to the Group</Text>
                  <TextInput
                    style={[styles.customInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="Place name (e.g. Thalassa Siolim or Hilltop Cafe)"
                    placeholderTextColor={colors.textSecondary}
                    value={customSuggName}
                    onChangeText={setCustomSuggName}
                  />
                  <TextInput
                    style={[styles.customInput, { color: colors.textPrimary, borderColor: colors.border, marginTop: 8 }]}
                    placeholder="Why this spot? (Sunset, good coffee, live music...)"
                    placeholderTextColor={colors.textSecondary}
                    value={customSuggNotes}
                    onChangeText={setCustomSuggNotes}
                  />
                  <TouchableOpacity
                    onPress={handleAddCustomSuggestion}
                    style={styles.submitSuggBtn}
                  >
                    <Text style={styles.submitSuggBtnText}>Add to Group Voting</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Suggestions List */}
              {(activeHangout.suggestions || []).length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="sparkles-outline" size={28} color="#B99A5E" style={{ marginBottom: 6 }} />
                  <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No places suggested yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Suggest a cafe, beach shack, or viewpoint to start voting!</Text>
                </View>
              ) : (
                <View style={styles.suggList}>
                  {(activeHangout.suggestions || []).map((sugg) => {
                    const place = sugg.place_id ? getPlaceById(sugg.place_id) : null;
                    const placeTitle = place?.name || sugg.custom_place_name || 'Destination Spot';
                    const userVoteKey = `${sugg.id}_${currentUser?.id || 'current-user'}`;
                    const hasVotedUp = userVotes[userVoteKey] === 1;

                    return (
                      <View
                        key={sugg.id}
                        style={[
                          styles.suggVoteCard,
                          { backgroundColor: colors.cardBackground, borderColor: colors.border },
                          hasVotedUp && styles.suggVoteCardVoted,
                        ]}
                      >
                        {place?.cover_image_url ? (
                          <Image source={{ uri: place.cover_image_url }} style={styles.suggThumb} />
                        ) : (
                          <View style={styles.suggPlaceholderThumb}>
                            <Ionicons name="location" size={20} color="#B99A5E" />
                          </View>
                        )}

                        <View style={styles.suggContent}>
                          <View style={styles.suggTitleRow}>
                            <Text style={[styles.suggPlaceName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {placeTitle}
                            </Text>
                            {place?.rating ? (
                              <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={10} color="#B99A5E" />
                                <Text style={styles.ratingText}>{place.rating}</Text>
                              </View>
                            ) : null}
                          </View>

                          {place ? (
                            <Text style={[styles.suggCategoryText, { color: colors.textSecondary }]}>
                              {place.category} • ₹{place.price_inr}
                            </Text>
                          ) : null}

                          {sugg.notes ? (
                            <Text style={[styles.suggNoteText, { color: colors.textSecondary }]} numberOfLines={2}>
                              "{sugg.notes}"
                            </Text>
                          ) : null}

                          {/* Detail button */}
                          {place && onOpenPlaceDetail ? (
                            <TouchableOpacity
                              onPress={() => onOpenPlaceDetail(place)}
                              style={styles.viewPlaceLink}
                            >
                              <Text style={styles.viewPlaceLinkText}>View place details →</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {/* Voting Button */}
                        <TouchableOpacity
                          onPress={() => handleVote(sugg.id, 1)}
                          disabled={votingId === sugg.id || isScheduled}
                          style={[
                            styles.voteButton,
                            hasVotedUp && styles.voteButtonActive,
                            isScheduled && { opacity: 0.6 },
                          ]}
                        >
                          <Ionicons
                            name={hasVotedUp ? 'thumbs-up' : 'thumbs-up-outline'}
                            size={16}
                            color={hasVotedUp ? '#FAF8F3' : '#B99A5E'}
                          />
                          <Text style={[styles.voteCount, hasVotedUp && styles.voteCountActive]}>
                            {sugg.upvotes || 0}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Finalize Plan Drawer for Organizer */}
            {isOrganizer && !isScheduled && (
              <View style={styles.finalizeSection}>
                <TouchableOpacity
                  onPress={() => setShowFinalizeSheet(!showFinalizeSheet)}
                  style={styles.finalizeToggleBtn}
                >
                  <Ionicons name="checkbox-outline" size={18} color="#B99A5E" style={{ marginRight: 8 }} />
                  <Text style={styles.finalizeToggleBtnText}>Finalize Hangout Decision</Text>
                  <Ionicons name={showFinalizeSheet ? 'chevron-up' : 'chevron-down'} size={16} color="#8C8983" />
                </TouchableOpacity>

                {showFinalizeSheet && (
                  <View style={[styles.finalizeBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.finalizeHeader, { color: colors.textPrimary }]}>Lock in the Winning Plan</Text>
                    <Text style={styles.finalizeSub}>Choose the confirmed place from group votes:</Text>

                    {/* Place Picker from suggestions */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickPlaceRow}>
                      {(activeHangout.suggestions || []).map((s) => {
                        const place = s.place_id ? getPlaceById(s.place_id) : null;
                        const title = place?.name || s.custom_place_name || 'Spot';
                        const isPicked = selectedFinalPlaceId === s.place_id;

                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => setSelectedFinalPlaceId(s.place_id)}
                            style={[
                              styles.pickPlaceCard,
                              { borderColor: colors.border },
                              isPicked && styles.pickPlaceCardActive,
                            ]}
                          >
                            <Text style={[styles.pickPlaceTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
                            <Text style={styles.pickPlaceVotes}>{s.upvotes || 0} votes</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <TextInput
                      style={[styles.customInput, { color: colors.textPrimary, borderColor: colors.border, marginTop: 12 }]}
                      placeholder="Meeting point (e.g. Near the main entrance / cliffside steps)"
                      placeholderTextColor={colors.textSecondary}
                      value={meetingPoint}
                      onChangeText={setMeetingPoint}
                    />

                    <TextInput
                      style={[styles.customInput, { color: colors.textPrimary, borderColor: colors.border, marginTop: 8 }]}
                      placeholder="Final instructions or packing notes"
                      placeholderTextColor={colors.textSecondary}
                      value={finalNotes}
                      onChangeText={setFinalNotes}
                    />

                    <TouchableOpacity
                      onPress={handleFinalizePlan}
                      disabled={finalizing}
                      style={styles.confirmFinalBtn}
                    >
                      {finalizing ? (
                        <ActivityIndicator size="small" color="#FAF8F3" />
                      ) : (
                        <Text style={styles.confirmFinalBtnText}>Confirm & Publish Final Plan</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* Live Location Consent Sheet */}
      <LiveLocationConsentModal
        visible={liveConsentVisible}
        onClose={() => setLiveConsentVisible(false)}
        targetName={activeHangout.title}
        chatGroupId={`group-hangout-${activeHangout.id}`}
        currentUserId={currentUser?.id || 'user-demo-priya'}
        onSessionStarted={(sess) => {
          setHangoutLiveSession(sess);
          setLiveMapVisible(true);
        }}
      />

      {/* Live Location Map Modal */}
      <LiveLocationMapModal
        visible={liveMapVisible}
        onClose={() => setLiveMapVisible(false)}
        session={hangoutLiveSession}
        companionName={activeHangout.title}
        currentUserId={currentUser?.id || 'user-demo-priya'}
        onSessionStopped={() => setHangoutLiveSession(null)}
      />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgePlanning: {
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
  },
  statusBadgeScheduled: {
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusDotPlanning: {
    backgroundColor: '#B99A5E',
  },
  statusDotScheduled: {
    backgroundColor: '#2E7D32',
  },
  statusBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  statusTextPlanning: {
    color: '#87692B',
  },
  statusTextScheduled: {
    color: '#2E7D32',
  },
  destBadge: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginLeft: 6,
  },
  hangoutTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bodyScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  finalPlanWrapper: {
    marginBottom: 20,
  },
  finalPlanCard: {
    backgroundColor: '#171716',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C8B27A',
  },
  finalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  finalEyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#C8B27A',
  },
  finalPlaceName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FAF8F3',
    marginTop: 2,
  },
  finalDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  finalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  finalDetailVal: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#FAF8F3',
    marginLeft: 6,
  },
  finalNotesText: {
    fontFamily: FONTS.regular,
    fontStyle: 'italic',
    fontSize: 13,
    color: '#D8D4CB',
    marginBottom: 16,
  },
  addToTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B99A5E',
    height: 46,
    borderRadius: 12,
  },
  addToTripBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FAF8F3',
  },
  infoCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
  descText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  memberCountBadge: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#8C8983',
  },
  membersRow: {
    gap: 10,
    paddingVertical: 4,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  memberName: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  memberRole: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#8C8983',
  },
  addSuggBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
  },
  addSuggBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#B99A5E',
    marginLeft: 4,
  },
  customSuggBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  customSuggHeader: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    marginBottom: 8,
  },
  customInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  submitSuggBtn: {
    backgroundColor: '#171716',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitSuggBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#FAF8F3',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  suggList: {
    gap: 10,
  },
  suggVoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggVoteCardVoted: {
    borderColor: '#B99A5E',
    backgroundColor: 'rgba(185, 154, 94, 0.05)',
  },
  suggThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  suggPlaceholderThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(185, 154, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggPlaceName: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 154, 94, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  ratingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: '#87692B',
    marginLeft: 2,
  },
  suggCategoryText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  suggNoteText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewPlaceLink: {
    marginTop: 4,
  },
  viewPlaceLinkText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#B99A5E',
  },
  voteButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B99A5E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  voteButtonActive: {
    backgroundColor: '#171716',
    borderColor: '#171716',
  },
  voteCount: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#B99A5E',
    marginTop: 2,
  },
  voteCountActive: {
    color: '#FAF8F3',
  },
  finalizeSection: {
    marginTop: 10,
  },
  finalizeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
  },
  finalizeToggleBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#B99A5E',
  },
  finalizeBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  finalizeHeader: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  finalizeSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#8C8983',
    marginTop: 2,
    marginBottom: 10,
  },
  pickPlaceRow: {
    gap: 8,
    paddingVertical: 4,
  },
  pickPlaceCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickPlaceCardActive: {
    backgroundColor: '#171716',
    borderColor: '#B99A5E',
  },
  pickPlaceTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  pickPlaceVotes: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#8C8983',
    marginTop: 2,
  },
  confirmFinalBtn: {
    backgroundColor: '#171716',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  confirmFinalBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FAF8F3',
  },
  openChatBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  openChatBarBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#FAF8F3',
    fontWeight: '700',
  },
  /* Hangout Live Presence Card */
  hangoutLivePresenceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 6,
  },
  hangoutLiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hangoutLiveIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangoutLiveTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  hangoutLiveSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 1,
  },
  hangoutLiveActionBtn: {
    backgroundColor: '#171817',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  hangoutLiveActionBtnActive: {
    backgroundColor: '#C8B27A',
  },
  hangoutLiveActionBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#FAF8F3',
  },
  hangoutLiveActionBtnTextActive: {
    color: '#171817',
  },
  intentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  intentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(200, 178, 122, 0.08)',
  },
  intentChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
