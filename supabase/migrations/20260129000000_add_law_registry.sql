-- Law Registry: jogszabály metaadatok tárolása (NEM teljes szöveg, csak link-out + ellenőrzési instrukciók)
-- Cél: jogszabálynév / rövidítés alapján releváns hivatkozásokat és ellenőrzési instrukciót adni

CREATE TABLE IF NOT EXISTS public.law_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name TEXT NOT NULL UNIQUE,           -- Rövid név (pl. "Art.", "Áfa tv.", "Ákr.")
  official_title TEXT NOT NULL,              -- Hivatalos cím (pl. "2017. évi CL. törvény az adózás rendjéről")
  source_url TEXT NOT NULL,                  -- NJT vagy más hivatalos forrás URL
  aliases TEXT[] DEFAULT '{}',               -- Alternatív nevek (pl. ["adózás rendje", "adózási törvény"])
  topics TEXT[] DEFAULT '{}',                -- Témák/kulcsszavak (pl. ["NAV", "határidő", "bírság"])
  typical_sections JSONB DEFAULT '{}',       -- Gyakori szakaszok téma szerint (pl. {"hiánypótlás": "69-71. §", "bírság": "220-226. §"})
  notes TEXT,                                -- Megjegyzések, tippek
  is_active BOOLEAN DEFAULT true,            -- Aktív-e (elavult jogszabályok kikapcsolhatók)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index az alias kereséshez
CREATE INDEX IF NOT EXISTS idx_law_registry_aliases ON public.law_registry USING GIN (aliases);
CREATE INDEX IF NOT EXISTS idx_law_registry_topics ON public.law_registry USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_law_registry_short_name ON public.law_registry (short_name);

-- RLS
ALTER TABLE public.law_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Law registry is viewable by everyone" ON public.law_registry;
CREATE POLICY "Law registry is viewable by everyone"
  ON public.law_registry FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can insert law registry" ON public.law_registry;
CREATE POLICY "Only admins can insert law registry"
  ON public.law_registry FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can update law registry" ON public.law_registry;
CREATE POLICY "Only admins can update law registry"
  ON public.law_registry FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can delete law registry" ON public.law_registry;
CREATE POLICY "Only admins can delete law registry"
  ON public.law_registry FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Seed data: 15 legfontosabb magyar jogszabály (NAV / ügyintézés fókusz)
INSERT INTO public.law_registry (short_name, official_title, source_url, aliases, topics, typical_sections, notes) VALUES
-- Adózás
('Art.', '2017. évi CL. törvény az adózás rendjéről', 'https://njt.hu/jogszabaly/2017-150-00-00', 
  ARRAY['adózás rendje', 'adózási törvény', 'CL. törvény', 'adóigazgatás'],
  ARRAY['NAV', 'adózás', 'határidő', 'bírság', 'hiánypótlás', 'végrehajtás', 'részletfizetés', 'fellebbezés'],
  '{"hiánypótlás": "69-71. §", "határidők": "68. §, 77. §", "bírság": "220-226. §", "végrehajtás": "144-158. §", "részletfizetés": "198-199. §", "fellebbezés": "124-126. §"}'::jsonb,
  'A leggyakrabban hivatkozott jogszabály NAV ügyekben. Határidők, jogorvoslat, végrehajtás mind itt.'),

('Áfa tv.', '2007. évi CXXVII. törvény az általános forgalmi adóról', 'https://njt.hu/jogszabaly/2007-127-00-00',
  ARRAY['áfa törvény', 'CXXVII. törvény', 'forgalmi adó', 'áfa'],
  ARRAY['NAV', 'adózás', 'számla', 'áfa', 'levonás', 'bevallás'],
  '{"számlázás": "159-178. §", "adólevonás": "119-137. §", "adómérték": "82-84. §", "bevallás": "184-188. §"}'::jsonb,
  'Számlázási, áfa-levonási kérdéseknél releváns.'),

('Szja tv.', '1995. évi CXVII. törvény a személyi jövedelemadóról', 'https://njt.hu/jogszabaly/1995-117-00-00',
  ARRAY['szja törvény', 'CXVII. törvény', 'személyi jövedelemadó', 'jövedelemadó'],
  ARRAY['NAV', 'adózás', 'szja', 'munkabér', 'adóbevallás', 'kedvezmények'],
  '{"jövedelem típusok": "15-28. §", "kedvezmények": "29-44/C. §", "adóelőleg": "46-49. §", "bevallás": "11-14. §"}'::jsonb,
  'Személyi jövedelemadóval kapcsolatos ügyeknél.'),

('Tao tv.', '1996. évi LXXXI. törvény a társasági adóról', 'https://njt.hu/jogszabaly/1996-81-00-00',
  ARRAY['társasági adó törvény', 'LXXXI. törvény', 'társasági adó', 'tao'],
  ARRAY['NAV', 'adózás', 'társasági adó', 'cég', 'vállalkozás'],
  '{"adóalap": "6-8. §", "adómérték": "19. §", "kedvezmények": "22-29. §"}'::jsonb,
  'Cégek, vállalkozások adózásánál releváns.'),

-- Eljárási szabályok
('Ákr.', '2016. évi CL. törvény az általános közigazgatási rendtartásról', 'https://njt.hu/jogszabaly/2016-150-00-00',
  ARRAY['közigazgatási rendtartás', 'CL/2016. törvény', 'ákr'],
  ARRAY['közigazgatás', 'hatóság', 'fellebbezés', 'jogorvoslat', 'határidő', 'eljárás'],
  '{"határidők": "50-52. §", "fellebbezés": "116-121. §", "végrehajtás": "131-134. §", "kézbesítés": "85-87. §"}'::jsonb,
  'Általános hatósági eljárási szabályok. Ha az Art. nem szabályoz valamit, az Ákr. az irányadó.'),

('Vht.', '1994. évi LIII. törvény a bírósági végrehajtásról', 'https://njt.hu/jogszabaly/1994-53-00-00',
  ARRAY['végrehajtási törvény', 'LIII. törvény', 'végrehajtás'],
  ARRAY['végrehajtás', 'adósság', 'foglalás', 'árverés', 'letiltás', 'inkasszó'],
  '{"munkabér letiltás": "61-78. §", "ingófoglalás": "79-99. §", "ingatlan végrehajtás": "140-163. §", "jogorvoslat": "217-222. §"}'::jsonb,
  'Bírósági és adóvégrehajtási ügyeknél. Munkabér-letiltás, foglalás szabályai.'),

-- Társadalombiztosítás
('Tbj.', '2019. évi CXXII. törvény a társadalombiztosítás ellátásaira jogosultakról', 'https://njt.hu/jogszabaly/2019-122-00-00',
  ARRAY['tb törvény', 'CXXII/2019. törvény', 'társadalombiztosítás', 'tb'],
  ARRAY['TB', 'járulék', 'biztosítás', 'egészségügy', 'nyugdíj'],
  '{"biztosítottak": "3-17. §", "járulékfizetés": "18-40. §", "ellátások": "41-62. §"}'::jsonb,
  'TB járulék, biztosítási jogviszony kérdései.'),

('Ebtv.', '1997. évi LXXXIII. törvény a kötelező egészségbiztosítás ellátásairól', 'https://njt.hu/jogszabaly/1997-83-00-00',
  ARRAY['egészségbiztosítási törvény', 'LXXXIII. törvény', 'ebtv', 'egészségbiztosítás'],
  ARRAY['TB', 'egészségügy', 'táppénz', 'GYED', 'GYES', 'betegszabadság'],
  '{"táppénz": "42-48. §", "GYED": "39-42/G. §", "baleseti ellátás": "52-63. §"}'::jsonb,
  'Táppénz, GYED, GYES, baleseti ellátás szabályai.'),

-- Munkajog
('Mt.', '2012. évi I. törvény a munka törvénykönyvéről', 'https://njt.hu/jogszabaly/2012-1-00-00',
  ARRAY['munka törvénykönyve', 'I/2012. törvény', 'munkatörvény', 'munka törvénykönyv'],
  ARRAY['munkajog', 'munkaviszony', 'felmondás', 'munkabér', 'szabadság', 'munkaidő'],
  '{"munkaviszony létesítése": "42-51. §", "felmondás": "64-92. §", "munkabér": "136-164. §", "szabadság": "115-125. §"}'::jsonb,
  'Munkaügyi viták, felmondás, munkabér kérdései.'),

-- Polgári jog
('Ptk.', '2013. évi V. törvény a Polgári Törvénykönyvről', 'https://njt.hu/jogszabaly/2013-5-00-00',
  ARRAY['polgári törvénykönyv', 'V/2013. törvény', 'ptk', 'polgári jog'],
  ARRAY['szerződés', 'kártérítés', 'öröklés', 'tulajdon', 'elévülés'],
  '{"szerződések általában": "6:58-6:212. §", "elévülés": "6:21-6:25. §", "kártérítés": "6:518-6:564. §"}'::jsonb,
  'Szerződéses viták, kártérítés, elévülés kérdései.'),

-- Adatvédelem
('GDPR', 'Az Európai Parlament és a Tanács (EU) 2016/679 rendelete', 'https://eur-lex.europa.eu/legal-content/HU/TXT/?uri=CELEX%3A32016R0679',
  ARRAY['adatvédelmi rendelet', 'általános adatvédelmi rendelet', '2016/679 rendelet'],
  ARRAY['adatvédelem', 'személyes adat', 'hozzájárulás', 'törlés', 'tájékoztatás'],
  '{"jogalapok": "6. cikk", "érintetti jogok": "15-22. cikk", "adatkezelői kötelezettségek": "24-43. cikk"}'::jsonb,
  'Adatvédelmi kérdések, személyes adatok kezelése.'),

('Infotv.', '2011. évi CXII. törvény az információs önrendelkezési jogról', 'https://njt.hu/jogszabaly/2011-112-00-00',
  ARRAY['adatvédelmi törvény', 'CXII/2011. törvény', 'info törvény'],
  ARRAY['adatvédelem', 'közérdekű adat', 'NAIH', 'adatigénylés'],
  '{"alapelvek": "4. §", "érintetti jogok": "14-21. §", "NAIH": "38-69. §"}'::jsonb,
  'Magyar adatvédelmi szabályok, NAIH eljárás.'),

-- Számvitel
('Számv. tv.', '2000. évi C. törvény a számvitelről', 'https://njt.hu/jogszabaly/2000-100-00-00',
  ARRAY['számviteli törvény', 'C/2000. törvény', 'számvitel'],
  ARRAY['számvitel', 'könyvelés', 'beszámoló', 'számla', 'bizonylat'],
  '{"bizonylatok": "165-169. §", "beszámoló": "4-20. §", "könyvvezetés": "160-164. §"}'::jsonb,
  'Számviteli bizonylatok, könyvvezetés szabályai.'),

-- Cégeljárás
('Ctv.', '2006. évi V. törvény a cégnyilvánosságról', 'https://njt.hu/jogszabaly/2006-5-00-00',
  ARRAY['cégtörvény', 'V/2006. törvény', 'cégnyilvántartás'],
  ARRAY['cég', 'cégbejegyzés', 'változásbejegyzés', 'cégjegyzék'],
  '{"cégbejegyzés": "23-44. §", "változásbejegyzés": "45-60. §", "törlés": "81-92. §"}'::jsonb,
  'Cégbejegyzés, változásbejelentés, cégadatok.'),

-- Ingatlan
('Inytv.', '1997. évi CXLI. törvény az ingatlan-nyilvántartásról', 'https://njt.hu/jogszabaly/1997-141-00-00',
  ARRAY['ingatlan-nyilvántartási törvény', 'CXLI. törvény', 'földhivatal'],
  ARRAY['ingatlan', 'tulajdonjog', 'jelzálog', 'földhivatal', 'tulajdoni lap'],
  '{"bejegyzés": "26-52. §", "törlés": "62-68. §", "tulajdoni lap": "14-25. §"}'::jsonb,
  'Ingatlan-nyilvántartási ügyek, tulajdoni lap, bejegyzések.')

ON CONFLICT (short_name) DO NOTHING;

-- resolve_law_reference RPC funkció: név/alias alapján megkeresi a jogszabályt
CREATE OR REPLACE FUNCTION public.resolve_law_reference(
  _name_or_alias TEXT
)
RETURNS TABLE (
  id UUID,
  short_name TEXT,
  official_title TEXT,
  source_url TEXT,
  aliases TEXT[],
  topics TEXT[],
  typical_sections JSONB,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized TEXT;
BEGIN
  -- Normalize input: lowercase, trim, remove trailing dot
  _normalized := LOWER(TRIM(REGEXP_REPLACE(_name_or_alias, '\.$', '')));
  
  RETURN QUERY
  SELECT 
    lr.id,
    lr.short_name,
    lr.official_title,
    lr.source_url,
    lr.aliases,
    lr.topics,
    lr.typical_sections,
    lr.notes
  FROM public.law_registry lr
  WHERE 
    lr.is_active = true
    AND (
      -- Match short_name (case-insensitive, with or without trailing dot)
      LOWER(REGEXP_REPLACE(lr.short_name, '\.$', '')) = _normalized
      -- Match any alias
      OR EXISTS (
        SELECT 1 FROM UNNEST(lr.aliases) AS alias 
        WHERE LOWER(alias) LIKE '%' || _normalized || '%'
      )
      -- Match official_title
      OR LOWER(lr.official_title) LIKE '%' || _normalized || '%'
    )
  ORDER BY 
    -- Prefer exact short_name match
    CASE WHEN LOWER(REGEXP_REPLACE(lr.short_name, '\.$', '')) = _normalized THEN 0 ELSE 1 END,
    -- Then prefer shorter aliases (more specific)
    LENGTH(lr.short_name)
  LIMIT 5;
END;
$$;

-- get_laws_by_topics: témák alapján releváns jogszabályok
CREATE OR REPLACE FUNCTION public.get_laws_by_topics(
  _topics TEXT[]
)
RETURNS TABLE (
  id UUID,
  short_name TEXT,
  official_title TEXT,
  source_url TEXT,
  topics TEXT[],
  typical_sections JSONB,
  match_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.id,
    lr.short_name,
    lr.official_title,
    lr.source_url,
    lr.topics,
    lr.typical_sections,
    (SELECT COUNT(*)::INTEGER FROM UNNEST(lr.topics) t WHERE t = ANY(_topics)) AS match_count
  FROM public.law_registry lr
  WHERE 
    lr.is_active = true
    AND lr.topics && _topics  -- Array overlap
  ORDER BY match_count DESC, lr.short_name
  LIMIT 10;
END;
$$;

COMMENT ON TABLE public.law_registry IS 'Jogszabály metaadatok: rövid név, hivatalos cím, NJT link, témák. NEM tartalmaz teljes szöveget.';
COMMENT ON FUNCTION public.resolve_law_reference IS 'Jogszabály keresés név/alias alapján';
COMMENT ON FUNCTION public.get_laws_by_topics IS 'Jogszabályok keresése témák/kulcsszavak alapján';
