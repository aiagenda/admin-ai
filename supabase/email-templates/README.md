# GovLetter — Supabase Auth email templates

Branded, mobile-friendly HTML for the transactional emails Supabase sends.
These replace the plain default Supabase design.

## How to install

Supabase Dashboard → **Authentication → Emails → Templates**. For each template
below, open it in the dashboard, set the **Subject**, and paste the matching
HTML file into the **Message body** (source/HTML view), then **Save**.

| Dashboard template        | File                     | Suggested subject                                  |
| ------------------------- | ------------------------ | -------------------------------------------------- |
| Confirm sign up           | `confirm-signup.html`    | `Confirm your GovLetter account`                   |
| Invite user               | `invite-user.html`       | `You're invited to GovLetter`                      |
| Magic Link                | `magic-link.html`        | `Your GovLetter sign-in link`                      |
| Change email address      | `change-email.html`      | `Confirm your new GovLetter email`                 |
| Reset password            | `reset-password.html`    | `Reset your GovLetter password`                    |
| Reauthentication          | `reauthentication.html`  | `Your GovLetter verification code`                 |

The **Security** notification emails (password changed, email changed, etc.)
share the same look — use `confirm-signup.html` as the base and swap the
heading/body copy for that event. They don't need an action button.

## Template variables

These are filled in by Supabase at send time — leave them exactly as written:

- `{{ .ConfirmationURL }}` — the action link (confirm / reset / magic link / invite).
- `{{ .Token }}` — the 6-digit one-time code (used by `reauthentication.html`).
- `{{ .Email }}` / `{{ .NewEmail }}` — the user's current / new email address.
- `{{ .SiteURL }}` — your app URL.

## Notes

- Design: GovLetter blue `#2563eb`, system fonts, 600px max width, table-based
  layout with inline styles for broad email-client support (Gmail, Outlook,
  Apple Mail, mobile).
- Update the footer URL (`govletter.com`) and the support address if they change.
- Test by sending yourself each email from the dashboard before launch.
