-- Ensure payments_v2 has all required columns for receipts and fee breakdowns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'payer_user_id') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN payer_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'payee_user_id') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN payee_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'job_price_cents') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN job_price_cents BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'stripe_fee_cents') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN stripe_fee_cents BIGINT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'platform_fee_cents') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN platform_fee_cents BIGINT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'net_amount_cents') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN net_amount_cents BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'total_paid_cents') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN total_paid_cents BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'currency') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'stripe_payment_intent_id') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'created_at') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'stripe_fee_percent') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN stripe_fee_percent NUMERIC(6,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_v2' AND column_name = 'platform_fee_percent') THEN
    ALTER TABLE public.payments_v2 ADD COLUMN platform_fee_percent NUMERIC(6,4);
  END IF;
END $$;

-- Backfill fee percentages and net amounts where possible
UPDATE public.payments_v2
SET
  stripe_fee_percent = COALESCE(stripe_fee_percent, 2.9),
  platform_fee_percent = COALESCE(platform_fee_percent, 10.0),
  stripe_fee_cents = COALESCE(stripe_fee_cents, ROUND(amount_total * 0.029 + 30)),
  platform_fee_cents = COALESCE(platform_fee_cents, platform_fee),
  total_paid_cents = COALESCE(total_paid_cents, amount_total),
  net_amount_cents = COALESCE(net_amount_cents, amount_total - COALESCE(stripe_fee_cents,0) - COALESCE(platform_fee_cents,0)),
  currency = COALESCE(currency, 'USD')
WHERE TRUE;

-- Ensure RLS and policies match payer/payee visibility (and fallback to user_id)
ALTER TABLE public.payments_v2 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments_v2'
      AND policyname = 'payments_v2_select_payer_or_payee'
  ) THEN
    DROP POLICY payments_v2_select_payer_or_payee ON public.payments_v2;
  END IF;
END$$;

CREATE POLICY payments_v2_select_payer_or_payee
ON public.payments_v2
FOR SELECT
USING (
  auth.uid() = payer_user_id
  OR auth.uid() = payee_user_id
  OR auth.uid() = user_id
);

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS payments_v2_payer_user_id_idx ON public.payments_v2(payer_user_id);
CREATE INDEX IF NOT EXISTS payments_v2_payee_user_id_idx ON public.payments_v2(payee_user_id);
CREATE INDEX IF NOT EXISTS payments_v2_user_id_idx ON public.payments_v2(user_id);
CREATE INDEX IF NOT EXISTS payments_v2_job_id_idx ON public.payments_v2(job_id);
CREATE INDEX IF NOT EXISTS payments_v2_status_idx ON public.payments_v2(status);

