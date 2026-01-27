-- Enable pgvector extension for vector similarity search
-- This allows us to store and search embeddings efficiently

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector indexes for efficient similarity search
-- Using ivfflat index for better performance with large datasets

-- Index for knowledge_documents embeddings
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding 
ON public.knowledge_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for knowledge_chunks embeddings (this is the main search index)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding 
ON public.knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Note: The 'lists' parameter should be set to rows/1000 for optimal performance
-- Adjust this value as the dataset grows

-- Comments for documentation
COMMENT ON EXTENSION vector IS 'pgvector extension for storing and searching vector embeddings';
COMMENT ON INDEX idx_knowledge_documents_embedding IS 'Vector index for knowledge_documents embeddings (cosine similarity)';
COMMENT ON INDEX idx_knowledge_chunks_embedding IS 'Vector index for knowledge_chunks embeddings (cosine similarity) - main search index';

