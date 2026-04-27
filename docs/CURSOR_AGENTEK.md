# Cursor „agentek” ebben a projektben

> **Fontos:** A „Composer / példa mondatok” szekció **neked, fejlesztőként** szól a Cursorban — **nem** az **adminai.hu** látogatóinak. A nyilvános SEO-t a webalkalmazás (`SEOHead`, `index.html`, sitemap) kezeli.

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

---

## SEO feladatok (AdminAI) — így hívd „agent” logikával

A cél: **technikai SEO + konzisztens meta + mérhetőség**. A repóban már van `SEOHead`, `public/sitemap.xml`, `public/robots.txt`, statikus `index.html` — ezeket kell **szinkronban** tartani a termékkel és **kiterjeszteni**, ahol hiányzik.

### Példa mondatok Agent módban (másold be / módosítsd)

| Lépés | Mit írj a Composernek |
|--------|-------------------------|
| Feltérképezés | *„Explore (readonly): mely **nyilvános** route-okon nincs `SEOHead`, és hol ütközik az `index.html` meta a `/pricing` / főoldal szövegével?”* |
| Teljesítmény | *„Performance: főoldal + `/arak` LCP, bundle — adj prioritást és konkrét javaslatot.”* |
| Deploy / indexelés | *„Deployment: a prod domainen van-e jelszózár / middleware ami blokkolja a Google-t? Ha igen, dokumentáld és javasolj megoldást.”* |
| Build ellenőrzés | *„Shell: `npm run build` + eslint a módosított SEO fájlokra.”* |

### Checklist (SEO „maxi” irány)

1. **`index.html`** — `title`, `meta name="description"`, `og:*`, `twitter:*` **egyezzen** a valós ajánlattal (pl. próba: 1 dokumentum, nem elavult „5 ingyen”, ha már nem az van).
2. **Minden nyilvános marketing URL** — legyen `SEOHead` (`title`, `description`, `path`, szükség szerint `keywords`). Hiány példa: `/help`, jogi oldalak — döntsd el, indexelendő-e; ha igen, egyedi meta.
3. **`SEOHead` / canonical** — a `BASE_URL` jelenleg fix (`adminai.hu`). **Preview / staging** esetén env alapú domain (`VITE_PUBLIC_SITE_URL` vagy build arg) ne törje a canonicalt.
4. **`og:image`** — oldalanként (blog, use case, összehasonlítás): a komponens bővíthető opcionális `ogImage` prop-pal; addig legalább a fő kép konzisztens.
5. **Structured data** — `SEOHead` `structuredData`: globálisan **Organization** + **WebSite**; **FAQPage** a `/gyik`-hez; **Article** a blog posztokhoz (ahol van slug).
6. **`public/sitemap.xml`** — új publikus URL = frissítés; lehetőség szerint **`<lastmod>`**; belső folyamat (script / checklist PR-ben).
7. **`public/robots.txt`** — `Sitemap:` URL élő; `Disallow` maradjon a belső / auth útvonalakon.
8. **Prerender / SSR** (nagyobb feladat) — kulcs URL-ek első HTML-je legyen tartalommal (nem csak üres shell + JS meta).
9. **Külső** — Google Search Console: property, **sitemap beküldés**, lefedettség / Core Web Vitals figyelés.

### Fájlok, amikhez leggyakrabban nyúlsz

- `src/components/SEOHead.tsx` — meta, canonical, JSON-LD
- `index.html` — statikus alap meta
- `public/sitemap.xml`, `public/robots.txt`
- Nyilvános oldalak: `src/pages/Home.tsx`, `ArakPage.tsx`, `Pricing.tsx`, `GyikPage.tsx`, `Blog*.tsx`, `UseCase*.tsx`, `Comparison*.tsx`, `Help.tsx`, `legal/*.tsx`

---

## Projekt‑specifikus szabályok (röviden)

- **Supabase** (DB, Edge Function, Auth, RLS): mindig szerver oldali igazság + migrációk.
- **Vercel**: `vercel.json`, Edge middleware, env — deploy előtt ellenőrizd az `APP_URL` / Stripe secret párost.
- **SEO**: lásd fent a **„SEO feladatok”** szekciót — `SEOHead` + `sitemap.xml` + **`index.html` szinkron** kötelező minimum.

## Hol van a gépi utasítás a modellnek

- `.cursor/rules/subagent-delegation.mdc` — azt mondja az asszisztensnek, **mikor delegáljon** specializált háttér‑feladatot.

Ha valami nem működik a Cursor UI‑ban (név eltér), nézd a hivatalos dokumentációt: [cursor.com/docs](https://cursor.com/docs).
