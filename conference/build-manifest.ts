/**
 * DDD Perth build-time manifest.
 *
 * Extends the runtime manifest with Node-only bits: absolute paths to
 * content folders, theme references for Panda CSS, and deployment names
 * for wrangler/D1 scripts. Imported by vite.config.ts, panda.config.ts,
 * and scripts/* — never by app code.
 */

import path from 'node:path'
import type { ConferenceBuildManifest } from '@ddd/conference-config'
import { conferenceManifest } from './manifest'
import { dddPerthLightTheme } from './theme/perth-light.theme'
import { dddPerthTheme } from './theme/perth.theme'

const conferenceDir = import.meta.dirname

export const conferenceBuildManifest: ConferenceBuildManifest<typeof dddPerthTheme> = {
    ...conferenceManifest,
    deployment: {
        workerName: {
            local: 'dddperth-website',
            staging: 'dddperth-website-staging',
            production: 'dddperth-website-production',
        },
        d1DatabaseName: {
            local: 'dddperth-voting-local',
            staging: 'dddperth-voting-staging',
            production: 'dddperth-voting-prod',
        },
        webUrl: {
            local: 'http://localhost:3800',
            staging: 'https://staging.dddperth.com',
            production: 'https://dddperth.com',
        },
    },
    theme: {
        currentTheme: dddPerthTheme,
        currentLightTheme: dddPerthLightTheme,
    },
    content: {
        pagesDir: path.resolve(conferenceDir, 'content/pages'),
        blogDir: path.resolve(conferenceDir, 'content/blog/posts'),
        blogAuthorsFile: path.resolve(conferenceDir, 'content/blog/authors.yml'),
        publicDir: path.resolve(conferenceDir, 'public'),
    },
}
