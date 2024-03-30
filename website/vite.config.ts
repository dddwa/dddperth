import mdx from '@mdx-js/rollup'
import { vitePlugin as remix } from '@remix-run/dev'
import rehypePrettyCode, { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { remixDevTools } from 'remix-development-tools'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

const prettyCodeOptions: RehypePrettyCodeOptions = {
    theme: 'catppuccin-latte',
}

export default defineConfig({
    root: __dirname,
    server: {
        port: 3800,
        hmr: {
            port: 3805,
        },
    },
    plugins: [
        remixDevTools(),
        mdx({
            remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
            rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
            /* jsxImportSource: …, otherOptions… */
        }),
        remix(),
        svgr(),
        tsconfigPaths(),
    ],
})
