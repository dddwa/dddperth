# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the DDD Perth conference website built with:

- **Nx** monorepo management
- **React Router v7** (Remix successor) with SSR
- **Cloudflare Workers** for serverless hosting
- **Cloudflare D1** (SQLite) for voting database
- **PandaCSS** + **Park UI** for styling
- **TypeScript** throughout
- **Vite** for development server and building

## Essential Commands

### Development

```bash
# Install dependencies (uses pnpm)
pnpm i

# Apply D1 migrations (first time setup)
pnpm nx d1-migrate-local website

# Start development server (http://localhost:3800)
pnpm start
# or
pnpm nx dev website
```

### Build & Test

```bash
# Build all projects
pnpm build

# Lint all projects
pnpm lint

# Run tests
pnpm test

# Clean build artifacts (preserves .env)
pnpm clean
```

### Nx Commands

```bash
# Run specific target for website project
nx <target> website

# Examples:
nx build website
nx dev website
nx lint website

# D1 Database migrations
nx d1-migrate-local website      # Local development
nx d1-migrate-staging website    # Staging (remote)
nx d1-migrate-production website # Production (remote)

# Deploy
nx deploy website            # Default
nx deploy-staging website    # Staging
nx deploy-production website # Production

# Show project graph
nx graph
```

### UI Development

```bash
# Add Park UI components
pnpm nx parkui website add <component>

# Run Panda CSS commands
pnpm nx panda website <command>
```

## Architecture

### Project Structure

This repo is split into a **core** layer (shared infrastructure) and a **fork** layer (DDD Perth-specific content + config). See `ARCHITECTURE.md` at the repo root for the full picture.

- **`/website`** — CORE: React Router + Cloudflare Worker app
    - `app/` — components, routes, lib, services
    - `workers/` — worker entry (`app.ts`)
    - `migrations/` — D1 schema migrations
    - `themes/` — base.theme.ts (token contract) + theme-builder
    - `app/theme/` — token primitives (colors, durations, shadows, recipes)
    - `vite-plugins/`, `panda.config.ts`, `vite.config.ts` — build pipeline
    - `tsconfig.json` — defines `@conference/*` path aliases
- **`/libs/conference-config`** — CORE: types-only shared package (`@ddd/conference-config`)
    - `src/types.ts`, `src/manifest.ts`, `src/sessionize-schema.ts`
- **`/conference`** — FORK: DDD Perth's owned content + config
    - `manifest.ts`, `build-manifest.ts` — wired into core via `@conference/manifest` and `@conference/build-manifest`
    - `config/` — public.ts, socials.ts, years/, venues/
    - `content/pages/`, `content/blog/` — MDX content
    - `theme/perth.theme.ts`, `theme/perth-light.theme.ts`
    - `wrangler/{local,staging,production}.jsonc`
- **`/conference-stub`** — CORE: working sample conference ("DevConf Example") shipped with `ddd-core`. Makes core runnable on its own (`pnpm nx dev website` in a fresh `ddd-core` clone) and is the source of truth that `/new-conference` copies as the seed for a new fork's `/conference/`.
- **`/infra-archive`** — Archived Azure Bicep infrastructure (historical reference)

### Creating sister conferences

Two skills live in `.claude/skills/`:

- `/new-conference` — scaffolds a sibling fork repo using `git subtree` to embed `core/` (this repo's `website` + `libs`).
- `/pull-upstream` — pulls latest ddd-core into an existing fork.

Read `.claude/skills/new-conference/SKILL.md` and `ARCHITECTURE.md` before reorganising any cross-layer code.

### Key Application Patterns

1. **Routing**: Uses React Router v7 with file-based routing
    - Routes defined in `website/app/routes/`
    - Layout routes use `_layout` prefix
    - Dynamic segments use `$param` syntax

2. **Conference Data**: Year-based configuration
    - Config files in `website/app/config/years/`
    - Main config in `conference-config.ts`
    - Each year has sponsors, dates, venues, etc.

3. **Content Management**:
    - MDX files compiled at runtime using `mdx-bundler`
    - Blog posts with frontmatter metadata
    - Static page content in `/website-content/pages/`

4. **Styling**: PandaCSS with Park UI preset
    - Recipes defined in `website/app/recipes/`
    - Components use generated CSS functions
    - Responsive design with Panda conditions

5. **Data Fetching**:
    - Sessionize API for agenda/speakers
    - Tito API for ticketing
    - GitHub API for content

6. **Database**: Cloudflare D1 (SQLite)
    - Voting data stored in D1
    - Migrations in `website/migrations/`
    - Helper functions in `website/app/lib/d1.server.ts`

7. **Observability**: Cloudflare native
    - Enabled via `observability.enabled` in wrangler.jsonc
    - Logs and metrics in Cloudflare dashboard

### Cloudflare Workers Context

The app receives Cloudflare bindings through the loader/action context:

```typescript
export async function loader({ context }: Route.LoaderArgs) {
    // D1 database
    const db = context.db

    // Environment variables
    const env = context.cloudflare.env

    // Execution context (for waitUntil, etc.)
    const ctx = context.cloudflare.ctx
}
```

## Development Notes

- The project uses ESM modules throughout
- Node 20+ required
- pnpm is the package manager (enforced via corepack)
- Build outputs are in `website/build/` directory
- Static assets served from core's `website/public/` plus `conference/public/` (conference-owned assets like sponsor logos; overlaid onto the site root at the same URLs)
- Environment variables for local dev go in `website/.dev.vars`
- Local D1 data stored in `website/.wrangler/state/`

## Accessibility

All UI work must meet **WCAG 2.1 AA**, including hover and focus states (not just default appearance) — this
applies to new code and to fixes/refactors of existing code you touch, not just dedicated a11y tickets.

- **Lint**: `core/website/eslint.config.mjs` runs `eslint-plugin-jsx-a11y`'s `recommended` ruleset, plus
  `jsx-a11y/no-aria-hidden-on-focusable`. It also maps the PandaCSS styled-system's layout primitives (`Box`,
  `Flex`, `Grid`, `Container`, `VStack`, `HStack`, `Divider`) to their native elements via the `jsx-a11y` eslint
  `settings.components` config — without that mapping, jsx-a11y silently skips anything written through the
  styled-system, which is most of this codebase. When adding a new styled-system primitive that wraps a
  meaningful native element (e.g. a new `styled(x)` helper), consider adding it to that mapping too.
- **Automated e2e checks**: `nx e2e website` (Playwright + `@axe-core/playwright`) runs `wcag2a`/`wcag2aa`/
  `wcag21aa`/`wcag22aa` axe scans against the key public routes, plus a couple of structural regression checks
  (single `<main>`/skip-link, single `<h1>`) and a focus-visible check that tabs through real pages with the
  keyboard and asserts a visible outline/box-shadow — axe's own ruleset under-covers focus-visible styling.
  Config: `core/website/playwright.config.ts`. Tests: `core/website/e2e/`.
- **CI**: the `a11y-e2e` job in `.github/workflows/pr.yml` runs this suite on every PR into `main`, but the test
  step is currently `continue-on-error: true` — **it does not block merging yet**. That's temporary while the
  known backlog in `core/website/A11Y_BACKLOG.md` is worked through; once that backlog is clear, remove
  `continue-on-error` from that step so the suite becomes a real merge gate.
- When you fix a page's accessibility, check whether it's also covered by `core/website/e2e/a11y.spec.ts`'s route
  list — if not, and it's a key public route, add it rather than assuming the existing coverage extends to it.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
