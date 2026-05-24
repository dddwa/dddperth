# Architecture

The codebase is split into two layers: **ddd-core** (shared app, build tooling, types, and a working reference conference) and a **fork** (the actual conference — content, theme, year configs, wrangler bindings). Each layer lives in its own git repo. Forks embed core as a git subtree under `core/`.

This repo (`dddperth`) is one such fork. Other forks (e.g. a hypothetical `dddadelaide`) follow the same shape.

## Layout

```
ddd-core/                    ← shared layer (its own repo)
  website/                   React Router + Cloudflare Worker app
    app/                     components, routes, lib, services
    workers/                 worker entry
    themes/                  base.theme.ts (token contract), theme-builder
    app/theme/               token primitives (colors, durations, shadows, recipes)
    migrations/              D1 schema
    vite-plugins/            mdx-bundles, etc.
    scripts/                 prepare-deploy-config, manifest-d1-migrate
    panda.config.ts          reads theme via @conference/theme
    vite.config.ts           reads content paths + wrangler config via @conference/build-manifest
    tsconfig.json            defines @conference/* path aliases
  libs/conference-config/    types-only shared package
    src/types.ts             ConferenceYear, Sponsor, ConferenceVenue, ...
    src/manifest.ts          ConferenceManifest (runtime) + ConferenceBuildManifest (build)
    src/sessionize-schema.ts Zod schemas
  conference-stub/           "DevConf Example" — working sample conference
    manifest.ts, build-manifest.ts
    config/                  public, socials, years/{2024,2025,2026}, venues
    content/                 pages/, blog/
    theme/                   example.theme.ts + example-light.theme.ts + index.ts
    wrangler/                local + staging + production with placeholder IDs

<fork>/                      ← per-conference repo (e.g. dddperth/, dddadelaide/)
  core/                      git subtree from ddd-core, never edited directly
  conference/                this fork's content + config
    manifest.ts              runtime manifest: public, socials, brand, conferences
    build-manifest.ts        build manifest: theme refs, content paths, deployment names
    config/                  public.ts, socials.ts, years-index.ts, years/, venues/
    content/                 pages/ (15+ MDX), blog/ (posts + authors.yml)
    theme/                   <slug>.theme.ts + <slug>-light.theme.ts + index.ts
    wrangler/                local.jsonc, staging.jsonc, production.jsonc
  package.json               proxies pnpm/nx into core/
  pnpm-workspace.yaml        core/website, core/libs/*, conference
  tsconfig.json              extends core/tsconfig.base.json, overrides @conference/* paths
  .gitattributes             core/conference-stub/** merge=ours
```

## The two-purposes of `conference-stub/`

`conference-stub/` lives in `ddd-core` and serves two jobs:

1. **Makes core runnable on its own.** A contributor cloning `ddd-core` can `pnpm i && pnpm nx dev website` and get DevConf Example. No fork required.
2. **Seed for new forks.** `/new-conference` copies this folder as the starting point for a new fork's `/conference/`, then runs a substitution pass for name, domain, slug, etc.

Because it's the seed, any change to the manifest contract, theme shape, or wrangler shape flows through to every new fork automatically — no parallel `templates/` folder to keep in sync.

## How core finds the conference

Core reads everything fork-specific through four path aliases defined in `website/tsconfig.json`:

| Alias | Resolves to | Contents |
|---|---|---|
| `@conference/manifest` | `<conference>/manifest.ts` | Runtime manifest. Importable from anywhere — server, client, components. |
| `@conference/build-manifest` | `<conference>/build-manifest.ts` | Build manifest. Importable from `vite.config.ts`, `panda.config.ts`, build scripts. Has Node-only fields. |
| `@conference/theme` | `<conference>/theme/index.ts` | Theme barrel. Imported by `panda.config.ts`. Separated from `build-manifest` because Panda CJS-bundles `panda.config.ts` and that strips `import.meta`. |
| `@conference/content/*` | `<conference>/content/*` | Used by `app/lib/authors.server.ts` to import the blog authors YAML via Vite's `?raw` loader. |

In `ddd-core` standalone, those aliases point at `../conference-stub/`. In a fork, the fork's `tsconfig.json` overrides them to point at the fork's own `./conference/`. Each repo only knows about one conference — there's no runtime switching.

`vite.config.ts` and `panda.config.ts` are loaded by Node directly (before `vite-tsconfig-paths` is wired up), so they import the build-manifest and theme barrel via relative paths. The `/new-conference` skill sets these paths when it scaffolds a fork.

## Manifest contract

The split between **runtime** and **build** manifest matters:

- `ConferenceManifest` (runtime) — what the app needs at request time: name, socials, brand info, year configs. No Node imports. Safe in the client bundle.
- `ConferenceBuildManifest` (build) — extends runtime with `content.{pagesDir,blogDir,blogAuthorsFile}` (computed with `path.resolve(import.meta.dirname, ...)`), `theme.{currentTheme,currentLightTheme}` (Panda CSS types), and `deployment.{workerName,d1DatabaseName,webUrl}` (per-env names). Only ever imported by build-time code.

Mixing the two ships `path.resolve` calls into the browser bundle, which fails at runtime under workerd. The type system enforces the split.

## Wrangler

Three jsonc files live in `conference/wrangler/`. All paths inside are relative to the wrangler file's location (e.g. `main: "../../core/website/workers/app.ts"` from a fork; `"../../website/workers/app.ts"` in `ddd-core` standalone since there's no `core/` prefix). The Nx `deploy` / `dev` targets pass `-c .../wrangler/<env>.jsonc` to wrangler.

D1 database names are duplicated between the wrangler files and `build-manifest.ts` `deployment.d1DatabaseName`. The duplication is intentional — wrangler needs the names statically in JSON, and the Nx D1 migration scripts read them from the manifest. The `new-conference` skill keeps both in sync; if you edit by hand, change both.

## What lives where, decision tree

| Question | Where it goes |
|---|---|
| New React component used by all conferences | `core/website/app/components/` |
| New route used by all conferences | `core/website/app/routes/` |
| New conference year's data | `conference/config/years/YYYY.ts` |
| Brand colour change | `conference/theme/<slug>.theme.ts` (and `-light`) |
| Content of an existing page (about, faq, etc.) | `conference/content/pages/*.mdx` |
| New page added for one conference only | `conference/content/pages/<slug>.mdx` (auto-discovered by mdx-bundles) |
| Hero blurb on the homepage | `conference/content/pages/_home-hero.mdx`, referenced by `manifest.homepage.heroBlurbSlug` |
| Country / land acknowledgement | `conference/content/pages/_acknowledgement.mdx`, referenced by `manifest.homepage.acknowledgementSlug` |
| Mobile app download page (`/app`) | `manifest.mobileApp` (iOS + Android URLs). Omit to 404 the route |
| New manifest field | `core/libs/conference-config/src/manifest.ts` (interface) + every fork's `conference/manifest.ts` (value) |
| D1 migration | `core/website/migrations/` (schema is core; data is per-fork at runtime) |
| Sessionize/Tito secret | env var (set per environment via `wrangler secret put`) |

### Fork-content extension points

The runtime manifest has two opt-in slots for fork-owned MDX rendered by core components:

- `homepage.heroBlurbSlug` — MDX shown in the home-page hero. Without this slug, the hero renders a one-line fallback from `manifest.public.description`.
- `homepage.acknowledgementSlug` — MDX rendered as the footer Country acknowledgement. Without this slug, the section doesn't render — appropriate for forks in regions without Country acknowledgement conventions.

Slugs starting with `_` are excluded from the sitemap and the catchall route (they're fragments embedded in other pages, not navigable pages).

Mobile-app advertising follows a different pattern — `manifest.mobileApp` either exists (route renders) or doesn't (route + JSON endpoint both 404). No fallback rendering, because pointing visitors at a non-existent app is worse than no link at all.

When a new per-fork extension point is needed, the same pattern applies: add an optional manifest field in `core/libs/conference-config/src/manifest.ts`, have the core component check + branch on it, ship an `.mdx` in `conference/content/pages/` if the fork wants the content. Avoid baking conference-specific strings into components.

## Scripts

- `core/website/scripts/prepare-deploy-config.mjs` — runs before `wrangler deploy` to merge env-specific vars from `conference/wrangler/<env>.jsonc` into the built worker config.
- `core/website/scripts/manifest-d1-migrate.mjs` — reads D1 database name for the chosen env from `conference/manifest.ts` and shells out to `wrangler d1 migrations apply`. Lets `pnpm nx d1-migrate-{local,staging,production} website` work without hard-coding conference names in core.

## Skills

Two skills automate the lifecycle:

- `/new-conference` (in `.claude/skills/new-conference/`) — scaffolds a fork repo with `core/` as a git subtree. Copies `conference-stub/` as the seed for the fork's `/conference/`, then runs a substitution pass. No separate templates folder.
- `/pull-upstream` (in `.claude/skills/pull-upstream/`) — pulls latest ddd-core into a fork via `git subtree pull` and verifies the build.

See each skill's `SKILL.md` for the full workflow.
