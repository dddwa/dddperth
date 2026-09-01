import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { ROUTES } from './routes'

/**
 * WCAG 2.1 AA automated regression suite (see CLAUDE.md's Accessibility
 * section and core/website/A11Y_BACKLOG.md).
 *
 * Scope: one route per public-facing template. The route list lives in
 * `./routes.ts` and is shared with the focus-visible and visual suites so
 * coverage can't drift between them. Conference-scoped routes are pinned
 * to a past fixture year — see that file for why.
 *
 * This runs under both the `chromium` (dark, the site default) and
 * `chromium-light` projects — see playwright.config.ts. Theme matters here
 * because axe's `color-contrast` rule evaluates *computed* colours: a
 * palette that passes in dark mode says nothing about the light one, and
 * until now only the default (dark) theme was ever scanned.
 *
 * This intentionally does not cover /admin or /portal (sponsor portal) —
 * see A11Y_BACKLOG.md for why those are deprioritised for this pass.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has no automatically-detectable WCAG 2.1 AA violations`, async ({ page }) => {
        await page.goto(route.path)
        // Let client-side data fetching settle before scanning, so we're not
        // just asserting against a loading spinner.
        await page.waitForLoadState('networkidle').catch(() => {
            // Some routes keep a background connection open; don't fail over that.
        })

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

        const violationSummary = results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            nodes: violation.nodes.map((node) => node.target.join(' ')),
        }))

        expect(violationSummary, JSON.stringify(violationSummary, null, 2)).toEqual([])
    })
}

/**
 * Structural regression checks. These previously ran against the homepage
 * only, while the a11y pass that introduced them added `<h1>`s to the
 * agenda, talk-detail and blog templates — so the templates that actually
 * changed were the ones not asserted on. Now every covered route gets the
 * same structural guarantees.
 */
for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has exactly one <main> landmark and one <h1>`, async ({ page }) => {
        await page.goto(route.path)
        await page.waitForLoadState('networkidle').catch(() => {})

        await expect(page.locator('main#main')).toHaveCount(1)
        await expect(page.locator('h1')).toHaveCount(1)
    })
}

test('the skip link is the first focusable element and points at a real target', async ({ page }) => {
    await page.goto('/')
    // Wait for hydration before pressing Tab: React Router replays the tree on
    // hydration, and a Tab landing mid-hydration moves focus to an element
    // that is then replaced, leaving focus on <body>.
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.locator('#skip-to-content')).toBeAttached()

    // The skip link must be the very first focusable element, and its href
    // must resolve to an element that actually exists (regression test for
    // the previously-broken #main/#header/#navigation targets).
    await page.keyboard.press('Tab')
    const skipLink = page.locator('#skip-to-content')
    await expect(skipLink).toBeFocused()
    const href = await skipLink.getAttribute('href')
    expect(href).toBe('#main')
    await expect(page.locator(href ?? '#main')).toHaveCount(1)
})

/**
 * Regression test for the skip-link/header breakpoint mismatch: the two
 * "Skip to Navigation" links swap at `md` (768px), but the header's
 * hamburger/desktop-nav swap happens at `lg` (1024px). Between those two
 * widths the `#header` link was shown while the nav was still inside the
 * closed drawer — so the link landed somewhere the navigation wasn't
 * reachable, which is the exact failure mode skip links exist to prevent.
 *
 * Asserts the *visible* skip link's target is genuinely reachable at each
 * width, rather than asserting a specific breakpoint value.
 */
for (const width of [390, 768, 900, 1024, 1440]) {
    test(`the visible "Skip to Navigation" link targets reachable navigation at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/')

        const headerLink = page.locator('#skip-to-header')
        const navLink = page.locator('#skip-to-navigation')

        // Exactly one of the two is displayed at any width.
        const headerVisible = await headerLink.isVisible()
        const navVisible = await navLink.isVisible()
        expect(
            headerVisible !== navVisible,
            `Expected exactly one skip-to-navigation variant at ${width}px (header=${headerVisible}, nav=${navVisible})`,
        ).toBe(true)

        const target = headerVisible ? '#header' : '#navigation'
        const targetEl = page.locator(target)
        await expect(targetEl).toHaveCount(1)

        // The point of the link: after following it, the user must be able to
        // reach the navigation. When the desktop nav is collapsed into the
        // drawer, #header is the wrong target — the nav links inside it are
        // not reachable, and the hamburger (#navigation) is.
        const desktopNavVisible = await page.locator('nav[aria-label="Primary"]').isVisible()
        const hamburgerVisible = await page.locator('#navigation').isVisible()

        if (desktopNavVisible) {
            expect(headerVisible, `Desktop nav is visible at ${width}px, so #header is the right skip target`).toBe(true)
        } else {
            expect(
                hamburgerVisible && navVisible,
                `Desktop nav is collapsed at ${width}px, so the skip link must target the hamburger (#navigation), not #header`,
            ).toBe(true)
        }
    })
}
