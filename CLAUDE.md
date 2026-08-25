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
- Build outputs are in `core/website/build/` directory
- Static assets served from core's `core/website/public/` plus `conference/public/` (conference-owned assets like sponsor logos; overlaid onto the site root at the same URLs)
- Environment variables for local dev go in `conference/wrangler/.dev.vars` (the `cloudflare()` vite plugin resolves `.dev.vars` relative to the active wrangler config's directory, not the vite root)
- Local D1 data stored in `core/website/.wrangler/state/`

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
  `wcag21aa`/`wcag22aa` axe scans against the key public routes, plus structural regression checks applied to
  *every* covered route (single `<main>`, single `<h1>`), a skip-link check that asserts the visible
  "Skip to Navigation" variant targets genuinely reachable navigation at each breakpoint, and a focus-visible
  check that tabs through real pages with the keyboard and asserts a visible outline/box-shadow — axe's own
  ruleset under-covers focus-visible styling.
  Config: `core/website/playwright.config.ts`. Tests: `core/website/e2e/`.
- **Route list**: shared across the a11y, focus-visible and visual suites in `core/website/e2e/routes.ts`, so
  coverage can't drift between them. Add new key public routes there once, not per-suite.
- **Test runs are fully isolated from local dev.** The suites use their own wrangler config
  (`conference/wrangler/e2e/e2e.jsonc`, selected via the `WRANGLER_CONFIG` env var read in `vite.config.ts`) in
  its own directory. The Cloudflare Vite plugin resolves `.dev.vars` relative to the active wrangler config's
  directory, so the suites get their own generated `conference/wrangler/e2e/.dev.vars` (gitignored) and the
  developer's `conference/wrangler/.dev.vars` is never read or written. Ports are distinct too: `pnpm start` on
  3800, `nx e2e` on 3801, `pnpm vr` on 3802, and `reuseExistingServer` is `false` — so all three can run at once
  and none can attach to another's server. (An earlier version mutated the real `.dev.vars` and restored it on
  exit; a `kill -9` skipped the restore and left `SESSIONIZE_*` pointing at a dead port.) The one thing
  deliberately *shared* is the local D1 database, so `nx d1-migrate-local` covers it — isolating it would mean a
  new env key in every fork's build-manifest `d1DatabaseName`.
- **Sessionize is never contacted from tests.** `core/website/e2e/start-dev-server.mjs` starts a small fixture
  server (`e2e/fixtures/sessionize/`) and points `SESSIONIZE_2026_*` at it *before* booting Vite. Two ordering
  facts make the wrapper necessary, both verified: the Cloudflare Vite plugin reads Worker vars from `.dev.vars`
  at boot and ignores `process.env`, and Playwright starts `webServer` **before** `globalSetup` — so this cannot
  be done in `globalSetup`. `pnpm vr` goes through the same wrapper, so visual baselines are captured from
  fixture data rather than whatever is in the developer's `.dev.vars`.
  - **Not MSW**: every Sessionize call happens inside the Cloudflare Worker, so MSW's service worker never sees
    it and its Node interceptors can't run in workerd. Repointing the endpoint uses the same config seam the
    real deployment uses, with no extra dependency.
  - Fixtures are synthetic — they were derived from a live response for **unannounced** CFP submissions, so
    every speaker and talk title is replaced. `app/lib/sessionize-fixtures.test.ts` validates them against the
    production Zod schemas (so a Sessionize schema change fails loudly in unit tests), asserts they still cover
    the keynote/plenum/service sessions the voting filter must exclude, and asserts no real names crept back in.
  - This is what makes the live voting flow testable: with fixtures plus the date override, `/voting` renders
    real comparison cards, so `e2e/voting.spec.ts` covers `TalkOptionCard` end-to-end.
- **Dev-only date override**: `app/lib/dates/dev-date-time-provider.server.ts` reads an unsigned
  `__devDateOverride` cookie (an ISO datetime) and uses it as "now". It's wired into `load-context.server.ts`
  behind **two** guards: `import.meta.env.DEV`, which Vite statically replaces at build time — so the branch, the
  import and the module are dead-code-eliminated from production — **and** `env.E2E_DATE_OVERRIDE === 'true'`,
  which only `e2e/start-dev-server.mjs` sets. The second guard matters for everyday work: the override *replaces*
  the admin provider rather than deferring to it, so without it a stale cookie left over from a test run would
  silently break the admin date override in the UI with no clue why. Ordinary `pnpm start` ignores the cookie.
  **The production guarantee is tested**
  (`app/lib/dates/dev-date-override.test.ts` greps the built worker for the cookie name and fails if it appears),
  because the override deliberately bypasses admin auth: anyone who can set a cookie can move the clock.
  If you refactor that guard, keep it statically evaluable — a runtime `env` lookup will ship the seam.
  - It's a cookie rather than a dev-only endpoint precisely so state is per-browser-context: Playwright workers
    can hold different dates simultaneously, and the suite stays concurrent.
  - Use it to reach date-driven states (CFP open, voting open, agenda published) that otherwise need a D1
    `auth_allowlist` row and a magic-link login via `/admin/settings`. `e2e/date-states.spec.ts` covers those.
  - It does **not** unlock the live voting flow on its own — that also needs a Sessionize `allSessionsEndpoint`,
    which CI has no credentials for. See `A11Y_BACKLOG.md`.
- **Routes are pinned to a past fixture year, never the current one.** The "current" conference is whichever
  year has the latest `conferenceDate` in `conference/config/years-index.ts`, so unpinned `/agenda` and
  `/sponsors` change what they render as dates pass and new years are added — they flip from "not announced yet"
  to a full agenda the moment `agendaPublishedDateTime` passes. Pinned years (`/agenda/2025`, `/sponsors/2025`)
  render identically today and in two years, with no Sessionize credentials, date override or network access,
  because their agendas and sponsor lists are committed `session-data` fixtures under `conference/config/years/`.
  **When adding coverage for a template, pin it to a past year.** `/voting` is deliberately not covered for this
  reason — it has no year param, so it's inherently a moving target; `VotingMessage` and `TalkOptionCard` are
  covered by unit tests instead.
- **One route per template.** This suite is a regression net, not an exhaustive crawl — a second year of the same
  template costs a scan x2 themes plus 9 visual baselines and catches nothing new.
- **Themes**: the suite runs under two Playwright projects — `chromium` (dark, the site default) and
  `chromium-light`. Theme is seeded via the `__theme` cookie in `playwright.config.ts`. This matters because
  axe's `color-contrast` rule evaluates *computed* colours: a palette that passes in dark mode says nothing
  about the light one. The visual suite stays dark-only for now (doubling 63 committed baselines isn't worth it
  until they're generated on CI rather than a local machine).
- **CI**: the `a11y-e2e` job in `.github/workflows/pr.yml` runs this suite on every PR into `main`, but the test
  step is currently `continue-on-error: true` — **it does not block merging yet**. That's temporary while the
  known backlog in `core/website/A11Y_BACKLOG.md` is worked through; once that backlog is clear, remove
  `continue-on-error` from that step so the suite becomes a real merge gate.
- When you fix a page's accessibility, check whether it's also covered by `core/website/e2e/a11y.spec.ts`'s route
  list — if not, and it's a key public route, add it rather than assuming the existing coverage extends to it.
- **Visual regression**: **run it with `pnpm vr`, not `nx e2e-visual website` directly.** It screenshots the
  shared route list across 3 browser engines x 3 viewport widths and compares against committed baselines in
  `core/website/e2e/__screenshots__/` (63 = 7 routes x 9 combinations), to prove a11y markup changes (landmarks,
  heading levels, element type swaps like `div`→`button`) don't change how a page actually looks.
  - **Captures are scoped and masked** (both configured in `e2e/routes.ts`). `visualScope` clips a route's capture
    to a selector — `#main` for every route except `/`, which stays full-page so the shared header/nav/footer
    chrome keeps visual coverage somewhere. `VISUAL_MASK_SELECTORS` paints over `[data-sponsor-grid]`. Both exist
    because `maxDiffPixelRatio` is a *ratio*: a 10,000px-tall capture absorbs several times more real regression
    before it trips than a 2,000px one, and sponsor artwork changes for commercial rather than code reasons.
    Masking rather than hiding keeps layout intact, so the space a sponsor grid occupies is still compared.
  - **It runs in a pinned Docker container** (`mcr.microsoft.com/playwright:v<version>-noble`), both locally via
    `pnpm vr` and in the `visual-regression` CI job. This is load-bearing, not ceremony: the site loads Ubuntu
    from Google Fonts, so a macOS dev box (no Ubuntu installed, webfont often not fetched) renders text in
    Helvetica while a bare Linux runner renders it in Ubuntu. Different metrics → different wrapping → page
    heights off by tens to hundreds of pixels → 3-20% diffs against a 2% tolerance. Not anti-aliasing: real
    reflow. The container gives one font set and one browser build everywhere.
  - **The image tag must track `@playwright/test`** in `core/website/package.json`. A unit test
    (`app/lib/playwright-image-pin.test.ts`) fails the build if they drift. After bumping Playwright: update the
    tag in `pr.yml`, then `pnpm vr --update-snapshots`.
  - Regenerate baselines with `pnpm vr --update-snapshots` (never `--update-snapshots` on the host — that writes
    macOS-rendered images that CI can't reproduce). Review the resulting diff like any other code change.
  - **This job is a real merge gate** — unlike `a11y-e2e`, it is not `continue-on-error`.

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
