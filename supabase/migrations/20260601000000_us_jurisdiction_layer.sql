-- US jurisdiction layer: market tagging + extended playbook matching + KB search filters

-- playbooks
ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT CHECK (jurisdiction IN ('federal', 'state', 'local', 'private')),
  ADD COLUMN IF NOT EXISTS state_code CHAR(2),
  ADD COLUMN IF NOT EXISTS agency TEXT,
  ADD COLUMN IF NOT EXISTS market TEXT DEFAULT 'us';

CREATE INDEX IF NOT EXISTS idx_playbooks_market ON public.playbooks (market);
CREATE INDEX IF NOT EXISTS idx_playbooks_state_code ON public.playbooks (state_code) WHERE state_code IS NOT NULL;

UPDATE public.playbooks SET market = 'us', jurisdiction = 'federal', agency = 'IRS'
WHERE doc_type LIKE 'irs_%' AND (market IS NULL OR market = 'us');

UPDATE public.playbooks SET market = 'hu', jurisdiction = 'federal', agency = 'NAV'
WHERE doc_type LIKE 'nav_%' OR doc_type IN ('execution', 'official_decision', 'invoice');

-- forms
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT CHECK (jurisdiction IN ('federal', 'state', 'local', 'private')),
  ADD COLUMN IF NOT EXISTS state_code CHAR(2),
  ADD COLUMN IF NOT EXISTS agency TEXT,
  ADD COLUMN IF NOT EXISTS market TEXT DEFAULT 'us';

CREATE INDEX IF NOT EXISTS idx_forms_market ON public.forms (market);
CREATE INDEX IF NOT EXISTS idx_forms_state_code ON public.forms (state_code) WHERE state_code IS NOT NULL;

UPDATE public.forms SET market = 'us', jurisdiction = 'federal', agency = 'IRS'
WHERE key LIKE 'irs_%';

-- knowledge_documents: market in metadata + column
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS market TEXT;

UPDATE public.knowledge_documents SET market = 'us'
WHERE source_institution = 'IRS' OR (metadata->>'language') = 'en';

UPDATE public.knowledge_documents SET market = COALESCE(market, 'hu')
WHERE market IS NULL;

-- analyses
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS state_code CHAR(2),
  ADD COLUMN IF NOT EXISTS agency TEXT;

COMMENT ON COLUMN public.analyses.state_code IS 'US state code when applicable (e.g. CA, NY)';
COMMENT ON COLUMN public.analyses.agency IS 'Normalized agency slug from model (irs, ssa, state_tax_authority, etc.)';

-- Extended playbook matching
DROP FUNCTION IF EXISTS public.get_matching_playbook(TEXT, TEXT[], TEXT[], TEXT);

CREATE OR REPLACE FUNCTION public.get_matching_playbook(
  _category TEXT DEFAULT NULL,
  _tags TEXT[] DEFAULT NULL,
  _content_keywords TEXT[] DEFAULT NULL,
  _doc_type TEXT DEFAULT NULL,
  _state_code TEXT DEFAULT NULL,
  _agency TEXT DEFAULT NULL,
  _market TEXT DEFAULT 'us'
)
RETURNS TABLE (
  id UUID,
  doc_type TEXT,
  name TEXT,
  description TEXT,
  steps JSONB,
  related_laws TEXT[],
  related_forms TEXT[],
  warnings TEXT[],
  tips TEXT[],
  match_score INTEGER,
  jurisdiction TEXT,
  state_code CHAR(2),
  agency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.doc_type,
    p.name,
    p.description,
    p.steps,
    p.related_laws,
    p.related_forms,
    p.warnings,
    p.tips,
    (
      CASE WHEN _category IS NOT NULL AND _category = ANY(p.trigger_categories) THEN 10 ELSE 0 END
      + COALESCE((
          SELECT COUNT(*)::INTEGER FROM UNNEST(p.trigger_tags) t
          WHERE _tags IS NOT NULL AND t = ANY(_tags)
        ), 0) * 5
      + COALESCE((
          SELECT COUNT(*)::INTEGER FROM UNNEST(p.trigger_keywords) k
          WHERE _content_keywords IS NOT NULL AND k = ANY(_content_keywords)
        ), 0) * 3
      + CASE WHEN _doc_type IS NOT NULL AND p.doc_type = _doc_type THEN 80 ELSE 0 END
      + CASE WHEN _state_code IS NOT NULL AND p.state_code = _state_code THEN 25 ELSE 0 END
      + CASE WHEN _agency IS NOT NULL AND p.agency IS NOT NULL AND lower(p.agency) = lower(_agency) THEN 15 ELSE 0 END
      + p.priority
    ) AS match_score,
    p.jurisdiction,
    p.state_code,
    p.agency
  FROM public.playbooks p
  WHERE p.is_active = true
    AND (p.market = _market OR (_market = 'us' AND p.market IS NULL AND p.doc_type LIKE 'irs_%'))
    AND NOT (_market = 'us' AND p.doc_type LIKE 'nav_%')
    AND (
      (_doc_type IS NOT NULL AND p.doc_type = _doc_type)
      OR (_category IS NOT NULL AND _category = ANY(p.trigger_categories))
      OR (_tags IS NOT NULL AND p.trigger_tags && _tags)
      OR (_content_keywords IS NOT NULL AND p.trigger_keywords && _content_keywords)
      OR p.doc_type IN ('unknown', 'official_letter_generic', 'state_tax_generic', 'irs_notice_generic')
    )
  ORDER BY match_score DESC, p.priority DESC
  LIMIT 3;
END;
$$;

-- KB search with market + optional state
DROP FUNCTION IF EXISTS public.search_knowledge_base(vector, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.search_knowledge_base(
  _query_embedding vector(1536),
  _category TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 5,
  _market TEXT DEFAULT NULL,
  _state_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  chunk_text TEXT,
  document_id UUID,
  document_title TEXT,
  document_category TEXT,
  source_institution TEXT,
  similarity FLOAT,
  chunk_index INTEGER,
  market TEXT,
  state_code CHAR(2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id AS chunk_id,
    kc.chunk_text,
    kc.document_id,
    kd.title AS document_title,
    kd.category AS document_category,
    kd.source_institution,
    1 - (kc.embedding <=> _query_embedding) AS similarity,
    kc.chunk_index,
    kd.market,
    (kd.metadata->>'state_code')::CHAR(2) AS state_code
  FROM public.knowledge_chunks kc
  INNER JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE
    (_category IS NULL OR kd.category = _category)
    AND kc.embedding IS NOT NULL
    AND (
      _market IS NULL
      OR kd.market = _market
      OR (_market = 'us' AND (kd.metadata->>'market') = 'us')
      OR (_market = 'us' AND kd.source_institution IN (
        'IRS','SSA','USCIS','CMS','VA','DOL','CFPB','FTC'
      ))
    )
    AND (
      _state_code IS NULL
      OR (kd.metadata->>'state_code') = _state_code
      OR kd.metadata->>'state_code' IS NULL
    )
  ORDER BY kc.embedding <=> _query_embedding
  LIMIT _limit;
END;
$$;
