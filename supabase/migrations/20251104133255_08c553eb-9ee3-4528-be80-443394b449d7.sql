-- Add payment information columns to analyses table
ALTER TABLE public.analyses 
ADD COLUMN bank_account TEXT,
ADD COLUMN amount TEXT;