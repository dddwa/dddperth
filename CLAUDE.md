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

Three Claude Code skills are bundled in `.claude/skills/`:

- **`/new-conference`** — scaffolds a sibling fork repo, embeds this repo as a `git subtree` under `core/`, copies `/conference-stub/` as the seed for the fork's `/conference/`, runs a substitution pass.
- **`/core-pull`** — used from inside a fork to pull the latest ddd-core into `core/` via `git subtree pull`.
- **`/core-push`** — used from inside a fork to upstream a change made in its `core/` back here, as a curated PR. Deliberately not a `git subtree push`: the fork's visual baselines and fork-shape config must not travel up.

Read each skill's `SKILL.md` before changes that affect the cross-layer contract (manifest shape, theme shape, wrangler shape, path aliases). Anything you break in the contract will break every existing fork on their next `/core-pull`.

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

## Links

**`AppLink` (`website/app/components/app-link.tsx`) is the only link component.** It takes a single `to` prop and picks its own element from the shape of that value at runtime:

- internal path (`/agenda`, `#section`) → React Router `<Link>`;
- external URL (`https://`, `//`) → `<a target="_blank" rel="noopener noreferrer">` plus an appended "(opens in a new tab)" hint and a visible `↗`;
- `mailto:`/`tel:` → plain `<a>`, same tab (the OS takes over, so no tab is opened to announce);
- `download` set → plain `<a>`, no hint, whatever the URL shape.

The branch lives in the component because almost every href is a *runtime* value (`sponsor.website`, `action.href`), so "is this external?" isn't answerable by reading the JSX. Three copies of that check had grown (`MdxLink`, `important-dates.tsx`, manual hint call sites) before this was consolidated; `MdxLink` no longer exists.

- **`unstyled` is a real decision, not a style nit.** `AppLink` applies the `navLink` recipe by default, which carries padding and sizing, and the callers that pass no variant rely on it. Links that were plain anchors before (MDX prose, CTAs, sponsor logos, important-dates) must pass `unstyled` or they gain nav-link padding and reflow the page. Both directions were caught by `pnpm vr`, not by review.
- **`aria-label` needs the hint folded into the label**, because it *replaces* element content when the accessible name is computed — an `srOnly` span inside a labelled icon link is silently dropped. `AppLink` handles this; call sites pass a plain label.
- **The separating space is a text node outside the hint span.** Accessible names concatenate each element's contribution with its own whitespace trimmed, so a space *inside* the span is dropped and the name comes out as `"Register as a Volunteer(opens in a new tab)"`. An NBSP doesn't survive either.
- **The visible `↗` is text links only** — WCAG 3.2.5 is about warning everyone, not only screen reader users. It is `aria-hidden` (the hint already says it in words), sized in `em` off `currentColor`, and `textDecoration="none"` so a prose link's underline doesn't run under it. Icon and logo links get the announcement but no glyph. Don't hand-type `↗` into link text.
- **`conference-stub/content/pages/e2e-content-fixture.mdx` carries one external link on purpose**, so the visual baselines cover the arrow. Without it the suite passed while rendering no external text link at all.
- Anchors that legitimately remain: skip links (`skip-to-content.tsx`), `.ics` and `?download=1` downloads.


## Development notes

- ESM throughout
- Node 20+ required
- pnpm is the package manager (enforced via corepack)
- Build outputs: `website/build/`
- Static assets: `website/public/` (core) + the conference layer's `public/` (declared via `content.publicDir` in the build manifest; overlaid onto the site root by the `conference-public` vite plugin)
- Local env vars: `<conference-dir>/wrangler/.dev.vars` (`conference-stub/wrangler/.dev.vars` standalone, `conference/wrangler/.dev.vars` in a fork) — the `cloudflare()` vite plugin resolves `.dev.vars` relative to the active wrangler config's directory, not the vite root
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
