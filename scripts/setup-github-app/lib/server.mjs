import { readFileSync } from 'node:fs'
import http from 'node:http'
import { dirname, join } from 'node:path'
import url, { fileURLToPath } from 'node:url'

import { print } from './cli.mjs'
import { readBody, sendHTML, sendJSON, sendStatic } from './http.mjs'
import { exchangeManifestCode } from './manifest.mjs'
import { persistCredentials } from './storage.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const templatesDir = join(__dirname, '..', 'templates')

const indexHTML = readFileSync(join(templatesDir, 'index.html'), 'utf8')
const successTemplate = readFileSync(join(templatesDir, 'success.html'), 'utf8')
const stylesCSS = readFileSync(join(templatesDir, 'styles.css'), 'utf8')
const clientJS = readFileSync(join(templatesDir, 'client.js'), 'utf8')

/**
 * Build the local HTTP server. The server hosts a small UI that drives the
 * GitHub App manifest flow and persists the resulting OAuth credentials.
 *
 * @param {object} options
 * @param {string} options.repoRoot - absolute path to the repo root
 * @returns {http.Server}
 */
export function createServer({ repoRoot }) {
    return http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url, true)
        const pathname = parsedUrl.pathname
        const method = req.method.toLowerCase()

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
                await handleCallback(req, res, parsedUrl, repoRoot)
                return
            }

            if (pathname === '/persist' && method === 'post') {
                await handlePersist(req, res, repoRoot)
                return
            }

            sendHTML(res, '<h1>404 Not Found</h1>', 404)
        } catch (error) {
            print.error(`Server error: ${error.message}`)
            sendJSON(res, { error: 'Internal server error' }, 500)
        }
    })
}

async function handleCallback(_req, res, parsedUrl, repoRoot) {
    const { code } = parsedUrl.query

    if (!code) {
        sendHTML(res, '<h2>Missing code parameter</h2>', 400)
        return
    }

    try {
        const app = await exchangeManifestCode(code)

        const html = successTemplate
            .replace(/{{appName}}/g, escapeHtml(app.name ?? 'GitHub App'))
            .replace(/{{appSlug}}/g, escapeHtml(app.slug ?? ''))
            .replace(/{{clientId}}/g, escapeHtml(app.client_id ?? ''))
            .replace(/{{appDataJson}}/g, JSON.stringify({ client_id: app.client_id, client_secret: app.client_secret, slug: app.slug, name: app.name }))

        sendHTML(res, html)

        // Persist as a side-effect via the client; we just hand back the data here.
        // (Persistence happens in /persist so the user sees the success page first.)
        // Avoid logging the secret.
        print.success(`GitHub App "${app.name}" created (slug: ${app.slug})`)

        // Suppress unused-var warning when repoRoot is only consumed by /persist.
        void repoRoot
    } catch (error) {
        print.error(`Failed to exchange manifest code: ${error.message}`)
        sendHTML(res, `<h2>Error</h2><p>${escapeHtml(error.message)}</p>`, 500)
    }
}

async function handlePersist(req, res, repoRoot) {
    const body = await readBody(req)
    const { environment, app } = body

    if (!environment || !app?.client_id || !app?.client_secret) {
        sendJSON(res, { success: false, message: 'environment, client_id and client_secret are required' }, 400)
        return
    }

    try {
        const result = await persistCredentials({ environment, app, repoRoot })
        print.success(`Credentials written to ${result.target}`)
        sendJSON(res, { success: true, target: result.target })
    } catch (error) {
        print.error(`Failed to persist credentials: ${error.message}`)
        sendJSON(res, { success: false, message: error.message }, 500)
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
