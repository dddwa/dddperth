# CLAUDE.md

Guidance for Claude Code working in **ddd-core** — the shared upstream that every DDD-family conference website forks from.

## What this repo is

This repo contains the React Router + Cloudflare Worker app, the shared types library, and a working sample conference (`/conference-stub/`, "DevConf Example") so the codebase builds and runs standalone. Real conferences (DDD Perth, etc.) live in separate fork repos that embed this one as a `git subtree` under `core/`.

**Read `ARCHITECTURE.md` first** before making any cross-layer changes — it explains the core/fork split, the manifest contract, and why certain files live where they do.

Stack:

- **Nx** monorepo management
- **React Router v7** with SSR
- **Cloudflare Workers** for hosting
- **Cloudflare D1** (SQLite) for voting + auth
- **PandaCSS + Park UI** for styling
- **TypeScript** throughout
- **Vite** for dev + build

## Essential commands

```bash
# First-time setup
corepack enable pnpm
pnpm i
pnpm nx d1-migrate-local website

# Dev server (http://localhost:3800)
pnpm start
# or: pnpm nx dev website

# Build + lint + test
pnpm build
pnpm lint
pnpm test

# Clean (preserves website/.env)
pnpm clean
```

Nx targets:

```bash
nx <target> website                # any target
nx d1-migrate-local website        # apply D1 migrations locally
nx parkui website add <component>  # add a Park UI component
nx graph                           # workspace dependency graph
```

## Project structure

- **`/website`** — React Router + Cloudflare Worker app
    - `app/` — components, routes, lib, services
    - `workers/` — worker entry (`app.ts`)
    - `migrations/` — D1 schema migrations
    - `themes/` — base.theme.ts (token contract) + theme-builder
    - `app/theme/` — token primitives (colors, durations, shadows, recipes)
    - `vite-plugins/`, `panda.config.ts`, `vite.config.ts` — build pipeline
    - `tsconfig.json` — defines `@conference/*` path aliases (pointing at `../conference-stub/` here; forks override these to point at their own `/conference/`)
- **`/libs/conference-config`** — types-only shared package (`@ddd/conference-config`). The manifest contract every conference satisfies.
- **`/conference-stub`** — working sample conference. Two jobs: (1) lets `ddd-core` build standalone; (2) is the seed that `/new-conference` copies into a new fork's `/conference/`.

## Working with the fork ecosystem

Two Claude Code skills are bundled in `.claude/skills/`:

- **`/new-conference`** — scaffolds a sibling fork repo, embeds this repo as a `git subtree` under `core/`, copies `/conference-stub/` as the seed for the fork's `/conference/`, runs a substitution pass.
- **`/pull-upstream`** — used from inside a fork to pull the latest ddd-core into `core/` via `git subtree pull`.

Read each skill's `SKILL.md` before changes that affect the cross-layer contract (manifest shape, theme shape, wrangler shape, path aliases). Anything you break in the contract will break every existing fork on their next `/pull-upstream`.

## Key application patterns

1. **Routing**: React Router v7 file-based routing in `website/app/routes/`. Layout routes use `_layout` prefix; dynamic segments use `$param` syntax.
2. **Conference data**: Year-based. Each year config lives in the fork's `conference/config/years/`. The stub mirrors the same shape.
3. **Content**: MDX compiled at build time via the `mdx-bundles` Vite plugin. Pages discovered from `conference/content/pages/` (path resolved through `@conference/build-manifest`).
4. **Styling**: PandaCSS with Park UI preset. Recipes in `website/app/recipes/` and `website/app/theme/recipes`. Use `defineRecipe` in `panda.config.ts` rather than runtime `cva` so recipes win utility-prop cascade fights.
5. **Data fetching**: Sessionize (agenda/speakers), Tito (ticketing), GitHub (some content).
6. **Database**: Cloudflare D1 (SQLite). Schema migrations in `website/migrations/` (core). Helpers in `website/app/lib/d1.server.ts`.
7. **Observability**: Cloudflare native — enabled via `observability.enabled` in each wrangler.jsonc.

### Cloudflare Workers context

Bindings reach loaders/actions through the request context:

```typescript
export async function loader({ context }: Route.LoaderArgs) {
    const db = context.db
    const env = context.cloudflare.env
    const ctx = context.cloudflare.ctx
}
```

## Development notes

- ESM throughout
- Node 20+ required
- pnpm is the package manager (enforced via corepack)
- Build outputs: `website/build/`
- Static assets: `website/public/`
- Local env vars: `website/.dev.vars`
- Local D1 data: `website/.wrangler/state/`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first — it has patterns for querying projects, targets, and dependencies.
- When running tasks (build, lint, test, e2e, etc.), prefer running through `nx` (`nx run`, `nx run-many`, `nx affected`) instead of the underlying tooling.
- Prefix nx commands with the workspace's package manager (`pnpm nx build`) — avoids the globally installed CLI.
- The Nx MCP server tools are available — use them.
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md` if present.
- Never guess CLI flags — check `nx_docs` or `--help`.

## Scaffolding & generators

- For scaffolding tasks (creating apps, libs, project structure), invoke the `nx-generate` skill FIRST before exploring or calling MCP tools.

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases.
- DON'T USE for: basic generator syntax, standard commands, things you already know.
- The `nx-generate` skill handles generator discovery internally — don't call nx_docs just to look up generator syntax.

<!-- nx configuration end-->
