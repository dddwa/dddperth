import { fromZonedTime } from 'date-fns-tz'
import { ConferenceYear } from '../../lib/config-types'

export const conference2024: ConferenceYear = {
    year: '2024',
    venue: undefined,

    ticketPrice: '$60',

    sessionizeEndpoint: 'https://sessionize.com/api/v2/54hwhbiw',

    conferenceDate: fromZonedTime('2024-11-16T08:00', '+08:00'),
    agendaPublishedDate: fromZonedTime('2024-08-20T17:00:00', '+08:00'),
    cfpDates: {
        opens: fromZonedTime('2024-06-14T08:00:00', '+08:00'),
        closes: fromZonedTime('2024-07-12T23:59:59', '+08:00'),
    },
    talkVotingDates: {
        opens: fromZonedTime('2024-07-23T00:00:00', '+08:00'),
        closes: fromZonedTime('2024-08-06T23:59:59', '+08:00'),
    },
    ticketSalesDates: {
        opens: fromZonedTime('2024-06-21T08:00:00', '+08:00'),
        closes: fromZonedTime('2024-11-15T23:59:59', '+08:00'),
    },
    feedbackOpenUntilDate: fromZonedTime('2024-11-21T23:59:59', '+08:00'),
}
