# US launch: brand + i18n

## Brand

| Locale | Product name | Domain hint |
|--------|--------------|-------------|
| Hungarian (`hu`) | **AdminAI** | adminai.hu |
| English (`en`) | **NoticeIQ** | register `.com` / app subdomain |

**Why NoticeIQ:** focuses on *agency / IRS-style notices* (not generic “admin”). Easier to trademark-search before launch.

Alternatives if `.com` taken: **LetterPilot**, **ClearNotice**, **DeskLetter**.

## What ships in code

- `i18next` + browser language detector; persisted as `localStorage` key `adminai_lang`.
- Namespaces: `nav`, `common`. Files: `src/locales/{hu,en}/*.json`.
- **Navbar** + **mobile bottom nav** use translations; EN shows **NoticeIQ** in the logo.
- `<html lang>` synced via `LangSync` (`src/components/LangSync.tsx`).
- `src/lib/brand.ts` exports `BRAND_HU` / `BRAND_EN` for SEO/components.

## Remaining work (incremental)

1. Replace hard-coded copy page-by-page: `Home`, `Pricing`, `Help`, legal, marketing URLs.
2. `SEOHead`: pass `title`/`description` from `useTranslation('seo')` per route or duplicate keys `seo.home.title`.
3. Optional routes: `/en/...` prefix or subdomain — needs router + sitemap split.
4. US-specific KB sources (IRS, Federal Register) — separate ingest pipeline.

## Switching language

- Header **language select** (HU / EN). Falls back to browser language on first visit.

