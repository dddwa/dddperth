import { spawn } from 'node:child_process'

/**
 * Set a Cloudflare Worker secret via `pnpm wrangler secret put`, piping the
 * value on stdin so it never appears in argv or shell history.
 *
 * `cwd` should be the website/ directory (where wrangler.jsonc lives).
 */
export function putWorkerSecret({ cwd, env, key, value }) {
    return new Promise((resolve, reject) => {
        const child = spawn('pnpm', ['wrangler', 'secret', 'put', key, '--env', env], {
            cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        let stderr = ''
        child.stdout.on('data', () => {})
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString()
        })

        child.on('error', reject)
        child.on('close', (code) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`wrangler secret put ${key} (--env ${env}) exited ${code}: ${stderr.trim()}`))
            }
        })

        child.stdin.write(value)
        child.stdin.end()
    })
}
