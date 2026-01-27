-- Add category and tags columns to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add category and tags columns to analyses table (for AI-detected categories)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS detected_category TEXT,
ADD COLUMN IF NOT EXISTS detected_tags TEXT[] DEFAULT '{}';

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_analyses_detected_category ON public.analyses(detected_category);

-- Common Hungarian document categories
-- These will be used for auto-categorization suggestions
COMMENT ON COLUMN public.documents.category IS 'Document category: adozas, egeszsegugy, oktatas, szocialis, kozlekedes, ingatlan, uzlet, egyeb';
COMMENT ON COLUMN public.documents.tags IS 'User-defined tags for flexible organization';


