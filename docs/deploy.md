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
