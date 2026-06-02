-- Storage: create the form-pdfs bucket for IRS (and future) form PDFs.
-- This is idempotent — the sync script also calls createBucket with upsert logic,
-- but having it in a migration documents the intent and allows CI to apply it.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-pdfs',
  'form-pdfs',
  true,                      -- public: files served without signed URL
  15728640,                  -- 15 MB limit per file
  ARRAY['application/pdf', 'text/plain']  -- pdf + sha256 sidecar
)
ON CONFLICT (id) DO NOTHING;

-- Public read policy (anyone can download a form PDF)
DROP POLICY IF EXISTS "Public read form-pdfs" ON storage.objects;
CREATE POLICY "Public read form-pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-pdfs');

-- Service role can insert/update/delete (sync script uses service role key)
DROP POLICY IF EXISTS "Service role write form-pdfs" ON storage.objects;
CREATE POLICY "Service role write form-pdfs"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'form-pdfs'
    AND auth.role() = 'service_role'
  );
