import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase env not configured');
    return jsonResponse({ error: 'Service not configured' }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Check users.is_banned first (fast path)
    const { data: userRow, error: userRowError } = await supabase
      .from('users')
      .select('is_banned, email')
      .eq('id', user.id)
      .single();

    if (userRowError) {
      console.error('Error fetching user row:', userRowError);
      return jsonResponse({ error: 'Failed to verify user' }, 500);
    }

    if (userRow?.is_banned) {
      return jsonResponse({ error: 'Account banned' }, 403);
    }

    // Check banned_users by user_id or email and not expired
    const { data: bans, error: bansError } = await supabase
      .from('banned_users')
      .select('id, expires_at')
      .or(`user_id.eq.${user.id},email.eq.${userRow?.email || ''}`)
      .limit(1);

    if (bansError) {
      console.error('Error checking bans:', bansError);
      return jsonResponse({ error: 'Failed to verify ban status' }, 500);
    }

    const isActiveBan = bans && bans.length > 0
      ? !bans[0].expires_at || new Date(bans[0].expires_at) > new Date()
      : false;

    if (isActiveBan) {
      return jsonResponse({ error: 'Account banned' }, 403);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('Unexpected error in ban-check:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

