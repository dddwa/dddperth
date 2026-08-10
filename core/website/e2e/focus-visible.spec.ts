import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

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
        expect(result.visible, `Expected a visible focus indicator on ${result.tag}#${result.id}.${result.className}`).toBe(
            true,
        )
    }

    // Sanity check the loop actually exercised real interactive elements
    // (a broken selector/tab order shouldn't silently pass with 0 checks).
    expect(checked.length).toBeGreaterThan(0)
})

test('the TalkOptionCard voting buttons are keyboard-focusable with a visible outline', async ({ page }) => {
    await page.goto('/voting')
    await page.waitForLoadState('networkidle').catch(() => {})

    // The comparison cards render only once talk pairs are available; if
    // voting isn't open or Sessionize isn't configured in this environment,
    // there's nothing to check here — that state is covered by the axe scan
    // in a11y.spec.ts instead.
    const optionButtons = page.getByRole('button', { name: /option 1|option 2/i })
    const count = await optionButtons.count()
    test.skip(count === 0, 'No talk comparison cards rendered (voting closed or not configured in this environment)')

    // Real keyboard Tab navigation (not `.focus()` — script-triggered focus
    // doesn't reliably trigger `:focus-visible` in Chromium) until we land on
    // one of the "OPTION 1"/"OPTION 2" buttons.
    let landedOnOption = false
    for (let i = 0; i < 40 && !landedOnOption; i++) {
        await page.keyboard.press('Tab')
        landedOnOption = await page.evaluate(
            () => document.activeElement?.textContent?.trim().toUpperCase().startsWith('OPTION') ?? false,
        )
    }
    expect(landedOnOption, 'Could not reach an OPTION button via Tab within 40 stops').toBe(true)

    const result = await focusedElementHasVisibleIndicator(page)
    expect(result?.visible).toBe(true)
})
