import { defineConfig, devices } from '@playwright/test'

/**
 * Accessibility (axe) + focus-visible e2e suite (`nx e2e website`). Scoped
 * to WCAG 2.1 AA checks on the key public routes — not a general functional
 * e2e suite. See core/website/A11Y_BACKLOG.md for known gaps and the
 * "Accessibility" section of the root CLAUDE.md for how this fits into CI.
 *
 * The dev server (not a build+preview) is used deliberately: this app is a
 * Cloudflare Worker via `@cloudflare/vite-plugin`, and `vite preview` doesn't
 * run the Worker entry — only `vite dev` (or `wrangler dev`) does. `nx dev
 * website` already runs on port 3800 per the repo's CLAUDE.md, so CI and
 * local runs share one code path.
 *
 * Port is overridable via `E2E_PORT` (default 3800, matching CLAUDE.md) —
 * useful if you already have `nx dev website` running on 3800 (this repo's
 * `reuseExistingServer` would otherwise silently attach to that *other*
 * process instead of starting its own, e.g. when multiple worktrees/checkouts
 * on the same machine both default to 3800).
 */
const port = Number(process.env.E2E_PORT ?? 3800)
const baseURL = `http://localhost:${port}`

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    timeout: 30_000,
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: `pnpm vite --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        // Generous: first-run dependency optimization plus this being a
        // Cloudflare Worker (not a plain SPA) dev server can take a while
        // under a cold cache or a busy machine.
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
})
