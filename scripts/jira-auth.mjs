#!/usr/bin/env node
/**
 * Sets up Jira credentials for the sponsor portal.
 *
 *   pnpm jira:auth                      # validate + save to core/website/.dev.vars (local dev)
 *   pnpm jira:auth --full-sync          # local dev, but sync the REAL sponsor JQL (no portal-test scoping)
 *   pnpm jira:auth --secrets staging    # validate + push as wrangler secrets to an environment
 *   pnpm jira:auth --secrets production
 *
 * Local setup defaults to a JQL scoped to issues labelled "portal-test", so a
 * local sync can only ever see test issues on the real board — real sponsors
 * never end up in your local database and write-back can't touch real issues.
 *
 * Create a token at https://id.atlassian.com/manage-profile/security/api-tokens
 * (use the committee service account for staging/production secrets; your own
 * account is fine for local dev). Classic and scoped API tokens both work:
 * scoped tokens (pick Jira, scopes read:jira-work + write:jira-work) only
 * authenticate via the api.atlassian.com gateway — this script detects that
 * and persists the right API base automatically.
 */

import { spawnSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..')
const DEV_VARS_PATH = path.join(ROOT_DIR, 'core', 'website', '.dev.vars')
const PORTAL_CONFIG_PATH = path.join(ROOT_DIR, 'conference', 'config', 'sponsor-portal.ts')

const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', reset: '\x1b[0m' }
const print = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
}

// --------------------------------------------------------------------------
// CLI args
// --------------------------------------------------------------------------

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  pnpm jira:auth                      Save validated credentials to core/website/.dev.vars
  pnpm jira:auth --full-sync          Local dev against the real sponsor JQL (skips portal-test scoping)
  pnpm jira:auth --secrets <env>      Push credentials as wrangler secrets (staging | production)

Credentials can also be supplied non-interactively:
  JIRA_AUTH_EMAIL=you@example.com JIRA_AUTH_TOKEN=... JIRA_AUTH_EXPIRES=2027-07-01 pnpm jira:auth`)
    process.exit(0)
}

const secretsEnvIndex = args.indexOf('--secrets')
const secretsEnv = secretsEnvIndex === -1 ? null : args[secretsEnvIndex + 1]
if (secretsEnvIndex !== -1 && !['staging', 'production'].includes(secretsEnv)) {
    print.error('--secrets requires an environment: staging | production')
    process.exit(1)
}
const fullSync = args.includes('--full-sync')

const TOKEN_URL = 'https://id.atlassian.com/manage-profile/security/api-tokens'

// --------------------------------------------------------------------------
// Portal config (baseUrl / project key / jql) from the fork's config file
// --------------------------------------------------------------------------

async function readPortalConfig() {
    const source = await fs.readFile(PORTAL_CONFIG_PATH, 'utf-8')
    const baseUrl = source.match(/baseUrl\s*:\s*'([^']+)'/)?.[1]
    const projectKey = source.match(/projectKey\s*:\s*'([^']+)'/)?.[1]
    const jql = source.match(/jql\s*:\s*'([^']+)'/)?.[1]
    const year = source.match(/year\s*:\s*'([^']+)'/)?.[1]
    if (!baseUrl || !projectKey || !jql || !year) {
        throw new Error(`Could not parse baseUrl/projectKey/jql/year from ${PORTAL_CONFIG_PATH}`)
    }
    return { baseUrl, projectKey, jql, year }
}

const TEST_JQL = (projectKey) => `project = ${projectKey} AND issuetype = Sponsor AND labels = "portal-test"`

// --------------------------------------------------------------------------
// Prompts
// --------------------------------------------------------------------------

// One shared, queue-based readline. A per-question interface (or bare
// rl.question) drops lines that arrive between questions — piped input like
// `printf 'y\ny\n' | jira-auth` loses every answer after the first. Lines
// are queued as they arrive; prompts consume the queue first. On EOF,
// pending prompts resolve with '' so defaults apply.
let rl = null
let rlClosed = false
let rlSuspended = false
const lineQueue = []
let pendingPrompt = null

function ensureRl() {
    if (rl || rlClosed) return
    rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.on('line', (line) => {
        if (pendingPrompt) {
            const resolve = pendingPrompt
            pendingPrompt = null
            resolve(line.trim())
        } else {
            lineQueue.push(line)
        }
    })
    rl.on('close', () => {
        if (rlSuspended) return // deliberate suspension, not EOF
        rlClosed = true
        if (pendingPrompt) {
            const resolve = pendingPrompt
            pendingPrompt = null
            process.stdout.write('\n')
            resolve('')
        }
    })
}

/**
 * Detaches readline so raw-mode input (the masked token prompt) is the only
 * stdin consumer. Left attached, readline would echo the token back AND
 * buffer it as the next prompt's answer. ensureRl() reattaches afterwards.
 */
function suspendPrompts() {
    if (!rl) return
    rlSuspended = true
    rl.close()
    rl = null
    rlSuspended = false
}

function prompt(question) {
    ensureRl()
    process.stdout.write(question)
    if (lineQueue.length > 0) {
        const line = lineQueue.shift()
        process.stdout.write('\n')
        return Promise.resolve(line.trim())
    }
    if (rlClosed) {
        process.stdout.write('\n')
        return Promise.resolve('')
    }
    return new Promise((resolve) => {
        pendingPrompt = resolve
    })
}

function closePrompts() {
    pendingPrompt = null
    if (rl && !rlClosed) rl.close()
    rl = null
}

// Masked input for the API token — chars aren't echoed.
function promptHidden(question) {
    // Piped input: readline already consumed stdin into the queue, so take
    // the next line from there (no masking needed — nothing echoes anyway).
    if (lineQueue.length > 0) {
        process.stdout.write(question + '\n')
        return Promise.resolve(lineQueue.shift().trim())
    }
    if (rlClosed) {
        process.stdout.write(question + '\n')
        return Promise.resolve('')
    }

    // Detach readline first — left attached it would echo the token back
    // AND buffer it as the next prompt's answer. ensureRl() reattaches on
    // the next prompt() call.
    suspendPrompts()
    return new Promise((resolve) => {
        process.stdout.write(question)
        const { stdin } = process
        const wasRaw = stdin.isRaw
        if (stdin.isTTY) stdin.setRawMode(true)
        stdin.resume()

        let value = ''
        const finish = () => {
            stdin.removeListener('data', onData)
            stdin.removeListener('end', onEnd)
            if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false)
            stdin.pause()
            process.stdout.write('\n')
            resolve(value.trim())
        }
        const onEnd = () => finish()
        const onData = (chunk) => {
            const text = chunk.toString('utf-8')
            for (let i = 0; i < text.length; i++) {
                const char = text[i]
                if (char === '\n' || char === '\r' || char === '\u0004') {
                    // A newline mid-chunk (more characters follow) is a
                    // wrapped-paste artifact, not the user pressing Enter —
                    // keep reading. Only a trailing newline submits.
                    if (i < text.length - 1) continue
                    finish()
                    return
                }
                if (char === '\u0003') {
                    // Ctrl-C
                    process.stdout.write('\n')
                    process.exit(130)
                }
                if (char === '\u007f' || char === '\b') {
                    value = value.slice(0, -1)
                    continue
                }
                value += char
            }
        }
        stdin.on('data', onData)
        stdin.on('end', onEnd)
    })
}

// --------------------------------------------------------------------------
// Jira validation
// --------------------------------------------------------------------------

// Scoped API tokens only authenticate through the api.atlassian.com gateway
// (https://api.atlassian.com/ex/jira/<cloudId>/...), never the site URL.
// Classic tokens use the site URL. Overridable for tests.
const GATEWAY_ORIGIN = process.env.JIRA_GATEWAY_ORIGIN || 'https://api.atlassian.com'

async function jiraGet(baseUrl, auth, pathName) {
    const response = await fetch(joinUrl(baseUrl, pathName), {
        headers: { Authorization: auth, Accept: 'application/json' },
    })
    return response
}

// new URL(path, base) drops the base's path — fatal for the gateway base
// (…/ex/jira/<cloudId>). Join manually instead.
function joinUrl(baseUrl, pathName) {
    return `${baseUrl.replace(/\/$/, '')}${pathName}`
}

/**
 * Figures out which API base this token authenticates against:
 *   - classic token → the site URL (returns { apiBaseUrl: null })
 *   - scoped token  → the api.atlassian.com gateway for the site's cloudId
 * Returns null (having printed why) when neither works.
 *
 * Probing is trickier than it looks:
 *   - The probe endpoint is the sponsors project, NOT /myself — /myself
 *     needs read:jira-user, which the cheat sheet deliberately omits.
 *   - A scoped token against the site URL is treated as ANONYMOUS, not
 *     rejected: private projects then 404 (Jira hides their existence). So
 *     any non-success on the site URL must fall through to the gateway.
 *   - The gateway reports missing scopes as 401 "scope does not match" —
 *     only the response body distinguishes that from bad credentials.
 */
async function resolveApiBase(siteBaseUrl, auth, projectKey) {
    const probePath = `/rest/api/3/project/${encodeURIComponent(projectKey)}`

    const site = await jiraGet(siteBaseUrl, auth, probePath)
    if (site.ok) {
        return { apiBaseUrl: null, effectiveBase: siteBaseUrl, probe: site }
    }

    print.info(`Site URL probe returned ${site.status} — retrying via the api.atlassian.com gateway…`)
    const tenantInfo = await fetch(joinUrl(siteBaseUrl, '/_edge/tenant_info'))
    if (!tenantInfo.ok) {
        print.error(`Could not resolve the site's cloudId (${tenantInfo.status}) to try the scoped-token gateway.`)
        return null
    }
    const { cloudId } = await tenantInfo.json()
    const gatewayBase = `${GATEWAY_ORIGIN}/ex/jira/${cloudId}`

    const gateway = await jiraGet(gatewayBase, auth, probePath)
    if (gateway.ok) {
        print.success('Scoped API token detected — using the api.atlassian.com gateway.')
        return { apiBaseUrl: gatewayBase, effectiveBase: gatewayBase, probe: gateway }
    }

    if (gateway.status === 401) {
        const body = await gateway.text().catch(() => '')
        if (/scope/i.test(body)) {
            print.error('The token authenticated but is MISSING the read:jira-work scope —')
            print.error(`the gateway reports missing scopes as 401 ("${body.slice(0, 100).trim()}").`)
            print.error('Recreate the token with the "Scope type" filter set to CLASSIC and tick')
            print.error('read:jira-work + write:jira-work (scopes cannot be edited after creation).')
        } else {
            print.error(
                `Authentication failed on both bases (site URL: ${site.status}, gateway: 401).`,
            )
            print.error('Check: (1) the token was pasted fully, (2) the email is the Atlassian account')
            print.error('that created the token, (3) the token hasn\'t been revoked or expired.')
        }
        return null
    }

    // Authenticated on the gateway but can't reach the project — Jira 404s
    // for both "doesn't exist" and "no Browse permission". Show what the
    // token CAN see so the fix is obvious.
    print.error(
        `Token authenticated but can't access project ${projectKey} ` +
            `(gateway: ${gateway.status}, site URL: ${site.status}).`,
    )
    await reportVisibleProjects(gatewayBase, auth, projectKey)
    return null
}

/** Best-effort diagnostic when the project probe fails post-auth. */
async function reportVisibleProjects(base, auth, projectKey) {
    try {
        const response = await jiraGet(base, auth, '/rest/api/3/project/search?maxResults=15')
        if (!response.ok) {
            print.error(`(Could not list visible projects either — ${response.status}.)`)
            return
        }
        const body = await response.json()
        const keys = (body.values ?? []).map((p) => p.key)
        if (keys.length === 0) {
            print.error('The token can see NO projects at all — is this account a member of the Jira site,')
            print.error(`with Browse permission on ${projectKey}?`)
        } else {
            print.error(`The token CAN see: ${keys.join(', ')} — so auth works; grant the account`)
            print.error(`Browse permission on ${projectKey} (or check the project key in conference/config/sponsor-portal.ts).`)
        }
    } catch {
        /* diagnostic only */
    }
}

async function validateCredentials({ baseUrl, projectKey }, email, token, jqlToTest) {
    const auth = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`

    // 1. Which API base does this token authenticate against? The probe is
    //    the sponsors project itself, so success proves auth + project
    //    access in one call.
    const resolved = await resolveApiBase(baseUrl, auth, projectKey)
    if (!resolved) return null
    const { effectiveBase, apiBaseUrl, probe } = resolved

    const projectBody = await probe.json()
    print.success(`Authenticated — project access OK: ${projectKey} (${projectBody.name})`)

    // 3. Dry-run the sync JQL
    const search = await fetch(joinUrl(effectiveBase, '/rest/api/3/search/jql'), {
        method: 'POST',
        headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: jqlToTest, fields: ['summary'], maxResults: 100 }),
    })
    if (!search.ok) {
        const body = await search.text().catch(() => '')
        print.error(`Sync JQL failed (${search.status}): ${body.slice(0, 200)}`)
        return null
    }
    const results = await search.json()
    const count = results.issues?.length ?? 0
    print.success(`Sync JQL matches ${count}${results.isLast === false ? '+' : ''} issue(s):`)
    print.info(`  ${jqlToTest}`)
    for (const issue of (results.issues ?? []).slice(0, 5)) {
        print.info(`  - ${issue.key}: ${issue.fields?.summary ?? ''}`)
    }
    if (count === 0) {
        print.warning('No issues match yet — create a Sponsor issue with the expected label to test the sync.')
    }
    return { apiBaseUrl }
}

// --------------------------------------------------------------------------
// .dev.vars editing — upsert keys, preserve everything else
// --------------------------------------------------------------------------

async function upsertDevVars(updates, removals = []) {
    let content = ''
    try {
        content = await fs.readFile(DEV_VARS_PATH, 'utf-8')
    } catch {
        // No .dev.vars yet — we'll create it.
    }

    const lines = content.split('\n')
    const handled = new Set()
    const result = []

    for (const line of lines) {
        const key = line.match(/^([A-Z0-9_]+)\s*=/)?.[1]
        if (key && key in updates) {
            result.push(`${key}=${updates[key]}`)
            handled.add(key)
        } else if (key && removals.includes(key)) {
            // drop the line
        } else {
            result.push(line)
        }
    }

    // Trim trailing blank lines, then append any new keys
    while (result.length > 0 && result[result.length - 1].trim() === '') result.pop()
    for (const [key, value] of Object.entries(updates)) {
        if (!handled.has(key)) result.push(`${key}=${value}`)
    }

    await fs.writeFile(DEV_VARS_PATH, result.join('\n') + '\n')
}

// --------------------------------------------------------------------------
// Main flows
// --------------------------------------------------------------------------

/**
 * The Atlassian token dialog can't be pre-filled (no deep-link support), so
 * the next best thing: a copy-paste cheat sheet, the suggested name on the
 * clipboard, and an offer to open the page. Suggested expiry is the 1-year
 * maximum — the expiry prompt later defaults to this same date, so following
 * the cheat sheet means just pressing Enter there.
 */
function suggestedTokenDetails(portalConfig) {
    const site = new URL(portalConfig.baseUrl).hostname.split('.')[0]
    const name = `${site}-sponsor-portal-${secretsEnv ?? 'local'}`
    const expiry = new Date(Date.now() + 364 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return { name, expiry }
}

async function showTokenCheatSheet(portalConfig) {
    const { name, expiry } = suggestedTokenDetails(portalConfig)
    if (process.env.JIRA_AUTH_TOKEN) return { name, expiry } // non-interactive — nothing to create

    console.log('')
    print.info('Create the token with these values (copy-paste cheat sheet):')
    print.info(`    Name:    ${name}`)
    print.info(`    Expiry:  ${expiry}   (the 1-year maximum)`)
    print.info('    Type:    "Create API token with scopes" → app: Jira')
    print.info('    Scopes:  set the "Scope type" filter to CLASSIC, then tick:')
    print.info('                 read:jira-work    (search + read sponsor issues)')
    print.info('                 write:jira-work   (tick the completion checkbox)')
    print.info('             Classic, not granular — granular needs several scopes per')
    print.info('             endpoint (read:issue:jira, read:project:jira, read:jql:jira,')
    print.info('             write:issue:jira, …) and is easy to under-scope.')

    if (process.platform === 'darwin') {
        try {
            const copied = spawnSync('pbcopy', { input: name })
            if (copied.status === 0) print.info(`    (suggested name copied to your clipboard)`)
        } catch {
            /* clipboard is a nicety only */
        }
    }

    const answer = await prompt(`Open ${TOKEN_URL} in your browser? [Y/n] `)
    if (answer === '' || /^y/i.test(answer)) {
        const opener = process.platform === 'darwin' ? 'open' : 'xdg-open'
        try {
            spawnSync(opener, [TOKEN_URL], { stdio: 'ignore' })
        } catch {
            print.info(`Open it manually: ${TOKEN_URL}`)
        }
    }
    console.log('')
    return { name, expiry }
}

/**
 * Strips what terminals smuggle into a raw-mode paste: bracketed-paste
 * markers and other ANSI escape sequences (invisible, but 401-fatal if they
 * end up inside the token) plus stray whitespace from wrapped lines.
 */
function sanitizeToken(raw) {
    return raw.replace(/\u001b\[[0-9;?]*[A-Za-z~]/g, '').replace(/\s+/g, '')
}

async function collectCredentials() {
    const email = process.env.JIRA_AUTH_EMAIL || (await prompt('Atlassian account email (the account that created the token): '))
    if (!email) {
        print.error('Email is required.')
        process.exit(1)
    }
    if (process.env.JIRA_AUTH_TOKEN) {
        return { email, token: sanitizeToken(process.env.JIRA_AUTH_TOKEN) }
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        const token = sanitizeToken(await promptHidden('API token (paste, then Enter — input hidden): '))
        if (token.length >= 20) {
            // Length + prefix are safe to show (every Atlassian token starts
            // with the same public prefix) and confirm the paste registered.
            print.info(`Token read: ${token.length} characters, starting "${token.slice(0, 5)}…"`)
            return { email, token }
        }
        print.warning(
            token.length === 0
                ? 'Nothing was read — the paste may not have registered in this terminal. Try again.'
                : `Only ${token.length} characters read — that's too short for an API token. Try pasting again.`,
        )
    }
    print.error('Could not read the token after 3 attempts.')
    print.error('Non-interactive alternative: JIRA_AUTH_TOKEN=<token> pnpm jira:auth')
    process.exit(1)
}

async function collectExpiryDate(suggestedExpiry) {
    // Non-interactive: creds came from env vars, so the expiry does too.
    if (process.env.JIRA_AUTH_TOKEN) {
        const value = process.env.JIRA_AUTH_EXPIRES ?? ''
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return acceptExpiry(value)
        if (value && !/^(skip|none)$/i.test(value)) {
            print.warning(`JIRA_AUTH_EXPIRES="${value}" isn't YYYY-MM-DD — recording no expiry.`)
        }
        return acceptExpiry(null)
    }

    while (true) {
        const answer = await prompt(
            `Token expiry date (Enter = ${suggestedExpiry} from the cheat sheet, or YYYY-MM-DD, or "skip"): `,
        )
        if (answer === '') return acceptExpiry(suggestedExpiry)
        if (/^(skip|none)$/i.test(answer)) return acceptExpiry(null)
        if (/^\d{4}-\d{2}-\d{2}$/.test(answer) && !Number.isNaN(Date.parse(`${answer}T00:00:00Z`))) {
            return acceptExpiry(answer)
        }
        print.error(`"${answer}" isn't a valid YYYY-MM-DD date, try again (or "skip").`)
    }
}

function acceptExpiry(expiry) {
    if (!expiry) {
        print.warning('No expiry recorded — the committee will get no reminder before the token dies.')
        return null
    }
    const daysLeft = Math.ceil((Date.parse(`${expiry}T23:59:59Z`) - Date.now()) / 86400000)
    if (daysLeft <= 0) {
        print.warning(`${expiry} is in the past — double-check the token you just created.`)
    } else {
        print.success(`Expiry recorded: ${expiry} (${daysLeft} days). Reminders go out at 30/14/7/1 days.`)
    }
    return expiry
}

async function main() {
    const portalConfig = await readPortalConfig()
    print.info(`Jira site: ${portalConfig.baseUrl} (project ${portalConfig.projectKey})`)

    const suggested = await showTokenCheatSheet(portalConfig)
    const { email, token } = await collectCredentials()

    const localJql = fullSync
        ? portalConfig.jql.replaceAll('{year}', portalConfig.year)
        : TEST_JQL(portalConfig.projectKey)

    // For --secrets, validate with the JQL that environment will actually run.
    const stagingJqlMatch = secretsEnv === 'staging' ? await readStagingJql() : null
    const jqlToTest = secretsEnv
        ? (stagingJqlMatch ?? portalConfig.jql.replaceAll('{year}', portalConfig.year))
        : localJql

    const validated = await validateCredentials(portalConfig, email, token, jqlToTest)
    if (!validated) {
        print.error('Nothing saved.')
        process.exit(1)
    }

    // Atlassian shows the expiry when the token is created but never exposes
    // it via API — capture it here so the worker can email the committee
    // before the token dies (reminders at 30/14/7/1 days and on expiry).
    const expiry = await collectExpiryDate(suggested.expiry)

    if (secretsEnv) {
        await pushSecrets(secretsEnv, email, token, validated.apiBaseUrl ?? portalConfig.baseUrl, expiry)
        return
    }

    // ---- Local .dev.vars flow ----
    const updates = { JIRA_API_EMAIL: email, JIRA_API_TOKEN: token }
    const removals = []

    // Scoped tokens need the gateway base; classic tokens must NOT keep a
    // stale gateway entry from a previous scoped setup.
    if (validated.apiBaseUrl) {
        updates.JIRA_API_BASE_URL = validated.apiBaseUrl
    } else {
        removals.push('JIRA_API_BASE_URL')
    }

    // Same for the expiry: record it, or clear a stale one from an old token.
    if (expiry) {
        updates.JIRA_TOKEN_EXPIRES = expiry
    } else {
        removals.push('JIRA_TOKEN_EXPIRES')
    }

    if (!fullSync) {
        updates.JIRA_SYNC_JQL = TEST_JQL(portalConfig.projectKey)
    } else {
        removals.push('JIRA_SYNC_JQL')
        // Never leave a stale write-back opt-in pointing at the real sponsor
        // list — with full sync, that would tick checkboxes on real issues.
        removals.push('JIRA_WRITEBACK_ENABLED')
        print.warning('Full-sync mode: local sync will pull REAL sponsors and contacts into your local D1.')
        print.warning('Write-back has been disabled locally (it would target real sponsor issues).')
    }

    // Real credentials are pointless while the stub is active.
    let devVars = ''
    try {
        devVars = await fs.readFile(DEV_VARS_PATH, 'utf-8')
    } catch {
        /* fine */
    }
    if (/^JIRA_STUB\s*=\s*true/m.test(devVars)) {
        const answer = await prompt('JIRA_STUB=true is set and would override these credentials. Remove it? [Y/n] ')
        if (answer === '' || /^y/i.test(answer)) removals.push('JIRA_STUB')
        else print.warning('Leaving JIRA_STUB=true — the stub stays active until you remove it.')
    }

    if (!fullSync) {
        const answer = await prompt(
            'Enable Jira write-back locally? Only portal-test issues can be affected. [y/N] ',
        )
        if (/^y/i.test(answer)) updates.JIRA_WRITEBACK_ENABLED = 'true'
    }

    await upsertDevVars(updates, removals)
    print.success(`Saved to ${path.relative(ROOT_DIR, DEV_VARS_PATH)}`)
    if (!fullSync) {
        print.info('Local sync is scoped to issues labelled "portal-test" — real sponsors will never sync locally.')
        print.info('Use --full-sync if you intentionally need the real sponsor list.')
    }
    print.info('Restart the dev server to pick up the new vars, then Admin → Sponsors → Sync now.')
}

async function readStagingJql() {
    try {
        const source = await fs.readFile(path.join(ROOT_DIR, 'conference', 'wrangler', 'staging.jsonc'), 'utf-8')
        return source.match(/"JIRA_SYNC_JQL"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replaceAll('\\"', '"') ?? null
    } catch {
        return null
    }
}

async function pushSecrets(env, email, token, apiBaseUrl, expiry) {
    const configPath = path.join(ROOT_DIR, 'conference', 'wrangler', `${env}.jsonc`)
    // JIRA_API_BASE_URL is pushed even for classic tokens (as the site URL)
    // so switching token types can never leave a stale gateway value behind.
    // Likewise the expiry: 'none' overwrites a stale date when skipped (the
    // worker treats anything unparsable as "no reminders").
    for (const [name, value] of [
        ['JIRA_API_EMAIL', email],
        ['JIRA_API_TOKEN', token],
        ['JIRA_API_BASE_URL', apiBaseUrl],
        ['JIRA_TOKEN_EXPIRES', expiry ?? 'none'],
    ]) {
        print.info(`wrangler secret put ${name} (${env})…`)
        const result = spawnSync('pnpm', ['exec', 'wrangler', 'secret', 'put', name, '-c', configPath], {
            cwd: path.join(ROOT_DIR, 'core', 'website'),
            input: value,
            encoding: 'utf-8',
        })
        if (result.status !== 0) {
            print.error(`Failed to set ${name}: ${result.stderr || result.stdout}`)
            process.exit(1)
        }
        print.success(`${name} set for ${env}`)
    }
    print.info(`Done. Redeploy is not required — secrets apply to the running worker.`)
}

main()
    .then(() => closePrompts())
    .catch((error) => {
        print.error(error.message)
        process.exit(1)
    })
