import mdx from '@mdx-js/rollup'
import { reactRouter } from '@react-router/dev/vite'
import { reactRouterDevTools } from 'react-router-devtools'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    // eslint-disable-next-line no-undef
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
        tsconfigPaths(),
        reactRouterDevTools(),
        mdx({
            remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
            rehypePlugins: [],
            /* jsxImportSource: …, otherOptions… */
        }),
        reactRouter({
            buildDirectory: 'build/remix',
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
