// Sponsor operations shared by the web UI and the CLI in add-sponsor.mjs, so
// both write logos, config entries and portal-import records the same way.

import { spawnSync } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import prettier from 'prettier'
import { Project } from 'ts-morph'
import { fileURLToPath } from 'url'
import { attachFilesToIssue, fetchExhibitorRoom, loadJiraSession } from './jira-attach.mjs'
import { processLogo } from './process-logo.mjs'
import { SPONSOR_TIERS } from './sponsor-tiers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..', '..')
export const SPONSORS_DIR = path.join(ROOT_DIR, 'conference', 'public', 'images', 'sponsors')
const YEARS_CONFIG_DIR = path.join(ROOT_DIR, 'conference', 'config', 'years')
// 'local' reads the dev server's D1/R2 state (core/website/.wrangler/state)
// so the whole portal→website loop can be tested without deploying.
export const PORTAL_ENVS = ['local', 'staging', 'production']
const LOCAL_PERSIST_DIR = path.join(ROOT_DIR, 'core', 'website', '.wrangler', 'state')

function portalWranglerLocationArgs(env) {
    return env === 'local' ? ['--local', '--persist-to', LOCAL_PERSIST_DIR] : ['--remote']
}

// Relative path to a year's config file — used for parsing and display messages.
export const yearConfigRelPath = (year) => `conference/config/years/${year}.ts`

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
}

// stderr, so the CLI's stdout carries only its result (e.g. --json output).
export const print = {
    info: (msg) => console.error(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.error(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.error(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
}

// ---------------------------------------------------------------------------
// Portal import: pull sponsor submissions out of the deployed portal's D1/R2
// via wrangler (same shell-out pattern as core/website/scripts/manifest-d1-migrate.mjs)
// and feed them through the existing logo-processing + config-injection flow.
// ---------------------------------------------------------------------------

function portalWranglerConfig(env) {
    return path.join(ROOT_DIR, 'conference', 'wrangler', `${env}.jsonc`)
}

// ---------------------------------------------------------------------------
// Import tracking. A committed sidecar per year records what was approved
// into the config (field values at import time, keyed by Jira issue key).
// The submissions list diffs live portal data against it to flag sponsors
// as new / updated / imported — and re-imports update the existing config
// entry instead of appending a duplicate. Committed to git so the whole
// committee shares the same import state.
// ---------------------------------------------------------------------------

export function portalImportsPath(year) {
    return path.join(YEARS_CONFIG_DIR, `${year}.portal-imports.json`)
}

async function loadPortalImports(year) {
    try {
        return JSON.parse(await fs.readFile(portalImportsPath(year), 'utf-8'))
    } catch {
        return {}
    }
}

export async function recordPortalImport(year, issueKey, record) {
    const all = await loadPortalImports(year)
    all[issueKey] = record
    await fs.writeFile(portalImportsPath(year), JSON.stringify(all, null, 4) + '\n')
}

/** Field-by-field diff of a live submission against its import record.
 * Value comparison (not timestamps) so re-saving identical data in the
 * portal doesn't flag a phantom update. */
function diffSubmission(submission, record) {
    if (!record) return { status: 'new', changes: [] }
    const changes = []
    if ((submission.name || '') !== (record.portalName ?? record.name ?? '')) changes.push('name')
    if ((submission.quote || '') !== (record.blurb || '')) changes.push('blurb')
    if ((submission.website || '') !== (record.websiteUrl || '')) changes.push('website')
    if (JSON.stringify(submission.socials ?? {}) !== JSON.stringify(record.socials ?? {})) changes.push('socials')
    if ((submission.logoR2Key || '') !== (record.logoR2Key || '')) changes.push('logo')
    return { status: changes.length > 0 ? 'updated' : 'imported', changes }
}

// D1 database name for an env, scanned from build-manifest.ts the same way
// the migrate script does (no TS compiler in this script).
async function portalD1Name(env) {
    const source = await fs.readFile(path.join(ROOT_DIR, 'conference', 'build-manifest.ts'), 'utf-8')
    const block = source.match(/d1DatabaseName\s*:\s*\{([^}]+)\}/)
    const field = block && block[1].match(new RegExp(`${env}\\s*:\\s*['"]([^'"]+)['"]`))
    if (!field) throw new Error(`Could not find d1DatabaseName.${env} in conference/build-manifest.ts`)
    return field[1]
}

async function portalBucketName(env) {
    const source = await fs.readFile(portalWranglerConfig(env), 'utf-8')
    const match = source.match(/"bucket_name"\s*:\s*"([^"]+)"/)
    if (!match) throw new Error(`No r2 bucket_name in conference/wrangler/${env}.jsonc`)
    return match[1]
}

// Jira tier value -> YearSponsors tier key, scanned from the fork's
// sponsor-portal config. Unmapped tiers fall back to 'gold' in the UI where
// the committee can correct them before saving.
async function portalTierMap() {
    try {
        const source = await fs.readFile(path.join(ROOT_DIR, 'conference', 'config', 'sponsor-portal.ts'), 'utf-8')
        const block = source.match(/tierMap\s*:\s*\{([^}]+)\}/)
        if (!block) return {}
        const map = {}
        for (const entry of block[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) {
            map[entry[1]] = entry[2]
        }
        return map
    } catch {
        return {}
    }
}

function runWrangler(args) {
    // wrangler is a core/website dependency, so pnpm must resolve it from
    // there (all paths passed in are absolute, cwd only affects resolution).
    const result = spawnSync('pnpm', ['exec', 'wrangler', ...args], {
        cwd: path.join(ROOT_DIR, 'core', 'website'),
        encoding: 'utf-8',
        maxBuffer: 64 * 1024 * 1024,
    })
    if (result.status !== 0) {
        // With --json, wrangler puts the actual error (e.g. expired auth) on
        // stdout while stderr carries only warnings, so report both.
        const output = [result.stderr, result.stdout].filter((text) => text?.trim()).join('\n')
        throw new Error(`wrangler ${args[0]} ${args[1] ?? ''} failed: ${output}`)
    }
    return result.stdout
}

export async function fetchPortalSubmissions(env) {
    const dbName = await portalD1Name(env)
    const sql =
        'SELECT s.issue_key, s.year, s.company_name, s.tier, p.blurb, p.website_url, p.socials_json, ' +
        'p.logo_r2_key, p.logo_filename, p.completed_at, p.updated_at ' +
        'FROM sponsors s LEFT JOIN sponsor_profiles p ON p.issue_key = s.issue_key ' +
        'WHERE s.active = 1 ORDER BY s.company_name'

    const stdout = runWrangler([
        'd1',
        'execute',
        dbName,
        '-c',
        portalWranglerConfig(env),
        ...portalWranglerLocationArgs(env),
        '--json',
        '--command',
        sql,
    ])

    // wrangler --json prints an array of result sets; anything before the
    // JSON (banner noise) is trimmed by finding the first bracket.
    const jsonStart = stdout.indexOf('[')
    if (jsonStart === -1) throw new Error(`Unexpected wrangler output: ${stdout.slice(0, 200)}`)
    const parsed = JSON.parse(stdout.slice(jsonStart))
    const rows = parsed[0]?.results ?? []

    const tierMap = await portalTierMap()
    const importsByYear = new Map()

    const submissions = []
    for (const row of rows) {
        const submission = {
            issueKey: row.issue_key,
            year: row.year,
            name: row.company_name,
            jiraTier: row.tier,
            suggestedTier: tierMap[row.tier] || null,
            quote: row.blurb || '',
            website: row.website_url || '',
            socials: row.socials_json ? JSON.parse(row.socials_json) : {},
            logoR2Key: row.logo_r2_key || null,
            logoFilename: row.logo_filename || null,
            completedAt: row.completed_at || null,
            profileUpdatedAt: row.updated_at || null,
        }

        if (!importsByYear.has(row.year)) {
            importsByYear.set(row.year, await loadPortalImports(row.year))
        }
        const record = importsByYear.get(row.year)[row.issue_key]
        const { status, changes } = diffSubmission(submission, record)
        submission.status = status
        submission.changes = changes
        submission.importedTier = record?.tier || null
        submission.importedName = record?.name || null

        submissions.push(submission)
    }
    return submissions
}

export async function downloadPortalLogo(env, r2Key, filename) {
    const bucket = await portalBucketName(env)
    const tmpFile = path.join(
        await fs.mkdtemp(path.join(os.tmpdir(), 'portal-logo-')),
        path.basename(filename || 'logo'),
    )

    runWrangler([
        'r2',
        'object',
        'get',
        `${bucket}/${r2Key}`,
        '--file',
        tmpFile,
        ...portalWranglerLocationArgs(env),
        '-c',
        portalWranglerConfig(env),
    ])

    const buffer = await fs.readFile(tmpFile)
    await fs.rm(path.dirname(tmpFile), { recursive: true, force: true })
    return buffer
}

// Discover available conference years by scanning the years config directory.
// Returns an array of year strings sorted newest-first (e.g. ['2026', '2025', ...]).
export async function getAvailableYears() {
    try {
        const entries = await fs.readdir(YEARS_CONFIG_DIR)
        return entries
            .filter((name) => /^\d{4}\.ts$/.test(name))
            .map((name) => name.replace(/\.ts$/, ''))
            .sort((a, b) => Number(b) - Number(a))
    } catch (error) {
        print.error(`Failed to read years config directory: ${error.message}`)
        return []
    }
}

// Helper function to read year config
export async function readYearConfig(year) {
    const configPath = path.join(YEARS_CONFIG_DIR, `${year}.ts`)
    try {
        const content = await fs.readFile(configPath, 'utf-8')
        return content
    } catch (error) {
        return null
    }
}

/**
 * Reads a year's sponsors out of its config with ts-morph.
 *
 * Throws rather than falling back to a looser parse. There used to be a
 * regex fallback here, and it returned each sponsor's `name` with `website`
 * and both logo URLs blank. That is worse than failing: the portal import
 * below uses this result to decide whether a sponsor already exists, and a
 * name-only match sends it down the *update* path, writing those blanks back
 * over the real values. A parse failure here means the config is malformed
 * or its shape changed, which is worth surfacing, not papering over.
 *
 * Returns null when the year has no config or declares no sponsors — that is
 * an ordinary "nothing here", not a failure.
 */
export async function getSponsorsByYear(year) {
    const configPath = path.join(YEARS_CONFIG_DIR, `${year}.ts`)

    try {
        const project = new Project()
        const sourceFile = project.addSourceFileAtPath(configPath)

        // Find the conference object
        const conferenceVar = sourceFile.getVariableDeclaration(`conference${year}`)
        if (!conferenceVar) {
            print.warning(`No conference${year} variable found in ${yearConfigRelPath(year)}`)
            return null
        }

        const initializer = conferenceVar.getInitializer()
        if (!initializer || !initializer.getKind()) {
            return null
        }

        // Get the sponsors property
        const sponsorsProperty = initializer.getProperty('sponsors')
        if (!sponsorsProperty) {
            return null
        }

        const sponsors = {}

        // Initialize all tiers
        for (const tier of SPONSOR_TIERS) {
            sponsors[tier] = []
        }

        // Parse each tier
        const sponsorsInit = sponsorsProperty.getInitializer()
        if (sponsorsInit) {
            for (const tier of SPONSOR_TIERS) {
                const tierProperty = sponsorsInit.getProperty(tier)
                if (tierProperty) {
                    const tierArray = tierProperty.getInitializer()
                    if (tierArray && tierArray.getElements) {
                        const elements = tierArray.getElements()

                        sponsors[tier] = elements.map((element) => {
                            const sponsor = {}

                            // Read a string-valued property. getLiteralValue() returns the
                            // *decoded* JS string (handles quotes + escapes like \n), so
                            // multiline quotes don't leak raw control chars into the JSON.
                            const readStringProp = (name) => {
                                const prop = element.getProperty(name)
                                if (!prop) return undefined
                                const init = prop.getInitializer()
                                if (!init) return undefined
                                if (init.getLiteralValue) return init.getLiteralValue()
                                // Fallback for non-literal initializers (e.g. template strings)
                                return init.getText ? init.getText().replace(/['"`]/g, '') : undefined
                            }

                            sponsor.name = readStringProp('name')
                            sponsor.website = readStringProp('website')
                            sponsor.logoUrlDarkMode = readStringProp('logoUrlDarkMode')
                            sponsor.logoUrlLightMode = readStringProp('logoUrlLightMode')

                            const quoteText = readStringProp('quote')
                            if (quoteText !== undefined) {
                                sponsor.quote = quoteText && quoteText !== 'undefined' ? quoteText : ''
                            }

                            return sponsor
                        })
                    }
                }
            }
        }

        return sponsors
    } catch (error) {
        print.error(`Could not parse ${yearConfigRelPath(year)}: ${error.message}`)
        throw error
    }
}

// The config edits below splice text into the tier arrays, which leaves
// indentation wherever the splice put it. Formatting with the repo's own
// Prettier config after each write keeps the diff to the entry itself. The
// indent width lives in .editorconfig, which only the Prettier CLI reads by default.
async function saveFormatted(sourceFile) {
    const filePath = sourceFile.getFilePath()
    const options = (await prettier.resolveConfig(filePath, { editorconfig: true })) ?? {}
    await fs.writeFile(filePath, await prettier.format(sourceFile.getFullText(), { ...options, filepath: filePath }))
}

// Function to automatically add sponsor to TypeScript config file
export async function addSponsorToConfig(year, tier, sponsorObj) {
    try {
        const { Project } = await import('ts-morph')
        const project = new Project()

        const configPath = path.join(YEARS_CONFIG_DIR, `${year}.ts`)

        // Check if config file exists, if not create a basic one
        try {
            await fs.access(configPath)
        } catch {
            throw new Error('Config file does not exist: ' + configPath)
        }

        const sourceFile = project.addSourceFileAtPath(configPath)

        // Find the conference object
        const conferenceVar = sourceFile.getVariableDeclaration(`conference${year}`)
        if (!conferenceVar) {
            print.error(`Could not find conference${year} variable in config`)
            return false
        }

        const initializer = conferenceVar.getInitializer()
        if (!initializer || !initializer.getKind) {
            print.error('Could not find conference initializer')
            return false
        }

        // Find the sponsors property
        let sponsorsProperty = null
        if (initializer.getKindName() === 'ObjectLiteralExpression') {
            sponsorsProperty = initializer.getProperty('sponsors')
        }

        if (!sponsorsProperty) {
            print.error('Could not find sponsors property in config')
            return false
        }

        // Get the sponsors object
        const sponsorsInitializer = sponsorsProperty
            .getChildren()
            .find((child) => child.getKindName() === 'ObjectLiteralExpression')

        if (!sponsorsInitializer) {
            print.error('Could not find sponsors object initializer')
            return false
        }

        // Find the tier array
        let tierProperty = sponsorsInitializer.getProperty(tier)
        let tierInitializer = null

        if (!tierProperty) {
            // Tier doesn't exist, create it
            print.info(`Tier ${tier} doesn't exist, creating it...`)

            // Add the new tier property with an empty array
            const currentText = sponsorsInitializer.getText()
            const newText = currentText.replace(/\{/, `{\n        ${tier}: [],`)
            sponsorsInitializer.replaceWithText(newText)

            // Re-fetch the property after adding it
            tierProperty = sponsorsInitializer.getProperty(tier)
            if (!tierProperty) {
                print.error(`Failed to create ${tier} tier in sponsors config`)
                return false
            }
        }

        // Get the array initializer
        tierInitializer = tierProperty.getChildren().find((child) => child.getKindName() === 'ArrayLiteralExpression')

        if (!tierInitializer) {
            print.error(`Could not find ${tier} array initializer`)
            return false
        }

        // Create the sponsor object string with proper escaping
        const escapedName = sponsorObj.name.replace(/'/g, "\\'")
        const escapedWebsite = sponsorObj.website.replace(/'/g, "\\'")
        const escapedQuote = sponsorObj.quote
            ? sponsorObj.quote.replace(/'/g, "\\'").replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t')
            : ''

        const escapedRoomName = sponsorObj.roomName?.replace(/'/g, "\\'")

        const sponsorString = `{
                name: '${escapedName}',
                website: '${escapedWebsite}',
                logoUrlDarkMode: '${sponsorObj.logoUrlDarkMode}',
                logoUrlLightMode: '${sponsorObj.logoUrlLightMode}',${escapedQuote ? `\n                quote: '${escapedQuote}',` : ''}${escapedRoomName !== undefined ? `\n                roomName: '${escapedRoomName}',` : ''}
            }`

        // Appended, so existing sponsors keep their order on the site.
        tierInitializer.addElement(sponsorString)

        await saveFormatted(sourceFile)

        print.info(`Successfully added ${sponsorObj.name} to ${tier} sponsors in ${year}`)
        return true
    } catch (error) {
        print.error(`Error adding sponsor to config: ${error.message}`)
        return false
    }
}

// Function to update sponsor logo URLs in TypeScript config file
export async function updateSponsorLogoInConfig(year, sponsorName, logoUrlDarkMode, logoUrlLightMode) {
    try {
        const { Project } = await import('ts-morph')
        const project = new Project()

        const configPath = path.join(YEARS_CONFIG_DIR, `${year}.ts`)

        // Check if config file exists
        try {
            await fs.access(configPath)
        } catch {
            throw new Error('Config file does not exist: ' + configPath)
        }

        const sourceFile = project.addSourceFileAtPath(configPath)

        // Find the conference object
        const conferenceVar = sourceFile.getVariableDeclaration(`conference${year}`)
        if (!conferenceVar) {
            print.error(`Could not find conference${year} variable in config`)
            return false
        }

        const initializer = conferenceVar.getInitializer()
        if (!initializer || !initializer.getKind) {
            print.error('Could not find conference initializer')
            return false
        }

        // Find the sponsors property
        let sponsorsProperty = null
        if (initializer.getKindName() === 'ObjectLiteralExpression') {
            sponsorsProperty = initializer.getProperty('sponsors')
        }

        if (!sponsorsProperty) {
            print.error('Could not find sponsors property in config')
            return false
        }

        // Get the sponsors object
        const sponsorsInitializer = sponsorsProperty
            .getChildren()
            .find((child) => child.getKindName() === 'ObjectLiteralExpression')

        if (!sponsorsInitializer) {
            print.error('Could not find sponsors object initializer')
            return false
        }

        // Search through all tier arrays to find the sponsor
        const tiers = SPONSOR_TIERS
        let sponsorFound = false
        let sponsorTier = null

        for (const tier of tiers) {
            const tierProperty = sponsorsInitializer.getProperty(tier)
            if (!tierProperty) continue

            const tierInitializer = tierProperty
                .getChildren()
                .find((child) => child.getKindName() === 'ArrayLiteralExpression')

            if (!tierInitializer) continue

            // Get the current text and check if sponsor exists in this tier
            const tierText = tierInitializer.getText()
            const escapedName = sponsorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const sponsorRegex = new RegExp(`{[^}]*name:\\s*['"\`]${escapedName}['"\`][^}]*}`, 's')

            if (sponsorRegex.test(tierText)) {
                sponsorFound = true
                sponsorTier = tier

                // Update the sponsor's logo URLs
                const updatedText = tierText.replace(sponsorRegex, (match) => {
                    // Update logoUrlDarkMode
                    let updated = match.replace(
                        /logoUrlDarkMode:\s*['"`][^'"`]*['"`]/,
                        `logoUrlDarkMode: '${logoUrlDarkMode}'`,
                    )
                    // Update logoUrlLightMode
                    updated = updated.replace(
                        /logoUrlLightMode:\s*['"`][^'"`]*['"`]/,
                        `logoUrlLightMode: '${logoUrlLightMode}'`,
                    )
                    return updated
                })

                tierInitializer.replaceWithText(updatedText)
                break
            }
        }

        if (!sponsorFound) {
            // Try to provide more helpful information about what sponsors exist
            const foundSponsors = []
            for (const tier of tiers) {
                const tierProperty = sponsorsInitializer.getProperty(tier)
                if (tierProperty) {
                    const tierInitializer = tierProperty
                        .getChildren()
                        .find((child) => child.getKindName() === 'ArrayLiteralExpression')
                    if (tierInitializer) {
                        const tierText = tierInitializer.getText()
                        // Extract sponsor names from this tier
                        const nameMatches = tierText.matchAll(/name:\s*['"`]([^'"`]+)['"`]/g)
                        for (const match of nameMatches) {
                            foundSponsors.push(`${match[1]} (${tier})`)
                        }
                    }
                }
            }

            print.error(`Could not find sponsor "${sponsorName}" in any tier for year ${year}`)
            if (foundSponsors.length > 0) {
                print.info(`Found sponsors in ${year} config:`)
                foundSponsors.forEach((s) => print.info(`  - ${s}`))
                print.info(`Note: sponsor names are case-sensitive`)
            }
            return false
        }

        // Save the file
        await saveFormatted(sourceFile)

        print.info(`Successfully updated logo URLs for ${sponsorName} in ${sponsorTier} sponsors (${year})`)
        return true
    } catch (error) {
        print.error(`Error updating sponsor logo in config: ${error.message}`)
        return false
    }
}

/**
 * Updates string fields on an existing sponsor entry in place (portal
 * re-imports use this instead of appending a duplicate). Finds the sponsor
 * by its current name across all tiers, then replaces each provided field —
 * or inserts it before the closing brace when the entry doesn't have it yet
 * (e.g. hand-written entries without a quote).
 */
export async function updateSponsorFieldsInConfig(year, sponsorName, fields) {
    try {
        const project = new Project()
        const configPath = path.join(YEARS_CONFIG_DIR, `${year}.ts`)
        const sourceFile = project.addSourceFileAtPath(configPath)

        const conferenceVar = sourceFile.getVariableDeclaration(`conference${year}`)
        const initializer = conferenceVar?.getInitializer()
        const sponsorsProperty =
            initializer?.getKindName() === 'ObjectLiteralExpression' ? initializer.getProperty('sponsors') : null
        const sponsorsInitializer = sponsorsProperty
            ?.getChildren()
            .find((child) => child.getKindName() === 'ObjectLiteralExpression')
        if (!sponsorsInitializer) {
            print.error(`Could not locate sponsors object in ${yearConfigRelPath(year)}`)
            return false
        }

        const escapedName = sponsorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const sponsorRegex = new RegExp(`\\{[^{}]*name:\\s*['"\`]${escapedName}['"\`][^{}]*\\}`, 's')
        const escapeValue = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")

        for (const tier of SPONSOR_TIERS) {
            const tierProperty = sponsorsInitializer.getProperty(tier)
            const tierInitializer = tierProperty
                ?.getChildren()
                .find((child) => child.getKindName() === 'ArrayLiteralExpression')
            if (!tierInitializer) continue

            const tierText = tierInitializer.getText()
            if (!sponsorRegex.test(tierText)) continue

            const updatedText = tierText.replace(sponsorRegex, (match) => {
                let updated = match
                for (const [key, value] of Object.entries(fields)) {
                    if (value === undefined || value === null) continue
                    const fieldRegex = new RegExp(`${key}:\\s*['"\`][^'"\`]*['"\`]`)
                    if (fieldRegex.test(updated)) {
                        updated = updated.replace(fieldRegex, `${key}: '${escapeValue(value)}'`)
                    } else if (value !== '') {
                        // Insert missing field before the closing brace,
                        // matching the entry's trailing-comma style.
                        updated = updated.replace(/,?\s*\}$/, `, ${key}: '${escapeValue(value)}' }`)
                    }
                }
                return updated
            })

            tierInitializer.replaceWithText(updatedText)
            await saveFormatted(sourceFile)
            print.info(`Updated ${Object.keys(fields).join(', ')} for "${sponsorName}" in ${tier} (${year})`)
            return true
        }

        print.error(`Could not find sponsor "${sponsorName}" in any tier for year ${year}`)
        return false
    } catch (error) {
        print.error(`Error updating sponsor fields in config: ${error.message}`)
        return false
    }
}

/**
 * Writes a sponsor's processed logo variants and upserts its config entry —
 * the save step behind both the web UI's approve button and the CLI.
 *
 * logos: { light, dark } data URLs from processLogo(). Omit to leave logos alone.
 * portalImport: the portal submission this save came from, when it did; it is
 *   recorded in the year's portal-imports sidecar and the logo variants are
 *   attached back to its Jira issue.
 *
 * Returns { sponsorObj, existing, configUpdated, jira }.
 */
export async function saveSponsor({
    name,
    website,
    tier,
    quote,
    year,
    roomName,
    logos,
    uploadedFilename,
    portalImport,
}) {
    if (!name || !tier || !year) {
        throw new Error('Missing required fields: name, tier, year')
    }

    const sponsorNameSlug = name.toLowerCase().replace(/\s+/g, '-')

    // Determine correct file extension from the processed data URLs (covers
    // both file uploads and portal imports, where no file input is present).
    let ext = 'svg'
    if (logos && logos.light) {
        ext = logos.light.startsWith('data:image/svg') ? 'svg' : 'png'
    } else if (uploadedFilename) {
        ext = uploadedFilename.endsWith('.svg') ? 'svg' : 'png'
    }

    const sponsorObj = {
        name: name,
        website: website || '',
        logoUrlDarkMode: `/images/sponsors/${year}-${sponsorNameSlug}-dark.${ext}`,
        logoUrlLightMode: `/images/sponsors/${year}-${sponsorNameSlug}-light.${ext}`,
        quote: quote || '',
    }
    // Room sponsors require roomName in the config type. The committee assigns
    // it in Jira's "Exhibitor Room" field, so a portal import reads it from
    // there; 'TBC' is only for when nothing has been assigned yet. It must
    // match the Sessionize room name exactly for the agenda to credit it.
    if (tier === 'room' && !roomName && portalImport?.issueKey) {
        const session = await loadJiraSession()
        if (!session.error) {
            roomName = await fetchExhibitorRoom(session, portalImport.issueKey)
            if (roomName) print.info(`Room from ${portalImport.issueKey}'s Exhibitor Room: ${roomName}`)
        }
    }
    if (tier === 'room') {
        sponsorObj.roomName = roomName || 'TBC'
    }

    // Keep the buffers around — portal-sourced saves also attach these
    // variants to the sponsor's Jira issue.
    const savedLogoFiles = []
    if (logos) {
        for (const variant of ['light', 'dark']) {
            if (logos[variant]) {
                const buffer = Buffer.from(logos[variant].split(',')[1], 'base64')
                const filename = `${year}-${sponsorNameSlug}-${variant}.${ext}`
                await fs.writeFile(path.join(SPONSORS_DIR, filename), buffer)
                savedLogoFiles.push({ filename, buffer })
            }
        }
    }

    // Upsert into the config: if this sponsor already exists (matched by
    // current name, or the name recorded at the previous portal import),
    // update the entry in place — otherwise re-importing an update would
    // append a duplicate. New sponsors append as before.
    const existingByTier = (await getSponsorsByYear(year)) ?? {}
    const candidateNames = [name, portalImport?.importedName].filter(Boolean)
    let existing = null
    for (const [existingTier, tierSponsors] of Object.entries(existingByTier)) {
        const match = tierSponsors.find((s) => candidateNames.includes(s.name))
        if (match) {
            existing = { tier: existingTier, name: match.name }
            break
        }
    }

    let configUpdated
    if (existing) {
        configUpdated = await updateSponsorFieldsInConfig(year, existing.name, {
            name,
            website: sponsorObj.website,
            quote: sponsorObj.quote,
            ...(roomName ? { roomName } : {}),
            ...(logos
                ? {
                      logoUrlDarkMode: sponsorObj.logoUrlDarkMode,
                      logoUrlLightMode: sponsorObj.logoUrlLightMode,
                  }
                : {}),
        })
        if (existing.tier !== tier) {
            print.warning(`Sponsor stayed in "${existing.tier}" — move to "${tier}" manually if the tier changed.`)
        }
    } else {
        configUpdated = await addSponsorToConfig(year, tier, sponsorObj)
    }

    print.success(`Sponsor "${name}" prepared for ${year}`)
    if (configUpdated) {
        print.success(
            existing
                ? `Sponsor updated in place in: ${yearConfigRelPath(year)}`
                : `Sponsor added to: ${yearConfigRelPath(year)} ("${tier}" array)`,
        )
    } else {
        print.warning(`Could not automatically update config file`)
        print.warning(`Please manually edit: ${yearConfigRelPath(year)}`)
        print.warning(`Under the "${tier}" array in the sponsors section`)
    }

    // Record the import so future fetches can flag changes.
    if (configUpdated && portalImport?.issueKey) {
        await recordPortalImport(portalImport.year ?? year, portalImport.issueKey, {
            // Config entry name (possibly committee-edited) — used to find the
            // entry for in-place updates.
            name,
            // Portal's own name at import time — used for change detection so
            // a committee rename doesn't flag as a sponsor update forever.
            portalName: portalImport.name ?? name,
            tier,
            configYear: year,
            importedAt: new Date().toISOString(),
            blurb: portalImport.quote ?? '',
            websiteUrl: portalImport.website ?? '',
            socials: portalImport.socials ?? {},
            logoR2Key: portalImport.logoR2Key ?? '',
            profileUpdatedAt: portalImport.profileUpdatedAt ?? null,
        })
        print.success(`Import recorded in ${path.basename(portalImportsPath(portalImport.year ?? year))}`)
    }

    // Portal-sourced saves: attach the processed black/white variants back
    // onto the sponsor's Jira issue so the committee has them alongside the
    // original upload. Best-effort — a Jira failure never fails the save.
    let jira = null
    if (configUpdated && portalImport?.issueKey && savedLogoFiles.length > 0) {
        const session = await loadJiraSession()
        if (session.error) {
            jira = { skipped: session.error }
            print.warning(`Jira attach skipped: ${session.error}`)
        } else {
            print.info(`Attaching ${savedLogoFiles.length} logo variant(s) to ${portalImport.issueKey}…`)
            jira = await attachFilesToIssue(session, portalImport.issueKey, savedLogoFiles)
            for (const filename of jira.attached) {
                print.success(
                    `Attached ${filename} to ${portalImport.issueKey}` +
                        (jira.replaced.includes(filename) ? ' (replaced previous version)' : ''),
                )
            }
            for (const message of jira.errors) {
                print.warning(message)
            }
        }
    }

    return { sponsorObj, existing, configUpdated, jira }
}

/** Downloads a portal submission's logo from R2 and runs it through processLogo. */
export async function processPortalLogo(env, r2Key, filename) {
    print.info(`Downloading ${r2Key} from ${env} R2…`)
    const buffer = await downloadPortalLogo(env, r2Key, filename)
    return processLogo(buffer, filename || path.basename(r2Key))
}
