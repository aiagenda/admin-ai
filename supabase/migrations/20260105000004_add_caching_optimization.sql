-- Add caching and optimization for knowledge base searches
-- This migration adds indexes and functions for better performance

-- Add index for faster category-based searches
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category_source 
ON public.knowledge_documents(category, source_type);

-- Add index for faster institution-based searches
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_institution 
ON public.knowledge_documents(source_institution) 
WHERE source_institution IS NOT NULL;

-- Add index for updated_at for freshness checks
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_updated_at 
ON public.knowledge_documents(updated_at DESC);

-- Function to get cached search results (for future implementation)
CREATE OR REPLACE FUNCTION public.get_cached_kb_search(
  _query_hash TEXT,
  _cache_ttl_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  chunk_id UUID,
  chunk_text TEXT,
  document_id UUID,
  document_title TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cached_at TIMESTAMPTZ;
BEGIN
  -- This is a placeholder for future caching implementation
  -- For now, always return empty (no cache)
  RETURN;
END;
$$;

-- Function to cache search results (for future implementation)
CREATE OR REPLACE FUNCTION public.cache_kb_search(
  _query_hash TEXT,
  _results JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a placeholder for future caching implementation
  -- Could use Redis or a dedicated cache table
  RETURN;
END;
$$;

-- Add materialized view for frequently accessed knowledge base stats
CREATE MATERIALIZED VIEW IF NOT EXISTS knowledge_base_stats AS
SELECT 
  category,
  source_type,
  source_institution,
  COUNT(*) as document_count,
  COUNT(DISTINCT kc.id) as chunk_count,
  MAX(kd.updated_at) as last_updated
FROM public.knowledge_documents kd
LEFT JOIN public.knowledge_chunks kc ON kc.document_id = kd.id
GROUP BY category, source_type, source_institution;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_stats_unique 
ON knowledge_base_stats(category, source_type, source_institution);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_kb_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY knowledge_base_stats;
END;
$$;

-- Add comments
COMMENT ON MATERIALIZED VIEW knowledge_base_stats IS 'Statistics about knowledge base documents for quick access';
COMMENT ON FUNCTION refresh_kb_stats IS 'Refresh knowledge base statistics materialized view';

