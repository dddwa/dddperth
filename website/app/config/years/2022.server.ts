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
                logoUrlDarkMode: '/images/sponsors/2022-telstra-purple.png',
                logoUrlLightMode: '/images/sponsors/2022-telstra-purple.png',
                website: 'https://purple.telstra.com',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2022-microsoft.png',
                logoUrlLightMode: '/images/sponsors/2022-microsoft.png',
                website: 'https://docs.microsoft.com/en-au/learn/',
                quote: undefined,
            },
            {
                name: 'Mantel Group',
                logoUrlDarkMode: '/images/sponsors/2022-mantel-group.png',
                logoUrlLightMode: '/images/sponsors/2022-mantel-group.png',
                website: 'https://mantelgroup.com.au/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'MakerX',
                logoUrlDarkMode: '/images/sponsors/2022-makerx.png',
                logoUrlLightMode: '/images/sponsors/2022-makerx.png',
                website: 'https://makerx.com.au',
                quote: undefined,
            },
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2022-insight.png',
                logoUrlLightMode: '/images/sponsors/2022-insight.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2022-vgw.png',
                logoUrlLightMode: '/images/sponsors/2022-vgw.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Versent',
                logoUrlDarkMode: '/images/sponsors/2022-versent.png',
                logoUrlLightMode: '/images/sponsors/2022-versent.png',
                website: 'https://versent.com.au',
                quote: undefined,
            },
            {
                name: 'Twilio',
                logoUrlDarkMode: '/images/sponsors/2022-twilio.png',
                logoUrlLightMode: '/images/sponsors/2022-twilio.png',
                website: 'https://www.twilio.com',
                quote: undefined,
            },
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2022-aws.png',
                logoUrlLightMode: '/images/sponsors/2022-aws.png',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Valrose',
                logoUrlDarkMode: '/images/sponsors/2022-valrose.png',
                logoUrlLightMode: '/images/sponsors/2022-valrose.png',
                website: 'https://valrose.com.au/',
                quote: undefined,
            },
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2022-bankwest.png',
                logoUrlLightMode: '/images/sponsors/2022-bankwest.png',
                website: 'https://bankwest.com.au',
                quote: undefined,
            },
            {
                name: 'GitHub',
                logoUrlDarkMode: '/images/sponsors/2022-github.png',
                logoUrlLightMode: '/images/sponsors/2022-github.png',
                website: 'https://github.com',
                quote: undefined,
            },
            {
                name: 'Auth0',
                logoUrlDarkMode: '/images/sponsors/2022-auth0.png',
                logoUrlLightMode: '/images/sponsors/2022-auth0.png',
                website: 'https://auth0.com',
                quote: undefined,
            },
        ],
    },
}
