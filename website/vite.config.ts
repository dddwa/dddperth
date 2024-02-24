import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { remixDevTools } from 'remix-development-tools/vite'

export default defineConfig({
    root: __dirname,
    server: {
        port: 3800,
        hmr: {
            port: 3805,
        },
    },
    plugins: [remixDevTools(), remix(), tsconfigPaths()],
})
