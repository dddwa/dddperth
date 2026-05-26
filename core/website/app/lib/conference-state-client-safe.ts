import type { ConferenceVenue, TicketInfo, VolunteerForm, Year, YearSponsors } from '@ddd/conference-config'

export type {
    ConferenceVenue,
    Sponsor,
    TicketInfo,
    TitoTicketInfo,
    VolunteerForm,
    Year,
    YearSponsors,
} from '@ddd/conference-config'

export interface ConferenceImportantInformation {
    date: string | undefined
    year: Year
    venue: ConferenceVenue | undefined

    sponsors: YearSponsors

    currentTicketSale:
        | {
              price: string
              closes: string
          }
        | undefined
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

export interface TalkVotingOpen {
    state: Open
    closes: string
}

export interface TalkVotingClosed {
    state: Closed
}

export interface TalkVotingNotOpenYet {
    state: NotOpenYet
    opens: string
    closes: string
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
    talkVoting: TalkVotingOpen | TalkVotingClosed | TalkVotingNotOpenYet
    feedback: NotOpenYet
    agenda: AgendaState

    volunteering: {
        needsVolunteers: boolean
        form: VolunteerForm
    }
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
    talkVoting: TalkVotingClosed
    feedback: Open
    agenda: Published

    volunteering: {
        needsVolunteers: false
        form: undefined
    }
}

/** Conference is over, there is no next conference configured */
export interface AfterConferenceState {
    conferenceState: 'conference-over'

    conference: ConferenceImportantInformation

    callForPapers: CFPClosed
    ticketSales: TicketSalesClosed
    talkVoting: TalkVotingClosed
    feedback: FeedbackState
    agenda: Published

    volunteering: {
        needsVolunteers: false
        form: undefined
    }
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
