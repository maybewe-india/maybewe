// Supabase Edge Function: validate-selfie
// Validates a user's verification selfie using Google Cloud Vision FACE_DETECTION.
// Decision rules:
// - Exactly 1 face -> VERIFIED (calls process_verification_decision with 'verified')
// - 0 faces -> FAILED ("No face detected. Please upload a clear photo showing your face.")
// - >1 faces -> FAILED ("Multiple faces detected. Please upload a photo with only you visible.")
//
// Security guarantees:
// - Requires authenticated user JWT in Authorization header.
// - Extracts user_id from verified JWT (never trusts client-supplied user_id).
// - Only accesses files in private 'verification-selfies' bucket starting with user_id.
// - Downloads image server-side via Supabase service-role client.
// - Never exposes GOOGLE_VISION_API_KEY to client.
// - Never makes verification-selfies bucket public.
// - Client cannot directly set verification_status to verified.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper: convert ArrayBuffer to Base64 without call stack overflow
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing or invalid Authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      return new Response(
        JSON.stringify({ success: false, error: 'Internal server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token with Supabase Auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.warn('Auth verification failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid authentication session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticated user ID (never trust client-supplied user_id)
    const userId = user.id;

    // 2. Parse request body
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty or non-JSON body is acceptable if selfiePath is looked up from DB
    }

    // 3. Determine selfie storage path
    const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey);
    let targetPath = body?.selfiePath;

    if (!targetPath) {
      const { data: verifRow } = await serviceRoleClient
        .from('user_verifications')
        .select('selfie_path')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      targetPath = verifRow?.selfie_path;
    }

    // 4. Security check: User can ONLY validate their own selfie
    if (!targetPath || !targetPath.startsWith(`${userId}/`)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden: Access to verification selfie denied. Path must belong to authenticated user.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Download selfie from private 'verification-selfies' bucket
    const { data: fileBlob, error: downloadError } = await serviceRoleClient.storage
      .from('verification-selfies')
      .download(targetPath);

    if (downloadError || !fileBlob) {
      console.warn('Failed to download verification selfie:', downloadError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Verification selfie could not be accessed. Please recapture and try again.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Check Google Cloud Vision API key
    const googleVisionKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!googleVisionKey) {
      console.error('Server configuration error: GOOGLE_VISION_API_KEY missing from environment');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Face verification service configuration error: Vision API key missing.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Convert image to base64
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64Content = arrayBufferToBase64(arrayBuffer);

    // 8. Call Google Cloud Vision REST API with FACE_DETECTION
    const visionEndpoint = `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionKey}`;
    const visionResponse = await fetch(visionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Content,
            },
            features: [
              {
                type: 'FACE_DETECTION',
                maxResults: 10,
              },
            ],
          },
        ],
      }),
    });

    if (!visionResponse.ok) {
      const errText = await visionResponse.text();
      console.error('Google Vision API returned non-OK status:', visionResponse.status, errText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Face detection service temporarily unavailable (${visionResponse.status}). Please retry.`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visionResult = await visionResponse.json();
    const responses = visionResult?.responses || [];
    const firstRes = responses[0] || {};

    if (firstRes.error) {
      console.error('Google Vision response error:', firstRes.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Image analysis failed: ${firstRes.error.message || 'Unknown vision error'}.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Count detected faces
    const faceAnnotations = firstRes.faceAnnotations || [];
    const faceCount = faceAnnotations.length;

    // Ensure user_verifications record exists
    await serviceRoleClient.from('user_verifications').upsert({
      user_id: userId,
      selfie_path: targetPath,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // 10. Verification Decision Rules
    if (faceCount === 1) {
      // Exactly 1 face -> VERIFIED
      const { error: rpcError } = await serviceRoleClient.rpc('process_verification_decision', {
        p_user_id: userId,
        p_status: 'verified',
        p_review_notes: 'Google Vision face detection: exactly 1 face verified',
      });

      if (rpcError) {
        console.error('Failed to update verification status to verified:', rpcError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to record verification approval in database.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'verified',
          faceCount: 1,
          message: 'Face verified successfully. Welcome to MaybeWe!',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (faceCount === 0) {
      // 0 faces -> FAILED
      await serviceRoleClient.rpc('process_verification_decision', {
        p_user_id: userId,
        p_status: 'failed',
        p_review_notes: 'Google Vision face detection: 0 faces found',
      });

      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          faceCount: 0,
          error: 'No face detected. Please upload a clear photo showing your face.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // More than 1 face -> FAILED
      await serviceRoleClient.rpc('process_verification_decision', {
        p_user_id: userId,
        p_status: 'failed',
        p_review_notes: `Google Vision face detection: multiple (${faceCount}) faces found`,
      });

      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          faceCount,
          error: 'Multiple faces detected. Please upload a photo with only you visible.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('Unhandled validate-selfie exception:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Internal server error: ${err.message || 'Verification failed'}`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
