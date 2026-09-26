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
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import InputField from '../../components/ui/InputField';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';

const { width: SCREEN_W } = Dimensions.get('window');

const COVER_IMAGE = require('../../assets/images/dest_rajasthan.jpg');
const GOA_IMAGE = require('../../assets/images/dest_goa.jpg');
const LADAKH_IMAGE = require('../../assets/images/dest_ladakh.jpg');
const KERALA_IMAGE = require('../../assets/images/dest_kerala.jpg');
const HAMPI_IMAGE = require('../../assets/images/journal_hampi.jpg');

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
];

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
  const [editName, setEditName] = useState(profile?.name || 'Priya Sharma');
  const [editAge, setEditAge] = useState(String(profile?.age || 24));
  const [editLocation, setEditLocation] = useState(profile?.city || 'Bengaluru');
  const [editBio, setEditBio] = useState(
    profile?.bio ||
      'Visual designer & coffee enthusiast wandering through architecture, quiet bookshops, and coastal hiking trails.'
  );
  const [editAvatar, setEditAvatar] = useState(profile?.avatar_url || AVATAR_PRESETS[0]);
  const [saving, setSaving] = useState(false);

  // Sync profile state
  useEffect(() => {
    if (profile) {
      if (profile.name) setEditName(profile.name);
      if (profile.age) setEditAge(String(profile.age));
      if (profile.bio) setEditBio(profile.bio);
      if (profile.avatar_url) setEditAvatar(profile.avatar_url);
    }
  }, [profile]);

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
    await updateProfile({
      name: editName,
      bio: editBio,
      avatar_url: editAvatar || profile?.avatar_url,
      age: parseInt(editAge, 10) || 27,
    });
    setSaving(false);
    setEditModalVisible(false);
    Alert.alert('Profile Saved', 'Your traveler profile has been updated.');
  };

  const currentAvatar = profile?.avatar_url || editAvatar || AVATAR_PRESETS[0];
  const displayName = profile?.name || 'Priya Sharma';
  const displayAge = profile?.age || 24;
  const displayLocation = profile?.city ? `${profile.city}, ${profile.state || 'Karnataka'}` : 'Bengaluru, Karnataka';
  const trustScore = profile?.trust_score || 4.95;

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
          {/* Cinematic Cover Background */}
          <View style={styles.coverWrapper}>
            <Image source={COVER_IMAGE} style={styles.coverImage} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(15, 23, 42, 0.25)', 'rgba(15, 23, 42, 0.65)', 'transparent']}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />

          {/* Top Quick Actions */}
          <View style={[styles.topActionsBar, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
            <View style={[styles.topBadgePill, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }]}>
              <Ionicons name="sparkles" size={12} color="#C8B27A" style={{ marginRight: 5 }} />
              <Text style={[styles.topBadgeText, { color: '#756345' }]}>VERIFIED EXPLORER</Text>
            </View>

            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              style={[styles.topEditIconBtn, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }]}
              activeOpacity={0.8}
              accessibilityLabel="Edit Profile"
            >
              <Ionicons name="create-outline" size={18} color="#171715" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Profile Area: Large Avatar, Verification Badge, Name, Age, Location, Trust Score */}
        <View style={styles.profileHeader}>
          {/* Avatar with verified ring and camera badge */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarRing, { borderColor: 'rgba(216, 212, 203, 0.8)' }]}>
              <Image source={{ uri: currentAvatar }} style={styles.avatarImage} />
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: '#C8B27A', borderColor: '#FAF8F3', borderWidth: 2 }]}>
              <Ionicons name="shield-checkmark" size={15} color="#FAF8F3" />
            </View>
          </View>

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
            <Text style={[styles.trustReviewCount, { color: '#756345' }]}>18 Reviews</Text>
          </View>

          {/* Action Row: Edit Profile, Verification, Settings */}
          <View style={styles.profileActionRow}>
            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              style={styles.primaryActionBtn}
              activeOpacity={0.85}
            >
              <View style={[styles.primaryActionGradient, { backgroundColor: '#1D1D1B', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                <Ionicons name="create" size={15} color="#C8B27A" style={{ marginRight: 6 }} />
                <Text style={[styles.primaryActionText, { color: '#FAF8F3' }]}>Edit Profile</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/verification')}
              style={[styles.secondaryActionBtn, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.85)' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={15} color="#1D1D1B" style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryActionText, { color: '#1D1D1B' }]}>Verification</Text>
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

        {/* SECTION 1: ABOUT ME */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>ABOUT ME</Text>
            <Ionicons name="person-outline" size={15} color={colors.textPrimary} />
          </View>

          {/* Bio Card */}
          <View style={[styles.bioCard, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }, SHADOWS.card]}>
            <Text style={[styles.bioText, { color: colors.textPrimary }]}>
              {profile?.bio ||
                'Visual designer & coffee enthusiast wandering through architecture, quiet bookshops, and coastal hiking trails.'}
            </Text>
          </View>

          {/* Travel Styles */}
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

          {/* Languages */}
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

          {/* Interests */}
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

          {/* Favorite Destinations */}
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

        {/* SECTION 2: TRAVEL JOURNAL */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionEyebrow, { color: '#756345' }]}>TRAVEL JOURNAL</Text>
            <Ionicons name="images-outline" size={15} color="#C8B27A" />
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Memories, quiet observations, and paths crossed around the world.
          </Text>

          {/* Journal Entries Grid */}
          <View style={styles.journalList}>
            {JOURNAL_ENTRIES.map((entry) => (
              <View key={entry.id} style={[styles.journalCard, { backgroundColor: 'rgba(250, 248, 243, 0.92)', borderColor: 'rgba(216, 212, 203, 0.75)' }, SHADOWS.card]}>
                <View style={styles.journalImageWrap}>
                  <Image source={entry.image} style={styles.journalImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(244, 241, 234, 0.85)']}
                    style={StyleSheet.absoluteFill}
                  />
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

        {/* SECTION 3: VERIFICATION & COMMUNITY TRUST */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>VERIFICATION & TRUST</Text>
            <Ionicons name="shield-outline" size={15} color={colors.primary} />
          </View>

          {/* Trust Meter Card */}
          <View style={[styles.trustMeterCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.meterHeaderRow}>
              <Text style={[styles.meterTitle, { color: colors.textPrimary }]}>Profile Completeness</Text>
              <Text style={[styles.meterPercent, { color: colors.primary }]}>95%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]}>
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: '95%' }]}
              />
            </View>
            <Text style={[styles.meterHint, { color: colors.textSecondary }]}>
              ID verified • 3 connected accounts • 4 verified past journeys
            </Text>
          </View>

          {/* Stats Bar */}
          <View style={[styles.statsBar, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trips Logged</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>18</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Destinations</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>4.95</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Trust</Text>
            </View>
          </View>
        </View>


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
            {/* Avatar Preset Selector */}
            <Text style={[styles.formLabel, { color: colors.primary }]}>CHOOSE AVATAR PRESET</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {AVATAR_PRESETS.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setEditAvatar(uri)}
                  style={[styles.presetItem, { borderColor: colors.border }, editAvatar === uri && [styles.presetItemActive, { borderColor: colors.primary }]]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.presetImg} />
                  {editAvatar === uri && (
                    <View style={[styles.presetCheck, { backgroundColor: '#059669' }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

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
                placeholder="27"
                keyboardType="numeric"
                icon="calendar-outline"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.primary }]}>LOCATION</Text>
              <InputField
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="e.g. San Francisco, CA / Tokyo, Japan"
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollBody: {
    paddingBottom: 40,
  },

  /* Cover Image Header */
  coverWrapper: {
    width: '100%',
    height: 230,
    position: 'relative',
    justifyContent: 'space-between',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backdropFilter: 'blur(8px)',
  },
  topBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1.2,
  },
  topEditIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },

  /* Profile Identity Header */
  profileHeader: {
    alignItems: 'center',
    marginTop: -54,
    paddingHorizontal: 20,
    marginBottom: 28,
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
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  presetScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  presetItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetItemActive: {
    borderColor: '#B99A5E',
  },
  presetImg: {
    width: '100%',
    height: '100%',
  },
  presetCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#B99A5E',
    alignItems: 'center',
    justifyContent: 'center',
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
});
