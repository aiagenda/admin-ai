# Push Notifications Beállítási Útmutató

## Áttekintés

A Push Notification rendszer SMS helyett Web Push API-t használ a böngésző értesítésekhez. Ez ingyenes és nem igényel külső szolgáltatást (mint a Twilio).

## Előfeltételek

1. **VAPID kulcsok:** Web Push API-hoz szükségesek
2. **Service Worker:** Már be van állítva (`public/sw.js`)
3. **HTTPS:** Push notifications csak HTTPS-en működnek (production)

## 1. VAPID Kulcsok Generálása

### 1.1 Telepítés

```bash
npm install -g web-push
```

### 1.2 Kulcsok Generálása

```bash
npx web-push generate-vapid-keys
```

**✅ Generált kulcsok (2026-01-06):**
- **Public Key:** `BLRNzJbsmrKGdRFxz6_ht75EhQgRcwXMDJkPRI7xYlayWGYEfbdKgm74x5nQvizYzJ_8rIXoARvfSHnWpoT6Kng`
- **Private Key:** `EVAhy2NqoROWPnvvGWIWwlmLHCBwRDkhte24ZMX9uMU`

⚠️ **FONTOS:** Használd ezeket a kulcsokat!

### 1.3 Környezeti Változók Beállítása

**Frontend (`.env`):**
```env
VITE_VAPID_PUBLIC_KEY=BLRNzJbsmrKGdRFxz6_ht75EhQgRcwXMDJkPRI7xYlayWGYEfbdKgm74x5nQvizYzJ_8rIXoARvfSHnWpoT6Kng
```

**Supabase Edge Function Secrets:**
- `VAPID_PUBLIC_KEY`: `BLRNzJbsmrKGdRFxz6_ht75EhQgRcwXMDJkPRI7xYlayWGYEfbdKgm74x5nQvizYzJ_8rIXoARvfSHnWpoT6Kng`
- `VAPID_PRIVATE_KEY`: `EVAhy2NqoROWPnvvGWIWwlmLHCBwRDkhte24ZMX9uMU`

## 2. Adatbázis Migráció

Futtasd le a következő migrációt a Supabase Dashboard SQL Editor-ben:

```sql
-- Fájl: supabase/migrations/20260106000003_replace_sms_with_push.sql
```

Ez:
- Eltávolítja az SMS mezőket a `notification_preferences` táblából
- Hozzáadja a Push Notification mezőket
- Létrehozza a `push_subscriptions` táblát

## 3. Edge Function Telepítése

### 3.1 Edge Function Frissítése

Az Edge Function már frissítve van, de ellenőrizd, hogy a VAPID kulcsok be vannak-e állítva:

```bash
supabase functions deploy send-deadline-reminders
```

### 3.2 Környezeti Változók

A Supabase Dashboard-ban, az Edge Functions beállításoknál add hozzá:

- `VAPID_PUBLIC_KEY`: `BLRNzJbsmrKGdRFxz6_ht75EhQgRcwXMDJkPRI7xYlayWGYEfbdKgm74x5nQvizYzJ_8rIXoARvfSHnWpoT6Kng`
- `VAPID_PRIVATE_KEY`: `EVAhy2NqoROWPnvvGWIWwlmLHCBwRDkhte24ZMX9uMU`
- `APP_URL`: `https://govletter.com` (vagy a production URL)

## 4. Web Push API Implementáció

### 4.1 Service Worker

A Service Worker már tartalmazza a push event listener-t (`public/sw.js`):
- `push` event: Fogadja a push notification-öket
- `notificationclick` event: Kezeli a notification kattintásokat

### 4.2 Frontend Hook

A `usePushNotification` hook (`src/hooks/use-push-notification.ts`) kezeli:
- Subscription létrehozását
- Subscription törlését
- Permission kérést

### 4.3 Settings Oldal

A Settings oldal (`src/pages/Settings.tsx`) tartalmazza:
- Push notification beállításokat
- Subscription engedélyezés/kikapcsolás
- Időzítési beállítások (7/3/1 nap, határidő napja)

## 5. Tesztelés

### 5.1 Lokális Tesztelés

1. Indítsd el a development szervert
2. Nyisd meg a Settings oldalt
3. Engedélyezd a Push értesítéseket
4. Engedélyezd a böngésző értesítéseket, amikor a rendszer kéri

### 5.2 Production Tesztelés

1. Deploy-old a frontend-et
2. Deploy-old az Edge Function-t
3. Teszteld a push notification küldést

## 6. Edge Function Web Push Küldés

Az Edge Function egy külső web-push API-t használ (`https://web-push-calc.deno.dev/send`). 

**Alternatív megoldás:** Ha ez nem működik, használhatod a `web-push` library-t közvetlenül Deno-ban:

```typescript
import { webpush } from "https://deno.land/x/webpush@v1.0.0/mod.ts";

await webpush.sendNotification(
  {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  },
  notificationPayload,
  {
    vapidDetails: {
      subject: `mailto:${user.email}`,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey
    }
  }
);
```

## 7. Hibaelhárítás

### Push notification nem érkezik meg

1. Ellenőrizd, hogy a VAPID kulcsok helyesen vannak-e beállítva
2. Ellenőrizd, hogy a subscription mentve van-e az adatbázisban
3. Ellenőrizd a böngésző konzolt hibákért
4. Ellenőrizd, hogy HTTPS-en fut-e az app (production)

### Subscription nem jön létre

1. Ellenőrizd, hogy a Service Worker regisztrálva van-e
2. Ellenőrizd, hogy a böngésző támogatja-e a Push API-t
3. Ellenőrizd, hogy az engedély megadva-e

### Edge Function hiba

1. Ellenőrizd a Supabase Edge Function logokat
2. Ellenőrizd, hogy a VAPID kulcsok be vannak-e állítva
3. Ellenőrizd, hogy a `push_subscriptions` tábla létezik-e

## 8. Következő Lépések

- [x] VAPID kulcsok generálása ✅
- [x] Frontend `.env` frissítése ✅
- [ ] Supabase Edge Function secrets beállítása
- [ ] Migráció futtatása (`supabase/migrations/20260106000003_replace_sms_with_push.sql`)
- [ ] Edge Function deploy
- [ ] Tesztelés

## 9. Gyors Referencia

**VAPID Kulcsok:**
- **Public Key:** `BLRNzJbsmrKGdRFxz6_ht75EhQgRcwXMDJkPRI7xYlayWGYEfbdKgm74x5nQvizYzJ_8rIXoARvfSHnWpoT6Kng`
- **Private Key:** `EVAhy2NqoROWPnvvGWIWwlmLHCBwRDkhte24ZMX9uMU`

**Supabase Edge Function Secrets beállítása:**
1. Menj a Supabase Dashboard-ra
2. Project Settings → Edge Functions → Secrets
3. Add hozzá:
   - `VAPID_PUBLIC_KEY` = `BLRNzJbsmrKGdRFxz6_ht75EhQgRcwXMDJkPRI7xYlayWGYEfbdKgm74x5nQvizYzJ_8rIXoARvfSHnWpoT6Kng`
   - `VAPID_PRIVATE_KEY` = `EVAhy2NqoROWPnvvGWIWwlmLHCBwRDkhte24ZMX9uMU`
