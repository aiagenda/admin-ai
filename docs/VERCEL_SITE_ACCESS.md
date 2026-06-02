# Vercel site access (Basic Auth middleware)

`middleware.ts` applies **HTTP Basic Authentication** when `SITE_ACCESS_PASSWORD` is **non-empty**.

| Deployment | `SITE_ACCESS_PASSWORD` | Behaviour |
|------------|-------------------------|-----------|
| Production (public launch) | **unset or empty** | Site is **public** — normal SEO and sign-up. |
| Staging / closed preview | set to a strong secret | Entire matched route tree requires browser Basic Auth. |

**Important:** Leaving password set on the production domain blocks crawlers and most users.

Implementation detail: when the password env var is empty, middleware calls `next()` and does **not** return 503.

