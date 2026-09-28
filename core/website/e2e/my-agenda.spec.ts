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

test.describe('/agenda/my', () => {
    test('resolves to the personal agenda rather than being read as a year', async ({ page }) => {
        // `/agenda/my` also matches `/agenda/($year)`; the static route has to
        // win, or this lands on a redirect back to the grid.
        await page.goto('/agenda/my')

        await expect(page).toHaveURL(/\/agenda\/my$/)
        await expect(page.getByRole('heading', { level: 1, name: 'My agenda' })).toBeVisible()
    })

    test('says so when nothing is picked', async ({ page }) => {
        await page.goto('/agenda/my')

        await expect(page.getByText("You haven't picked any talks yet.")).toBeVisible()
    })

    test('lists picks in time order and can remove one', async ({ page }) => {
        // Picked out of order, to prove the page sorts rather than echoing
        // the order they were clicked in.
        await addButton(page, 'Fixture Talk 28').click()
        await addButton(page, 'Fixture Talk 27').click()
        await page.getByRole('link', { name: 'My agenda (2)' }).click()

        const items = page.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2 }) })
        await expect(items).toHaveCount(2)
        await expect(items.nth(0)).toContainText('Fixture Talk 27')
        await expect(items.nth(1)).toContainText('Fixture Talk 28')

        await removeButton(page, 'Fixture Talk 27').click()

        await expect(items).toHaveCount(1)
        await expect(page.getByRole('status')).toHaveText('Removed Fixture Talk 27 from your agenda.')
    })

    test('exports the picks as a calendar file', async ({ page }) => {
        await addButton(page, 'Fixture Talk 27').click()
        await addButton(page, 'Fixture Talk 28').click()
        await page.goto('/agenda/my')

        const download = page.waitForEvent('download')
        await page.getByRole('link', { name: 'Add to calendar (.ics)' }).click()
        const file = await download
        const ics = await (await file.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString())

        expect(file.suggestedFilename()).toMatch(/my-agenda\.ics$/)
        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
        expect(ics).toContain('SUMMARY:Fixture Talk 27')
        expect(ics).toContain('SUMMARY:Fixture Talk 28')
    })
})

test.describe('/agenda/my.ics', () => {
    test('only ever emits talks on the published agenda, whatever ids are asked for', async ({ page }) => {
        // 1240238 is Fixture Talk 02; the rest are a made-up id and a
        // malformed one.
        const response = await page.request.get('/agenda/my.ics?talks=1240238,999999999,<script>')
        const ics = await response.text()

        expect(response.status()).toBe(200)
        expect(response.headers()['content-type']).toContain('text/calendar')
        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
        expect(ics).toContain('SUMMARY:Fixture Talk 02')
    })

    test('404s when none of the ids is a talk on the agenda', async ({ page }) => {
        const response = await page.request.get('/agenda/my.ics?talks=999999999')

        expect(response.status()).toBe(404)
    })
})

test.describe('before the agenda is published', () => {
    test.beforeEach(async ({ context, baseURL }) => {
        // Inside the CFP window: the draft grid may exist in Sessionize, but
        // nothing may be served from it.
        await context.addCookies([
            { name: '__devDateOverride', value: '2026-05-15T10:00:00', url: baseURL ?? 'http://localhost:3800' },
        ])
    })

    test('the calendar export serves nothing, even for a real talk id', async ({ page }) => {
        const response = await page.request.get('/agenda/my.ics?talks=1240238')

        expect(response.status()).toBe(404)
        expect(await response.text()).not.toContain('Fixture Talk')
    })

    test('the shortlist endpoint does not confirm which talk ids exist', async ({ page }) => {
        const response = await page.request.post('/api/agenda/shortlist', {
            form: { year: '2026', talkId: '1240238', action: 'add' },
        })

        expect(response.status()).toBe(400)
    })

    test('the page says the agenda is not announced', async ({ page }) => {
        await page.goto('/agenda/my')

        await expect(page.getByText(/agenda hasn't been announced yet/)).toBeVisible()
    })
})
