import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { FIXTURE_YEAR } from './routes'

/**
 * axe's ruleset only catches a handful of focus-related issues (mostly
 * "is this focusable at all") — it doesn't assert that a *visible* focus
 * indicator renders, which is its own WCAG 2.1 AA success criterion
 * (2.4.7 Focus Visible). This suite tabs through real pages with the
 * keyboard (not `.focus()` — script-focus doesn't reliably trigger
 * `:focus-visible` in Chromium) and asserts a visible outline/box-shadow
 * exists on each stop.
 */

async function focusedElementHasVisibleIndicator(page: Page) {
    return page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const style = getComputedStyle(el)
        const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
        const hasBoxShadow = style.boxShadow !== 'none' && style.boxShadow !== ''
        return {
            tag: el.tagName,
            id: el.id,
            className: typeof el.className === 'string' ? el.className : '',
            hasOutline,
            hasBoxShadow,
            visible: hasOutline || hasBoxShadow,
        }
    })
}

test('tabbing through the homepage header shows a visible focus indicator at every stop', async ({ page }) => {
    await page.goto('/')

    // Tab past the skip link into the header's interactive controls (theme
    // toggle, nav links, CTA). Bounded loop rather than a fixed count so this
    // doesn't silently stop checking anything if the header's tab order
    // changes shape.
    const stopsToCheck = 6
    const checked: Array<{ tag: string; visible: boolean }> = []

    for (let i = 0; i < stopsToCheck; i++) {
        await page.keyboard.press('Tab')
        const result = await focusedElementHasVisibleIndicator(page)
        if (!result) continue
        checked.push({ tag: result.tag, visible: result.visible })
        expect(
            result.visible,
            `Expected a visible focus indicator on ${result.tag}#${result.id}.${result.className}`,
        ).toBe(true)
    }

    // Sanity check the loop actually exercised real interactive elements
    // (a broken selector/tab order shouldn't silently pass with 0 checks).
    expect(checked.length).toBeGreaterThan(0)
})

/**
 * Agenda talk links are the densest set of interactive controls on the
 * site, and the agenda grid is a custom CSS-grid (not a real <table>), so
 * its keyboard story is worth asserting directly. Uses a committed
 * `session-data` fixture year, so this runs everywhere without Sessionize.
 */
test('agenda talk links are keyboard-focusable with a visible indicator', async ({ page }) => {
    await page.goto(`/agenda/${FIXTURE_YEAR}`)
    await page.waitForLoadState('networkidle').catch(() => {})

    const talkLinks = page.locator(`a[href*="/agenda/${FIXTURE_YEAR}/talk/"]`)
    // The fixture year genuinely has talks; if this is 0 the fixture broke
    // rather than the environment being unconfigured, so fail rather than skip.
    expect(await talkLinks.count()).toBeGreaterThan(0)

    const first = talkLinks.first()
    await first.evaluate((el) => el.scrollIntoView({ block: 'center' }))

    // Walk the keyboard focus forward until it lands on a talk link. Bounded,
    // and asserted afterwards, so a tab-order regression fails loudly.
    let landed = false
    for (let i = 0; i < 120 && !landed; i++) {
        await page.keyboard.press('Tab')
        landed = await page.evaluate((year) => {
            const el = document.activeElement as HTMLAnchorElement | null
            return !!el && el.tagName === 'A' && (el.getAttribute('href') ?? '').includes(`/agenda/${year}/talk/`)
        }, FIXTURE_YEAR)
    }

    expect(landed, 'Could not reach an agenda talk link via Tab within 120 stops').toBe(true)
    const result = await focusedElementHasVisibleIndicator(page)
    expect(result?.visible, `Expected a visible focus indicator on the focused talk link`).toBe(true)
})
