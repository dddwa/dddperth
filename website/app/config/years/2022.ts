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
    ticketInfo: undefined,

    sponsors: {
        platinum: [
            {
                name: 'Telstra Purple',
                logoUrlDark: '/images/sponsors/2022-telstra-purple.png',
                logoUrlLight: '/images/sponsors/2022-telstra-purple.png',
                website: 'https://purple.telstra.com',
            },
            {
                name: 'Microsoft',
                logoUrlDark: '/images/sponsors/2022-microsoft.png',
                logoUrlLight: '/images/sponsors/2022-microsoft.png',
                website: 'https://docs.microsoft.com/en-au/learn/',
            },
            {
                name: 'Mantel Group',
                logoUrlDark: '/images/sponsors/2022-mantel-group.png',
                logoUrlLight: '/images/sponsors/2022-mantel-group.png',
                website: 'https://mantelgroup.com.au/',
            },
        ],
        gold: [
            {
                name: 'MakerX',
                logoUrlDark: '/images/sponsors/2022-makerx.png',
                logoUrlLight: '/images/sponsors/2022-makerx.png',
                website: 'https://makerx.com.au',
            },
            {
                name: 'Insight',
                logoUrlDark: '/images/sponsors/2022-insight.png',
                logoUrlLight: '/images/sponsors/2022-insight.png',
                website: 'https://au.insight.com/',
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDark: '/images/sponsors/2022-vgw.png',
                logoUrlLight: '/images/sponsors/2022-vgw.png',
                website: 'https://www.vgw.co/',
            },
            {
                name: 'Versent',
                logoUrlDark: '/images/sponsors/2022-versent.png',
                logoUrlLight: '/images/sponsors/2022-versent.png',
                website: 'https://versent.com.au',
            },
            {
                name: 'Twilio',
                logoUrlDark: '/images/sponsors/2022-twilio.png',
                logoUrlLight: '/images/sponsors/2022-twilio.png',
                website: 'https://www.twilio.com',
            },
            {
                name: 'Amazon Web Services',
                logoUrlDark: '/images/sponsors/2022-aws.png',
                logoUrlLight: '/images/sponsors/2022-aws.png',
                website: 'https://aws.amazon.com/',
            },
            {
                name: 'Valrose',
                logoUrlDark: '/images/sponsors/2022-valrose.png',
                logoUrlLight: '/images/sponsors/2022-valrose.png',
                website: 'https://valrose.com.au/',
            },
            {
                name: 'Bankwest',
                logoUrlDark: '/images/sponsors/2022-bankwest.png',
                logoUrlLight: '/images/sponsors/2022-bankwest.png',
                website: 'https://bankwest.com.au',
            },
            {
                name: 'GitHub',
                logoUrlDark: '/images/sponsors/2022-github.png',
                logoUrlLight: '/images/sponsors/2022-github.png',
                website: 'https://github.com',
            },
            {
                name: 'Auth0',
                logoUrlDark: '/images/sponsors/2022-auth0.png',
                logoUrlLight: '/images/sponsors/2022-auth0.png',
                website: 'https://auth0.com',
            },
        ],
    },
}
