#!/usr/bin/env node
// Patches build/server/wrangler.json with environment-specific bindings so
// a single env-agnostic build can be deployed to either staging or
// production. The redirect at .wrangler/deploy/config.json points wrangler
// at build/server/wrangler.json; we rewrite the few fields that differ.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const env = process.argv[2]
if (env !== 'staging' && env !== 'production') {
    console.error(`usage: prepare-deploy-config.mjs <staging|production>`)
    process.exit(1)
}

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envConfigPath = resolve(websiteRoot, `wrangler.${env}.jsonc`)
const builtConfigPath = resolve(websiteRoot, 'build/server/wrangler.json')

const stripJsonc = (s) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"])\/\/.*$/gm, '$1')

const envConfig = JSON.parse(stripJsonc(readFileSync(envConfigPath, 'utf8')))
const builtConfig = JSON.parse(readFileSync(builtConfigPath, 'utf8'))

builtConfig.name = envConfig.name
builtConfig.topLevelName = envConfig.name
builtConfig.vars = { ...builtConfig.vars, ...envConfig.vars }
builtConfig.d1_databases = envConfig.d1_databases

writeFileSync(builtConfigPath, JSON.stringify(builtConfig))
console.log(`Patched build/server/wrangler.json for ${env} (worker: ${envConfig.name})`)
