import { DateTime } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

export const conference2023: ConferenceYear = {
    year: '2023',
    conferenceDate: DateTime.fromISO('2023-10-07'),
    venue: undefined,
    ticketPrice: '$60',
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2023',

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/54hwhbiw',
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketSalesDates: undefined,
}
