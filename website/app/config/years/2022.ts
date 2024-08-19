import { DateTime } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

export const conference2022: ConferenceYear = {
    year: '2022',
    conferenceDate: DateTime.fromISO('2022-09-10'),
    ticketPrice: '$60',
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2022',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/2uxzbaxa',
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketSalesDates: undefined,

    sponsors: {
        platinum: [
            {
                name: 'Telstra Purple',
                logoUrl: '/images/sponsors/2022-telstra-purple.png',
                website: 'https://purple.telstra.com',
            },
            {
                name: 'Microsoft',
                logoUrl: '/images/sponsors/2022-microsoft.png',
                website: 'https://docs.microsoft.com/en-au/learn/',
            },
            {
                name: 'Mantel Group',
                logoUrl: '/images/sponsors/2022-mantel-group.png',
                website: 'https://mantelgroup.com.au/',
            },
        ],
        gold: [
            {
                name: 'MakerX',
                logoUrl: '/images/sponsors/2022-makerx.png',
                website: 'https://makerx.com.au',
            },
            {
                name: 'Insight',
                logoUrl: '/images/sponsors/2022-insight.png',
                website: 'https://au.insight.com/',
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrl: '/images/sponsors/2022-vgw.png',
                website: 'https://www.vgw.co/',
            },
            {
                name: 'Versent',
                logoUrl: '/images/sponsors/2022-versent.png',
                website: 'https://versent.com.au',
            },
            {
                name: 'Twilio',
                logoUrl: '/images/sponsors/2022-twilio.png',
                website: 'https://www.twilio.com',
            },
            {
                name: 'Amazon Web Services',
                logoUrl: '/images/sponsors/2022-aws.png',
                website: 'https://aws.amazon.com/',
            },
            {
                name: 'Valrose',
                logoUrl: '/images/sponsors/2022-valrose.png',
                website: 'https://valrose.com.au/',
            },
            {
                name: 'Bankwest',
                logoUrl: '/images/sponsors/2022-bankwest.png',
                website: 'https://bankwest.com.au',
            },
            {
                name: 'GitHub',
                logoUrl: '/images/sponsors/2022-github.png',
                website: 'https://github.com',
            },
            {
                name: 'Auth0',
                logoUrl: '/images/sponsors/2022-auth0.png',
                website: 'https://auth0.com',
            },
        ],
    },
}
