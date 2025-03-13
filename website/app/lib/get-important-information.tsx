import type { ConferenceImportantInformation, ConferenceYear } from '~/lib/config-types'
import { localeTimeFormat } from '~/lib/dates/formatting'

export function getImportantInformation(yearConfig: ConferenceYear): ConferenceImportantInformation {
    return {
        date: yearConfig.conferenceDate?.toISO(),
        year: yearConfig.year,
        sessions: yearConfig.sessions,
        ticketPrice: yearConfig.ticketPrice,
        votingOpens: yearConfig.talkVotingDates?.opens.toLocaleString(localeTimeFormat),
        sponsors: yearConfig.sponsors,
    }
}
