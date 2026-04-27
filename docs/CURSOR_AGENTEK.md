# Cursor „agentek” ebben a projektben

A Cursorban a **felhasználó** nem ugyanazt a „Task / subagent” gombot látja, mint a háttérben futó asszisztens. Amit te tudsz csinálni: **világosan megfogalmazni a feladatot**, és **Agent (Composer) módban** dolgozni — az elsődleges asszisztens szükség szerint **specializált háttér‑feladatokat** indíthat (kódbázis‑feltérképés, deploy, shell, stb.).

## Hogyan „hívod meg” őket gyakorlatban

1. **Nyisd meg a Composer Agentet** (Cursorban: Agent / Composer — ahol több fájlt is módosíthat az AI).
2. **Írd le magyarul**, mit szeretnél, és **kérj explicit módszert**, ha kell:
   - *„Először csak olvasásban térképezd fel a repót (explore), aztán jöjjön a terv.”*
   - *„Vercel deploy / env ellenőrzés: deployment szakértő szemlélettel.”*
   - *„Supabase migráció + RLS: Supabase best practice szerint.”*
3. **Adj kontextust**: `@fájl` vagy `@mappa` mention, releváns chat előzmény.
4. **Ha nagy a feladat**: bontsd lépésekre („1) migráció 2) Edge Function 3) UI”).

Az elsődleges asszisztens a Cursor **beépített agent‑típusai** közül választhat (ezek nevei angolul maradnak a rendszerben); a te részed a **cél és a korlátok** megadása.

## Melyik „agent” jellegű segítség mikor kell

| Cél | Mit írj (példa) |
|-----|------------------|
| Nagy repo, nem tudod hol van a logika | „Explore: hol van a Stripe webhook és a `user_subscriptions` frissítés?” |
| Parancsok, git, build, script | „Shell: futtasd a buildet / migráció ellenőrzést.” |
| Vercel deploy, env, domain, CI | „Deployment: Vercel prod + env változók ellenőrzése.” |
| Lassú oldal, Lighthouse, bundle | „Performance: mi lassítja a `/upload` oldalt?” |
| AI SDK, gateway, több modell | „AI architect: hogyan érdemes a checkout sessiont szervezni?” |
| Cursor funkció (hooks, rules, beállítás) | „Cursor guide: hol állítom a rules / agent viselkedést?” |

## Projekt‑specifikus szabályok (röviden)

- **Supabase** (DB, Edge Function, Auth, RLS): mindig szerver oldali igazság + migrációk.
- **Vercel**: `vercel.json`, Edge middleware, env — deploy előtt ellenőrizd az `APP_URL` / Stripe secret párost.
- **SEO**: nyilvános route‑okhoz `SEOHead` + `sitemap.xml` + statikus `index.html` szöveg szinkron.

## Hol van a gépi utasítás a modellnek

- `.cursor/rules/subagent-delegation.mdc` — azt mondja az asszisztensnek, **mikor delegáljon** specializált háttér‑feladatot.

Ha valami nem működik a Cursor UI‑ban (név eltér), nézd a hivatalos dokumentációt: [cursor.com/docs](https://cursor.com/docs).
