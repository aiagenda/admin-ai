# Stripe operations (US readiness checklist)

## Current integration (code)

- Client calls Supabase Edge Function **`create-checkout-session`** (`src/pages/Checkout.tsx`) with `{ plan }`.
- User completes payment on **Stripe-hosted Checkout** (card data not handled by the SPA).

## Production checklist

1. **Stripe account & region** — align settlement country with your contracting entity (HU vs US).
2. **USD prices** — create USD Prices/Products for US customers or separate Stripe objects; update env price IDs referenced by the Edge Function.
3. **Stripe Tax** — enable if you collect sales tax / VAT automatically; align invoice wording with Terms.
4. **Customer Portal** — enable cancel/update subscription flows referenced in Terms/refund section.
5. **Webhooks** — configure signing secret for functions that finalize purchases/credits; verify signatures server-side only.
6. **Statements & disputes** — publish refund/chargeback handling in Terms (already templated in EN legal JSON).

## Environment variables (expected patterns — verify in repo)

Check `supabase/functions/create-checkout-session` (and related) for:

- `STRIPE_SECRET_KEY`
- Price IDs per plan (`STRIPE_PRICE_*`)

Never expose secret keys to the browser.

