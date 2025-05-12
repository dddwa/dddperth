import { DateTime } from 'luxon'
import type { ConferenceYear } from '../../lib/config-types'

import { optusStadiumVenue } from '../venues/optus-stadium'

export const conference2025: ConferenceYear = {
    year: '2025',
    venue: optusStadiumVenue,

    sessionizeUrl: 'https://sessionize.com/ddd-perth-2025',

    sessions: undefined,

    conferenceDate: DateTime.fromISO('2025-09-20T09:00:00', {
        zone: 'Australia/Perth',
    }),
    agendaPublishedDateTime: DateTime.fromISO('2025-08-11T00:00:00', {
        zone: 'Australia/Perth',
    }),
    cfpDates: {
        opens: DateTime.fromISO('2025-05-05T00:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2025-06-15T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    talkVotingDates: {
        opens: DateTime.fromISO('2025-06-30T00:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2025-07-20T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
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

    importantDates: [],
}
