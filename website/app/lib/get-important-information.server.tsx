import type { conferenceConfig, ConferenceYears } from '~/config/conference-config.server'
import type { ConferenceImportantInformation } from './conference-state-client-safe'
import type { DateTimeProvider } from './dates/date-time-provider.server'

export function getImportantInformation(
    yearConfig: (typeof conferenceConfig.conferences)[ConferenceYears],
    dateTimeProvider: DateTimeProvider,
): ConferenceImportantInformation {
    const now = dateTimeProvider.nowDate()

    if (yearConfig.kind === 'cancelled') {
        return {
            date: undefined,
            year: yearConfig.year,
            sponsors: {},
            currentTicketSale: undefined,
            venue: undefined,
        }
    }

    const currentTicketRelease = yearConfig.ticketReleases.find((release) => {
        return now >= release.range.opens && now <= release.range.closes
    })

    return {
        date: yearConfig.conferenceDate?.toISO(),
        year: yearConfig.year as ConferenceYears,
        sponsors: yearConfig.sponsors,
        currentTicketSale: currentTicketRelease
            ? { closes: currentTicketRelease.range.closes.toISO(), price: currentTicketRelease.price }
            : undefined,
        venue: yearConfig.venue,
    }
}
