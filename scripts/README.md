# Scripts

One-off and operational scripts that sit outside the website's runtime code.

## `provision-cloudflare.mjs`

Idempotent provisioning for the Cloudflare + GitHub side of deployment. Creates the staging and production D1 databases (if missing), patches `website/wrangler.jsonc` with their IDs, and writes `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` into the GitHub repo so the deploy workflows can use them.

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...   # needs D1:Edit + Workers Scripts:Edit + Account Settings:Read

# Set SKIP_GITHUB=1 to only do the Cloudflare side.
pnpm provision:cloudflare
```

See [`docs/deploy.md`](../docs/deploy.md) for the rest of the deploy setup, including the worker runtime secrets.

## `setup-github-app/`

Creates a GitHub App via the [manifest flow](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest) and saves the resulting OAuth credentials for one environment. The Worker only needs `WEBSITE_GITHUB_APP_CLIENT_ID` and `WEBSITE_GITHUB_APP_CLIENT_SECRET` — see `website/app/lib/auth.server.ts`.

```bash
pnpm setup:github-app                    # listens on http://localhost:3333
pnpm setup:github-app -- --port 4444     # forward args via pnpm
```

In the browser, pick an environment:

- **Local** — writes both vars into `website/.dev.vars`.
- **Staging** / **Production** — runs `wrangler secret put WEBSITE_GITHUB_APP_CLIENT_ID --env <env>` and again for the secret, piping the value on stdin. The Worker must already exist; your shell needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (the same ones the deploy workflow uses).

The helpers are TypeScript and run directly under Node's native type-stripping (no build step). Requires Node ≥ 22.18 or 23.6+ (the project's CI uses Node 22.x).

Layout:

- `index.ts` — CLI entry, arg parsing, server startup
- `lib/server.ts` — HTTP routes
- `lib/manifest.ts` — exchanges the manifest code with GitHub
- `lib/storage.ts` — chooses local vs. wrangler based on environment
- `lib/dev-vars.ts`, `lib/wrangler-secrets.ts`, `lib/http.ts`, `lib/cli.ts` — supporting helpers
- `templates/` — HTML/CSS/JS served to the browser

## `add-sponsor.mjs`

Adds a new sponsor to a year's config: downloads/optimises the logo into `website/public/images/sponsors/`, then patches the matching `website/app/config/years/<year>.server.ts` via ts-morph.

```bash
node scripts/add-sponsor.mjs
```

## `sponsor-manager.mjs`

Interactive CLI for browsing and editing existing sponsor entries across years.

```bash
node scripts/sponsor-manager.mjs
```

## `process-logo.mjs`

Generates `<year>-<slug>-light.<ext>` and `<year>-<slug>-dark.<ext>` from a single source image. Uses the same image processing as `add-sponsor.mjs` (shared via `scripts/lib/process-logo.mjs`).

```bash
node scripts/process-logo.mjs <input-file> <year> <slug> [--out-dir <dir>]
```
