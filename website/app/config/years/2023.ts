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

    sponsors: {
        platinum: [
            {
                name: 'Bankwest',
                logoUrl: '/images/sponsors/2023-bankwest.png',
                website: 'https://www.bankwest.com.au/',
            },
            {
                name: 'Microsoft',
                logoUrl: '/images/sponsors/2023-microsoft.png',
                website: 'https://www.microsoft.com/',
            },
            {
                name: 'Woodside',
                logoUrl: '/images/sponsors/2023-woodside.png',
                website: 'https://www.woodside.com/',
            },
        ],
        gold: [
            {
                name: 'Insight',
                logoUrl: '/images/sponsors/2023-insight.png',
                website: 'https://au.insight.com/',
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrl: '/images/sponsors/2023-vgw.png',
                website: 'https://www.vgw.co/',
            },
            {
                name: 'Versent',
                logoUrl: '/images/sponsors/2023-versent.png',
                website: 'https://versent.com.au/',
            },
            {
                name: 'Qoria',
                logoUrl: '/images/sponsors/2023-qoria.png',
                website: 'https://qoria.com/',
            },
            {
                name: 'GitHub',
                logoUrl: '/images/sponsors/2023-github.png',
                website: 'https://github.com/',
            },
            {
                name: 'Mantel Group',
                logoUrl: '/images/sponsors/2023-mantel-group.png',
                website: 'https://www.mantelgroup.com.au/',
            },
            {
                name: 'Keystart',
                logoUrl: '/images/sponsors/2023-keystart.png',
                website: 'https://www.keystart.com.au/',
            },
        ],
    },
}
