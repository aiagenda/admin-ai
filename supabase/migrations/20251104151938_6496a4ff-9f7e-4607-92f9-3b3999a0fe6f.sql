-- Allow NULL values in form_key column
ALTER TABLE public.analyses
ALTER COLUMN form_key DROP NOT NULL;