import { DateTime, Settings } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

Settings.throwOnInvalid = true
declare module 'luxon' {
    interface TSSettings {
        throwOnInvalid: true
    }
}

export const conference2024: ConferenceYear = {
    year: '2024',
    venue: undefined,

    ticketPrice: '$60',
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2024',

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/54hwhbiw',
    },

    conferenceDate: DateTime.fromISO('2024-11-16'),
    agendaPublishedDateTime: DateTime.fromISO('2024-08-20T17:00:00', {
        zone: 'Australia/Perth',
    }),
    cfpDates: {
        opens: DateTime.fromISO('2024-06-14T08:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2024-07-12T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    talkVotingDates: {
        opens: DateTime.fromISO('2024-07-23T00:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2024-08-06T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    ticketSalesDates: {
        opens: DateTime.fromISO('2024-06-21T08:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2024-11-15T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    feedbackOpenUntilDateTime: DateTime.fromISO('2024-11-21T23:59:59', {
        zone: 'Australia/Perth',
    }),
}
