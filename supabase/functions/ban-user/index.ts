import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env not configured');
    return jsonResponse({ error: 'Service not configured' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { userId, email, reason, expiresAt, createdBy } = body || {};

    if (!userId && !email) {
      return jsonResponse({ error: 'userId or email is required' }, 400);
    }

    // Resolve user by email if needed
    let resolvedUserId = userId;
    let resolvedEmail = email;

    if (!resolvedUserId && resolvedEmail) {
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', resolvedEmail)
        .single();
      if (userErr) {
        console.error('Error resolving user by email:', userErr);
        return jsonResponse({ error: 'User not found for provided email' }, 404);
      }
      resolvedUserId = userRow.id;
      resolvedEmail = userRow.email;
    }

    // Upsert banned_users entry
    const { error: banError } = await supabase
      .from('banned_users')
      .upsert({
        user_id: resolvedUserId,
        email: resolvedEmail,
        reason: reason || null,
        expires_at: expiresAt || null,
        created_by: createdBy || 'admin',
      }, { onConflict: 'user_id' });

    if (banError) {
      console.error('Error upserting ban:', banError);
      return jsonResponse({ error: 'Failed to ban user' }, 500);
    }

    // Mark user as banned for fast checks
    if (resolvedUserId) {
      const { error: flagError } = await supabase
        .from('users')
        .update({ is_banned: true })
        .eq('id', resolvedUserId);
      if (flagError) {
        console.error('Error flagging user as banned:', flagError);
      }
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error('Unexpected error in ban-user:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

