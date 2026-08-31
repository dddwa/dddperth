# Admin Area Setup Guide

The admin area is gated by **magic-link sign-in**: an admin enters their email, gets a one-time link, clicks it, and is signed in.

## How access is granted

There is no role / handle list in code. Anyone whose email is in the `auth_allowlist` D1 table can sign in; everyone else gets the same "check your inbox" response with no email actually sent.

To add an admin in any environment:

Run from the repo root (`nx wrangler website --` runs the locally-installed
wrangler with the right cwd; `-c` is relative to `core/website`):

```bash
# Local
pnpm nx wrangler website -- d1 execute dddperth-voting-local --local --command \
  "INSERT INTO auth_allowlist (email, name, added_at) VALUES ('person@example.com', 'Person Name', unixepoch())"

# Staging / production — same command, drop --local and add the matching config:
pnpm nx wrangler website -- d1 execute dddperth-voting-staging -c ../../conference/wrangler/staging.jsonc --remote --command "..."
pnpm nx wrangler website -- d1 execute dddperth-voting-prod -c ../../conference/wrangler/production.jsonc --remote --command "..."
```

To revoke access, delete the row.

## Local development

1. Make sure D1 migrations have been applied: `pnpm nx d1-migrate-local website`.
2. Add yourself to `auth_allowlist` (the initial migration seeds `jake@ginnivan.net`).
3. `pnpm start`, then visit http://localhost:3800/auth/login.
4. Enter your email and submit. With no `RESEND_API_KEY` configured locally, the magic link is printed to the dev-server console.
5. Click the link in your terminal, then click "Sign in" on the confirmation page.

## Production / staging

The Worker needs `RESEND_API_KEY` and the runtime vars `WEBSITE_AUTH_REQUIRED` / `AUTH_EMAIL_FROM` set — see [`docs/deploy.md`](../docs/deploy.md) for the exact `wrangler secret put` commands and where the from-address gets verified in Resend.

In **staging**, the entire site is gated by `WEBSITE_AUTH_REQUIRED=true`. In **production**, only `/admin/*` is gated.

## Implementation notes

- Tokens are 32 random bytes, stored in D1 hashed (SHA-256), one-time use, 15-minute TTL.
- `GET /auth/verify/<token>` only renders a confirmation page — clicking the link doesn't consume the token. The `POST` from the confirm button does. This stops corporate link scanners (Defender, Proofpoint) from burning tokens before the human clicks.
- Sessions are server-side rows in D1 keyed by an opaque cookie value (HttpOnly, Secure, SameSite=Lax). 30-day sliding expiry.
- The login form responds identically whether the email is allowlisted or not — there's no way to probe who has access.
