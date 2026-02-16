-- NAV nyomtatványok: Fizetési könnyítés iránti kérelem és kapcsolódó űrlapok
-- Megjelennek a Result oldalon, ha a dokumentum adózási végrehajtás / részletfizetés témájú.

-- Biztosítjuk, hogy a forms.key egyedi legyen (ON CONFLICT-hez kell)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.forms'::regclass
      AND conname IN ('forms_key_key', 'forms_key_unique')
  ) THEN
    ALTER TABLE public.forms ADD CONSTRAINT forms_key_unique UNIQUE (key);
  END IF;
END $$;

INSERT INTO public.forms (
  key,
  name,
  pdf_url,
  online_url,
  institution,
  description,
  form_type,
  category,
  tags,
  official_source_url
) VALUES
(
  'nav_fizetesi_konnyites_kerelm',
  'Fizetési könnyítés iránti kérelem (NAV)',
  'https://nav.gov.hu/Elethelyzetek-adozasa/ugyintezeshez/Fizetesi-nehezsegek-kezelese',
  'https://nav.gov.hu/Elethelyzetek-adozasa/ugyintezeshez/Fizetesi-nehezsegek-kezelese',
  'NAV',
  'Részletfizetésre, halasztásra vagy mérséklésre irányuló kérelem. Magánszemélyeknek és egyéni vállalkozóknak (FAM01). A nyomtatvány letölthető a NAV oldaláról, vagy kitölthető online (ONYA).',
  'form',
  'adozas',
  ARRAY['adozas', 'részletfizetés', 'végrehajtás', 'fizetési könnyítés'],
  'https://nav.gov.hu/Elethelyzetek-adozasa/ugyintezeshez/Fizetesi-nehezsegek-kezelese'
),
(
  'nav_atvezetesi_kerelm',
  'Átvezetési kérelem (NAV)',
  'https://nav.gov.hu/nyomtatvanyok/letoltesek_egyeb/adatlap/adatlapok_fizkonny_20130101',
  'https://nav.gov.hu/Elethelyzetek-adozasa/ugyintezeshez/Fizetesi-nehezsegek-kezelese',
  'NAV',
  'Adatlapok fizetési könnyítésre és/vagy mérséklésre irányuló kérelmek elbírálásához. Végrehajtási eljárásnál részletfizetés vagy átvezetés kérvényezéséhez.',
  'form',
  'adozas',
  ARRAY['adozas', 'részletfizetés', 'átvezetés', 'végrehajtás'],
  'https://nav.gov.hu/nyomtatvanyok/letoltesek_egyeb/adatlap/adatlapok_fizkonny_20130101'
)
ON CONFLICT (key) DO NOTHING;
