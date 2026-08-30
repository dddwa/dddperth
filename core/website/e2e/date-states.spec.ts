import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { DATE_DEPENDENT_ROUTES } from './routes'

/**
 * Conference-state coverage via the dev-only date override.
 *
 * Several states are purely date-driven — CFP open, voting open, agenda
 * published, conference day — and each changes the header's primary CTA and
 * parts of the homepage. Before the override existed, the only way to reach
 * them was the admin date picker, which needs a D1 `auth_allowlist` row and
 * a magic-link login; so in practice these states were never scanned, and a
 * contrast or labelling regression in any of them would ship silently.
 *
 * The override is an unsigned `__devDateOverride` cookie read only under
 * `import.meta.env.DEV` (see `app/lib/dates/dev-date-time-provider.server.ts`).
 * Being a cookie rather than server state, each Playwright worker carries its
 * own date, so these run concurrently with each other and with the rest of
 * the suite.
 *
 * Scope note: this covers states reachable **without external credentials**.
 * The live voting flow needs a Sessionize `allSessionsEndpoint` as well as an
 * in-window date, so `/voting` here asserts the CTA and the page's structure,
 * not the talk-comparison cards — those are unit-tested in
 * `app/components/talk-option-card.test.tsx`. See A11Y_BACKLOG.md.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

interface DateState {
    name: string
    /** ISO datetime, interpreted in the conference timezone. */
    date: string
    /** Header CTA expected to be the primary call to action in this state. */
    expectedCta: RegExp
}

const STATES: DateState[] = [
    { name: 'call for papers open', date: '2026-05-15T10:00:00', expectedCta: /propose a talk/i },
    { name: 'talk voting open', date: '2026-07-15T10:00:00', expectedCta: /vote/i },
    { name: 'agenda published', date: '2026-09-01T10:00:00', expectedCta: /buy tickets/i },
]

for (const state of STATES) {
    test(`homepage during ${state.name} has no WCAG 2.1 AA violations`, async ({ context, page, baseURL }) => {
        await context.addCookies([
            { name: '__devDateOverride', value: state.date, url: baseURL ?? 'http://localhost:3800' },
        ])

        await page.goto('/')
        await page.waitForLoadState('networkidle').catch(() => {})

        // Confirm the override actually took effect — otherwise this would
        // silently re-scan the default state three times and look like
        // coverage it isn't.
        await expect(
            page.getByRole('link', { name: state.expectedCta }).first(),
            `Expected the ${state.name} CTA — did the __devDateOverride cookie apply?`,
        ).toBeVisible()

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
        const violations = results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.map((n) => n.target.join(' ')),
        }))

        expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })
}

test('the date override is per-context, so concurrent workers do not collide', async ({ browser, baseURL }) => {
    // The reason this is a cookie rather than a dev endpoint that mutates
    // server state: two contexts must be able to hold different dates at the
    // same time, or the suite has to run serially.
    const url = baseURL ?? 'http://localhost:3800'
    const [cfp, voting] = await Promise.all([browser.newContext(), browser.newContext()])

    try {
        await cfp.addCookies([{ name: '__devDateOverride', value: '2026-05-15T10:00:00', url }])
        await voting.addCookies([{ name: '__devDateOverride', value: '2026-07-15T10:00:00', url }])

        const [cfpPage, votingPage] = await Promise.all([cfp.newPage(), voting.newPage()])
        await Promise.all([cfpPage.goto('/'), votingPage.goto('/')])

        await expect(cfpPage.getByRole('link', { name: /propose a talk/i }).first()).toBeVisible()
        await expect(votingPage.getByRole('link', { name: /vote/i }).first()).toBeVisible()
    } finally {
        await Promise.all([cfp.close(), voting.close()])
    }
})

test('an invalid override cookie is ignored rather than breaking the page', async ({ context, page, baseURL }) => {
    await context.addCookies([
        { name: '__devDateOverride', value: 'not-a-date', url: baseURL ?? 'http://localhost:3800' },
    ])

    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
})

test('the published 2026 agenda renders fixture data with no WCAG violations', async ({
    context,
    page,
    baseURL,
}) => {
    // The current conference's agenda is both date-gated and Sessionize-fed,
    // so before the date override and the committed fixtures it could only
    // ever render "not announced yet" in a test run.
    await context.addCookies([
        { name: '__devDateOverride', value: DATE_DEPENDENT_ROUTES.agendaPublished.date, url: baseURL ?? 'http://localhost:3800' },
    ])

    await page.goto(DATE_DEPENDENT_ROUTES.agendaPublished.path)
    await page.waitForLoadState('networkidle').catch(() => {})

    // Prove we're looking at the real grid, not the empty state.
    await expect(page.getByText(/Fixture Talk/).first()).toBeVisible()
    await expect(page.locator('a[href*="/talk/"]').first()).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    const violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target.join(' ')),
    }))

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
})
