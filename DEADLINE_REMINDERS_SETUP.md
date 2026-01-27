# Deadline Reminders Beállítási Útmutató

## Áttekintés

A deadline reminders funkció automatikusan email és SMS értesítéseket küld a felhasználóknak a közelgő határidőkről. A rendszer 7, 3 és 1 nappal a határidő előtt küld emlékeztetőket.

## Előfeltételek

1. **Supabase Edge Function:** `send-deadline-reminders`
2. **Resend API Key:** Email küldéshez (már be van állítva)
3. **Twilio API (opcionális):** SMS küldéshez (jelenleg nincs konfigurálva)
4. **Cron Job:** Napi futtatás a deadline reminders küldéséhez

## 1. Adatbázis Migráció

Futtasd le a következő migrációt a Supabase Dashboard SQL Editor-ben:

```sql
-- Fájl: supabase/migrations/20260106000002_add_deadline_reminders.sql
```

A migrációk a `supabase/migrations/` mappában találhatók (pl. `20260106000002_add_deadline_reminders.sql`).

## 2. Edge Function Telepítése

### 2.1 Edge Function Létrehozása

```bash
# Navigálj a projekt gyökerébe
cd /Users/skrillex/Documents/admin-hungarian-helper

# Deploy the Edge Function
supabase functions deploy send-deadline-reminders
```

### 2.2 Környezeti Változók Beállítása

A Supabase Dashboard-ban, az Edge Functions beállításoknál add hozzá:

- `SUPABASE_URL`: `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: (a service role key)
- `RESEND_API_KEY`: (Resend API key – Dashboard → Secrets)
- `APP_URL`: `https://adminai.hu` (vagy a production URL)
- `TWILIO_ACCOUNT_SID`: (opcionális, SMS-hez)
- `TWILIO_AUTH_TOKEN`: (opcionális, SMS-hez)
- `TWILIO_PHONE_NUMBER`: (opcionális, SMS-hez)

## 3. Cron Job Beállítása

A deadline reminders napi futtatásához cron job-ot kell beállítani.

### 3.1 Cron Job Konfiguráció

**URL:** `https://<project-ref>.supabase.co/functions/v1/send-deadline-reminders`

**Metódus:** POST

**Headers:**
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Body:** `{}`

**Ütemezés:** Minden nap reggel 9:00-kor (Europe/Budapest időzóna)

### 3.2 Cron Job Létrehozása cron-job.org-on

1. Látogasd meg: https://cron-job.org/
2. Bejelentkezés
3. Új cron job létrehozása:
   - **Title:** `AdminAI Deadline Reminders`
   - **URL:** `https://<project-ref>.supabase.co/functions/v1/send-deadline-reminders`
   - **Schedule:** `0 9 * * *` (minden nap 9:00-kor)
   - **Request Method:** POST
   - **Request Headers:**
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - **Request Body:** `{}`

## 4. Tesztelés

### 4.1 Manuális Teszt

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/send-deadline-reminders" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 4.2 Várt Válasz

```json
{
  "success": true,
  "processed": 5,
  "results": [
    {
      "analysis_id": "...",
      "user_id": "...",
      "deadline": "2026-01-13",
      "reminder_type": "7_days",
      "email_sent": true,
      "sms_sent": false,
      "status": "sent"
    }
  ]
}
```

## 5. Felhasználói Beállítások

A felhasználók a **Beállítások** oldalon (`/settings`) állíthatják be:

- **Email értesítések:**
  - 7 nappal a határidő előtt
  - 3 nappal a határidő előtt
  - 1 nappal a határidő előtt
  - A határidő napján

- **SMS értesítések (opcionális):**
  - Telefonszám (E.164 formátum)
  - 7 nappal a határidő előtt
  - 3 nappal a határidő előtt
  - 1 nappal a határidő előtt
  - A határidő napján

## 6. Adatbázis Struktúra

### `deadline_reminders` tábla

Tárolja a küldött emlékeztetőket:

- `analysis_id`: Az elemzés ID-ja
- `document_id`: A dokumentum ID-ja
- `user_id`: A felhasználó ID-ja
- `deadline_date`: A határidő dátuma
- `reminder_type`: `7_days`, `3_days`, `1_day`
- `sent_at`: Küldés időpontja
- `notification_method`: `email`, `sms`, `both`
- `email_sent`: Email elküldve?
- `sms_sent`: SMS elküldve?
- `status`: `pending`, `sent`, `failed`, `skipped`

### `notification_preferences` tábla

Tárolja a felhasználók értesítési beállításait:

- `user_id`: A felhasználó ID-ja (unique)
- `email_enabled`: Email értesítések engedélyezve?
- `email_7_days_before`: Email 7 nappal előtt?
- `email_3_days_before`: Email 3 nappal előtt?
- `email_1_day_before`: Email 1 nappal előtt?
- `email_on_deadline`: Email a határidő napján?
- `sms_enabled`: SMS értesítések engedélyezve?
- `sms_phone_number`: Telefonszám (E.164)
- `sms_7_days_before`: SMS 7 nappal előtt?
- `sms_3_days_before`: SMS 3 nappal előtt?
- `sms_1_day_before`: SMS 1 nappal előtt?
- `sms_on_deadline`: SMS a határidő napján?

## 7. Hibaelhárítás

### Email nem érkezik meg

1. Ellenőrizd a Resend Dashboard-ban az email státuszát
2. Ellenőrizd, hogy a `adminai.hu` domain verifikálva van-e Resend-ben
3. Ellenőrizd a felhasználó email címét a `notification_preferences` táblában
4. Ellenőrizd a `deadline_reminders` táblát a küldési státuszért

### SMS nem érkezik meg

1. Ellenőrizd, hogy a Twilio API kulcsok be vannak-e állítva
2. Ellenőrizd a telefonszám formátumát (E.164)
3. Ellenőrizd a Twilio Dashboard-ban a SMS státuszát

### Cron job nem fut

1. Ellenőrizd a cron-job.org beállításait
2. Ellenőrizd a cron job logokat
3. Teszteld manuálisan a curl paranccsal

## 8. Következő Lépések

- [ ] Twilio API beállítása SMS küldéshez
- [ ] Email template testreszabása
- [ ] Analytics dashboard a küldött emlékeztetők statisztikáival
- [ ] Recurring deadlines támogatása
