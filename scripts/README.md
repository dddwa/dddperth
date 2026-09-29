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

Local web UI (http://localhost:3802) for adding sponsors to a year's config: processes the logo into light/dark variants under `conference/public/images/sponsors/`, then patches the matching `conference/config/years/<year>.ts` via ts-morph.

```bash
pnpm sponsor:add
```

Set `SPONSOR_UI_PORT` to run it on another port, e.g. when another checkout's UI already holds 3802.

The same operations run without a browser, for scripting or an agent. Every command saves through the same code as the UI's Approve & Save (`scripts/lib/sponsor-ops.mjs`):

```bash
# Add or update a sponsor from a local logo (re-running with the same inputs changes nothing)
pnpm sponsor:add add --year 2026 --tier digital --name "Black Ocean" \
  --website https://blackocean.io/ --quote-file quote.txt --logo logo.svg

# Portal submissions: list with new/updated/imported status, then import one
pnpm sponsor:add portal list --env production --year 2026
pnpm sponsor:add portal import SPN-24 --env production --tier room
```

`--dry-run` writes the processed light/dark variants to a preview directory (`--preview-dir`, else a temp dir) and nothing to the site, so the logos can be checked first. `--json` prints the result on stdout; logs go to stderr. New `room` sponsors get `roomName: 'TBC'` unless `--room-name` is passed, because the config type requires it. After every config write the file is formatted with the repo's Prettier config, so the diff is just the entry. Portal commands need a working `wrangler` login. In a non-interactive shell where wrangler can't refresh an expired OAuth token, set `CLOUDFLARE_API_TOKEN` instead.

The **Portal Import** tab pulls sponsor submissions out of the deployed sponsor portal (remote D1 rows + R2 logos, fetched by shelling out to `wrangler` — run `wrangler login` first) and feeds them through the same preview/approve flow. Imports are recorded in a committed `conference/config/years/<year>.portal-imports.json` sidecar so the list flags new/updated/imported sponsors, and re-imports update the existing config entry in place. Approving a portal import also attaches the processed light/dark logo variants to the sponsor's Jira issue (replacing same-named attachments), using the credentials saved by `pnpm jira:auth` — skipped with a warning when no credentials or `JIRA_STUB=true` is set. See [`core/website/SPONSOR_PORTAL_SETUP.md`](../core/website/SPONSOR_PORTAL_SETUP.md).

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
