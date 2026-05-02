# Deployment

The website runs on Cloudflare Workers with a D1 database for voting. There are two environments: **production** and **staging**.

- **Production** deploys automatically on every push to `main`.
- **Staging** deploys when an authorised user comments `/deploy-staging` on a pull request.

## One-time setup

You need a Cloudflare account and an API token with the following permissions:

- Account → **Workers Scripts: Edit**
- Account → **D1: Edit**
- Account → **Account Settings: Read**

Create the token at https://dash.cloudflare.com/profile/api-tokens.

### Provision Cloudflare resources and GitHub secrets

The provisioning script is idempotent. It creates the staging and production D1 databases (if missing), patches `website/wrangler.jsonc` with their IDs, and writes `CLOUDFLARE_ACCOUNT_ID` (repo variable) plus `CLOUDFLARE_API_TOKEN` (per-environment secret) into the GitHub repository.

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...

# Requires the gh CLI to be installed and authenticated (gh auth login).
# Set SKIP_GITHUB=1 to only do the Cloudflare side.
pnpm provision:cloudflare
```

After it runs, commit the updated `website/wrangler.jsonc` (the database IDs are not secret).

The script also creates the `staging` and `production` GitHub Environments. They start with no required reviewers — anyone who passes the comment-author gate can deploy. Add required reviewers via the repo settings if you want extra friction on staging deploys.

### Worker runtime secrets

The provisioning script only writes the Cloudflare credentials into GitHub. The app's own runtime secrets (read at request time from `context.cloudflare.env`) are set on each Worker separately. The full list lives in the `CloudflareEnv` interface in `website/app/remix-app-load-context.ts`.

The Worker has to exist before secrets can be set, so run an initial `pnpm wrangler deploy --env <env>` first (or trigger the workflow once — it will deploy successfully but the app will fail at runtime until secrets are populated). Non-secret values like `WEB_URL` are already set via `vars` in `wrangler.jsonc`. Local development reads these names from `website/.dev.vars` instead.

#### `SESSION_SECRET`

Used to sign the session cookie. Pick a long random value — anything ≥ 32 bytes is fine. Use a fresh one per environment, and don't reuse the local one in production.

```bash
# Generate a value
openssl rand -base64 32

# Set it
cd website
pnpm wrangler secret put SESSION_SECRET --env staging
pnpm wrangler secret put SESSION_SECRET --env production
```

#### GitHub OAuth (admin login)

`WEBSITE_GITHUB_APP_CLIENT_ID` and `WEBSITE_GITHUB_APP_CLIENT_SECRET` drive the admin login flow in `app/lib/auth.server.ts`. Use the setup tool — it walks GitHub's manifest flow and writes the credentials straight into the right place:

```bash
pnpm setup:github-app
```

Pick the environment in the browser (local / staging / production). Local writes to `website/.dev.vars`; staging/production run `wrangler secret put` against the matching Worker. Run it once per environment. Each environment needs its own GitHub App because the OAuth callback URL is fixed per app — staging callbacks must hit staging.

If you'd rather do it manually: create a GitHub App at https://github.com/settings/apps/new (or the org equivalent), set the user authorisation callback URL to `<WEB_URL>/auth/github/callback`, and `wrangler secret put` both values yourself.

Add admin GitHub handles to `ADMIN_HANDLES` in `website/app/lib/config.server.ts`.

#### GitHub repo pointers ("Edit on GitHub" links)

```bash
pnpm wrangler secret put GITHUB_ORGANIZATION --env <env>   # e.g. dddwa
pnpm wrangler secret put GITHUB_REPO --env <env>           # e.g. dddperth
pnpm wrangler secret put GITHUB_REF --env <env>            # optional, defaults to "main"
```

#### Sessionize (current year)

The bare API URL exposes unpublished sessions, so it lives as a secret. Get the value from the Sessionize event admin page.

```bash
pnpm wrangler secret put SESSIONIZE_2026_SESSIONS --env <env>
pnpm wrangler secret put SESSIONIZE_2026_ALL_SESSIONS --env <env>   # optional
```

#### Optional

```bash
pnpm wrangler secret put TITO_SECURITY_TOKEN --env <env>   # tito webhook signature
```

To rotate any secret, run `wrangler secret put` again — it overwrites.

## Production deploys

`.github/workflows/deploy-cloudflare.yml` runs on every push to `main` (excluding content-only changes). It type checks, lints, builds, applies pending D1 migrations to `dddperth-voting-prod`, and runs `wrangler deploy --env production`.

The job uses the `production` GitHub Environment, so any reviewers configured on that environment must approve before secrets are exposed.

## Staging deploys

`.github/workflows/deploy-staging.yml` is triggered by an `issue_comment` event when someone comments `/deploy-staging` on a pull request.

The author of the comment must have one of:

- `OWNER` — the repo owner
- `MEMBER` — a member of the `dddwa` organisation
- `COLLABORATOR` — explicitly added via repo Settings → Collaborators

`CONTRIBUTOR` (someone who has had a PR merged before) is **not** sufficient. To grant deploy rights to an external contributor, add them as a collaborator.

When triggered, the workflow:

1. Reacts to the comment with 🚀
2. Checks out the PR's head SHA
3. Builds, applies D1 migrations to `dddperth-voting-staging`, and deploys
4. Posts the deployment URL back as a PR comment

The default deploy URL is the `*.workers.dev` URL printed by `wrangler deploy`. To use `staging.dddperth.com` instead, configure a custom domain on the staging worker in the Cloudflare dashboard (Workers & Pages → `dddperth-website-staging` → Settings → Domains & Routes), then update the `WEB_URL` for the staging environment in `website/wrangler.jsonc`.

## Manual deploys

Both workflows support `workflow_dispatch` for the production one. For ad-hoc local deploys (not recommended for production):

```bash
cd website
pnpm wrangler deploy --env staging
pnpm wrangler deploy --env production
```

You'll need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set in your environment.

## Custom domains

`dddperth.com` is hosted on Cloudflare. To attach it to the production worker:

1. Cloudflare dashboard → Workers & Pages → `dddperth-website` → Settings → Domains & Routes
2. Add custom domain `dddperth.com`
3. Cloudflare handles the DNS and TLS automatically.

Repeat with `staging.dddperth.com` for the staging worker once you're ready.
