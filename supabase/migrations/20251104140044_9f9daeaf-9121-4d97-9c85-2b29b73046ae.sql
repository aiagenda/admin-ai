-- Add recipient_name column to analyses table (idempotent)
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS recipient_name TEXT;
