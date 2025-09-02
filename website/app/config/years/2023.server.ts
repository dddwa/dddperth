import { DateTime } from 'luxon'
import type { ConferenceYear } from '~/lib/config-types.server'

import { optusStadiumVenue } from '../venues/optus-stadium'

export const conference2023: ConferenceYear = {
    kind: 'conference',
    year: '2023',
    conferenceDate: DateTime.fromISO('2023-10-07'),
    venue: optusStadiumVenue,
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2023',

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/54hwhbiw',
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: undefined,
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
                logoUrlDarkMode: '/images/sponsors/2023-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-bankwest-light.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2023-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-microsoft-light.png',
                website: 'https://www.microsoft.com/',
                quote: undefined,
            },
            {
                name: 'Woodside',
                logoUrlDarkMode: '/images/sponsors/2023-woodside-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-woodside-light.png',
                website: 'https://www.woodside.com/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2023-insight-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-insight-light.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2023-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Versent',
                logoUrlDarkMode: '/images/sponsors/2023-versent-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-versent-light.png',
                website: 'https://versent.com.au/',
                quote: undefined,
            },
            {
                name: 'Qoria',
                logoUrlDarkMode: '/images/sponsors/2023-qoria-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-qoria-light.png',
                website: 'https://qoria.com/',
                quote: undefined,
            },
            {
                name: 'GitHub',
                logoUrlDarkMode: '/images/sponsors/2023-github-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-github-light.png',
                website: 'https://github.com/',
                quote: undefined,
            },
            {
                name: 'Mantel Group',
                logoUrlDarkMode: '/images/sponsors/2023-mantel-group-dark.svg',
                logoUrlLightMode: '/images/sponsors/2023-mantel-group-light.svg',
                website: 'https://www.mantelgroup.com.au/',
                quote: undefined,
            },
            {
                name: 'Keystart',
                logoUrlDarkMode: '/images/sponsors/2023-keystart-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-keystart-light.png',
                website: 'https://www.keystart.com.au/',
                quote: undefined,
            },
        ],
    },
}
