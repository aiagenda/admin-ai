-- Playbooks: doc_type alapú teendő-folyamatok forráslinkekkel
-- Cél: a leggyakoribb dokumentum típusokhoz lépésről-lépésre útmutatók

CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL UNIQUE,             -- Dokumentum típus (pl. "nav_missing_info", "nav_fine", "execution")
  name TEXT NOT NULL,                        -- Magyar név (pl. "NAV hiánypótlási felhívás")
  description TEXT,                          -- Rövid leírás
  trigger_categories TEXT[] DEFAULT '{}',   -- Mely detected_category értékekre aktiválódik
  trigger_tags TEXT[] DEFAULT '{}',         -- Mely detected_tags értékekre aktiválódik
  trigger_keywords TEXT[] DEFAULT '{}',     -- Kulcsszavak a dokumentum szövegében
  steps JSONB NOT NULL DEFAULT '[]',        -- Lépések: [{order, title, description, deadline_info?, law_refs?}]
  related_laws TEXT[] DEFAULT '{}',         -- Kapcsolódó jogszabályok short_name-jei (pl. ["Art.", "Ákr."])
  related_forms TEXT[] DEFAULT '{}',        -- Kapcsolódó űrlapok form.key értékei
  warnings TEXT[] DEFAULT '{}',             -- Fontos figyelmeztetések
  tips TEXT[] DEFAULT '{}',                 -- Hasznos tippek
  priority INTEGER DEFAULT 0,               -- Prioritás (magasabb = fontosabb, ha több playbook illeszkedik)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_playbooks_doc_type ON public.playbooks (doc_type);
CREATE INDEX IF NOT EXISTS idx_playbooks_trigger_categories ON public.playbooks USING GIN (trigger_categories);
CREATE INDEX IF NOT EXISTS idx_playbooks_trigger_tags ON public.playbooks USING GIN (trigger_tags);
CREATE INDEX IF NOT EXISTS idx_playbooks_trigger_keywords ON public.playbooks USING GIN (trigger_keywords);

-- RLS
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Playbooks are viewable by everyone" ON public.playbooks;
CREATE POLICY "Playbooks are viewable by everyone"
  ON public.playbooks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can insert playbooks" ON public.playbooks;
CREATE POLICY "Only admins can insert playbooks"
  ON public.playbooks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can update playbooks" ON public.playbooks;
CREATE POLICY "Only admins can update playbooks"
  ON public.playbooks FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can delete playbooks" ON public.playbooks;
CREATE POLICY "Only admins can delete playbooks"
  ON public.playbooks FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Seed data: 7 legfontosabb playbook (NAV fókusz)
INSERT INTO public.playbooks (doc_type, name, description, trigger_categories, trigger_tags, trigger_keywords, steps, related_laws, related_forms, warnings, tips, priority) VALUES

-- 1. NAV Hiánypótlás
('nav_missing_info', 'NAV hiánypótlási felhívás', 'A NAV hiánypótlásra hívja fel, mert a beadott dokumentum/bevallás hiányos vagy hibás.',
  ARRAY['adozas'],
  ARRAY['hiánypótlás', 'hianyopotlas', 'pótlás', 'kiegészítés'],
  ARRAY['hiánypótlás', 'hiánypótlási', 'pótolni szíveskedjen', 'kiegészíteni', 'hiányosság'],
  '[
    {"order": 1, "title": "Határidő ellenőrzése", "description": "Nézd meg a levélben szereplő határidőt. Általában 8-15 nap a hiánypótlásra.", "deadline_info": "A határidő elmulasztása esetén a NAV dönthet a rendelkezésre álló adatok alapján, vagy elutasíthatja a kérelmet.", "law_refs": ["Art. 69. §"]},
    {"order": 2, "title": "Hiányzó dokumentumok/adatok azonosítása", "description": "Olvasd végig, pontosan mit kér a NAV. Gyűjtsd össze a szükséges iratokat.", "law_refs": []},
    {"order": 3, "title": "Válasz elkészítése", "description": "Készítsd el a hiánypótlást írásban. Hivatkozz az ügyiratszámra és a felhívás számára.", "law_refs": []},
    {"order": 4, "title": "Beküldés", "description": "Küldd be a hiánypótlást: ügyfélkapun keresztül (eBEV), postán ajánlott levélben, vagy személyesen a NAV ügyfélszolgálatán.", "law_refs": ["Art. 79. §"]},
    {"order": 5, "title": "Határidő-hosszabbítás kérése (ha szükséges)", "description": "Ha nem tudsz időben válaszolni, kérj határidő-hosszabbítást a lejárat ELŐTT, indokolással.", "law_refs": ["Art. 71. §"]}
  ]'::jsonb,
  ARRAY['Art.', 'Ákr.'],
  ARRAY[]::TEXT[],
  ARRAY['A határidő elmulasztása hátrányos következményekkel járhat!', 'Ha nem válaszolsz, a NAV a rendelkezésre álló adatok alapján dönt.'],
  ARRAY['A hiánypótlást mindig az ügyiratszámra hivatkozva küldd be.', 'Őrizd meg a beküldés igazolását (feladóvevény, eBEV visszaigazolás).'],
  100),

-- 2. NAV Bírság / Mulasztási bírság
('nav_fine', 'NAV bírság / mulasztási bírság', 'A NAV mulasztási bírságot vagy egyéb szankciót szabott ki.',
  ARRAY['adozas'],
  ARRAY['bírság', 'birsag', 'mulasztási bírság', 'szankció', 'pótlék'],
  ARRAY['mulasztási bírság', 'bírságot szab', 'szankció', 'köteles megfizetni'],
  '[
    {"order": 1, "title": "Határozat megértése", "description": "Olvasd el figyelmesen a határozatot: mi a bírság oka, mennyi az összeg, mi a fizetési határidő.", "law_refs": ["Art. 220-226. §"]},
    {"order": 2, "title": "Jogorvoslati lehetőség mérlegelése", "description": "Fellebbezhetsz 15 napon belül, ha vitatod a döntést. A fellebbezésnek a határozat kézhezvételétől számított 15 napon belül kell megérkeznie.", "deadline_info": "Fellebbezési határidő: 15 nap a kézhezvételtől.", "law_refs": ["Art. 124-126. §", "Ákr. 116-121. §"]},
    {"order": 3, "title": "Fizetés vagy részletfizetés", "description": "Ha nem fellebbezel: fizess határidőre. Ha nem tudod egyben: kérj részletfizetést vagy fizetési halasztást.", "law_refs": ["Art. 198-199. §"]},
    {"order": 4, "title": "Részletfizetési kérelem", "description": "A kérelmet a NAV-hoz kell benyújtani, indokolással és a fizetőképességet alátámasztó dokumentumokkal.", "law_refs": ["Art. 199. §"]},
    {"order": 5, "title": "Befizetés dokumentálása", "description": "A befizetésről őrizd meg az igazolást. Banki átutalásnál a közleményben tüntesd fel az adószámot és az ügyiratszámot.", "law_refs": []}
  ]'::jsonb,
  ARRAY['Art.', 'Ákr.'],
  ARRAY['nav_fizetesi_konnyites', 'nav_atvezetesi_kerelem'],
  ARRAY['A fellebbezési határidő jogvesztő: 15 nap után már nem lehet fellebbezni!', 'A bírság meg nem fizetése végrehajtási eljárást vonhat maga után.'],
  ARRAY['A fellebbezésnek halasztó hatálya van, a fizetési kötelezettség csak a jogerős határozat után áll be.', 'Részletfizetés kérése nem függeszti fel a végrehajtást automatikusan.'],
  95),

-- 3. NAV Fizetési felszólítás / Inkasszó veszély
('nav_payment_demand', 'NAV fizetési felszólítás', 'A NAV fizetési felszólítást küldött, inkasszó vagy végrehajtás fenyeget.',
  ARRAY['adozas'],
  ARRAY['fizetési felszólítás', 'tartozás', 'hátralek', 'inkasszó', 'végrehajtás'],
  ARRAY['fizetési felszólítás', 'tartozik', 'hátralék', 'végrehajtás', 'inkasszó', 'azonnali beszedési megbízás'],
  '[
    {"order": 1, "title": "Tartozás ellenőrzése", "description": "Ellenőrizd az eBEV-ben vagy az Ügyfélkapun a folyószámla-kivonatodat: valóban fennáll-e a tartozás.", "law_refs": ["Art. 79. §"]},
    {"order": 2, "title": "Ha vitatod a tartozást", "description": "Ha téves a követelés, írásban jelezd a NAV-nak, csatolva a bizonyítékokat (befizetési igazolások, bevallások).", "law_refs": ["Art. 124. §"]},
    {"order": 3, "title": "Ha valós a tartozás", "description": "Fizess mielőbb, vagy kérj részletfizetést/fizetési halasztást az inkasszó elkerülése érdekében.", "law_refs": ["Art. 198-199. §"]},
    {"order": 4, "title": "Inkasszó esetén", "description": "Ha már inkasszáltak: a bank által levont összeg jóváírásra kerül. Ha jogtalan volt, panaszt tehetsz.", "law_refs": ["Art. 156. §"]}
  ]'::jsonb,
  ARRAY['Art.', 'Vht.'],
  ARRAY['nav_fizetesi_konnyites'],
  ARRAY['Az inkasszó bármikor, előzetes értesítés nélkül is bekövetkezhet, ha lejárt tartozásod van!', 'A NAV a bankszámlád mellett a munkabéredet is letilthatja.'],
  ARRAY['A folyószámla-kivonatot rendszeresen ellenőrizd az eBEV-ben.', 'Ha nincs elegendő egyenleg, a részletfizetési kérelem segíthet.'],
  90),

-- 4. Végrehajtási értesítés
('execution', 'Végrehajtási értesítés', 'Végrehajtási eljárás indult vagy végrehajtási cselekmény történt (foglalás, letiltás, árverés).',
  ARRAY['adozas', 'penzugy'],
  ARRAY['végrehajtás', 'vegrehajtás', 'foglalás', 'letiltás', 'árverés', 'inkasszó'],
  ARRAY['végrehajtás', 'végrehajtó', 'foglalás', 'letiltás', 'árverés', 'ingófoglalás'],
  '[
    {"order": 1, "title": "Sürgős: értsd meg a helyzetet", "description": "Olvasd el figyelmesen az értesítést. Mi a végrehajtás jogcíme? Mekkora az összeg? Mi a következő lépés?", "law_refs": ["Vht. 7-10. §"]},
    {"order": 2, "title": "Ellenőrizd a jogalapot", "description": "Van-e jogerős határozat vagy ítélet, ami alapján végrehajtanak? Ha nincs, jogorvoslattal élhetsz.", "law_refs": ["Vht. 217-222. §"]},
    {"order": 3, "title": "Végrehajtás felfüggesztése", "description": "Bizonyos esetekben kérheted a végrehajtás felfüggesztését (pl. méltányosság, részletfizetés).", "law_refs": ["Vht. 48-52. §"]},
    {"order": 4, "title": "Fizetés vagy egyezség", "description": "A végrehajtás költséges. Ha lehetséges, fizess vagy egyezz meg a végrehajtóval/hitelezővel.", "law_refs": []},
    {"order": 5, "title": "Mentességek", "description": "Bizonyos vagyontárgyak és a munkabér egy része mentes a végrehajtás alól. Ismerd meg a jogaidat!", "law_refs": ["Vht. 61-78. §", "Vht. 90-92. §"]}
  ]'::jsonb,
  ARRAY['Vht.', 'Art.'],
  ARRAY[]::TEXT[],
  ARRAY['A végrehajtás sürgős ügy: az időhúzás csak növeli a költségeket!', 'A végrehajtó költségei a tartozáshoz adódnak.'],
  ARRAY['A munkabér 33%-a (gyerektartásnál 50%-a) általában végrehajtás alól mentes.', 'Létfenntartáshoz szükséges ingóságok is mentesek lehetnek.'],
  85),

-- 5. Általános hatósági határozat
('official_decision', 'Általános hatósági határozat', 'Hatóság (nem NAV) határozatot hozott, amelyre reagálni kell.',
  ARRAY['hatosagi', 'onkormanyzat'],
  ARRAY['határozat', 'hatarozat', 'végzés', 'döntés'],
  ARRAY['határozat', 'végzés', 'kötelezem', 'elrendelem', 'fellebbezés'],
  '[
    {"order": 1, "title": "Határozat értelmezése", "description": "Olvasd el a rendelkező részt: mi a döntés lényege, mi a kötelezettséged.", "law_refs": ["Ákr. 80-81. §"]},
    {"order": 2, "title": "Jogorvoslati tájékoztatás", "description": "A határozat végén szerepel a jogorvoslati tájékoztatás: hova, meddig, hogyan fellebbezhetsz.", "law_refs": ["Ákr. 116-121. §"]},
    {"order": 3, "title": "Fellebbezés (ha indokolt)", "description": "Fellebbezni általában 15 napon belül lehet. A fellebbezést a döntést hozó hatóságnál kell benyújtani.", "deadline_info": "Általános fellebbezési határidő: 15 nap.", "law_refs": ["Ákr. 118. §"]},
    {"order": 4, "title": "Teljesítés (ha nem fellebbezel)", "description": "Ha elfogadod a határozatot, teljesítsd a benne foglalt kötelezettséget határidőre.", "law_refs": []}
  ]'::jsonb,
  ARRAY['Ákr.'],
  ARRAY[]::TEXT[],
  ARRAY['A fellebbezési határidő jogvesztő!', 'Egyes határozatok azonnal végrehajthatók (pl. közérdek védelme).'],
  ARRAY['A fellebbezésben új tényeket és bizonyítékokat is előadhatsz.', 'Ha a határidő hétvégére esik, általában a következő munkanap a lejárat.'],
  70),

-- 6. Számla / Fizetési felszólítás (nem hatósági)
('invoice', 'Számla / fizetési felszólítás', 'Számla vagy fizetési felszólítás érkezett (közmű, szolgáltató, bank, stb.).',
  ARRAY['szamla', 'penzugy', 'kozmu'],
  ARRAY['számla', 'szamla', 'fizetési felszólítás', 'tartozás', 'késedelem'],
  ARRAY['számla', 'fizetendő', 'esedékesség', 'fizetési felszólítás', 'késedelmi kamat'],
  '[
    {"order": 1, "title": "Számla ellenőrzése", "description": "Ellenőrizd a számla adatait: helyes-e az összeg, a szolgáltatás, a fogyasztás/mennyiség?", "law_refs": ["Áfa tv. 169. §"]},
    {"order": 2, "title": "Reklamáció (ha hibás)", "description": "Ha a számla hibás, reklamálj a kibocsátónál írásban, a számla számára hivatkozva.", "law_refs": []},
    {"order": 3, "title": "Fizetés", "description": "Ha a számla helyes, fizess határidőre a késedelmi kamat elkerülése érdekében.", "law_refs": ["Ptk. 6:48. §"]},
    {"order": 4, "title": "Részletfizetés (ha nem tudod egyben)", "description": "Kérj részletfizetési lehetőséget a szolgáltatótól, mielőtt a tartozás tovább nő.", "law_refs": []}
  ]'::jsonb,
  ARRAY['Áfa tv.', 'Ptk.'],
  ARRAY[]::TEXT[],
  ARRAY['A késedelmi kamat gyorsan nőhet!', 'A közüzemi tartozás szolgáltatás-kikapcsoláshoz vezethet.'],
  ARRAY['Csoportos beszedési megbízással elkerülheted a késedelmet.', 'Számlázási vitánál a fogyasztóvédelmi hatósághoz is fordulhatsz.'],
  60),

-- 7. Ismeretlen / egyéb dokumentum
('unknown', 'Ismeretlen dokumentum', 'A dokumentum típusa nem azonosítható egyértelműen.',
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  '[
    {"order": 1, "title": "Dokumentum azonosítása", "description": "Nézd meg a fejlécet, a kibocsátót, a tárgyat. Ki küldte és miért?", "law_refs": []},
    {"order": 2, "title": "Határidők keresése", "description": "Keresd meg a dokumentumban a határidőket, dátumokat. Írd fel a naptáradba.", "law_refs": []},
    {"order": 3, "title": "Teendők meghatározása", "description": "Mit kell tenned? Válaszolni, fizetni, megjelenni, dokumentumot benyújtani?", "law_refs": []},
    {"order": 4, "title": "Segítség kérése", "description": "Ha nem érted, kérj segítséget szakembertől (könyvelő, ügyvéd, ügyfélszolgálat).", "law_refs": []}
  ]'::jsonb,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY['Ne hagyd figyelmen kívül az ismeretlen levelet sem!'],
  ARRAY['Hatósági leveleknél a válasz elmulasztása hátrányos következményekkel járhat.'],
  10)

ON CONFLICT (doc_type) DO NOTHING;

-- get_matching_playbook: kategória és tagek alapján megkeresi a legjobb playbook-ot
CREATE OR REPLACE FUNCTION public.get_matching_playbook(
  _category TEXT DEFAULT NULL,
  _tags TEXT[] DEFAULT NULL,
  _content_keywords TEXT[] DEFAULT NULL
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
      -- Score based on matches
      CASE WHEN _category IS NOT NULL AND _category = ANY(p.trigger_categories) THEN 10 ELSE 0 END
      + COALESCE((SELECT COUNT(*)::INTEGER FROM UNNEST(p.trigger_tags) t WHERE _tags IS NOT NULL AND t = ANY(_tags)), 0) * 5
      + COALESCE((SELECT COUNT(*)::INTEGER FROM UNNEST(p.trigger_keywords) k WHERE _content_keywords IS NOT NULL AND k = ANY(_content_keywords)), 0) * 3
      + p.priority
    ) AS match_score
  FROM public.playbooks p
  WHERE 
    p.is_active = true
    AND (
      -- At least one trigger must match
      (_category IS NOT NULL AND _category = ANY(p.trigger_categories))
      OR (_tags IS NOT NULL AND p.trigger_tags && _tags)
      OR (_content_keywords IS NOT NULL AND p.trigger_keywords && _content_keywords)
      -- Or it's the fallback "unknown" type
      OR p.doc_type = 'unknown'
    )
  ORDER BY match_score DESC, p.priority DESC
  LIMIT 3;
END;
$$;

COMMENT ON TABLE public.playbooks IS 'Dokumentum típus alapú teendő-folyamatok (playbookok) forráslinkekkel';
COMMENT ON FUNCTION public.get_matching_playbook IS 'Kategória és tagek alapján megkeresi a legjobban illeszkedő playbook-ot';
