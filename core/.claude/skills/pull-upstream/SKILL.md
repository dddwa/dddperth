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

First check the `ours` merge driver is configured:

```bash
git config --get merge.ours.driver
```

If that prints nothing, run `git config merge.ours.driver true` before
pulling. `ours` is *not* a built-in low-level merge driver, so without it the
`merge=ours` rules in `.gitattributes` are silently ignored and
`core/conference-stub/**` and `core/nx.json` conflict anyway. The setting
lives in `.git/config` and isn't committed, so a fresh clone always needs it.

```bash
git subtree pull --prefix=core ddd-core main --squash
```

This either succeeds cleanly or leaves the repo in a mid-merge state with conflicts.

### 5. Handle conflicts

```bash
git status --short | grep '^UU\|^AA\|^DD' || echo "No conflicts"
```

For each conflict:

- **Inside `core/conference-stub/`, or `core/nx.json`**: the `.gitattributes` `merge=ours` rule auto-resolves these *provided `merge.ours.driver` is set* (see step 4). If one slips through, take ours — the fork's unchanged version for the stub, and the deletion for `nx.json`. The stub is irrelevant in a fork.
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

### 6b. Verify the subtree split trailer survived

```bash
git log --format=%B origin/main..HEAD | grep "git-subtree-split" | head -1
```

This must print a `git-subtree-split: <sha>` line matching the upstream commit
just pulled. `git subtree pull --squash` writes it onto the squash commit, and
the *next* pull scans history for the most recent one to find its starting
point. Upstream's individual commits never exist in the fork, so this trailer
is the only record of where the fork last synced to.

Also check `main`, which is where the damage accumulates:

```bash
git log --format=%B origin/main | grep -c "git-subtree-split"
```

Expect one occurrence per pull that has landed, plus one for the original
subtree add. Fewer means a pull was squash-merged and `main` has lost its sync
point — see step 7.

### 7. Report

Summarise:
- Number of upstream commits pulled
- Whether there were conflicts (and where)
- Whether the build passed
- That the `git-subtree-split` trailer is present (step 6b)
- Suggested next step: push the branch and open a PR

**If the fork reviews changes via PR, tell the user — in the report and in the
PR description — that this PR must NOT be squash-merged.** Use "Create a merge
commit" or "Rebase and merge".

A GitHub squash merge rewrites the commit message and destroys the
`git-subtree-split` trailer. Git then falls back to the oldest surviving one
(usually the original subtree add) and replays that entire range on every
subsequent pull. The replayed range grows as upstream moves on, and replaying
already-applied changes onto a diverged tree is how spurious conflicts get
manufactured.

If it has already been squashed, the recovery is to re-run the pull on a fresh
branch off `main` and merge *that* with a real merge commit — the pull writes a
correct trailer.

## What this skill must NOT do

- Push to the fork's remote (the user decides when changes go live)
- Resolve `core/` conflicts automatically when the fork has edited core (that's a workflow problem to surface, not paper over)
- Delete or rewrite history (subtree pulls add merge commits — keep them)
- Touch `/conference/` (this skill only updates `core/`)
