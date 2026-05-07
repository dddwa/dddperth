# DDD Adelaide Website

The website for DDD Adelaide, forked from [DDD Perth](https://github.com/dddwa/dddperth).

## Quick start

```bash
corepack enable pnpm
pnpm install

# Copy the env template and fill in dev values (the server validates these via Zod on boot)
cp website/.env.example website/.env

pnpm start
```

URL: http://localhost:3800

### Required environment variables

The server bails on boot if any of these are missing. For local dev, defaults from `.env.example` work for everything except the GitHub identity, which you should set to the Adelaide fork:

```
GITHUB_REPO=dddadelaide-website-new
GITHUB_ORGANIZATION=dddadelaide
SESSION_SECRET=<any non-empty string>
AZURE_STORAGE_ACCOUNT_NAME=local
SESSIONIZE_2025_SESSIONS=https://sessionize.com/api/v2/placeholder/view/Sessions
SESSIONIZE_2025_ALL_SESSIONS=https://sessionize.com/api/v2/placeholder/view/All
```

The placeholder Sessionize URLs are fine until Adelaide's 2026 Sessionize event is set up (Stage 4 prerequisite). The server only fetches them when the agenda is published.

## Documentation

- [Migration design spec](docs/superpowers/specs/2026-05-06-ddd-adelaide-website-migration-design.md)
- [Migration implementation plan](docs/superpowers/plans/2026-05-07-ddd-adelaide-website-migration.md)
- [CLAUDE.md](CLAUDE.md) — codebase guide for AI assistants

## Tech stack

Nx + React Router 7 + PandaCSS + Park UI + Express + Azure Container Apps. See [CLAUDE.md](CLAUDE.md) for full details.
