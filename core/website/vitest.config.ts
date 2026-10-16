import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    root: import.meta.dirname,
    // So components that import `*.svg?react` (logos, icons) can render in
    // tests. JSX only — svgo's id prefixing in vite.config.ts doesn't matter here.
    plugins: [svgr()],
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
