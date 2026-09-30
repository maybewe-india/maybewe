import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import InputField from '../../components/ui/InputField';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { fetchPosts, fetchUserSavedPosts } from '../../lib/posts.js';
import { getFollowCounts } from '../../lib/social.js';
import { getSavedPlaces, getAllPlaces } from '../../lib/places.js';
import { getUserTrips, getSavedTrips } from '../../lib/tripPlanner.js';
import { getUserTrustEvents } from '../../lib/safetyBlocks.js';
import { getUnreadNotificationsCount } from '../../lib/notifications.js';
import CreatePostModal from '../../components/CreatePostModal.jsx';
import PostDetailModal from '../../components/PostDetailModal.jsx';
import PlaceDetailModal from '../../components/PlaceDetailModal.jsx';
import AddToTripModal from '../../components/AddToTripModal.jsx';
import NotificationCenterModal from '../../components/NotificationCenterModal.jsx';
import PrivacySettingsModal from '../../components/PrivacySettingsModal.jsx';

const { width: SCREEN_W } = Dimensions.get('window');

const GOA_IMAGE = require('../../assets/images/dest_goa.jpg');
const LADAKH_IMAGE = require('../../assets/images/dest_ladakh.jpg');
const KERALA_IMAGE = require('../../assets/images/dest_kerala.jpg');
const HAMPI_IMAGE = require('../../assets/images/journal_hampi.jpg');

// Curated travel journal entries — Indian destinations
const JOURNAL_ENTRIES = [
  {
    id: 'journal-1',
    destination: 'Hampi, Karnataka',
    date: 'March 2026',
    image: HAMPI_IMAGE,
    caption: 'Golden boulders and ancient ruins at sunset. The Virupaksha temple bells echoed across the Tungabhadra as the sky turned amber.',
    tag: 'Heritage & Ruins',
  },
  {
    id: 'journal-2',
    destination: 'Ladakh',
    date: 'August 2025',
    image: LADAKH_IMAGE,
    caption: 'Pangong Lake at dawn — impossibly blue, impossibly still. Monastery bells in the distance. The highest silence I have ever heard.',
    tag: 'High Altitude & Stillness',
  },
  {
    id: 'journal-3',
    destination: 'Goa',
    date: 'January 2025',
    image: GOA_IMAGE,
    caption: "Assagao mornings: filter coffee, feni, and the sound of the sea two lanes away. Found the best thali in a grandmother's courtyard.",
    tag: 'Coastal Wandering',
  },
  {
    id: 'journal-4',
    destination: 'Rajasthan',
    date: 'November 2024',
    image: KERALA_IMAGE,
    caption: 'Backwater houseboat in Alleppey at golden hour. The silence of the lagoon, broken only by a cormorant diving into the water.',
    tag: 'Backwaters & Gold',
  },
];

const TRAVEL_STYLES = ['Culture', 'Photography', 'Food', 'Nature', 'Solo Wandering', 'Architecture'];
const LANGUAGES = ['English (Fluent)', 'Telugu (Fluent)', 'Hindi (Conversational)'];
const INTERESTS = ['Travel Photography', 'Local Chai Stops', 'Heritage Architecture', 'Hill Station Trails', 'Sunset Watching'];
const FAVORITE_DESTINATIONS = ['Kashmir', 'Ladakh', 'Kerala', 'Goa'];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, logout, updateProfile } = useAuth();
  const { theme, isDark, colors } = useTheme();

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editAge, setEditAge] = useState(String(profile?.age || 24));
  const [editLocation, setEditLocation] = useState(
    profile?.city
      ? (profile.state ? `${profile.city}, ${profile.state}` : profile.city)
      : 'Chittoor, Andhra Pradesh'
  );
  const [editBio, setEditBio] = useState(
    profile?.bio ||
      'Visual designer & coffee enthusiast wandering through architecture, quiet bookshops, and coastal hiking trails.'
  );
  const [editAvatar, setEditAvatar] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  const [profileTab, setProfileTab] = useState('stories'); // stories | saved | trips | about
  const [savedSubTab, setSavedSubTab] = useState('places'); // places | stories | trips
  const [userPosts, setUserPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedPlacesList, setSavedPlacesList] = useState([]);
  const [savedTripsList, setSavedTripsList] = useState([]);
  const [userTrips, setUserTrips] = useState([]);
  const [socialStats, setSocialStats] = useState({ followersCount: 142, followingCount: 89 });
  const [trustEvents, setTrustEvents] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [addToTripPlace, setAddToTripPlace] = useState(null);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [profile?.id]);

  const loadProfileData = async () => {
    const userId = profile?.id || 'user-demo-priya';
    try {
      const posts = await fetchPosts();
      const myPosts = posts.filter((p) => p.user_id === userId || p.user_id === 'user-demo-priya');
      setUserPosts(myPosts.length > 0 ? myPosts : posts.slice(0, 3));

      const savedP = await fetchUserSavedPosts(userId);
      setSavedPosts(savedP);

      const savedPlaceIds = await getSavedPlaces();
      const allP = getAllPlaces();
      const mySavedPlaces = allP.filter((p) => savedPlaceIds.includes(p.id));
      setSavedPlacesList(mySavedPlaces.length > 0 ? mySavedPlaces : allP.slice(0, 3));

      const trips = await getUserTrips();
      setUserTrips(trips);

      const savedTrips = await getSavedTrips(userId);
      setSavedTripsList(savedTrips.length > 0 ? savedTrips : trips.slice(0, 2));

      const unreadCount = await getUnreadNotificationsCount(userId);
      setUnreadNotifCount(unreadCount);

      const counts = await getFollowCounts(userId);
      setSocialStats({
        followersCount: counts.followersCount > 0 ? counts.followersCount : 142,
        followingCount: counts.followingCount > 0 ? counts.followingCount : 89,
      });

      const events = await getUserTrustEvents(userId);
      setTrustEvents(events);
    } catch (e) {
      console.warn('Error loading profile data:', e);
    }
  };

  // Sync profile state
  useEffect(() => {
    if (profile) {
      if (profile.name) setEditName(profile.name);
      if (profile.age) setEditAge(String(profile.age));
      if (profile.bio) setEditBio(profile.bio);
      if (profile.avatar_url) setEditAvatar(profile.avatar_url);
      if (profile.city) {
        setEditLocation(profile.state ? `${profile.city}, ${profile.state}` : profile.city);
      }
    }
  }, [profile]);

  const openEditModal = () => {
    setEditName(profile?.name || '');
    setEditAge(profile?.age ? String(profile.age) : '24');
    setEditLocation(
      profile?.city
        ? (profile.state ? `${profile.city}, ${profile.state}` : profile.city)
        : 'Chittoor, Andhra Pradesh'
    );
    setEditBio(profile?.bio || '');
    setEditAvatar(profile?.avatar_url || '');
    setEditModalVisible(true);
  };

  const handlePickAvatarFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is needed to select a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setEditAvatar(pickedUri);
        // Also save directly if edit modal is not open
        if (!editModalVisible) {
          const res = await updateProfile({ avatar_url: pickedUri });
          if (res?.success) {
            Alert.alert('Photo Updated', 'Your profile photo has been updated.');
          }
        }
      }
    } catch (err) {
      console.warn('Gallery pick error:', err);
      Alert.alert('Error', 'Unable to pick photo from gallery.');
    }
  };

  const handleTakeAvatarWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take a profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setEditAvatar(pickedUri);
        if (!editModalVisible) {
          const res = await updateProfile({ avatar_url: pickedUri });
          if (res?.success) {
            Alert.alert('Photo Updated', 'Your profile photo has been updated.');
          }
        }
      }
    } catch (err) {
      console.warn('Camera take error:', err);
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const handleLogout = () => {
    const performLogout = async () => {
      await logout();
      router.replace('/(auth)/welcome');
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out of MaybeWe?') : true;
      if (confirmed) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out of MaybeWe?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let city = 'Chittoor';
      let state = 'Andhra Pradesh';
      if (editLocation && editLocation.trim()) {
        const parts = editLocation.split(',').map((s) => s.trim());
        city = parts[0] || 'Chittoor';
        state = parts[1] || 'Andhra Pradesh';
      }

      const res = await updateProfile({
        name: editName.trim() || profile?.name || 'Traveler',
        bio: editBio,
        avatar_url: editAvatar || profile?.avatar_url,
        age: parseInt(editAge, 10) || profile?.age || 24,
        city,
        state,
      });

      if (res && res.error) {
        Alert.alert('Save Failed', res.error);
      } else {
        setEditModalVisible(false);
        Alert.alert('Profile Saved', 'Your traveler profile has been updated.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = profile?.avatar_url || editAvatar || null;
  const displayName = profile?.name || 'Traveler';
  const displayAge = profile?.age || 24;
  const displayLocation = profile?.city
    ? `${profile.city}, ${profile.state || 'Andhra Pradesh'}`
    : 'Chittoor, Andhra Pradesh';
  const trustScore = profile?.trust_score || 4.95;
  const verificationStatus = profile?.verification_status || (profile?.is_verified ? 'verified' : 'pending');
  const verificationLabel =
    verificationStatus === 'verified'
      ? 'Verified'
      : verificationStatus === 'pending'
      ? 'Pending Review'
      : 'Action Required';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: Math.max(insets.bottom, 24) + 160 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Quick Actions Bar (Clean, no background image) */}
          <View style={[styles.topActionsBar, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
            <View style={[styles.topBadgePill, { backgroundColor: '#F5EEE5', borderColor: '#EDE5DA' }]}>
              <Ionicons name="sparkles" size={12} color="#C8B27A" style={{ marginRight: 5 }} />
              <Text style={[styles.topBadgeText, { color: '#756345' }]}>VERIFIED EXPLORER</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Notification Bell */}
              <TouchableOpacity
                onPress={() => setNotifModalVisible(true)}
                style={[styles.topEditIconBtn, { backgroundColor: '#F5EEE5', borderColor: '#EDE5DA', position: 'relative' }]}
                activeOpacity={0.8}
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={18} color="#171817" />
                {unreadNotifCount > 0 && (
                  <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: '#8C4351', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 9, color: '#FAF8F3' }}>{unreadNotifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Privacy & Safety Settings */}
              <TouchableOpacity
                onPress={() => setPrivacyModalVisible(true)}
                style={[styles.topEditIconBtn, { backgroundColor: '#F5EEE5', borderColor: '#EDE5DA' }]}
                activeOpacity={0.8}
                accessibilityLabel="Privacy & Safety Settings"
              >
                <Ionicons name="shield-outline" size={18} color="#171817" />
              </TouchableOpacity>

              {/* Edit Profile */}
              <TouchableOpacity
                onPress={openEditModal}
                style={[styles.topEditIconBtn, { backgroundColor: '#F5EEE5', borderColor: '#EDE5DA' }]}
                activeOpacity={0.8}
                accessibilityLabel="Edit Profile"
              >
                <Ionicons name="create-outline" size={18} color="#171817" />
              </TouchableOpacity>
            </View>
          </View>

        {/* Top Profile Area: Large Avatar, Verification Badge, Name, Age, Location, Trust Score */}
        <View style={styles.profileHeader}>
          {/* Avatar with tap-to-change photo and camera edit badge */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatarFromLibrary}
            activeOpacity={0.85}
            accessibilityLabel="Change profile photo"
          >
            <View style={[styles.avatarRing, { borderColor: '#EDE5DA', backgroundColor: '#F5EEE5' }]}>
              {currentAvatar ? (
                <Image source={{ uri: currentAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EEE5' }}>
                  <Ionicons name="person" size={48} color="#B99A5E" />
                </View>
              )}
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: '#171817', borderColor: '#FAF8F3' }]}>
              <Ionicons name="camera" size={13} color="#FAF8F3" />
            </View>
            {verificationStatus === 'verified' && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#2E7D32', borderColor: '#FAF8F3' }]}>
                <Ionicons name="shield-checkmark" size={13} color="#FAF8F3" />
              </View>
            )}
          </TouchableOpacity>

          {/* Name & Age */}
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {displayName}, <Text style={[styles.userAge, { color: colors.textSecondary }]}>{displayAge}</Text>
          </Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#C8B27A" style={{ marginRight: 4 }} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>{displayLocation}</Text>
          </View>

          {/* Trust Score Badge */}
          <View style={[styles.trustScorePill, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }, SHADOWS.card]}>
            <Ionicons name="star" size={14} color="#C8B27A" style={{ marginRight: 6 }} />
            <Text style={[styles.trustScoreNumber, { color: colors.textPrimary }]}>{Number(trustScore).toFixed(2)}</Text>
            <Text style={[styles.trustScoreLabel, { color: colors.textSecondary }]}>Trust Score</Text>
            <View style={[styles.trustDot, { backgroundColor: 'rgba(216, 212, 203, 0.75)' }]} />
            <Text style={[styles.trustReviewCount, { color: '#756345' }]}>Verified Companion</Text>
          </View>

          {/* Social Stats Strip */}
          <View style={[styles.editorialStatsRow, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }, SHADOWS.card]}>
            <TouchableOpacity style={styles.editorialStatCol} activeOpacity={0.8} onPress={() => setProfileTab('stories')}>
              <Text style={[styles.editorialStatVal, { color: colors.textPrimary }]}>{userPosts.length}</Text>
              <Text style={[styles.editorialStatLbl, { color: '#756345' }]}>Stories</Text>
            </TouchableOpacity>
            <View style={[styles.editorialStatDiv, { backgroundColor: 'rgba(216, 212, 203, 0.6)' }]} />
            <View style={styles.editorialStatCol}>
              <Text style={[styles.editorialStatVal, { color: colors.textPrimary }]}>{socialStats.followersCount}</Text>
              <Text style={[styles.editorialStatLbl, { color: '#756345' }]}>Followers</Text>
            </View>
            <View style={[styles.editorialStatDiv, { backgroundColor: 'rgba(216, 212, 203, 0.6)' }]} />
            <View style={styles.editorialStatCol}>
              <Text style={[styles.editorialStatVal, { color: colors.textPrimary }]}>{socialStats.followingCount}</Text>
              <Text style={[styles.editorialStatLbl, { color: '#756345' }]}>Following</Text>
            </View>
            <View style={[styles.editorialStatDiv, { backgroundColor: 'rgba(216, 212, 203, 0.6)' }]} />
            <TouchableOpacity style={styles.editorialStatCol} activeOpacity={0.8} onPress={() => setProfileTab('trips')}>
              <Text style={[styles.editorialStatVal, { color: colors.textPrimary }]}>{userTrips.length || 2}</Text>
              <Text style={[styles.editorialStatLbl, { color: '#756345' }]}>Trips</Text>
            </TouchableOpacity>
          </View>

          {/* Action Row: Share Story, Edit Profile, Verification, Settings, Logout */}
          <View style={styles.profileActionRow}>
            <TouchableOpacity
              onPress={() => setCreatePostVisible(true)}
              style={styles.primaryActionBtn}
              activeOpacity={0.85}
            >
              <View style={[styles.primaryActionGradient, { backgroundColor: '#1D1D1B', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                <Ionicons name="add" size={16} color="#C8B27A" style={{ marginRight: 6 }} />
                <Text style={[styles.primaryActionText, { color: '#FAF8F3' }]}>Share Story</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openEditModal}
              style={[styles.secondaryActionBtn, { backgroundColor: '#F5EEE5', borderColor: '#EDE5DA' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color="#1D1D1B" style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryActionText, { color: '#1D1D1B' }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/verification')}
              style={[styles.secondaryActionBtn, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.85)' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={15} color="#1D1D1B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.settingsIconBtn, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.85)' }]}
              activeOpacity={0.8}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={17} color="#1D1D1B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.logoutIconBtn, { backgroundColor: 'rgba(158, 58, 58, 0.08)', borderColor: 'rgba(158, 58, 58, 0.25)' }]}
              activeOpacity={0.8}
              accessibilityLabel="Log Out"
            >
              <Ionicons name="log-out-outline" size={18} color="#9E3A3A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented Editorial Tabs */}
        <View style={styles.editorialTabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editorialTabsScroll}>
            {[
              { id: 'stories', label: 'Stories', count: userPosts.length },
              { id: 'saved', label: 'Saved', count: savedPlacesList.length + savedPosts.length },
              { id: 'trips', label: 'Trips', count: userTrips.length || 2 },
              { id: 'about', label: 'About', count: null },
            ].map((tab) => {
              const active = profileTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.editorialTabPill,
                    active && styles.editorialTabPillActive,
                  ]}
                  onPress={() => setProfileTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.editorialTabTxt, active && styles.editorialTabTxtActive]}>
                    {tab.label}
                  </Text>
                  {tab.count !== null && (
                    <View style={[styles.editorialTabBadge, active && styles.editorialTabBadgeActive]}>
                      <Text style={[styles.editorialTabBadgeTxt, active && styles.editorialTabBadgeTxtActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab 1: STORIES (3-Column Grid) */}
        {profileTab === 'stories' && (
          <View style={styles.gridContainer}>
            {userPosts.length === 0 ? (
              <View style={styles.emptyGridState}>
                <Ionicons name="camera-outline" size={40} color="#C8B27A" />
                <Text style={styles.emptyGridTitle}>No Travel Stories Yet</Text>
                <Text style={styles.emptyGridSub}>Capture candid moments and inspire fellow solo travelers.</Text>
                <TouchableOpacity
                  style={styles.emptyGridBtn}
                  onPress={() => setCreatePostVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyGridBtnTxt}>Share Your First Story</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.threeColGrid}>
                {userPosts.map((post) => {
                  const media = post.media && post.media.length > 0 ? post.media[0] : null;
                  let imgUri = media?.media_url;
                  if (!imgUri || imgUri.includes('1600100397608')) {
                    imgUri = 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1000&auto=format&fit=crop&q=80';
                  } else if (imgUri.includes('1603262110263')) {
                    imgUri = 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1000&auto=format&fit=crop&q=80';
                  }
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.gridItem}
                      activeOpacity={0.85}
                      onPress={() => setSelectedPost(post)}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.gridImg}
                        resizeMode="cover"
                        defaultSource={HAMPI_IMAGE}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(15, 23, 42, 0.65)']}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.gridOverlay}>
                        {post.destination ? (
                          <Text style={styles.gridDestTxt} numberOfLines={1}>
                            {post.destination}
                          </Text>
                        ) : null}
                        <View style={styles.gridLikeRow}>
                          <Ionicons name="heart" size={11} color="#C8B27A" style={{ marginRight: 3 }} />
                          <Text style={styles.gridLikeTxt}>{post.like_count || post.likes_count || 0}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Tab 2: SAVED (Places, Stories & Trips) */}
        {profileTab === 'saved' && (
          <View style={styles.savedTabContainer}>
            <View style={styles.savedSubTabsWrap}>
              <TouchableOpacity
                style={[styles.savedSubTabBtn, savedSubTab === 'places' && styles.savedSubTabBtnActive]}
                onPress={() => setSavedSubTab('places')}
              >
                <Ionicons
                  name="bookmark"
                  size={13}
                  color={savedSubTab === 'places' ? '#C8B27A' : '#756345'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.savedSubTabTxt, savedSubTab === 'places' && styles.savedSubTabTxtActive]}>
                  Places ({savedPlacesList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedSubTabBtn, savedSubTab === 'stories' && styles.savedSubTabBtnActive]}
                onPress={() => setSavedSubTab('stories')}
              >
                <Ionicons
                  name="images"
                  size={13}
                  color={savedSubTab === 'stories' ? '#C8B27A' : '#756345'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.savedSubTabTxt, savedSubTab === 'stories' && styles.savedSubTabTxtActive]}>
                  Stories ({savedPosts.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedSubTabBtn, savedSubTab === 'trips' && styles.savedSubTabBtnActive]}
                onPress={() => setSavedSubTab('trips')}
              >
                <Ionicons
                  name="briefcase"
                  size={13}
                  color={savedSubTab === 'trips' ? '#C8B27A' : '#756345'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.savedSubTabTxt, savedSubTab === 'trips' && styles.savedSubTabTxtActive]}>
                  Trips ({savedTripsList.length})
                </Text>
              </TouchableOpacity>
            </View>

            {savedSubTab === 'places' ? (
              <View style={styles.savedPlacesList}>
                {savedPlacesList.map((place) => (
                  <View key={place.id} style={styles.savedPlaceCard}>
                    <Image source={{ uri: place.image_url }} style={styles.savedPlaceImg} resizeMode="cover" />
                    <View style={styles.savedPlaceContent}>
                      <View style={styles.savedPlaceRow}>
                        <Text style={styles.savedPlaceTitle} numberOfLines={1}>{place.title}</Text>
                        <View style={styles.savedPlaceRating}>
                          <Ionicons name="star" size={11} color="#C8B27A" style={{ marginRight: 3 }} />
                          <Text style={styles.savedPlaceRatingTxt}>{place.rating}</Text>
                        </View>
                      </View>
                      <Text style={styles.savedPlaceSub} numberOfLines={1}>
                        {place.destination} • {place.category} • {place.budget_category?.toUpperCase()}
                      </Text>
                      <View style={styles.savedPlaceActions}>
                        <TouchableOpacity
                          style={styles.savedPlaceActionBtn}
                          onPress={() => setSelectedPlace(place)}
                        >
                          <Text style={styles.savedPlaceActionTxt}>View Place</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.savedPlaceActionBtn, styles.savedPlaceActionGold]}
                          onPress={() => setAddToTripPlace(place)}
                        >
                          <Ionicons name="calendar-outline" size={12} color="#FAF8F3" style={{ marginRight: 4 }} />
                          <Text style={[styles.savedPlaceActionTxt, { color: '#FAF8F3' }]}>Add to Trip</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : savedSubTab === 'stories' ? (
              <View style={styles.gridContainer}>
                {savedPosts.length === 0 ? (
                  <View style={styles.emptyGridState}>
                    <Ionicons name="bookmark-outline" size={40} color="#C8B27A" />
                    <Text style={styles.emptyGridTitle}>No Saved Stories</Text>
                    <Text style={styles.emptyGridSub}>Save inspirational travel moments to revisit later.</Text>
                  </View>
                ) : (
                  <View style={styles.threeColGrid}>
                    {savedPosts.map((post) => {
                      const media = post.media && post.media.length > 0 ? post.media[0] : null;
                      let imgUri = media?.media_url;
                      if (!imgUri || imgUri.includes('1600100397608')) {
                        imgUri = 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1000&auto=format&fit=crop&q=80';
                      } else if (imgUri.includes('1603262110263')) {
                        imgUri = 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1000&auto=format&fit=crop&q=80';
                      }
                      return (
                        <TouchableOpacity
                          key={post.id}
                          style={styles.gridItem}
                          activeOpacity={0.85}
                          onPress={() => setSelectedPost(post)}
                        >
                          <Image
                            source={{ uri: imgUri }}
                            style={styles.gridImg}
                            resizeMode="cover"
                            defaultSource={HAMPI_IMAGE}
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(15, 23, 42, 0.65)']}
                            style={StyleSheet.absoluteFill}
                          />
                          <View style={styles.gridOverlay}>
                            <Text style={styles.gridDestTxt} numberOfLines={1}>{post.destination}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.savedPlacesList}>
                {savedTripsList.length === 0 ? (
                  <View style={styles.emptyGridState}>
                    <Ionicons name="briefcase-outline" size={40} color="#C8B27A" />
                    <Text style={styles.emptyGridTitle}>No Saved Journeys</Text>
                    <Text style={styles.emptyGridSub}>Save collaborative itineraries to revisit later.</Text>
                  </View>
                ) : (
                  savedTripsList.map((trip) => (
                    <View key={trip.id} style={[styles.savedPlaceCard, { padding: 14 }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.savedPlaceTitle, { fontSize: 15 }]} numberOfLines={1}>
                            {trip.title || trip.destination}
                          </Text>
                          <View style={styles.savedPlaceRating}>
                            <Ionicons name="airplane" size={11} color="#C8B27A" style={{ marginRight: 3 }} />
                            <Text style={styles.savedPlaceRatingTxt}>{trip.budget_category?.toUpperCase() || 'BALANCED'}</Text>
                          </View>
                        </View>
                        <Text style={styles.savedPlaceSub} numberOfLines={1}>
                          📍 {trip.destination} • 📅 {trip.date_from || trip.start_date || 'Upcoming'}
                        </Text>
                        <View style={[styles.savedPlaceActions, { marginTop: 10 }]}>
                          <TouchableOpacity
                            style={[styles.savedPlaceActionBtn, styles.savedPlaceActionGold]}
                            onPress={() => router.push('/(tabs)/trips')}
                          >
                            <Ionicons name="map-outline" size={12} color="#FAF8F3" style={{ marginRight: 4 }} />
                            <Text style={[styles.savedPlaceActionTxt, { color: '#FAF8F3' }]}>Open in Planner</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* Tab 3: TRIPS */}
        {profileTab === 'trips' && (
          <View style={styles.tripsTabContainer}>
            <View style={styles.tripsHeaderRow}>
              <Text style={styles.tripsHeaderTitle}>Your Travel Itineraries</Text>
              <TouchableOpacity
                style={styles.tripsPlannerBtn}
                onPress={() => router.push('/(tabs)/trips')}
              >
                <Text style={styles.tripsPlannerBtnTxt}>Open Trip Planner →</Text>
              </TouchableOpacity>
            </View>

            {(userTrips.length > 0 ? userTrips : [
              {
                id: 'trip-demo-1',
                title: 'Goa Coastal Exploration',
                destination: 'Goa',
                start_date: '2026-10-10',
                end_date: '2026-10-15',
                budget_category: 'balanced',
                companion_mode: 'active',
                days: [{}, {}, {}],
              },
              {
                id: 'trip-demo-2',
                title: 'Hampi Heritage Wandering',
                destination: 'Hampi',
                start_date: '2026-11-04',
                end_date: '2026-11-08',
                budget_category: 'luxury',
                companion_mode: 'quiet',
                days: [{}, {}, {}, {}],
              }
            ]).map((trip) => (
              <View key={trip.id} style={styles.profileTripCard}>
                <View style={styles.profileTripTop}>
                  <View>
                    <Text style={styles.profileTripTitle}>{trip.title}</Text>
                    <Text style={styles.profileTripDest}>
                      {trip.destination} • {trip.start_date || 'Upcoming'}
                    </Text>
                  </View>
                  <View style={styles.profileTripBadge}>
                    <Text style={styles.profileTripBadgeTxt}>{trip.budget_category?.toUpperCase() || 'BALANCED'}</Text>
                  </View>
                </View>
                <View style={styles.profileTripBottom}>
                  <Text style={styles.profileTripDays}>
                    {trip.days?.length || 3} Days Planned • {trip.companion_mode || 'Solo Friendly'}
                  </Text>
                  <TouchableOpacity
                    style={styles.profileTripNavBtn}
                    onPress={() => router.push('/(tabs)/trips')}
                  >
                    <Text style={styles.profileTripNavBtnTxt}>View Itinerary</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab 4: ABOUT ME */}
        {profileTab === 'about' && (
          <>
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>ABOUT ME</Text>
                <Ionicons name="person-outline" size={15} color={colors.textPrimary} />
              </View>

              <View style={[styles.bioCard, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }, SHADOWS.card]}>
                <Text style={[styles.bioText, { color: colors.textPrimary }]}>
                  {profile?.bio ||
                    'Visual designer & coffee enthusiast wandering through architecture, quiet bookshops, and coastal hiking trails.'}
                </Text>
              </View>

              <View style={styles.subCategoryBlock}>
                <Text style={[styles.subCategoryLabel, { color: '#756345' }]}>TRAVEL STYLES</Text>
                <View style={styles.chipCloud}>
                  {TRAVEL_STYLES.map((style) => (
                    <View key={style} style={[styles.styleChip, { backgroundColor: 'rgba(250, 248, 243, 0.85)', borderColor: 'rgba(216, 212, 203, 0.75)' }]}>
                      <Ionicons name="sparkles" size={11} color="#C8B27A" style={{ marginRight: 5 }} />
                      <Text style={[styles.styleChipText, { color: colors.textPrimary }]}>{style}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.subCategoryBlock}>
                <Text style={[styles.subCategoryLabel, { color: '#756345' }]}>LANGUAGES SPOKEN</Text>
                <View style={styles.chipCloud}>
                  {LANGUAGES.map((lang) => (
                    <View key={lang} style={[styles.languageChip, { backgroundColor: 'rgba(250, 248, 243, 0.85)', borderColor: 'rgba(216, 212, 203, 0.75)' }]}>
                      <Ionicons name="globe-outline" size={12} color="#C8B27A" style={{ marginRight: 6 }} />
                      <Text style={[styles.languageChipText, { color: colors.textPrimary }]}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.subCategoryBlock}>
                <Text style={[styles.subCategoryLabel, { color: '#756345' }]}>INTERESTS & RHYTHMS</Text>
                <View style={styles.chipCloud}>
                  {INTERESTS.map((interest) => (
                    <View key={interest} style={[styles.interestChip, { backgroundColor: 'rgba(250, 248, 243, 0.85)', borderColor: 'rgba(216, 212, 203, 0.75)' }]}>
                      <Text style={[styles.interestChipText, { color: colors.textPrimary }]}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.subCategoryBlock}>
                <Text style={[styles.subCategoryLabel, { color: '#756345' }]}>FAVORITE DESTINATIONS</Text>
                <View style={styles.chipCloud}>
                  {FAVORITE_DESTINATIONS.map((dest) => (
                    <View key={dest} style={[styles.destinationChip, { backgroundColor: 'rgba(250, 248, 243, 0.85)', borderColor: 'rgba(216, 212, 203, 0.75)' }]}>
                      <Ionicons name="pin" size={11} color="#C8B27A" style={{ marginRight: 5 }} />
                      <Text style={[styles.destinationChipText, { color: colors.textPrimary }]}>{dest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Travel Journal Highlights */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionEyebrow, { color: '#756345' }]}>MEMORABLE JOURNALS</Text>
                <Ionicons name="images-outline" size={15} color="#C8B27A" />
              </View>
              <View style={styles.journalList}>
                {JOURNAL_ENTRIES.map((entry) => (
                  <View key={entry.id} style={[styles.journalCard, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }, SHADOWS.card]}>
                    <View style={styles.journalImageWrap}>
                      <Image source={entry.image} style={styles.journalImage} resizeMode="cover" />
                      <View style={styles.journalImageBadge}>
                        <Text style={styles.journalDateBadge}>{entry.date}</Text>
                      </View>
                    </View>
                    <View style={[styles.journalContent, { backgroundColor: 'rgba(250, 248, 243, 0.95)' }]}>
                      <View style={styles.journalHeaderRow}>
                        <Text style={[styles.journalDestination, { color: colors.textPrimary }]}>{entry.destination}</Text>
                        <View style={[styles.journalTagPill, { backgroundColor: 'rgba(200, 178, 122, 0.15)', borderColor: 'rgba(200, 178, 122, 0.40)' }]}>
                          <Text style={[styles.journalTagText, { color: colors.primary }]}>{entry.tag}</Text>
                        </View>
                      </View>
                      <Text style={[styles.journalCaption, { color: colors.textSecondary }]}>{entry.caption}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Verification & Community Trust */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>VERIFICATION & TRUST</Text>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
              </View>
              <View style={[styles.trustMeterCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={styles.meterHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={verificationStatus === 'verified' ? 'checkmark-circle' : 'time-outline'}
                      size={15}
                      color={verificationStatus === 'verified' ? '#2E7D32' : '#C8B27A'}
                    />
                    <Text style={[styles.meterTitle, { color: colors.textPrimary }]}>{verificationLabel}</Text>
                  </View>
                  <Text style={[styles.meterPercent, { color: colors.primary }]}>{Number(trustScore).toFixed(2)} Trust Score</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]}>
                  <LinearGradient
                    colors={GRADIENTS.lavenderViolet}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: verificationStatus === 'verified' ? '100%' : '65%' }]}
                  />
                </View>
                <Text style={[styles.meterHint, { color: colors.textSecondary }]}>
                  {verificationStatus === 'verified' ? 'Community Verified • ' : 'Pending Review • '}
                  {trustEvents.length > 0 ? `${trustEvents.length} authenticated milestones • ` : ''}
                  Trusted traveler foundation
                </Text>
              </View>
            </View>
          </>
        )}


      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.editModalBody} showsVerticalScrollIndicator={false}>
            {/* Profile Photo Uploader */}
            <Text style={[styles.formLabel, { color: colors.primary }]}>YOUR PROFILE PHOTO</Text>
            <View style={styles.photoUploadContainer}>
              <View style={styles.photoPreviewWrap}>
                {editAvatar ? (
                  <Image source={{ uri: editAvatar }} style={styles.photoPreviewImg} />
                ) : (
                  <View style={styles.photoPreviewEmpty}>
                    <Ionicons name="person" size={32} color="#B99A5E" />
                  </View>
                )}
              </View>

              <View style={styles.photoActionButtons}>
                <TouchableOpacity
                  style={styles.photoUploadBtn}
                  onPress={handlePickAvatarFromLibrary}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={15} color="#FAF8F3" style={{ marginRight: 6 }} />
                  <Text style={styles.photoUploadBtnText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoCameraBtn}
                  onPress={handleTakeAvatarWithCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={15} color="#171817" style={{ marginRight: 6 }} />
                  <Text style={styles.photoCameraBtnText}>Take Selfie / Photo</Text>
                </TouchableOpacity>

                {editAvatar ? (
                  <TouchableOpacity
                    onPress={() => setEditAvatar('')}
                    style={styles.photoRemoveBtn}
                  >
                    <Text style={styles.photoRemoveBtnText}>Remove Photo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>NAME</Text>
              <InputField
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                icon="person-outline"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>AGE</Text>
              <InputField
                value={editAge}
                onChangeText={setEditAge}
                placeholder="24"
                keyboardType="numeric"
                icon="calendar-outline"
              />
            </View>

            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.formLabel, { color: colors.primary }]}>LOCATION</Text>
                <TouchableOpacity
                  onPress={() => setEditLocation('Chittoor, Andhra Pradesh')}
                  style={{ marginBottom: 6 }}
                >
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: '#B99A5E' }}>Set Chittoor, AP</Text>
                </TouchableOpacity>
              </View>
              <InputField
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="e.g. Chittoor, Andhra Pradesh"
                icon="location-outline"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>ABOUT YOU (BIO)</Text>
              <InputField
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Share your travel philosophy..."
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveProfile}
              style={[styles.saveProfileBtn, saving && { opacity: 0.6 }]}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveProfileText}>{saving ? 'Saving...' : 'Save Profile Changes'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={createPostVisible}
        onClose={() => setCreatePostVisible(false)}
        currentUser={profile}
        onPostCreated={(newPost) => {
          setUserPosts((prev) => [newPost, ...prev]);
        }}
        onCreated={(newPost) => {
          setUserPosts((prev) => [newPost, ...prev]);
        }}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        visible={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onSelectPlace={(place) => {
          setSelectedPlace(place);
        }}
        onAddToTrip={(place) => {
          setAddToTripPlace(place);
        }}
        onFollowChange={(_authorId, isFollowing) => {
          setSocialStats((prev) => ({
            ...prev,
            followingCount: isFollowing ? prev.followingCount + 1 : Math.max(0, prev.followingCount - 1),
          }));
        }}
      />

      {/* Place Detail Modal */}
      <PlaceDetailModal
        place={selectedPlace}
        visible={!!selectedPlace}
        onClose={() => setSelectedPlace(null)}
        onAddToTrip={(place) => {
          setAddToTripPlace(place);
        }}
      />

      {/* Add To Trip Modal */}
      <AddToTripModal
        place={addToTripPlace}
        visible={!!addToTripPlace}
        onClose={() => setAddToTripPlace(null)}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        visible={notifModalVisible}
        onClose={() => {
          setNotifModalVisible(false);
          loadProfileData();
        }}
        userId={profile?.id || 'user-demo-priya'}
        onOpenPlace={(placeId) => {
          const allP = getAllPlaces();
          const target = allP.find((p) => p.id === placeId);
          if (target) setSelectedPlace(target);
        }}
        onOpenPost={(postId) => {
          const target = userPosts.find((p) => p.id === postId) || savedPosts.find((p) => p.id === postId);
          if (target) setSelectedPost(target);
        }}
      />

      {/* Privacy & Safety Settings Modal */}
      <PrivacySettingsModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        userId={profile?.id || 'user-demo-priya'}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollBody: {
    paddingBottom: 40,
  },

  topActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    zIndex: 10,
  },
  topBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EEE5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#EDE5DA',
  },
  topBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: 1.2,
  },
  topEditIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5EEE5',
    borderWidth: 1,
    borderColor: '#EDE5DA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Profile Identity Header */
  profileHeader: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#EDE5DA',
    overflow: 'hidden',
    backgroundColor: '#F5EEE5',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#171817',
    borderWidth: 2,
    borderColor: '#FAF8F3',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    borderWidth: 2,
    borderColor: '#FAF8F3',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  userName: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  userAge: {
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  locationText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },

  /* Trust Score Pill */
  trustScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.full,
    marginBottom: 18,
    ...SHADOWS.soft,
  },
  trustScoreNumber: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.sunset,
    marginRight: 4,
  },
  trustScoreLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  trustReviewCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
  },

  /* Profile Action Row */
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 360,
  },
  primaryActionBtn: {
    flex: 1,
    borderRadius: RADII.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADII.full,
  },
  primaryActionText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADII.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryActionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  settingsIconBtn: {
    padding: 12,
    borderRadius: RADII.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  logoutIconBtn: {
    padding: 12,
    borderRadius: RADII.full,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  /* Sections */
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionEyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },

  /* About Me Blocks */
  bioCard: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bioText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
  },
  subCategoryBlock: {
    marginTop: 12,
  },
  subCategoryLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  styleChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  languageChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
  },
  interestChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  interestChipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#334155',
  },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  destinationChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* Travel Journal Entries */
  journalList: {
    gap: 16,
  },
  journalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  journalImageWrap: {
    width: '100%',
    height: 160,
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 12,
  },
  journalImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  journalImageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  journalDateBadge: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sunset,
  },
  journalContent: {
    padding: 14,
  },
  journalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  journalDestination: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  journalTagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.full,
  },
  journalTagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#0F172A',
  },
  journalCaption: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },

  /* Verification & Trust Meter */
  trustMeterCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  meterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  meterTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  meterPercent: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.lavender,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterHint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#64748B',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  /* Edit Modal */
  modalRoot: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D7D2C8',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#171817',
  },
  editModalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  formLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#77766F',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  photoUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F5EEE5',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE5DA',
  },
  photoPreviewWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#EDE5DA',
    marginRight: 16,
    backgroundColor: '#FFFDFC',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
  },
  photoPreviewEmpty: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EEE5',
  },
  photoActionButtons: {
    flex: 1,
    gap: 8,
  },
  photoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171817',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  photoUploadBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#FAF8F3',
  },
  photoCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#EDE5DA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  photoCameraBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#171817',
  },
  photoRemoveBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  photoRemoveBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#9E3A3A',
  },
  formGroup: {
    marginBottom: 16,
  },
  saveProfileBtn: {
    marginTop: 12,
    borderRadius: RADII.full,
    backgroundColor: '#171817',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  saveProfileText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FBFAF7',
    letterSpacing: 0.1,
  },

  /* Phase B Editorial Profile Styles */
  editorialStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    marginBottom: 16,
  },
  editorialStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  editorialStatVal: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
  },
  editorialStatLbl: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginTop: 2,
  },
  editorialStatDiv: {
    width: 1,
    height: 24,
  },
  editorialTabsWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  editorialTabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  editorialTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(250, 248, 243, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.75)',
  },
  editorialTabPillActive: {
    backgroundColor: '#1D1D1B',
    borderColor: '#1D1D1B',
  },
  editorialTabTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#756345',
  },
  editorialTabTxtActive: {
    color: '#FAF8F3',
    fontWeight: '700',
  },
  editorialTabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(216, 212, 203, 0.5)',
  },
  editorialTabBadgeActive: {
    backgroundColor: '#C8B27A',
  },
  editorialTabBadgeTxt: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#756345',
  },
  editorialTabBadgeTxtActive: {
    color: '#1D1D1B',
  },
  gridContainer: {
    marginHorizontal: 16,
    marginBottom: 28,
  },
  emptyGridState: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: 'rgba(250, 248, 243, 0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.75)',
  },
  emptyGridTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#171817',
    marginTop: 12,
  },
  emptyGridSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#756345',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  emptyGridBtn: {
    backgroundColor: '#1D1D1B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADII.full,
  },
  emptyGridBtnTxt: {
    color: '#FAF8F3',
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  threeColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridItem: {
    width: '31.8%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5EEE5',
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridDestTxt: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    flex: 1,
    marginRight: 4,
  },
  gridLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLikeTxt: {
    color: '#FAF8F3',
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  savedTabContainer: {
    marginHorizontal: 16,
    marginBottom: 28,
  },
  savedSubTabsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  savedSubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(250, 248, 243, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.75)',
  },
  savedSubTabBtnActive: {
    backgroundColor: '#FAF8F3',
    borderColor: '#C8B27A',
  },
  savedSubTabTxt: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#756345',
  },
  savedSubTabTxtActive: {
    color: '#171817',
    fontWeight: '700',
  },
  savedPlacesList: {
    gap: 12,
  },
  savedPlaceCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(250, 248, 243, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.75)',
    overflow: 'hidden',
    padding: 10,
    gap: 12,
  },
  savedPlaceImg: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  savedPlaceContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  savedPlaceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedPlaceTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#171817',
    flex: 1,
    marginRight: 6,
  },
  savedPlaceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 178, 122, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
  savedPlaceRatingTxt: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#756345',
  },
  savedPlaceSub: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#756345',
    marginTop: 2,
  },
  savedPlaceActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  savedPlaceActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.full,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.85)',
  },
  savedPlaceActionGold: {
    backgroundColor: '#1D1D1B',
    borderColor: '#1D1D1B',
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedPlaceActionTxt: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: '#171817',
  },
  tripsTabContainer: {
    marginHorizontal: 16,
    marginBottom: 28,
    gap: 12,
  },
  tripsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tripsHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#171817',
  },
  tripsPlannerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tripsPlannerBtnTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#C8B27A',
  },
  profileTripCard: {
    backgroundColor: 'rgba(250, 248, 243, 0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216, 212, 203, 0.75)',
    padding: 14,
  },
  profileTripTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  profileTripTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#171817',
  },
  profileTripDest: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#756345',
    marginTop: 2,
  },
  profileTripBadge: {
    backgroundColor: 'rgba(200, 178, 122, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.full,
  },
  profileTripBadgeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#756345',
    letterSpacing: 0.5,
  },
  profileTripBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(216, 212, 203, 0.5)',
    paddingTop: 10,
  },
  profileTripDays: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#756345',
  },
  profileTripNavBtn: {
    backgroundColor: '#1D1D1B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  profileTripNavBtnTxt: {
    color: '#FAF8F3',
    fontFamily: FONTS.semiBold,
    fontSize: 11,
  },
});
