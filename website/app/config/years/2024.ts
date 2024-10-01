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
        sessionizeEndpoint: 'https://sessionize.com/api/v2/vedvlykn',
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
    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2024',
    },

    sponsors: {
        platinum: [
            {
                name: 'Bankwest',
                website: 'https://www.bankwest.com.au/',
                logoUrl: '/images/sponsors/2024-bankwest.svg',
            },
            {
                name: 'MakerX',
                website: 'https://makerx.com.au/',
                logoUrl: '/images/sponsors/2024-makerx.svg',
            },
        ],
        gold: [
            {
                name: 'Insight',
                website: 'https://au.insight.com/',
                logoUrl: '/images/sponsors/2024-insight.svg',
            },
            {
                name: 'Mantel Group',
                website: 'https://mantelgroup.com.au/',
                logoUrl: '/images/sponsors/2024-mantel-group.svg',
            },
            {
                name: 'Qoria',
                website: 'https://qoria.com/',
                logoUrl: '/images/sponsors/2024-qoria.svg',
            },
            {
                name: 'Telstra / Versent',
                website: 'https://www.telstra.com.au/',
                logoUrl: '/images/sponsors/2024-telstra-versent.svg',
            },
            {
                name: 'Tricentis',
                website: 'https://www.tricentis.com/',
                logoUrl: '/images/sponsors/2024-tricentis.svg',
            },
            {
                name: 'Virtual Gaming Worlds',
                website: 'https://www.vgw.co/',
                logoUrl: '/images/sponsors/2024-vgw.svg',
            },
            {
                name: 'Woodside Energy',
                website: 'https://www.woodside.com/',
                logoUrl: '/images/sponsors/2024-woodside.svg',
            },
        ],
        room: [
            {
                name: 'Microsoft',
                website: 'https://www.microsoft.com/',
                logoUrl: '/images/sponsors/2024-microsoft.svg',
            },
            {
                name: 'SoftwareOne',
                website: 'https://www.softwareone.com/',
                logoUrl: '/images/sponsors/2024-softwareone.svg',
            },
        ],
        digital: [
            {
                name: 'AFG',
                website: 'https://www.afgonline.com.au/',
                logoUrl: '/images/sponsors/2024-afg.svg',
            },
            {
                name: 'Akkodis',
                website: 'https://akkodis.com/',
                logoUrl: '/images/sponsors/2024-akkodis.svg',
            },
            {
                name: 'Interfuze',
                website: 'https://interfuze.com/',
                logoUrl: '/images/sponsors/2024-interfuze.svg',
            },
        ],
    },
}
