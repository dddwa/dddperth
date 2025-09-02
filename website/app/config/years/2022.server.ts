import { DateTime } from 'luxon'
import type { ConferenceYear } from '~/lib/config-types.server'

export const conference2022: ConferenceYear = {
    kind: 'conference',
    year: '2022',
    conferenceDate: DateTime.fromISO('2022-09-10'),
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2022',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/2uxzbaxa',
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
                name: 'Telstra Purple',
                logoUrlDarkMode: '/images/sponsors/2022-telstra-purple-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-telstra-purple-light.png',
                website: 'https://purple.telstra.com',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2022-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-microsoft-light.png',
                website: 'https://docs.microsoft.com/en-au/learn/',
                quote: undefined,
            },
            {
                name: 'Mantel Group',
                logoUrlDarkMode: '/images/sponsors/2022-mantel-group-dark.svg',
                logoUrlLightMode: '/images/sponsors/2022-mantel-group-light.svg',
                website: 'https://mantelgroup.com.au/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'MakerX',
                logoUrlDarkMode: '/images/sponsors/2022-makerx-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-makerx-light.png',
                website: 'https://makerx.com.au',
                quote: undefined,
            },
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2022-insight-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-insight-light.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2022-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Versent',
                logoUrlDarkMode: '/images/sponsors/2022-versent-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-versent-light.png',
                website: 'https://versent.com.au',
                quote: undefined,
            },
            {
                name: 'Twilio',
                logoUrlDarkMode: '/images/sponsors/2022-twilio-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-twilio-light.png',
                website: 'https://www.twilio.com',
                quote: undefined,
            },
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2022-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2022-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Valrose',
                logoUrlDarkMode: '/images/sponsors/2022-valrose-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-valrose-light.png',
                website: 'https://valrose.com.au/',
                quote: undefined,
            },
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2022-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-bankwest-light.png',
                website: 'https://bankwest.com.au',
                quote: undefined,
            },
            {
                name: 'GitHub',
                logoUrlDarkMode: '/images/sponsors/2022-github-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-github-light.png',
                website: 'https://github.com',
                quote: undefined,
            },
            {
                name: 'Auth0',
                logoUrlDarkMode: '/images/sponsors/2022-auth0-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-auth0-light.png',
                website: 'https://auth0.com',
                quote: undefined,
            },
        ],
    },
}
