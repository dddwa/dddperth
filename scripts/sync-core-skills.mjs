#!/usr/bin/env node
/**
 * Copies core's Claude skills from the subtree into the fork's `.claude/`.
 *
 * The skills that describe this layout (`/new-conference`, `/pull-upstream`)
 * are authored in ddd-core and travel down with the subtree as
 * `core/.claude/skills/`. But Claude Code only reads `.claude/skills/` at the
 * repo root, so the copies it actually loads were snapshots taken whenever the
 * fork was created and never updated again.
 *
 * That gap is silent and it bites: ddd-core added a step to `/pull-upstream`
 * requiring the subtree-split trailer be verified and the PR marked
 * do-not-squash — guidance that exists precisely because squash-merging a
 * subtree pull corrupts future pulls. The fork's copy was 50 lines behind and
 * had none of it, so the skill ran without those checks.
 *
 * Nothing is fetched here: `git subtree pull` has already put the current
 * skills in `core/.claude/skills/`. This only copies them up to where they're
 * read, so a pull that updates the skills updates the ones in effect.
 *
 * Runs from `prepare` (so `pnpm i` picks up skills after a pull) and is safe
 * to run directly:
 *
 *   node scripts/sync-core-skills.mjs           # copy, report what changed
 *   node scripts/sync-core-skills.mjs --check   # report only, exit 1 if stale
 */
import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(repoRoot, 'core', '.claude', 'skills')
const target = path.join(repoRoot, '.claude', 'skills')
const checkOnly = process.argv.includes('--check')

/** Relative paths of every file under `dir`, or [] when it doesn't exist. */
async function filesUnder(dir) {
  const found = []
  async function walk(current) {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) found.push(path.relative(dir, full))
    }
  }
  await walk(dir)
  return found
}

async function sameContent(a, b) {
  try {
    const [left, right] = await Promise.all([readFile(a), readFile(b)])
    return left.equals(right)
  } catch {
    return false
  }
}

// A fork without the subtree (or a core checkout, where this script is not
// used) has nothing to sync. Not an error — just nothing to do.
try {
  const info = await stat(source)
  if (!info.isDirectory()) throw new Error('not a directory')
} catch {
  process.exit(0)
}

const sourceFiles = await filesUnder(source)
const targetFiles = await filesUnder(target)

const changed = []
for (const file of sourceFiles) {
  if (!(await sameContent(path.join(source, file), path.join(target, file)))) {
    changed.push(file)
  }
}
// Skills deleted or renamed upstream must not linger in the fork, where they
// would keep being loaded long after core stopped shipping them.
const removed = targetFiles.filter((file) => !sourceFiles.includes(file))

if (changed.length === 0 && removed.length === 0) {
  if (!checkOnly) console.log('Claude skills already match core.')
  process.exit(0)
}

const describe = () => {
  for (const file of changed) console.log(`  updated  ${file}`)
  for (const file of removed) console.log(`  removed  ${file}`)
}

if (checkOnly) {
  console.error('Claude skills are out of sync with core/.claude/skills:')
  describe()
  console.error('\nRun `pnpm sync-skills` to update them.')
  process.exit(1)
}

for (const file of removed) {
  await rm(path.join(target, file), { force: true })
}
for (const file of changed) {
  const to = path.join(target, file)
  await mkdir(path.dirname(to), { recursive: true })
  await cp(path.join(source, file), to)
}

console.log('Synced Claude skills from core:')
describe()
