import { expect, test } from '@playwright/test'
import { ROUTES, VISUAL_MASK_SELECTORS } from './routes'

/**
 * Visual regression suite. Runs only under the `visual-*` projects defined
 * in playwright.config.ts (3 browser engines x 3 viewport widths — see
 * that file for why axe/focus-visible don't also run under this matrix).
 *
 * This suite proves that a11y markup changes (landmarks, heading levels,
 * div-to-button conversions, nav/skip-link changes) don't alter how a page
 * actually looks — such changes should be invisible to a sighted user.
 * Update baselines deliberately (`pnpm vr --update-snapshots`) whenever a
 * real visual change is intended, and review the diff like any other code
 * change.
 *
 * **Baselines are per-conference.** The ones committed here are of
 * conference-stub (DevConf Example) and guard core's own templates. A fork
 * renders different content, sponsors, theme and copy, so it regenerates the
 * whole set against its own conference — `pnpm vr --update-snapshots`, in the
 * container, never on the host — and points `FIXTURE_BLOG_SLUG` in
 * `routes.ts` at one of its own posts. Expect a `/pull-upstream` that changes
 * a template to need a regeneration on both sides.
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
            // Explicit timeout, well above Playwright's 5s default for
            // assertions. Element screenshots of tall elements are markedly
            // slower in WebKit than in Chromium/Firefox: `#main` on the talk
            // detail page is ~4000px and takes ~4.5s to capture there, which
            // sat close enough to the default that the same page passed or
            // failed depending on machine load. Measured, not guessed — the
            // element itself is stable (identical bounding box across repeated
            // reads), so "waiting for element to be stable" timing out was
            // capture cost, not layout instability.
            await expect(target).toHaveScreenshot(name, { mask, timeout: 30_000 })
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

        await expect(page).toHaveScreenshot(name, { fullPage: true, mask, timeout: 30_000 })

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
