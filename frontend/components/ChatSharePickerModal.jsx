// ============================================================================
// MAYBEWE CHAT TRAVEL SHARING MODAL (components/ChatSharePickerModal.jsx)
// Allows travelers to share Places, Trips, Itineraries, Hangouts, and Photos
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllPlaces } from '../lib/places.js';
import { getUserTrips } from '../lib/tripPlanner.js';
import { fetchUserHangouts } from '../lib/hangouts.js';
import { SHADOWS } from '../lib/theme';

export default function ChatSharePickerModal({
  visible,
  onClose,
  onSharePlace,
  onShareTrip,
  onShareHangout,
  onSharePhoto,
  onStartLiveLocation,
  onShareMeetingSpot,
  userId = 'user-demo-priya',
}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('place'); // 'place' | 'trip' | 'hangout' | 'photo' | 'live'
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [trips, setTrips] = useState([]);
  const [hangouts, setHangouts] = useState([]);

  useEffect(() => {
    if (visible) {
      setPlaces(getAllPlaces());
      getUserTrips(userId).then(setTrips).catch(() => {});
      fetchUserHangouts(userId).then(setHangouts).catch(() => {});
    }
  }, [visible, userId]);

  const filteredPlaces = places.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.destination?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  const DEMO_PHOTO_OPTIONS = [
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
    'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800',
    'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800',
    'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=800',
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800',
    'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Share with Travel Circle</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#171817" />
              </TouchableOpacity>
            </View>

            {/* Segmented Category Tabs */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'place' && styles.tabItemActive]}
                onPress={() => setActiveTab('place')}
                activeOpacity={0.8}
              >
                <Ionicons name="location" size={12} color={activeTab === 'place' ? '#FAF8F3' : '#77766F'} />
                <Text style={[styles.tabText, activeTab === 'place' && styles.tabTextActive]}>Places</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'trip' && styles.tabItemActive]}
                onPress={() => setActiveTab('trip')}
                activeOpacity={0.8}
              >
                <Ionicons name="briefcase" size={12} color={activeTab === 'trip' ? '#FAF8F3' : '#77766F'} />
                <Text style={[styles.tabText, activeTab === 'trip' && styles.tabTextActive]}>Trips</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'hangout' && styles.tabItemActive]}
                onPress={() => setActiveTab('hangout')}
                activeOpacity={0.8}
              >
                <Ionicons name="wine" size={12} color={activeTab === 'hangout' ? '#FAF8F3' : '#77766F'} />
                <Text style={[styles.tabText, activeTab === 'hangout' && styles.tabTextActive]}>Meetups</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'photo' && styles.tabItemActive]}
                onPress={() => setActiveTab('photo')}
                activeOpacity={0.8}
              >
                <Ionicons name="image" size={12} color={activeTab === 'photo' ? '#FAF8F3' : '#77766F'} />
                <Text style={[styles.tabText, activeTab === 'photo' && styles.tabTextActive]}>Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'live' && styles.tabItemActive]}
                onPress={() => setActiveTab('live')}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={12} color={activeTab === 'live' ? '#FAF8F3' : '#77766F'} />
                <Text style={[styles.tabText, activeTab === 'live' && styles.tabTextActive]}>Live</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar for Places */}
          {activeTab === 'place' && (
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={16} color="#8A867E" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search spots in Goa, Jaipur, Udaipur..."
                placeholderTextColor="#A19E95"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#8A867E" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Body Content */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. PLACES TAB */}
            {activeTab === 'place' && (
              <View style={styles.listSection}>
                {filteredPlaces.slice(0, 12).map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    style={styles.optionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSharePlace && onSharePlace(place);
                      onClose();
                    }}
                  >
                    <Image source={{ uri: place.image_url }} style={styles.rowThumbnail} />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{place.name}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        📍 {place.destination} • {place.category}
                      </Text>
                    </View>
                    <View style={styles.shareBadge}>
                      <Text style={styles.shareBadgeText}>Share</Text>
                      <Ionicons name="arrow-forward" size={11} color="#C8B27A" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 2. TRIPS TAB */}
            {activeTab === 'trip' && (
              <View style={styles.listSection}>
                {trips.length > 0 ? (
                  trips.map((trip) => (
                    <TouchableOpacity
                      key={trip.id}
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        onShareTrip && onShareTrip(trip);
                        onClose();
                      }}
                    >
                      <Image
                        source={{ uri: trip.cover_image || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800' }}
                        style={styles.rowThumbnail}
                      />
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{trip.title}</Text>
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          📍 {trip.destination} ({trip.start_date || 'Upcoming'} — {trip.end_date || 'Return'})
                        </Text>
                      </View>
                      <View style={styles.shareBadge}>
                        <Text style={styles.shareBadgeText}>Share</Text>
                        <Ionicons name="arrow-forward" size={11} color="#C8B27A" />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No saved trips found. Create a trip to share!</Text>
                  </View>
                )}
              </View>
            )}

            {/* 3. HANGOUTS TAB */}
            {activeTab === 'hangout' && (
              <View style={styles.listSection}>
                {hangouts.length > 0 ? (
                  hangouts.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        onShareHangout && onShareHangout(h);
                        onClose();
                      }}
                    >
                      <View style={[styles.rowThumbnail, styles.hangoutIconBox]}>
                        <Ionicons name="wine" size={20} color="#FAF8F3" />
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{h.title}</Text>
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          📍 {h.destination} • {h.status === 'confirmed' ? 'Confirmed' : 'Planning'}
                        </Text>
                      </View>
                      <View style={styles.shareBadge}>
                        <Text style={styles.shareBadgeText}>Share</Text>
                        <Ionicons name="arrow-forward" size={11} color="#C8B27A" />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No active hangouts found.</Text>
                  </View>
                )}
              </View>
            )}

            {/* 4. PHOTOS TAB */}
            {activeTab === 'photo' && (
              <View style={styles.photoGrid}>
                {DEMO_PHOTO_OPTIONS.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.photoGridItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      onSharePhoto && onSharePhoto(url);
                      onClose();
                    }}
                  >
                    <Image source={{ uri: url }} style={styles.photoGridImg} resizeMode="cover" />
                    <View style={styles.photoOverlayBadge}>
                      <Ionicons name="send" size={12} color="#FAF8F3" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 5. LIVE LOCATION & MEETING SPOT TAB */}
            {activeTab === 'live' && (
              <View style={styles.listSection}>
                {/* Real-time Live Location */}
                <TouchableOpacity
                  style={[styles.optionRow, { borderColor: '#C8B27A', backgroundColor: '#FAF8F3' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onStartLiveLocation && onStartLiveLocation();
                  }}
                >
                  <View style={[styles.rowThumbnail, { backgroundColor: '#171817', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="navigate" size={22} color="#C8B27A" />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>Start Live Location</Text>
                    <Text style={styles.rowSubtitle}>
                      Ephemeral real-time presence (15m, 1h, 4h). Foreground only.
                    </Text>
                  </View>
                  <View style={[styles.shareBadge, { backgroundColor: '#171817' }]}>
                    <Text style={styles.shareBadgeText}>Start</Text>
                    <Ionicons name="arrow-forward" size={11} color="#C8B27A" />
                  </View>
                </TouchableOpacity>

                {/* One-time Meeting Spot */}
                <TouchableOpacity
                  style={styles.optionRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onShareMeetingSpot && onShareMeetingSpot();
                  }}
                >
                  <View style={[styles.rowThumbnail, { backgroundColor: '#EBE6DC', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="pin" size={22} color="#171817" />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>Share Meeting Landmark</Text>
                    <Text style={styles.rowSubtitle}>
                      One-time static public cafe, transit hub, or meetup spot.
                    </Text>
                  </View>
                  <View style={styles.shareBadge}>
                    <Text style={styles.shareBadgeText}>Pin</Text>
                    <Ionicons name="pin" size={11} color="#C8B27A" />
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FAF8F3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3D8',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D7D2C8',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EBE6DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EBE6DC',
    padding: 3,
    borderRadius: 10,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  tabItemActive: {
    backgroundColor: '#171817',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#77766F',
  },
  tabTextActive: {
    color: '#FAF8F3',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0ECE1',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2DCD1',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#171817',
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  listSection: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E3D8',
  },
  rowThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EBE6DC',
  },
  hangoutIconBox: {
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171817',
  },
  rowSubtitle: {
    fontSize: 11,
    color: '#8A867E',
    marginTop: 2,
  },
  shareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#171817',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shareBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FAF8F3',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#8A867E',
    fontSize: 13,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EBE6DC',
  },
  photoGridImg: {
    width: '100%',
    height: '100%',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(23, 24, 23, 0.75)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
