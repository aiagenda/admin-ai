# Supabase security audit (repository snapshot)

This is an engineering review based on SQL migrations in `supabase/migrations/`. Complement with Supabase Dashboard checks (RLS enabled on **all** user tables in prod).

## Row Level Security

Migrations enable RLS on core tables such as `documents`, `analyses`, `forms`, `user_roles`, with policies scoped to `auth.uid()` or admin/service roles for automation.

### Focus areas

1. **Storage buckets** — confirm bucket policies in Dashboard match least privilege (users read/write only their prefixes).
2. **Service-role paths** — RPC/policies allowing “service role” inserts must be limited to Edge Functions with secrets, never callable from anonymous clients.
3. **Public forms policies** — verify “public” form access is intentional if marketing forms exist.

## Edge Functions

- **JWT verification:** user-invoked functions must validate Supabase user JWT where user data is accessed.
- **Stripe/checkout:** server-side only secrets.

## Retention (optional product follow-up)

If Privacy Policy promises deletion timelines, implement scheduled cleanup jobs or documented manual process.

## Backups

Confirm Supabase backup tier meets recovery objectives; document RPO/RTO internally (`docs/RUNBOOK.md`).

