# DDD Perth Website

This repository uses [Nx](https://nx.dev) to manage the mono repo and keep everything together.

## Quick Start

```bash
# Enable corepack (for pnpm)
corepack enable pnpm

# Install dependencies
pnpm i

# Apply D1 database migrations (first time only)
pnpm nx d1-migrate-local website

# Start development server
pnpm start
```

URL: http://localhost:3800

## Architecture

- **Cloudflare Workers** - Serverless hosting
- **Cloudflare D1** - SQLite database for voting
- **React Router v7** - Full-stack React framework with SSR
- **PandaCSS + Park UI** - Styling system
- **Vite** - Development server and build tool

## Development

### Environment Variables

Create `website/.dev.vars` for local development. The minimum to boot the dev server is:

```ini
SESSION_SECRET=local-dev-secret
WEB_URL=http://localhost:3800
```

Admin login (optional locally) needs a GitHub OAuth app — set:

```ini
WEBSITE_GITHUB_APP_CLIENT_ID=your-client-id
WEBSITE_GITHUB_APP_CLIENT_SECRET=your-secret
```

The full list of recognised variables is the `CloudflareEnv` interface in `website/app/remix-app-load-context.ts`. See [`docs/deploy.md`](./docs/deploy.md) for what each one does and which are needed in production.

### Nx Commands

```bash
# Start dev server (Vite + Cloudflare workerd)
pnpm nx dev website

# Build for production
pnpm nx build website

# Run linting
pnpm nx lint website

# Apply D1 migrations
pnpm nx d1-migrate-local website      # Local
pnpm nx d1-migrate-staging website    # Staging (remote)
pnpm nx d1-migrate-production website # Production (remote)

# Deploy
pnpm nx deploy website            # Default environment
pnpm nx deploy-staging website    # Staging
pnpm nx deploy-production website # Production
```

### D1 Database

Local D1 data is stored in `website/.wrangler/state/`. To inspect data:

```bash
cd website
pnpm wrangler d1 execute dddperth-voting-local --local --command "SELECT * FROM voting_sessions"
```

## Deployment

Production deploys on every push to `main`. Staging deploys when an authorised user comments `/deploy-staging` on a pull request. See [`docs/deploy.md`](./docs/deploy.md) for setup, secrets, and the provisioning script.

## ParkUI

This project uses [Park UI](https://park-ui.com) as the UI framework.

Add components using the CLI:

```bash
pnpm nx parkui website add <component>
```

## Using Nx

### Running Tasks

```bash
nx <target> <project> <...options>
```

Run multiple targets:

```bash
nx run-many -t <target1> <target2>
```

Filter specific projects:

```bash
nx run-many -t <target1> <target2> -p <proj1> <proj2>
```

### Editor Integration

Check out [Nx Console extensions](https://nx.dev/nx-console) for VSCode, IntelliJ, and Vim.

### Project Graph

Run `nx graph` to visualize the workspace dependency graph.
