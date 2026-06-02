# US market launch — entity & law brief (for counsel)

Use this brief when engaging EU/HU and/or US counsel. This document is **not legal advice**.

## Product snapshot

- **Hungarian-facing brand:** GovLetter (`hu`), typical domain `govletter.com`.
- **English/US-facing brand:** GovLetter (`en`), intended `.com` / app subdomain.
- **Stack:** React SPA on Vercel, Supabase (Auth/Postgres/Storage), Stripe Checkout via Edge Function `create-checkout-session`, optional Google OAuth.
- **Data:** Users upload PDFs/images; backend analyses documents with AI; outputs shown in-app.
- **Risk profile:** Tax/agency document interpretation assistance — **not** licensed legal/tax advice; outputs must be validated by professionals.

## Decisions required

1. **Contracting entity**
   - Option A — EU/HU company sells to US individuals/businesses (cross-border).
   - Option B — US entity (LLC/Inc.) sells domestically and/or globally.
   - Impacts: governing law, VAT/sales tax, Privacy Policy disclosures, dispute venue, Stripe account country.

2. **Privacy regime overlap**
   - GDPR if EU/EEA/UK users.
   - US state privacy laws (e.g., **California CPRA** concepts) if CA/US residents — counsel should confirm thresholds (business criteria, “sale/share”, HR data).
   - Final Privacy Policy must list **subprocessors** actually used (see `docs/SUBPROCESSORS.md`).

3. **AI disclosures**
   - Automated processing + model vendors; human review disclaimer; retention.

4. **Employment / contractor data**
   - If none collected intentionally, state “not intended for workplace HR data” unless product scope expands.

## Deliverables for lawyers

- Data flow diagram: browser → Vercel → Supabase → Edge Functions → AI provider(s) → Stripe.
- List of **production** subprocessors with purpose (auth, hosting, payments, models, email).
- Sample DPA requirements if selling B2B with EU customers.

