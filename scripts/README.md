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

See [`core/docs/deploy.md`](../core/docs/deploy.md) (in ddd-core) for the rest of the deploy setup, including the worker runtime secrets.

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
