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
  ImageBackground,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import InputField from '../../components/ui/InputField';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';

const PROFILE_BG = require('../../assets/images/auth_landing_bg.jpg');
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
  const { profile, logout, updateProfile, setThemePreference } = useAuth();
  const { theme, isDark, colors, setTheme: setGlobalTheme } = useTheme();

  const handleThemeChange = async (newTheme) => {
    await setGlobalTheme(newTheme);
    if (setThemePreference) {
      await setThemePreference(newTheme);
    }
  };

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
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of MaybeWe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/welcome');
          },
        },
      ]
    );
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
    <View style={styles.root}>
      {/* Full-Screen Cinematic Travel Photography Background */}
      <ImageBackground
        source={PROFILE_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(6, 21, 34, 0.45)', 'rgba(6, 21, 34, 0.72)', 'rgba(6, 21, 34, 0.94)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollBody,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cinematic Cover Background */}
          <View style={styles.coverWrapper}>
            <Image source={COVER_IMAGE} style={styles.coverImage} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(6, 21, 34, 0.25)', 'rgba(6, 21, 34, 0.65)', 'transparent']}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />

          {/* Top Quick Actions */}
          <View style={[styles.topActionsBar, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
            <View style={styles.topBadgePill}>
              <Ionicons name="sparkles" size={13} color={COLORS.lavender} style={{ marginRight: 5 }} />
              <Text style={styles.topBadgeText}>VERIFIED EXPLORER</Text>
            </View>

            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              style={styles.topEditIconBtn}
              activeOpacity={0.8}
              accessibilityLabel="Edit Profile"
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Profile Area: Large Avatar, Verification Badge, Name, Age, Location, Trust Score */}
        <View style={styles.profileHeader}>
          {/* Avatar with verified ring and camera badge */}
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarRing, SHADOWS.lavender]}>
              <Image source={{ uri: currentAvatar }} style={styles.avatarImage} />
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#061522" />
            </View>
          </View>

          {/* Name & Age */}
          <Text style={styles.userName}>
            {displayName}, <Text style={styles.userAge}>{displayAge}</Text>
          </Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.peach} style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>{displayLocation}</Text>
          </View>

          {/* Trust Score Badge */}
          <View style={[styles.trustScorePill, SHADOWS.card]}>
            <Ionicons name="star" size={14} color={COLORS.sunset} style={{ marginRight: 6 }} />
            <Text style={styles.trustScoreNumber}>{Number(trustScore).toFixed(2)}</Text>
            <Text style={styles.trustScoreLabel}>Trust Score</Text>
            <View style={styles.trustDot} />
            <Text style={styles.trustReviewCount}>18 Reviews</Text>
          </View>

          {/* Action Row: Edit Profile, Verification, Settings */}
          <View style={styles.profileActionRow}>
            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              style={styles.primaryActionBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryActionGradient}
              >
                <Ionicons name="create" size={15} color="#061522" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/verification')}
              style={styles.secondaryActionBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryActionText}>Verification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={styles.settingsIconBtn}
              activeOpacity={0.8}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={17} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutIconBtn}
              activeOpacity={0.8}
              accessibilityLabel="Log Out"
            >
              <Ionicons name="log-out-outline" size={18} color="rgba(255, 125, 138, 0.9)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 1: ABOUT ME */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>ABOUT ME</Text>
            <Ionicons name="person-outline" size={15} color="#FFFFFF" />
          </View>

          {/* Bio Card */}
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>
              {profile?.bio ||
                'Visual designer & coffee enthusiast wandering through architecture, quiet bookshops, and coastal hiking trails.'}
            </Text>
          </View>

          {/* Travel Styles */}
          <View style={styles.subCategoryBlock}>
            <Text style={styles.subCategoryLabel}>TRAVEL STYLES</Text>
            <View style={styles.chipCloud}>
              {TRAVEL_STYLES.map((style) => (
                <View key={style} style={styles.styleChip}>
                  <Ionicons name="sparkles" size={11} color={COLORS.lavender} style={{ marginRight: 5 }} />
                  <Text style={styles.styleChipText}>{style}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Languages */}
          <View style={styles.subCategoryBlock}>
            <Text style={styles.subCategoryLabel}>LANGUAGES SPOKEN</Text>
            <View style={styles.chipCloud}>
              {LANGUAGES.map((lang) => (
                <View key={lang} style={styles.languageChip}>
                  <Ionicons name="globe-outline" size={12} color={COLORS.peach} style={{ marginRight: 6 }} />
                  <Text style={styles.languageChipText}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Interests */}
          <View style={styles.subCategoryBlock}>
            <Text style={styles.subCategoryLabel}>INTERESTS & RHYTHMS</Text>
            <View style={styles.chipCloud}>
              {INTERESTS.map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Favorite Destinations */}
          <View style={styles.subCategoryBlock}>
            <Text style={styles.subCategoryLabel}>FAVORITE DESTINATIONS</Text>
            <View style={styles.chipCloud}>
              {FAVORITE_DESTINATIONS.map((dest) => (
                <View key={dest} style={styles.destinationChip}>
                  <Ionicons name="pin" size={11} color={COLORS.sunset} style={{ marginRight: 5 }} />
                  <Text style={styles.destinationChipText}>{dest}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* SECTION 2: TRAVEL JOURNAL */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>TRAVEL JOURNAL</Text>
            <Ionicons name="images-outline" size={15} color={COLORS.lavender} />
          </View>
          <Text style={styles.sectionSubtitle}>
            Memories, quiet observations, and paths crossed around the world.
          </Text>

          {/* Journal Entries Grid */}
          <View style={styles.journalList}>
            {JOURNAL_ENTRIES.map((entry) => (
              <View key={entry.id} style={[styles.journalCard, SHADOWS.card]}>
                <View style={styles.journalImageWrap}>
                  <Image source={entry.image} style={styles.journalImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(6, 21, 34, 0.85)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.journalImageBadge}>
                    <Text style={styles.journalDateBadge}>{entry.date}</Text>
                  </View>
                </View>

                <View style={styles.journalContent}>
                  <View style={styles.journalHeaderRow}>
                    <Text style={styles.journalDestination}>{entry.destination}</Text>
                    <View style={styles.journalTagPill}>
                      <Text style={styles.journalTagText}>{entry.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.journalCaption}>{entry.caption}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* SECTION 3: VERIFICATION & COMMUNITY TRUST */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>VERIFICATION & TRUST</Text>
            <Ionicons name="shield-outline" size={15} color={COLORS.lavender} />
          </View>

          {/* Trust Meter Card */}
          <View style={styles.trustMeterCard}>
            <View style={styles.meterHeaderRow}>
              <Text style={styles.meterTitle}>Profile Completeness</Text>
              <Text style={styles.meterPercent}>95%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: '95%' }]}
              />
            </View>
            <Text style={styles.meterHint}>
              ID verified • 3 connected accounts • 4 verified past journeys
            </Text>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Trips Logged</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>18</Text>
              <Text style={styles.statLabel}>Destinations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>4.95</Text>
              <Text style={styles.statLabel}>Avg Trust</Text>
            </View>
          </View>
        </View>

        {/* SECTION 4: APPEARANCE & THEME SETTINGS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionEyebrow}>APPEARANCE & SETTINGS</Text>
            <Ionicons name="color-palette-outline" size={15} color={isDark ? '#FFFFFF' : '#061522'} />
          </View>
          <Text style={styles.sectionSubtitle}>
            Customize your MaybeWe interface aesthetics and view mode.
          </Text>

          {/* Theme Selector Card */}
          <View
            style={[
              styles.themeSettingsCard,
              {
                backgroundColor: isDark ? 'rgba(16, 40, 58, 0.72)' : 'rgba(255, 255, 255, 0.90)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(6, 21, 34, 0.12)',
              },
            ]}
          >
            <View style={styles.themeSettingsHeader}>
              <Text style={[styles.themeSettingsTitle, { color: isDark ? '#FFFFFF' : '#061522' }]}>
                App Theme
              </Text>
              <Text style={[styles.themeSettingsDesc, { color: isDark ? 'rgba(255, 255, 255, 0.70)' : '#334E68' }]}>
                {theme === 'dark' ? 'Dark Theme active (deep cinematic navy)' : 'Light Theme active (crisp, clean daytime)'}
              </Text>
            </View>

            {/* Segmented Dual Option Buttons */}
            <View style={[styles.themeToggleRow, { backgroundColor: isDark ? 'rgba(6, 21, 34, 0.60)' : 'rgba(6, 21, 34, 0.06)' }]}>
              <TouchableOpacity
                onPress={() => handleThemeChange('dark')}
                style={[
                  styles.themeOptionBtn,
                  theme === 'dark' && styles.themeOptionBtnActiveDark,
                ]}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: theme === 'dark' }}
                accessibilityLabel="Switch to Dark Theme"
              >
                <Ionicons
                  name="moon"
                  size={15}
                  color={theme === 'dark' ? '#061522' : 'rgba(255, 255, 255, 0.70)'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    theme === 'dark'
                      ? styles.themeOptionTextActiveDark
                      : { color: isDark ? 'rgba(255, 255, 255, 0.70)' : '#627D98' },
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleThemeChange('light')}
                style={[
                  styles.themeOptionBtn,
                  theme === 'light' && styles.themeOptionBtnActiveLight,
                ]}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: theme === 'light' }}
                accessibilityLabel="Switch to Light Theme"
              >
                <Ionicons
                  name="sunny"
                  size={16}
                  color={theme === 'light' ? '#FFFFFF' : (isDark ? 'rgba(255, 255, 255, 0.70)' : '#627D98')}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    theme === 'light'
                      ? styles.themeOptionTextActiveLight
                      : { color: isDark ? 'rgba(255, 255, 255, 0.70)' : '#627D98' },
                  ]}
                >
                  Light
                </Text>
              </TouchableOpacity>
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
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.editModalBody} showsVerticalScrollIndicator={false}>
            {/* Avatar Preset Selector */}
            <Text style={styles.formLabel}>CHOOSE AVATAR PRESET</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {AVATAR_PRESETS.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setEditAvatar(uri)}
                  style={[styles.presetItem, editAvatar === uri && styles.presetItemActive]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.presetImg} />
                  {editAvatar === uri && (
                    <View style={styles.presetCheck}>
                      <Ionicons name="checkmark" size={12} color="#061522" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NAME</Text>
              <InputField
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                icon="person-outline"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>AGE</Text>
              <InputField
                value={editAge}
                onChangeText={setEditAge}
                placeholder="27"
                keyboardType="numeric"
                icon="calendar-outline"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>LOCATION</Text>
              <InputField
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="e.g. San Francisco, CA / Tokyo, Japan"
                icon="location-outline"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ABOUT YOU (BIO)</Text>
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
              <LinearGradient
                colors={GRADIENTS.lavenderViolet}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveProfileGradient}
              >
                <Text style={styles.saveProfileText}>{saving ? 'Saving...' : 'Save Profile Changes'}</Text>
              </LinearGradient>
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
    backgroundColor: '#061522',
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
    backgroundColor: 'rgba(6, 21, 34, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backdropFilter: 'blur(8px)',
  },
  topBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  topEditIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6, 21, 34, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    borderColor: COLORS.lavender,
    overflow: 'hidden',
    backgroundColor: '#10283A',
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
    backgroundColor: COLORS.lavender,
    borderWidth: 2,
    borderColor: '#061522',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 166, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADII.full,
    marginBottom: 18,
    backdropFilter: 'blur(12px)',
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
    color: 'rgba(255, 255, 255, 0.85)',
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginHorizontal: 8,
  },
  trustReviewCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
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
    color: '#061522',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryActionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsIconBtn: {
    padding: 12,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutIconBtn: {
    padding: 12,
    borderRadius: RADII.full,
    backgroundColor: 'rgba(255, 125, 138, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 125, 138, 0.3)',
  },

  /* Sections */
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(16px)',
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
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 18,
    marginBottom: 16,
  },

  /* About Me Blocks */
  bioCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bioText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 22,
  },
  subCategoryBlock: {
    marginTop: 12,
  },
  subCategoryLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  styleChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 179, 154, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 154, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  languageChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  interestChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  interestChipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 208, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 166, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.full,
  },
  destinationChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* Travel Journal Entries */
  journalList: {
    gap: 16,
  },
  journalCard: {
    backgroundColor: 'rgba(11, 29, 45, 0.65)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backdropFilter: 'blur(12px)',
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
    backgroundColor: 'rgba(6, 21, 34, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#FFFFFF',
  },
  journalTagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.full,
  },
  journalTagText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  journalCaption: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 19,
  },

  /* Verification & Trust Meter */
  trustMeterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: 'rgba(255, 255, 255, 0.55)',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  /* Edit Modal */
  modalRoot: {
    flex: 1,
    backgroundColor: '#081A2A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editModalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  formLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.lavender,
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
    borderColor: COLORS.lavender,
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
    backgroundColor: COLORS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  saveProfileBtn: {
    marginTop: 12,
    borderRadius: RADII.full,
    overflow: 'hidden',
  },
  saveProfileGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADII.full,
  },
  saveProfileText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#061522',
    letterSpacing: 0.1,
  },
  themeSettingsCard: {
    borderRadius: RADII.xl,
    padding: 18,
    borderWidth: 1,
    marginTop: 8,
  },
  themeSettingsHeader: {
    marginBottom: 14,
  },
  themeSettingsTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  themeSettingsDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  themeToggleRow: {
    flexDirection: 'row',
    borderRadius: RADII.lg,
    padding: 4,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADII.md,
  },
  themeOptionBtnActiveDark: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.soft,
  },
  themeOptionBtnActiveLight: {
    backgroundColor: '#061522',
    ...SHADOWS.soft,
  },
  themeOptionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  themeOptionTextActiveDark: {
    color: '#061522',
  },
  themeOptionTextActiveLight: {
    color: '#FFFFFF',
  },
});
