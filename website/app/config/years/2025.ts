import { DateTime } from 'luxon'
import type { ConferenceYear } from '../../lib/config-types'

export const conference2025: ConferenceYear = {
    year: '2025',
    venue: undefined,

    sessionizeUrl: undefined,

    sessions: undefined,

    conferenceDate: DateTime.fromISO('2025-09-20T09:00:00', {
        zone: 'Australia/Perth',
    }),
    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    talkVotingDates: undefined,
    ticketReleases: [
        {
            releaseName: 'Early Bird',
            price: '$60',
            range: {
                opens: DateTime.fromISO('2025-03-13T05:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2025-04-30T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'General',
            // Probably
            price: '$80',
            range: {
                opens: DateTime.fromISO('2025-05-01T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2025-07-31T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'Final Release',
            // Probably
            price: '$100',
            range: {
                opens: DateTime.fromISO('2025-09-01T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2025-09-19T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
    ],
    feedbackOpenUntilDateTime: undefined,

    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2025',
    },

    sponsors: {
        platinum: [],
        gold: [],
        room: [],
        community: [],
    },

    foodInfo: {
        lunch: [],
    },
}
