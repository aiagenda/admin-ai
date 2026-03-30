-- Create forms table for official Hungarian documents (idempotent)
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  online_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Forms are viewable by everyone" ON public.forms;
CREATE POLICY "Forms are viewable by everyone"
  ON public.forms FOR SELECT
  USING (true);

ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS form_key TEXT;

ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS fk_analyses_form_key;
ALTER TABLE public.analyses
  ADD CONSTRAINT fk_analyses_form_key
  FOREIGN KEY (form_key) REFERENCES public.forms(key) ON DELETE SET NULL;
