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
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase env not configured');
      return jsonResponse({ error: 'Service not configured' }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const userId = body?.userId as string | undefined;
    if (!userId) {
      return jsonResponse({ error: 'userId is required' }, 400);
    }

    console.log('🗑️ Deleting data for user:', userId);

    // Order matters to avoid FK issues; all operations are best-effort with logging.

    const deleteSteps: Array<{ table: string; filter: string }> = [
      { table: 'push_tokens', filter: `user_id=eq.${userId}` },
      { table: 'blocked_users', filter: `blocker_user_id=eq.${userId}` },
      { table: 'blocked_users', filter: `blocked_user_id=eq.${userId}` },
      { table: 'reports', filter: `user_id=eq.${userId}` },
      { table: 'payments_v2', filter: `user_id=eq.${userId}` },
      { table: 'payments_v2', filter: `payer_user_id=eq.${userId}` },
      { table: 'payments_v2', filter: `payee_user_id=eq.${userId}` },
      { table: 'payments', filter: `user_id=eq.${userId}` },
      { table: 'payments', filter: `payer_user_id=eq.${userId}` },
      { table: 'payments', filter: `payee_user_id=eq.${userId}` },
      { table: 'job_comments', filter: `user_id=eq.${userId}` },
      { table: 'applications', filter: `applicant_user_id=eq.${userId}` },
      { table: 'conversations', filter: `poster_user_id=eq.${userId}` },
      { table: 'conversations', filter: `worker_user_id=eq.${userId}` },
      { table: 'jobs', filter: `posted_by_user_id=eq.${userId}` },
      { table: 'jobs', filter: `assigned_to_user_id=eq.${userId}` },
    ];

    for (const step of deleteSteps) {
      const { error } = await supabase.from(step.table as any).delete().or(step.filter);
      if (error) {
        console.error(`❌ Error deleting from ${step.table} (${step.filter}):`, error);
      } else {
        console.log(`✅ Deleted from ${step.table} where ${step.filter}`);
      }
    }

    const { error: userDeleteError } = await supabase.from('users').delete().eq('id', userId);
    if (userDeleteError) {
      console.error('❌ Error deleting user:', userDeleteError);
      return jsonResponse({ error: 'Failed to delete user' }, 500);
    }

    console.log('✅ User data deletion complete');
    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error('❌ Unexpected error in delete-user-data:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

