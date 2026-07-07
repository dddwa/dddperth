# Sponsor Portal — setup & local development

The sponsor portal lets sponsor contacts log in (same magic-link auth as `/admin`), upload their
logo, and fill in blurb/website/socials. Sponsor records and contact emails sync **from** the
conference's Jira project; when a sponsor completes their profile the portal ticks the
"Assets for Conference" checkbox **back** onto their Jira issue. Uploaded assets live in R2 and
reach the public website via the committee's import tool (`pnpm sponsor:add` → Portal Import tab) —
the public site keeps rendering from the static year config.

Everything is driven by the optional `sponsorPortal` entry in the conference manifest
(`conference/manifest.ts` → `conference/config/sponsor-portal.ts`). No entry → `/portal` 404s and
sync never runs.

## How access works

- **Who can log in**: emails on the admin allowlist (`auth_allowlist`) OR contacts of an active
  sponsor (`sponsor_contacts` joined to `sponsors.active = 1`).
- **Roles are derived per request** — nothing is stored on the session. `requireAdmin` checks the
  allowlist; `requireSponsorContact` re-resolves email → sponsor on every portal request, so
  removing a contact email in Jira revokes access on the next sync even mid-session.
- Sponsor contacts hitting `/admin` are bounced to `/portal` and vice versa.

## Jira conventions (committee)

- One **Sponsor** issue per sponsorship per year in the sponsors project (DDD Perth: `SPN`).
- Label each issue with the conference year (e.g. `2026`) — the sync JQL filters on it.
- **Contact Email** holds comma/semicolon-separated addresses; those people get portal access.
- **Level of Sponsorship** is the tier shown in the portal (read-only for sponsors).
- The portal ticks **Sponsor Tasks → "Assets for Conference"** when a profile completes
  (logo + blurb + website).

Field/option ids live in `conference/config/sponsor-portal.ts`; update them if the Jira custom
fields are ever recreated.

## Testing safely against the real board: the `portal-test` label

Test issues live on the **real** SPN board, tagged with a `portal-test` label. Two mechanisms keep
test and production data strictly separated:

- **Sync scoping** — the production JQL (in `conference/config/sponsor-portal.ts`) ends with
  `AND labels NOT IN ("portal-test")`, so test issues never reach the production portal. Test
  environments set the `JIRA_SYNC_JQL` var to select **only** `portal-test` issues, so real
  sponsors (and their contact emails) never sync into a test database.
- **Write-back gating** — `JIRA_WRITEBACK_ENABLED` is off everywhere except production. And since
  write-back only ever targets issue keys that exist in that environment's D1, a test environment
  scoped to `portal-test` physically cannot touch a real sponsor's issue even with write-back on.

| Environment | Sync sees | Write-back |
|---|---|---|
| Local (stub, default) | Fixture data, no Jira | Logged only |
| Local (real Jira via `pnpm jira:auth`) | `portal-test` issues only | Off unless opted in — then test issues only |
| Staging | `portal-test` issues only (`JIRA_SYNC_JQL` var) | Off |
| Production | Real sponsors, `portal-test` excluded | On |

**To create a test sponsor**: add a Sponsor issue to SPN with the `portal-test` label (no year
label needed), a tier, and your own email in Contact Email. Sync from the environment you're
testing; you can then log in as that sponsor with your own address. Delete or relabel the issue
when done — the next sync deactivates it and revokes access.

## Local development

### Without Jira (recommended): stub mode

Add to `core/website/.dev.vars` (the `conference/wrangler/.dev.vars` symlink points here):

```
JIRA_STUB=true
```

Then:

```bash
pnpm nx d1-migrate-local website   # once — creates the sponsor tables
pnpm start                          # http://localhost:3800
```

1. Log in as an admin (magic link prints to the dev-server console when Resend isn't configured),
   open **Admin → Sponsors** and hit **Sync now**. Three fixture sponsors (Acme Rockets, Globex,
   Initech — see `app/lib/sponsors/stub-jira-client.server.ts`) land in local D1.
2. Log out, request a magic link for `sponsor-acme@example.com`, and you're in that sponsor's
   `/portal` workspace.
3. Upload a logo and fill in details. On completion the stub "write-back" logs
   `[jira-stub] setSponsorTaskOptionIds(SPN-101, [10078])` to the console instead of touching Jira.

R2 is simulated locally by miniflare (objects under `core/website/.wrangler/state`) — no real
bucket needed.

### Against real Jira

```bash
pnpm jira:auth
```

Prompts for your Atlassian email + API token (create one at
<https://id.atlassian.com/manage-profile/security/api-tokens>), validates them against the real
site (auth, project access, a JQL dry run showing which issues would sync), then writes
`core/website/.dev.vars`.

**Classic or scoped API token?** Both work — the script detects which you gave it. Prefer a
**scoped** token for the committee service account: it can't touch Confluence or anything beyond
Jira work items. When picking scopes, set the **"Scope type" filter to Classic** and tick
`read:jira-work` + `write:jira-work` — Atlassian recommends classic scopes, and the granular ones
are easy to get wrong (each endpoint needs several: `read:issue:jira`, `read:project:jira`,
`read:jql:jira`, `write:issue:jira`, …; and `read:user:jira`/`write:user:jira` are unrelated
user-management scopes). The script prints this as a copy-paste cheat sheet — suggested token
name, suggested 1-year expiry, scope steps — and offers to open the token page; its validation
dry-run will catch an under-scoped token before anything is saved. Scoped tokens authenticate
via the `api.atlassian.com` gateway rather than the site URL; the script detects this and
persists the right API base (`JIRA_API_BASE_URL`) automatically.

**Token expiry reminders.** Atlassian shows the token's expiry only at creation time (there's no
API for it), so the script asks for the date and stores it (`JIRA_TOKEN_EXPIRES`). The hourly
sync then emails the committee (`brand.contactEmail` from the manifest) at **30/14/7/1 days**
before expiry and once more if it lapses — each stage sends exactly once (tracked in the
`notification_log` D1 table), and a replacement token with a new date restarts the cycle. The
Admin → Sponsors page also shows a warning banner from 30 days out. Skipping the date at the
prompt just disables the reminders.
By default it also scopes your local sync to `portal-test`-labelled issues (see the label section
above) and offers to enable write-back — safe, because only test issues are visible. It removes
`JIRA_STUB` for you if it's set.

Run `pnpm jira:auth --full-sync` only if you intentionally need the real sponsor list locally.

Create a test Sponsor issue in the Jira project (with the `portal-test` label, a tier, and your
email in Contact Email), then use **Admin → Sponsors → Sync now**.

### Testing the cron handler

The hourly cron only exists in the production wrangler config. To exercise the `scheduled()`
handler locally, run the built worker with wrangler's scheduled test endpoint:

```bash
pnpm nx build website
cd core/website
pnpm exec wrangler dev -c build/server/wrangler.json --test-scheduled \
    --persist-to .wrangler/state --var JIRA_STUB:true
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=0+*+*+*+*"
```

You should see `Sponsor sync (cron): …` in the wrangler output.

### Unit tests

`pnpm nx test website` — sync planning lives in `app/lib/sponsors/sync-plan.test.ts`, profile
rules and upload validation in `app/lib/sponsors/profile.test.ts`.

## Committee import flow (portal → website)

```bash
pnpm sponsor:add    # http://localhost:3802 → "Portal Import" tab
```

Pick the environment, **Fetch submissions** (shells out to `wrangler d1 execute --remote`; you
must be `wrangler login`-ed), then **Import** on a sponsor: the Add Sponsor form pre-fills, the
logo downloads from R2 and runs through the usual light/dark processing, and **Approve & Save**
writes `core/website/public/images/sponsors/` files + the `conference/config/years/<year>.ts`
entry exactly like a manual add. Commit the result.

**Update tracking.** Each approved import is recorded in a committed sidecar,
`conference/config/years/<year>.portal-imports.json` (keyed by Jira issue key, storing the
submitted values at import time). The submissions list diffs live portal data against it and
flags each sponsor:

- 🆕 **New** — never imported.
- 🔄 **Updated** — the sponsor changed something since the last import; the changed fields
  (blurb / website / socials / logo / name) are listed. **Review update** pre-fills the form,
  re-downloads the logo only if it changed, and **Approve & Save updates the existing config
  entry in place** (no duplicates). A tier change in Jira is flagged but left for you to move
  manually.
- ✅ **Imported** — matches what's on the site's config.

Because the sidecar is committed, the whole committee shares the same "what's been imported"
state through git — the diff is value-based, so a sponsor re-saving identical data doesn't flag
a phantom update.

## Deployment checklist (per environment)

1. **R2 buckets** (once):
   `wrangler r2 bucket create dddperth-sponsor-assets-staging` and `…-prod`
   (names referenced from `conference/wrangler/{staging,production}.jsonc`).
2. **Secrets** (once, per env):
   ```bash
   pnpm jira:auth --secrets staging
   pnpm jira:auth --secrets production
   ```
   Validates the credentials against Jira first, then pushes `JIRA_API_EMAIL`, `JIRA_API_TOKEN`
   and `JIRA_API_BASE_URL` via `wrangler secret put`. Use the committee service account here (it
   needs permission to read and edit issues in the sponsors project), not a personal token — a
   scoped token with `read:jira-work` + `write:jira-work` is the least-privilege option.
3. **D1 migrations**: `pnpm nx d1-migrate-staging website` / `d1-migrate-production website`
   (applies `0004_sponsor_portal.sql`).
4. **Deploy**: the usual `nx deploy-staging|deploy-production website`.
   `prepare-deploy-config.mjs` carries the env's R2 binding and cron triggers into the built
   wrangler config (staging deliberately has no cron, `JIRA_WRITEBACK_ENABLED=false`, and a
   `JIRA_SYNC_JQL` scoped to `portal-test` issues — it syncs manually, sees only test issues, and
   can never tick real Jira checkboxes).

## Data ownership & write-back semantics

Each piece of sponsor data has one owner, which resolves every "who wins" question:

| Data | Owner | Flow |
|---|---|---|
| Tier, contact emails, company name | Committee (Jira) | Jira → portal on sync; read-only for sponsors |
| Quote, website, socials, logo | Sponsor (portal) | Portal → Jira on every save; the portal's value overrides Jira's |

**On every portal save**, sponsor-owned values are pushed into the Jira fields (`Company
Website`, plus the `quote`/`socialLinks` paragraph fields if configured in
`conference/config/sponsor-portal.ts` — omit them and the push skips those). A save with
unchanged values produces no Jira history noise. A logo replaced *after* completion is
re-attached to the issue with a note in the activity feed. All pushes are best-effort — Jira
being down never fails a sponsor's save.

- "Complete" = logo + blurb + website URL (socials optional) — `isProfileComplete()` in
  `app/lib/sponsors/profile.ts`.
- The write-back happens **on the save that completes the profile** (the hourly cron / manual
  sync only retries flips that failed, e.g. Jira was down — the sponsor's save always succeeds
  regardless). It does three things, all append-only snapshots so nothing in Jira is ever
  overwritten and the portal stays the source of truth:
    1. **Ticks "Assets for Conference"** on Sponsor Tasks — reads the current options first and
       adds to them, never clobbering the committee's other ticks.
    2. **Attaches the logo file** to the issue.
    3. **Posts a comment** with what was submitted (blurb, website, socials, logo) — lands in the
       activity feed and notifies watchers.
  Steps 2–3 are best-effort and fire exactly once per completion (guarded by the checkbox state,
  so retries can't duplicate them). Later profile *updates* don't re-comment — change detection
  for the committee lives in the import tool's update tracking.
