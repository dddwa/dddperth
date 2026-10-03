import { expect, type Page, test } from '@playwright/test'
import { FIXTURE_DATE } from './fixtures/sessionize/model'

/**
 * On conference day the agenda offers a "Give feedback" link per talk, but
 * only once that talk has finished: asking for feedback on a talk nobody has
 * seen yet invites noise.
 *
 * The clock is the dev date override, set to just after the first track slot
 * (10:45-11:30 in the fixture timetable) ends and before the second
 * (11:40-12:25) does. The feedback window must already be open then, which
 * holds as long as the conference's date is the fixture date.
 */

const AGENDA = '/agenda/2026'
const NOW = `${FIXTURE_DATE}T11:35:00`

const KEYNOTE = '1276730' // 09:00-09:30
const FIRST_SLOT_TALK = '1240238' // 10:45-11:30
const SECOND_SLOT_TALK = '1271640' // 11:40-12:25

const feedbackLink = (page: Page, talkId: string) => page.locator(`a[href="/feedback?talk=${talkId}"]`)

test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: '__devDateOverride', value: NOW, url: baseURL ?? 'http://localhost:3800' }])
})

test('finished talks offer feedback and talks still to come do not', async ({ page }) => {
    await page.goto(AGENDA)

    // Proves the window is open at all, so the absence below means something.
    await expect(feedbackLink(page, KEYNOTE)).toBeVisible()
    await expect(feedbackLink(page, FIRST_SLOT_TALK)).toBeVisible()
    await expect(feedbackLink(page, SECOND_SLOT_TALK)).toHaveCount(0)
})

test('the talk dialog follows the same rule', async ({ page }) => {
    await page.goto(`${AGENDA}/talk/${SECOND_SLOT_TALK}`)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('link', { name: /give feedback/i })).toHaveCount(0)

    await page.goto(`${AGENDA}/talk/${FIRST_SLOT_TALK}`)
    await expect(page.getByRole('dialog').getByRole('link', { name: /give feedback/i })).toBeVisible()
})

test("a talk's link appears when it ends, without a reload", async ({ page }) => {
    await page.clock.install()
    await page.goto(AGENDA)
    await expect(feedbackLink(page, SECOND_SLOT_TALK)).toHaveCount(0)

    // 11:35 + 55 minutes is past the second slot's 12:25 end.
    await page.clock.runFor('55:00')

    await expect(feedbackLink(page, SECOND_SLOT_TALK)).toBeVisible()
})

test('the server refuses feedback on a talk that has not finished, whatever the page shows', async ({ page }) => {
    // Straight to the action, as a hand-crafted request would: hiding the
    // link is presentation, this is the guarantee.
    const response = await page.request.post('/feedback', {
        form: { kind: 'talk', targetId: SECOND_SLOT_TALK, rating: '5', startedAt: String(Date.now() - 60_000) },
    })

    expect(response.status()).toBe(400)
    expect(await response.text()).toContain('Please choose a talk.')
})
