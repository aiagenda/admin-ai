# Deployment útmutató - AI fejlesztések

Ez az útmutató segít telepíteni az új AI fejlesztéseket a Supabase Edge Function-be.

## 📋 Előfeltételek

- Supabase CLI telepítve
- Bejelentkezve a Supabase-be (`supabase login`)
- Projekt linkelve (`supabase link`)

## 🚀 Deployment lépések

### 1. Edge Function telepítése

```bash
# Navigálj a projekt könyvtárába
cd /Users/skrillex/Documents/admin-hungarian-helper

# Deploy az analyze-document Edge Function-t
supabase functions deploy analyze-document
```

### 2. Környezeti változók ellenőrzése

Ellenőrizd, hogy a következő környezeti változók be vannak-e állítva a Supabase Dashboard-ban:

- `SUPABASE_URL` - A Supabase projekt URL-je
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (titkos!)
- `OPENAI_API_KEY` - OpenAI API kulcs

**Hol találod ezeket:**
1. Supabase Dashboard → Project Settings → API
2. Supabase Dashboard → Project Settings → Edge Functions → Secrets

### 3. Környezeti változók beállítása (ha szükséges)

```bash
# Supabase Secrets beállítása
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

## ✅ Deployment utáni ellenőrzés

### 1. Edge Function státusz ellenőrzése

```bash
# Listázd az Edge Function-öket
supabase functions list
```

### 2. Logok ellenőrzése

```bash
# Nézd meg a real-time logokat
supabase functions logs analyze-document --follow
```

### 3. Tesztelés

1. **Frontend tesztelés:**
   - Indítsd el a dev szervert: `npm run dev`
   - Tölts fel egy teszt PDF-et
   - Ellenőrizd, hogy az elemzés sikeres-e

2. **Edge Function közvetlen tesztelés:**
   ```bash
   # Tesztelés curl-lel
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/analyze-document \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "document_id": "test-doc-id",
       "file_url": "test-file-url"
     }'
   ```

## 🧪 Új funkciók tesztelése

### 1. Multi-language support

**Tesztelés:**
- Tölts fel egy magyar PDF-et → ellenőrizd, hogy magyarul elemzi
- Tölts fel egy angol PDF-et → ellenőrizd, hogy angolul elemzi
- Nézd meg a logokat: `✅ Detected language: hu/en/de`

**Várható log üzenetek:**
```
Detecting document language...
✅ Detected language: hu
```

### 2. Better deadline extraction

**Tesztelés:**
- Tölts fel egy PDF-et, ami tartalmaz relatív dátumot (pl. "2 hét múlva")
- Ellenőrizd az elemzés eredményét:
  - A `deadlines` tömb tartalmazza a konvertált dátumot YYYY-MM-DD formátumban
  - A dátum helyes (ma + 14 nap, ha "2 hét múlva")

**Példa dokumentum szöveg:**
```
A fizetési határidő: 2 hét múlva.
```

**Várható eredmény:**
```json
{
  "deadlines": ["2024-12-15"], // ma + 14 nap
  "deadline_descriptions": ["2 hét múlva"]
}
```

### 3. Smart Suggestions

**Tesztelés:**
1. Nyiss meg egy elemzés eredményét (`/result/{id}`)
2. Ellenőrizd a "Hasznos linkek és javaslatok" szekciót:
   - Ha van kategória (pl. "adozas") → NAV linkek jelennek meg
   - Ha nincs kategória → üzenet: "A dokumentum kategorizálása után..."

**Kategóriák és javaslatok:**
- `adozas` → NAV linkek
- `egeszsegugy` → TB, EESZT linkek
- `oktatas` → Felvi, Oktatási Hivatal linkek
- `szocialis` → SzGYF, családi pótlék linkek
- `kozlekedes` → Közlekedési Hatóság linkek
- `ingatlan` → Földhivatal linkek
- `uzlet` → Céginformációs Portál linkek

### 4. Learn from user feedback

**Tesztelés:**
1. Adj visszajelzést néhány elemzésre:
   - Kattints a "Nem hasznos" vagy "Zavaros" gombokra
   - Opcionálisan adj hozzá kommentet

2. Tölts fel egy új dokumentumot ugyanazzal a kategóriával

3. Ellenőrizd a logokat:
   ```
   Analyzing user feedback to improve prompts...
   ✅ Applied feedback-based improvements to prompt
   ```

4. Várható prompt javítások:
   - Ha sok "confusing" → "CRITICAL: Many users find the explanations confusing..."
   - Ha sok "not_helpful" → "CRITICAL: Many users find the analysis not helpful..."
   - Kommentek alapján → specifikus javaslatok

**Feedback adatok lekérdezése (teszteléshez):**
```sql
-- Nézd meg a feedback adatokat
SELECT 
  feedback_type,
  COUNT(*) as count,
  COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as with_comments
FROM analysis_feedback
WHERE feedback_type IN ('not_helpful', 'confusing')
GROUP BY feedback_type;
```

## 🔍 Hibakeresés

### Edge Function nem működik

1. **Ellenőrizd a logokat:**
   ```bash
   supabase functions logs analyze-document --follow
   ```

2. **Ellenőrizd a környezeti változókat:**
   - Supabase Dashboard → Edge Functions → Secrets

3. **Teszteld a kapcsolatot:**
   ```bash
   supabase functions list
   ```

### Nyelvfelismerés nem működik

- Ellenőrizd, hogy van-e elég szöveg a dokumentumban
- Nézd meg a logokat: `Detecting document language...`
- Ha nem sikerül, alapértelmezett: magyar (hu)

### Feedback javítások nem jelennek meg

- Ellenőrizd, hogy van-e feedback az adatbázisban
- Nézd meg a logokat: `Analyzing user feedback...`
- Ha nincs feedback, a rendszer tovább működik alapértelmezett prompttal

### Smart Suggestions nem jelenik meg

- Ellenőrizd, hogy a dokumentumnak van-e kategóriája
- Frissítsd az oldalt (F5)
- Nézd meg a DevTools Console-t hibákért

## 📊 Monitoring

### Feedback metrikák követése

```sql
-- Feedback összesítés
SELECT 
  feedback_type,
  COUNT(*) as total,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
FROM analysis_feedback
GROUP BY feedback_type;

-- Leggyakoribb problémák (kommentek alapján)
SELECT 
  comment,
  COUNT(*) as frequency
FROM analysis_feedback
WHERE comment IS NOT NULL
  AND feedback_type IN ('not_helpful', 'confusing')
GROUP BY comment
ORDER BY frequency DESC
LIMIT 10;
```

### Elemzési metrikák

```sql
-- Sikeres elemzések száma
SELECT 
  DATE(created_at) as date,
  COUNT(*) as analyses_count
FROM analyses
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Kategóriák eloszlása
SELECT 
  category,
  COUNT(*) as count
FROM documents
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
```

## 🎯 Best Practices

1. **Feedback gyűjtés:**
   - Kérj visszajelzést a felhasználóktól
   - Nézd meg rendszeresen a feedback adatokat
   - Használd a feedback-et a promptok finomhangolásához

2. **Monitoring:**
   - Figyeld a logokat rendszeresen
   - Ellenőrizd a feedback metrikákat
   - Teszteld az új funkciókat először dev környezetben

3. **Optimalizálás:**
   - A feedback elemzés csak akkor fut, ha van feedback adat
   - A nyelvfelismerés gyors és hatékony
   - A Smart Suggestions csak akkor jelenik meg, ha van kategória/címke

## 📝 Visszaállítás (ha szükséges)

Ha valami nem működik, visszaállíthatod az előző verziót:

```bash
# Git checkout az előző verzióra
git checkout <previous-commit-hash>

# Újra deploy
supabase functions deploy analyze-document
```

## ✅ Checklist deployment előtt

- [ ] Supabase CLI telepítve és bejelentkezve
- [ ] Környezeti változók beállítva
- [ ] Edge Function kód ellenőrizve
- [ ] Build sikeres (`npm run build`)
- [ ] Linter hibák nincsenek
- [ ] Tesztelés dev környezetben

## ✅ Checklist deployment után

- [ ] Edge Function deploy sikeres
- [ ] Logok ellenőrizve
- [ ] Teszt dokumentum feltöltve
- [ ] Elemzés sikeres
- [ ] Új funkciók működnek
- [ ] Feedback rendszer működik

## 🆘 Támogatás

Ha problémába ütközöl:
1. Nézd meg a logokat: `supabase functions logs analyze-document --follow`
2. Ellenőrizd a Supabase Dashboard-ot
3. Teszteld a frontend-et DevTools-szal
4. Nézd meg a feedback adatokat az adatbázisban

---

**Sikeres deploymentet! 🎉**

