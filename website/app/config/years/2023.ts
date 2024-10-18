import { DateTime } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

export const conference2023: ConferenceYear = {
    year: '2023',
    conferenceDate: DateTime.fromISO('2023-10-07'),
    venue: undefined,
    ticketPrice: '$60',
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2023',

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/54hwhbiw',
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketSalesDates: undefined,
    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2023',
    },

    sponsors: {
        platinum: [
            {
                name: 'Bankwest',
                logoUrlDark: '/images/sponsors/2023-bankwest.png',
                logoUrlLight: '/images/sponsors/2023-bankwest.png',
                website: 'https://www.bankwest.com.au/',
            },
            {
                name: 'Microsoft',
                logoUrlDark: '/images/sponsors/2023-microsoft.png',
                logoUrlLight: '/images/sponsors/2023-microsoft.png',
                website: 'https://www.microsoft.com/',
            },
            {
                name: 'Woodside',
                logoUrlDark: '/images/sponsors/2023-woodside.png',
                logoUrlLight: '/images/sponsors/2023-woodside.png',
                website: 'https://www.woodside.com/',
            },
        ],
        gold: [
            {
                name: 'Insight',
                logoUrlDark: '/images/sponsors/2023-insight.png',
                logoUrlLight: '/images/sponsors/2023-insight.png',
                website: 'https://au.insight.com/',
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDark: '/images/sponsors/2023-vgw.png',
                logoUrlLight: '/images/sponsors/2023-vgw.png',
                website: 'https://www.vgw.co/',
            },
            {
                name: 'Versent',
                logoUrlDark: '/images/sponsors/2023-versent.png',
                logoUrlLight: '/images/sponsors/2023-versent.png',
                website: 'https://versent.com.au/',
            },
            {
                name: 'Qoria',
                logoUrlDark: '/images/sponsors/2023-qoria.png',
                logoUrlLight: '/images/sponsors/2023-qoria.png',
                website: 'https://qoria.com/',
            },
            {
                name: 'GitHub',
                logoUrlDark: '/images/sponsors/2023-mantel-group.png',
                logoUrlLight: '/images/sponsors/2023-github.png',
                website: 'https://github.com/',
            },
            {
                name: 'Mantel Group',
                logoUrlDark: '/images/sponsors/2023-mantel-group.png',
                logoUrlLight: '/images/sponsors/2023-mantel-group.png',
                website: 'https://www.mantelgroup.com.au/',
            },
            {
                name: 'Keystart',
                logoUrlDark: '/images/sponsors/2023-keystart.png',
                logoUrlLight: '/images/sponsors/2023-keystart.png',
                website: 'https://www.keystart.com.au/',
            },
        ],
    },
}
