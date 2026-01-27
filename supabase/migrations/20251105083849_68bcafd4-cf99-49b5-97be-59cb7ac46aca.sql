-- Add file_hash column to forms table for deduplication
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS file_hash text;

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_forms_file_hash ON public.forms(file_hash);

-- Create forms storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('forms', 'forms', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for forms bucket
CREATE POLICY "Forms are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'forms');

CREATE POLICY "Authenticated users can upload forms"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'forms');

CREATE POLICY "Authenticated users can delete forms"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'forms');