import { Temporal } from '~/lib/dates/temporal'
import type { ConferenceConfigYear } from '@ddd/conference-config'
import type { ConferenceImportantInformation } from './conference-state-client-safe'
import type { DateTimeProvider } from './dates/date-time-provider.server'

export function getImportantInformation(
    yearConfig: ConferenceConfigYear,
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
        return Temporal.ZonedDateTime.compare(now, release.range.opens) >= 0 && Temporal.ZonedDateTime.compare(now, release.range.closes) <= 0
    })

    return {
        date: yearConfig.conferenceDate?.toPlainDate().toString(),
        year: yearConfig.year,
        sponsors: yearConfig.sponsors,
        currentTicketSale: currentTicketRelease
            ? { closes: currentTicketRelease.range.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }), price: currentTicketRelease.price }
            : undefined,
        venue: yearConfig.venue,
    }
}
