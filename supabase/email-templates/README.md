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

### Security notification emails

Under **Authentication → Emails** there's a **Security** section (toggle each on
to enable, then open it to edit the template). These are informational alerts —
no action button, just a "if this wasn't you, secure your account" notice.

| Dashboard toggle        | File                                  | Suggested subject                              |
| ----------------------- | ------------------------------------- | ---------------------------------------------- |
| Password changed        | `security-password-changed.html`      | `Your GovLetter password was changed`          |
| Email address changed   | `security-email-changed.html`         | `Your GovLetter email address was changed`     |
| Phone number changed    | `security-phone-changed.html`         | `Your GovLetter phone number was changed`      |
| Sign-in method linked   | `security-signin-method-linked.html`  | `A new sign-in method was added`               |
| Sign-in method removed  | `security-signin-method-removed.html` | `A sign-in method was removed`                 |
| MFA method added        | `security-mfa-added.html`             | `Two-factor authentication was added`          |
| MFA method removed      | `security-mfa-removed.html`           | `Two-factor authentication was removed`        |

The "Go to your account" button uses `{{ .SiteURL }}`. If you'd like to show the
affected email/time, Supabase exposes `{{ .Email }}` (and sometimes `{{ .Time }}`)
in these templates — add them to the body if desired.

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
