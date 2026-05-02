import type { IncomingMessage, ServerResponse } from 'node:http'

export function sendJSON(res: ServerResponse, data: unknown, statusCode = 200): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

export function sendHTML(res: ServerResponse, html: string, statusCode = 200): void {
    res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
}

export function sendStatic(res: ServerResponse, body: string, contentType: string): void {
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(body)
}

export function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
        let body = ''
        req.on('data', (chunk: Buffer) => {
            body += chunk.toString()
        })
        req.on('end', () => {
            const contentType = req.headers['content-type'] || ''
            if (contentType.includes('application/json')) {
                try {
                    resolve(JSON.parse(body) as Record<string, unknown>)
                } catch {
                    resolve({})
                }
            } else {
                resolve({})
            }
        })
    })
}
