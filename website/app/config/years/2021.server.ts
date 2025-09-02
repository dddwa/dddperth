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
        underrepresentedGroupsQuestionId: undefined,
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
                logoUrlDarkMode: '/images/sponsors/2021-valrose-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-valrose-light.png',
                website: 'https://valrose.com.au/',
                quote: undefined,
            },
            {
                name: 'Telstra Purple',
                logoUrlDarkMode: '/images/sponsors/2021-telstra-purple-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-telstra-purple-light.png',
                website: 'https://purple.telstra.com/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Octopus Deploy',
                logoUrlDarkMode: '/images/sponsors/2021-octopus-deploy-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-octopus-deploy-light.png',
                website: 'https://octopus.com/',
                quote: undefined,
            },
            {
                name: 'VIX',
                logoUrlDarkMode: '/images/sponsors/2021-vix-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-vix-light.png',
                website: 'https://www.vixtechnology.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2021-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Imdex',
                logoUrlDarkMode: '/images/sponsors/2021-imdex-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-imdex-light.png',
                website: 'https://www.imdexlimited.com/',
                quote: undefined,
            },
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2021-insight-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-insight-light.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2021-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2021-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2021-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-microsoft-light.png',
                website: 'https://www.microsoft.com/en-au/',
                quote: undefined,
            },
        ],
    },
}
