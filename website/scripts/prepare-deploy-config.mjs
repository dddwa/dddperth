#!/usr/bin/env node
// Patches build/server/wrangler.json with environment-specific bindings so
// a single env-agnostic build can be deployed to either staging or
// production. The redirect at .wrangler/deploy/config.json points wrangler
// at build/server/wrangler.json; we rewrite the few fields that differ.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const env = process.argv[2]
if (env !== 'staging' && env !== 'production') {
    console.error(`usage: prepare-deploy-config.mjs <staging|production>`)
    process.exit(1)
}

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Wrangler configs live alongside theme/content/config. Try the most-specific
// location first:
//   - ddd-core standalone:  <repo-root>/conference-stub/wrangler/  (websiteRoot/..)
//   - fork:                 <fork-root>/conference/wrangler/       (websiteRoot/../..)
//                           fork sits at core/website/ so we need to climb two levels
const conferenceCandidates = [
    resolve(websiteRoot, '..', '..', 'conference'),     // fork: /<root>/conference
    resolve(websiteRoot, '..', 'conference'),           // (defensive) sibling /conference
    resolve(websiteRoot, '..', 'conference-stub'),      // standalone: /<root>/conference-stub
]
const conferenceDir = conferenceCandidates.find((p) => existsSync(resolve(p, 'wrangler', `${env}.jsonc`)))
if (!conferenceDir) {
    console.error(`No wrangler/${env}.jsonc found. Tried:\n  ${conferenceCandidates.join('\n  ')}`)
    process.exit(1)
}
const envConfigPath = resolve(conferenceDir, 'wrangler', `${env}.jsonc`)
const builtConfigPath = resolve(websiteRoot, 'build/server/wrangler.json')

const stripJsonc = (s) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"])\/\/.*$/gm, '$1')

const envConfig = JSON.parse(stripJsonc(readFileSync(envConfigPath, 'utf8')))
const builtConfig = JSON.parse(readFileSync(builtConfigPath, 'utf8'))

builtConfig.name = envConfig.name
builtConfig.topLevelName = envConfig.name
builtConfig.vars = { ...builtConfig.vars, ...envConfig.vars }
builtConfig.d1_databases = envConfig.d1_databases
if (envConfig.routes) builtConfig.routes = envConfig.routes

// R2 buckets differ per env (the build bakes in local.jsonc's local bucket
// name); replace or drop to match the env config.
if (envConfig.r2_buckets) {
    builtConfig.r2_buckets = envConfig.r2_buckets
} else {
    delete builtConfig.r2_buckets
}

// Cron triggers are production-only (sponsor sync). Deploying with no
// `triggers` key leaves previously-deployed crons in place, so write an
// explicit empty list to clear them for envs without cron.
builtConfig.triggers = envConfig.triggers ?? { crons: [] }

writeFileSync(builtConfigPath, JSON.stringify(builtConfig))
console.log(`Patched build/server/wrangler.json for ${env} (worker: ${envConfig.name})`)
