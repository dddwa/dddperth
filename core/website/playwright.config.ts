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
 * run the Worker entry — only `vite dev` (or `wrangler dev`) does. The server
 * is started by `e2e/start-dev-server.mjs`, so CI and local runs share one
 * code path.
 *
 * Port 3801, not 3800: the suites deliberately do not share a port with
 * `pnpm start`. That isolation is the whole point — the suites run against
 * their own wrangler config and their own `.dev.vars` (see
 * `e2e/start-dev-server.mjs`), so attaching to a developer's dev server would
 * silently give them the developer's Sessionize credentials and local D1
 * state instead of the committed fixtures. Overridable via `E2E_PORT`.
 */
const port = Number(process.env.E2E_PORT ?? 3801)
/**
 * `E2E_BASE_URL` points the suite at an already-running server instead of
 * starting its own — used by the containerised visual run (`pnpm vr`), where
 * Playwright runs inside the Docker image but the Vite dev server runs on the
 * host and is reached via `host.docker.internal`.
 */
const externalBaseURL = process.env.E2E_BASE_URL
const baseURL = externalBaseURL ?? `http://localhost:${port}`

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

/**
 * The app picks its colour scheme from a `__theme` cookie, falling back to
 * dark (see `app/root.tsx`'s pre-paint bootstrap script). Seeding the cookie
 * via `storageState` means the very first paint is already in the right
 * theme — no toggle click, no flash, and no dependency on the toggle's own
 * markup staying stable.
 */
function themeCookie(theme: 'light' | 'dark') {
    return {
        storageState: {
            cookies: [
                {
                    name: '__theme',
                    value: theme,
                    domain: 'localhost',
                    path: '/',
                    expires: -1,
                    httpOnly: false,
                    secure: false,
                    sameSite: 'Lax' as const,
                },
            ],
            origins: [],
        },
    }
}

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
            use: { ...devices['Desktop Chrome'], ...themeCookie('dark') },
            testIgnore: /visual\.spec\.ts/,
        },
        // The site defaults to dark. axe's `color-contrast` rule evaluates
        // computed colours, so the light palette in `conference/theme/` was
        // never actually checked by the dark-only run above. The visual
        // suite deliberately stays dark-only for now — doubling 54 committed
        // baselines is not worth it until those baselines are generated on
        // CI rather than a local machine.
        {
            name: 'chromium-light',
            use: { ...devices['Desktop Chrome'], ...themeCookie('light') },
            testMatch: /(a11y|date-states|voting)\.spec\.ts/,
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
    // Skipped when E2E_BASE_URL is set — the server is already running elsewhere.
    webServer: externalBaseURL ? undefined : {
        // Wrapper, not `pnpm vite` directly: it starts the Sessionize fixture
        // server and writes its URL into the e2e-only `.dev.vars` *before*
        // booting Vite. Playwright runs webServer before globalSetup, and the
        // Cloudflare plugin only reads .dev.vars at boot, so this can't be
        // done later.
        command: `node e2e/start-dev-server.mjs`,
        url: baseURL,
        // Never reuse: on a dedicated port anything already listening is not
        // ours, and attaching to it would run the suite against the wrong
        // config, the wrong `.dev.vars` and the real Sessionize API.
        reuseExistingServer: false,
        // Generous: first-run dependency optimization plus this being a
        // Cloudflare Worker (not a plain SPA) dev server can take a while
        // under a cold cache or a busy machine.
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
})
