# Operations runbook (launch baseline)

## Roles

- **Owner:** deployment + secrets
- **On-call:** incidents + customer impact comms

## Secrets rotation

| Secret | Where | Cadence |
|--------|-------|---------|
| Supabase `service_role` | Supabase dashboard | compromise-only / periodic policy |
| Stripe secret keys | Stripe dashboard / Supabase env | rotate if leaked |
| OAuth client secrets | Supabase Auth provider settings | compromise-only |
| `SITE_ACCESS_PASSWORD` | Vercel env | rotate for staging gates |

## Incident basics

1. Confirm scope (logs, affected tables/buckets).
2. Revoke/rotate compromised credentials.
3. Notify users/regulators per counsel if personal data affected.

## Support surface

Publish `support@` and `security@` addresses consistent with `src/config/siteLegal.ts` env-driven placeholders.



## US smoke matrix

| Document | Expected doc_type | Playbook |
|----------|-------------------|----------|
| IRS CP14 sample | irs_notice_balance_due | IRS balance due |
| IRS LT11 sample | irs_notice_intent_to_levy | IRS levy |
| State notice (CA) | state_tax_CA_balance_due | CA state tax |
| SSA overpayment letter | ssa_overpayment | SSA overpayment |
| Bank collection | bank_collection | Bank collection |

After deploy: `MARKET=us`, apply migrations, `npm run forms:sync`, `npm run kb:sync`.
