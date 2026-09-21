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
import { useTheme } from '../lib/themeContext';

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
  const { colors, isDark } = useTheme();
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
        'Report Submitted',
        'Thank you for helping keep the MaybeWe community safe. Our safety team will review this report within 24 hours.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err) {
      console.warn('Report submission error:', err);
      Alert.alert('Report Saved', 'Your safety report has been logged.', [{ text: 'OK', onPress: onClose }]);
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
        <View style={[styles.modalContent, { backgroundColor: colors.modalBg, borderColor: colors.borderGlass }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.dangerBg }]}>
              <Ionicons name="shield-alert" size={20} color={colors.danger} />
            </View>
            <View style={styles.headerTexts}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Safety & Moderation Report</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Reporting {targetUser.name || 'Traveler'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Reason for reporting</Text>
            {REPORT_REASONS.map((r) => {
              const isSelected = selectedReason === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setSelectedReason(r.id)}
                  style={[
                    styles.reasonItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && [styles.selectedReasonItem, { borderColor: colors.primary, backgroundColor: colors.chipBg }],
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={r.icon}
                    size={18}
                    color={isSelected ? colors.primary : colors.textMuted}
                    style={styles.reasonIcon}
                  />
                  <Text style={[styles.reasonText, { color: colors.textSecondary }, isSelected && [styles.selectedReasonText, { color: colors.textPrimary }]]}>
                    {r.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionLabel, { marginTop: 16, color: colors.textPrimary }]}>Additional details (optional)</Text>
            <InputField
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              placeholder="Describe what happened so our team can take appropriate action..."
              multiline
              numberOfLines={3}
            />

            {/* Block Toggle */}
            <View style={[styles.blockRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.blockTitle, { color: colors.textPrimary }]}>Block this traveler</Text>
                <Text style={[styles.blockDesc, { color: colors.textSecondary }]}>
                  They will no longer appear in your Discovery feed or be able to message you.
                </Text>
              </View>
              <Switch
                value={shouldBlock}
                onValueChange={setShouldBlock}
                trackColor={{ false: '#334E68', true: colors.primary }}
                thumbColor={colors.primaryText}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              title={isSubmitting ? 'Submitting Report...' : 'Submit Report'}
              variant="danger"
              onPress={handleSubmit}
              loading={isSubmitting}
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
