import { DateTime } from 'luxon'
import type { ConferenceYear } from './config-types.server'
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

        importantDates.push({
            type: 'end-event',
            startDateTime: year.cfpDates.opens.toISO(),
            dateTime: year.cfpDates.closes.toISO(),
            event: 'Call for presentations close',
            eventClosedMessage: 'CFP Closed',
        })
    }

    const ticketReleases = year.ticketReleases.map((ticketSale, index): ImportantDate[] => {
        if (index === year.ticketReleases.length - 1) {
            return [
                {
                    type: 'start-event',
                    dateTime: ticketSale.range.opens.toISO(),
                    endDateTime: ticketSale.range.closes.toISO(),
                    event: `${ticketSale.releaseName} Tickets Open`,
                    eventActiveMessage: 'Buy Tickets ↗',
                    eventActiveHref: '/tickets',
                    eventClosedMessage: 'Ticket Sales Closed',
                },
                {
                    type: 'end-event',
                    startDateTime: ticketSale.range.opens.toISO(),
                    dateTime: ticketSale.range.closes.toISO(),
                    event: `Ticket Sales Close`,
                    eventClosedMessage: 'Ticket Sales Closed',
                },
            ]
        }

        return [
            {
                type: 'start-event',
                dateTime: ticketSale.range.opens.toISO(),
                endDateTime: ticketSale.range.closes.toISO(),
                event: `${ticketSale.releaseName} Tickets Open`,
                eventActiveMessage: 'Buy Tickets ↗',
                eventActiveHref: '/tickets',
                eventClosedMessage: 'Ticket Sales Closed',
            },
        ]
    })

    const ticketReleasesFlat = ticketReleases.flat()
    importantDates.push(...ticketReleasesFlat)

    // TODO Drive by config
    // importantDates.push({
    //     type: 'important-date',
    //     dateTime: year.conferenceDate?.set({ hour: 17, minute: 30, second: 0, millisecond: 0 }) ?? DateTime.local(),
    //     event: 'After Party Tickets',
    //     onDayMessage: 'Buy Ticket',
    //     onDayHref: 'https://ti.to/dddperth/2024/with/el5pexoj6m8',
    //     eventClosedMessage: 'After Party Over',
    // })
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
        importantDates.push({
            type: 'end-event',
            startDateTime: year.talkVotingDates.opens.toISO(),
            dateTime: year.talkVotingDates.closes.toISO(),
            event: 'Voting Closes',
            eventClosedMessage: 'Voting Closed',
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
