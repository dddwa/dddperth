import { DateTime } from 'luxon'
import type { ConferenceYear } from '../../lib/config-types.server'

export const conference2018: ConferenceYear = {
    kind: 'conference',
    year: '2018',
    conferenceDate: DateTime.fromISO('2022-08-04'),
    sessionizeUrl: 'https://sessionize.com/dddperth2018',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/fx26jbjt',
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
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2018-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2018-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2018-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2018-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Livehire',
                logoUrlDarkMode: '/images/sponsors/2018-livehire-dark.png',
                logoUrlLightMode: '/images/sponsors/2018-livehire-light.png',
                website: 'https://www.livehire.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2018-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2018-microsoft-light.png',
                website: 'https://www.microsoft.com/',
                quote: undefined,
            },
        ],
    },
}
