// ============================================================================
// MAYBEWE EMERGENCY CONTACTS SERVICE (lib/emergencyContacts.js)
// Production safety circle & emergency contact management
// Zero TypeScript, Pure JavaScript
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_STORAGE_KEY = '@maybewe_emergency_contacts';

/**
 * Fetch emergency contacts for authenticated user
 */
export async function fetchEmergencyContacts(userId) {
  if (!userId) return [];

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching emergency contacts from Supabase:', error.message);
      return [];
    }
    return data || [];
  }

  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Add new emergency contact
 */
export async function createEmergencyContact({
  userId,
  contactName,
  phoneNumber,
  relationship = 'Friend / Family',
}) {
  if (!userId) throw new Error('User ID is required');
  if (!contactName || !contactName.trim()) throw new Error('Contact name is required');
  if (!phoneNumber || !phoneNumber.trim()) throw new Error('Phone number is required');

  const contactData = {
    user_id: userId,
    contact_name: contactName.trim(),
    phone_number: phoneNumber.trim(),
    relationship: (relationship || '').trim(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([contactData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save emergency contact: ${error.message}`);
    }
    return data;
  }

  const localContact = {
    id: `ec-${Date.now()}`,
    ...contactData,
    created_at: new Date().toISOString(),
  };
  const existing = await fetchEmergencyContacts(userId);
  existing.unshift(localContact);
  await AsyncStorage.setItem(EMERGENCY_STORAGE_KEY, JSON.stringify(existing));
  return localContact;
}

/**
 * Update existing emergency contact
 */
export async function updateEmergencyContact(contactId, updates) {
  if (!contactId) throw new Error('Contact ID is required');

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update emergency contact: ${error.message}`);
    }
    return data;
  }

  return { id: contactId, ...updates };
}

/**
 * Delete emergency contact
 */
export async function deleteEmergencyContact(contactId) {
  if (!contactId) throw new Error('Contact ID is required');

  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      throw new Error(`Failed to delete emergency contact: ${error.message}`);
    }
    return true;
  }

  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((c) => c.id !== contactId);
    await AsyncStorage.setItem(EMERGENCY_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    return false;
  }
}
