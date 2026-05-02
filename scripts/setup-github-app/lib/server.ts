import { readFileSync } from 'node:fs'
import http from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { print } from './cli.ts'
import { readBody, sendHTML, sendJSON, sendStatic } from './http.ts'
import { exchangeManifestCode } from './manifest.ts'
import type { Environment } from './storage.ts'
import { persistCredentials } from './storage.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const templatesDir = join(__dirname, '..', 'templates')

const indexHTML = readFileSync(join(templatesDir, 'index.html'), 'utf8')
const successTemplate = readFileSync(join(templatesDir, 'success.html'), 'utf8')
const stylesCSS = readFileSync(join(templatesDir, 'styles.css'), 'utf8')
const clientJS = readFileSync(join(templatesDir, 'client.js'), 'utf8')

export interface CreateServerArgs {
    repoRoot: string
}

/**
 * Build the local HTTP server. The server hosts a small UI that drives the
 * GitHub App manifest flow and persists the resulting OAuth credentials.
 */
export function createServer({ repoRoot }: CreateServerArgs): Server {
    return http.createServer(async (req, res) => {
        const parsed = new URL(req.url ?? '/', 'http://localhost')
        const pathname = parsed.pathname
        const method = req.method?.toLowerCase()

        try {
            if (pathname === '/' && method === 'get') {
                sendHTML(res, indexHTML)
                return
            }

            if (pathname === '/static/styles.css' && method === 'get') {
                sendStatic(res, stylesCSS, 'text/css; charset=utf-8')
                return
            }

            if (pathname === '/static/client.js' && method === 'get') {
                sendStatic(res, clientJS, 'application/javascript; charset=utf-8')
                return
            }

            if (pathname === '/callback' && method === 'get') {
                await handleCallback(res, parsed)
                return
            }

            if (pathname === '/persist' && method === 'post') {
                await handlePersist(req, res, repoRoot)
                return
            }

            sendHTML(res, '<h1>404 Not Found</h1>', 404)
        } catch (error) {
            print.error(`Server error: ${(error as Error).message}`)
            sendJSON(res, { error: 'Internal server error' }, 500)
        }
    })
}

async function handleCallback(res: ServerResponse, parsedUrl: URL): Promise<void> {
    const code = parsedUrl.searchParams.get('code')

    if (!code) {
        sendHTML(res, '<h2>Missing code parameter</h2>', 400)
        return
    }

    try {
        const app = await exchangeManifestCode(code)

        const html = successTemplate
            .replace(/{{appName}}/g, escapeHtml(app.name))
            .replace(/{{appSlug}}/g, escapeHtml(app.slug))
            .replace(/{{clientId}}/g, escapeHtml(app.client_id))
            .replace(
                /{{appDataJson}}/g,
                JSON.stringify({
                    client_id: app.client_id,
                    client_secret: app.client_secret,
                    slug: app.slug,
                    name: app.name,
                }),
            )

        sendHTML(res, html)
        print.success(`GitHub App "${app.name}" created (slug: ${app.slug})`)
    } catch (error) {
        const message = (error as Error).message
        print.error(`Failed to exchange manifest code: ${message}`)
        sendHTML(res, `<h2>Error</h2><p>${escapeHtml(message)}</p>`, 500)
    }
}

interface PersistRequestBody {
    environment?: Environment
    app?: { client_id?: string; client_secret?: string }
}

async function handlePersist(req: IncomingMessage, res: ServerResponse, repoRoot: string): Promise<void> {
    const body = (await readBody(req)) as PersistRequestBody
    const environment = body.environment
    const app = body.app

    if (!environment || !app?.client_id || !app?.client_secret) {
        sendJSON(res, { success: false, message: 'environment, client_id and client_secret are required' }, 400)
        return
    }

    try {
        const result = await persistCredentials({
            environment,
            app: { client_id: app.client_id, client_secret: app.client_secret },
            repoRoot,
        })
        print.success(`Credentials written to ${result.target}`)
        sendJSON(res, { success: true, target: result.target })
    } catch (error) {
        const message = (error as Error).message
        print.error(`Failed to persist credentials: ${message}`)
        sendJSON(res, { success: false, message }, 500)
    }
}

function escapeHtml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
