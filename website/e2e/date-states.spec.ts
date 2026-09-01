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
 * The dates come from the active conference's own config, not a calendar
 * hardcoded here — core owns the *states*, a fork owns *when* they happen. A
 * state whose window the conference leaves undefined is skipped rather than
 * failed: `conference-stub`'s current year is deliberately a "save the date"
 * skeleton with no CFP, voting or agenda-published window, so there is no
 * moment for the clock to land inside and no CTA to assert.
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

/**
 * **Fork-owned.** Core owns the states; a conference owns when they happen,
 * so each date must fall inside that conference's own window. An empty list
 * — `conference-stub`'s current year configures no CFP, voting or
 * agenda-published window — means these tests skip rather than fail.
 */
const STATES: DateState[] = []

test.skip(STATES.length === 0, 'the current conference configures no date-driven states')
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

// Needs two distinct configured states to tell apart; a conference with
// fewer (conference-stub has none) has nothing to prove here.
test.skip(STATES.length < 2, 'needs at least two configured date states')
test('the date override is per-context, so concurrent workers do not collide', async ({ browser, baseURL }) => {
    // The reason this is a cookie rather than a dev endpoint that mutates
    // server state: two contexts must be able to hold different dates at the
    // same time, or the suite has to run serially.
    const url = baseURL ?? 'http://localhost:3800'
    const [first, second] = STATES
    const [oneCtx, twoCtx] = await Promise.all([browser.newContext(), browser.newContext()])

    try {
        await oneCtx.addCookies([{ name: '__devDateOverride', value: first.date, url }])
        await twoCtx.addCookies([{ name: '__devDateOverride', value: second.date, url }])

        const [onePage, twoPage] = await Promise.all([oneCtx.newPage(), twoCtx.newPage()])
        await Promise.all([onePage.goto('/'), twoPage.goto('/')])

        await expect(onePage.getByRole('link', { name: first.expectedCta }).first()).toBeVisible()
        await expect(twoPage.getByRole('link', { name: second.expectedCta }).first()).toBeVisible()
    } finally {
        await Promise.all([oneCtx.close(), twoCtx.close()])
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

test.skip(
    !DATE_DEPENDENT_ROUTES.agendaPublished.date,
    'the current conference has no agendaPublishedDateTime configured',
)
test('the published agenda renders fixture data with no WCAG violations', async ({
    context,
    page,
    baseURL,
}) => {
    // The current conference's agenda is both date-gated and Sessionize-fed,
    // so before the date override and the committed fixtures it could only
    // ever render "not announced yet" in a test run.
    await context.addCookies([
        {
            name: '__devDateOverride',
            value: DATE_DEPENDENT_ROUTES.agendaPublished.date as string,
            url: baseURL ?? 'http://localhost:3800',
        },
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
