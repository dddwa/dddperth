# Deployment

The website runs on Cloudflare Workers with a D1 database for voting. The default deployment shape is two environments: **production** and **staging**.

- **Production** deploys automatically on every push to `main`.
- **Staging** deploys when an authorised user comments `/deploy-staging` on a pull request.

The workflow files (`.github/workflows/deploy-cloudflare.yml`, `.github/workflows/deploy-staging.yml`) live in the fork repo, not in `ddd-core`, because they reference fork-owned identity (worker names, custom domains, GitHub Environments). The skill `/new-conference` scaffolds working defaults; this doc explains the shape so you can adapt them.

## One-time setup

You need a Cloudflare account and an API token with:

- Account → **Workers Scripts: Edit**
- Account → **D1: Edit**
- Account → **Account Settings: Read**

Create the token at https://dash.cloudflare.com/profile/api-tokens.

### Provision Cloudflare resources and GitHub secrets

A fork is expected to ship a provisioning script (`scripts/provision-cloudflare.mjs` is the convention) that idempotently creates the staging and production D1 databases (if missing), writes their IDs into `conference/wrangler/{staging,production}.jsonc`, and writes `CLOUDFLARE_ACCOUNT_ID` (repo variable) plus `CLOUDFLARE_API_TOKEN` (per-environment secret) into the GitHub repository.

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...

# Set SKIP_GITHUB=1 to only do the Cloudflare side.
pnpm provision:cloudflare
```

After it runs, commit the updated wrangler files (D1 database IDs are not secret).

The script is expected to also create the `staging` and `production` GitHub Environments. They start with no required reviewers — anyone who passes the comment-author gate can deploy. Add required reviewers via the repo settings if you want extra friction on staging deploys.

### Worker runtime secrets

The provisioning script only writes the Cloudflare credentials into GitHub. The app's own runtime secrets (read at request time from `context.cloudflare.env`) are set on each Worker separately. The full list lives in the `CloudflareEnv` interface in `core/website/app/remix-app-load-context.ts` (or `website/app/remix-app-load-context.ts` in `ddd-core` standalone).

The Worker has to exist before secrets can be set, so run an initial `pnpm wrangler deploy --env <env>` first (or trigger the workflow once — it will deploy successfully but the app will fail at runtime until secrets are populated). Non-secret values like `WEB_URL` are already set via `vars` in the wrangler config. Local development reads these names from `website/.dev.vars` instead.

#### `SESSION_SECRET`

Used to sign the session cookie. Pick a long random value — anything ≥ 32 bytes is fine. Use a fresh one per environment, and don't reuse the local one in production.

```bash
# Generate a value
openssl rand -base64 32

# Set it
cd website   # or cd core/website in a fork
pnpm wrangler secret put SESSION_SECRET --env staging
pnpm wrangler secret put SESSION_SECRET --env production
```

#### Magic-link auth (Resend)

The admin area (and, optionally, the entire site in staging) is gated by magic-link sign-in. The Worker calls Resend to deliver the link.

1. Create a Resend account, verify the sending domain (e.g. your conference domain), and grab an API key.
2. Set the key per environment:

   ```bash
   cd website   # or cd core/website
   pnpm wrangler secret put RESEND_API_KEY --env staging
   pnpm wrangler secret put RESEND_API_KEY --env production
   ```

3. The from-address (`AUTH_EMAIL_FROM`) and the staging-wide gate flag (`WEBSITE_AUTH_REQUIRED`) are non-secret and live in your wrangler `staging.jsonc` / `production.jsonc` under `vars`.
4. Add admins to the `auth_allowlist` D1 table — see [`website/ADMIN_SETUP.md`](../website/ADMIN_SETUP.md) for the SQL.

The same code path runs locally with `RESEND_API_KEY` unset — magic links are printed to the dev-server console instead of emailed.

#### Sessionize (current year)

The bare API URL exposes unpublished sessions, so it lives as a secret. Get the value from the Sessionize event admin page. The env-var name is year-suffixed on purpose, so a stale value can't keep silently serving the old event's data after rollover:

```bash
pnpm wrangler secret put SESSIONIZE_<YEAR>_SESSIONS --env <env>
pnpm wrangler secret put SESSIONIZE_<YEAR>_ALL_SESSIONS --env <env>   # required for voting
```

See [`runbooks/new-year.md`](./runbooks/new-year.md) for the full year-rollover workflow.

#### Optional

```bash
pnpm wrangler secret put TITO_SECURITY_TOKEN --env <env>   # tito webhook signature, if used
```

To rotate any secret, run `wrangler secret put` again — it overwrites.

## Production deploys

The convention is `.github/workflows/deploy-cloudflare.yml` running on every push to `main` (excluding content-only changes). It type checks, lints, builds, applies pending D1 migrations, and runs `wrangler deploy --env production`. The D1 database name is read from `conference/manifest.ts` `deployment.d1DatabaseName.production` so the workflow doesn't need editing when forks rename databases.

The job uses the `production` GitHub Environment, so any reviewers configured on that environment must approve before secrets are exposed.

## Staging deploys

The convention is `.github/workflows/deploy-staging.yml` triggered by an `issue_comment` event when someone comments `/deploy-staging` on a pull request.

The author of the comment must have one of:

- `OWNER` — the repo owner
- `MEMBER` — a member of the GitHub organisation
- `COLLABORATOR` — explicitly added via repo Settings → Collaborators

`CONTRIBUTOR` (someone who has had a PR merged before) is **not** sufficient. To grant deploy rights to an external contributor, add them as a collaborator.

When triggered, the workflow:

1. Reacts to the comment with 🚀
2. Checks out the PR's head SHA
3. Builds, applies D1 migrations, and deploys
4. Posts the deployment URL back as a PR comment

The default deploy URL is the `*.workers.dev` URL printed by `wrangler deploy`. To use a custom domain, configure it on the staging worker in the Cloudflare dashboard (Workers & Pages → `<worker-name>` → Settings → Domains & Routes), then update `WEB_URL` for the staging environment in `conference/wrangler/staging.jsonc`.

## Manual deploys

Both workflows support `workflow_dispatch` for the production one. For ad-hoc local deploys (not recommended for production):

```bash
cd website   # or cd core/website
pnpm wrangler deploy --env staging
pnpm wrangler deploy --env production
```

You'll need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set in your environment.

## Custom domains

To attach the conference domain to the production worker:

1. Cloudflare dashboard → Workers & Pages → `<worker-name>` → Settings → Domains & Routes
2. Add your custom domain
3. Cloudflare handles DNS and TLS automatically.

Repeat with the staging subdomain for the staging worker once you're ready.
