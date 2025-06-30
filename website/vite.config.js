import { reactRouter } from '@react-router/dev/vite'
import { reactRouterDevTools } from 'react-router-devtools'
import { safeRoutes } from 'safe-routes/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    root: __dirname,
    ssr: {
        // Needed because Open Telemetry doesn't have compliant ESM packages which cause issues
        noExternal: ['@opentelemetry/api'],
    },

    server: {
        port: 3800,
        hmr: {
            port: 3805,
        },
    },
    plugins: [
        reactRouterDevTools(),
        reactRouter(),
        safeRoutes({
            outDir: '.',
            strict: true,
        }),
        tsconfigPaths(),
        svgr({
            svgrOptions: {
                plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
                svgoConfig: {
                    plugins: [{ name: 'prefixIds', params: { prefixIds: true } }],
                },
            },
        }),
    ],
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
