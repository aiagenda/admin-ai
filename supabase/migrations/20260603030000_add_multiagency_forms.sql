-- Add more auto-fillable AcroForm forms across agencies (IRS + VA). The
-- pdf_url points to the official agency PDF; the fill-pdf-form edge function
-- fetches it server-side (browsers can't fetch these directly due to CORS).
INSERT INTO public.forms
  (key, name, description, institution, agency, category, form_type, market,
   pdf_url, fillable_url, online_url, official_source_url)
VALUES
  ('irs_form_911',
   'Form 911 — Request for Taxpayer Advocate Service Assistance',
   'Ask the Taxpayer Advocate Service for help when an IRS problem is causing financial hardship or hasn''t been resolved through normal channels.',
   'IRS', 'irs', 'tax', 'form', 'us',
   'https://www.irs.gov/pub/irs-pdf/f911.pdf',
   'https://www.irs.gov/pub/irs-pdf/f911.pdf',
   NULL,
   'https://www.irs.gov/forms-pubs/about-form-911'),

  ('irs_form_9423',
   'Form 9423 — Collection Appeal Request',
   'Appeal an IRS collection action (lien, levy, or seizure) under the Collection Appeals Program.',
   'IRS', 'irs', 'tax', 'form', 'us',
   'https://www.irs.gov/pub/irs-pdf/f9423.pdf',
   'https://www.irs.gov/pub/irs-pdf/f9423.pdf',
   NULL,
   'https://www.irs.gov/forms-pubs/about-form-9423'),

  ('va_form_20_0995',
   'VA Form 20-0995 — Decision Review Request: Supplemental Claim',
   'Submit new and relevant evidence to have VA review a prior benefit decision (Supplemental Claim lane).',
   'Department of Veterans Affairs', 'va', 'social', 'form', 'us',
   'https://www.vba.va.gov/pubs/forms/VBA-20-0995-ARE.pdf',
   'https://www.vba.va.gov/pubs/forms/VBA-20-0995-ARE.pdf',
   NULL,
   'https://www.va.gov/find-forms/about-form-20-0995/')
ON CONFLICT (key) DO NOTHING;
