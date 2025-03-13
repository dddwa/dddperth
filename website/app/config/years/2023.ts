import { DateTime } from 'luxon'
import type { ConferenceYear } from '../../lib/config-types'

export const conference2023: ConferenceYear = {
    year: '2023',
    conferenceDate: DateTime.fromISO('2023-10-07'),
    venue: undefined,
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2023',

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/54hwhbiw',
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2023',
    },

    sponsors: {
        platinum: [
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2023-bankwest.png',
                logoUrlLightMode: '/images/sponsors/2023-bankwest.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2023-microsoft.png',
                logoUrlLightMode: '/images/sponsors/2023-microsoft.png',
                website: 'https://www.microsoft.com/',
                quote: undefined,
            },
            {
                name: 'Woodside',
                logoUrlDarkMode: '/images/sponsors/2023-woodside.png',
                logoUrlLightMode: '/images/sponsors/2023-woodside.png',
                website: 'https://www.woodside.com/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2023-insight.png',
                logoUrlLightMode: '/images/sponsors/2023-insight.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2023-vgw.png',
                logoUrlLightMode: '/images/sponsors/2023-vgw.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Versent',
                logoUrlDarkMode: '/images/sponsors/2023-versent.png',
                logoUrlLightMode: '/images/sponsors/2023-versent.png',
                website: 'https://versent.com.au/',
                quote: undefined,
            },
            {
                name: 'Qoria',
                logoUrlDarkMode: '/images/sponsors/2023-qoria.png',
                logoUrlLightMode: '/images/sponsors/2023-qoria.png',
                website: 'https://qoria.com/',
                quote: undefined,
            },
            {
                name: 'GitHub',
                logoUrlDarkMode: '/images/sponsors/2023-mantel-group.png',
                logoUrlLightMode: '/images/sponsors/2023-github.png',
                website: 'https://github.com/',
                quote: undefined,
            },
            {
                name: 'Mantel Group',
                logoUrlDarkMode: '/images/sponsors/2023-mantel-group.png',
                logoUrlLightMode: '/images/sponsors/2023-mantel-group.png',
                website: 'https://www.mantelgroup.com.au/',
                quote: undefined,
            },
            {
                name: 'Keystart',
                logoUrlDarkMode: '/images/sponsors/2023-keystart.png',
                logoUrlLightMode: '/images/sponsors/2023-keystart.png',
                website: 'https://www.keystart.com.au/',
                quote: undefined,
            },
        ],
    },
}
