import { DateTime } from 'luxon'

export type Year = `${number}${number}${number}${number}`

/**
 * Conference configuration which doesn't necessarily change year on year
 */
export interface ConferenceConfig {
    name: string
    description: string

    blogDescription: string

    timezone: string
    needVolunteers: boolean

    conferences: Record<Year, ConferenceYear>

    importantContacts: {
        police: {
            details: string
            phone: string
            mapUrl: string
        }
        centreAgainstSexualAssault: {
            Details: string
            Phone: string
        }
        emergencyMedical: {
            details: string
            mapUrl: string
        }
        nonEmergencyMedical: {
            details: string
            phone: string
            mapUrl: string
        }
    }

    socials: {
        twitter: {
            id: string
            name: string
        }
        facebook: string
        flickr: string
        youtube: string
        blog: string
        email: string
        mailingList: string
        gitHub: string
        instagram: string
        linkedin: string
    }

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

/**
 * This year's conference configuration
 */
export interface ConferenceYear {
    year: Year

    ticketPrice: string

    sessionizeUrl: string | undefined

    conferenceDate: DateTime | undefined
    agendaPublishedDateTime: DateTime | undefined
    cfpDates: DateTimeRange | undefined
    ticketSalesDates: DateTimeRange | undefined
    talkVotingDates: DateTimeRange | undefined
    feedbackOpenUntilDateTime: DateTime | undefined

    venue: ConferenceVenue | undefined

    sessions: SessionizeConferenceSessions | SessionData | undefined
}

export interface ConferenceVenue {
    name: string
}

export interface ConferenceImportantInformation {
    date: string | undefined
    year: Year
    ticketPrice: string

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
    closes: DateTime
    sessionizeUrl: string
}

export interface CFPClosed {
    state: Closed
}

export interface CFPNotOpenYet {
    state: NotOpenYet
    opens: DateTime
}

/**
 * It is confirmed there is a new conference coming up, the date may not be announced yet
 */
export interface BeforeConferenceState {
    conferenceState: 'before-conference' | 'week-before-conference'

    conference: ConferenceImportantInformation
    previousConference: ConferenceImportantInformation | undefined

    callForPapers: CFPOpen | CFPClosed | CFPNotOpenYet
    ticketSales: TicketSalesStates
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
    ticketSales: Closed
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
    ticketSales: NotOpenYet
    talkVoting: NotOpenYet
    feedback: FeedbackState
    agenda: NotReleased

    needsVolunteers: false
}

//
// State groups
//
export type CallForPaperStates = NotOpenYet | Open | Closed
export type TicketSalesStates = NotOpenYet | Open | SoldOut | Closed | WaitListOpen
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
