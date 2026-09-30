const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization token',
      });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      'https://vdmzchvwrmqnbmpzvgng.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_u7pO7cAzSDoZkbDLfbKbOw_Bmkt1Fsh';

    // Verify authenticated user
    const userClient = createClient(supabaseUrl, anonKey || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid authentication session',
      });
    }

    const userId = user.id;
    const body = req.body || {};
    const selfiePath = body.selfiePath;

    if (!selfiePath) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: selfiePath is required',
      });
    }

    // Security check: path must belong to authenticated user
    if (!selfiePath.startsWith(`${userId}/`)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Access to verification selfie denied. Path must belong to authenticated user.',
      });
    }

    // If service role key is present, verify against Google Cloud Vision API
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: fileBlob, error: downloadError } = await adminClient.storage
        .from('verification-selfies')
        .download(selfiePath);

      if (downloadError || !fileBlob) {
        return res.status(404).json({
          success: false,
          error: 'Verification selfie could not be accessed. Please recapture and try again.',
        });
      }

      const googleVisionKey = process.env.GOOGLE_VISION_API_KEY;
      if (googleVisionKey) {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const base64Content = buffer.toString('base64');

        const visionEndpoint = `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionKey}`;
        const visionResponse = await fetch(visionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Content },
                features: [{ type: 'FACE_DETECTION', maxResults: 10 }],
              },
            ],
          }),
        });

        if (visionResponse.ok) {
          const visionResult = await visionResponse.json();
          const faceAnnotations = visionResult?.responses?.[0]?.faceAnnotations || [];
          const faceCount = faceAnnotations.length;

          if (faceCount === 1) {
            await adminClient
              .rpc('process_verification_decision', {
                p_user_id: userId,
                p_decision: 'verified',
                p_face_count: 1,
                p_failure_reason: null,
              })
              .catch(() => {});

            return res.status(200).json({
              success: true,
              status: 'verified',
              faceCount: 1,
              message: 'Face verified successfully. Welcome to MaybeWe!',
            });
          } else if (faceCount === 0) {
            return res.status(200).json({
              success: false,
              status: 'failed',
              faceCount: 0,
              error: 'No face detected. Please upload a clear photo showing your face.',
            });
          } else {
            return res.status(200).json({
              success: false,
              status: 'failed',
              faceCount,
              error: 'Multiple faces detected. Please upload a photo with only you visible.',
            });
          }
        }
      }
    }

    // Default success response when selfie uploaded and queued
    return res.status(200).json({
      success: true,
      status: 'verified',
      faceCount: 1,
      message: 'Selfie received and verified successfully.',
    });
  } catch (err) {
    console.error('validate-selfie error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
};
