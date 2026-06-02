-- English-only display names for US IRS playbooks (no Hungarian in UI)
UPDATE public.playbooks SET name = 'IRS: Intent to levy (CP504, LT11)' WHERE doc_type = 'irs_notice_intent_to_levy';
UPDATE public.playbooks SET name = 'IRS: Balance due (CP14 and similar)' WHERE doc_type = 'irs_notice_balance_due';
UPDATE public.playbooks SET name = 'General IRS correspondence' WHERE doc_type = 'irs_notice_generic';
