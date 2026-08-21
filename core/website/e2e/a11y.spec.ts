import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * WCAG 2.1 AA automated regression suite (see CLAUDE.md's Accessibility
 * section and core/website/A11Y_BACKLOG.md).
 *
 * Scope: the key public-facing routes named in the a11y audit — home,
 * agenda, sponsors, blog, and the voting flow — plus one MDX content page
 * as a representative of the `/about`, `/faq`, `/code-of-conduct`, etc.
 * family, which all render through the same `lib/mdx.tsx` component map.
 *
 * This intentionally does not cover /admin or /portal (sponsor portal) —
 * see A11Y_BACKLOG.md for why those are deprioritised for this pass.
 *
 * Each route is scanned with axe's wcag2a + wcag2aa + wcag21aa + wcag22aa
 * rule tags. Any violation an audit pass didn't fix is expected to show up
 * here — that's intentional; see A11Y_BACKLOG.md for what's already known
 * and tracked. The CI step running this suite is `continue-on-error: true`
 * for now (see .github/workflows/pr.yml) precisely so it can report those
 * known issues without blocking merges until the backlog is worked through.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

const ROUTES = [
    { name: 'home', path: '/' },
    { name: 'agenda', path: '/agenda' },
    { name: 'sponsors', path: '/sponsors' },
    { name: 'blog index', path: '/blog' },
    { name: 'voting', path: '/voting' },
    { name: 'about (MDX content page)', path: '/about' },
]

for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has no automatically-detectable WCAG 2.1 AA violations`, async ({
        page,
    }) => {
        await page.goto(route.path)
        // Let client-side data fetching (e.g. the voting page's initial batch
        // load) settle before scanning, so we're not just asserting against a
        // loading spinner.
        await page.waitForLoadState('networkidle').catch(() => {
            // Some routes keep a background connection open (voting
            // prefetch); don't fail the test over that.
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

test('home page has exactly one <main> landmark and a working skip link', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('main#main')).toHaveCount(1)

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

test('home page has exactly one h1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveCount(1)
})
