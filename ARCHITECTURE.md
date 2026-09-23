# Architecture

The codebase is split into two layers: **ddd-core** (shared app, build tooling, types, and a working reference conference) and a **fork** (the actual conference — content, theme, year configs, wrangler bindings). Each layer lives in its own git repo. Forks embed core as a git subtree under `core/`.

This repo (`dddperth`) is one such fork. Other forks (e.g. a hypothetical `dddadelaide`) follow the same shape.

> **The shared layer is documented once, in [`core/ARCHITECTURE.md`](core/ARCHITECTURE.md).** Go there for the full
> repo layout, the `@conference/*` path aliases, the runtime-vs-build manifest contract, the wrangler layout, the
> "what lives where" decision tree, and the subtree skills.
>
> This file covers only what is specific to _this_ fork. It deliberately doesn't restate the shared material — the
> two files used to be near-identical, and the copies drifted (the root one still described a `/pull-upstream`
> skill that had been renamed to `/core-pull` long before).

## What this fork owns

Everything under `conference/`. Core never edits it, so a `/core-pull` won't touch it:

```
conference/
  manifest.ts              runtime manifest: public, socials, brand, conferences, mobileApp
  build-manifest.ts        build manifest: theme refs, content paths, deployment names
  config/                  public.ts, socials.ts, years-index.ts, years/, venues/
  content/                 pages/ (15+ MDX), blog/ (posts + authors.yml)
  public/                  static assets (sponsor logos, team photos) overlaid onto the site root
  theme/                   perth.theme.ts + perth-light.theme.ts + index.ts
  wrangler/                local.jsonc, staging.jsonc, production.jsonc
```

`core/` is the git subtree from ddd-core and is **never edited directly** — see the upstream doc for how changes
flow back via `/core-push`.

## Where this fork diverges from core

Two things exist here that core doesn't have yet. Both are worth knowing about before you go looking for them
upstream and find nothing:

- **`conference/public/`** — fork-owned static assets, declared via `content.publicDir` in the build manifest. The
  `conference-public` vite plugin overlays them onto the site root in dev and copies them into `build/client` on
  build, so `conference/public/images/sponsors/x.svg` serves at `/images/sponsors/x.svg`. On a name collision with
  core's own `website/public/`, the conference file wins.

    `publicDir` is optional in the type, and `ddd-core`'s own `ConferenceBuildManifest` documentation doesn't mention
    it — if you're reading core's copy of this doc, that field is simply absent there.

- **DDD Perth's mobile app.** The app is retired for 2026 (`manifest.mobileApp.retired`). The shared behaviour is
  documented upstream; what's fork-specific is that we still have an app in the stores at all, and that the copy
  people see comes from App Announcements in `/admin/settings`, not from config. See
  [Mobile app](#mobile-app) below.

## Mobile app

`manifest.mobileApp` either exists (the `/app` download page renders and `/app-config` serves) or is absent (both
404). No fallback rendering — pointing visitors at a non-existent app is worse than no link at all.

Retiring is a third state, and it splits those two routes apart. Once we stop maintaining the app there are still
copies installed on people's phones polling `/app-config` on launch, so 404ing that endpoint breaks them rather
than retiring them. `mobileApp.retired` keeps the store URLs in the manifest (the endpoint needs the rest of the
block) while `/app` starts 404ing like a fork with no app at all. **`/app-config` is untouched — a retired app
receives a byte-identical payload, which a test asserts.** Don't retire an app by deleting `mobileApp`; that takes
the installed copies down with it.

**`retired` is deliberately a bare flag, not a place for banner copy.** Telling a retired app's remaining users
something is what `/app-announcements` already does — editable at `/admin/settings`, stored in D1, and,
decisively, _already understood by the installed builds_. A new config field would only reach a build shipped
after it was added, which for an app nobody is rebuilding is nobody. Note the announcement slot is a single
current message per year, so a standing retirement notice and a day-of update compete for it.

## Fork-content extension points

The runtime manifest has two opt-in slots for fork-owned MDX rendered by core components:

- `homepage.heroBlurbSlug` — MDX shown in the home-page hero. Without this slug, the hero renders a one-line
  fallback from `manifest.public.description`. This fork uses `_home-hero`.
- `homepage.acknowledgementSlug` — MDX rendered as the footer Country acknowledgement. Without this slug, the
  section doesn't render — appropriate for forks in regions without Country acknowledgement conventions. This fork
  uses `_acknowledgement`.

Slugs starting with `_` are excluded from the sitemap and the catchall route (they're fragments embedded in other
pages, not navigable pages).

When a new per-fork extension point is needed: add an optional manifest field in
`core/libs/conference-config/src/manifest.ts`, have the core component check + branch on it, and ship an `.mdx` in
`conference/content/pages/` if the fork wants the content. Avoid baking conference-specific strings into
components.

## Wrangler

Three jsonc files live in `conference/wrangler/`. All paths inside are relative to the wrangler file's location
(e.g. `main: "../../core/website/workers/app.ts"`). The Nx `deploy` / `dev` targets pass
`-c .../wrangler/<env>.jsonc` to wrangler.

D1 database names are duplicated between the wrangler files and `build-manifest.ts` `deployment.d1DatabaseName`.
The duplication is intentional — wrangler needs the names statically in JSON, and the Nx D1 migration scripts read
them from the manifest. **If you edit one by hand, change both.**

## Skills

Three skills live in `.claude/skills/`:

- `/new-conference` — scaffolds a new sibling fork repo with `core/` as a git subtree.
- `/core-pull` — pulls latest ddd-core into this fork via `git subtree pull` and verifies the build.
- `/core-push` — upstreams a change made in this fork's `core/` back into ddd-core as a curated PR, leaving
  fork-local divergence behind.

`/core-push` and `/core-pull` are a pair: work is built in a fork, pushed up, then pulled down by the other forks.

The skills are **authored in ddd-core** and travel down with the subtree as `core/.claude/skills/`. Claude Code
only reads `.claude/skills/` at the repo root, so `scripts/sync-core-skills.mjs` copies them up on `pnpm i`. Edit
them upstream, not here — a local edit is overwritten by the next install.

See each skill's `SKILL.md` for the full workflow.
