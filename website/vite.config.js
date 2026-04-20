import { cloudflareDevProxy } from '@react-router/dev/vite/cloudflare'
import { reactRouter } from '@react-router/dev/vite'
import { reactRouterDevTools } from 'react-router-devtools'
import { safeRoutes } from 'safe-routes/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    root: __dirname,

    server: {
        port: 3800,
        hmr: {
            port: 3805,
        },
    },
    plugins: [
        cloudflareDevProxy({
            // Use getLoadContext from load-context.server.ts (avoids ~ alias issues)
            getLoadContext: async ({ request, context }) => {
                const loadContext = await import('./app/load-context.server.ts')
                return loadContext.getLoadContext({
                    request,
                    env: context.cloudflare.env,
                    ctx: context.cloudflare.ctx,
                })
            },
        }),
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
