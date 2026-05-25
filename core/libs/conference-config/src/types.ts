import type { DateTime } from 'luxon'
import type { z } from 'zod'
import type { gridSmartSchema } from './sessionize-schema'

export type Year = `${number}${number}${number}${number}`

export interface ConferenceVenue {
    name: string
    address: {
        streetAddress: string
        addressLocality: string
        addressRegion: string
        postalCode: string
        addressCountry: string
    }

    latitude: number
    longitude: number
}

export interface Sponsor {
    name: string
    logoUrlDarkMode: string
    logoUrlLightMode: string
    website: string
    quote?: string
}

export interface YearSponsors {
    platinum?: Sponsor[]
    gold?: Sponsor[]
    silver?: Sponsor[]
    digital?: Sponsor[]
    bronze?: Sponsor[]
    community?: Sponsor[]
    coffeeCart?: Sponsor[]
    quietRoom?: Sponsor[]

    keynotes?: Sponsor[]
    room?: Array<Sponsor & { roomName: string }>
}

export interface TitoTicketInfo {
    type: 'tito'
    accountId: string
    eventId: string
}

export type TicketInfo = TitoTicketInfo

export type VolunteerForm =
    | {
          type: 'salesmate'
          formId: string
          linkName: string
      }
    | {
          type: 'tito'
          ticketUrl: string
      }
    | undefined

export interface SessionizeConferenceSessions {
    kind: 'sessionize'
    sessionizeEndpoint: string | undefined
    allSessionsEndpoint: string | undefined
    underrepresentedGroupsQuestionId: number | undefined
}

export interface SessionData {
    kind: 'session-data'
    sessions: z.infer<typeof gridSmartSchema>
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
