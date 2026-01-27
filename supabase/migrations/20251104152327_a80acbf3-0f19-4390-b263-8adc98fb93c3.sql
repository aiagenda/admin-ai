-- Drop existing foreign key constraint on analyses.form_key (if it exists)
ALTER TABLE public.analyses 
DROP CONSTRAINT IF EXISTS analyses_form_key_fkey;

-- Recreate foreign key with ON DELETE SET NULL
ALTER TABLE public.analyses
ADD CONSTRAINT analyses_form_key_fkey 
FOREIGN KEY (form_key) 
REFERENCES public.forms(key) 
ON DELETE SET NULL;