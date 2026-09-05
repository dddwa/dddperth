import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { DATE_DEPENDENT_ROUTES } from './routes'

/**
 * Live voting flow coverage.
 *
 * This needs two things that used to be unavailable together: an in-window
 * `talkVotingDates` (the dev date override cookie) and talk data (the
 * committed Sessionize fixtures, served by `e2e/start-dev-server.mjs`).
 * With both, the comparison cards render — so `TalkOptionCard`, which was
 * this codebase's most substantive interactive a11y fix and previously only
 * unit-testable, is finally exercised end to end in a real browser.
 *
 * Data comes from `e2e/fixtures/sessionize/all-sessions.json`, so these
 * assertions are stable and never touch the network.
 */

const VOTING_OPEN = DATE_DEPENDENT_ROUTES.votingOpen.date
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
        { name: '__devDateOverride', value: VOTING_OPEN as string, url: baseURL ?? 'http://localhost:3800' },
    ])
})

async function gotoVoting(page: Page) {
    await page.goto('/voting')
    await page.waitForLoadState('networkidle').catch(() => {})
    // The cards render once the first batch resolves.
    await expect(page.getByRole('heading', { name: /which talk would you prefer/i })).toBeVisible()
}

// Needs a voting window in the conference's own config to move the clock
// into; conference-stub's current year deliberately leaves one unset.
test.skip(!DATE_DEPENDENT_ROUTES.votingOpen.date, 'the current conference has no talkVotingDates configured')

test('the live voting flow has no automatically-detectable WCAG 2.1 AA violations', async ({ page }) => {
    await gotoVoting(page)

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    const violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target.join(' ')),
    }))

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
})

test('talk comparison cards are real buttons named after their talk', async ({ page }) => {
    await gotoVoting(page)

    // Named after the talk, not "OPTION 1"/"OPTION 2" — those are the
    // separate vote buttons. An earlier version of this test targeted those
    // by mistake and silently skipped on every run.
    const cards = page.getByRole('button', { name: /Fixture Talk \d+/ })
    await expect(cards).toHaveCount(2)

    for (const card of await cards.all()) {
        expect(await card.evaluate((el) => el.tagName)).toBe('BUTTON')
    }
})

test('a talk card is keyboard-reachable and shows a visible focus indicator', async ({ page }) => {
    await gotoVoting(page)

    const card = page.getByRole('button', { name: /Fixture Talk \d+/ }).first()

    // Real Tab presses: `.focus()` doesn't reliably trigger :focus-visible
    // in Chromium, which is exactly what this asserts.
    let landed = false
    for (let i = 0; i < 40 && !landed; i++) {
        await page.keyboard.press('Tab')
        landed = await page.evaluate(
            () => /Fixture Talk \d+/.test(document.activeElement?.textContent ?? ''),
        )
    }
    expect(landed, 'Could not reach a talk card via Tab within 40 stops').toBe(true)

    const indicator = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el) return null
        const style = getComputedStyle(el)
        const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
        const hasBoxShadow = style.boxShadow !== 'none' && style.boxShadow !== ''
        return hasOutline || hasBoxShadow
    })
    expect(indicator, 'Focused talk card has no visible focus indicator').toBe(true)

    // The focused element should be the card we located, not some other control.
    await expect(card).toBeFocused()
})

test('voting by keyboard advances to the next pair and announces it', async ({ page }) => {
    await gotoVoting(page)

    const liveRegion = page.locator('[role="status"][aria-live="polite"]')
    await expect(liveRegion).toHaveCount(1)

    const firstPair = await page
        .getByRole('button', { name: /Fixture Talk \d+/ })
        .evaluateAll((els) => els.map((e) => e.textContent?.slice(0, 40)).join('|'))

    // Activate a card with the keyboard — the whole point of the
    // div-to-button conversion.
    const card = page.getByRole('button', { name: /Fixture Talk \d+/ }).first()
    await card.focus()
    await page.keyboard.press('Enter')

    // The announcement must survive long enough to be read; it's held in its
    // own state rather than tied to the 200ms visual feedback.
    await expect(liveRegion).toHaveText(/vote recorded/i)

    await expect
        .poll(
            async () =>
                page
                    .getByRole('button', { name: /Fixture Talk \d+/ })
                    .evaluateAll((els) => els.map((e) => e.textContent?.slice(0, 40)).join('|')),
            { message: 'Expected a new pair of talks after voting' },
        )
        .not.toBe(firstPair)
})
