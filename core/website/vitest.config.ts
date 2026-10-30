import type { ConferenceBuildManifest } from '@ddd/conference-config'
import fs from 'node:fs'
import path from 'node:path'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'vitest/config'
import { conferenceBrandPlugin } from './vite-plugins/conference-brand.ts'

// Found by looking, like vite.config.ts's wrangler directory, so a fork
// (core/website/ with ../../conference/) needs no edit here.
const buildManifestPath = [
    path.resolve(import.meta.dirname, '..', '..', 'conference', 'build-manifest.ts'),
    path.resolve(import.meta.dirname, '..', 'conference-stub', 'build-manifest.ts'),
].find((file) => fs.existsSync(file))

if (!buildManifestPath) {
    throw new Error('No build manifest found — expected ../../conference/build-manifest.ts (fork) or ../conference-stub/build-manifest.ts (ddd-core standalone).')
}

const { conferenceBuildManifest } = (await import(buildManifestPath)) as { conferenceBuildManifest: ConferenceBuildManifest }

export default defineConfig({
    root: import.meta.dirname,
    // So components that import `*.svg?react` (logos, icons) can render in
    // tests. JSX only — svgo's id prefixing in vite.config.ts doesn't matter here.
    plugins: [conferenceBrandPlugin(conferenceBuildManifest.brandAssets), svgr()],
    resolve: {
        tsconfigPaths: true,
        dedupe: ['react', 'react-dom', 'react-router', 'react-router/dom'],
    },
    test: {
        watch: false,
        globals: false,
        environment: 'node',
        include: ['app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../coverage/website',
            provider: 'v8',
        },
    },
})
