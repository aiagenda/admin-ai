-- GovLetter is US-only. Remove all Hungarian-market database content.

-- 1. Remove any remaining NAV / Hungarian forms
DELETE FROM public.forms WHERE institution = 'NAV' OR key LIKE 'nav_%';

-- 2. Remove Hungarian knowledge base documents
DELETE FROM public.knowledge_documents WHERE market = 'hu';

-- 3. Remove Hungarian blog posts
DELETE FROM public.blog_posts WHERE market = 'hu';

-- 4. Remove Hungarian playbooks / law registry entries if present
DELETE FROM public.law_registry WHERE metadata->>'market' = 'hu' OR jurisdiction = 'HU';

-- 5. Drop the 'hu' market constraint so it can never be inserted again
-- (keeps the market column for US and any future English-speaking markets)
COMMENT ON TABLE public.forms IS 'US government and agency forms only. market=us.';
COMMENT ON TABLE public.knowledge_documents IS 'US-market knowledge base documents only.';
COMMENT ON TABLE public.blog_posts IS 'US-market blog posts only.';
