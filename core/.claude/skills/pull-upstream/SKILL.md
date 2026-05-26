---
name: pull-upstream
description: Pull latest changes from ddd-core into a fork via git subtree, surface any conflicts, and run a build/typecheck to flag breakage. Use when the user wants to update their conference fork with upstream core changes, sync with ddd-core, or run "pull-upstream". Only meaningful inside a fork repo (one with a /core/ git subtree). Conflicts should be rare because /conference/ is fork-owned and never edited upstream; this skill handles the workflow and the post-pull verification.
---

# pull-upstream

Pulls latest `ddd-core` into a fork's `core/` subtree, then verifies the fork still builds. Conflicts should be rare in practice because the fork only owns `/conference/` (which upstream never touches) and core only owns `/core/` (which the fork never edits).

## When this fails to converge

If conflicts touch files OUTSIDE `core/` (i.e. the fork has edited core directly), this skill stops and asks the user to fix that first. Editing core inside a fork is the slow-bleed antipattern that subtrees are designed to discourage; the right fix is to upstream the change to ddd-core, then re-pull.

## Workflow

### 1. Verify we're inside a fork

```bash
# A fork has /core/ (git subtree) + /conference/ at its root.
test -d core -a -d conference || {
  echo "Not a fork — /core/ and /conference/ both missing"
  echo "Run this from a repo created by /new-conference."
  exit 1
}

# Ensure clean working tree before we start
git diff --quiet || { echo "Uncommitted changes — commit or stash first"; exit 1; }
git diff --cached --quiet || { echo "Staged changes — commit them first"; exit 1; }
```

### 2. Find the ddd-core remote

```bash
git remote get-url ddd-core 2>/dev/null || {
  echo "No 'ddd-core' git remote configured."
  echo "The new-conference skill adds this; either it was never set, or"
  echo "the user removed it. Re-add with:"
  echo "  git remote add ddd-core <ddd-core-url-or-path>"
  exit 1
}
```

### 3. Fetch + preview

```bash
git fetch ddd-core main

# Show what's coming in
git log --oneline core..ddd-core/main -- core/ | head -30
```

If `git log` is empty, the fork is already up to date — print that and exit.

### 4. Run the subtree pull

```bash
git subtree pull --prefix=core ddd-core main --squash
```

This either succeeds cleanly or leaves the repo in a mid-merge state with conflicts.

### 5. Handle conflicts

```bash
git status --short | grep '^UU\|^AA\|^DD' || echo "No conflicts"
```

For each conflict:

- **Inside `core/conference-stub/`**: the `.gitattributes` `merge=ours` rule should auto-resolve these. If one slips through, take ours (the fork's empty/unchanged version). The stub is irrelevant in a fork.
- **Elsewhere inside `core/`**: this means the fork has edited core directly. Show the conflicting paths to the user with a clear explanation:
  > These files are inside `core/` but the fork has local edits to them.
  > That's the antipattern this layout is meant to prevent. The right fix is
  > to upstream the change to ddd-core (and remove the local edit), then
  > re-run `/pull-upstream`. For now, you can resolve manually — typically
  > taking the upstream version and re-applying your edit in a follow-up
  > commit that you'll then upstream.

  Don't auto-resolve these; let the user choose.

- **Anywhere outside `core/`**: this shouldn't be possible from a subtree pull. If it happens, something has gone wrong with the subtree merge — abort with `git merge --abort` and report.

### 6. Once conflicts are resolved (or there were none)

```bash
# Commit the merge (subtree pull leaves it staged when there were conflicts).
git commit --no-edit 2>/dev/null || true

# Refresh dependencies — core may have added/removed packages.
pnpm i

# Type-check + build to catch contract drift.
pnpm nx build website
```

If `pnpm nx build website` fails with TypeScript errors mentioning
`ConferenceManifest`, `ConferenceBuildManifest`, or `ThemeDefinition`, the
upstream has added a required field to one of these contracts. Surface the
errors and explain:

> Core's manifest/theme contract changed in this pull. The fork's
> `/conference/manifest.ts`, `/conference/build-manifest.ts`, or theme files
> need new fields. Look at `core/libs/conference-config/src/manifest.ts` and
> `core/website/themes/base.theme.ts` for the new shape.

### 7. Report

Summarise:
- Number of upstream commits pulled
- Whether there were conflicts (and where)
- Whether the build passed
- Suggested next step: `git push` to share the upstream pull with the team

## What this skill must NOT do

- Push to the fork's remote (the user decides when changes go live)
- Resolve `core/` conflicts automatically when the fork has edited core (that's a workflow problem to surface, not paper over)
- Delete or rewrite history (subtree pulls add merge commits — keep them)
- Touch `/conference/` (this skill only updates `core/`)
