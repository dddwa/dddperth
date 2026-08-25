import { expect, test } from '@playwright/test'
import { ROUTES, VISUAL_MASK_SELECTORS } from './routes'

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
 * sighted user. Update baselines deliberately (`pnpm vr --update-snapshots`)
 * whenever a real visual change is intended, and review the diff like any
 * other code change.
 *
 * Two things narrow what each baseline covers, both configured per-route in
 * `routes.ts`:
 *
 *  - `visualScope` clips the capture to a selector (usually `#main`).
 *    `maxDiffPixelRatio` is a *ratio*, so a very tall full-page capture
 *    absorbs proportionally more real regression before it trips.
 *  - `VISUAL_MASK_SELECTORS` paints over sponsor artwork, which changes for
 *    commercial rather than code reasons. Masking (not hiding) keeps layout
 *    intact, so the space a sponsor grid occupies is still compared.
 */

/** Route names contain spaces/parens for readability; filenames shouldn't. */
function snapshotName(name: string) {
    return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

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

        const mask = VISUAL_MASK_SELECTORS.map((selector) => page.locator(selector))
        const name = `${snapshotName(route.name)}.png`

        if (route.visualScope) {
            const target = page.locator(route.visualScope)
            // Fail loudly rather than silently capturing nothing if the
            // selector stops matching — a scoped baseline that quietly
            // becomes empty would agree with itself forever.
            await expect(target, `visualScope "${route.visualScope}" matched no element`).toHaveCount(1)
            await expect(target).toHaveScreenshot(name, { mask })
            return
        }

        // Guard against a silently-truncated capture. If the page is taller
        // than the viewport but the screenshot isn't, `fullPage` didn't take
        // effect — which once produced a whole set of viewport-only baselines
        // that agreed with each other and matched nothing real. Only
        // meaningful for full-page captures; a scoped locator screenshot is
        // expected to be shorter than the document.
        const { scrollHeight, innerHeight } = await page.evaluate(() => ({
            scrollHeight: document.documentElement.scrollHeight,
            innerHeight: window.innerHeight,
        }))

        await expect(page).toHaveScreenshot(name, { fullPage: true, mask })

        if (scrollHeight > innerHeight + 1) {
            const buffer = await page.screenshot({ fullPage: true })
            // PNG IHDR: height is the big-endian uint32 at byte offset 20.
            const capturedHeight = buffer.readUInt32BE(20)
            expect(
                capturedHeight,
                `Expected a full-page capture (~${scrollHeight}px) but got ${capturedHeight}px — ` +
                    'close to the viewport height, so fullPage did not apply.',
            ).toBeGreaterThan(innerHeight + 1)
        }
    })
}
