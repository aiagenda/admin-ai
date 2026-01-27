-- Add versioning fields to documents table
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN DEFAULT true;

-- Create document_versions table to track version history
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  parent_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_description TEXT,
  UNIQUE(document_id, version_number)
);

-- Create document_relations table for linking related documents
CREATE TABLE IF NOT EXISTS public.document_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id_1 UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_id_2 UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related' CHECK (relation_type IN ('related', 'revision', 'response', 'attachment', 'duplicate')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  CHECK (document_id_1 != document_id_2),
  -- Prevent duplicate relations (both directions)
  UNIQUE(document_id_1, document_id_2),
  UNIQUE(document_id_2, document_id_1)
);

-- Enable RLS on new tables
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_relations ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_versions
CREATE POLICY "Users can view versions of their documents"
  ON public.document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions of their documents"
  ON public.document_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update versions of their documents"
  ON public.document_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete versions of their documents"
  ON public.document_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- RLS policies for document_relations
CREATE POLICY "Users can view relations of their documents"
  ON public.document_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d1
      WHERE d1.id = document_relations.document_id_1
      AND d1.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.documents d2
      WHERE d2.id = document_relations.document_id_2
      AND d2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create relations between their documents"
  ON public.document_relations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d1
      WHERE d1.id = document_relations.document_id_1
      AND d1.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.documents d2
      WHERE d2.id = document_relations.document_id_2
      AND d2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update relations of their documents"
  ON public.document_relations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d1
      WHERE d1.id = document_relations.document_id_1
      AND d1.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.documents d2
      WHERE d2.id = document_relations.document_id_2
      AND d2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete relations of their documents"
  ON public.document_relations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d1
      WHERE d1.id = document_relations.document_id_1
      AND d1.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.documents d2
      WHERE d2.id = document_relations.document_id_2
      AND d2.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_parent_document_id ON public.documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_version_number ON public.documents(version_number);
CREATE INDEX IF NOT EXISTS idx_documents_is_current_version ON public.documents(is_current_version);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_parent_document_id ON public.document_versions(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_document_relations_document_id_1 ON public.document_relations(document_id_1);
CREATE INDEX IF NOT EXISTS idx_document_relations_document_id_2 ON public.document_relations(document_id_2);
CREATE INDEX IF NOT EXISTS idx_document_relations_type ON public.document_relations(relation_type);

-- Function to get document version history
CREATE OR REPLACE FUNCTION public.get_document_version_history(p_document_id UUID)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  parent_document_id UUID,
  version_number INTEGER,
  filename TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  change_description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dv.id,
    dv.document_id,
    dv.parent_document_id,
    dv.version_number,
    dv.filename,
    dv.file_url,
    dv.created_at,
    dv.created_by,
    dv.change_description
  FROM public.document_versions dv
  WHERE dv.document_id = p_document_id
     OR dv.parent_document_id = p_document_id
  ORDER BY dv.version_number DESC, dv.created_at DESC;
END;
$$;

-- Function to get related documents
CREATE OR REPLACE FUNCTION public.get_related_documents(p_document_id UUID)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  related_document_id UUID,
  relation_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  related_filename TEXT,
  related_upload_date TIMESTAMPTZ,
  related_category TEXT,
  related_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.id,
    dr.document_id_1 as document_id,
    dr.document_id_2 as related_document_id,
    dr.relation_type,
    dr.description,
    dr.created_at,
    d2.filename as related_filename,
    d2.upload_date as related_upload_date,
    d2.category as related_category,
    d2.status as related_status
  FROM public.document_relations dr
  JOIN public.documents d2 ON d2.id = dr.document_id_2
  WHERE dr.document_id_1 = p_document_id
  
  UNION ALL
  
  SELECT 
    dr.id,
    dr.document_id_2 as document_id,
    dr.document_id_1 as related_document_id,
    dr.relation_type,
    dr.description,
    dr.created_at,
    d1.filename as related_filename,
    d1.upload_date as related_upload_date,
    d1.category as related_category,
    d1.status as related_status
  FROM public.document_relations dr
  JOIN public.documents d1 ON d1.id = dr.document_id_1
  WHERE dr.document_id_2 = p_document_id
  ORDER BY created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_document_version_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_related_documents(UUID) TO authenticated;
