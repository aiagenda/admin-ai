-- Allow service role to download from documents bucket (idempotent)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can download from documents" ON storage.objects;
  CREATE POLICY "Service role can download from documents"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'documents');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
