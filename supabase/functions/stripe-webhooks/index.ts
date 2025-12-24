// stripe-webhooks (Edge Function)
// Verifies Stripe signatures, computes fees via balance transactions, updates payments_v2 deterministically,
// and returns iOS-ready receipt info for debugging if needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables. Required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: corsHeaders });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Verify signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400, headers: corsHeaders });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err?.message || err);
      return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), { status: 400, headers: corsHeaders });
    }

    console.log('Received Stripe event:', event.type);

    // Helper: Fetch balance transaction to get fee in cents
    async function fetchBalanceTransactionFeeCents(balanceTxRef: string | Stripe.BalanceTransaction | undefined) {
      try {
        if (!balanceTxRef) return null;
        if (typeof balanceTxRef === 'object') {
          return (balanceTxRef as any).fee != null ? Math.round(Number((balanceTxRef as any).fee)) : null;
        }
        // string id
        const bt = await stripe.balanceTransactions.retrieve(balanceTxRef);
        return bt?.fee != null ? Math.round(Number(bt.fee)) : null;
      } catch (e) {
        console.warn('Failed to fetch balance transaction:', e);
        return null;
      }
    }

    // Helper: compute stripe_fee_percent (4 decimals)
    function computeStripeFeePercent(stripeFeeCents: number | null, totalPaidCents: number | null) {
      if (stripeFeeCents == null || totalPaidCents == null || totalPaidCents === 0) return null;
      const raw = stripeFeeCents / totalPaidCents;
      return Number(raw.toFixed(4));
    }

    // Helper: update payments_v2 rows with safety (idempotent style)
    async function safeUpdatePaymentsByIntent(intentId: string, updates: Record<string, any>, enforceNotSucceeded = true) {
      try {
        let query = supabase.from('payments_v2').update({ ...updates, updated_at: new Date().toISOString() });
        if (enforceNotSucceeded) {
          query = query.not('status', 'eq', 'succeeded'); // avoid overwriting already succeeded rows
        }
        const { data, error } = await query.eq('stripe_payment_intent_id', intentId).select().maybeSingle();
        if (error) {
          console.error('Error updating payments_v2 by intent:', error);
          return { updated: false, error };
        }
        if (!data) {
          return { updated: false, error: null };
        }
        return { updated: true, error: null, data };
      } catch (e) {
        console.error('safeUpdatePaymentsByIntent unexpected error:', e);
        return { updated: false, error: e };
      }
    }

    // Helper: fallback update by job_id + payer_user_id
    async function fallbackUpdateByJobAndPayer(jobId: string, payerUserId: string, updates: Record<string, any>, enforceNotSucceeded = true) {
      try {
        let query = supabase.from('payments_v2').update({ ...updates, updated_at: new Date().toISOString() });
        if (enforceNotSucceeded) {
          query = query.not('status', 'eq', 'succeeded');
        }
        const { data, error } = await query.eq('job_id', jobId).eq('payer_user_id', payerUserId).select().limit(1).maybeSingle();
        if (error) {
          console.error('Fallback update error:', error);
          return { updated: false, error };
        }
        if (!data) return { updated: false, error: null };
        return { updated: true, error: null, data };
      } catch (e) {
        console.error('fallbackUpdateByJobAndPayer unexpected error:', e);
        return { updated: false, error: e };
      }
    }

    // Handler: payment_intent.succeeded and payment_intent.payment_failed
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Handling payment_intent event:', paymentIntent.id);

      // Get the first charge if any
      const charge = (paymentIntent.charges?.data && paymentIntent.charges.data.length > 0)
        ? paymentIntent.charges.data[0] as Stripe.Charge
        : undefined;

      // Try to fetch existing payments_v2 row to obtain platform_fee_cents and total_paid_cents
      const { data: existing, error: fetchErr } = await supabase
        .from('payments_v2')
        .select('id, total_paid_cents, platform_fee_cents, status, payer_user_id, job_id')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.error('Error fetching payments_v2 by intent id:', fetchErr);
      }

      const totalPaidCents = existing?.total_paid_cents ?? (typeof paymentIntent.amount === 'number' ? paymentIntent.amount : null);
      const platformFeeCents = existing?.platform_fee_cents ?? 0;

      // Compute stripe fee cents by checking charge.balance_transaction or charge object
      const stripeFeeCents = await fetchBalanceTransactionFeeCents(charge?.balance_transaction ?? (charge as any)?.balance_transaction);
      const stripeFeePercent = computeStripeFeePercent(stripeFeeCents, totalPaidCents);
      const netAmountCents = (totalPaidCents ?? 0) - (platformFeeCents ?? 0) - (stripeFeeCents ?? 0);

      const updates: Record<string, any> = {
        stripe_fee_cents: stripeFeeCents,
        stripe_fee_percent: stripeFeePercent,
        net_amount_cents: netAmountCents,
        status: event.type === 'payment_intent.succeeded' ? 'succeeded' : 'failed',
      };

      // Primary update: by stripe_payment_intent_id (idempotent safe update)
      const { updated, error: upErr } = await safeUpdatePaymentsByIntent(paymentIntent.id, updates, true);
      if (upErr) {
        console.error('Error updating payments_v2 by intent id:', upErr);
      } else if (updated) {
        console.log('Updated payments_v2 by stripe_payment_intent_id:', paymentIntent.id);
      } else {
        console.log('No payments_v2 row matched stripe_payment_intent_id:', paymentIntent.id, 'Attempting fallback using metadata...');
        const jobId = paymentIntent.metadata?.job_id ?? null;
        const payerUserId = paymentIntent.metadata?.payer_user_id ?? null;
        if (jobId && payerUserId) {
          const fb = await fallbackUpdateByJobAndPayer(jobId, payerUserId, updates, true);
          if (fb.error) {
            console.error('Fallback update error for job+payer:', fb.error);
          } else if (fb.updated) {
            console.log('Fallback update succeeded for job_id + payer_user_id:', jobId, payerUserId);
          } else {
            console.warn('Fallback found no row for job_id + payer_user_id:', jobId, payerUserId);
          }
        } else {
          console.warn('Fallback metadata incomplete. job_id or payer_user_id missing in PaymentIntent metadata for intent:', paymentIntent.id);
        }
      }

      const receipt = {
        payment_intent_id: paymentIntent.id,
        total_paid_cents: totalPaidCents,
        platform_fee_cents: platformFeeCents,
        stripe_fee_cents: stripeFeeCents,
        stripe_fee_percent: stripeFeePercent,
        net_amount_cents: netAmountCents,
        status: updates.status,
        updated_at: new Date().toISOString(),
      };

      return new Response(JSON.stringify({ received: true, receipt }), { status: 200, headers: corsHeaders });
    }

    // Handler: charge.succeeded - accurate place for balance_transaction data
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      console.log('Handling charge.succeeded:', charge.id);

      const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined;
      const totalPaidCents = typeof charge.amount === 'number' ? charge.amount : null;
      const stripeFeeCents = await fetchBalanceTransactionFeeCents(charge.balance_transaction);

      let platformFeeCents = 0;
      if (intentId) {
        const { data: existing, error: fetchErr } = await supabase
          .from('payments_v2')
          .select('platform_fee_cents, total_paid_cents')
          .eq('stripe_payment_intent_id', intentId)
          .limit(1)
          .maybeSingle();
        if (!fetchErr && existing) {
          platformFeeCents = existing.platform_fee_cents ?? 0;
        }
      }

      const stripeFeePercent = computeStripeFeePercent(stripeFeeCents, totalPaidCents);
      const netAmountCents = (totalPaidCents ?? 0) - (platformFeeCents ?? 0) - (stripeFeeCents ?? 0);

      const updates: Record<string, any> = {
        stripe_fee_cents: stripeFeeCents,
        stripe_fee_percent: stripeFeePercent,
        net_amount_cents: netAmountCents,
        status: 'succeeded',
      };

      if (intentId) {
        const { updated, error: upErr } = await safeUpdatePaymentsByIntent(intentId, updates, true);
        if (upErr) {
          console.error('Error updating payments_v2 by intent in charge.succeeded:', upErr);
        } else if (updated) {
          console.log('Updated payments_v2 by intent from charge.succeeded:', intentId);
          const receipt = { payment_intent_id: intentId, ...updates, updated_at: new Date().toISOString() };
          return new Response(JSON.stringify({ received: true, receipt }), { status: 200, headers: corsHeaders });
        }
      }

      const jobId = charge.metadata?.job_id ?? null;
      const payerUserId = charge.metadata?.payer_user_id ?? null;
      if (jobId && payerUserId) {
        const fb = await fallbackUpdateByJobAndPayer(jobId, payerUserId, updates, true);
        if (fb.error) {
          console.error('Fallback update error in charge.succeeded:', fb.error);
        } else if (fb.updated) {
          console.log('Fallback updated payments_v2 from charge.succeeded for job+payer');
          const receipt = { job_id: jobId, payer_user_id: payerUserId, ...updates, updated_at: new Date().toISOString() };
          return new Response(JSON.stringify({ received: true, receipt }), { status: 200, headers: corsHeaders });
        }
      }

      console.warn('charge.succeeded: no matching payments_v2 row for charge:', charge.id);
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
    }

    // Handler: account.updated
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      console.log('Handling account.updated for account:', account.id);

      const { error } = await supabase
        .from('users')
        .update({ payouts_enabled: account.payouts_enabled ?? false, updated_at: new Date().toISOString() })
        .eq('stripe_account_id', account.id);

      if (error) {
        console.error('Error updating user payouts_enabled:', error);
        return new Response(JSON.stringify({ error: 'User update failed' }), { status: 500, headers: corsHeaders });
      }

      console.log('Updated users.payouts_enabled for account:', account.id);
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
    }

    // Default: unhandled event
    console.log('Unhandled Stripe event type:', event.type);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error('Webhook handler unexpected error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

