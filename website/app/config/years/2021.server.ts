import { DateTime } from 'luxon'
import type { ConferenceYear } from '~/lib/config-types.server'

export const conference2021: ConferenceYear = {
    kind: 'conference',
    year: '2021',
    conferenceDate: DateTime.fromISO('2021-08-14'),
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2021',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/tj9fupmc',
        allSessionsEndpoint: undefined,
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    ticketInfo: undefined,

    sponsors: {
        platinum: [
            {
                name: 'Valrose',
                logoUrlDarkMode: '/images/sponsors/2021-valrose.png',
                logoUrlLightMode: '/images/sponsors/2021-valrose.png',
                website: 'https://valrose.com.au/',
                quote: undefined,
            },
            {
                name: 'Telstra Purple',
                logoUrlDarkMode: '/images/sponsors/2021-telstra-purple.png',
                logoUrlLightMode: '/images/sponsors/2021-telstra-purple.png',
                website: 'https://purple.telstra.com/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Octopus Deploy',
                logoUrlDarkMode: '/images/sponsors/2021-octopus-deploy.png',
                logoUrlLightMode: '/images/sponsors/2021-octopus-deploy.png',
                website: 'https://octopus.com/',
                quote: undefined,
            },
            {
                name: 'VIX',
                logoUrlDarkMode: '/images/sponsors/2021-vix.png',
                logoUrlLightMode: '/images/sponsors/2021-vix.png',
                website: 'https://www.vixtechnology.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2021-vgw.png',
                logoUrlLightMode: '/images/sponsors/2021-vgw.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Imdex',
                logoUrlDarkMode: '/images/sponsors/2021-imdex.png',
                logoUrlLightMode: '/images/sponsors/2021-imdex.png',
                website: 'https://www.imdexlimited.com/',
                quote: undefined,
            },
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2021-insight.png',
                logoUrlLightMode: '/images/sponsors/2021-insight.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2021-aws.png',
                logoUrlLightMode: '/images/sponsors/2021-aws.png',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2021-microsoft.png',
                logoUrlLightMode: '/images/sponsors/2021-microsoft.png',
                website: 'https://www.microsoft.com/en-au/',
                quote: undefined,
            },
        ],
    },
}
