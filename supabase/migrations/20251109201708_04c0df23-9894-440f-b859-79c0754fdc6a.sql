-- Allow service role to download from documents bucket
CREATE POLICY "Service role can download from documents"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'documents');