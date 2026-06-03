-- Second batch of auto-fillable AcroForm forms (IRS identity theft + VA appeals).
INSERT INTO public.forms
  (key, name, description, institution, agency, category, form_type, market,
   pdf_url, fillable_url, online_url, official_source_url)
VALUES
  ('irs_form_14039',
   'Form 14039 — Identity Theft Affidavit',
   'Report to the IRS that you are a victim of tax-related identity theft (e.g., a fraudulent return was filed using your SSN).',
   'IRS', 'irs', 'tax', 'form', 'us',
   'https://www.irs.gov/pub/irs-pdf/f14039.pdf',
   'https://www.irs.gov/pub/irs-pdf/f14039.pdf',
   NULL,
   'https://www.irs.gov/forms-pubs/about-form-14039'),

  ('va_form_21_526ez',
   'VA Form 21-526EZ — Application for Disability Compensation',
   'Apply for VA disability compensation and related benefits.',
   'Department of Veterans Affairs', 'va', 'social', 'form', 'us',
   'https://www.vba.va.gov/pubs/forms/VBA-21-526EZ-ARE.pdf',
   'https://www.vba.va.gov/pubs/forms/VBA-21-526EZ-ARE.pdf',
   NULL,
   'https://www.va.gov/find-forms/about-form-21-526ez/'),

  ('va_form_20_0996',
   'VA Form 20-0996 — Decision Review Request: Higher-Level Review',
   'Ask a more senior VA reviewer to take a new look at a prior decision (no new evidence).',
   'Department of Veterans Affairs', 'va', 'social', 'form', 'us',
   'https://www.vba.va.gov/pubs/forms/VBA-20-0996-ARE.pdf',
   'https://www.vba.va.gov/pubs/forms/VBA-20-0996-ARE.pdf',
   NULL,
   'https://www.va.gov/find-forms/about-form-20-0996/')
ON CONFLICT (key) DO NOTHING;
