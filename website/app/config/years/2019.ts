import { DateTime } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

export const conference2019: ConferenceYear = {
    year: '2019',
    conferenceDate: DateTime.fromISO('2019-08-03'),
    ticketPrice: '$60',
    sessionizeUrl: 'https://sessionize.com/dddperth2019',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/9onvkr8n',
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketSalesDates: undefined,
    ticketInfo: undefined,

    sponsors: {
        gold: [
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2019-aws.png',
                logoUrlLightMode: '/images/sponsors/2019-aws.png',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2019-bankwest.png',
                logoUrlLightMode: '/images/sponsors/2019-bankwest.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
            {
                name: 'Hudson',
                logoUrlDarkMode: '/images/sponsors/2019-bankwest.png',
                logoUrlLightMode: '/images/sponsors/2019-bankwest.png',
                website: 'https://au.hudson.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2019-microsoft.png',
                logoUrlLightMode: '/images/sponsors/2019-microsoft.png',
                website: 'https://aka.ms/AzureDevDDD19',
                quote: undefined,
            },
            {
                name: 'Modis',
                logoUrlDarkMode: '/images/sponsors/2019-modis.png',
                logoUrlLightMode: '/images/sponsors/2019-modis.png',
                website: 'https://www.modis.com/en-au/',
                quote: undefined,
            },
            {
                name: 'Readify + Kloud',
                logoUrlDarkMode: '/images/sponsors/2019-modis.png',
                logoUrlLightMode: '/images/sponsors/2019-readify-kloud.png',
                website: 'https://readify.net/',
                quote: undefined,
            },
            {
                name: 'Velrada',
                logoUrlDarkMode: '/images/sponsors/2019-velrada.png',
                logoUrlLightMode: '/images/sponsors/2019-velrada.png',
                website: 'https://velrada.com/',
                quote: undefined,
            },
        ],
    },
}
