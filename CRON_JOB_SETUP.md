# Cron Job Beállítás - Könyvelő Automatikus Jelentés

## Manuális Beállítás cron-job.org-on

Mivel a Supabase anon key-t biztonsági okokból nem tároljuk a kódban, manuálisan kell beállítani a cron job-ot.

### 1. Lépj be a cron-job.org-ra

1. Menj a https://cron-job.org/en/members/jobs/ oldalra
2. Kattints a "Create cronjob" gombra

### 2. Töltsd ki az adatokat

**Alapbeállítások:**
- **Title:** `AdminAI - Monthly Accountant Report`
- **Address (URL):** `https://<project-ref>.supabase.co/functions/v1/send-accountant-report`
- **Request method:** `POST`

**Schedule (Időzítés):**
- **Timezone:** `Europe/Budapest`
- **Schedule type:** `Monthly`
- **Day of month:** `1` (minden hónap 1. napja)
- **Time:** `09:00` (9:00 óra)

**Request Settings:**
- **Request body:** `{}` (üres JSON objektum)
- **Request headers:**
  - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
  - `Content-Type`: `application/json`

**Megjegyzés:** A `YOUR_SUPABASE_ANON_KEY` helyére a Supabase Dashboard > Project Settings > API > anon/public key értékét kell beírni.

### 3. Supabase Anon Key megtalálása

1. Menj a Supabase Dashboard-ra: https://supabase.com/dashboard → válaszd a projektet
2. Kattints a "Project Settings" (fogaskerék ikon) menüpontra
3. Válaszd az "API" fület
4. Másold ki az "anon" / "public" key értékét

### 4. Tesztelés

A cron job létrehozása után teszteld manuálisan:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://<project-ref>.supabase.co/functions/v1/send-accountant-report
```

Vagy használd a Settings oldalon a "Teszt email küldése" gombot.

## Automatikus Beállítás (ha van Supabase Anon Key)

Ha megvan a Supabase anon key, futtasd ezt a parancsot:

```bash
./setup-cron-job.sh
```

Vagy közvetlenül a cron-job.org API-val:

```bash
# A cron-job.org API key-ét a cron-job.org fiókbeállításokból vedd (nem kerülhet a repóba).
curl -X POST "https://api.cron-job.org/jobs" \
  -H "Authorization: Bearer YOUR_CRONJOB_ORG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job": {
      "enabled": true,
      "title": "AdminAI - Monthly Accountant Report",
      "url": "https://<project-ref>.supabase.co/functions/v1/send-accountant-report",
      "schedule": {
        "timezone": "Europe/Budapest",
        "hours": [9],
        "mdays": [1],
        "months": [-1],
        "wdays": [-1],
        "minutes": [0]
      },
      "requestMethod": 1,
      "extendedData": {
        "body": "{}",
        "headers": [
          {
            "name": "Authorization",
            "value": "Bearer YOUR_SUPABASE_ANON_KEY"
          },
          {
            "name": "Content-Type",
            "value": "application/json"
          }
        ]
      }
    }
  }'
```

**Fontos:** Cseréld ki a `YOUR_SUPABASE_ANON_KEY` részt a valós anon key-re!
