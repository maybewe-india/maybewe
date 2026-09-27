// MaybeWe Face-Only Verification Service
// Google Cloud Vision FACE_DETECTION evaluation and Edge Function invocation.
// Rules:
// - Exactly 1 face -> VERIFIED
// - 0 faces -> FAILED ("No face detected. Please upload a clear photo showing your face.")
// - >1 faces -> FAILED ("Multiple faces detected. Please upload a photo with only you visible.")
// - Zero TypeScript, Zero client-side Google API keys or service-role keys.

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

/**
 * Pure deterministic face detection decision evaluator.
 * Maps detected face count to verification decision and user message.
 * @param {number} faceCount - Number of human faces detected by Google Vision
 * @returns {{ success: boolean, status: string, faceCount: number, message?: string, error?: string }}
 */
export function evaluateFaceCount(faceCount) {
  const count = typeof faceCount === 'number' ? faceCount : 0;

  if (count === 1) {
    return {
      success: true,
      status: 'verified',
      faceCount: 1,
      message: 'Face verified successfully. Welcome to MaybeWe!',
    };
  }

  if (count === 0) {
    return {
      success: false,
      status: 'failed',
      faceCount: 0,
      error: 'No face detected. Please upload a clear photo showing your face.',
    };
  }

  return {
    success: false,
    status: 'failed',
    faceCount: count,
    error: 'Multiple faces detected. Please upload a photo with only you visible.',
  };
}

/**
 * Invokes the server-side 'validate-selfie' Edge Function to analyze the user's selfie.
 * The Edge Function runs with JWT authentication and service-role execution of process_verification_decision.
 *
 * @param {Object} params
 * @param {string} params.selfiePath - Storage path in private verification-selfies bucket (e.g. userId/selfie_123.jpg)
 * @param {Object} [params.client] - Supabase client instance (defaults to shared client)
 * @returns {Promise<{ success: boolean, status: string, faceCount?: number, error?: string, message?: string }>}
 */
export async function invokeValidateSelfie(params) {
  const selfiePath = typeof params === 'string' ? params : params?.selfiePath;
  const client = params?.client || supabase;

  if (!selfiePath) {
    return {
      success: false,
      status: 'failed',
      error: 'Please capture a selfie before validating.',
    };
  }

  // Stock / placeholder guard
  if (selfiePath.includes('unsplash.com') || selfiePath.includes('placeholder')) {
    return {
      success: false,
      status: 'failed',
      error: 'Stock photos or placeholder images cannot be submitted. Please capture an authentic selfie.',
    };
  }

  if (!isSupabaseConfigured) {
    // Isolated offline simulation fallback only when Supabase is completely unconfigured
    return {
      success: false,
      status: 'failed',
      error: 'Verification service is offline. Please check your Supabase configuration.',
    };
  }

  try {
    const { data, error } = await client.functions.invoke('validate-selfie', {
      body: { selfiePath },
    });

    if (error) {
      console.warn('Edge function invoke error:', error);
      // Attempt to extract structured error from response if available
      let errorMsg = error.message || 'Face verification service unavailable. Please retry.';
      return {
        success: false,
        status: 'failed',
        error: errorMsg,
      };
    }

    if (!data) {
      return {
        success: false,
        status: 'failed',
        error: 'No response from verification server. Please retry.',
      };
    }

    if (data.success && data.status === 'verified') {
      return {
        success: true,
        status: 'verified',
        faceCount: 1,
        message: data.message || 'Face verified successfully. Welcome to MaybeWe!',
      };
    }

    // Process face count decision if returned
    if (typeof data.faceCount === 'number') {
      return evaluateFaceCount(data.faceCount);
    }

    return {
      success: false,
      status: data.status || 'failed',
      error: data.error || 'Face verification could not confirm your selfie. Please retry.',
    };
  } catch (err) {
    console.error('Network or invocation error calling validate-selfie:', err);
    return {
      success: false,
      status: 'failed',
      error: err.message || 'Network error during verification. Please check your connection and retry.',
    };
  }
}

export default {
  evaluateFaceCount,
  invokeValidateSelfie,
};
