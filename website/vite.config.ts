import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import path from 'node:path'
import { safeRoutes } from 'safe-routes/vite'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'vite'
import { mdxBundlesPlugin } from './vite-plugins/mdx-bundles'
// Vite's config loader uses native Node ESM — it doesn't honour the
// @conference/* tsconfig path alias the rest of the app uses. Use a
// relative import here. Forks repoint this at their own
// ../../conference/build-manifest during scaffolding.
// eslint-disable-next-line @nx/enforce-module-boundaries -- relative path required at vite config load time
import { conferenceBuildManifest } from '../conference/build-manifest'

export default defineConfig({
    root: import.meta.dirname,

    resolve: {
        tsconfigPaths: true,
        dedupe: ['react', 'react-dom', 'react-router', 'react-router/dom'],
        // remix-auth-github pulls in `debug`, whose entry picks the Node
        // variant in the Workers runtime. The Node variant calls
        // tty.isatty(process.stdout.fd) at log-init time, which throws
        // because `process.stdout` is missing under nodejs_compat.
        // Force the browser variant — it's noop logging either way.
        alias: {
            debug: 'debug/src/browser.js',
        },
    },
    environments: {
        ssr: {
            resolve: {
                dedupe: ['react', 'react-dom', 'react-router', 'react-router/dom'],
            },
            optimizeDeps: {
                // Seed every server-side dep up front so Vite's optimizer runs a
                // single pass. A second optimization pass triggered by on-demand
                // discovery produces a new pre-bundle hash for React; requests
                // already in flight keep the old hash, creating two React copies
                // that don't share ReactSharedInternals and break hooks.
                include: [
                    'react',
                    'react-dom',
                    'react-dom/server',
                    'react/jsx-runtime',
                    'react/jsx-dev-runtime',
                    'react-router',
                    'isbot',
                    'feed',
                ],
            },
            build: {
                rollupOptions: {
                    // @cloudflare/vite-plugin's output-config asserts an entry
                    // chunk named "index" exists in the SSR bundle. RR7's default
                    // input is a string (`virtual:react-router/server-build`),
                    // which makes rollup name the chunk "server-build". Name it
                    // explicitly here so both plugins agree.
                    input: { index: 'virtual:react-router/server-build' },
                },
            },
        },
    },
    server: {
        port: 3800,
        hmr: {
            port: 3805,
        },
    },
    plugins: [
        // wrangler config lives in /conference/wrangler/ so the fork owns
        // deployment identity. Path is fixed at build time; if it ever needs
        // to vary per env, switch to an env-var-driven path.
        cloudflare({
            viteEnvironment: { name: 'ssr' },
            configPath: path.resolve(import.meta.dirname, '..', 'conference', 'wrangler', 'local.jsonc'),
        }),
        reactRouter(),
        safeRoutes({
            outDir: '.',
            strict: true,
        }),
        mdxBundlesPlugin({
            pagesDir: conferenceBuildManifest.content.pagesDir,
            blogDir: conferenceBuildManifest.content.blogDir,
        }),
        svgr({
            svgrOptions: {
                plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
                svgoConfig: {
                    plugins: [{ name: 'prefixIds', params: { prefixIds: true } }],
                },
            },
        }),
    ],
})
