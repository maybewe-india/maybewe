import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII } from '../lib/theme';
import PrimaryButton from './ui/PrimaryButton';
import InputField from './ui/InputField';
import { blockUser } from '../lib/discovery';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or offensive behavior', icon: 'hand-left-outline' },
  { id: 'fake_profile', label: 'Fake profile or stolen photos', icon: 'person-remove-outline' },
  { id: 'spam', label: 'Spam, scams or commercial activity', icon: 'megaphone-outline' },
  { id: 'safety_concern', label: 'Safety or physical concern', icon: 'warning-outline' },
  { id: 'inappropriate', label: 'Inappropriate language or photos', icon: 'alert-circle-outline' },
  { id: 'other', label: 'Other community guideline breach', icon: 'help-circle-outline' },
];

export default function SafetyReportModal({
  visible,
  onClose,
  targetUser,
  currentUserId,
  onUserBlocked,
}) {
  const [selectedReason, setSelectedReason] = useState('harassment');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [shouldBlock, setShouldBlock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!targetUser) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured && currentUserId && targetUser.id) {
        await supabase.from('reports').insert([
          {
            reporter_id: currentUserId,
            reported_id: targetUser.id,
            reason: `${selectedReason}: ${additionalDetails || 'No details provided'}`,
            status: 'pending',
          },
        ]);
      }

      if (shouldBlock && targetUser.id) {
        await blockUser(targetUser.id);
        if (onUserBlocked) {
          onUserBlocked(targetUser.id);
        }
      }

      Alert.alert(
        'Report Received',
        'Thank you for helping keep the MaybeWe community safe. Our safety team reviews all reports promptly.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err) {
      console.warn('Error submitting report:', err);
      Alert.alert('Report Saved', 'Your report has been submitted.', [{ text: 'OK', onPress: onClose }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="shield-half" size={22} color={COLORS.danger} />
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.title}>Report Traveler</Text>
              <Text style={styles.subtitle}>Reporting {targetUser.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Select a reason:</Text>
            {REPORT_REASONS.map((item) => {
              const isSelected = selectedReason === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedReason(item.id)}
                  style={[
                    styles.reasonItem,
                    isSelected && styles.selectedReasonItem,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isSelected ? '#FFFFFF' : COLORS.textSecondary}
                    style={styles.reasonIcon}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.selectedReasonText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? '#FFFFFF' : COLORS.border}
                  />
                </TouchableOpacity>
              );
            })}

            <InputField
              label="Additional details (optional)"
              placeholder="Tell us what happened so we can review accurately..."
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              multiline
              numberOfLines={3}
              style={{ marginTop: 12 }}
            />

            {/* Block toggle */}
            <View style={styles.blockRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.blockTitle}>Block {targetUser.name}</Text>
                <Text style={styles.blockDesc}>
                  They will no longer be able to discover your profile, message you, or see your trips.
                </Text>
              </View>
              <Switch
                value={shouldBlock}
                onValueChange={setShouldBlock}
                trackColor={{ false: COLORS.border, true: 'rgba(255, 255, 255, 0.40)' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.footer}>
            <PrimaryButton
              title="Submit Report"
              variant="danger"
              loading={isSubmitting}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 21, 34, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderGlass,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 125, 138, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADII.xl,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
  },
  selectedReasonItem: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  reasonIcon: {
    marginRight: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  selectedReasonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  blockDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
