-- Persist law / doc metadata on analyses + improve playbook matching for US IRS notices

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS mentioned_laws TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS doc_type TEXT,
  ADD COLUMN IF NOT EXISTS issuer TEXT,
  ADD COLUMN IF NOT EXISTS deadline_descriptions TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.analyses.mentioned_laws IS 'Explicit statute/section references extracted from the document (e.g. IRC, Act sections)';
COMMENT ON COLUMN public.analyses.doc_type IS 'Normalized document type for playbook routing (NAV*, irs_*, etc.)';
COMMENT ON COLUMN public.analyses.issuer IS 'Issuer hint from model (NAV, irs, tax_authority, etc.)';
COMMENT ON COLUMN public.analyses.deadline_descriptions IS 'Human-readable deadline phrases from the source document';

CREATE OR REPLACE FUNCTION public.get_matching_playbook(
  _category TEXT DEFAULT NULL,
  _tags TEXT[] DEFAULT NULL,
  _content_keywords TEXT[] DEFAULT NULL,
  _doc_type TEXT DEFAULT NULL
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
  match_score INTEGER
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
          SELECT COUNT(*)::INTEGER
          FROM UNNEST(p.trigger_tags) t
          WHERE _tags IS NOT NULL AND t = ANY(_tags)
        ), 0) * 5
      + COALESCE((
          SELECT COUNT(*)::INTEGER
          FROM UNNEST(p.trigger_keywords) k
          WHERE _content_keywords IS NOT NULL AND k = ANY(_content_keywords)
        ), 0) * 3
      + CASE WHEN _doc_type IS NOT NULL AND p.doc_type = _doc_type THEN 80 ELSE 0 END
      + p.priority
    ) AS match_score
  FROM public.playbooks p
  WHERE p.is_active = true
    AND (
      (_doc_type IS NOT NULL AND p.doc_type = _doc_type)
      OR (_category IS NOT NULL AND _category = ANY(p.trigger_categories))
      OR (_tags IS NOT NULL AND p.trigger_tags && _tags)
      OR (_content_keywords IS NOT NULL AND p.trigger_keywords && _content_keywords)
      OR p.doc_type = 'unknown'
    )
  ORDER BY match_score DESC, p.priority DESC
  LIMIT 3;
END;
$$;

INSERT INTO public.playbooks (
  doc_type, name, description, trigger_categories, trigger_tags, trigger_keywords,
  steps, related_laws, related_forms, warnings, tips, priority, is_active
) VALUES
(
  'irs_notice_intent_to_levy',
  'IRS: Intent to levy / végrehajtási szándék (CP504, LT11 típusú)',
  'US IRS notices that threaten levy or similar enforcement. Not legal advice—verify deadlines on the original notice.',
  ARRAY['tax', 'adozas']::TEXT[],
  ARRAY['irs', 'internal revenue', 'levy']::TEXT[],
  ARRAY['CP504', 'LT11', 'Intent to Levy', 'Final Notice', 'IRS']::TEXT[],
  '[
    {"order": 1, "title": "Confirm notice details", "description": "Check the tax year(s), balance, and the response deadline on the letter. Use your IRS online account or call the IRS using the number printed on the notice if anything looks wrong.", "law_refs": ["26 U.S.C. (IRC) — verify cited sections on the notice"]},
    {"order": 2, "title": "Decide response path", "description": "Common paths: pay in full, request an installment agreement, offer in compromise (if eligible), or file a timely appeal/protest if you disagree. Complex cases should involve a CPA, enrolled agent, or tax attorney.", "law_refs": []},
    {"order": 3, "title": "Gather proof & mail/fax", "description": "If you dispute the balance, assemble supporting documents (W-2/1099, payments, prior returns) and respond by the deadline using the instructions on the notice.", "law_refs": []},
    {"order": 4, "title": "Official IRS hub", "description": "Start here for notice explanations: https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter", "law_refs": []}
  ]'::jsonb,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY['Missing the deadline can increase enforcement risk. This assistant does not provide legal or tax advice.']::TEXT[],
  ARRAY['If the notice references a specific IRC section, cross-check it on the official IRS site or with a licensed professional.']::TEXT[],
  90,
  true
),
(
  'irs_notice_balance_due',
  'IRS: Balance due / egyenleg (CP14 és hasonló)',
  'First or routine balance-due notices from the IRS.',
  ARRAY['tax', 'adozas']::TEXT[],
  ARRAY['irs', 'balance due']::TEXT[],
  ARRAY['CP14', 'Balance Due', 'Amount You Owe', 'IRS']::TEXT[],
  '[
    {"order": 1, "title": "Validate the amount", "description": "Compare the notice to your return and withholding/estimated payments. Look for math errors or missing credits.", "law_refs": []},
    {"order": 2, "title": "Pay or arrange payment", "description": "If correct, pay by the due date via IRS Direct Pay or another IRS-approved method. If you cannot pay in full, explore a payment plan in your IRS online account.", "law_refs": []},
    {"order": 3, "title": "Disagree? Respond in writing", "description": "Follow the protest/appeal instructions on the notice and keep copies of everything you send.", "law_refs": []},
    {"order": 4, "title": "Official IRS hub", "description": "https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter", "law_refs": []}
  ]'::jsonb,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY['Always use official IRS (.gov) links for payments—avoid scams.']::TEXT[],
  85,
  true
),
(
  'irs_notice_generic',
  'IRS: Általános értesítés / General IRS correspondence',
  'Fallback when the IRS letter type is unclear but the issuer is IRS/US Treasury.',
  ARRAY['tax', 'adozas', 'business', 'uzlet']::TEXT[],
  ARRAY['irs']::TEXT[],
  ARRAY['Internal Revenue Service', 'Department of the Treasury', 'IRS', 'EIN', 'SSN', 'Form 1040']::TEXT[],
  '[
    {"order": 1, "title": "Identify the notice number", "description": "Find the notice code (e.g., CP…) in the corner of the first page—this drives next steps.", "law_refs": []},
    {"order": 2, "title": "Read deadlines twice", "description": "Calendar any payment, appeal, or information deadlines before taking action.", "law_refs": []},
    {"order": 3, "title": "Use IRS tools", "description": "Your online IRS account and the Understanding Your Notice page list standard options for each notice type.", "law_refs": []},
    {"order": 4, "title": "Official IRS hub", "description": "https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter", "law_refs": []}
  ]'::jsonb,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY['If the letter is not from IRS (.gov) contacts, treat it as potential phishing.']::TEXT[],
  40,
  true
)
ON CONFLICT (doc_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_categories = EXCLUDED.trigger_categories,
  trigger_tags = EXCLUDED.trigger_tags,
  trigger_keywords = EXCLUDED.trigger_keywords,
  steps = EXCLUDED.steps,
  related_laws = EXCLUDED.related_laws,
  related_forms = EXCLUDED.related_forms,
  warnings = EXCLUDED.warnings,
  tips = EXCLUDED.tips,
  priority = EXCLUDED.priority,
  is_active = EXCLUDED.is_active,
  updated_at = now();
