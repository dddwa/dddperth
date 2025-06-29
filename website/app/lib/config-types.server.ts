import type { DateTime } from 'luxon'
import type { ConferenceVenue, TicketInfo, VolunteerForm, Year, YearSponsors } from './conference-state-client-safe'
import type { SessionData, SessionizeConferenceSessions } from './session-info.server'

export interface CancelledConferenceYear {
    kind: 'cancelled'
    year: Year
    cancelledMessage: string
}

export type ConferenceConfigYear = ConferenceYear | CancelledConferenceYear

/**
 * Conference configuration which doesn't necessarily change year on year
 */
export interface ConferenceConfig {
    conferences: Record<Year, ConferenceConfigYear>

    needVolunteers: boolean
    volunteerForm: VolunteerForm
}

export interface DateTimeRange {
    opens: DateTime
    closes: DateTime
}

export interface TicketRelease {
    releaseName: string
    range: DateTimeRange
    price: string
}

/**
 * This year's conference configuration
 */
export interface ConferenceYear {
    kind: 'conference'
    year: Year

    sessionizeUrl: string | undefined

    ticketInfo: TicketInfo | undefined

    conferenceDate: DateTime | undefined
    agendaPublishedDateTime: DateTime | undefined
    cfpDates: DateTimeRange | undefined
    ticketReleases: Array<TicketRelease>
    talkVotingDates: DateTimeRange | undefined
    feedbackOpenUntilDateTime: DateTime | undefined

    venue: ConferenceVenue | undefined

    sessions: SessionizeConferenceSessions | SessionData | undefined

    sponsors: YearSponsors

    foodInfo?: {
        lunch: Array<{
            meal: string
            foodZone: string
            shortCode: string
        }>
    }
}
