#!/usr/bin/env node
/**
 * Resolves the conference's D1 database name for the chosen env and shells out
 * to `wrangler d1 migrations apply`. Letting wrangler hard-code the DB name in
 * project.json would couple core to whichever fork built it; reading the name
 * from /conference/manifest.ts means core works for any fork unchanged.
 *
 * Usage: node scripts/manifest-d1-migrate.mjs <local|staging|production>
 */

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const env = process.argv[2]
if (env !== 'local' && env !== 'staging' && env !== 'production') {
    console.error(`usage: manifest-d1-migrate.mjs <local|staging|production>`)
    process.exit(1)
}

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(websiteRoot, '..')

// Resolve the conference folder. We try /conference first (a fork) and fall
// back to /conference-stub (core standalone).
const manifestCandidates = [
    resolve(repoRoot, 'conference', 'manifest.ts'),
    resolve(repoRoot, 'conference-stub', 'manifest.ts'),
]
const manifestPath = manifestCandidates.find((p) => {
    try {
        readFileSync(p)
        return true
    } catch {
        return false
    }
})
if (!manifestPath) {
    console.error(`No conference manifest found. Tried:\n  ${manifestCandidates.join('\n  ')}`)
    process.exit(1)
}

// We don't import the TS manifest directly (no ts-node here); instead scan it
// for the d1DatabaseName.<env> string. Manifest is hand-written ts so a
// targeted regex is robust enough — and avoids dragging the TS compiler into
// the deploy path.
const source = readFileSync(manifestPath, 'utf8')
const blockMatch = source.match(/d1DatabaseName\s*:\s*\{([^}]+)\}/)
if (!blockMatch) {
    console.error(`Could not locate d1DatabaseName block in ${manifestPath}`)
    process.exit(1)
}
const fieldMatch = blockMatch[1].match(new RegExp(`${env}\\s*:\\s*['\"]([^'\"]+)['\"]`))
if (!fieldMatch) {
    console.error(`Could not find d1DatabaseName.${env} in ${manifestPath}`)
    process.exit(1)
}
const dbName = fieldMatch[1]

const wranglerConfig = resolve(repoRoot, 'conference', 'wrangler', `${env}.jsonc`)
const args = ['wrangler', 'd1', 'migrations', 'apply', dbName, '-c', wranglerConfig]
if (env === 'local') {
    args.push('--local')
} else {
    args.push('--remote')
}

console.log(`Running: pnpm exec ${args.join(' ')}`)
const result = spawnSync('pnpm', ['exec', ...args], {
    stdio: 'inherit',
    cwd: websiteRoot,
})
process.exit(result.status ?? 0)
