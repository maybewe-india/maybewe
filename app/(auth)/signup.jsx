import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, GRADIENTS, RADII, SHADOWS, FONTS } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InputField from '../../components/ui/InputField';
import FilterChip from '../../components/ui/FilterChip';
import { useAuth } from '../../lib/authContext';

import { INDIAN_LANGUAGES } from '../../lib/indiaData';

const SIGNUP_BG = require('../../assets/images/dest_manali.jpg');

const TRAVEL_STYLES = [
  { id: 'Adventure', icon: 'trail-sign-outline' },
  { id: 'Beach', icon: 'sunny-outline' },
  { id: 'Food', icon: 'restaurant-outline' },
  { id: 'Culture', icon: 'earth-outline' },
  { id: 'Nature', icon: 'leaf-outline' },
  { id: 'Photography', icon: 'camera-outline' },
  { id: 'Nightlife', icon: 'moon-outline' },
  { id: 'Luxury', icon: 'diamond-outline' },
  { id: 'Backpacking', icon: 'bag-outline' },
  { id: 'Wellness', icon: 'heart-outline' },
];

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

// Indian languages — sourced from lib/indiaData.js
const POPULAR_LANGUAGES = INDIAN_LANGUAGES;

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
];

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();

  const [step, setStep] = useState(1); // 1 to 5
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [bio, setBio] = useState('');
  const [selectedStyles, setSelectedStyles] = useState(['Culture', 'Food']);
  const [selectedLanguages, setSelectedLanguages] = useState(['English']);
  const [avatarUri, setAvatarUri] = useState(SAMPLE_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const progressAnim = useRef(new Animated.Value(0.2)).current;

  const updateProgress = (targetStep) => {
    Animated.timing(progressAnim, {
      toValue: targetStep / 5,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const toggleStyle = (styleId) => {
    if (selectedStyles.includes(styleId)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== styleId));
    } else {
      setSelectedStyles([...selectedStyles, styleId]);
    }
  };

  const toggleLanguage = (lang) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert('Permission is needed to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleNext = () => {
    setErrorMsg('');

    // Step 1 validation
    if (step === 1) {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 18) {
        setErrorMsg('You must be 18 or older to join MaybeWe.');
        return;
      }
      setStep(2);
      updateProgress(2);
    }
    // Step 2 validation
    else if (step === 2) {
      if (!bio.trim()) {
        setErrorMsg('Please share a sentence or two about your travel rhythm.');
        return;
      }
      setStep(3);
      updateProgress(3);
    }
    // Step 3 validation
    else if (step === 3) {
      if (selectedStyles.length === 0) {
        setErrorMsg('Please select at least one travel style.');
        return;
      }
      setStep(4);
      updateProgress(4);
    }
    // Step 4 validation
    else if (step === 4) {
      if (selectedLanguages.length === 0) {
        setErrorMsg('Please select at least one language.');
        return;
      }
      setStep(5);
      updateProgress(5);
    }
    // Step 5: Final submission
    else if (step === 5) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      const prev = step - 1;
      setStep(prev);
      updateProgress(prev);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg('');
    const res = await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      age: parseInt(age, 10),
      gender,
      bio: bio.trim(),
      travel_styles: selectedStyles,
      languages: selectedLanguages,
      avatar_url: avatarUri,
    });
    setLoading(false);

    if (res.success) {
      router.push('/(auth)/guidelines');
    } else {
      setErrorMsg(res.error || 'Failed to create account. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ImageBackground
        source={SIGNUP_BG}
        style={styles.bg}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(6, 21, 34, 0.40)',
            'rgba(6, 21, 34, 0.72)',
            'rgba(6, 21, 34, 0.94)',
          ]}
          locations={[0, 0.40, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Header & Animated Progress Bar */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

        <View style={styles.stepInfo}>
          <Text style={styles.stepCounterText}>STEP {step} OF 5</Text>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: What's your name & essentials */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your name?</Text>
            <Text style={styles.stepSubtitle}>
              Let's create your traveler credentials. You must be 18+ to join our trusted community.
            </Text>

            <InputField
              label="Full Name"
              placeholder="e.g. Maya Lin"
              icon="person-outline"
              value={name}
              onChangeText={setName}
            />

            <InputField
              label="Email Address"
              placeholder="maya@traveler.io"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <InputField
              label="Password"
              placeholder="At least 6 characters"
              icon="lock-closed-outline"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <InputField
              label="Age (18+)"
              placeholder="e.g. 26"
              icon="calendar-outline"
              keyboardType="numeric"
              maxLength={3}
              value={age}
              onChangeText={setAge}
              helperText="Safety requirement: MaybeWe matchmaking is exclusively 18+."
            />
          </View>
        )}

        {/* Step 2: Tell us about yourself */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell us about yourself.</Text>
            <Text style={styles.stepSubtitle}>
              A thoughtful bio helps potential travel companions understand your rhythm and travel style.
            </Text>

            <Text style={styles.fieldLabel}>Gender Identity</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <FilterChip
                  key={g}
                  label={g}
                  selected={gender === g}
                  onPress={() => setGender(g)}
                />
              ))}
            </View>

            <InputField
              label="Your Travel Bio & Vibe"
              placeholder="e.g. Heading to Manali and Kasol for mountain treks, dhaba stops, and stargazing nights by a bonfire..."
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={setBio}
              maxLength={280}
              helperText="Share what kind of experiences you seek and what you appreciate in a travel companion."
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {/* Step 3: How do you travel? */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How do you travel?</Text>
            <Text style={styles.stepSubtitle}>
              Select the travel styles and vibes that match your journey style.
            </Text>

            <View style={styles.chipRow}>
              {TRAVEL_STYLES.map((st) => (
                <FilterChip
                  key={st.id}
                  label={st.id}
                  selected={selectedStyles.includes(st.id)}
                  onPress={() => toggleStyle(st.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Which languages do you speak? */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Which languages do you speak?</Text>
            <Text style={styles.stepSubtitle}>
              Select the languages you speak — this helps you find the right travel companion.
            </Text>

            <View style={styles.chipRow}>
              {POPULAR_LANGUAGES.map((lang) => (
                <FilterChip
                  key={lang}
                  label={lang}
                  selected={selectedLanguages.includes(lang)}
                  onPress={() => toggleLanguage(lang)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Step 5: Let's build your travel profile */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Let's build your travel profile.</Text>
            <Text style={styles.stepSubtitle}>
              Clear profile photography fosters confidence and trust with fellow travelers.
            </Text>

            <View style={styles.avatarPickerContainer}>
              <View style={styles.avatarGlowWrapper}>
                <Image source={{ uri: avatarUri }} style={styles.largeAvatar} />
              </View>

              <TouchableOpacity
                onPress={handlePickPhoto}
                style={styles.uploadBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.uploadBtnText}>Upload from Photos</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.presetHeading}>Or pick a preset travel avatar:</Text>
            <View style={styles.presetRow}>
              {SAMPLE_AVATARS.map((uri, idx) => {
                const isSelected = avatarUri === uri;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setAvatarUri(uri)}
                    style={[
                      styles.presetThumbWrapper,
                      isSelected && styles.selectedPresetWrapper,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.presetThumb} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Error message */}
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Next / Submit CTA Button */}
        <PrimaryButton
          title={step === 5 ? 'Create Travel Profile' : 'Continue  →'}
          loading={loading}
          onPress={handleNext}
          size="lg"
          style={{ marginTop: 24 }}
        />
      </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInfo: {
    alignItems: 'center',
  },
  stepCounterText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  progressBarBg: {
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  scrollBody: {
    padding: 24,
  },
  stepContainer: {
    width: '100%',
    backgroundColor: 'rgba(16, 40, 58, 0.65)',
    borderRadius: RADII['3xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backdropFilter: 'blur(16px)',
    ...SHADOWS.card,
  },
  stepTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 26,
  },
  fieldLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  avatarPickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarGlowWrapper: {
    padding: 4,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 18,
    ...SHADOWS.soft,
  },
  largeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: RADII.full,
  },
  uploadBtnText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  presetHeading: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 12,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  presetThumbWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPresetWrapper: {
    borderColor: '#FFFFFF',
  },
  presetThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 125, 138, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 125, 138, 0.35)',
    padding: 12,
    borderRadius: RADII.md,
    marginTop: 16,
  },
  errorText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
