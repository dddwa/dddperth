import type { ConferenceImportantInformation, ConferenceYear } from '~/lib/config-types'
import { localeTimeFormat } from '~/lib/dates/formatting'
import type { DateTimeProvider } from './dates/date-time-provider.server'

export function getImportantInformation(
    yearConfig: ConferenceYear,
    dateTimeProvider: DateTimeProvider,
): ConferenceImportantInformation {
    const now = dateTimeProvider.nowDate()

    const currentTicketRelease = yearConfig.ticketReleases.find((release) => {
        return now >= release.range.opens && now <= release.range.closes
    })
    return {
        date: yearConfig.conferenceDate?.toISO(),
        year: yearConfig.year,
        sponsors: yearConfig.sponsors,
        sessions: yearConfig.sessions,
        votingOpens: yearConfig.talkVotingDates?.opens.toLocaleString(localeTimeFormat),
        currentTicketSale: currentTicketRelease
            ? { closes: currentTicketRelease.range.closes.toISO(), price: currentTicketRelease.price }
            : undefined,
        venue: yearConfig.venue,
    }
}
