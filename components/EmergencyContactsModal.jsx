/**
 * MaybeWe — Emergency Contacts Modal
 * Manages the private safety circle: add, edit, delete emergency contacts.
 * All data is private to the authenticated user (RLS enforced at DB level).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, FONTS } from '../lib/theme';
import PrimaryButton from './ui/PrimaryButton';
import InputField from './ui/InputField';
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../lib/emergencyContacts';

const RELATIONSHIPS = ['Parent', 'Sibling', 'Spouse / Partner', 'Friend', 'Colleague', 'Other'];

function ContactForm({ initial = {}, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial.contact_name || '');
  const [phone, setPhone] = useState(initial.phone_number || '');
  const [rel, setRel] = useState(initial.relationship || '');

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a contact name.'); return; }
    if (!phone.trim()) { Alert.alert('Phone required', 'Please enter a phone number.'); return; }
    onSave({ contactName: name.trim(), phoneNumber: phone.trim(), relationship: rel.trim() || null });
  };

  return (
    <View style={styles.formContainer}>
      <InputField
        label="Contact Name"
        placeholder="e.g. Priya Sharma"
        value={name}
        onChangeText={setName}
        style={styles.formField}
      />
      <InputField
        label="Phone Number"
        placeholder="+91 98765 43210"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.formField}
      />
      <Text style={styles.relLabel}>Relationship (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relScroll}>
        {RELATIONSHIPS.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRel(rel === r ? '' : r)}
            style={[styles.relChip, rel === r && styles.relChipActive]}
          >
            <Text style={[styles.relChipText, rel === r && styles.relChipTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.formActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <PrimaryButton
          title={loading ? 'Saving...' : 'Save Contact'}
          onPress={handleSave}
          loading={loading}
          style={styles.saveBtn}
        />
      </View>
    </View>
  );
}

export default function EmergencyContactsModal({ visible, onClose, userId }) {
  const [contacts, setContacts] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);

  const loadContacts = useCallback(async () => {
    if (!userId) return;
    setFetching(true);
    try {
      const data = await getEmergencyContacts(userId);
      setContacts(data);
    } catch (err) {
      console.warn('Failed to load emergency contacts:', err.message);
    } finally {
      setFetching(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) loadContacts();
  }, [visible, loadContacts]);

  const handleAdd = async (fields) => {
    setSaving(true);
    try {
      const newContact = await addEmergencyContact({ userId, ...fields });
      setContacts((prev) => [...prev, newContact]);
      setMode('list');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (fields) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const updated = await updateEmergencyContact(editTarget.id, userId, fields);
      setContacts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setMode('list');
      setEditTarget(null);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (contact) => {
    const doDelete = async () => {
      try {
        await deleteEmergencyContact(contact.id, userId);
        setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      } catch (err) {
        Alert.alert('Error', err.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${contact.contact_name} from your safety circle?`)) doDelete();
    } else {
      Alert.alert(
        'Remove Contact',
        `Remove ${contact.contact_name} from your safety circle?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleClose = () => {
    setMode('list');
    setEditTarget(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="shield-half" size={20} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Safety Circle</Text>
              <Text style={styles.subtitle}>
                {mode === 'list'
                  ? `${contacts.length} emergency contact${contacts.length !== 1 ? 's' : ''}`
                  : mode === 'add' ? 'Add new contact' : 'Edit contact'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {mode === 'list' ? (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {fetching ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
              ) : contacts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No emergency contacts</Text>
                  <Text style={styles.emptyDesc}>
                    Add trusted people who should be reached in an emergency.
                  </Text>
                </View>
              ) : (
                contacts.map((contact) => (
                  <View key={contact.id} style={styles.contactCard}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarLetter}>
                        {contact.contact_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.contact_name}</Text>
                      <Text style={styles.contactPhone}>{contact.phone_number}</Text>
                      {contact.relationship && (
                        <Text style={styles.contactRel}>{contact.relationship}</Text>
                      )}
                    </View>
                    <View style={styles.contactActions}>
                      <TouchableOpacity
                        onPress={() => { setEditTarget(contact); setMode('edit'); }}
                        style={styles.contactActionBtn}
                      >
                        <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(contact)}
                        style={[styles.contactActionBtn, { marginTop: 6 }]}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <ContactForm
                initial={mode === 'edit' ? editTarget : {}}
                onSave={mode === 'add' ? handleAdd : handleEdit}
                onCancel={() => { setMode('list'); setEditTarget(null); }}
                loading={saving}
              />
            </ScrollView>
          )}

          {/* Footer */}
          {mode === 'list' && (
            <View style={styles.footer}>
              <PrimaryButton
                title="Add Emergency Contact"
                onPress={() => setMode('add')}
                leftIcon={<Ionicons name="add-circle-outline" size={18} color="#FFF" />}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 21, 34, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
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
    backgroundColor: 'rgba(72, 199, 142, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: { padding: 6 },
  body: { padding: 20 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  contactPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  contactRel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  contactActions: { alignItems: 'center' },
  contactActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  formContainer: { paddingBottom: 20 },
  formField: { marginBottom: 12 },
  relLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  relScroll: { marginBottom: 16 },
  relChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  relChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  relChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  relChipTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: { flex: 2 },
});
