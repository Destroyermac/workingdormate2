-- Enable RLS on payments_v2 and add policies for payer/payee visibility
ALTER TABLE IF EXISTS public.payments_v2 ENABLE ROW LEVEL SECURITY;

-- Select policy: allow payer or payee to view their payments
CREATE POLICY IF NOT EXISTS payments_v2_select_payer_or_payee
ON public.payments_v2
FOR SELECT
USING (auth.uid() = payer_user_id OR auth.uid() = payee_user_id);

-- (Optional) Service role insert/update handled by edge functions using service key; no public insert policy.

-- One-time backfill from legacy payments table into payments_v2 (only if not already present)
INSERT INTO public.payments_v2 (
  id,
  user_id,
  payer_user_id,
  payee_user_id,
  job_id,
  amount_total,
  stripe_fee,
  platform_fee,
  net_amount_cents,
  total_paid_cents,
  currency,
  stripe_payment_intent_id,
  status,
  created_at,
  timestamp
)
SELECT
  p.id,
  COALESCE(p.payer_user_id, p.user_id),
  p.payer_user_id,
  p.payee_user_id,
  p.job_id,
  COALESCE(p.total_paid_cents, p.job_price_cents, 0),
  COALESCE(p.stripe_fee_cents, 0),
  COALESCE(p.platform_fee_cents, 0),
  p.net_amount_cents,
  COALESCE(p.total_paid_cents, p.job_price_cents, 0),
  p.currency,
  p.stripe_payment_intent_id,
  p.status,
  p.created_at,
  p.created_at
FROM public.payments p
WHERE NOT EXISTS (
  SELECT 1 FROM public.payments_v2 v WHERE v.id = p.id
);

-- Helpful indexes if missing (idempotent creates)
CREATE INDEX IF NOT EXISTS payments_v2_payer_user_id_idx ON public.payments_v2(payer_user_id);
CREATE INDEX IF NOT EXISTS payments_v2_payee_user_id_idx ON public.payments_v2(payee_user_id);
CREATE INDEX IF NOT EXISTS payments_v2_job_id_idx ON public.payments_v2(job_id);
CREATE INDEX IF NOT EXISTS payments_v2_status_idx ON public.payments_v2(status);

