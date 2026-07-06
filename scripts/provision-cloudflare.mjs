#!/usr/bin/env node

/**
 * Idempotent Cloudflare + GitHub provisioning for DDD Perth.
 *
 * Creates D1 databases for staging and production (if missing), patches
 * website/wrangler.jsonc with their IDs, and (optionally) writes the
 * Cloudflare account ID + API token into the GitHub repository so the
 * deploy workflows can use them.
 *
 * Required env:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN   (token must allow D1:Edit + Workers Scripts:Edit)
 *
 * Optional env:
 *   GITHUB_REPO            default "dddwa/dddperth"
 *   SKIP_GITHUB=1          to skip writing GitHub vars/secrets
 *
 * Usage:
 *   node scripts/provision-cloudflare.mjs
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '..')
const wranglerPath = join(repoRoot, 'website/wrangler.jsonc')

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
}
const log = {
    info: (m) => console.log(`${colors.blue}[INFO]${colors.reset} ${m}`),
    success: (m) => console.log(`${colors.green}[OK]${colors.reset} ${m}`),
    warn: (m) => console.log(`${colors.yellow}[WARN]${colors.reset} ${m}`),
    error: (m) => console.error(`${colors.red}[ERROR]${colors.reset} ${m}`),
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO || 'dddwa/dddperth'
const SKIP_GITHUB = process.env.SKIP_GITHUB === '1'

if (!ACCOUNT_ID || !API_TOKEN) {
    log.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set')
    process.exit(1)
}

const DATABASES = [
    { env: 'staging', name: 'dddperth-voting-staging' },
    { env: 'production', name: 'dddperth-voting-prod' },
]

async function cf(path, init = {}) {
    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    })
    const body = await res.json()
    if (!res.ok || body.success === false) {
        const errs = (body.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ')
        throw new Error(`Cloudflare API ${res.status} on ${path}: ${errs || JSON.stringify(body)}`)
    }
    return body.result
}

async function findDatabase(name) {
    // The list endpoint is paginated; the name filter limits to a small set.
    const result = await cf(`/accounts/${ACCOUNT_ID}/d1/database?name=${encodeURIComponent(name)}&per_page=50`)
    return result.find((db) => db.name === name) || null
}

async function ensureDatabase(name) {
    const existing = await findDatabase(name)
    if (existing) {
        log.info(`D1 database ${name} already exists (${existing.uuid})`)
        return existing.uuid
    }
    log.info(`Creating D1 database ${name}`)
    const created = await cf(`/accounts/${ACCOUNT_ID}/d1/database`, {
        method: 'POST',
        body: JSON.stringify({ name }),
    })
    log.success(`Created D1 database ${name} (${created.uuid})`)
    return created.uuid
}

function patchWranglerConfig(ids) {
    let contents = readFileSync(wranglerPath, 'utf8')
    let changed = false

    for (const { env, name } of DATABASES) {
        const id = ids[env]
        // Match the database_id line that follows the matching database_name.
        // Tolerant of whitespace variations but assumes the file's current shape.
        const pattern = new RegExp(
            `("database_name":\\s*"${escapeRegex(name)}"[\\s\\S]*?"database_id":\\s*)"[^"]*"`,
            'm',
        )
        if (!pattern.test(contents)) {
            log.warn(`Could not find database_id slot for ${name} in wrangler.jsonc — leaving file untouched`)
            continue
        }
        const next = contents.replace(pattern, `$1"${id}"`)
        if (next !== contents) {
            contents = next
            changed = true
            log.success(`Patched wrangler.jsonc: ${name} -> ${id}`)
        }
    }

    if (changed) {
        writeFileSync(wranglerPath, contents)
    } else {
        log.info('wrangler.jsonc already up to date')
    }
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ghAvailable() {
    const r = spawnSync('gh', ['--version'], { stdio: 'ignore' })
    return r.status === 0
}

function gh(args, opts = {}) {
    const r = spawnSync('gh', args, { stdio: 'pipe', encoding: 'utf8', ...opts })
    if (r.status !== 0) {
        throw new Error(`gh ${args.join(' ')} failed: ${r.stderr || r.stdout}`)
    }
    return r.stdout
}

function ghSetVariable(name, value) {
    // `gh variable set` is upsert.
    spawnSync('gh', ['variable', 'set', name, '--repo', GITHUB_REPO, '--body', value], {
        stdio: 'inherit',
    })
}

function ghEnsureEnvironment(env) {
    // Create the environment if it doesn't exist. The REST API is idempotent (PUT).
    try {
        gh([
            'api',
            '--method',
            'PUT',
            '-H',
            'Accept: application/vnd.github+json',
            `repos/${GITHUB_REPO}/environments/${env}`,
        ])
        log.info(`Ensured GitHub environment '${env}' exists`)
    } catch (err) {
        log.warn(`Could not ensure environment '${env}': ${err.message}`)
    }
}

function ghSetEnvSecret(env, name, value) {
    // `gh secret set` with --env upserts the secret in that environment.
    const r = spawnSync('gh', ['secret', 'set', name, '--env', env, '--repo', GITHUB_REPO, '--body', value], {
        stdio: 'inherit',
    })
    if (r.status !== 0) {
        throw new Error(`Failed to set ${name} on environment ${env}`)
    }
}

async function main() {
    log.info(`Account: ${ACCOUNT_ID}`)
    log.info(`Repo:    ${GITHUB_REPO}`)

    const ids = {}
    for (const { env, name } of DATABASES) {
        ids[env] = await ensureDatabase(name)
    }

    patchWranglerConfig(ids)

    if (SKIP_GITHUB) {
        log.info('SKIP_GITHUB=1, skipping GitHub configuration')
        return
    }

    if (!ghAvailable()) {
        log.warn('gh CLI not found; skipping GitHub configuration. Install from https://cli.github.com/')
        return
    }

    log.info('Configuring GitHub repository variables and environment secrets')
    ghSetVariable('CLOUDFLARE_ACCOUNT_ID', ACCOUNT_ID)

    for (const env of ['staging', 'production']) {
        ghEnsureEnvironment(env)
        ghSetEnvSecret(env, 'CLOUDFLARE_API_TOKEN', API_TOKEN)
    }

    log.success('Done. Commit the updated website/wrangler.jsonc.')
}

main().catch((err) => {
    log.error(err.message)
    process.exit(1)
})
