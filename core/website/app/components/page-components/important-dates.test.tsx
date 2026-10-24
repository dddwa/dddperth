import { afterEach, describe, expect, it } from 'vitest'
import { Settings } from 'luxon'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { ImportantDates } from './important-dates'
import { conferenceDateTime } from '~/lib/dates/conference-date-time'
import type { StandaloneImportantDate } from '~/lib/important-dates'

const originalZone = Settings.defaultZone
afterEach(() => { Settings.defaultZone = originalZone })
const conferenceDay: StandaloneImportantDate = {
    type: 'important-date', dateTime: '2026-10-03T09:00:00+08:00',
    event: 'Conference day', onDayMessage: 'Important Info', onDayHref: '/conference-day',
    eventClosedMessage: 'Conference over',
}

describe('conference-day important dates', () => {
    it.each(['UTC', 'America/Los_Angeles', 'Australia/Perth'])('keeps the on-day link all day with host %s', (host) => {
        Settings.defaultZone = host
        for (const iso of ['2026-10-03T08:00', '2026-10-03T09:00', '2026-10-03T15:00', '2026-10-03T23:59:59']) {
            const html = renderToStaticMarkup(<MemoryRouter><ImportantDates currentDate={conferenceDateTime.fromISO(iso)} importantDates={[conferenceDay]} /></MemoryRouter>)
            expect(html).toContain('Important Info')
        }
        const nextDay = renderToStaticMarkup(<MemoryRouter><ImportantDates currentDate={conferenceDateTime.fromISO('2026-10-04T00:00')} importantDates={[conferenceDay]} /></MemoryRouter>)
        expect(nextDay).not.toContain('Important Info')
    })
})
