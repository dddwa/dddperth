import { expect, test } from '@playwright/test'
import { FIXTURE_DATE } from './fixtures/sessionize/model'

for (const forceFallback of [false, true]) {
    test(`date-dependent pages have no browser errors (${forceFallback ? 'forced polyfill' : 'native when available'})`, async ({ context, page, baseURL }) => {
        if (forceFallback) {
            // Must run before any module evaluates: the package selects its
            // implementation once, when it first reads globalThis.Temporal.
            await context.addInitScript(() => {
                Object.defineProperty(globalThis, 'Temporal', { value: undefined, configurable: true })
            })
        }
        await context.addCookies([
            { name: '__devDateOverride', value: `${FIXTURE_DATE}T11:35:00`, url: baseURL ?? 'http://localhost:3801' },
        ])
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(`Uncaught: ${error.message}`))
        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(`Console: ${message.text()}`)
        })
        page.on('response', (response) => {
            if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`)
        })

        for (const route of ['/', '/agenda/2026', '/agenda/my', '/feedback?talk=1271640']) {
            const response = await page.goto(route)
            expect(response?.status(), route).toBe(200)
            await expect(page.locator('h1')).toBeVisible()
            await page.waitForLoadState('networkidle')
            if (forceFallback) {
                expect(await page.evaluate(() => typeof Reflect.get(globalThis, 'Temporal'))).toBe('undefined')
            }
            if (route === '/agenda/2026') {
                // A hydrated interaction proves that the client code ran;
                // successful server-rendered HTML alone would miss failures.
                await page.getByRole('button', { name: /^Add .+ to my agenda$/ }).first().click()
                await expect(page.getByRole('button', { name: /^Remove .+ from my agenda$/ })).toHaveCount(1)
            }
        }
        expect(errors).toEqual([])
    })
}
