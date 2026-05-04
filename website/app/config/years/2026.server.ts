import { DateTime } from 'luxon'
import type { ConferenceYear } from '~/lib/config-types.server'

import { optusStadiumVenue } from '../venues/optus-stadium'

export const conference2026: ConferenceYear = {
    kind: 'conference',
    year: '2026',
    venue: optusStadiumVenue,

    sessionizeUrl: 'https://sessionize.com/ddd-perth-2026',

    // Endpoints are injected from env (SESSIONIZE_2026_SESSIONS / SESSIONIZE_2026_ALL_SESSIONS)
    // by getYearConfig. Kept private because the unpublished agenda would otherwise leak.
    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: undefined,
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: undefined,
    },

    conferenceDate: DateTime.fromISO('2026-10-03T09:00:00', {
        zone: 'Australia/Perth',
    }),
    agendaPublishedDateTime: DateTime.fromISO('2026-08-24T00:00:00', {
        zone: 'Australia/Perth',
    }),
    cfpDates: {
        opens: DateTime.fromISO('2026-05-05T17:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2026-06-28T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    talkVotingDates: {
        opens: DateTime.fromISO('2026-07-13T00:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2026-07-26T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    ticketReleases: [
        {
            releaseName: 'Early Bird',
            price: '$60',
            range: {
                opens: DateTime.fromISO('2026-04-20T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2026-05-17T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'General',
            price: '$80',
            range: {
                opens: DateTime.fromISO('2026-05-18T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2026-09-06T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'Final Release',
            price: '$100',
            range: {
                opens: DateTime.fromISO('2026-09-07T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2026-10-02T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
    ],

    feedbackOpenUntilDateTime: undefined,

    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2026',
    },

    sponsors: {},

    foodInfo: {
        lunch: [],
    },
}
