-- Create RPC functions for searching documents and knowledge base

-- Function to search similar documents by category and tags
CREATE OR REPLACE FUNCTION public.search_similar_documents(
  _category TEXT DEFAULT NULL,
  _tags TEXT[] DEFAULT NULL,
  _user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  upload_date TIMESTAMPTZ,
  category TEXT,
  tags TEXT[],
  severity TEXT,
  deadline DATE,
  analysis_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.filename,
    d.upload_date,
    d.category,
    d.tags,
    a.severity,
    a.deadline,
    a.id as analysis_id
  FROM public.documents d
  LEFT JOIN public.analyses a ON a.document_id = d.id
  WHERE 
    (_user_id IS NULL OR d.user_id = _user_id)
    AND (_category IS NULL OR d.category = _category)
    AND (_tags IS NULL OR d.tags && _tags)
  ORDER BY d.upload_date DESC;
END;
$$;

-- Function to search documents by date range
CREATE OR REPLACE FUNCTION public.search_by_date_range(
  _start_date DATE DEFAULT NULL,
  _end_date DATE DEFAULT NULL,
  _user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  upload_date TIMESTAMPTZ,
  category TEXT,
  tags TEXT[],
  severity TEXT,
  deadline DATE,
  analysis_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.filename,
    d.upload_date,
    d.category,
    d.tags,
    a.severity,
    a.deadline,
    a.id as analysis_id
  FROM public.documents d
  LEFT JOIN public.analyses a ON a.document_id = d.id
  WHERE 
    (_user_id IS NULL OR d.user_id = _user_id)
    AND (_start_date IS NULL OR d.upload_date::DATE >= _start_date)
    AND (_end_date IS NULL OR d.upload_date::DATE <= _end_date)
  ORDER BY d.upload_date DESC;
END;
$$;

-- Function to search documents by category
CREATE OR REPLACE FUNCTION public.search_by_category(
  _category TEXT,
  _user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  upload_date TIMESTAMPTZ,
  category TEXT,
  tags TEXT[],
  severity TEXT,
  deadline DATE,
  analysis_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.filename,
    d.upload_date,
    d.category,
    d.tags,
    a.severity,
    a.deadline,
    a.id as analysis_id
  FROM public.documents d
  LEFT JOIN public.analyses a ON a.document_id = d.id
  WHERE 
    d.category = _category
    AND (_user_id IS NULL OR d.user_id = _user_id)
  ORDER BY d.upload_date DESC;
END;
$$;

-- Function to search knowledge base using vector similarity
CREATE OR REPLACE FUNCTION public.search_knowledge_base(
  _query_embedding vector(1536),
  _category TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  chunk_text TEXT,
  document_id UUID,
  document_title TEXT,
  document_category TEXT,
  source_institution TEXT,
  similarity FLOAT,
  chunk_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id as chunk_id,
    kc.chunk_text,
    kc.document_id,
    kd.title as document_title,
    kd.category as document_category,
    kd.source_institution,
    1 - (kc.embedding <=> _query_embedding) as similarity, -- Cosine similarity
    kc.chunk_index
  FROM public.knowledge_chunks kc
  INNER JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE 
    (_category IS NULL OR kd.category = _category)
    AND kc.embedding IS NOT NULL
  ORDER BY kc.embedding <=> _query_embedding -- Order by distance (ascending = most similar)
  LIMIT _limit;
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION public.search_similar_documents IS 'Search for similar documents by category and tags';
COMMENT ON FUNCTION public.search_by_date_range IS 'Search documents by date range';
COMMENT ON FUNCTION public.search_by_category IS 'Search documents by category';
COMMENT ON FUNCTION public.search_knowledge_base IS 'Vector similarity search in knowledge base using embeddings';

