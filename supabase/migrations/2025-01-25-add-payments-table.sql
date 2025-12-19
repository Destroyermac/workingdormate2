-- Ensure required extensions exist for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create payments table if it does not yet exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    CREATE TABLE public.payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      -- Required fields
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
      amount_total BIGINT NOT NULL, -- stored in cents
      stripe_fee BIGINT DEFAULT 0,
      platform_fee BIGINT DEFAULT 0,
      "timestamp" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
      status TEXT NOT NULL DEFAULT 'processing',
      -- Compatibility fields with existing business logic
      payer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      payee_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      job_price_cents BIGINT,
      stripe_fee_cents BIGINT DEFAULT 0,
      platform_fee_cents BIGINT DEFAULT 0,
      net_amount_cents BIGINT,
      total_paid_cents BIGINT,
      currency TEXT DEFAULT 'USD',
      stripe_payment_intent_id TEXT,
      stripe_transfer_id TEXT,
      stripe_charge_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
      completed_at TIMESTAMPTZ
    );
  END IF;
END $$;

-- Add any missing columns to align with new requirements and existing app logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'amount_total'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN amount_total BIGINT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'stripe_fee'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN stripe_fee BIGINT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN platform_fee BIGINT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN "timestamp" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN status TEXT NOT NULL DEFAULT 'processing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payer_user_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN payer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payee_user_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN payee_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'job_price_cents'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN job_price_cents BIGINT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'stripe_fee_cents'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN stripe_fee_cents BIGINT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'platform_fee_cents'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN platform_fee_cents BIGINT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'net_amount_cents'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN net_amount_cents BIGINT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'total_paid_cents'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN total_paid_cents BIGINT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'stripe_transfer_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN stripe_transfer_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'stripe_charge_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN stripe_charge_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_payer_user_id_idx ON public.payments(payer_user_id);
CREATE INDEX IF NOT EXISTS payments_payee_user_id_idx ON public.payments(payee_user_id);
CREATE INDEX IF NOT EXISTS payments_job_id_idx ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

