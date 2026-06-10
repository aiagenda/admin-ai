-- Additional federal forms referenced by guided action paths.
-- IRS 9423 (CAP appeal) and 911 (Taxpayer Advocate) have stable irs.gov PDFs.
-- SSA forms block automated hotlink fetches, so we store the official PDF as the
-- download link and the .html landing page as the online action.

INSERT INTO public.forms
  (key, name, description, institution, agency, category, form_type, market,
   pdf_url, fillable_url, online_url, official_source_url)
VALUES
  ('irs_form_9423',
   'Form 9423 — Collection Appeal Request',
   'Appeal an IRS collection action (lien, levy, seizure, or installment agreement termination) under the Collection Appeals Program (CAP).',
   'IRS', 'irs', 'tax', 'form', 'us',
   'https://www.irs.gov/pub/irs-pdf/f9423.pdf',
   'https://www.irs.gov/pub/irs-pdf/f9423.pdf',
   NULL,
   'https://www.irs.gov/appeals/collection-appeals-program'),

  ('irs_form_911',
   'Form 911 — Request for Taxpayer Advocate Service Assistance',
   'Ask the Taxpayer Advocate Service (TAS) for help when an IRS problem is causing financial hardship or has not been resolved through normal channels.',
   'IRS', 'irs', 'tax', 'form', 'us',
   'https://www.irs.gov/pub/irs-pdf/f911.pdf',
   'https://www.irs.gov/pub/irs-pdf/f911.pdf',
   NULL,
   'https://www.irs.gov/forms-pubs/about-form-911'),

  ('ssa_form_561',
   'Form SSA-561 — Request for Reconsideration',
   'Ask Social Security to review a decision you disagree with (including an overpayment determination).',
   'Social Security Administration', 'ssa', 'social', 'form', 'us',
   'https://www.ssa.gov/forms/ssa-561.pdf',
   'https://www.ssa.gov/forms/ssa-561.pdf',
   'https://www.ssa.gov/forms/ssa-561.html',
   'https://www.ssa.gov/forms/ssa-561.html'),

  ('ssa_form_632',
   'Form SSA-632 — Request for Waiver of Overpayment Recovery',
   'Ask SSA to waive (forgive) an overpayment when it was not your fault and repaying it would cause hardship.',
   'Social Security Administration', 'ssa', 'social', 'form', 'us',
   'https://www.ssa.gov/forms/ssa-632bk.pdf',
   'https://www.ssa.gov/forms/ssa-632bk.pdf',
   'https://www.ssa.gov/forms/ssa-632.html',
   'https://www.ssa.gov/forms/ssa-632.html'),

  ('ssa_form_634',
   'Form SSA-634 — Request for Change in Overpayment Recovery Rate',
   'Ask SSA to lower the monthly amount withheld to repay an overpayment so it is affordable.',
   'Social Security Administration', 'ssa', 'social', 'form', 'us',
   'https://www.ssa.gov/forms/ssa-634.pdf',
   'https://www.ssa.gov/forms/ssa-634.pdf',
   'https://www.ssa.gov/forms/ssa-634.html',
   'https://www.ssa.gov/forms/ssa-634.html')
ON CONFLICT (key) DO NOTHING;
