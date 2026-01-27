-- Add required_forms column to analyses table to store multiple form codes
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS required_forms TEXT[];