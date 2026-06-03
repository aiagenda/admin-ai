-- Structured fields the AI extracts from a letter (taxpayer name, address,
-- tax year, notice number, amount, etc.) used to pre-fill response forms so
-- the user mostly reviews and confirms instead of retyping everything.
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS extracted_fields JSONB;

COMMENT ON COLUMN public.analyses.extracted_fields IS
  'AI-extracted structured fields for form prefill: taxpayer_name, address, city_state_zip, tax_year, notice_number, account_number, amount_due, agency';
