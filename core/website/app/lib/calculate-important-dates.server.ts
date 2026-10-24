import { Temporal, conferenceTime } from '~/lib/dates/temporal'
import type { ConferenceYear } from '@ddd/conference-config'
import type { ImportantDate } from './important-dates'

export function calculateImportantDates(year: ConferenceYear): ImportantDate[] {
    const importantDates: ImportantDate[] = []

    if (year.cfpDates) {
        importantDates.push({
            type: 'start-event',
            dateTime: year.cfpDates.opens.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            endDateTime: year.cfpDates.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            event: 'Call for presentations open',
            eventActiveMessage: 'Submit Talk ↗',
            eventActiveHref: '/call-for-presentations',
            eventClosedMessage: 'CFP Closed',
        })
    }

    for (const ticketSale of year.ticketReleases) {
        importantDates.push({
            type: 'start-event',
            dateTime: ticketSale.range.opens.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            endDateTime: ticketSale.range.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            event: `${ticketSale.releaseName} Tickets Open`,
            eventActiveMessage: 'Buy Tickets ↗',
            eventActiveHref: '/tickets',
            eventClosedMessage: 'Ticket Sales Closed',
        })
    }

    if (year.talkVotingDates) {
        importantDates.push({
            type: 'start-event',
            dateTime: year.talkVotingDates.opens.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            endDateTime: year.talkVotingDates.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            event: 'Voting Opens',
            eventClosedMessage: 'Voting Closed',
            eventActiveMessage: 'Vote for Agenda',
            eventActiveHref: '/voting',
        })
    }

    if (year.agendaPublishedDateTime) {
        importantDates.push({
            type: 'important-date',
            dateTime: year.agendaPublishedDateTime.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            event: 'Agenda published',
            eventClosedMessage: 'View Agenda',
            eventClosedHref: '/agenda',
        })
    }

    if (year.conferenceDate) {
        importantDates.push({
            type: 'important-date',
            dateTime: year.conferenceDate.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            event: 'Conference day',
            onDayMessage: 'Important Info',
            onDayHref: '/conference-day',
            eventClosedMessage: 'Conference over',
        })
    }

    return importantDates.sort((a, b) => Temporal.ZonedDateTime.compare(conferenceTime(a.dateTime), conferenceTime(b.dateTime)))
}
