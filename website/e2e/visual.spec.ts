import { expect, test } from '@playwright/test'
import { FIXTURE_SPONSOR_NAME } from './fixtures/sponsors'
import { HEADER_DATE_STATES, ROUTES, VISUAL_EXPECTED_DAYS_LEFT, VISUAL_MASK_SELECTORS } from './routes'

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
 * container, never on the host. The blog baselines are the exception to
 * "different content": both sides render the fixture posts in
 * `e2e/fixtures/blog/`. Expect a `/core-pull` that changes a template to need
 * a regeneration on both sides.
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
    return name
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
}

/**
 * The date pin (`__devDateOverride`, set per-project in `playwright.config.ts`)
 * has to be verified, not assumed: when the cookie doesn't apply, nothing
 * fails — the app just falls back to the live clock and the baselines resume
 * decaying by a pixel a day. That is exactly how the drift got in, so it is
 * checked once here rather than trusted.
 *
 * `/e2e-content-fixture` is the probe because its "Important Dates" card
 * renders a `DaysLeftPill` counting down to the conference date; at the pinned
 * date that reads a fixed number, and at the live clock it reads today's.
 *
 * The card renders **one pill per configured date window**, not one overall:
 * a fork with CFP, voting and agenda-published windows shows a countdown for
 * each. So this asserts the conference-day countdown *is among* them rather
 * than that it is the only one — the conference date is the single window
 * every conference has, which is what makes `VISUAL_EXPECTED_DAYS_LEFT`
 * meaningful across forks.
 */
test('the visual suite renders at the pinned date, not the live clock', async ({ page }) => {
    await page.goto('/e2e-content-fixture')
    await expect(
        page.getByText(`${VISUAL_EXPECTED_DAYS_LEFT} days left`).first(),
        'the __devDateOverride cookie did not apply — baselines would capture the live clock. ' +
            'Check the cookie domain matches baseURL, and that its value needs no URL-encoding. ' +
            `(Expected the conference-day countdown to read ${VISUAL_EXPECTED_DAYS_LEFT} days ` +
            'at VISUAL_DATE — if the conference date moved, update both in e2e/routes.ts.)',
    ).toBeVisible()
})

/**
 * The home page is the one route with no year in its path, so its sponsor
 * strip would otherwise track whichever sponsors are currently signed and its
 * baselines would move on every sponsor change. `E2E_SPONSOR_FIXTURES` swaps
 * in `e2e/fixtures/sponsors.ts`.
 *
 * Asserted for the same reason as the date pin above: when the seam fails to
 * apply, the page still renders perfectly — just with real sponsors — so the
 * baselines silently go back to tracking live config. That is exactly how this
 * shipped broken the first time; without this assertion the suite reported
 * "72 passed" while the fixtures never loaded.
 */
test('the home page renders fixture sponsors, not the live sponsor list', async ({ page }) => {
    await page.goto('/')
    await expect(
        page.getByRole('img', { name: FIXTURE_SPONSOR_NAME }).first(),
        'the sponsor fixtures did not apply — the home baseline would track the real sponsor ' +
            'list and move whenever a sponsor is signed. Check E2E_SPONSOR_FIXTURES is set by ' +
            'e2e/start-dev-server.mjs and read into AppConfig.useSponsorFixtures.',
    ).toBeVisible()
})

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

/**
 * The header gets its own baseline because `home` is the only full-page
 * capture, and at ~3200px tall its 2% ratio tolerance absorbs a header change
 * whole: replacing a nav link passed every `home` baseline. Scoped to
 * `#header`, the same change is a large share of the image.
 */
test('the site header matches its visual baseline', async ({ page }) => {
    await page.goto('/e2e-content-fixture')
    const header = page.locator('#header')
    await expect(header, 'the #header landmark is missing').toHaveCount(1)
    await expect(header).toHaveScreenshot('site-header.png', { timeout: 30_000 })
})

/**
 * Panda's breakpoints (`panda.config.ts`). Within one breakpoint range the
 * layout rules are fixed while the viewport narrows, so overflow shows up
 * first at the range's narrowest width — the breakpoint itself. Those are
 * checked exactly; everything between is sampled every 8px.
 */
const BREAKPOINTS = [340, 400, 640, 768, 1024, 1280, 1440, 1536]
const SWEEP_WIDTHS = [...new Set([...Array.from({ length: 161 }, (_, i) => 320 + i * 8), ...BREAKPOINTS])].sort(
    (a, b) => a - b,
)

/**
 * The header is the one piece of chrome whose width changes with the
 * conference state (CTAs come and go, Venue swaps in for About), and it has
 * overflowed before: at exactly 1024px with both CTAs the page was 1050px wide
 * and scrolled sideways. Three fixed baseline widths can't see that, so this
 * resizes through every width in each header state and asserts the page never
 * scrolls horizontally.
 *
 * It runs once per browser engine, not once per viewport project: it sets its
 * own widths, and text metrics (which decide whether a row fits) differ by
 * engine. It lives in the visual suite, not the `chromium` project, because
 * only the container is guaranteed to render the real webfont.
 */
for (const state of HEADER_DATE_STATES) {
    test(`no width from 320px to 1600px scrolls horizontally (${state.name})`, async ({
        page,
        context,
        baseURL,
    }, testInfo) => {
        test.skip(!testInfo.project.name.endsWith('-desktop'), 'the sweep sets its own widths; once per engine')
        await context.addCookies([{ name: '__devDateOverride', value: state.date, url: baseURL ?? '' }])
        await page.goto('/e2e-content-fixture')
        await page.waitForLoadState('networkidle').catch(() => {})

        const overflows: string[] = []
        for (const width of SWEEP_WIDTHS) {
            await page.setViewportSize({ width, height: 900 })
            const overflow = await page.evaluate(() => {
                const root = document.documentElement
                if (root.scrollWidth <= root.clientWidth) return null
                // Name the element that sticks out furthest, so a failure says what to fix.
                let widest: Element | null = null
                let right = root.clientWidth
                // Content inside a scrolling or clipping box (a code block) can't widen the page.
                const clipped = (el: Element) => {
                    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                        if (getComputedStyle(p).overflowX !== 'visible') return true
                    }
                    return false
                }
                for (const el of document.body.querySelectorAll('*')) {
                    if (clipped(el)) continue
                    const r = el.getBoundingClientRect().right
                    if (r > right) {
                        right = r
                        widest = el
                    }
                }
                const label = widest
                    ? `${widest.tagName.toLowerCase()}${widest.id ? `#${widest.id}` : ''}` +
                      (widest.closest('#header') ? ' in #header' : '')
                    : 'unknown element'
                return `${root.scrollWidth}px wide (${label} reaches ${Math.round(right)}px)`
            })
            if (overflow) overflows.push(`${width}px: ${overflow}`)
        }

        expect(overflows, `the page scrolls horizontally at ${state.date}:\n${overflows.join('\n')}`).toEqual([])
    })
}
