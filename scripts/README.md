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

Local web UI (http://localhost:3802) for adding sponsors to a year's config: processes the logo into light/dark variants under `core/website/public/images/sponsors/`, then patches the matching `conference/config/years/<year>.ts` via ts-morph.

```bash
pnpm sponsor:add
```

The **Portal Import** tab pulls sponsor submissions out of the deployed sponsor portal (remote D1 rows + R2 logos, fetched by shelling out to `wrangler` — run `wrangler login` first) and feeds them through the same preview/approve flow. Imports are recorded in a committed `conference/config/years/<year>.portal-imports.json` sidecar so the list flags new/updated/imported sponsors, and re-imports update the existing config entry in place. See [`core/website/SPONSOR_PORTAL_SETUP.md`](../core/website/SPONSOR_PORTAL_SETUP.md).

## `jira-auth.mjs`

Sets up Jira credentials for the sponsor portal. Validates the token against the real Jira site (auth, project access, sync-JQL dry run) before saving anything. Classic and scoped API tokens (create at <https://id.atlassian.com/manage-profile/security/api-tokens>) both work — scoped tokens are auto-detected and routed via the api.atlassian.com gateway.

```bash
pnpm jira:auth                    # save to core/website/.dev.vars, scoped to portal-test issues
pnpm jira:auth --full-sync        # local dev against the real sponsor list (use deliberately)
pnpm jira:auth --secrets staging  # push as wrangler secrets (also: production)
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
