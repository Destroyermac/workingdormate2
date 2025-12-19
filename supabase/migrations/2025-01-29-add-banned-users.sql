-- Enable UUID gen
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add is_banned flag to users for quick checks
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_is_banned_idx ON public.users(is_banned);

-- Create banned_users table to track bans
CREATE TABLE IF NOT EXISTS public.banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS banned_users_user_id_idx ON public.banned_users(user_id);
CREATE INDEX IF NOT EXISTS banned_users_email_idx ON public.banned_users(email);

