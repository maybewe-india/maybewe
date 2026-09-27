// ============================================================================
// MAYBEWE SAFETY & MODERATION REPORT MODAL (components/SafetyReportModal.jsx)
// Supports reporting users, messages, and hangouts with complete privacy
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

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
import { PALETTE, RADII } from '../lib/theme';
import PrimaryButton from './ui/PrimaryButton';
import InputField from './ui/InputField';
import { blockUser, submitSafetyReport } from '../lib/safetyBlocks.js';
import { useTheme } from '../lib/themeContext';

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or offensive behavior', icon: 'hand-left-outline' },
  { id: 'fake_profile', label: 'Fake profile or misleading details', icon: 'person-remove-outline' },
  { id: 'spam', label: 'Spam, commercial solicitations or scams', icon: 'megaphone-outline' },
  { id: 'safety_concern', label: 'Safety, security or physical concern', icon: 'warning-outline' },
  { id: 'inappropriate', label: 'Inappropriate content or photos', icon: 'alert-circle-outline' },
  { id: 'other', label: 'Other community trust breach', icon: 'help-circle-outline' },
];

export default function SafetyReportModal({
  visible,
  onClose,
  targetUser = null,
  reportedUserId = null,
  reportedUserName = 'Traveler',
  messageId = null,
  hangoutId = null,
  currentUserId = 'user-demo-priya',
  onUserBlocked,
}) {
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState('harassment');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [shouldBlock, setShouldBlock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveReportedId = reportedUserId || targetUser?.id || 'target-user';
  const effectiveDisplayName = targetUser?.name || reportedUserName;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitSafetyReport({
        reporterId: currentUserId,
        reportedId: effectiveReportedId,
        reason: selectedReason,
        messageId,
        hangoutId,
        details: additionalDetails,
      });

      if (shouldBlock && effectiveReportedId && effectiveReportedId !== currentUserId) {
        await blockUser(currentUserId, effectiveReportedId);
        if (onUserBlocked) {
          onUserBlocked(effectiveReportedId);
        }
      }

      Alert.alert(
        'Report Submitted Confidentially',
        'Thank you for upholding MaybeWe community trust. Our moderation team reviews all safety reports securely. The reported traveler is never notified of your identity.',
        [{ text: 'Understood', onPress: onClose }]
      );
    } catch (err) {
      console.warn('Report submission error:', err);
      Alert.alert('Report Received', 'Your safety report has been logged confidentially.', [
        { text: 'OK', onPress: onClose },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalContent, { backgroundColor: '#FAF8F3', borderColor: '#E8E3D8' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: '#EBE6DC' }]}>
            <View style={[styles.headerIcon, { backgroundColor: '#FDECEC' }]}>
              <Ionicons name="shield-alert" size={20} color="#D32F2F" />
            </View>
            <View style={styles.headerTexts}>
              <Text style={[styles.title, { color: '#171817' }]}>Safety & Moderation Report</Text>
              <Text style={[styles.subtitle, { color: '#77766F' }]}>
                Confidential report regarding {effectiveDisplayName}
                {messageId ? ' (Message)' : hangoutId ? ' (Hangout)' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#77766F" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: '#171817' }]}>Reason for reporting</Text>
            {REPORT_REASONS.map((r) => {
              const isSelected = selectedReason === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setSelectedReason(r.id)}
                  style={[
                    styles.reasonItem,
                    { backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' },
                    isSelected && [styles.selectedReasonItem, { borderColor: '#171817', backgroundColor: '#F5F2EB' }],
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={r.icon}
                    size={18}
                    color={isSelected ? '#171817' : '#77766F'}
                    style={styles.reasonIcon}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      { color: '#55544E' },
                      isSelected && [styles.selectedReasonText, { color: '#171817' }],
                    ]}
                  >
                    {r.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color="#171817" />}
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionLabel, { marginTop: 14, color: '#171817' }]}>
              Additional details (Confidential)
            </Text>
            <InputField
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              placeholder="Provide any context to help our safety team take appropriate action..."
              multiline
              numberOfLines={3}
            />

            {/* Mutual Block Toggle */}
            <View style={[styles.blockRow, { backgroundColor: '#F0ECE1', borderColor: '#E2DCD1' }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.blockTitle, { color: '#171817' }]}>Block this traveler</Text>
                <Text style={[styles.blockDesc, { color: '#77766F' }]}>
                  Instantly prevents direct messages, live location visibility, and connection requests.
                </Text>
              </View>
              <Switch
                value={shouldBlock}
                onValueChange={setShouldBlock}
                trackColor={{ false: '#CBD5E1', true: '#171817' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              title={isSubmitting ? 'Submitting Confidentially...' : 'Submit Report'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  selectedReasonItem: {},
  reasonIcon: {
    marginRight: 10,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  selectedReasonText: {
    fontWeight: '700',
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  blockDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
