import { DateTime } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

export const conference2022: ConferenceYear = {
    year: '2022',
    conferenceDate: DateTime.fromISO('2022-10-07'),
    ticketPrice: '$60',

    venue: undefined,

    sessions: undefined,

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketSalesDates: undefined,
}
