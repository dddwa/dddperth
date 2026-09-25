import { expect, test, type Page } from '@playwright/test'
import { DATE_DEPENDENT_ROUTES, FIXTURE_YEAR } from './routes'

/**
 * Building an agenda from the current conference's grid.
 *
 * The talks named here are the fixture's split slot
 * (`e2e/fixtures/sessionize/model.ts`): Fixture Talk 02 runs 10:45-11:30,
 * while the Pelican Room runs Fixture Talk 27 (10:45-11:05) and Fixture Talk
 * 28 (11:10-11:30) beside it.
 *
 * The picked state's contrast is scanned in `date-states.spec.ts`, which runs
 * under both themes; this file runs dark-only.
 */

const addButton = (page: Page, title: string) => page.getByRole('button', { name: `Add ${title} to my agenda` })
const removeButton = (page: Page, title: string) => page.getByRole('button', { name: `Remove ${title} from my agenda` })

test.skip(
    !DATE_DEPENDENT_ROUTES.agendaPublished.date,
    'the current conference has no agendaPublishedDateTime configured',
)

test.beforeEach(async ({ context, page, baseURL }) => {
    await context.addCookies([
        {
            name: '__devDateOverride',
            value: DATE_DEPENDENT_ROUTES.agendaPublished.date as string,
            url: baseURL ?? 'http://localhost:3800',
        },
    ])
    await page.goto(DATE_DEPENDENT_ROUTES.agendaPublished.path)
    // The buttons are server-rendered, so wait for hydration before clicking
    // or the click lands on a button with no handler yet.
    await page.waitForLoadState('networkidle').catch(() => {})
})

test('both short talks in a split slot can be picked', async ({ page }) => {
    await addButton(page, 'Fixture Talk 27').click()
    await addButton(page, 'Fixture Talk 28').click()

    await expect(removeButton(page, 'Fixture Talk 27')).toBeVisible()
    await expect(removeButton(page, 'Fixture Talk 28')).toBeVisible()
})

test('picking the long talk displaces both short talks, and says so', async ({ page }) => {
    await addButton(page, 'Fixture Talk 27').click()
    await addButton(page, 'Fixture Talk 28').click()
    await addButton(page, 'Fixture Talk 02').click()

    await expect(removeButton(page, 'Fixture Talk 02')).toBeVisible()
    await expect(addButton(page, 'Fixture Talk 27')).toBeVisible()
    await expect(addButton(page, 'Fixture Talk 28')).toBeVisible()
    await expect(page.getByRole('status')).toHaveText(
        'Added Fixture Talk 02 to your agenda. Removed Fixture Talk 27 and Fixture Talk 28, which clash with it.',
    )
})

test('picks survive a reload', async ({ page }) => {
    await addButton(page, 'Fixture Talk 02').click()
    await expect(removeButton(page, 'Fixture Talk 02')).toBeVisible()

    await page.reload()

    await expect(removeButton(page, 'Fixture Talk 02')).toBeVisible()
})

test('a pick is reported to the shortlist counter', async ({ page, context }) => {
    const reported = page.waitForResponse((response) => response.url().endsWith('/api/agenda/shortlist'))
    await addButton(page, 'Fixture Talk 02').click()

    const response = await reported
    expect(response.status()).toBe(200)
    expect(response.request().postData()).toContain('action=add')
    // The dedupe id is minted server-side on first pick.
    expect((await context.cookies()).some((cookie) => cookie.name === '__shortlist')).toBe(true)
})

test('a past conference agenda offers no picker', async ({ page }) => {
    await page.goto(`/agenda/${FIXTURE_YEAR}`)

    await expect(page.getByText(/Fixture Talk/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /to my agenda$/ })).toHaveCount(0)
})
