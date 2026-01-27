# Dokumentum verziókövetés migráció futtatása

## 1. Supabase Dashboard (ajánlott)

1. Nyisd meg: https://supabase.com/dashboard
2. Válaszd ki a **projektet** (Dashboard → projekt)
3. Bal oldali menü: **SQL Editor** → **New query**
4. Másold be a teljes tartalmat ebből a fájlból:  
   `supabase/migrations/20260124000000_add_document_versioning_and_relations.sql`
5. Kattints a **Run** gombra (vagy Cmd+Enter)
6. Ha sikeres: „Success. No rows returned” ( vagy hasonló üzenet)

## 2. Supabase CLI (ha be vagy jelentkezve)

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

## 3. Közvetlen adatbázis URL-lel (CI / script)

1. Supabase Dashboard → Project Settings → Database → Connection string (URI)
2. Állítsd be: `DATABASE_URL="postgresql://postgres.[ref]:[jelszó]@aws-0-[region].pooler.supabase.com:5432/postgres"`
3. Futtasd: `supabase db push --db-url "$DATABASE_URL"`
