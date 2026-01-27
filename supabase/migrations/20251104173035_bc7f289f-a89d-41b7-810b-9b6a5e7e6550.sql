-- Add institution and description columns to forms table
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS institution TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- Remove default after adding columns
ALTER TABLE public.forms 
ALTER COLUMN institution DROP DEFAULT,
ALTER COLUMN description DROP DEFAULT;