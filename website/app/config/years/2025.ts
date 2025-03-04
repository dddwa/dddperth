import { DateTime } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

export const conference2025: ConferenceYear = {
    year: '2025',
    venue: undefined,

    ticketPrice: '$60',
    sessionizeUrl: undefined,

    sessions: undefined,

    conferenceDate: DateTime.fromISO('2025-09-20'),
    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    talkVotingDates: undefined,
    ticketSalesDates: undefined,
    feedbackOpenUntilDateTime: undefined,

    ticketInfo: undefined,

    sponsors: {
        platinum: [],
        gold: [],
        room: [],
        community: [],
    },

    foodInfo: {
        lunch: [],
    },
}
