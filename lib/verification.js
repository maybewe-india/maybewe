/**
 * MaybeWe — Verification Service
 * Handles identity document uploads and submission tracking.
 * Storage: private `verification-documents` bucket (folder = auth.uid())
 * Table: public.verification_submissions
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Upload a document or selfie to the private verification-documents bucket.
 * Enforces folder isolation: files go to `{uid}/{filename}`.
 *
 * @param {string} userId - The authenticated user's UUID
 * @param {'document' | 'selfie'} fileType - Type of file
 * @param {Blob | File | ArrayBuffer} fileBlob - The binary content
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @returns {Promise<{ path: string, publicUrl: null }>}
 *   Returns the storage path (no public URL — private bucket)
 */
export async function uploadVerificationFile(userId, fileType, fileBlob, mimeType = 'image/jpeg') {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  if (!userId) throw new Error('userId required');

  const timestamp = Date.now();
  const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1] || 'jpg';
  const fileName = `${fileType}_${timestamp}.${ext}`;
  const storagePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('verification-documents')
    .upload(storagePath, fileBlob, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return { path: data.path };
}

/**
 * Submit a verification request to the database.
 * Sets user's verification_status to 'pending'.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {'passport'|'driving_license'|'national_id'} params.documentType
 * @param {string} params.documentFrontPath - storage path from uploadVerificationFile
 * @param {string} params.selfiePath - storage path from uploadVerificationFile
 * @returns {Promise<{ id: string, status: string }>}
 */
export async function submitVerificationRequest({ userId, documentType, documentFrontPath, selfiePath }) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  // Insert submission record
  const { data: submission, error: subError } = await supabase
    .from('verification_submissions')
    .insert([{
      user_id: userId,
      document_type: documentType,
      document_front_url: documentFrontPath,
      selfie_url: selfiePath,
      status: 'pending',
    }])
    .select('id, status')
    .single();

  if (subError) throw new Error(`Submission failed: ${subError.message}`);

  // Update user's verification_status to 'pending'
  const { error: userError } = await supabase
    .from('users')
    .update({ verification_status: 'pending' })
    .eq('id', userId);

  if (userError) {
    console.warn('Warning: Could not update user verification_status:', userError.message);
  }

  return submission;
}

/**
 * Fetch the current user's latest verification submission.
 *
 * @param {string} userId
 * @returns {Promise<Object | null>}
 */
export async function getVerificationStatus(userId) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('verification_submissions')
    .select('id, document_type, status, submitted_at, reviewed_at, rejection_reason')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch verification status: ${error.message}`);
  return data;
}

/**
 * Delete a pending verification submission and its associated storage files.
 * Only works for 'pending' submissions (approved/rejected are admin-owned).
 *
 * @param {string} submissionId
 * @param {string} userId
 * @param {string[]} storagePaths - paths to delete from storage
 */
export async function cancelVerificationSubmission(submissionId, userId, storagePaths = []) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');

  // Delete submission from DB
  const { error } = await supabase
    .from('verification_submissions')
    .delete()
    .eq('id', submissionId)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(`Cancel failed: ${error.message}`);

  // Clean up storage files (best effort)
  if (storagePaths.length > 0) {
    await supabase.storage.from('verification-documents').remove(storagePaths);
  }

  // Reset user status to 'unverified'
  await supabase
    .from('users')
    .update({ verification_status: 'unverified' })
    .eq('id', userId);
}

export default {
  uploadVerificationFile,
  submitVerificationRequest,
  getVerificationStatus,
  cancelVerificationSubmission,
};
