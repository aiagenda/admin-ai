-- Add payment information columns to analyses table (idempotent)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS amount TEXT;
