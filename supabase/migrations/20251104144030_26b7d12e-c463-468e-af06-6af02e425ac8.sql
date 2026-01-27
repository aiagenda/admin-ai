-- Create forms table for official Hungarian documents
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  online_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on forms table
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read forms (public data)
CREATE POLICY "Forms are viewable by everyone"
  ON public.forms
  FOR SELECT
  USING (true);

-- Add form_key column to analyses table
ALTER TABLE public.analyses ADD COLUMN form_key TEXT;

-- Add foreign key relationship (optional, for data integrity)
ALTER TABLE public.analyses 
  ADD CONSTRAINT fk_analyses_form_key 
  FOREIGN KEY (form_key) 
  REFERENCES public.forms(key) 
  ON DELETE SET NULL;