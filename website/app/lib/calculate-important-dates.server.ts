import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'
import type { ImportantDate } from './important-dates'

export function calculateImportantDates(year: ConferenceYear): ImportantDate[] {
    const importantDates: ImportantDate[] = []

    if (year.cfpDates) {
        importantDates.push({
            type: 'start-event',
            dateTime: year.cfpDates.opens.toISO(),
            endDateTime: year.cfpDates.closes.toISO(),
            event: 'Call for presentations open',
            eventActiveMessage: 'Submit Talk ↗',
            eventActiveHref: '/call-for-presentations',
            eventClosedMessage: 'CFP Closed',
        })
    }

    for (const ticketSale of year.ticketReleases) {
        importantDates.push({
            type: 'start-event',
            dateTime: ticketSale.range.opens.toISO(),
            endDateTime: ticketSale.range.closes.toISO(),
            event: `${ticketSale.releaseName} Tickets Open`,
            eventActiveMessage: 'Buy Tickets ↗',
            eventActiveHref: '/tickets',
            eventClosedMessage: 'Ticket Sales Closed',
        })
    }

    if (year.talkVotingDates) {
        importantDates.push({
            type: 'start-event',
            dateTime: year.talkVotingDates.opens.toISO(),
            endDateTime: year.talkVotingDates.closes.toISO(),
            event: 'Voting Opens',
            eventClosedMessage: 'Voting Closed',
            eventActiveMessage: 'Vote for Agenda',
            eventActiveHref: '/voting',
        })
    }

    if (year.agendaPublishedDateTime) {
        importantDates.push({
            type: 'important-date',
            dateTime: year.agendaPublishedDateTime.toISO(),
            event: 'Agenda published',
            eventClosedMessage: 'View Agenda',
            eventClosedHref: '/agenda',
        })
    }

    if (year.conferenceDate) {
        importantDates.push({
            type: 'important-date',
            dateTime: year.conferenceDate.toISO(),
            event: 'Conference day',
            onDayMessage: 'Important Info',
            onDayHref: '/conference-day',
            eventClosedMessage: 'Conference over',
        })
    }

    return importantDates.sort((a, b) => DateTime.fromISO(a.dateTime).diff(DateTime.fromISO(b.dateTime)).milliseconds)
}
