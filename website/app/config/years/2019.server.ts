import { DateTime } from 'luxon'
import type { ConferenceYear } from '~/lib/config-types.server'

export const conference2019: ConferenceYear = {
    kind: 'conference',
    year: '2019',
    conferenceDate: DateTime.fromISO('2019-08-03'),
    sessionizeUrl: 'https://sessionize.com/dddperth2019',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/9onvkr8n',
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
        gold: [
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2019-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2019-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2019-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-bankwest-light.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
            {
                name: 'Hudson',
                logoUrlDarkMode: '/images/sponsors/2019-hudson-dark.svg',
                logoUrlLightMode: '/images/sponsors/2019-hudson-light.svg',
                website: 'https://au.hudson.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2019-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-microsoft-light.png',
                website: 'https://aka.ms/AzureDevDDD19',
                quote: undefined,
            },
            {
                name: 'Modis',
                logoUrlDarkMode: '/images/sponsors/2019-modis-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-modis-light.png',
                website: 'https://www.modis.com/en-au/',
                quote: undefined,
            },
            {
                name: 'Readify + Kloud',
                logoUrlDarkMode: '/images/sponsors/2019-readify-+-kloud-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-readify-+-kloud-light.png',
                website: 'https://readify.net/',
                quote: undefined,
            },
            {
                name: 'Velrada',
                logoUrlDarkMode: '/images/sponsors/2019-velrada-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-velrada-light.png',
                website: 'https://velrada.com/',
                quote: undefined,
            },
        ],
    },
}
