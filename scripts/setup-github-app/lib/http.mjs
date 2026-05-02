export function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

export function sendHTML(res, html, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
}

export function sendStatic(res, body, contentType) {
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(body)
}

export function readBody(req) {
    return new Promise((resolve) => {
        let body = ''
        req.on('data', (chunk) => {
            body += chunk.toString()
        })
        req.on('end', () => {
            const contentType = req.headers['content-type'] || ''
            if (contentType.includes('application/json')) {
                try {
                    resolve(JSON.parse(body))
                } catch {
                    resolve({})
                }
            } else {
                resolve({})
            }
        })
    })
}
