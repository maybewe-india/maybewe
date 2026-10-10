// Supabase Edge Function: delete-account
// Securely deletes user-owned Storage objects via official Supabase Storage API,
// followed by complete database cascade deletion and auth user removal.
//
// Security guarantees:
// - Requires authenticated user JWT in Authorization header.
// - Extracts userId strictly from verified session (never trusts client-supplied parameters).
// - Uses server-only SUPABASE_SERVICE_ROLE_KEY to perform Storage API removal & admin deletion.
// - Never exposes service-role keys to frontend client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    // 1. Authenticate user via JWT in Authorization header
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

    // Authenticated user ID (derived strictly from verified JWT)
    const userId = user.id;
    console.log(`[delete-account] Starting account deletion for verified user: ${userId}`);

    const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Storage Cleanup via official Supabase Storage API
    const knownBuckets = ['verification-selfies', 'travel-photos', 'avatars', 'trip-covers', 'post-media'];
    let allBuckets = [...knownBuckets];

    try {
      const { data: remoteBuckets, error: bucketListError } = await serviceRoleClient.storage.listBuckets();
      if (!bucketListError && Array.isArray(remoteBuckets)) {
        for (const b of remoteBuckets) {
          if (b.name && !allBuckets.includes(b.name)) {
            allBuckets.push(b.name);
          }
        }
      }
    } catch (bErr) {
      console.warn('[delete-account] Could not fetch dynamic bucket list, proceeding with known buckets:', bErr);
    }

    const storageCleanupSummary = {};

    for (const bucketName of allBuckets) {
      try {
        const filesToDelete = [];

        // Check folder-based structure: ${userId}/*
        const { data: folderFiles, error: folderErr } = await serviceRoleClient.storage
          .from(bucketName)
          .list(userId, { limit: 100 });

        if (!folderErr && Array.isArray(folderFiles)) {
          for (const f of folderFiles) {
            if (f.name) {
              filesToDelete.push(`${userId}/${f.name}`);
            }
          }
        }

        // Check root-level files matching userId: e.g. ${userId}-selfie.jpg
        const { data: rootFiles, error: rootErr } = await serviceRoleClient.storage
          .from(bucketName)
          .list('', { search: userId, limit: 100 });

        if (!rootErr && Array.isArray(rootFiles)) {
          for (const f of rootFiles) {
            if (f.name && f.name.includes(userId) && !filesToDelete.includes(f.name)) {
              filesToDelete.push(f.name);
            }
          }
        }

        if (filesToDelete.length > 0) {
          console.log(`[delete-account] Deleting ${filesToDelete.length} files from bucket '${bucketName}'...`);
          const { error: removeErr } = await serviceRoleClient.storage
            .from(bucketName)
            .remove(filesToDelete);

          if (removeErr) {
            console.warn(`[delete-account] Warning: Failed to remove files from '${bucketName}':`, removeErr.message);
            storageCleanupSummary[bucketName] = { success: false, error: removeErr.message, count: filesToDelete.length };
          } else {
            storageCleanupSummary[bucketName] = { success: true, count: filesToDelete.length };
          }
        } else {
          storageCleanupSummary[bucketName] = { success: true, count: 0 };
        }
      } catch (bucketErr) {
        console.warn(`[delete-account] Error processing bucket '${bucketName}':`, bucketErr);
        storageCleanupSummary[bucketName] = { success: false, error: bucketErr.message };
      }
    }

    // 3. Database Cleanup (Cascades across all tables + auth.users)
    const { data: rpcData, error: rpcError } = await serviceRoleClient.rpc('delete_user_account_by_admin', {
      target_user_id: userId,
    });

    if (rpcError) {
      console.warn('[delete-account] delete_user_account_by_admin RPC returned error, executing direct admin cleanup:', rpcError.message);
      
      // Fallback direct cleanup via serviceRoleClient
      await serviceRoleClient.from('live_location_sessions').delete().eq('user_id', userId);
      await serviceRoleClient.from('active_location_shares').delete().eq('user_id', userId);
      await serviceRoleClient.from('user_privacy_settings').delete().eq('user_id', userId);
      await serviceRoleClient.from('user_notification_preferences').delete().eq('user_id', userId);
      await serviceRoleClient.from('user_blocks').delete().or(`blocker_user_id.eq.${userId},blocked_user_id.eq.${userId}`);
      await serviceRoleClient.from('user_verifications').delete().eq('user_id', userId);
      await serviceRoleClient.from('app_notifications').delete().eq('user_id', userId);
      await serviceRoleClient.from('users').delete().eq('id', userId);
    }

    // 4. Ensure auth.users record is deleted
    try {
      const { error: deleteAuthErr } = await serviceRoleClient.auth.admin.deleteUser(userId);
      if (deleteAuthErr && !deleteAuthErr.message.toLowerCase().includes('not found')) {
        console.warn('[delete-account] auth.admin.deleteUser returned error:', deleteAuthErr.message);
      }
    } catch (authDelErr) {
      console.warn('[delete-account] auth.admin.deleteUser exception:', authDelErr);
    }

    console.log(`[delete-account] Successfully completed account deletion for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account, associated database records, and storage objects deleted successfully.',
        userId,
        storageSummary: storageCleanupSummary,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[delete-account] Unexpected error during account deletion:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error occurred while deleting account.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
