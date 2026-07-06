# ddd-core

Shared core for the DDD-family conference websites. This repo contains the React Router + Cloudflare Worker app, shared types, and the build pipeline. It also ships a working sample conference (`conference-stub/`, "DevConf Example") so it builds and runs standalone.

Real conferences live in **fork repos** (e.g. `dddwa/dddperth`) that embed this repo as a `git subtree` under `core/` and provide their own `/conference/` directory with content, theme, year configs, and wrangler bindings. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full layout.

## Quick start (standalone)

```bash
corepack enable pnpm
pnpm i
pnpm nx d1-migrate-local website
pnpm start
```

Open http://localhost:3800 — you should see DevConf Example.

## Creating a new conference fork

Use the bundled Claude Code skill:

```
/new-conference
```

It scaffolds a sibling repo, embeds ddd-core as a `git subtree` under `core/`, copies `conference-stub/` as the fork's starting `/conference/`, and runs a substitution pass for name, slug, domain, theme. See `.claude/skills/new-conference/SKILL.md` for the workflow.

## Pulling upstream changes into a fork

From inside a fork repo:

```
/pull-upstream
```

See `.claude/skills/pull-upstream/SKILL.md`.

## Stack

- **React Router v7** with SSR
- **Cloudflare Workers** for hosting
- **Cloudflare D1** (SQLite) for voting + auth
- **PandaCSS + Park UI** for styling
- **Nx** for the monorepo
- **Vite** for dev + build
- **TypeScript** throughout

## Local environment variables

Create `website/.dev.vars` for local development. Minimum to boot:

```ini
SESSION_SECRET=local-dev-secret
WEB_URL=http://localhost:3800
```

The full list of recognised variables is the `CloudflareEnv` interface in `website/app/remix-app-load-context.ts`.

Admin login uses magic links. Locally, leave `RESEND_API_KEY` empty — the dev server prints the magic-link URL to the console instead of sending email. Add yourself to the `auth_allowlist` D1 table to log in:

```bash
pnpm wrangler d1 execute devconf-example-voting-local --local --command \
  "INSERT INTO auth_allowlist (email, name, added_at) VALUES ('you@example.com', 'You', unixepoch())"
```

(In a fork, the database name will match what the fork's `conference/wrangler/local.jsonc` declares.)

## Nx commands

```bash
pnpm nx dev website                # Dev server
pnpm nx build website              # Production build
pnpm nx lint website               # Lint
pnpm nx d1-migrate-local website   # Apply D1 migrations locally
pnpm nx parkui website add <name>  # Add a Park UI component
nx graph                           # Workspace dependency graph
```

## License

MIT.
