// ============================================================================
// MAYBEWE IDENTITY VERIFICATION SERVICE (lib/verification.js)
// Production identity document submission & status tracking
// Zero TypeScript, Pure JavaScript
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VERIFICATION_STORAGE_KEY = '@maybewe_verification_submission';

/**
 * Upload binary file to private verification-documents bucket
 */
async function uploadVerificationFile(userId, uri, prefix = 'doc') {
  if (!uri) throw new Error('File URI is required');
  const timestamp = Date.now();
  const ext = uri.includes('.png') ? 'png' : 'jpg';
  const filePath = `${userId}/${prefix}_${timestamp}.${ext}`;

  let fileData;
  if (typeof fetch === 'function') {
    const response = await fetch(uri);
    fileData = await response.blob();
  } else {
    fileData = uri;
  }

  const { data, error } = await supabase.storage
    .from('verification-documents')
    .upload(filePath, fileData, {
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload verification media: ${error.message}`);
  }

  return filePath;
}

/**
 * Submit identity verification package
 * @param {Object} params
 * @param {string} params.userId
 * @param {'passport'|'driving_license'|'national_id'} params.documentType
 * @param {string} params.documentFrontUri
 * @param {string} params.selfieUri
 */
export async function submitVerificationDocument({
  userId,
  documentType,
  documentFrontUri,
  selfieUri,
}) {
  if (!userId) throw new Error('User ID is required');
  if (!documentType || !['passport', 'driving_license', 'national_id'].includes(documentType)) {
    throw new Error('Valid document_type is required (passport, driving_license, or national_id)');
  }
  if (!documentFrontUri) throw new Error('Front document image is required');
  if (!selfieUri) throw new Error('Verification selfie is required');

  let documentFrontUrl = documentFrontUri;
  let selfieUrl = selfieUri;

  if (isSupabaseConfigured) {
    // 1. Upload both media files to private verification-documents storage bucket
    documentFrontUrl = await uploadVerificationFile(userId, documentFrontUri, 'doc_front');
    selfieUrl = await uploadVerificationFile(userId, selfieUri, 'selfie');

    // 2. Insert record into verification_submissions
    const { data: subData, error: subError } = await supabase
      .from('verification_submissions')
      .insert([
        {
          user_id: userId,
          document_type: documentType,
          document_front_url: documentFrontUrl,
          selfie_url: selfieUrl,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (subError) {
      throw new Error(`Database verification submission error: ${subError.message}`);
    }

    // 3. Update public.users status to 'pending'
    await supabase
      .from('users')
      .update({
        verification_status: 'pending',
        verification_rejection_reason: null,
      })
      .eq('id', userId);

    return {
      success: true,
      submission: subData,
    };
  }

  // Offline / Demo fallback
  const mockSub = {
    id: `sub-${Date.now()}`,
    user_id: userId,
    document_type: documentType,
    document_front_url: documentFrontUrl,
    selfie_url: selfieUrl,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(mockSub));
  return { success: true, submission: mockSub };
}

/**
 * Fetch latest verification submission for user
 */
export async function fetchUserVerification(userId) {
  if (!userId) return null;

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('verification_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching verification submission:', error.message);
      return null;
    }
    return data;
  }

  try {
    const raw = await AsyncStorage.getItem(VERIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch authoritative verification status from public.users
 */
export async function fetchVerificationStatus(userId) {
  if (!userId) return { status: 'unverified' };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('users')
      .select('verification_status, verified_at, verification_rejection_reason')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user verification status:', error.message);
      return { status: 'unverified' };
    }

    return {
      status: data?.verification_status || 'unverified',
      verifiedAt: data?.verified_at || null,
      rejectionReason: data?.verification_rejection_reason || null,
    };
  }

  return { status: 'unverified' };
}
