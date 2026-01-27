# Vercel – frontend deploy

1. **Vercel:** [vercel.com/new](https://vercel.com/new) → Import a repót, branch `main`.
2. **Framework:** Vite · Root: `./` · Build: `npm run build` · Output: `dist`.
3. **Környezeti változók** (Environment Variables):
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Supabase anon (public) key
4. **Deploy** → a főoldal URL-je lesz az alkalmazás címe.

**PWA ikonok:** `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`; a manifest és az `index.html` már rájuk hivatkozik.
