import { expect, test } from '@playwright/test'

/**
 * Visual regression suite. Runs only under the `visual-*` projects defined
 * in playwright.config.ts (3 browser engines x 3 viewport widths — see
 * that file for why axe/focus-visible don't also run under this matrix).
 *
 * Baseline images live in `e2e/__screenshots__/` and are committed to the
 * repo. This suite exists specifically to prove the WCAG 2.1 AA fixes in
 * this branch (landmarks, heading-level changes, the TalkOptionCard
 * div-to-button conversion, nav/skip-link changes, etc.) didn't change how
 * any page actually looks — a11y markup changes should be invisible to a
 * sighted user. Update baselines deliberately (`pnpm exec playwright test
 * e2e/visual.spec.ts --update-snapshots`) whenever a real visual change is
 * intended, and review the diff like any other code change.
 */

const ROUTES = [
    { name: 'home', path: '/' },
    { name: 'agenda', path: '/agenda' },
    { name: 'sponsors', path: '/sponsors' },
    { name: 'blog-index', path: '/blog' },
    { name: 'voting', path: '/voting' },
    { name: 'about', path: '/about' },
]

for (const route of ROUTES) {
    test(`${route.name} (${route.path}) matches its visual baseline`, async ({ page }) => {
        await page.goto(route.path)
        await page.waitForLoadState('networkidle').catch(() => {
            // Some routes (voting) keep a background connection open; that's
            // fine, we only need the initial render settled.
        })
        // Scroll-linked (not time-based) hero parallax and any
        // viewport-triggered fade-ins need a moment to settle after
        // Playwright's full-page capture scrolls through the document.
        await page.waitForTimeout(300)

        await expect(page).toHaveScreenshot(`${route.name}.png`, { fullPage: true })
    })
}
