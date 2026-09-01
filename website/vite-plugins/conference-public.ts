import { createReadStream } from 'node:fs'
import { cp, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

// Vite supports exactly one publicDir, and core owns it
// (website/public/). Fork-owned static assets (sponsor logos, team
// photos, PDFs) live in the conference layer and are declared via
// `content.publicDir` in the build manifest. This plugin overlays that
// directory onto the site root:
//
// - dev: a pre-internal middleware serves matching files, so it runs
//   before Vite's own publicDir handling — on a name collision the
//   conference file wins.
// - build: the directory is copied into the client bundle output after
//   the bundle (and Vite's own publicDir copy) is written, again letting
//   conference files win collisions. The worker's `assets.directory`
//   points at build/client, so deployed assets need no extra wiring.

const CONTENT_TYPES: Record<string, string> = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.xml': 'application/xml',
}

export function conferencePublicPlugin({ publicDir }: { publicDir: string }): Plugin {
    const root = path.resolve(publicDir)

    return {
        name: 'conference-public',

        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.method !== 'GET' && req.method !== 'HEAD') return next()

                const urlPath = decodeURIComponent((req.url ?? '').split('?')[0])
                const filePath = path.join(root, urlPath)
                // path.join normalises `..` segments — reject anything that
                // escapes the conference public dir.
                if (!filePath.startsWith(root + path.sep)) return next()

                stat(filePath).then(
                    (stats) => {
                        if (!stats.isFile()) return next()
                        res.setHeader(
                            'Content-Type',
                            CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
                        )
                        res.setHeader('Content-Length', stats.size)
                        if (req.method === 'HEAD') return res.end()
                        createReadStream(filePath).pipe(res)
                    },
                    () => next(),
                )
            })
        },

        async closeBundle() {
            // closeBundle fires once per build environment (client + ssr);
            // static assets only belong in the client output.
            if (this.environment.name !== 'client' || this.environment.config.command !== 'build') return
            const outDir = path.resolve(this.environment.config.root, this.environment.config.build.outDir)
            try {
                await cp(root, outDir, { recursive: true })
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
                throw error
            }
        },
    }
}
