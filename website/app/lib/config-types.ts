import type { DateTime } from 'luxon'
import type { ImportantDate } from './important-dates'

export type Year = `${number}${number}${number}${number}`

export type CancelledConferenceYear = {
    year: Year
    cancelledMessage: string
}

export type ConferenceConfigYear = ConferenceYear | CancelledConferenceYear

/**
 * Conference configuration which doesn't necessarily change year on year
 */
export interface ConferenceConfig {
    name: string
    description: string

    blogDescription: string

    timezone: string
    needVolunteers: boolean

    conferences: Record<Year, ConferenceConfigYear>

    volunteerForm:
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
}

export interface DateTimeRange {
    opens: DateTime
    closes: DateTime
}

export interface TitoTicketInfo {
    type: 'tito'
    accountId: string
    eventId: string

    generalTicketSlugs?: string[]
    afterPartyTicketSlugs?: string[]
    afterPartyUpgradeActivityId?: string
}

export type TicketInfo = TitoTicketInfo

export interface TicketRelease {
    releaseName: string
    range: DateTimeRange
    price: string
}

/**
 * This year's conference configuration
 */
export interface ConferenceYear {
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

    importantDates: ImportantDate[]
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

export interface Sponsor {
    name: string
    logoUrlDarkMode: string
    logoUrlLightMode: string
    website: string
    quote?: string
}

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

export interface ConferenceImportantInformation {
    date: string | undefined
    year: Year
    votingOpens: string | undefined
    venue: ConferenceVenue | undefined

    sessions: SessionizeConferenceSessions | SessionData | undefined

    sponsors: YearSponsors

    currentTicketSale:
        | {
              price: string
              closes: string
          }
        | undefined
}

export interface SessionizeConferenceSessions {
    kind: 'sessionize'

    sessionizeEndpoint: string
}

export interface SessionData {
    kind: 'session-data'

    // TODO
    sessions: unknown
}

export type ConferenceState = BeforeConferenceState | ConferenceDayState | AfterConferenceState

export interface CFPOpen {
    state: Open
    closes: string
    sessionizeUrl: string
}

export interface CFPClosed {
    state: Closed
}

export interface CFPNotOpenYet {
    state: NotOpenYet
    opens: string
}

/**
 * It is confirmed there is a new conference coming up, the date may not be announced yet
 */
export interface BeforeConferenceState {
    conferenceState: 'before-conference' | 'week-before-conference'

    conference: ConferenceImportantInformation
    previousConference: ConferenceImportantInformation | undefined

    callForPapers: CFPOpen | CFPClosed | CFPNotOpenYet
    ticketSales: TicketSalesState
    talkVoting: TalkVotingStates
    feedback: NotOpenYet
    agenda: AgendaState

    needsVolunteers: boolean
}

/**
 * Conference day!
 */
export interface ConferenceDayState {
    conferenceState: 'conference-day'

    conference: ConferenceImportantInformation
    previousConference: ConferenceImportantInformation | undefined

    callForPapers: CFPClosed
    ticketSales: TicketSalesClosed
    talkVoting: Closed
    feedback: Open
    agenda: Published

    needsVolunteers: false
}

/** Conference is over, there is no next conference configured */
export interface AfterConferenceState {
    conferenceState: 'conference-over'

    conference: ConferenceImportantInformation

    callForPapers: CFPClosed
    ticketSales: TicketSalesClosed
    talkVoting: NotOpenYet
    feedback: FeedbackState
    agenda: NotReleased

    needsVolunteers: false
}

//
// State groups
//
export type CallForPaperStates = NotOpenYet | Open | Closed
export type TalkVotingStates = NotOpenYet | Open | Closed
export type AgendaState = NotReleased | Published
export type FeedbackState = Open | Closed

//
// Individual states
//
export type NotOpenYet = 'not-open-yet'
export type Open = 'open'
export type Closed = 'closed'
export type SoldOut = 'sold-out'
export type WaitListOpen = 'wait-list-open'
export type Published = 'published'
export type NotReleased = 'not-released'

export type TicketSalesState =
    | TicketSalesOpen
    | TicketSalesClosed
    | TicketSalesSoldOut
    | TicketSalesWaitListOpen
    | TicketSalesNotOpenYet

export interface TicketSalesOpen {
    state: Open
    closes: string

    ticketInfo: TicketInfo | undefined
}

export interface TicketSalesClosed {
    state: Closed
}

export interface TicketSalesSoldOut {
    state: SoldOut
}

export interface TicketSalesWaitListOpen {
    state: WaitListOpen
}

export interface TicketSalesNotOpenYet {
    state: NotOpenYet
    opens: string | undefined
}
