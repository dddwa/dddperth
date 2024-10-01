import { DateTime } from 'luxon'

export type Year = `${number}${number}${number}${number}`

export type ConferenceConfigYear =
    | ConferenceYear
    | {
          year: Year
          cancelledMessage: string
      }

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
}

export type TicketInfo = TitoTicketInfo

/**
 * This year's conference configuration
 */
export interface ConferenceYear {
    year: Year

    ticketPrice: string

    sessionizeUrl: string | undefined

    ticketInfo: TicketInfo | undefined

    conferenceDate: DateTime | undefined
    agendaPublishedDateTime: DateTime | undefined
    cfpDates: DateTimeRange | undefined
    ticketSalesDates: DateTimeRange | undefined
    talkVotingDates: DateTimeRange | undefined
    feedbackOpenUntilDateTime: DateTime | undefined

    venue: ConferenceVenue | undefined

    sessions: SessionizeConferenceSessions | SessionData | undefined

    sponsors: YearSponsors
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
    room?: Sponsor[]
}

export interface Sponsor {
    name: string
    logoUrl: string
    website: string
}

export interface ConferenceVenue {
    name: string
}

export interface ConferenceImportantInformation {
    date: string | undefined
    year: Year
    ticketPrice: string
    votingOpens: string | undefined

    sessions: SessionizeConferenceSessions | SessionData | undefined
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
