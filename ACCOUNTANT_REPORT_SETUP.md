# Könyvelő Automatikus Jelentés Beállítás

## Áttekintés

Az automatikus könyvelő jelentés funkció lehetővé teszi, hogy a rendszer minden hónapban automatikusan küldjön CSV/Excel jelentést a könyvelő email címére az adott hónap dokumentumaival.

## Előfeltételek

1. **Resend API Key** - Email küldéshez szükséges
2. **Supabase Edge Function** - `send-accountant-report` function deploy-olva
3. **Cron Job Service** - Külső service a havi futtatáshoz

## 1. Resend API Beállítás

1. Regisztrálj a [Resend](https://resend.com)-en
2. Hozz létre egy API key-t
3. Add hozzá a Supabase Edge Function secrets-hez:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   ```

4. **Fontos:** Verifikáld a domain-t a Resend-ben, hogy az email-ek ne spam mappába kerüljenek
   - Jelenleg a kód `noreply@adminai.hu`-t használ
   - Módosítsd a `from` mezőt a `send-accountant-report/index.ts`-ben, ha más domain-t használsz

## 2. Edge Function Deploy

```bash
supabase functions deploy send-accountant-report
```

## 3. Cron Job Beállítás

A Supabase Edge Functions nem támogatja közvetlenül a cron job-okat, ezért külső service-t kell használni.

### Opció A: cron-job.org (Egyszerű, ingyenes)

1. Regisztrálj a [cron-job.org](https://cron-job.org)-on
2. Hozz létre egy új cron job-ot:
   - **URL:** `https://<project-ref>.supabase.co/functions/v1/send-accountant-report`
   - **Method:** POST
   - **Headers:**
     - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type: application/json`
   - **Schedule:** Minden hónap 1. napján, 9:00-kor (vagy bármilyen időpont)
   - **Body:** `{}` (üres JSON)

### Opció B: Supabase Database Cron (pg_cron extension)

Ha a Supabase projektben engedélyezve van a `pg_cron` extension:

```sql
-- Futtasd minden hónap 1. napján 9:00-kor
SELECT cron.schedule(
  'send-accountant-reports-monthly',
  '0 9 1 * *', -- Cron expression: minden hónap 1. napján 9:00
  $$
  SELECT
    net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/send-accountant-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Opció C: GitHub Actions (Ha GitHub-ot használsz)

Hozz létre `.github/workflows/monthly-accountant-report.yml`:

```yaml
name: Monthly Accountant Report

on:
  schedule:
    - cron: '0 9 1 * *' # Minden hónap 1. napján 9:00 UTC
  workflow_dispatch: # Manuális futtatás is lehetséges

jobs:
  send-report:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}' \
            https://<project-ref>.supabase.co/functions/v1/send-accountant-report
```

## 4. Tesztelés

### Manuális teszt a Settings oldalon

1. Menj a `/settings` oldalra
2. Add meg a könyvelő email címét
3. Kattints a "Teszt email küldése" gombra (Send ikon)
4. Ellenőrizd, hogy megérkezett-e az email

### Manuális teszt Edge Function-nel

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "email": "test@example.com"}' \
  https://<project-ref>.supabase.co/functions/v1/send-accountant-report
```

## 5. Felhasználói Beállítások

A felhasználók a `/settings` oldalon be tudják állítani:

- **Könyvelő email címe** - Ahova a jelentések mennek
- **Automatikus küldés** - Be/kikapcsolás
- **Küldés napja** - Hónap melyik napján (1-31)
- **Export formátum** - CSV vagy Excel (jelenleg mindkettő CSV, Excel kompatibilis)

## 6. Jelentés Tartalma

A jelentés tartalmazza:

- **Dátum** - Dokumentum feltöltésének dátuma
- **Határidő** - Dokumentum határideje (ha van)
- **Típus** - Dokumentum kategóriája
- **Összeg** - Kinyert összeg (ha van)
- **Bankszámlaszám** - Kinyert bankszámlaszám (ha van)
- **Kedvezményezett** - Kinyert kedvezményezett neve (ha van)
- **Fájlnév** - Feltöltött fájl neve
- **Leírás** - AI által generált összefoglaló (első 100 karakter)
- **Súlyosság** - info, action_needed, vagy urgent

## Hibaelhárítás

### Email nem érkezik meg

1. Ellenőrizd a Resend API key-t
2. Ellenőrizd, hogy a domain verifikálva van-e a Resend-ben
3. Nézd meg a Resend dashboard-ot a küldési státuszért
4. Ellenőrizd a Supabase Edge Function logokat

### Cron job nem fut

1. Ellenőrizd a cron service beállításait
2. Nézd meg a cron service logokat
3. Teszteld manuálisan a Edge Function-t

### Nincs dokumentum a jelentésben

- A jelentés csak azokat a dokumentumokat tartalmazza, amelyek az adott hónapban lettek feltöltve
- Ellenőrizd, hogy vannak-e dokumentumok az adott hónapban

## Jövőbeli Fejlesztések

- [ ] Excel (XLSX) formátum támogatás (jelenleg csak CSV, Excel kompatibilis)
- [ ] Testreszabható email template
- [ ] Több könyvelő email cím támogatása
- [ ] Jelentés előnézet a Settings oldalon
- [ ] Küldési előzmények megjelenítése
