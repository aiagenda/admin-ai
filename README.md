# AdminAI

Magyar hivatalos dokumentumok AI alapú elemzésére szolgáló webalkalmazás: feltöltés, OCR, strukturált adatok kinyerése, határidők és teendők kezelése, könyvelői jelentések, tudásbázis-szemantikus keresés.

**Stack:** Vite 5 · React 18 · TypeScript · Supabase (Auth, PostgreSQL, Storage, Edge Functions) · OpenAI (GPT-4o, Vision)

---

## Előkészítés

- **Node.js** 18+ és **npm**
- Supabase projekt (Auth, Storage, Edge Functions engedélyezve)
- OpenAI API kulcs (az elemző Edge Functionhoz)

---

## Helyi futtatás

```bash
git clone https://github.com/aiagenda/admin-ai.git
cd admin-ai
npm install
cp .env.example .env   # töltsd ki a Supabase URL-t és az anon key-t
npm run dev
```

A dev szerver alapból: `http://localhost:5173`.

---

## Környezeti változók (frontend)

A gyökérben lévő `.env` fájl **nem kerül verzióközébe**. Szükséges változók:

| Változó | Leírás |
|--------|--------|
| `VITE_SUPABASE_URL` | Supabase projekt URL (pl. `https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon (public) key |

További backend/Edge Function titkok (OpenAI, Resend, VAPID stb.) a Supabase Dashboard → Edge Functions → Secrets felületén, illetve a [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md#környezeti-változók-és-titkok) szakaszában.

---

## NPM scriptek

| Parancs | Leírás |
|---------|--------|
| `npm run dev` | Fejlesztői szerver (Vite) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Build előnézet |
| `npm run lint` | ESLint |
| `npm run kb:import` | Tudásbázis import (scripts) |
| `npm run kb:chunks` | Chunkok létrehozása |
| `npm run kb:embeddings` | Embeddingek generálása |
| `npm run generate-icons` | PWA ikonok generálása |

---

## Dokumentáció

| Dokumentum | Tartalom |
|------------|----------|
| **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** | Részletes projektleírás: architektúra, adatbázis, Edge Functions, konvenciók, környezeti változók |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Edge Function deploy, Supabase CLI, tesztelés |
| [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) | Frontend deploy Vercelre |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Tesztelési útmutató |
| [ACCOUNTANT_REPORT_SETUP.md](./ACCOUNTANT_REPORT_SETUP.md) | Könyvelői jelentés (Resend, cron) |
| [CRON_JOB_SETUP.md](./CRON_JOB_SETUP.md) | Cron job beállítás |
| [DEADLINE_REMINDERS_SETUP.md](./DEADLINE_REMINDERS_SETUP.md) | Határidő-emlékeztetők |
| [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md) | Web Push (VAPID) |
| [FEEDBACK_IMPLEMENTATION.md](./FEEDBACK_IMPLEMENTATION.md) | OCR/ elemzés visszajelzés |
| [MIGRATE_DOCUMENT_VERSIONING.md](./MIGRATE_DOCUMENT_VERSIONING.md) | Dokumentumverziózással kapcsolatos migráció |

---

## Projektstruktúra (rövid)

```
├── src/                 # React alkalmazás (oldalak, komponensek, kontextusok)
├── public/              # Statikus fájlok, PWA ikonok, manifest
├── supabase/
│   ├── functions/       # Edge Functions (analyze-document, send-accountant-report, …)
│   └── migrations/      # PostgreSQL sémaváltozások
├── scripts/             # Tudásbázis pipeline, PWA ikongenerálás
├── PROJECT_SUMMARY.md   # Részletes technikai leírás
└── README.md            # Ez a fájl
```

Új közösnek és AI-nak egy mondatban: *AdminAI magyar hivatalos dokumentumok feltöltésére, AI elemzésére, strukturált űrlapok és határidők kezelésére, könyvelői jelentések és emlékeztetők küldésére, valamint tudásbázis-szemantikus keresésre; frontend Vite+React, backend nagy része Supabase Edge Functions.*
