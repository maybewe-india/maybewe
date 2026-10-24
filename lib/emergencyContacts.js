/**
 * MaybeWe — Emergency Contacts Service
 * CRUD operations for the private safety circle.
 * RLS: strictly visible only to the owning user (auth.uid() = user_id).
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fetch all emergency contacts for the authenticated user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getEmergencyContacts(userId) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('id, contact_name, phone_number, relationship, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch emergency contacts: ${error.message}`);
  return data || [];
}

/**
 * Add a new emergency contact.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.contactName
 * @param {string} params.phoneNumber
 * @param {string} [params.relationship]
 * @returns {Promise<Object>}
 */
export async function addEmergencyContact({ userId, contactName, phoneNumber, relationship }) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert([{
      user_id: userId,
      contact_name: contactName,
      phone_number: phoneNumber,
      relationship: relationship || null,
    }])
    .select('id, contact_name, phone_number, relationship, created_at')
    .single();

  if (error) throw new Error(`Failed to add emergency contact: ${error.message}`);
  return data;
}

/**
 * Update an existing emergency contact (must belong to userId).
 *
 * @param {string} contactId
 * @param {string} userId
 * @param {Object} updates - { contactName, phoneNumber, relationship }
 * @returns {Promise<Object>}
 */
export async function updateEmergencyContact(contactId, userId, updates) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const payload = {};
  if (updates.contactName !== undefined) payload.contact_name = updates.contactName;
  if (updates.phoneNumber !== undefined) payload.phone_number = updates.phoneNumber;
  if (updates.relationship !== undefined) payload.relationship = updates.relationship;

  const { data, error } = await supabase
    .from('emergency_contacts')
    .update(payload)
    .eq('id', contactId)
    .eq('user_id', userId)
    .select('id, contact_name, phone_number, relationship, created_at')
    .single();

  if (error) throw new Error(`Failed to update emergency contact: ${error.message}`);
  return data;
}

/**
 * Delete an emergency contact (must belong to userId).
 *
 * @param {string} contactId
 * @param {string} userId
 */
export async function deleteEmergencyContact(contactId, userId) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete emergency contact: ${error.message}`);
}

export default {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
};
