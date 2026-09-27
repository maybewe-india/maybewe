// ============================================================================
// MAYBEWE LUXURY TRAVEL MESSAGE CARD (components/TravelMessageCard.jsx)
// Renders rich interactive cards for Places, Trips, Activities, and Hangouts
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '../lib/theme';

export default function TravelMessageCard({
  type,
  data = {},
  onViewPlace,
  onAddToTrip,
  onViewTrip,
  onOpenHangout,
  onViewActivity,
}) {
  if (!data) return null;

  // 1. PLACE CARD
  if (type === 'place_share' || type === 'place') {
    const placeId = data.place_id || data.id;
    const placeName = data.place_name || data.name || 'Curated Place';
    const destination = data.destination || 'India';
    const category = data.category || 'Spot';
    const rating = data.rating || 4.8;
    const imageUrl = data.image_url || data.image || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800';

    return (
      <View style={[styles.cardContainer, SHADOWS.card]}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{category}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color="#C8B27A" />
            <Text style={styles.ratingBadgeText}>{Number(rating).toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {placeName}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="#8A867E" />
            <Text style={styles.locationText} numberOfLines={1}>
              {destination}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryPill}
              activeOpacity={0.8}
              onPress={() => onViewPlace && onViewPlace(placeId)}
            >
              <Text style={styles.primaryPillText}>View Place</Text>
              <Ionicons name="chevron-forward" size={12} color="#FAF8F3" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryPill}
              activeOpacity={0.8}
              onPress={() => onAddToTrip && onAddToTrip(placeId)}
            >
              <Ionicons name="add" size={13} color="#171817" />
              <Text style={styles.secondaryPillText}>Add to Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 2. TRIP CARD
  if (type === 'trip_share' || type === 'trip') {
    const tripId = data.trip_id || data.id;
    const tripName = data.trip_name || data.title || 'Curated Itinerary';
    const destination = data.destination || 'India';
    const dates = data.dates || 'Upcoming Journey';
    const coverImage = data.cover_image || data.image_url || 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800';

    return (
      <View style={[styles.cardContainer, SHADOWS.card]}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: coverImage }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.categoryBadge}>
            <Ionicons name="briefcase-outline" size={11} color="#171817" style={{ marginRight: 3 }} />
            <Text style={styles.categoryBadgeText}>Trip Plan</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {tripName}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="compass-outline" size={13} color="#8A867E" />
            <Text style={styles.locationText} numberOfLines={1}>
              {destination} • {dates}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryPill, { flex: 1 }]}
              activeOpacity={0.8}
              onPress={() => onViewTrip && onViewTrip(tripId)}
            >
              <Text style={styles.primaryPillText}>View Trip</Text>
              <Ionicons name="chevron-forward" size={12} color="#FAF8F3" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 3. ACTIVITY / ITINERARY CARD
  if (type === 'activity_share' || type === 'activity') {
    const activity = data.activity || data;
    const activityName = activity.name || activity.title || 'Itinerary Activity';
    const day = activity.day ? `Day ${activity.day}` : 'Itinerary Item';
    const time = activity.time || 'Flexible';
    const location = activity.location || activity.place_name || 'Destination Point';

    return (
      <View style={[styles.cardContainer, { padding: 12 }, SHADOWS.card]}>
        <View style={styles.activityHeaderRow}>
          <View style={styles.activityDayPill}>
            <Text style={styles.activityDayText}>{day}</Text>
          </View>
          <View style={styles.activityTimeRow}>
            <Ionicons name="time-outline" size={12} color="#8A867E" />
            <Text style={styles.activityTimeText}>{time}</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { marginTop: 8 }]} numberOfLines={1}>
          {activityName}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color="#8A867E" />
          <Text style={styles.locationText} numberOfLines={1}>
            {location}
          </Text>
        </View>

        <View style={[styles.actionRow, { marginTop: 10 }]}>
          <TouchableOpacity
            style={[styles.secondaryPill, { flex: 1, backgroundColor: '#FAF8F3' }]}
            activeOpacity={0.8}
            onPress={() => onViewActivity && onViewActivity(activity)}
          >
            <Text style={styles.secondaryPillText}>View Activity Details</Text>
            <Ionicons name="arrow-forward" size={12} color="#171817" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. HANGOUT CARD
  if (type === 'hangout_share' || type === 'hangout') {
    const hangoutId = data.hangout_id || data.id;
    const title = data.title || 'Destination Meetup';
    const destination = data.destination || 'India';
    const proposedPlace = data.proposed_place || data.place_name || 'Scenic Meetup Spot';
    const schedule = data.proposed_date ? `${data.proposed_date}${data.proposed_time ? ` at ${data.proposed_time}` : ''}` : 'Planning in progress';
    const count = data.participants_count || data.members_count || 2;
    const status = data.status || 'planning';

    return (
      <View style={[styles.cardContainer, SHADOWS.card]}>
        <View style={styles.hangoutTopRow}>
          <View style={styles.hangoutIconBadge}>
            <Ionicons name="wine" size={14} color="#C8B27A" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.hangoutDestSubtitle}>
              {destination}
            </Text>
          </View>
          <View style={[styles.statusBadge, status === 'confirmed' ? styles.statusConfirmed : styles.statusPlanning]}>
            <Text style={[styles.statusBadgeText, status === 'confirmed' ? styles.statusConfirmedText : styles.statusPlanningText]}>
              {status === 'confirmed' ? 'Confirmed' : 'Voting Open'}
            </Text>
          </View>
        </View>

        <View style={styles.hangoutDetailBox}>
          <View style={styles.hangoutInfoRow}>
            <Ionicons name="pin-outline" size={13} color="#8A867E" />
            <Text style={styles.hangoutInfoText} numberOfLines={1}>
              {proposedPlace}
            </Text>
          </View>
          <View style={[styles.hangoutInfoRow, { marginTop: 4 }]}>
            <Ionicons name="calendar-outline" size={13} color="#8A867E" />
            <Text style={styles.hangoutInfoText} numberOfLines={1}>
              {schedule}
            </Text>
          </View>
          <View style={[styles.hangoutInfoRow, { marginTop: 4 }]}>
            <Ionicons name="people-outline" size={13} color="#8A867E" />
            <Text style={styles.hangoutInfoText}>
              {count} {count === 1 ? 'traveler' : 'travelers'} joined
            </Text>
          </View>
        </View>

        <View style={[styles.actionRow, { padding: 12, paddingTop: 6 }]}>
          <TouchableOpacity
            style={[styles.primaryPill, { flex: 1 }]}
            activeOpacity={0.8}
            onPress={() => onOpenHangout && onOpenHangout(hangoutId)}
          >
            <Ionicons name="compass" size={13} color="#FAF8F3" style={{ marginRight: 5 }} />
            <Text style={styles.primaryPillText}>Open Hangout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E0D8',
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
    maxWidth: 290,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
    backgroundColor: '#EBE6DC',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(250, 248, 243, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#171817',
    letterSpacing: 0.2,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(23, 24, 23, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FAF8F3',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#8A867E',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  primaryPill: {
    backgroundColor: '#171817',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPillText: {
    color: '#FAF8F3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  secondaryPill: {
    backgroundColor: '#F0ECE1',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secondaryPillText: {
    color: '#171817',
    fontSize: 11,
    fontWeight: '600',
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityDayPill: {
    backgroundColor: '#F0ECE1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activityDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  activityTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTimeText: {
    fontSize: 11,
    color: '#8A867E',
    fontWeight: '500',
  },
  hangoutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  hangoutIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangoutDestSubtitle: {
    fontSize: 11,
    color: '#8A867E',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPlanning: {
    backgroundColor: '#FDF4DC',
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPlanningText: {
    color: '#B99A5E',
  },
  statusConfirmedText: {
    color: '#2E7D32',
  },
  hangoutDetailBox: {
    backgroundColor: '#F5F2EB',
    marginHorizontal: 12,
    padding: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E5E0D8',
  },
  hangoutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hangoutInfoText: {
    fontSize: 11,
    color: '#4A4B45',
    fontWeight: '500',
  },
});
