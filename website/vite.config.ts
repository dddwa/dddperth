import { vitePlugin as remix } from '@remix-run/dev'
import { remixDevTools } from 'remix-development-tools/vite'
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
    plugins: [remixDevTools(), remix(), svgr(), tsconfigPaths()],
})
