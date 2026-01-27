# Knowledge Base Pipeline - Használati útmutató

## Áttekintés

Az unified Knowledge Base Pipeline egy all-in-one script, ami automatikusan:
1. **Scraping**: Letölti a hivatalos magyar adminisztratív forrásokat (NAV, TB, EESZT, stb.)
2. **Chunking**: A dokumentumokat részekre bontja (500 karakter, 100 overlap)
3. **Embedding generálás**: OpenAI API-val embedding-eket generál
4. **Database storage**: Mindent elment az adatbázisba

## Előfeltételek

1. **Environment változók** (`.env` fájlban):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-api-key
   ```

2. **Függőségek telepítve**:
   ```bash
   npm install
   ```

## Használat

### Alap futtatás

```bash
npm run kb:import
```

Vagy közvetlenül:

```bash
npx tsx scripts/knowledge-base-pipeline.ts
```

## Mit csinál a script?

1. **Scraping fázis**:
   - Letölti az összes konfigurált forrást (NAV, TB, EESZT, stb.)
   - Cheerio-val strukturált HTML parsing
   - Szöveg tisztítás és normalizálás
   - Duplikátum ellenőrzés (source_url alapján)

2. **Chunking fázis**:
   - Dokumentumok részekre bontása (500 karakter, 100 overlap)
   - Metadata generálás

3. **Embedding generálás**:
   - OpenAI `text-embedding-3-small` model használata
   - Minden chunk-hoz embedding
   - Dokumentum szintű embedding is
   - Rate limiting és retry logika

4. **Database storage**:
   - `knowledge_documents` táblába mentés
   - `knowledge_chunks` táblába mentés (embedding-ekkel)

## Konfiguráció

A script konfigurációja a fájl tetején:

```typescript
const RATE_LIMIT_DELAY = 2500; // 2.5 másodperc delay források között
const CHUNK_SIZE = 500; // Chunk méret karakterekben
const CHUNK_OVERLAP = 100; // Overlap karakterekben
const MAX_CONTENT_LENGTH = 50000; // Max dokumentum hossz
```

## Források hozzáadása

Új forrásokat a `KNOWLEDGE_SOURCES` array-ben lehet hozzáadni:

```typescript
{
  url: "https://example.com/page",
  title: "Oldal címe",
  category: "adozas", // vagy: egeszsegugy, oktatas, szocialis, stb.
  sourceType: "official", // vagy: legal, form, guide, faq
  sourceInstitution: "NAV", // NAV, TB, EESZT, stb.
}
```

## Statisztikák

A script végén részletes statisztikákat mutat:
- Hány dokumentum lett scrapelve
- Hány lett kihagyva (duplikátum)
- Hány hibázott
- Hány chunk lett létrehozva
- Hány embedding lett generálva
- Összes futási idő
- Hibák listája

## Hibakezelés

- **Rate limiting**: Automatikus delay források között
- **Retry logika**: Embedding generálásnál 3 próbálkozás
- **Timeout kezelés**: 30 másodperces timeout HTTP kéréseknél
- **Error logging**: Minden hiba rögzítve a statisztikákban

## Költségek

**OpenAI API költségek** (hozzávetőleges):
- `text-embedding-3-small`: ~$0.02 per 1M token
- Egy átlagos dokumentum (~5000 karakter) ≈ ~1250 token
- 100 dokumentum ≈ ~$0.25

**Javaslat**: Kezdj kevés forrással, majd fokozatosan bővítsd.

## Következő lépések

1. **Futtasd a pipeline-t**:
   ```bash
   npm run kb:import
   ```

2. **Ellenőrizd az eredményeket**:
   - Knowledge Base Admin: `/admin/knowledge-base`
   - Supabase Dashboard: `knowledge_documents` és `knowledge_chunks` táblák

3. **Teszteld a RAG integrációt**:
   - Tölts fel egy dokumentumot
   - Nézd meg, hogy az AI használja-e a Knowledge Base-t

4. **Bővítsd a forrásokat**:
   - Adj hozzá több URL-t a `KNOWLEDGE_SOURCES` array-hez
   - Futtasd újra a pipeline-t

## Cron job beállítása (opcionális)

Havi automatikus frissítéshez:

```bash
# Crontab (Linux/Mac)
0 2 1 * * cd /path/to/project && npm run kb:import >> /var/log/kb-pipeline.log 2>&1
```

## Troubleshooting

### "Missing required environment variables"
- Ellenőrizd, hogy a `.env` fájlban minden változó megvan-e
- A `SUPABASE_SERVICE_ROLE_KEY`-t a Supabase Dashboard → Settings → API → service_role key

### "OpenAI API error: Rate limit exceeded"
- A script automatikusan vár és újrapróbál
- Ha gyakran előfordul, növeld a `RATE_LIMIT_DELAY`-t

### "Content too short"
- Az oldal lehet, hogy JavaScript-tel renderelődik
- Vagy az oldal üres/rossz URL
- Ellenőrizd a URL-t böngészőben

### "Cheerio import error"
- Telepítsd újra: `npm install cheerio @types/cheerio`
- Ha ESM probléma van, próbáld: `import * as cheerio from "cheerio";`

## További fejlesztések

- [ ] Robots.txt tiszteletben tartása
- [ ] JavaScript-rendered content kezelése (Puppeteer/Playwright)
- [ ] Batch embedding generálás (több chunk egyszerre)
- [ ] Incremental updates (csak új/frissített tartalom)
- [ ] Content validation és cleaning fejlesztése

