---
name: core-push
description: Upstream a change made in a conference fork's core/ back into ddd-core, as a curated PR against ddd-core rather than a raw subtree push. Use when the user wants to push fork work upstream, upstream a merged PR, sync fork changes into core, or run "core-push". Run from inside a fork repo (one with a /core/ git subtree); it writes to a worktree of ddd-core, never to the fork.
---

# core-push

Moves a change that was built inside a fork's `core/` up into `ddd-core`, so every other fork gets it on their next `/core-pull`.

This is the other half of `/core-pull`. The normal cycle is: build the change in the fork (where it can actually be run against real content and tested), push it upstream, then let the forks pull it.

## Why this is a curated PR, not `git subtree push`

`git subtree split --prefix=core` genuinely works — it re-roots the fork's `core/` history so upstream's HEAD is an ancestor, and the result fast-forwards onto `ddd-core/main`. **Do not use it to publish.** The split carries the fork's *entire* `core/` tree, which includes deliberate fork-local divergence that must never reach upstream:

- **Visual regression baselines** (`website/e2e/__screenshots__/`) are rendered with the fork's theme, fonts and sponsor logos. Upstream has its own stub-branded set. A split overwrites 63 upstream baselines with conference-branded screenshots.
- **`nx.json` and `vitest.workspace.ts` are deleted in forks** per the `merge=ours` rule; upstream needs them.
- **`website/project.json`, `website/tsconfig.json`, `website/vite.config.ts`, `e2e/routes.ts`** carry fork-shape overrides applied by `/new-conference`.

So: take the *source* changes, leave the fork's environment behind.

The split is still useful as a **check** — see step 6.

## Workflow

### 1. Identify what's being upstreamed

Usually a merged fork PR. Get its merge commit and the commit before it:

```bash
gh pr view <N> --json title,mergeCommit,state,body
```

Let `AFTER` = the merge commit, `BEFORE` = `<merge>^1`. For uncommitted or
unmerged work, use whatever commit range the user names.

`gh` may fail with a TLS error under a sandbox; it needs the sandbox bypassed.

### 2. Split the change into layers

```bash
git diff --name-status "$BEFORE" "$AFTER"
```

Sort every changed path into one of three buckets:

- **Inside `core/`, not a baseline** → upstream this verbatim.
- **Inside `core/website/e2e/__screenshots__/`** → do NOT copy. Regenerate upstream (step 5).
- **Outside `core/`** → does not transfer directly, but check for an upstream *counterpart*:
  - `conference/content/pages/**` → `conference-stub/content/pages/**`. The stub is the sample conference; if the fork's change made a fixture cover something new, the stub's copy usually needs the same edit.
  - `conference/config/**`, `conference/theme/**` → usually fork-owned, no counterpart. Skip.
  - Root `CLAUDE.md` / `ARCHITECTURE.md` → upstream has its **own** version of these, deliberately different (fork docs describe DDD Perth; core docs describe the shared upstream). Do not copy. If the change added a rule that is genuinely architectural, hand-write the equivalent section in core's file, in core's terser register.

Show the user this classification before writing anything.

### 3. Create a ddd-core worktree

Work in a worktree of ddd-core, never in the fork and never in ddd-core's `main/`:

```bash
grove new core --title "<what this upstreams>" --json
```

If grove isn't available, `git worktree add` off a fresh branch from `origin/main`.

### 4. Apply the source changes

Upstream's copy of each file should be byte-identical to the fork's *pre-change*
version. Verify that first — it's what makes a straight copy safe instead of a
merge:

```bash
# for each file: git rev-parse "$BEFORE:core/<rel>"  ==  <upstream> git rev-parse "HEAD:<rel>"
```

Any mismatch means core and the fork have diverged on that file; stop and show
the user rather than clobbering upstream work.

Then copy the post-change blobs across, stripping the `core/` prefix, and apply
deletions. Note that `core/<rel>` maps to `<rel>` at upstream's root.

Shell traps that will bite here:
- zsh's `noclobber` makes `>` fail on an existing file (`file exists`). `unsetopt noclobber` first.
- A `mise` shell hook can wipe `PATH` inside a loop, so `git`/`mkdir`/`dirname`
  turn into "command not found". Use absolute paths (`/usr/bin/git`) or set
  `PATH=/usr/bin:/bin:/usr/sbin:/sbin` in the loop's shell.
- `git status` printing `error: daemon terminated` is just the blocked fsmonitor
  daemon under a sandbox. Harmless.

### 5. Regenerate upstream's own baselines

If the change alters rendered output at all, upstream's baselines must be
regenerated *in upstream*, against the stub's theme and content:

```bash
pnpm i
pnpm nx d1-migrate-local website   # fresh worktree has an empty .wrangler/state
pnpm vr --update-snapshots
```

`pnpm vr` runs in the pinned Playwright Docker container. Never
`--update-snapshots` on the host — that writes macOS-rendered images CI can't
reproduce. Review the resulting image diff like any other change: baselines that
shift for a reason you can't explain mean the change did something you didn't
intend.

If the change is invisible (pure `srOnly` / ARIA), baselines should come back
**unchanged**, and that is a meaningful signal in the PR description.

### 6. Verify

```bash
pnpm nx test website
pnpm nx lint website
pnpm nx build website
pnpm nx e2e website
```

Cross-check against the subtree split — the split's tree is what the fork
*actually* has, so diffing it against the branch shows exactly what was left
behind, and every remaining difference should be one you can name:

```bash
SPLIT=$(git -C <fork> subtree split --prefix=core "$AFTER" 2>/dev/null | tail -1)
git diff --stat "$SPLIT" HEAD
```

Expect: baselines, `nx.json`, `vitest.workspace.ts`, and the fork-shape config
files. Anything else in that list is something you either forgot to upstream or
shouldn't have.

### 7. Report and hand off

Commit with a message that says which fork PR this came from, push the branch,
and open the PR against ddd-core. Summarise:

- Which files were upstreamed, and which were deliberately left fork-local
- Any counterpart edits hand-written for the stub or core's docs
- Test/build/baseline results
- Which forks should run `/core-pull` afterwards

## After it lands

The originating fork still has its own copy of the change. On its next
`/core-pull` the upstream version arrives and should merge cleanly, because the
content is identical. If it conflicts, the fork and upstream versions have
drifted — resolve toward upstream.

## What this skill must NOT do

- Push to `ddd-core` without the user's say-so, or merge its own PR
- Copy the fork's visual baselines, `nx.json` deletion, or fork-shape config upstream
- Copy the fork's root `CLAUDE.md` / `ARCHITECTURE.md` over core's own
- Modify the fork repo at all (this is a read-only source; all writes go to the ddd-core worktree)
- Use `git subtree push`/`--squash` to publish (see the rationale above)
