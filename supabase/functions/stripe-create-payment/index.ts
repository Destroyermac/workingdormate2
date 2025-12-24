// stripe-create-payment (Edge Function)
// Creates a Stripe PaymentIntent for a job and inserts a payments_v2 row (with metadata).
// Returns client_secret and an iOS-ready initial receipt payload.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const jsonHeaders = { 'Content-Type': 'application/json' };

Deno.serve(async (req: Request) => {
  try {
    // Validate environment variables
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Environment variables missing. Required: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: jsonHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    const payload = await req.json();
    const { job_id, currency = 'usd', return_receipt = true } = payload;

    if (!job_id) {
      return new Response(JSON.stringify({ error: 'job_id required' }), { status: 400, headers: jsonHeaders });
    }

    // Fetch job and price
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, price_cents, posted_by_user_id, assigned_to_user_id')
      .eq('id', job_id)
      .limit(1)
      .maybeSingle();

    if (jobErr || !job) {
      console.error('Job not found or error:', jobErr);
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: jsonHeaders });
    }

    // Determine payer_user_id (poster) and payee_user_id (worker)
    const payerUserId = job.posted_by_user_id;
    const payeeUserId = job.assigned_to_user_id;

    // Determine total amount in cents (job.price_cents)
    const totalPaidCents = Number(job.price_cents ?? 0);
    if (!totalPaidCents || totalPaidCents <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid job price' }), { status: 400, headers: jsonHeaders });
    }

    // Platform fee (example: 10%):
    const PLATFORM_FEE_PERCENT = 0.10;
    const platformFeeCents = Math.round(totalPaidCents * PLATFORM_FEE_PERCENT);

    // Create PaymentIntent with metadata to help webhook match rows
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalPaidCents,
      currency,
      metadata: {
        job_id: String(job_id),
        payer_user_id: String(payerUserId),
        payee_user_id: String(payeeUserId ?? ''),
      },
      // optionally set on_behalf_of or transfer_data for connected accounts
      // capture_method: 'automatic',
    });

    // Upsert payments_v2 row: prefer to insert a new one if not exists; if exists, update stripe_payment_intent_id
    // Using Supabase JS upsert; ensure stripe_payment_intent_id is unique in DB if possible
    const now = new Date().toISOString();
    const paymentRow = {
      job_id: job_id,
      payer_user_id: payerUserId,
      payee_user_id: payeeUserId,
      total_paid_cents: totalPaidCents,
      platform_fee_cents: platformFeeCents,
      stripe_fee_cents: null,
      stripe_fee_percent: null,
      net_amount_cents: null,
      currency,
        status: 'processing',
        stripe_payment_intent_id: paymentIntent.id,
      created_at: now,
      updated_at: now,
    };

    // Insert row if not exists by unique (job_id, payer_user_id) or update stripe_payment_intent_id if row exists.
    try {
      await supabase
        .from('payments_v2')
        .upsert(paymentRow, { onConflict: ['job_id', 'payer_user_id'] })
        .select()
        .limit(1)
        .maybeSingle();
    } catch (e) {
      console.warn('Upsert via onConflict failed, attempting insert then update:', e);
      const { data: insData, error: insErr } = await supabase
        .from('payments_v2')
        .insert(paymentRow)
        .select()
        .maybeSingle();

      if (insErr) {
        const { error: updErr } = await supabase
          .from('payments_v2')
          .update({ stripe_payment_intent_id: paymentIntent.id, updated_at: now })
          .eq('job_id', job_id)
          .eq('payer_user_id', payerUserId);

        if (updErr) {
          console.error('Failed to insert or update payments_v2:', updErr);
          return new Response(JSON.stringify({ error: 'DB write failed' }), { status: 500, headers: jsonHeaders });
        }
      }
    }

    // Prepare iOS-ready receipt payload
    const receipt = {
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      job_id,
      payer_user_id: payerUserId,
      payee_user_id: payeeUserId,
      total_paid_cents: totalPaidCents,
      platform_fee_cents: platformFeeCents,
      stripe_fee_cents: null,
      stripe_fee_percent: null,
      net_amount_cents: null,
      currency,
      status: 'processing',
      created_at: now,
      updated_at: now,
    };

    const responseBody = return_receipt ? { receipt, paymentIntent } : { paymentIntent };
    return new Response(JSON.stringify(responseBody), { status: 200, headers: jsonHeaders });
  } catch (err: any) {
    console.error('stripe-create-payment error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

