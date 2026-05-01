import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import path from 'node:path'
import { safeRoutes } from 'safe-routes/vite'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'vite'
import { mdxBundlesPlugin } from './vite-plugins/mdx-bundles'

export default defineConfig({
    root: import.meta.dirname,

    resolve: {
        tsconfigPaths: true,
        dedupe: ['react', 'react-dom', 'react-router', 'react-router/dom'],
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
        cloudflare({ viteEnvironment: { name: 'ssr' } }),
        reactRouter(),
        safeRoutes({
            outDir: '.',
            strict: true,
        }),
        mdxBundlesPlugin({ workspaceRoot: path.resolve(import.meta.dirname, '..') }),
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
