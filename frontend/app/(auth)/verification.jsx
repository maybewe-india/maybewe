import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADII, SHADOWS, FONTS, PALETTE } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import TrustBadge from '../../components/ui/TrustBadge';
import { useAuth } from '../../lib/authContext';

// Verification State Machine:
// 'NOT_STARTED' | 'CAPTURED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED' | 'PENDING'

export default function VerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, submitVerification, checkVerificationStatus, updateProfile } = useAuth();

  const [selfieUri, setSelfieUri] = useState(null);
  const [verificationState, setVerificationState] = useState('NOT_STARTED');
  const [failureReason, setFailureReason] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');

  // Profile repair state for accounts missing public.users
  const [repairName, setRepairName] = useState(
    profile?.name && profile.name !== 'Traveler' && !profile.name.includes('@') ? profile.name : ''
  );
  const [repairAge, setRepairAge] = useState(profile?.age ? String(profile.age) : '');
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairError, setRepairError] = useState('');
  const [repairSuccess, setRepairSuccess] = useState('');

  useEffect(() => {
    if (profile?.needsProfileRepair) {
      if (!repairName && profile.name && profile.name !== 'Traveler' && !profile.name.includes('@')) {
        setRepairName(profile.name);
      }
      if (!repairAge && profile.age && profile.age >= 18) {
        setRepairAge(String(profile.age));
      }
    }
  }, [profile?.needsProfileRepair, profile?.name, profile?.age]);

  // Sync with user's stored status on mount
  useEffect(() => {
    const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
    if (profile?.verification_status === 'verified') {
      setVerificationState('VERIFIED');
    } else if (profile?.verification_status === 'pending') {
      if (isDemo) {
        setVerificationState('VERIFIED');
      } else {
        setVerificationState('PENDING');
      }
    } else if (profile?.verification_status === 'failed' || profile?.verification_status === 'rejected') {
      setVerificationState('FAILED');
    } else {
      setVerificationState('NOT_STARTED');
    }
  }, [profile?.verification_status]);

  const handleCaptureSelfie = async () => {
    try {
      if (Platform.OS === 'web') {
        // In browser environments, try camera or file upload
        try {
          const result = await ImagePicker.launchCameraAsync({
            cameraType: ImagePicker.CameraType.front,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            setSelfieUri(result.assets[0].uri);
            setVerificationState('CAPTURED');
            return;
          }
        } catch (webCamErr) {
          console.log('Web camera bypassed or unavailable, trying photo picker:', webCamErr);
        }

        try {
          const libResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!libResult.canceled && libResult.assets?.[0]?.uri) {
            setSelfieUri(libResult.assets[0].uri);
            setVerificationState('CAPTURED');
            return;
          }
        } catch (webLibErr) {
          console.log('Web photo picker error:', webLibErr);
        }

        Alert.alert('Camera or Photo Required', 'Please capture or upload a clear photo of your face to verify your identity.');
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        // Attempt media library if camera access denied
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libPerm.granted) {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            setSelfieUri(result.assets[0].uri);
            setVerificationState('CAPTURED');
            return;
          }
        }
        Alert.alert('Camera Permission Required', 'Please grant camera access in your device settings to take your verification selfie.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelfieUri(result.assets[0].uri);
        setVerificationState('CAPTURED');
      }
    } catch (err) {
      console.warn('Camera capture error:', err);
      Alert.alert('Camera Error', 'Could not open camera. Please check your permissions and try again.');
    }
  };

  const handleSubmit = async () => {
    if (!selfieUri) {
      Alert.alert('Selfie Required', 'Please take or choose a selfie before submitting.');
      return;
    }
    setVerificationState('IN_PROGRESS');

    try {
      const res = await submitVerification(selfieUri);
      if (res?.success && res?.status === 'verified') {
        // Strictly set verified only when server response confirms verified status
        setVerificationState('VERIFIED');
      } else if (!res?.success) {
        setFailureReason(res?.error || 'Face could not be verified clearly.');
        setVerificationState('FAILED');
      } else {
        // Live mode pending review
        setVerificationState('PENDING');
      }
    } catch (err) {
      setFailureReason('Verification service unavailable. Please retry.');
      setVerificationState('FAILED');
    }
  };

  const handleRetry = () => {
    setSelfieUri(null);
    setFailureReason('');
    setVerificationState('NOT_STARTED');
  };

  const handleCheckPendingStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setStatusFeedback('');
    try {
      if (checkVerificationStatus) {
        const res = await checkVerificationStatus();
        const isDemo = process.env.EXPO_PUBLIC_VERIFICATION_MODE === 'demo';
        if (res?.status === 'verified' || isDemo) {
          setVerificationState('VERIFIED');
        } else if (res?.status === 'failed' || res?.status === 'rejected') {
          setFailureReason(res.error || 'Verification was not approved. Please retry.');
          setVerificationState('FAILED');
        } else {
          // Explicit visible confirmation for pending state
          setStatusFeedback('Status checked: Your verification selfie is actively under review by our safety moderators. Please check back shortly.');
        }
      }
    } catch (err) {
      console.warn('Error checking pending verification status:', err);
      setStatusFeedback('Unable to refresh verification status. Please check your connection and retry.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveProfileDetails = async () => {
    if (!repairName.trim()) {
      setRepairError('Please enter your full name.');
      return;
    }
    const ageNum = parseInt(repairAge, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      setRepairError('You must be at least 18 years old to join MaybeWe.');
      return;
    }
    setIsRepairing(true);
    setRepairError('');
    setRepairSuccess('');
    try {
      const res = await updateProfile({
        name: repairName.trim(),
        age: ageNum,
      });
      if (res?.success) {
        setRepairSuccess('Profile details saved! Your traveler profile is created and verification remains under review.');
      } else {
        setRepairError(res?.error || 'Failed to save profile details. Please retry.');
      }
    } catch (err) {
      setRepairError(err.message || 'An error occurred while saving profile.');
    } finally {
      setIsRepairing(false);
    }
  };

  const renderProfileRepairBox = () => {
    if (!profile?.needsProfileRepair && !repairSuccess) return null;

    return (
      <View style={styles.repairBox}>
        <View style={styles.repairHeader}>
          <Ionicons name="person-circle-outline" size={24} color={COLORS.sunset} style={{ marginRight: 8 }} />
          <Text style={styles.repairTitle}>Complete Profile Details</Text>
        </View>
        <Text style={styles.repairSubtitle}>
          Your verification selfie is on file and pending review, but your authentic name and age (18+) are required to complete your traveler profile.
        </Text>

        {repairError ? (
          <View style={styles.repairErrorBox}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" style={{ marginRight: 6 }} />
            <Text style={styles.repairErrorText}>{repairError}</Text>
          </View>
        ) : null}

        {repairSuccess ? (
          <View style={styles.repairSuccessBox}>
            <Ionicons name="checkmark-circle" size={16} color="#4ADE80" style={{ marginRight: 6 }} />
            <Text style={styles.repairSuccessText}>{repairSuccess}</Text>
          </View>
        ) : (
          <>
            <View style={styles.repairInputGroup}>
              <Text style={styles.repairInputLabel}>Full Name</Text>
              <TextInput
                style={styles.repairTextInput}
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
                value={repairName}
                onChangeText={(t) => {
                  setRepairName(t);
                  if (repairError) setRepairError('');
                }}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.repairInputGroup}>
              <Text style={styles.repairInputLabel}>Age (Must be 18+)</Text>
              <TextInput
                style={styles.repairTextInput}
                placeholder="e.g. 24"
                placeholderTextColor="#94A3B8"
                value={repairAge}
                onChangeText={(t) => {
                  setRepairAge(t);
                  if (repairError) setRepairError('');
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveProfileDetails}
              style={[styles.saveProfileBtn, isRepairing && { opacity: 0.7 }]}
              disabled={isRepairing}
              activeOpacity={0.8}
            >
              {isRepairing ? (
                <ActivityIndicator size="small" color="#0F172A" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="save-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.saveProfileBtnText}>
                {isRepairing ? 'Saving Profile...' : 'Save Profile Details'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const handleFinish = () => {
    if (verificationState === 'VERIFIED') {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrapper}>
              <Ionicons name="shield-checkmark" size={32} color="#0F172A" />
            </View>
            <Text style={styles.title}>Verify to join MaybeWe</Text>
            <Text style={styles.subtitle}>
              Take a quick selfie to verify your identity and keep our travel community safer. Verification is required before you can enter MaybeWe.
            </Text>
          </View>

          {/* STATE 1 & 2: NOT_STARTED or CAPTURED */}
          {(verificationState === 'NOT_STARTED' || verificationState === 'CAPTURED') && (
            <View style={[styles.card, SHADOWS.card]}>
              {selfieUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
                  <TouchableOpacity
                    onPress={handleCaptureSelfie}
                    style={styles.retakeButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                    <Text style={styles.retakeText}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <View style={styles.cameraIconCircle}>
                    <Ionicons name="camera-reverse-outline" size={44} color="#0F172A" />
                  </View>
                  <Text style={styles.guidanceHeading}>Quick Selfie Check</Text>
                  <Text style={styles.guidanceText}>
                    • Make sure your face is well lit{'\n'}
                    • Look directly at the front camera{'\n'}
                    • No sunglasses, hats, or masks
                  </Text>

                  <TouchableOpacity
                    onPress={handleCaptureSelfie}
                    style={styles.captureBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={18} color="#0F172A" style={{ marginRight: 8 }} />
                    <Text style={styles.captureBtnText}>Open Camera</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Requirement notice: No bypass allowed */}
              <View style={styles.mandatoryNoticeBox}>
                <Ionicons name="lock-closed" size={16} color="#0F172A" style={{ marginRight: 8 }} />
                <Text style={styles.mandatoryNoticeText}>
                  Mandatory Step: Verification ensures every traveler in MaybeWe is real.
                </Text>
              </View>

              {selfieUri && (
                <View style={styles.actions}>
                  <PrimaryButton
                    title="Submit for Verification  →"
                    size="lg"
                    onPress={handleSubmit}
                    style={{ width: '100%' }}
                  />
                </View>
              )}
            </View>
          )}

          {/* STATE 3: IN_PROGRESS */}
          {verificationState === 'IN_PROGRESS' && (
            <View style={[styles.card, SHADOWS.card, styles.submittedCard]}>
              <View style={styles.verifyingSpinnerWrap}>
                <ActivityIndicator size="large" color="#0F172A" />
              </View>
              <Text style={styles.submittedTitle}>Verifying Your Selfie</Text>
              <Text style={styles.submittedSubtitle}>
                Checking facial lighting, front camera framing, and real-person liveness...
              </Text>
              <View style={styles.progressStepsBox}>
                <Text style={styles.progressStepLine}>✓ Selfie captured</Text>
                <Text style={styles.progressStepLine}>⏳ Processing safety verification...</Text>
                <Text style={styles.progressStepLineMuted}>• Unlocking MaybeWe application</Text>
              </View>
            </View>
          )}

          {/* STATE 4: VERIFIED */}
          {verificationState === 'VERIFIED' && (
            <View style={[styles.card, SHADOWS.card, styles.submittedCard]}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-done-circle" size={56} color={COLORS.success} />
              </View>
              <Text style={styles.submittedTitle}>Verification Successful</Text>
              <Text style={styles.submittedSubtitle}>
                Your identity has been verified. Welcome to the MaybeWe community!
              </Text>

              <View style={styles.badgeWrapper}>
                <TrustBadge verificationStatus="verified" score={5.0} variant="full" />
              </View>

              <View style={styles.verifiedBenefitsBox}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.success} style={{ marginRight: 8 }} />
                <Text style={styles.verifiedBenefitsText}>
                  Full Verified status active: You can now chat, match, and coordinate journeys securely.
                </Text>
              </View>

              <PrimaryButton
                title="Continue to Explore  →"
                size="lg"
                onPress={handleFinish}
                style={{ width: '100%', marginTop: 24 }}
              />
            </View>
          )}

          {/* STATE 5: FAILED / REJECTED */}
          {verificationState === 'FAILED' && (
            <View style={[styles.card, SHADOWS.card, styles.submittedCard]}>
              <View style={styles.failedIcon}>
                <Ionicons name="alert-circle" size={56} color="#FF6B6B" />
              </View>
              <Text style={styles.submittedTitle}>Verification Unsuccessful</Text>
              <Text style={styles.submittedSubtitle}>
                {failureReason || "We couldn't clearly verify your face. Please ensure you are in good lighting and look directly at the front camera without obstruction."}
              </Text>

              <View style={styles.failedNoticeBox}>
                <Ionicons name="information-circle-outline" size={18} color="#FF6B6B" style={{ marginRight: 8 }} />
                <Text style={styles.failedNoticeText}>
                  Verification is required to enter MaybeWe. Please retake your selfie following the guidance.
                </Text>
              </View>

              <PrimaryButton
                title="Retry Selfie Verification"
                size="lg"
                onPress={handleRetry}
                style={{ width: '100%', marginTop: 24 }}
              />
            </View>
          )}

          {/* STATE 6: PENDING */}
          {verificationState === 'PENDING' && (
            <View style={[styles.card, SHADOWS.card, styles.submittedCard]}>
              <View style={styles.pendingIcon}>
                <Ionicons name="time-outline" size={56} color={COLORS.sunset} />
              </View>
              <Text style={styles.submittedTitle}>Verification Under Review</Text>
              <Text style={styles.submittedSubtitle}>
                Your verification selfie is being reviewed by our safety moderators. Access to MaybeWe will activate once approved.
              </Text>

              <View style={styles.badgeWrapper}>
                <TrustBadge verificationStatus="pending" score={5.0} variant="full" />
              </View>

              {renderProfileRepairBox()}

              <TouchableOpacity
                onPress={handleCheckPendingStatus}
                style={[styles.refreshBtn, isChecking && { opacity: 0.7 }]}
                activeOpacity={0.8}
                disabled={isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#0F172A" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="refresh-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.refreshBtnText}>
                  {isChecking ? 'Checking Status...' : 'Check Status / Confirm'}
                </Text>
              </TouchableOpacity>

              {statusFeedback ? (
                <View style={styles.pendingFeedbackBox}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.sunset} style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.pendingFeedbackText}>{statusFeedback}</Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1EEE6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D7D2C8',
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    fontWeight: '800',
    color: '#171817',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#77766F',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
  },
  card: {
    backgroundColor: 'rgba(251, 250, 247, 0.95)',
    borderRadius: RADII.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    ...SHADOWS.card,
    alignItems: 'center',
  },
  submittedCard: {
    paddingVertical: 32,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  cameraIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  guidanceHeading: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#171817',
    marginBottom: 6,
  },
  guidanceText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#45453F',
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  captureBtnText: {
    fontFamily: FONTS.bold,
    color: '#FBFAF7',
    fontSize: 15,
    fontWeight: '700',
  },
  previewContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  selfiePreview: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: '#B99A5E',
    marginBottom: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retakeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#77766F',
  },
  mandatoryNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1EEE6',
    borderRadius: RADII.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D7D2C8',
    width: '100%',
  },
  mandatoryNoticeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#45453F',
    flex: 1,
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  verifyingSpinnerWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressStepsBox: {
    backgroundColor: '#F1EEE6',
    borderRadius: RADII.lg,
    padding: 14,
    width: '100%',
    marginTop: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D7D2C8',
  },
  progressStepLine: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#171817',
  },
  progressStepLineMuted: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#77766F',
  },
  successIcon: {
    marginBottom: 12,
  },
  failedIcon: {
    marginBottom: 12,
  },
  pendingIcon: {
    marginBottom: 12,
  },
  submittedTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#171817',
    marginBottom: 6,
    textAlign: 'center',
  },
  submittedSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#77766F',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  badgeWrapper: {
    width: '100%',
    marginBottom: 18,
  },
  verifiedBenefitsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 229, 223, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(51, 70, 60, 0.25)',
    borderRadius: RADII.md,
    padding: 12,
    width: '100%',
  },
  verifiedBenefitsText: {
    fontFamily: FONTS.medium,
    flex: 1,
    fontSize: 12,
    color: '#33463C',
    lineHeight: 17,
  },
  failedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    borderRadius: RADII.md,
    padding: 12,
    width: '100%',
  },
  failedNoticeText: {
    fontFamily: FONTS.medium,
    flex: 1,
    fontSize: 12,
    color: '#171817',
    lineHeight: 17,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171817',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: RADII.full,
    marginTop: 18,
    width: '100%',
  },
  refreshBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FBFAF7',
    fontWeight: '700',
  },
  pendingFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.35)',
    borderRadius: RADII.lg,
    padding: 12,
    width: '100%',
    marginTop: 14,
  },
  pendingFeedbackText: {
    fontFamily: FONTS.medium,
    flex: 1,
    fontSize: 12,
    color: '#B99A5E',
    lineHeight: 17,
  },
  repairBox: {
    width: '100%',
    backgroundColor: 'rgba(185, 154, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.30)',
    borderRadius: RADII.xl,
    padding: 16,
    marginVertical: 14,
  },
  repairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  repairTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#B99A5E',
  },
  repairSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#77766F',
    lineHeight: 17,
    marginBottom: 14,
  },
  repairInputGroup: {
    marginBottom: 12,
    width: '100%',
  },
  repairInputLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#171817',
    marginBottom: 6,
  },
  repairTextInput: {
    backgroundColor: '#F1EEE6',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    borderRadius: RADII.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#171817',
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  repairErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(169, 111, 92, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(169, 111, 92, 0.30)',
    borderRadius: RADII.md,
    padding: 10,
    marginBottom: 12,
  },
  repairErrorText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#A96F5C',
    flex: 1,
  },
  repairSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 70, 60, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(51, 70, 60, 0.30)',
    borderRadius: RADII.md,
    padding: 10,
    marginBottom: 12,
  },
  repairSuccessText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#33463C',
    flex: 1,
    lineHeight: 16,
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171817',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADII.full,
    marginTop: 6,
    width: '100%',
  },
  saveProfileBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FBFAF7',
    fontWeight: '700',
  },
});
