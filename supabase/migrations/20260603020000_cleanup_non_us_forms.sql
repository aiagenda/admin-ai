-- Remove leftover Hungarian/NAV forms that were incorrectly marked market='us'.
-- The only real US forms are the IRS forms (key prefix 'irs_form_'). Everything
-- else in the US market was junk from the original Hungarian data set.
DELETE FROM public.forms
WHERE market = 'us'
  AND key NOT LIKE 'irs\_form\_%';
