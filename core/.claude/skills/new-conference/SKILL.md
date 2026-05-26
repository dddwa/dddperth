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
  core/                 git subtree from ddd-core, NEVER edited directly
  conference/           copied from core/conference-stub/, with substitutions
    manifest.ts         runtime manifest (public, socials, brand, years)
    build-manifest.ts   build-only manifest (theme refs, content paths, deployment)
    config/             public, socials, years/, venues/
    content/            pages/, blog/
    theme/              <slug>.theme.ts + <slug>-light.theme.ts + index.ts
    wrangler/           local.jsonc, staging.jsonc, production.jsonc
  package.json          proxies pnpm/nx commands into core/
  pnpm-workspace.yaml   includes core/website, core/libs/*, conference
  tsconfig.json         extends core's base, overrides @conference/* aliases
  .gitattributes        merge=ours on core/conference-stub/**
  FORK_GUIDE.md         manual TODOs (Cloudflare account, D1 IDs, etc.)
```

The skill does NOT publish anything, push to GitHub, deploy to Cloudflare, or run pnpm install in the new repo — those are the user's call.

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
git remote add ddd-core "$DDD_CORE_SOURCE"  # save for /pull-upstream
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
```

Then apply user choices:

- **Brand colours**: if the user gave hex values, sed-replace `#14b8a6` (teal primary), `#475569` (slate secondary), `#f59e0b` (amber accent) in both theme files with their values. If blank, keep teal/slate — the FORK_GUIDE notes that this is the next thing to customise.
- **Country acknowledgement**: if yes, uncomment the `acknowledgementSlug` line in `conference/manifest.ts` and rewrite `conference/content/pages/_acknowledgement.mdx` with a placeholder telling the user to write the actual acknowledgement. If no, delete `_acknowledgement.mdx`.
- **Mobile app**: if yes, uncomment + fill `mobileApp` block in `conference/manifest.ts` with the user-provided URLs. If no, leave it commented.
- **Year**: rename `conference/config/years/2025.ts` to `conference/config/years/${FIRST_YEAR}.ts` and update all date literals inside to use the user's first year. Delete `2024.ts` and `2026.ts` (they're the example past/future skeletons; the user will add real prior/future years over time). Update `years-index.ts` to only reference the first year.

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

**`core/website/vite.config.ts`** — change the relative build-manifest import + the wrangler `configPath`:

```typescript
import { conferenceBuildManifest } from '../../conference/build-manifest'
// ...
cloudflare({
  viteEnvironment: { name: 'ssr' },
  configPath: path.resolve(import.meta.dirname, '..', '..', 'conference', 'wrangler', 'local.jsonc'),
}),
```

**`core/website/project.json`** — rewrite all `"cwd": "website"` entries to `"cwd": "core/website"` (15 occurrences) and fix the two wrangler config paths:

```bash
sed -i '' 's|"cwd": "website"|"cwd": "core/website"|g' core/website/project.json
sed -i '' 's|../conference-stub/wrangler/local.jsonc|../../conference/wrangler/local.jsonc|g' core/website/project.json
```

**Delete `core/nx.json`** — when Nx or ESLint tools start from inside `core/website/`, they walk up looking for `nx.json`. If `core/nx.json` exists they pick that up before reaching the fork-root `nx.json` and load a workspace pointing at `core/website` only, which crashes the `@nx/nx-plugin-checks` rule and breaks every nx command run from the fork root. Delete it once at fork-shape time:

```bash
rm core/nx.json
```

Other in-core root configs (`core/eslint.config.mjs`, `core/tsconfig.base.json`, `core/package.json`, `core/pnpm-workspace.yaml`, `core/vitest.workspace.ts`, `core/tsconfig.json`) **must stay** — files inside `core/` reference them with relative paths (e.g. `core/website/eslint.config.mjs` does `import '../eslint.config.mjs'`).

These edits happen inside `core/` but **don't conflict with future `git subtree pull`s** as long as core's upstream defaults don't change. If upstream ever moves the path aliases or renames project.json targets, the user will get a one-time merge conflict during `/pull-upstream` and fix it by re-applying these overrides. Step 7's `.gitattributes` keeps `core/nx.json` deleted across pulls.

> An alternative would be a fork-root `tsconfig.json` that overrides the paths and a `vite.config.ts` shim that re-exports core's. That avoids touching `core/` files but adds indirection at fork root, and doesn't help with the project.json cwd or nx.json collision. The direct edits are simpler and the conflict surface is small.

### 7. Write the workspace files at fork root

These files don't have stub equivalents because they live at the fork's *root*, not inside `/conference/`. Generate them inline:

- `package.json` — minimal, scripts proxy to core
- `pnpm-workspace.yaml` — `core/website`, `core/libs/*`, `conference`
- `tsconfig.json` — extends `core/tsconfig.base.json`, overrides `@conference/*` paths to point at the fork's `./conference/*`
- `eslint.config.mjs` — re-exports core's config plus the fork-specific `enforce-module-boundaries` allow rule (see below)
- `.gitattributes` — keeps stub + nx.json out of subtree pulls (see below)
- `.nxignore` — excludes embedded core's stub + package.json from Nx project discovery (see below)
- `FORK_GUIDE.md` — manual checklist (Cloudflare account, D1 IDs, replace placeholder logos in core/website/public/images/sponsors/, etc.)

Inline content for these files (substitute `{{SLUG}}`, `{{NAME}}`, etc.):

**`package.json`**:
```json
{
  "name": "{{SLUG}}",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "cd core && pnpm nx dev website",
    "build": "cd core && pnpm nx build website",
    "lint": "cd core && pnpm nx lint website",
    "test": "cd core && pnpm nx test website"
  }
}
```

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

**`.nxignore`**:
```
# conference-stub is the reference conference shipped with ddd-core for its
# standalone build. The fork uses /conference/ instead — exclude the stub.
core/conference-stub

# core/ is the subtree root: its package.json defines @ddd-core/source which
# Nx would otherwise pick up as a project.
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
- Replace placeholder D1 database IDs in `conference/wrangler/{staging,production}.jsonc` after creating real Cloudflare D1 databases
- Move sponsor logos from `core/website/public/images/sponsors/devconf-*` (the stub's placeholders) to your own under the same path with your slug prefix
- Update `conference/content/pages/team.mdx` with real organising committee
- Update `conference/content/pages/contact.mdx` with real contact details
- If you chose Country acknowledgement: write `conference/content/pages/_acknowledgement.mdx`
- Set up Sessionize, Tito (or chosen ticketing), Cloudflare account, domain DNS
- Subscribe to ddd-core updates: run `/pull-upstream` periodically

### 8. Initial commit + report

```bash
git add -A
git commit -m "Initial scaffold from new-conference skill"
```

Then print a summary:
- Path to the new fork
- Next steps: `cd ${FORK_DIR} && pnpm i && pnpm nx d1-migrate-local website && pnpm nx dev website`
- Link to FORK_GUIDE.md for the manual TODOs

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
2. `pnpm i`
3. `pnpm nx d1-migrate-local website`
4. `pnpm nx dev website`
5. Create the GitHub repo + first push
6. Provision a Cloudflare D1 database, paste the IDs into `conference/wrangler/{staging,production}.jsonc`
7. Buy the domain + point DNS at Cloudflare
8. Walk the FORK_GUIDE.md checklist for sponsorship logos, team bios, blog posts, etc.

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
