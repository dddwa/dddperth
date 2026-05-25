import { defineConfig } from 'vitest/config'

export default defineConfig({
    root: import.meta.dirname,
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
