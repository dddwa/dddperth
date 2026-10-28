import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConferenceConfig, ConferenceYear } from '@ddd/conference-config'
import { conferenceTime } from './dates/temporal'
import { MockDateTimeProvider } from './test-utils/mock-date-time-provider'
import { getCurrentConferenceState } from './conference-state.server'

vi.mock('@conference/config/public', () => ({ conferenceConfigPublic: { timezone: 'Australia/Sydney' } }))
const originalTZ = process.env.TZ
afterEach(() => { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ })

const conference: ConferenceYear = {
    kind: 'conference', year: '2026',
    conferenceDate: conferenceTime('2026-10-04T09:00'),
    agendaPublishedDateTime: conferenceTime('2026-09-20T12:00'),
    cfpDates: undefined,
    ticketReleases: [],
    talkVotingDates: {
        opens: conferenceTime('2026-09-01T00:00'),
        closes: conferenceTime('2026-09-07T00:00'),
    },
    feedbackOpenUntilDateTime: conferenceTime('2026-10-06T00:00'),
    sessionizeUrl: undefined, ticketInfo: undefined, venue: undefined, sessions: undefined, sponsors: {},
}
const config: ConferenceConfig = { conferences: { '2026': conference }, needVolunteers: false, volunteerForm: undefined }
const stateAt = (iso: string) => getCurrentConferenceState(new MockDateTimeProvider(conferenceTime(iso)), config)

describe('Temporal conference boundaries', () => {
    it.each(['UTC', 'America/Los_Angeles', 'Australia/Perth'])('uses the conference calendar day on a DST transition with host %s', (host) => {
        process.env.TZ = host
        expect(stateAt('2026-10-03T23:59:59').conferenceState).toBe('before-conference')
        for (const wallTime of ['00:00', '03:00', '09:00', '23:59:59']) {
            const state = stateAt(`2026-10-04T${wallTime}`)
            expect(state.conferenceState).toBe('conference-day')
            expect(state.conference.date).toBe('2026-10-04')
        }
        expect(stateAt('2026-10-05T00:00').conferenceState).toBe('conference-over')
    })

    it('honours provider overrides at inclusive voting opens and exclusive closes', () => {
        expect(stateAt('2026-08-31T23:59:59').talkVoting.state).toBe('not-open-yet')
        expect(stateAt('2026-09-01T00:00').talkVoting.state).toBe('open')
        expect(stateAt('2026-09-06T23:59:59').talkVoting.state).toBe('open')
        expect(stateAt('2026-09-07T00:00').talkVoting.state).toBe('closed')
    })

    it('opens publication and closes feedback at their exact instants', () => {
        expect(stateAt('2026-09-20T11:59:59').agenda).toBe('not-released')
        expect(stateAt('2026-09-20T12:00').agenda).toBe('published')
        expect(stateAt('2026-10-05T23:59:59').feedback).toBe('open')
        expect(stateAt('2026-10-06T00:00').feedback).toBe('closed')
    })
})
