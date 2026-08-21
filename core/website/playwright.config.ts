import type { Project } from '@playwright/test'
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

/**
 * Visual regression matrix for `e2e/visual.spec.ts` only (kept separate from
 * the single `chromium` project above, which runs the axe/focus-visible
 * suite — crossing *those* against every browser/viewport below would give
 * near-zero extra signal for 9x the runtime). Three browser engines x three
 * representative viewport widths, so a rendering regression that only shows
 * up in one engine or one breakpoint doesn't slip through.
 */
const visualBrowsers: Array<{ name: string; use: Project['use'] }> = [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
]
const visualViewports: Array<{ name: string; width: number; height: number }> = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 834, height: 1194 },
    { name: 'desktop', width: 1440, height: 900 },
]
const visualProjects: Project[] = visualBrowsers.flatMap((browser) =>
    visualViewports.map((viewport) => ({
        name: `visual-${browser.name}-${viewport.name}`,
        testMatch: /visual\.spec\.ts/,
        use: {
            ...browser.use,
            viewport: { width: viewport.width, height: viewport.height },
        },
    })),
)

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
            testIgnore: /visual\.spec\.ts/,
        },
        ...visualProjects,
    ],
    expect: {
        toHaveScreenshot: {
            // Cross-engine font/subpixel rendering differs slightly even
            // with identical CSS; a small tolerance avoids flagging noise
            // while still catching real layout/style regressions.
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
        },
    },
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
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
