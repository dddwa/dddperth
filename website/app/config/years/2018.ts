import { DateTime } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

export const conference2018: ConferenceYear = {
    year: '2018',
    conferenceDate: DateTime.fromISO('2022-08-04'),
    ticketPrice: '$60',
    sessionizeUrl: 'https://sessionize.com/dddperth2018',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/fx26jbjt',
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
                name: 'Virtual Gaming Worlds',
                logoUrlDark: '/images/sponsors/vgw-2018.png',
                logoUrlLight: '/images/sponsors/vgw-2018.png',
                website: 'https://www.vgw.co/',
            },
        ],
        gold: [
            {
                name: 'Amazon Web Services',
                logoUrlDark: '/images/sponsors/2018-aws.png',
                logoUrlLight: '/images/sponsors/2018-aws.png',
                website: 'https://aws.amazon.com/',
            },
            {
                name: 'Livehire',
                logoUrlDark: '/images/sponsors/2018-livehire.png',
                logoUrlLight: '/images/sponsors/2018-livehire.png',
                website: 'https://www.livehire.com/',
            },
            {
                name: 'Microsoft',
                logoUrlDark: '/images/sponsors/2018-microsoft.png',
                logoUrlLight: '/images/sponsors/2018-microsoft.png',
                website: 'https://www.microsoft.com/',
            },
        ],
    },
}
