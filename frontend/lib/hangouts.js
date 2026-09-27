import AsyncStorage from './safeStorage.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { getAllPlaces, getPlaceById, filterPlaces } from './places.js';
import { addActivityToTrip } from './tripPlanner.js';
import { logNotificationEvent } from './notifications.js';
import { getOrCreateHangoutChat, sendHangoutSystemEvent } from './groupChat.js';

const HANGOUTS_STORAGE_KEY = '@maybewe_hangout_groups_v1';
const HANGOUT_VOTES_KEY = '@maybewe_hangout_votes_v1';
const HANGOUT_SCHEDULES_KEY = '@maybewe_hangout_schedules_v1';

// Seed demo hangouts for offline / demo mode
export const DEMO_HANGOUTS = [
  {
    id: 'hangout-goa-sunset',
    creator_id: 'user-demo-priya',
    creator_name: 'Priya Sharma',
    title: 'Anjuna Golden Hour & Seafood',
    description: 'Looking to catch sunset together at Thalassa, then walk down to the beach shacks for fresh grilled fish and music.',
    destination: 'Goa',
    target_date: '2026-10-18',
    target_time: '17:30',
    status: 'planning', // planning | scheduled | completed
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    members: [
      { id: 'user-demo-priya', name: 'Priya Sharma', role: 'organizer', status: 'joined', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' },
      { id: 'user-demo-arjun', name: 'Arjun Mehta', role: 'member', status: 'joined', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80' },
      { id: 'user-demo-rohan', name: 'Rohan Verma', role: 'member', status: 'joined', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80' },
    ],
    suggestions: [
      {
        id: 'sugg-thalassa',
        place_id: 'goa-thalassa',
        suggested_by: 'user-demo-priya',
        suggested_by_name: 'Priya',
        notes: 'Best sunset cliff view in North Goa. Need to book a cliffside table.',
        upvotes: 3,
        downvotes: 0,
      },
      {
        id: 'sugg-art-resort',
        place_id: 'goa-art-resort',
        suggested_by: 'user-demo-arjun',
        notes: 'Quiet beachfront cafe if we want live jazz instead.',
        upvotes: 1,
        downvotes: 0,
      },
    ],
    finalized_plan: null,
  },
  {
    id: 'hangout-jaipur-heritage',
    creator_id: 'user-demo-priya',
    creator_name: 'Priya Sharma',
    title: 'Old City Architecture Walk & Chai',
    description: 'Early morning photography exploration around Hawa Mahal and Johari Bazaar before the afternoon heat.',
    destination: 'Jaipur',
    target_date: '2026-11-05',
    target_time: '07:00',
    status: 'scheduled',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    members: [
      { id: 'user-demo-priya', name: 'Priya Sharma', role: 'organizer', status: 'joined', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' },
      { id: 'user-demo-arjun', name: 'Arjun Mehta', role: 'member', status: 'joined', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80' },
    ],
    suggestions: [
      {
        id: 'sugg-hawa-mahal',
        place_id: 'jaipur-hawa-mahal',
        suggested_by: 'user-demo-priya',
        suggested_by_name: 'Priya',
        notes: 'Meet right across at Tattoo Cafe for golden hour roof shots.',
        upvotes: 2,
        downvotes: 0,
      },
    ],
    finalized_plan: {
      place_id: 'jaipur-hawa-mahal',
      place_name: 'Hawa Mahal & Old City',
      activity_name: 'Sunrise Heritage Walk & Rooftop Chai',
      date: '2026-11-05',
      time: '07:00',
      meeting_point: 'Wind View Cafe Rooftop entrance',
      budget_tier: '₹350 per person',
      notes: 'Wear comfortable walking shoes. Camera batteries fully charged!',
    },
  },
];

export function getDemoHangouts() {
  return [...DEMO_HANGOUTS];
}

/**
 * Fetch all hangouts for a user (either as creator or member)
 */
export async function fetchUserHangouts(userId) {
  try {
    if (isSupabaseConfigured && userId) {
      const { data, error } = await supabase
        .from('hangout_groups')
        .select(`
          id,
          creator_id,
          title,
          description,
          destination,
          status,
          target_date,
          target_time,
          created_at,
          members:hangout_group_members(id, user_id, role, status),
          suggestions:hangout_place_suggestions(id, place_id, custom_place_name, notes, suggested_by)
        `)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchUserHangouts failed, using local cache:', err);
  }

  // Fallback to local storage / demo seed
  try {
    const cached = await AsyncStorage.getItem(HANGOUTS_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(DEMO_HANGOUTS));
    return DEMO_HANGOUTS;
  } catch {
    return DEMO_HANGOUTS;
  }
}

/**
 * Create a new Hangout
 */
export async function createHangout(hangoutData, userId = null) {
  const {
    creatorId,
    creatorName = 'Traveler',
    title,
    destination,
    description = '',
    notes = '',
    targetDate = null,
    targetTime = null,
    initialPlaceId = null,
    invitedMembers = [],
  } = (hangoutData || {});

  const finalTitle = title || hangoutData?.title;
  if (!finalTitle || !finalTitle.trim()) {
    throw new Error('Please enter a hangout title.');
  }
  const finalDest = destination || hangoutData?.destination;
  if (!finalDest || !finalDest.trim()) {
    throw new Error('Please select a destination.');
  }

  const hangoutId = `hangout-${Date.now()}`;
  const now = new Date().toISOString();
  const finalCreatorId = creatorId || hangoutData?.creator_id || userId || 'current-user';
  const finalCreatorName = creatorName || hangoutData?.creator_name || 'Traveler';

  const newHangout = {
    id: hangoutId,
    creator_id: finalCreatorId,
    organizer_id: finalCreatorId,
    creator_name: finalCreatorName,
    title: finalTitle.trim(),
    description: (description || notes || '').trim(),
    destination: finalDest.trim(),
    target_date: targetDate || hangoutData?.target_date,
    target_time: targetTime || hangoutData?.target_time,
    status: 'planning',
    created_at: now,
    members: [
      {
        id: finalCreatorId,
        user_id: finalCreatorId,
        name: finalCreatorName,
        role: 'organizer',
        status: 'joined',
      },
      ...(invitedMembers || []).map((m) => ({
        id: m.id || m.user_id,
        user_id: m.id || m.user_id,
        name: m.name || m.title || 'Traveler',
        role: m.role || 'member',
        status: 'joined',
        avatar_url: m.avatar_url || m.avatar,
      })),
    ],
    suggestions: [],
    finalized_plan: null,
  };

  if (initialPlaceId) {
    const place = getPlaceById(initialPlaceId);
    newHangout.suggestions.push({
      id: `sugg-${Date.now()}`,
      place_id: initialPlaceId,
      custom_place_name: place?.name || null,
      suggested_by: finalCreatorId,
      suggested_by_name: finalCreatorName,
      notes: 'Initial place suggestion',
      upvotes: 1,
      downvotes: 0,
    });
  }

  // Persist locally
  const currentHangouts = await fetchUserHangouts(finalCreatorId);
  const updated = [newHangout, ...currentHangouts];
  await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(updated));

  // Sync to Supabase if available
  if (isSupabaseConfigured && creatorId) {
    try {
      const { data: dbHangout, error } = await supabase
        .from('hangout_groups')
        .insert([
          {
            creator_id: creatorId,
            title: title.trim(),
            description: description.trim(),
            destination: destination.trim(),
            target_date: targetDate,
            target_time: targetTime,
            status: 'planning',
          },
        ])
        .select()
        .single();

      if (!error && dbHangout) {
        // Add creator as organizer
        await supabase.from('hangout_group_members').insert([
          {
            hangout_id: dbHangout.id,
            user_id: creatorId,
            role: 'organizer',
            status: 'joined',
          },
        ]);

        // Add invited members
        for (const member of invitedMembers) {
          if (member.id && member.id !== creatorId) {
            await supabase.from('hangout_group_members').insert([
              {
                hangout_id: dbHangout.id,
                user_id: member.id,
                role: 'member',
                status: 'joined',
              },
            ]);

            // Notification foundation
            logNotificationEvent({
              userId: member.id,
              actorId: creatorId,
              type: 'hangout_invite',
              entityId: dbHangout.id,
              title: 'Hangout Invitation',
              message: `${creatorName} invited you to "${title}" in ${destination}.`,
            });
          }
        }

        // Add initial suggestion
        if (initialPlaceId) {
          await supabase.from('hangout_place_suggestions').insert([
            {
              hangout_id: dbHangout.id,
              place_id: initialPlaceId,
              suggested_by: creatorId,
              notes: 'Initial suggestion',
            },
          ]);
        }
      }
    } catch (e) {
      console.warn('Error creating hangout in Supabase:', e);
    }
  }

  // Link / create dedicated group chat for this hangout
  try {
    await getOrCreateHangoutChat(newHangout.id, finalCreatorId, {
      title: newHangout.title,
      description: newHangout.description,
      destination: newHangout.destination,
      members: newHangout.members,
    });
  } catch (err) {
    console.warn('Hangout chat creation notice:', err);
  }

  return newHangout;
}

/**
 * Add a member to a hangout (with duplicate member prevention)
 */
export async function addHangoutMember(hangoutId, memberOrUserId, role = 'member') {
  const memberId = typeof memberOrUserId === 'object' ? (memberOrUserId.id || memberOrUserId.user_id) : memberOrUserId;
  const memberName = typeof memberOrUserId === 'object' ? (memberOrUserId.name || 'Traveler') : 'Traveler';

  const currentHangouts = await fetchUserHangouts();
  const hangoutIndex = currentHangouts.findIndex((h) => h.id === hangoutId);
  if (hangoutIndex === -1) {
    throw new Error('Hangout not found.');
  }

  const hangout = currentHangouts[hangoutIndex];
  hangout.members = hangout.members || [];

  const existingMember = hangout.members.find(
    (m) => m.id === memberId || m.user_id === memberId
  );

  if (existingMember) {
    return { success: true, alreadyMember: true, member: existingMember };
  }

  const newMember = {
    id: memberId,
    user_id: memberId,
    name: memberName,
    role: role,
    status: 'joined',
  };

  hangout.members.push(newMember);
  await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(currentHangouts));

  if (isSupabaseConfigured) {
    try {
      await supabase.from('hangout_group_members').insert([
        {
          hangout_id: hangoutId,
          user_id: memberId,
          role: role,
          status: 'joined',
        },
      ]);
    } catch (e) {
      console.warn('Error adding hangout member to Supabase:', e);
    }
  }

  try {
    await sendHangoutSystemEvent(hangoutId, 'member_joined', { member_name: memberName });
  } catch (e) {}

  return { success: true, alreadyMember: false, member: newMember };
}

/**
 * Remove a member from a hangout
 */
export async function removeHangoutMember(hangoutId, memberId) {
  const currentHangouts = await fetchUserHangouts();
  const hangoutIndex = currentHangouts.findIndex((h) => h.id === hangoutId);
  if (hangoutIndex === -1) return { success: false };

  const hangout = currentHangouts[hangoutIndex];
  hangout.members = (hangout.members || []).filter(
    (m) => m.id !== memberId && m.user_id !== memberId
  );

  await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(currentHangouts));
  return { success: true };
}

/**
 * Smart Hangout Suggestions
 * Evaluates real places from the destination and attaches explainable tags:
 * "Within budget", "Highly rated", "Popular nearby", "Matches your category", "Saved by you"
 */
export function getSmartHangoutSuggestions(options = {}) {
  const {
    destination = '',
    category = null,
    budget_category = null,
    maxBudget = null,
    userSavedPlaceIds = [],
    savedPlaceIds = [],
    limit = 8,
  } = options;

  const savedList = userSavedPlaceIds?.length > 0 ? userSavedPlaceIds : savedPlaceIds;
  let candidates = getAllPlaces();

  if (destination) {
    const destNorm = destination.toLowerCase().trim();
    candidates = candidates.filter((p) => {
      const pDest = (p.destination || '').toLowerCase();
      const pCity = (p.city || '').toLowerCase();
      return pDest.includes(destNorm) || destNorm.includes(pDest) || pCity.includes(destNorm);
    });
  }

  if (category && category !== 'All') {
    const catFiltered = candidates.filter(
      (p) => (p.category || '').toLowerCase() === category.toLowerCase() ||
             (p.categoryIds && p.categoryIds.some((cid) => cid.toLowerCase() === category.toLowerCase()))
    );
    if (catFiltered.length > 0) {
      candidates = catFiltered;
    }
  }

  // Score candidates with explainable signals
  const scored = candidates.map((place) => {
    const tags = [];
    let score = (place.rating || 4.5) * 10;

    // Budget check
    if (maxBudget != null && Number(maxBudget) > 0) {
      if ((place.min_price || place.price_inr || 0) <= Number(maxBudget)) {
        tags.push('Within budget');
        score += 20;
      }
    } else if (budget_category === 'balanced' || budget_category === 'budget' || place.budget_category === 'budget' || place.budget_category === 'balanced' || (place.min_price || 0) <= 1500) {
      tags.push('Within budget');
      score += 20;
    } else if (place.price_level === '₹' || place.price_level === '₹₹') {
      tags.push('Budget friendly');
    }

    // Rating check
    if (place.rating >= 4.7) {
      tags.push('Highly rated');
      score += 15;
    }

    // Popularity check
    if (place.is_trending || (place.popularity_score || 0) >= 80) {
      tags.push('Popular nearby');
      score += 15;
    }

    // Category match
    const isCategoryMatch = category && category !== 'All' && (
      (place.category || '').toLowerCase() === category.toLowerCase() ||
      (place.categoryIds && place.categoryIds.some((cid) => cid.toLowerCase() === category.toLowerCase()))
    );
    if (isCategoryMatch) {
      tags.push('Matches your category');
      score += 10;
    }

    // Saved by you
    if (savedList.includes(place.id)) {
      tags.push('Saved by you');
      score += 25;
    }

    return {
      ...place,
      recommendationTags: tags,
      matchLabels: tags,
      recommendationScore: score,
    };
  });

  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
  return scored.slice(0, limit);
}

export const generateSmartSuggestions = getSmartHangoutSuggestions;

/**
 * Add a place suggestion to a hangout
 */
export async function addHangoutPlaceSuggestion(hangoutId, {
  placeId,
  customPlaceName = null,
  notes = '',
  suggestedBy,
  suggestedByName = 'Traveler',
}) {
  const currentHangouts = await fetchUserHangouts(suggestedBy);
  const hangoutIndex = currentHangouts.findIndex((h) => h.id === hangoutId);

  if (hangoutIndex === -1) {
    throw new Error('Hangout not found.');
  }

  const suggestionId = `sugg-${Date.now()}`;
  const newSuggestion = {
    id: suggestionId,
    place_id: placeId,
    custom_place_name: customPlaceName,
    notes: notes.trim(),
    suggested_by: suggestedBy,
    suggested_by_name: suggestedByName,
    upvotes: 1,
    downvotes: 0,
    created_at: new Date().toISOString(),
  };

  currentHangouts[hangoutIndex].suggestions = currentHangouts[hangoutIndex].suggestions || [];
  currentHangouts[hangoutIndex].suggestions.push(newSuggestion);

  await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(currentHangouts));

  // Sync to Supabase
  if (isSupabaseConfigured && suggestedBy) {
    try {
      await supabase.from('hangout_place_suggestions').insert([
        {
          hangout_id: hangoutId,
          place_id: placeId,
          custom_place_name: customPlaceName,
          suggested_by: suggestedBy,
          notes: notes.trim(),
        },
      ]);
    } catch (e) {
      console.warn('Error saving suggestion in Supabase:', e);
    }
  }

  try {
    await sendHangoutSystemEvent(hangoutId, 'suggestion_added', {
      place_name: customPlaceName || (placeId ? getPlaceById(placeId)?.name : 'Scenic Spot'),
    });
  } catch (e) {}

  return newSuggestion;
}

export async function addPlaceSuggestion(hangoutId, placeIdOrObj, userId, notes = '') {
  if (typeof placeIdOrObj === 'object') {
    return addHangoutPlaceSuggestion(hangoutId, placeIdOrObj);
  }
  return addHangoutPlaceSuggestion(hangoutId, {
    placeId: placeIdOrObj,
    suggestedBy: userId,
    notes,
  });
}

/**
 * Cast a vote on a suggestion (+1 or -1)
 * Enforces: One vote per user per suggestion.
 * Clicking the same vote removes it (toggle).
 */
export async function castHangoutVote(hangoutId, suggestionId, userId, voteValue = 1) {
  const votesKey = `${HANGOUT_VOTES_KEY}_${hangoutId}`;
  let votesMap = {};

  try {
    const raw = await AsyncStorage.getItem(votesKey);
    if (raw) votesMap = JSON.parse(raw);
  } catch {}

  const userVoteKey = `${suggestionId}_${userId}`;
  const existingVote = votesMap[userVoteKey];

  let newVoteValue = voteValue;
  if (existingVote === voteValue) {
    // Toggle off if already voted the same
    delete votesMap[userVoteKey];
    newVoteValue = 0;
  } else {
    // Record new or changed vote
    votesMap[userVoteKey] = voteValue;
  }

  await AsyncStorage.setItem(votesKey, JSON.stringify(votesMap));

  // Update in-memory suggestions list
  const currentHangouts = await fetchUserHangouts(userId);
  const hangout = currentHangouts.find((h) => h.id === hangoutId);
  if (hangout && Array.isArray(hangout.suggestions)) {
    const sugg = hangout.suggestions.find((s) => s.id === suggestionId);
    if (sugg) {
      // Recompute upvotes from votesMap
      const upvotes = Object.entries(votesMap).filter(
        ([k, v]) => k.startsWith(suggestionId) && v === 1
      ).length;
      const downvotes = Object.entries(votesMap).filter(
        ([k, v]) => k.startsWith(suggestionId) && v === -1
      ).length;

      sugg.upvotes = upvotes;
      sugg.downvotes = downvotes;
      await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(currentHangouts));
    }
  }

  // Sync to Supabase
  if (isSupabaseConfigured && userId) {
    try {
      if (newVoteValue === 0) {
        await supabase
          .from('hangout_votes')
          .delete()
          .eq('suggestion_id', suggestionId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('hangout_votes')
          .upsert(
            [
              {
                suggestion_id: suggestionId,
                user_id: userId,
                vote_value: newVoteValue,
              },
            ],
            { onConflict: 'suggestion_id,user_id' }
          );
      }
    } catch (e) {
      console.warn('Error casting vote in Supabase:', e);
    }
  }

  return { suggestionId, newVoteValue };
}

/**
 * Get user's current votes for a hangout
 */
export async function getUserHangoutVotes(hangoutId) {
  const votesKey = `${HANGOUT_VOTES_KEY}_${hangoutId}`;
  try {
    const raw = await AsyncStorage.getItem(votesKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Finalize Hangout Plan
 * Moves hangout status from 'planning' to 'scheduled' and creates the finalized plan summary
 */
export async function finalizeHangoutPlan(hangoutId, {
  placeId,
  placeName,
  activityName,
  date,
  time,
  meetingPoint,
  budgetTier,
  notes,
  finalizedBy,
}) {
  const currentHangouts = await fetchUserHangouts(finalizedBy);
  const hangoutIndex = currentHangouts.findIndex((h) => h.id === hangoutId);

  if (hangoutIndex === -1) {
    throw new Error('Hangout not found.');
  }

  const finalizedPlan = {
    place_id: placeId,
    place_name: placeName,
    activity_name: activityName || `Meet at ${placeName}`,
    date: date || currentHangouts[hangoutIndex].target_date,
    time: time || currentHangouts[hangoutIndex].target_time,
    meeting_point: meetingPoint || `Entrance of ${placeName}`,
    budget_tier: budgetTier || 'Moderate',
    notes: notes || '',
    finalized_at: new Date().toISOString(),
  };

  currentHangouts[hangoutIndex].status = 'scheduled';
  currentHangouts[hangoutIndex].finalized_plan = finalizedPlan;

  await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(currentHangouts));

  // Sync to Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('hangout_groups')
        .update({ status: 'scheduled' })
        .eq('id', hangoutId);

      const startTimeStr = date && time ? `${date}T${time}:00Z` : new Date().toISOString();
      await supabase.from('hangout_schedules').insert([
        {
          hangout_id: hangoutId,
          place_id: placeId,
          activity_name: activityName || `Meet at ${placeName}`,
          start_time: startTimeStr,
          meeting_point: meetingPoint,
          notes: notes,
        },
      ]);

      // Notify members that hangout is finalized
      const members = currentHangouts[hangoutIndex].members || [];
      for (const m of members) {
        if (m.id && m.id !== finalizedBy) {
          logNotificationEvent({
            userId: m.id,
            actorId: finalizedBy,
            type: 'hangout_finalized',
            entityId: hangoutId,
            title: 'Hangout Plan Finalized!',
            message: `The plan for "${currentHangouts[hangoutIndex].title}" at ${placeName} is confirmed!`,
          });
        }
      }
    } catch (e) {
      console.warn('Error finalizing hangout in Supabase:', e);
    }
  }

  return finalizedPlan;
}

/**
 * Vote on a place suggestion (toggle vote with duplicate prevention)
 */
export async function voteOnSuggestion(suggestionId, userId, voteValue = 1) {
  const currentHangouts = await fetchUserHangouts(userId);
  let targetHangoutId = null;

  for (const h of currentHangouts) {
    if (h.suggestions && h.suggestions.some((s) => s.id === suggestionId)) {
      targetHangoutId = h.id;
      break;
    }
  }

  if (!targetHangoutId) {
    targetHangoutId = currentHangouts[0]?.id || 'hangout-default';
  }

  const res = await castHangoutVote(targetHangoutId, suggestionId, userId, voteValue);
  return {
    voted: res.newVoteValue !== 0,
    voteValue: res.newVoteValue,
    suggestionId,
  };
}

/**
 * Finalize Hangout (with strict organizer check)
 */
export async function finalizeHangout(hangoutId, scheduleData, userId) {
  const currentHangouts = await fetchUserHangouts(userId);
  const hangoutIndex = currentHangouts.findIndex((h) => h.id === hangoutId);
  if (hangoutIndex === -1) {
    throw new Error('Hangout not found.');
  }

  const hangout = currentHangouts[hangoutIndex];
  const isOrganizer =
    hangout.organizer_id === userId ||
    hangout.creator_id === userId ||
    hangout.members?.some((m) => (m.id === userId || m.user_id === userId) && m.role === 'organizer');

  if (!isOrganizer) {
    throw new Error('Only the organizer can finalize this hangout plan.');
  }

  const placeId = scheduleData.place_id || scheduleData.placeId;
  const place = placeId ? getPlaceById(placeId) : null;
  const placeName = place?.name || scheduleData.place_name || 'Selected Place';

  const schedule = {
    id: `sched-${Date.now()}`,
    hangout_id: hangoutId,
    place_id: placeId,
    place_name: placeName,
    proposed_date: scheduleData.proposed_date || scheduleData.date || hangout.target_date,
    proposed_time: scheduleData.proposed_time || scheduleData.time || hangout.target_time,
    notes: scheduleData.notes || '',
    finalized_at: new Date().toISOString(),
  };

  hangout.status = 'confirmed';
  hangout.schedule = schedule;
  hangout.finalized_plan = schedule;

  await AsyncStorage.setItem(HANGOUTS_STORAGE_KEY, JSON.stringify(currentHangouts));

  try {
    await sendHangoutSystemEvent(hangoutId, 'plan_finalized', {
      place_name: placeName,
      time: schedule.proposed_time,
    });
  } catch (e) {}

  return {
    hangout,
    schedule,
  };
}

/**
 * Add a finalized hangout plan into the user's active Trip Planner!
 * Reuses the same place record without duplicating data!
 */
export async function addHangoutToTrip(hangoutIdOrObj, targetTripIdOrDay) {
  let hangoutPlan = null;
  let targetTripId = null;
  let dayNumber = 1;
  let timeSlot = 'evening';

  if (typeof hangoutIdOrObj === 'object' && hangoutIdOrObj !== null) {
    if (hangoutIdOrObj.hangoutPlan) {
      hangoutPlan = hangoutIdOrObj.hangoutPlan;
      targetTripId = hangoutIdOrObj.targetTripId;
      dayNumber = hangoutIdOrObj.dayNumber || 1;
      timeSlot = hangoutIdOrObj.timeSlot || 'evening';
    } else {
      hangoutPlan = hangoutIdOrObj.finalized_plan || hangoutIdOrObj.schedule || hangoutIdOrObj;
      targetTripId = targetTripIdOrDay;
    }
  } else if (typeof hangoutIdOrObj === 'string') {
    targetTripId = targetTripIdOrDay;
    const hangouts = await fetchUserHangouts();
    const found = hangouts.find((h) => h.id === hangoutIdOrObj);
    hangoutPlan = found?.finalized_plan || found?.schedule || {
      place_id: 'goa-1',
      activity_name: found?.title || 'Hangout Activity',
      notes: found?.description || '',
    };
  }

  if (!targetTripId) {
    throw new Error('Target trip ID is required.');
  }

  const place = hangoutPlan?.place_id ? getPlaceById(hangoutPlan.place_id) : null;
  const activityTitle = hangoutPlan?.activity_name || (place ? `Hangout at ${place.name}` : 'Hangout Meetup');

  const res = await addActivityToTrip(targetTripId, {
    place_id: hangoutPlan?.place_id || null,
    title: activityTitle,
    time_slot: timeSlot,
    start_time: hangoutPlan?.time || '18:00',
    end_time: '20:30',
    estimated_cost: place?.min_price || place?.price_inr || 500,
    notes: `Hangout Plan: ${hangoutPlan?.notes || ''}`,
  }, dayNumber);

  return {
    success: true,
    activity: res.activity,
    itinerary: res.itinerary,
  };
}
