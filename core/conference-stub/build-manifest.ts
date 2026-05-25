/**
 * DevConf Example build manifest. Node-only build companion to manifest.ts.
 *
 * Imported by website/vite.config.ts, website/panda.config.ts, and the
 * D1 migration scripts. NEVER imported from app code — keep
 * `import.meta.dirname` out of the browser bundle.
 *
 * Forks copy this file as their own /conference/build-manifest.ts via the
 * /new-conference skill.
 */

import path from 'node:path'
import type { ConferenceBuildManifest } from '@ddd/conference-config'
import { conferenceManifest } from './manifest'
import { exampleLightTheme } from './theme/example-light.theme'
import { exampleTheme } from './theme/example.theme'

const stubDir = import.meta.dirname

export const conferenceBuildManifest: ConferenceBuildManifest<typeof exampleTheme> = {
    ...conferenceManifest,
    deployment: {
        workerName: {
            local: 'devconf-example-website',
            staging: 'devconf-example-website-staging',
            production: 'devconf-example-website-production',
        },
        d1DatabaseName: {
            local: 'devconf-example-voting-local',
            staging: 'devconf-example-voting-staging',
            production: 'devconf-example-voting-prod',
        },
        webUrl: {
            local: 'http://localhost:3800',
            staging: 'https://staging.example.test',
            production: 'https://example.test',
        },
    },
    theme: {
        currentTheme: exampleTheme,
        currentLightTheme: exampleLightTheme,
    },
    content: {
        pagesDir: path.resolve(stubDir, 'content/pages'),
        blogDir: path.resolve(stubDir, 'content/blog/posts'),
        blogAuthorsFile: path.resolve(stubDir, 'content/blog/authors.yml'),
    },
}
