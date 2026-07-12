import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '..', '..')
const DEV_VARS_PATH = path.join(ROOT_DIR, 'core', 'website', '.dev.vars')
const PORTAL_CONFIG_PATH = path.join(ROOT_DIR, 'conference', 'config', 'sponsor-portal.ts')

const CONTENT_TYPES = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
}

function parseDevVars(content) {
    const vars = {}
    for (const line of content.split('\n')) {
        const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
        if (match) vars[match[1]] = match[2].trim()
    }
    return vars
}

/**
 * Builds a Jira session from the credentials `pnpm jira:auth` saves to
 * core/website/.dev.vars (JIRA_API_EMAIL / JIRA_API_TOKEN, plus
 * JIRA_API_BASE_URL when a scoped token needs the api.atlassian.com
 * gateway). Falls back to the site baseUrl in conference/config/sponsor-portal.ts.
 *
 * Returns { baseUrl, headers } on success, or { error } describing why
 * attaching isn't possible — callers treat that as "skip", never fatal.
 */
export async function loadJiraSession() {
    let devVars = {}
    try {
        devVars = parseDevVars(await fs.readFile(DEV_VARS_PATH, 'utf-8'))
    } catch {
        return { error: 'core/website/.dev.vars not found — run `pnpm jira:auth` first' }
    }

    if (devVars.JIRA_STUB === 'true') {
        return { error: 'JIRA_STUB=true is set — no real Jira to attach to' }
    }

    const email = process.env.JIRA_API_EMAIL || devVars.JIRA_API_EMAIL
    const token = process.env.JIRA_API_TOKEN || devVars.JIRA_API_TOKEN
    if (!email || !token) {
        return { error: 'No Jira credentials in .dev.vars — run `pnpm jira:auth` first' }
    }

    let baseUrl = process.env.JIRA_API_BASE_URL || devVars.JIRA_API_BASE_URL
    if (!baseUrl) {
        try {
            const source = await fs.readFile(PORTAL_CONFIG_PATH, 'utf-8')
            baseUrl = source.match(/baseUrl\s*:\s*'([^']+)'/)?.[1]
        } catch {
            /* fall through to the error below */
        }
    }
    if (!baseUrl) {
        return { error: 'Could not determine the Jira base URL' }
    }

    return {
        baseUrl: baseUrl.replace(/\/$/, ''),
        headers: {
            Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
            Accept: 'application/json',
        },
    }
}

/**
 * Attaches processed logo variants to a Jira issue, replacing any existing
 * attachment with the same filename so re-imports don't pile up duplicates
 * (delete failures are tolerated — Jira then just keeps both versions).
 *
 * files: [{ filename, buffer }]
 * Returns { attached: [filename], replaced: [filename], errors: [message] }.
 */
export async function attachFilesToIssue(session, issueKey, files) {
    const result = { attached: [], replaced: [], errors: [] }

    // Existing attachments, so same-named ones can be replaced rather than
    // duplicated. A failure here is not fatal — we just attach fresh copies.
    let existing = []
    try {
        const response = await fetch(
            `${session.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=attachment`,
            { headers: session.headers },
        )
        if (!response.ok) {
            throw new Error(`GET issue returned ${response.status}`)
        }
        existing = (await response.json()).fields?.attachment ?? []
    } catch (error) {
        result.errors.push(`Could not list existing attachments on ${issueKey}: ${error.message}`)
    }

    for (const file of files) {
        const duplicates = existing.filter((a) => a.filename === file.filename)
        for (const dup of duplicates) {
            try {
                const response = await fetch(`${session.baseUrl}/rest/api/3/attachment/${dup.id}`, {
                    method: 'DELETE',
                    headers: session.headers,
                })
                if (!response.ok && response.status !== 404) {
                    throw new Error(`DELETE returned ${response.status}`)
                }
                if (!result.replaced.includes(file.filename)) result.replaced.push(file.filename)
            } catch (error) {
                result.errors.push(`Could not remove old ${file.filename} from ${issueKey}: ${error.message}`)
            }
        }

        try {
            const contentType = CONTENT_TYPES[path.extname(file.filename).toLowerCase()] ?? 'application/octet-stream'
            const form = new FormData()
            form.append('file', new Blob([file.buffer], { type: contentType }), file.filename)

            const response = await fetch(
                `${session.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/attachments`,
                {
                    method: 'POST',
                    headers: { ...session.headers, 'X-Atlassian-Token': 'no-check' },
                    body: form,
                },
            )
            if (!response.ok) {
                const body = await response.text().catch(() => '')
                throw new Error(`POST returned ${response.status}: ${body.slice(0, 150)}`)
            }
            result.attached.push(file.filename)
        } catch (error) {
            result.errors.push(`Failed to attach ${file.filename} to ${issueKey}: ${error.message}`)
        }
    }

    return result
}
