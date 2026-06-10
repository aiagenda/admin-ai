-- Launch fix: the fallback "unknown" playbook still had Hungarian content
-- ("Ismeretlen dokumentum"), which surfaced on the Result page for any
-- document whose type could not be identified. Replace it with US English
-- content and remove the remaining dead Hungarian-market playbooks.

-- 1. English fallback for unidentified documents (kept as the US fallback).
UPDATE public.playbooks
SET market = 'us',
    jurisdiction = 'federal',
    name = 'Unknown document',
    description = 'We could not confidently identify this document type. Here are general steps for handling any official letter.',
    steps = '[
      {"order": 1, "title": "Identify the sender", "description": "Check the letterhead, agency name, and subject line. Who sent it (e.g., the IRS, your state tax agency, or SSA) and why?", "law_refs": []},
      {"order": 2, "title": "Find any deadlines", "description": "Look for due dates or response deadlines in the letter and add them to your calendar right away.", "law_refs": []},
      {"order": 3, "title": "Check for amounts", "description": "See whether the letter states a balance due, a refund, or a payment, and confirm the amount on the document itself.", "law_refs": []},
      {"order": 4, "title": "Decide your next step", "description": "Most letters ask you to pay, respond, or send information. If anything is unclear, contact the issuing agency or a licensed tax professional or attorney before acting.", "law_refs": []}
    ]'::jsonb,
    warnings = ARRAY[]::TEXT[]
WHERE doc_type = 'unknown';

-- 2. Remove leftover Hungarian-market playbooks (NAV and Hungarian civil docs).
--    These can never apply to US documents and only risk surfacing Hungarian text.
DELETE FROM public.playbooks
WHERE market = 'hu'
   OR doc_type LIKE 'nav_%'
   OR doc_type IN ('execution', 'official_decision');
