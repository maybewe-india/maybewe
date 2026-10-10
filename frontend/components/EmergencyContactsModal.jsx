// ============================================================================
// MAYBEWE EMERGENCY CONTACTS MODAL (components/EmergencyContactsModal.jsx)
// Safety circle & emergency contact management with luxury concierge styling
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PALETTE, RADII, FONTS, SHADOWS } from '../lib/theme';
import { useTheme } from '../lib/themeContext';
import {
  fetchEmergencyContacts,
  createEmergencyContact,
  deleteEmergencyContact,
} from '../lib/emergencyContacts.js';

export default function EmergencyContactsModal({
  visible,
  onClose,
  userId,
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationship, setRelationship] = useState('Family / Friend');

  const loadContacts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await fetchEmergencyContacts(userId);
      setContacts(list || []);
    } catch (err) {
      console.warn('Error loading emergency contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) {
      loadContacts();
      setShowAddForm(false);
    }
  }, [visible, loadContacts]);

  const handleAddContact = async () => {
    if (!contactName.trim()) {
      Alert.alert('Name Required', 'Please enter your emergency contact full name.');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Phone Required', 'Please enter your emergency contact phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const newContact = await createEmergencyContact({
        userId,
        contactName: contactName.trim(),
        phoneNumber: phoneNumber.trim(),
        relationship: relationship.trim(),
      });
      setContacts((prev) => [newContact, ...prev]);
      setContactName('');
      setPhoneNumber('');
      setRelationship('Family / Friend');
      setShowAddForm(false);
      Alert.alert('Contact Added', `${contactName} has been added to your emergency circle.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save emergency contact.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contactId, name) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${name} from your safety circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmergencyContact(contactId);
              setContacts((prev) => prev.filter((c) => c.id !== contactId));
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Unable to Call', 'Please verify your device supports phone dialer.');
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background || '#FAF8F3',
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerEyebrow}>SAFETY CIRCLE • 24/7</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary || '#171817' }]}>
                Emergency Contacts
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceGlass || 'rgba(0,0,0,0.06)' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary || '#171817'} />
            </TouchableOpacity>
          </View>

          {/* Subtitle banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark" size={16} color="#B99A5E" style={{ marginRight: 8 }} />
            <Text style={styles.infoBannerText}>
              Contacts in your safety circle receive instant SMS/SOS updates when travel safety alerts are triggered.
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#B99A5E" />
                <Text style={styles.loadingText}>Loading safety circle...</Text>
              </View>
            ) : (
              <>
                {/* Contact list */}
                {contacts.length === 0 && !showAddForm ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="people-outline" size={44} color="#C8B27A" />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Emergency Contacts Yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Add trusted family members or friends who can be contacted in case of an emergency while traveling.
                    </Text>
                  </View>
                ) : (
                  contacts.map((c) => (
                    <View
                      key={c.id}
                      style={[
                        styles.contactCard,
                        {
                          backgroundColor: colors.cardBackground || '#FFFFFF',
                          borderColor: colors.border || 'rgba(0,0,0,0.08)',
                        },
                      ]}
                    >
                      <View style={styles.contactAvatar}>
                        <Ionicons name="person" size={18} color="#B99A5E" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={[styles.contactName, { color: colors.textPrimary || '#171817' }]}>
                          {c.contact_name}
                        </Text>
                        <Text style={styles.contactRelation}>
                          {c.relationship || 'Emergency Contact'} • {c.phone_number}
                        </Text>
                      </View>
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          onPress={() => handleCall(c.phone_number)}
                          style={styles.callIconBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call-outline" size={16} color="#2E7D32" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(c.id, c.contact_name)}
                          style={styles.deleteIconBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                {/* Add Form / Add Button */}
                {showAddForm ? (
                  <View
                    style={[
                      styles.addFormCard,
                      {
                        backgroundColor: colors.cardBackground || '#FFFFFF',
                        borderColor: '#B99A5E',
                      },
                    ]}
                  >
                    <Text style={styles.formTitle}>Add Trusted Contact</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Contact Full Name"
                      placeholderTextColor="#999"
                      value={contactName}
                      onChangeText={setContactName}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone Number (e.g. +91 98765 43210)"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Relationship (e.g. Parent, Sister, Partner)"
                      placeholderTextColor="#999"
                      value={relationship}
                      onChangeText={setRelationship}
                    />
                    <View style={styles.formBtnRow}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setShowAddForm(false)}
                        disabled={submitting}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleAddContact}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#FAF8F3" />
                        ) : (
                          <Text style={styles.saveBtnText}>Save Contact</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addTriggerBtn}
                    onPress={() => setShowAddForm(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={18} color="#B99A5E" style={{ marginRight: 8 }} />
                    <Text style={styles.addTriggerBtnText}>Add Trusted Emergency Contact</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerEyebrow: {
    fontFamily: FONTS.extraBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#B99A5E',
    fontWeight: '800',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 154, 94, 0.08)',
    borderRadius: RADII.lg,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(185, 154, 94, 0.2)',
  },
  infoBannerText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#756345',
    lineHeight: 17,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#999',
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.xl,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(185, 154, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  contactRelation: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B99A5E',
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: 'rgba(185, 154, 94, 0.04)',
  },
  addTriggerBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#B99A5E',
  },
  addFormCard: {
    borderRadius: RADII.xl,
    borderWidth: 1.5,
    padding: 16,
    marginTop: 8,
  },
  formTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#171817',
    marginBottom: 12,
  },
  input: {
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171817',
    marginBottom: 10,
    backgroundColor: '#FAF8F3',
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADII.lg,
  },
  cancelBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#666',
  },
  saveBtn: {
    backgroundColor: '#171817',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADII.lg,
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FAF8F3',
  },
});
