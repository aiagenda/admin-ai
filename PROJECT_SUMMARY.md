# GovLetter – Részletes projektleírás

Ez a dokumentum az GovLetter technikai áttekintését adja: architektúra, adatbázis, Edge Functions, konvenciók és környezeti változók. Új fejlesztőknek és AI eszközöknek segít gyorsan belátni a rendszert.

**Belépő:** [README.md](./README.md) – helyi futtatás, env, NPM scriptek, dokumentációs index.

---

## Tartalomjegyzék

1. [Mi ez a projekt](#mi-ez-a-projekt)
2. [Célok és vízió](#célok-és-vízió)
3. [Technikai stack](#technikai-stack)
4. [Architektúra és adatfolyam](#architektúra-és-adatfolyam)
5. [Adatbázis – főbb táblák](#adatbázis--főbb-táblák)
6. [Edge Functions](#edge-functions)
7. [Frontend – útvonalak és oldalak](#frontend--útvonalak-és-oldalak)
8. [Konvenciók](#konvenciók)
9. [Környezeti változók és titkok](#környezeti-változók-és-titkok)
10. [Fájlstruktúra](#fájlstruktúra)
11. [Dokumentációs index](#dokumentációs-index)
12. [Egy mondatban (AI / új közösnek)](#egy-mondatban-ai--új-közösnek)

---

## Mi ez a projekt

**GovLetter** magyar hivatalos dokumentumok AI elemzésére szolgáló alkalmazás. Könyvelők és adminisztrátorok számára segíti a feltöltött dokumentumok strukturált feldolgozását, határidők és teendők nyomon követését, valamint keresést a tudásbázisban.

---

## Célok és vízió

- Magyar nyelvű hivatalos papírok (adóbevallás, szerződések, határozatok stb.) feltöltése, OCR és AI elemzés.
- Strukturált adatok kinyerése (határidők, összegek, felek, kategóriák).
- Könyvelői jelentések és határidő-emlékeztetők küldése (e-mail, push).
- Tudásbázis és szemantikus keresés (pgvector, embeddings).

---

## Technikai stack

- **Frontend:** Vite 5, React 18, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query.
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions).
- **AI:** OpenAI (GPT-4o, Vision) az Edge Functions-ban.
- **Egyéb:** Resend (e-mail), Web Push (VAPID), cron (határidő-emlékeztetők, jelentések).

---

## Architektúra és adatfolyam

1. **Feltöltés** → felhasználó feltölti a dokumentumot a frontenden, a fájl a Supabase Storage-ba kerül.
2. **Edge Function (analyze-document)** → OCR + GPT-4o Vision elemzi a dokumentumot, kinyeri a mezőket, menti a `documents` / `analyses` / `forms` táblákba.
3. **Eredmény** → a frontend az elemzés alapján megjeleníti az űrlapot, teendőket, határidőket.
4. **Jelentések / emlékeztetők** → `send-accountant-report`, `send-deadline-reminders` Edge Functions; külső cron hívja őket.

---

## Adatbázis – főbb táblák

- **documents** – feltöltött fájlok metaadatai, storage path, verziók.
- **analyses** – AI elemzés eredményei, raw JSON.
- **forms** – strukturált űrlapadatok (határidők, összegek, kategóriák, teendők).
- **user_profiles** – kiegészítő profil (cégnév, e-mail, stb.).
- **ocr_feedback** – felhasználói visszajelzés az OCR/Elemzés minőségéről.
- **document_versions**, **document_relations** – verziókezelés és dokumentumok közötti kapcsolatok.
- **notification_preferences**, **push_subscriptions** – push/email beállítások.
- **knowledge_base** – embeddings, chunkok, kereséshez (pgvector).

---

## Edge Functions

- **analyze-document** – dokumentum OCR + GPT-4o elemzés, form és todo mentés.
- **send-accountant-report** – periodikus könyvelői jelentés e-mailben (Resend).
- **send-deadline-reminders** – határidő-emlékeztetők e-mailben és/vagy push-ban.
- **ai-search** – szemantikus keresés a tudásbázisban (embeddings, pgvector).

---

## Frontend – útvonalak és oldalak

- Főoldal, Upload, Compare, Help, Auth callback.
- Admin: felhasználók, dokumentumok, beállítások.
- Űrlapkitöltés, elemzéseredmények, teendők, határidők megjelenítése.

---

## Konvenciók

- Dátumok: **YYYY-MM-DD** (ISO).
- UI: **magyar** nyelv.
- Kategóriák és típusok a migrations és a kliens konvenciója szerint.
- Környezeti változók: frontend **VITE_** prefixed; titkok csak a szerveren (Edge Functions env).

---

## Környezeti változók és titkok

- **Frontend (.env):**  
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key).  
  Nem kerülhet fel: service role key, API kulcsok.

- **Edge Functions (Supabase secrets):**  
  `OPENAI_API_KEY`, Resend / e-mail és egyéb szolgáltató kulcsok, VAPID keys ha a functions használják.

- **Érzékeny fájlok:** `.env`, `.env.local`, `.env.*.local`, `VAPID_KEYS.txt` – a `.gitignore` kizárja őket.

---

## Fájlstruktúra

- `src/` – React alkalmazás, komponensek, oldalak, kontextusok, integrációk.
- `public/` – statikus fájlok, PWA ikonok, manifest, favicon.
- `supabase/functions/` – Edge Functions (analyze-document, send-accountant-report, send-deadline-reminders, ai-search).
- `supabase/migrations/` – PostgreSQL migrációk.
- `scripts/` – tudásbázis pipeline, chunkok, embeddings, PWA ikongenerálás.

---

## Dokumentációs index

| Dokumentum | Tartalom |
|------------|----------|
| [README.md](./README.md) | Belépő: helyi futtatás, env, NPM scriptek |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Edge Function deploy, Supabase CLI |
| [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) | Frontend deploy Vercelre |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Tesztelési útmutató |
| [ACCOUNTANT_REPORT_SETUP.md](./ACCOUNTANT_REPORT_SETUP.md) | Könyvelői jelentés (Resend, cron) |
| [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md) | Cron job beállítás |
| [DEADLINE_REMINDERS_SETUP.md](./DEADLINE_REMINDERS_SETUP.md) | Határidő-emlékeztetők |
| [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md) | Web Push (VAPID) |
| [FEEDBACK_IMPLEMENTATION.md](./FEEDBACK_IMPLEMENTATION.md) | OCR/elemzés visszajelzés |
| [MIGRATE_DOCUMENT_VERSIONING.md](./MIGRATE_DOCUMENT_VERSIONING.md) | Dokumentumverziózás migráció |
| [scripts/KB_PIPELINE_README.md](./scripts/KB_PIPELINE_README.md) | Tudásbázis pipeline |

---

## Egy mondatban (AI / új közösnek)

GovLetter egy magyar nyelvű, Supabase + OpenAI alapú alkalmazás a hivatalos dokumentumok feltöltésére, AI elemzésére, strukturált űrlapok és határidők kezelésére, könyvelői jelentések és emlékeztetők küldésére, valamint tudásbázis-szemantikus keresésre; a frontend Vite+React, a logika nagy része Supabase Edge Functions-ban fut.
