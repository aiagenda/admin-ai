-- Create Knowledge Base tables for storing official documents and their embeddings

-- Knowledge documents table (hivatalos dokumentumok: NAV, TB, stb.)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL, -- 'adozas', 'egeszsegugy', 'oktatas', 'szocialis', 'kozlekedes', 'ingatlan', 'uzlet', 'egyeb'
  source_type TEXT CHECK (source_type IN ('official', 'legal', 'form', 'guide', 'faq')),
  source_url TEXT,
  source_institution TEXT, -- NAV, TB, EESZT, stb.
  embedding vector(1536), -- OpenAI embedding (text-embedding-3-small)
  metadata JSONB, -- További metaadatok
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Knowledge chunks table (dokumentumok részei chunking után)
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Sorrend a dokumentumon belül
  embedding vector(1536), -- OpenAI embedding
  metadata JSONB, -- További metaadatok (pl. oldalszám, fejezet)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Knowledge searches table (keresési előzmények analytics-hez)
CREATE TABLE IF NOT EXISTS public.knowledge_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  query_text TEXT,
  retrieved_chunks UUID[], -- knowledge_chunks id-k
  relevance_score FLOAT, -- Átlagos relevance score
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_documents
DROP POLICY IF EXISTS "Knowledge documents are viewable by everyone" ON public.knowledge_documents;
CREATE POLICY "Knowledge documents are viewable by everyone"
  ON public.knowledge_documents
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert knowledge documents" ON public.knowledge_documents;
CREATE POLICY "Only admins can insert knowledge documents"
  ON public.knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update knowledge documents" ON public.knowledge_documents;
CREATE POLICY "Only admins can update knowledge documents"
  ON public.knowledge_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete knowledge documents" ON public.knowledge_documents;
CREATE POLICY "Only admins can delete knowledge documents"
  ON public.knowledge_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for knowledge_chunks
DROP POLICY IF EXISTS "Knowledge chunks are viewable by everyone" ON public.knowledge_chunks;
CREATE POLICY "Knowledge chunks are viewable by everyone"
  ON public.knowledge_chunks
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert knowledge chunks" ON public.knowledge_chunks;
CREATE POLICY "Only admins can insert knowledge chunks"
  ON public.knowledge_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for knowledge_searches
DROP POLICY IF EXISTS "Users can insert their own searches" ON public.knowledge_searches;
CREATE POLICY "Users can insert their own searches"
  ON public.knowledge_searches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own searches" ON public.knowledge_searches;
CREATE POLICY "Users can view their own searches"
  ON public.knowledge_searches
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can view all searches" ON public.knowledge_searches;
CREATE POLICY "Admins can view all searches"
  ON public.knowledge_searches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON public.knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_type ON public.knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_institution ON public.knowledge_documents(source_institution);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON public.knowledge_documents(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON public.knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_chunk_index ON public.knowledge_chunks(document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_knowledge_searches_analysis_id ON public.knowledge_searches(analysis_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_searches_created_at ON public.knowledge_searches(created_at);

-- Comments for documentation
COMMENT ON TABLE public.knowledge_documents IS 'Hivatalos dokumentumok (NAV, TB, stb.) amelyeket az AI használ a pontos instrukciók generálásához';
COMMENT ON TABLE public.knowledge_chunks IS 'Dokumentumok részei chunking után, embeddings-szel a vector search-hez';
COMMENT ON TABLE public.knowledge_searches IS 'Knowledge base keresési előzmények analytics-hez';

