
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔵 stripe-create-payment: Starting payment creation');

    // Validate environment variables
    if (!STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return jsonResponse({ error: 'Payment service not configured' }, 500);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase credentials not configured');
      return jsonResponse({ error: 'Database service not configured' }, 500);
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const { jobId } = body;
    console.log('📋 Job ID:', jobId);

    if (!jobId) {
      console.error('❌ Missing jobId in request');
      return jsonResponse({ error: 'Job ID is required' }, 400);
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Failed to get user:', userError);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    console.log('👤 Payer user ID:', user.id);

    // Fail fast if payer is blocked (policy enforcement server-side)
    try {
      const { data: blockedPayer, error: blockedPayerError } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (blockedPayerError) {
        // Gracefully continue on table/cache issues
      console.warn('⚠️ Error checking payer block status (continuing):', blockedPayerError);
      } else if (blockedPayer && blockedPayer.length > 0) {
        console.error('❌ Payer is blocked');
        return jsonResponse({ error: 'Your account is blocked from making payments' }, 403);
      }
    } catch (banError) {
      // Continue on unexpected lookup errors to avoid hard failures
      console.warn('⚠️ Unexpected error during payer block check (continuing):', banError);
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        price_amount,
        price_currency,
        status,
        posted_by_user_id,
        assigned_to_user_id
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('❌ Job not found:', jobError);
      return jsonResponse({ error: 'Job not found' }, 404);
    }

    console.log('✅ Job found:', job.title, `$${job.price_amount}`);

    // Validate job status
    if (job.status !== 'in_progress') {
      console.error('❌ Job is not in progress:', job.status);
      return jsonResponse({ error: `Job must be in progress to process payment. Current status: ${job.status}` }, 400);
    }

    // Validate user is the job poster
    if (job.posted_by_user_id !== user.id) {
      console.error('❌ User is not the job poster');
      return jsonResponse({ error: 'Only the job poster can process payment' }, 403);
    }

    // Validate job has an assigned worker
    if (!job.assigned_to_user_id) {
      console.error('❌ Job has no assigned worker');
      return jsonResponse({ error: 'Job must have an assigned worker' }, 400);
    }

    // Fetch payee (worker) profile
    const { data: payeeProfile, error: payeeError } = await supabase
      .from('users')
      .select('id, username, email, stripe_account_id, payouts_enabled')
      .eq('id', job.assigned_to_user_id)
      .single();

    if (payeeError || !payeeProfile) {
      console.error('❌ Worker profile not found:', payeeError);
      return jsonResponse({ error: 'Worker profile not found' }, 404);
    }

    console.log('👷 Worker:', payeeProfile.username, 'Payouts enabled:', payeeProfile.payouts_enabled);

    // CRITICAL: Check if worker has payouts enabled BEFORE Stripe call
    if (!payeeProfile.payouts_enabled) {
      console.error('❌ Worker has not completed payout setup');
      return jsonResponse({ error: 'Worker has not completed payout setup' }, 400);
    }

    // Check if worker has Stripe account
    if (!payeeProfile.stripe_account_id) {
      console.error('❌ Worker has no Stripe account');
      return jsonResponse({ error: 'Worker has not set up their Stripe account' }, 400);
    }

    // Fail fast if worker is blocked (policy enforcement server-side)
    try {
      const { data: blockedWorker, error: blockedWorkerError } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', payeeProfile.id)
        .limit(1);

      if (blockedWorkerError) {
        // Gracefully continue on table/cache issues
        console.warn('⚠️ Error checking worker block status (continuing):', blockedWorkerError);
      } else if (blockedWorker && blockedWorker.length > 0) {
        console.error('❌ Worker is blocked');
        return jsonResponse({ error: 'Worker is blocked from receiving payments' }, 403);
      }
    } catch (banWorkerError) {
      // Continue on unexpected lookup errors to avoid hard failures
      console.warn('⚠️ Unexpected error during worker block check (continuing):', banWorkerError);
    }

    // Calculate amounts
    const jobPriceCents = Math.round(Number(job.price_amount) * 100);
    const platformFeeCents = Math.round(jobPriceCents * PLATFORM_FEE_PERCENTAGE);
    const stripeFeeCents = Math.round(jobPriceCents * 0.029 + 30); // 2.9% + $0.30
    const stripeFeePercent = 2.9;
    const platformFeePercent = PLATFORM_FEE_PERCENTAGE * 100;
    const netAmountCents = jobPriceCents - platformFeeCents - stripeFeeCents;

    console.log('💰 Amounts:', {
      jobPriceCents,
      platformFeeCents,
      netAmountCents,
    });

    // Create Stripe PaymentIntent - wrapped in try/catch
    let paymentIntent;
    try {
      console.log('🔵 Creating Stripe PaymentIntent...');
      
      const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'amount': jobPriceCents.toString(),
          'currency': (job.price_currency || 'usd').toLowerCase(),
          'automatic_payment_methods[enabled]': 'true', // Using automatic_payment_methods
          'application_fee_amount': platformFeeCents.toString(),
          'transfer_data[destination]': payeeProfile.stripe_account_id,
          'metadata[job_id]': jobId,
          'metadata[payer_user_id]': user.id,
          'metadata[payee_user_id]': payeeProfile.id,
          'description': `Payment for job: ${job.title}`,
        }).toString(),
      });

      if (!stripeResponse.ok) {
        const errorText = await stripeResponse.text();
        console.error('❌ Stripe API error:', stripeResponse.status, errorText);
        
        let errorMessage = 'Failed to create payment';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          console.error('Failed to parse Stripe error:', e);
        }
        
        return jsonResponse({ error: errorMessage }, 400);
      }

      paymentIntent = await stripeResponse.json();
      console.log('✅ PaymentIntent created:', paymentIntent.id);
    } catch (stripeError: any) {
      console.error('❌ Stripe error:', stripeError);
      return jsonResponse({ error: stripeError.message || 'Failed to create payment' }, 500);
    }

    // Validate PaymentIntent response has required fields
    if (!paymentIntent.client_secret || !paymentIntent.id) {
      console.error('❌ Invalid PaymentIntent response - missing client_secret or id');
      return jsonResponse({ error: 'Invalid payment response from Stripe' }, 500);
    }

    // Create payment record in database (payments_v2)
    try {
      console.log('💾 Creating payment record...');

      const paymentRecord = {
        job_id: jobId,
        user_id: user.id,
        payer_user_id: user.id,
        payee_user_id: payeeProfile.id,
        amount_total: jobPriceCents,
        stripe_fee: stripeFeeCents,
        platform_fee: platformFeeCents,
        timestamp: new Date().toISOString(),
        status: 'processing',
        job_price_cents: jobPriceCents,
        stripe_fee_cents: stripeFeeCents,
        platform_fee_cents: platformFeeCents,
        stripe_fee_percent: stripeFeePercent,
        platform_fee_percent: platformFeePercent,
        net_amount_cents: netAmountCents,
        total_paid_cents: jobPriceCents,
        currency: (job.price_currency || 'USD').toUpperCase(),
        stripe_payment_intent_id: paymentIntent.id,
      };
      
      const { data: payment, error: paymentError } = await supabase
        .from('payments_v2')
        .insert(paymentRecord)
        .select()
        .single();

      if (paymentError) {
        console.error('❌ Failed to create payment record:', paymentError);
        // Don't fail the request, payment can still proceed
      } else {
        console.log('✅ Payment record created:', payment.id);
      }
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      // Don't fail the request, payment can still proceed
    }

    // Return success response with 200 status ONLY when PaymentIntent created successfully
    console.log('✅ Payment creation successful');
    return jsonResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: jobPriceCents,
      platformFee: platformFeeCents,
      workerAmount: netAmountCents,
      metadata: {
        jobId,
        payerUserId: user.id,
        payeeUserId: payeeProfile.id,
        currency: (job.price_currency || 'USD').toUpperCase(),
        stripeFee: stripeFeeCents,
        platformFee: platformFeeCents,
        amountTotal: jobPriceCents,
        stripeFeePercent,
        platformFeePercent,
      },
    }, 200);

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
});
