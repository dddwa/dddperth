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

export interface TitoTicketInfo {
    type: 'tito'
    accountId: string
    eventId: string

    generalTicketSlugs?: string[]
    afterPartyTicketSlugs?: string[]
    afterPartyUpgradeActivityId?: string
}

export type TicketInfo = TitoTicketInfo

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
