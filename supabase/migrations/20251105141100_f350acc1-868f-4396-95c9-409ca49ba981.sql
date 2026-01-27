-- Drop foreign key constraint from analyses table
ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_form_key_fkey;
ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS fk_analyses_form_key;

-- Remove unique constraint from forms.key column
ALTER TABLE public.forms DROP CONSTRAINT IF EXISTS forms_key_key;

-- Keep the key column for reference but it's no longer unique
-- The primary identifier is now the UUID id column