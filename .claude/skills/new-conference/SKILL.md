---
name: new-conference
description: Scaffold a new DDD-family conference website by forking ddd-core via git subtree. Use when the user wants to create a sister conference (e.g. "DDD Adelaide"), spin up a new fork of this codebase, or set up a new conference repo. Gathers conference details (name, slug, domain, colours, dates), creates a sibling repo, pulls /core/ as a git subtree, copies /conference-stub/ as the fork's /conference/ and runs a substitution pass, optionally seeds content from an existing site, and writes wrangler configs ready for Cloudflare deployment.
---

# new-conference

This skill scaffolds a new DDD-family conference website. The output is a sibling git repo next to ddd-core that uses ddd-core as a git subtree under `core/` and owns its conference-specific files under `/conference/`.

## Mental model

ddd-core (this repo, eventually) contains all the shared app, components, routes, and build tooling — plus `/conference-stub/` which is **the reference implementation of a `/conference/` folder**. The stub renders as "DevConf Example" — a fictional conference with real configuration, real MDX content, real theme, and real wrangler files. It exists so:

1. `pnpm build` works in ddd-core standalone (no fork required).
2. **This skill copies it** as the seed for a new fork rather than maintaining a parallel set of templates.

A fork's layout:

```
<slug>/                 e.g. dddadelaide/
  core/                 git subtree from ddd-core. Don't edit, EXCEPT the
                        fork-shape repointing in step 6 (core/website/
                        {tsconfig.json,vite.config.ts,project.json}) and the
                        deletion of core/nx.json.
  conference/           copied from core/conference-stub/, with substitutions
    manifest.ts         runtime manifest (public, socials, brand, years)
    build-manifest.ts   build-only manifest (theme refs, content paths, deployment)
    config/             public, socials, years/, venues/
    content/            pages/, blog/
    theme/              <slug>.theme.ts + <slug>-light.theme.ts + index.ts
    wrangler/           local.jsonc, staging.jsonc, production.jsonc
  package.json          workspace root — carries ddd-core's build-tooling devDeps
  nx.json               workspace config (Nx runs from the fork root)
  pnpm-workspace.yaml   core/website, core/libs/*, conference
  tsconfig.json         extends core/tsconfig.base.json (aliases live in core/website)
  tsconfig.base.json    kept so conference/tsconfig.json's ../tsconfig.base.json resolves
  eslint.config.mjs     core's config + the theme-builder allow rule
  .nvmrc                22 (the build needs Node >= 22)
  .gitattributes        merge=ours on core/conference-stub/** and core/nx.json
  FORK_GUIDE.md         manual TODOs (Cloudflare account, D1 IDs, etc.)
```

The workspace root is the **fork root**, not `core/`: `pnpm` and `pnpm nx` run from there. The fork-shape edits in step 6 (and any genuine bug fix) inside `core/` should be **upstreamed to ddd-core**, so they flow back cleanly on the next `/core-pull` rather than being a permanent local divergence.

The skill does NOT publish anything, push to GitHub, deploy to Cloudflare, or run pnpm install in the new repo — those are the user's call.

## Prerequisites & known issues

- **Node ≥ 22 is required.** The app builds on Vite 8, which uses `util.styleText` (Node 20.12+) and won't run on Node < 20.19 / < 22.12. On older Node the build fails with a confusing `does not provide an export named 'styleText'` error, often surfacing first as an Nx *"Failed to process project graph"* message. The scaffold writes a `.nvmrc` (`22`); make sure the active Node is ≥ 22 before `pnpm i` / build. A stale Nx daemon started under the wrong Node persists the error even after switching — clear it with `pnpm nx reset` (or run one-off with `NX_DAEMON=false`).
- **Native bindings (`@swc/core`).** If `pnpm i` first ran under an older Node, you may hit `Cannot find native binding`; re-run `pnpm i` under Node ≥ 22 so the platform-specific optional dep resolves.
- **Hardcoded DDD-Perth branding still in core** (not yet fork-parameterised — flag these in FORK_GUIDE; the real fixes belong upstream in ddd-core):
  - **Logo wordmark.** The header renders `core/website/app/images/svg/logo.svg`, a vector "DDD PERTH" wordmark — the text is drawn as paths, so it can't be substituted. Every fork shows "PERTH" until core makes the logo fork-overridable (a manifest-driven wordmark, or a `/conference/`-supplied asset).
  - **Hero venue** *(fixed in current core)*. The homepage hero used to hardcode "Optus Stadium, Perth"; it now renders `conferenceState.conference.venue.name`. If working against an older core, thread `venue` from `hero.tsx` into `HomepageHeroPanel` (`hero-panel.tsx`).
  - Minor: `_layout.tsx` meta keywords mention "DDD, Perth"; `app-config.ts` has a `DDD Perth <noreply@…>` fallback (overridden by the fork's manifest `noreplyEmail`).

## Workflow

### 1. Verify prerequisites

```bash
# Are we in or above a ddd-core checkout?
test -d core 2>/dev/null && PWD_INSIDE_FORK=1 || PWD_INSIDE_FORK=0
test -d website -a -d libs/conference-config -a -d conference-stub 2>/dev/null && PWD_IN_CORE=1 || PWD_IN_CORE=0

# Git available + configured
git --version
git config user.name
git config user.email
```

If neither check passes, ask the user to navigate to the ddd-core checkout (or to its parent directory) before continuing.

### 2. Gather inputs

Use `AskUserQuestion` to collect:

- **Conference name** — display name, e.g. "DDD Adelaide"
- **Slug** — lowercase, no spaces, used as repo name, e.g. "dddadelaide"
- **Domain** — e.g. "dddadelaide.com" (no scheme)
- **Timezone** — IANA, e.g. "Australia/Adelaide"
- **GitHub org** — where the fork repo will live, e.g. "ddd-adelaide"
- **Legal entity** — for footer copyright, e.g. "DDD Adelaide Inc."
- **First year to scaffold** — e.g. 2026
- **Brand colours** — primary, secondary, accent (hex). Optional — leave blank to keep DevConf Example's teal/slate, which the user edits later.
- **Country acknowledgement?** — bool. If yes, the manifest sets `homepage.acknowledgementSlug` to `'_acknowledgement'` and leaves the placeholder MDX for the user to edit. If no, the slug stays unset and the section doesn't render.
- **Mobile app?** — bool. If yes, prompt for iOS + Android URLs and set `manifest.mobileApp`. If no, leave it unset so `/app` 404s.
- **Existing site URL (optional)** — if provided, fetch + parse to seed content pages.

Save answers to local variables.

### 3. Create the fork directory

```bash
FORK_DIR="../${slug}"
test -e "$FORK_DIR" && { echo "$FORK_DIR exists — choose another slug or remove it"; exit 1; }
mkdir -p "$FORK_DIR"
cd "$FORK_DIR"
git init -b main
```

### 4. Add ddd-core as a git subtree

If the user has ddd-core checked out at a sibling path, use it as a local subtree source. Otherwise use the GitHub URL.

```bash
# Resolve ddd-core source: prefer local checkout if it exists
if [ -d "../ddd-core/.git" ]; then
  DDD_CORE_SOURCE="$(realpath ../ddd-core)"
elif [ -d "../dddperth/.git" ]; then
  DDD_CORE_SOURCE="$(realpath ../dddperth)"
else
  DDD_CORE_SOURCE="<ask user for ddd-core GitHub URL>"
fi

git subtree add --prefix=core "$DDD_CORE_SOURCE" main --squash
git remote add ddd-core "$DDD_CORE_SOURCE"  # save for /core-pull
```

### 5. Seed /conference/ from the stub

The single source of truth for "what a fork's /conference/ folder looks like" is `core/conference-stub/`. Copy it wholesale, then substitute placeholder strings.

```bash
cp -R core/conference-stub conference

# Substitute identity strings. Use `LC_ALL=C sed -i ''` for BSD sed
# compatibility on macOS.
find conference -type f \( -name '*.ts' -o -name '*.mdx' -o -name '*.md' -o -name '*.json' -o -name '*.jsonc' -o -name '*.yml' \) -print0 | \
    xargs -0 sed -i '' \
        -e "s/DevConf Example Inc\\./${LEGAL_NAME}/g" \
        -e "s/DevConf Example/${NAME}/g" \
        -e "s/devconf-example/${SLUG}/g" \
        -e "s/example\\.test/${DOMAIN}/g" \
        -e "s/Etc\\/UTC/${TIMEZONE}/g"

# Theme files reference the stub's variable names — rename them too.
# `example.theme.ts` -> `<slug>.theme.ts`, exported `exampleTheme` -> `<themeName>Theme`.
mv conference/theme/example.theme.ts "conference/theme/${SLUG}.theme.ts"
mv conference/theme/example-light.theme.ts "conference/theme/${SLUG}-light.theme.ts"
sed -i '' \
    -e "s/exampleTheme/${THEME_NAME}Theme/g" \
    -e "s/exampleLightTheme/${THEME_NAME}LightTheme/g" \
    -e "s/example\\.theme/${SLUG}.theme/g" \
    -e "s/example-light\\.theme/${SLUG}-light.theme/g" \
    conference/theme/*.ts conference/build-manifest.ts

# The theme files import `defineTheme` via a relative path that assumes the
# standalone layout (website/ at the repo root). In a fork, website/ lives
# under core/, so repoint it one level deeper. The eslint allow rule in step 7
# whitelists exactly this cross-project import.
sed -i '' \
    -e "s|\\.\\./\\.\\./website/themes/theme-builder|../../core/website/themes/theme-builder|g" \
    "conference/theme/${SLUG}.theme.ts" "conference/theme/${SLUG}-light.theme.ts"

# The wrangler configs reference the worker entry, migrations, and assets
# relative to their own location. Standalone they point at ../../website/;
# in a fork that resolves to a non-existent fork-root website/, so repoint
# them at ../../core/website/.
sed -i '' \
    -e "s|\\.\\./\\.\\./website/|../../core/website/|g" \
    conference/wrangler/local.jsonc conference/wrangler/staging.jsonc conference/wrangler/production.jsonc
```

Then apply user choices:

- **Brand colours**: if the user gave hex values, sed-replace `#14b8a6` (teal primary), `#475569` (slate secondary), `#f59e0b` (amber accent) in both theme files with their values. Note this only moves the three *base* tokens — the derived shades (lighter/darker teals, the light-theme accent) stay on the stub ramp, so the FORK_GUIDE should flag theme refinement. If blank, keep teal/slate.
- **Country acknowledgement**: the stub manifest leaves `acknowledgementSlug` as a prose comment (there's no commented-out line to uncomment). If yes, **add** `acknowledgementSlug: '_acknowledgement',` to the `homepage` object in `conference/manifest.ts`, and rewrite `conference/content/pages/_acknowledgement.mdx` — for AU/NZ, write an actual draft acknowledgement (naming the relevant Traditional Custodians) and add a note for the committee to finalise it. If no, delete `_acknowledgement.mdx`.
- **Mobile app**: `mobileApp` is also just a prose comment in the stub. If yes, **add** a `mobileApp` block to `conference/manifest.ts` with the user-provided iOS + Android URLs. If no, leave it absent (so `/app` 404s).
- **Year**: the stub ships `2024.ts` (past), `2025.ts` (fully-detailed), and `2026.ts` (future skeleton). Build the first real year from the detailed `2025.ts`: **delete `2024.ts` and `2026.ts` first** (so there's no name collision if `${FIRST_YEAR}` is 2026), then rename `2025.ts` → `${FIRST_YEAR}.ts`. Inside it, bump every date literal's year to `${FIRST_YEAR}` (the identity sed already swapped `Etc/UTC` → the conference timezone, so DST offsets come out right). Update `years-index.ts` to reference only the first year. **Venue**: the stub's `config/venues/example-convention-centre.ts` is a generic San Francisco placeholder — if you know the real venue, replace the file (name, address, lat/long, and export name) and update the year config's import; otherwise the FORK_GUIDE flags it.

### 6. Point core at the fork's /conference/

ddd-core ships configured for standalone use: `@conference/*` aliases point at `../conference-stub/`, `cwd`s in project.json are `"website"`, and the repo has its own root configs (`nx.json`, `eslint.config.mjs`, `tsconfig.base.json`). In a fork, several of these need to change so core resolves the fork's `/conference/` (two levels up from `core/website/`) and so Nx/ESLint find the fork-root workspace rather than the embedded core one.

**`core/website/tsconfig.json`** — change the four `@conference/*` paths from `../conference-stub/...` to `../../conference/...`:

```json
"paths": {
  "~/*": ["./app/*"],
  "@conference/manifest": ["../../conference/manifest"],
  "@conference/build-manifest": ["../../conference/build-manifest"],
  "@conference/*": ["../../conference/*"]
}
```

**`core/website/vite.config.ts`** — change the relative build-manifest import, widen `server.fs.allow`, and fix the wrangler `configPath`. All three assume the standalone layout (one level up from `website/`); in a fork the app is at `core/website/`, so each goes one level deeper:

```typescript
import { conferenceBuildManifest } from '../../conference/build-manifest'
// ...
server: {
  // Standalone: '..' (repo root). Fork: '..','..' (fork root) so @conference/*
  // content reads (?raw / fs) two levels up from core/website/ aren't denied.
  fs: { allow: [path.resolve(import.meta.dirname, '..', '..')] },
},
// ...
cloudflare({
  viteEnvironment: { name: 'ssr' },
  configPath: path.resolve(import.meta.dirname, '..', '..', 'conference', 'wrangler', 'local.jsonc'),
}),
```

The `server.fs.allow` widening is easy to miss: without it the dev server boots fine but 500s the moment a page imports `/conference/` content, because Vite denies the file read.

**`core/website/project.json`** — rewrite all `"cwd": "website"` entries to `"cwd": "core/website"` (15 occurrences), fix `sourceRoot`, and fix the two wrangler config paths:

```bash
sed -i '' \
  -e 's|"cwd": "website"|"cwd": "core/website"|g' \
  -e 's|"sourceRoot": "website"|"sourceRoot": "core/website"|g' \
  -e 's|../conference-stub/wrangler/local.jsonc|../../conference/wrangler/local.jsonc|g' \
  core/website/project.json
```

**Delete `core/nx.json`** — when Nx or ESLint tools start from inside `core/website/`, they walk up looking for `nx.json`. If `core/nx.json` exists they pick that up before reaching the fork-root `nx.json` and load a workspace pointing at `core/website` only, which crashes the `@nx/nx-plugin-checks` rule and breaks every nx command run from the fork root. Delete it once at fork-shape time:

```bash
rm core/nx.json
```

Other in-core root configs (`core/eslint.config.mjs`, `core/tsconfig.base.json`, `core/package.json`, `core/pnpm-workspace.yaml`, `core/vitest.workspace.ts`, `core/tsconfig.json`) **must stay** — files inside `core/` reference them with relative paths (e.g. `core/website/eslint.config.mjs` does `import '../eslint.config.mjs'`).

These edits happen inside `core/` but **don't conflict with future `git subtree pull`s** as long as core's upstream defaults don't change. If upstream ever moves the path aliases or renames project.json targets, the user will get a one-time merge conflict during `/core-pull` and fix it by re-applying these overrides. Step 7's `.gitattributes` keeps `core/nx.json` deleted across pulls.

> An alternative would be a fork-root `tsconfig.json` that overrides the paths and a `vite.config.ts` shim that re-exports core's. That avoids touching `core/` files but adds indirection at fork root, and doesn't help with the project.json cwd or nx.json collision. The direct edits are simpler and the conflict surface is small.

### 7. Write the workspace files at fork root

The workspace root is the **fork root**, so it needs the same build-tooling configs ddd-core keeps at its own root. Critically, the app's `core/website/package.json` only declares app deps — **not** nx/vite/typescript/panda/eslint — so a "minimal" fork-root `package.json` will not build. The reliable approach is to **copy these configs up from `core/` and lightly adjust**, since the subtree already placed ddd-core's root configs under `core/`:

```bash
cp core/package.json package.json               # then: set "name" to ${SLUG}
cp core/nx.json nx.json                          # workspace config (core/nx.json is deleted in step 6)
cp core/tsconfig.base.json tsconfig.base.json    # conference/tsconfig.json extends ../tsconfig.base.json
cp core/eslint.config.mjs eslint.config.mjs      # then: add the allow rule (below)
cp core/vitest.workspace.ts vitest.workspace.ts  # then: ['website'] -> ['core/website']
cp core/.gitignore .gitignore                    # already covers node_modules, .nx, conference/wrangler/.dev.vars
cp core/.npmrc core/.prettierrc core/.prettierignore core/.editorconfig .  # pnpm + editor/formatter config
```

Then adjust the copies and generate the genuinely-new files:

- `package.json` — keep ddd-core's full `devDependencies` (the tooling lives here); change `"name"` to `${SLUG}`. The existing scripts (`nx run-many … --all`, `nx dev website`) run from the fork root as-is — **do not** wrap them in `cd core &&`; the workspace root is the fork root, not `core/`.
- `nx.json` — keep as the workspace config. Drop any dangling manual `projects` mapping (e.g. `"infra": "infra-archive"`) if that path doesn't exist in the fork, so `nx run-many --all` doesn't trip on it.
- `pnpm-workspace.yaml` — generate: `core/website`, `core/libs/*`, `conference` (core's lists the standalone paths)
- `tsconfig.json` — generate minimal: `{ "extends": "./core/tsconfig.base.json" }`. The `@conference/*` aliases live in `core/website/tsconfig.json` (step 6), not here. **Keep the fork-root `tsconfig.base.json`** so `conference/tsconfig.json`'s `../tsconfig.base.json` resolves.
- `vitest.workspace.ts` — `export default ['core/website']`
- `eslint.config.mjs` — add the `enforce-module-boundaries` allow rule (below)
- `.gitattributes` — keeps stub + nx.json out of subtree pulls (below)
- `.nxignore` — excludes the embedded stub + core's package.json from Nx project discovery (below)
- `.nvmrc` — `22` (the build requires Node ≥22 — see [Prerequisites](#prerequisites--known-issues))
- `FORK_GUIDE.md` — manual checklist (Cloudflare account, D1 IDs, replace placeholder logos in `conference/public/images/sponsors/`, real dates, etc.)

Contents for the generated files (substitute `{{SLUG}}`, `{{NAME}}`, etc.). `package.json` is copied from `core/` and renamed per the steps above — not generated from scratch.

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'core/website'
  - 'core/libs/*'
  - 'conference'
```

**`tsconfig.json`** — minimal, references core's base so editors pick up shared compiler options. The `@conference/*` aliases are set inside `core/website/tsconfig.json` in step 6, not here:

```json
{
  "extends": "./core/tsconfig.base.json"
}
```

**`.gitattributes`**:
```
# The fork uses its own /conference/, so ignore upstream changes to the stub.
core/conference-stub/** merge=ours

# core/nx.json competes with the fork-root nx.json when tools walk up from
# inside core/website/ to find the workspace root. We delete it at fork-shape
# time (step 6); merge=ours keeps it deleted across future subtree pulls.
core/nx.json merge=ours
```

**Then configure the `ours` merge driver — the `.gitattributes` above does
nothing without it:**

```bash
git config merge.ours.driver true
```

`ours` is *not* one of git's built-in low-level merge drivers (only `text`,
`binary` and `union` are). If `merge.ours.driver` is unset, git silently
ignores the `merge=ours` attribute and falls back to a normal three-way
merge, so the stub and `core/nx.json` conflict on every pull anyway — the
failure is invisible until the first `/core-pull` that touches them.

This lives in `.git/config`, so it is **not committed**. Every fresh clone of
the fork needs it again — call it out in the fork's `CLAUDE.md` setup steps.
Verify with `git config --get merge.ours.driver` (expect `true`).

**`.nxignore`**:
```
# conference-stub is the reference conference shipped with ddd-core for its
# standalone build. The fork uses /conference/ instead — exclude the stub.
core/conference-stub

# core/ is the subtree root: its package.json (name: ddd-core) would
# otherwise be picked up by Nx as a project.
core/package.json
```

**`eslint.config.mjs`** — the fork's themes import `defineTheme` from `core/website/themes/theme-builder` via a relative path that crosses Nx project boundaries. Copy `core/eslint.config.mjs` to the fork root and add the `allow` entry to the `@nx/enforce-module-boundaries` rule:

```js
'@nx/enforce-module-boundaries': [
    'error',
    {
        enforceBuildableLibDependency: true,
        allow: ['^.*/core/website/themes/theme-builder$'],
        depConstraints: [
            { sourceTag: '*', onlyDependOnLibsWithTags: ['*'] },
        ],
    },
],
```

(A future cleanup would move `defineTheme` into `@ddd/conference-config` so themes don't cross project boundaries — then the allow rule and this whole eslint duplication go away.)

**`FORK_GUIDE.md`** — a checklist. Key items:
- Use **Node ≥ 22** (`.nvmrc`); `pnpm i`, then `pnpm nx d1-migrate-local website` and `pnpm nx build website`
- Replace placeholder D1 database IDs in `conference/wrangler/{staging,production}.jsonc` after creating real Cloudflare D1 databases
- **Header logo** still shows the "DDD PERTH" wordmark (hardcoded vector in `core/website/app/images/svg/logo.svg`) — supply a fork logo / upstream a fork-overridable logo to ddd-core
- Replace the stub's placeholder sponsor logos in `conference/public/images/sponsors/` (devconf-*) with your own, prefixed with your slug
- Replace the placeholder `conference/public/favicon.svg` and `conference/public/images/logo.png` — core references both by URL (favicon link, og:image meta)
- Confirm the first year's dates, Sessionize URL/endpoint IDs, and Tito account/event in `conference/config/years/${FIRST_YEAR}.ts`
- Theme refinement: the brand sed only moved the 3 base tokens — tune the derived shades and the light-theme accent in the theme files
- Update `conference/content/pages/team.mdx` (committee) and `contact.mdx` (real contact details); finalise `_acknowledgement.mdx` with the committee if you enabled it
- Dependency note: the fork-root `package.json` mirrors ddd-core's build-tooling devDeps; if a `/core-pull` changes `core/package.json`'s tooling, mirror it up
- Set up Sessionize, Tito (or chosen ticketing), Cloudflare account, domain DNS
- Subscribe to ddd-core updates: run `/core-pull` periodically
- **Never squash-merge a `/core-pull` PR** — it destroys the
  `git-subtree-split` trailer that tells the next pull where it left off, after
  which every pull replays the whole range from the original subtree add. Use a
  merge commit or rebase. Worth stating in the fork's own `CLAUDE.md`.

### 8. Initial commit + report

```bash
git add -A
git commit -m "Initial scaffold from new-conference skill"
```

Then print a summary:
- Path to the new fork
- Next steps: `cd ${FORK_DIR}`, ensure Node ≥ 22 (`nvm use` reads `.nvmrc`), then `pnpm i && pnpm nx d1-migrate-local website && pnpm nx dev website`
- Link to FORK_GUIDE.md for the manual TODOs

## Restructuring an existing repo in place

Sometimes the fork repo already exists as a *flat* ddd-core clone — e.g. someone created `github.com/<org>/<slug>`, pushed ddd-core's contents to it, and added an `upstream` remote pointing at ddd-core (so it has `website/`, `libs/`, `conference-stub/` at the root, not the `core/` + `conference/` shape). You can't `git init` a fresh sibling (step 3) over it — restructure in place:

1. **Confirm it's safe to flatten.** `git fetch upstream && git diff --stat upstream/main HEAD` — if HEAD matches `upstream/main`, the root content is just ddd-core and nothing fork-specific is lost. If it differs, the repo has local commits; upstream or reconcile them first.
2. **Tag a restore point:** `git tag pre-fork-restructure`.
3. **Add the `ddd-core` remote** for `/core-pull`: `git remote add ddd-core <url>` (or reuse the existing `upstream`, which already points at ddd-core — subtree tracks by commit, not remote name).
4. **Remove the flat ddd-core source from the root**, keeping `.git`, the workspace configs, and any fork-owned files: `git rm -r website libs conference-stub docs ARCHITECTURE.md README.md pnpm-lock.yaml` (and root `CLAUDE.md` if you'll write a fork-specific one), then commit. **Keep** `package.json`, `nx.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `eslint.config.mjs`, `vitest.workspace.ts`, `.gitignore`, `.npmrc`, `.prettier*`, `.editorconfig`, `.claude/` — you'll edit these in step 7 rather than `cp` them up from `core/`.
5. **Embed core as a subtree:** `git subtree add --prefix=core upstream main --squash`. Because HEAD == upstream/main, `core/` ends up byte-identical to what was at the root.
6. Follow steps 5–8 as normal. In step 7, **edit the kept root configs** instead of copying them up: rename `package.json`'s `name`, repoint `pnpm-workspace.yaml`, point `tsconfig.json` at `core/`, add the eslint allow rule, set `vitest.workspace.ts` to `['core/website']`, and (still per step 6) delete `core/nx.json`.

Removing root source then re-adding it under `core/` is destructive — always tag first and confirm `git diff --stat upstream/main HEAD` is empty before deleting.

## Scraping an existing site (optional)

If the user provides an existing site URL, fetch standard page paths via `WebFetch` and overwrite the matching stub MDX files:

```
GET https://<source>/about          → conference/content/pages/about.mdx
GET https://<source>/code-of-conduct → conference/content/pages/code-of-conduct.mdx
GET https://<source>/faq            → conference/content/pages/faq.mdx
GET https://<source>/contact        → conference/content/pages/contact.mdx
GET https://<source>/venue          → conference/content/pages/venue.mdx
GET https://<source>/sponsorship    → conference/content/pages/sponsorship.mdx
... etc
```

For each successful fetch, ask `WebFetch` to extract the main page content as Markdown, preserving headings and lists. Overwrite the stub MDX file with the new body, keeping the standard frontmatter (`title`, `summary`). Pages that 404 stay as the substituted-stub version.

**Don't scrape sponsor logos, team photos, or the agenda** — those are visual/structured data that the user needs to curate.

## After scaffolding

The skill ends with a clear next-steps message. The user (not the skill) does:

1. `cd <fork>` (the skill leaves them in the new dir)
2. Ensure **Node ≥ 22** is active (`nvm use` reads the `.nvmrc`)
3. `pnpm i`
4. `pnpm nx d1-migrate-local website`
5. `pnpm nx dev website`
6. Create the GitHub repo + first push
7. Provision a Cloudflare D1 database, paste the IDs into `conference/wrangler/{staging,production}.jsonc`
8. Buy the domain + point DNS at Cloudflare
9. Walk the FORK_GUIDE.md checklist for sponsorship logos, team bios, blog posts, etc.

## What the skill must NOT do

- Push to GitHub (the user owns the remote)
- Provision Cloudflare resources (the user has the account)
- Run `pnpm i` in the new repo (the user may want to inspect first)
- Touch ddd-core's git history (additive only)
- Overwrite an existing fork directory (refuse with a clear message)
- Run `wrangler deploy` (deploy is gated on D1 IDs the user must paste)

## Why no /templates/ folder

Earlier versions of this skill maintained a parallel `templates/` folder with `.tpl` files that mirrored the stub. That was duplication: any change to the manifest contract, theme shape, or wrangler config had to happen in two places.

The single-source-of-truth pattern is: **`core/conference-stub/` IS the template**. It's a working conference (`ddd-core` standalone runs it via `pnpm nx dev website`), and this skill copies it. If you find yourself adding a templates folder back, ask whether the change belongs in the stub instead.
