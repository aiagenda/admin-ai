-- GovLetter is US-only. Remove all Hungarian-market database content.

-- 1. Remove any remaining NAV / Hungarian forms
DELETE FROM public.forms WHERE institution = 'NAV' OR key LIKE 'nav_%';

-- 2. Remove Hungarian knowledge base documents
DELETE FROM public.knowledge_documents WHERE market = 'hu';

-- 3. Remove Hungarian blog posts
DELETE FROM public.blog_posts WHERE market = 'hu';

-- 4. Remove Hungarian law registry entries (seeded from njt.hu; no metadata/jurisdiction columns)
DELETE FROM public.law_registry
WHERE source_url ILIKE '%njt.hu%'
   OR 'NAV' = ANY(topics);

-- 5. Comments for US-only scope
COMMENT ON TABLE public.forms IS 'US government and agency forms only. market=us.';
COMMENT ON TABLE public.knowledge_documents IS 'US-market knowledge base documents only.';
COMMENT ON TABLE public.blog_posts IS 'US-market blog posts only.';
COMMENT ON TABLE public.law_registry IS 'US federal/state law references (IRC, etc.). Hungarian NJT entries removed.';
