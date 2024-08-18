/**
 * Conference configuration which doesn't necessarily change year on year
 */
export interface ConferenceConfig {
    name: string
    description: string

    blogDescription: string

    timezone: string

    conferences: Record<`${number}${number}${number}${number}`, ConferenceYear>

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

export interface DateRange {
    opens: Date
    closes: Date
}

/**
 * This year's conference configuration
 */
export interface ConferenceYear {
    year: string

    ticketPrice: string

    conferenceDate: Date | undefined
    agendaPublishedDate: Date | undefined
    cfpDates: DateRange | undefined
    ticketSalesDates: DateRange | undefined
    talkVotingDates: DateRange | undefined
    feedbackOpenUntilDate: Date | undefined

    venue: ConferenceVenue | undefined

    sessionizeEndpoint: string | undefined
}

export interface ConferenceVenue {
    name: string
}

export interface ConferenceImportantInformation {
    date: string | undefined
}

export type ConferenceState = BeforeConferenceState | ConferenceDayState | AfterConferenceState

/**
 * It is confirmed there is a new conference coming up, the date may not be announced yet
 */
export interface BeforeConferenceState {
    conferenceState: 'before-conference' | 'week-before-conference'

    conference: ConferenceImportantInformation
    previousConference: ConferenceImportantInformation | undefined

    callForPapersState: CallForPaperStates
    ticketSales: TicketSalesStates
    talkVoting: TalkVotingStates
    feedback: NotOpenYet
    agenda: AgendaState
}

/**
 * Conference day!
 */
export interface ConferenceDayState {
    conferenceState: 'conference-day'

    conference: ConferenceImportantInformation
    previousConference: ConferenceImportantInformation | undefined

    callForPapersState: Closed
    ticketSales: Closed
    talkVoting: Closed
    feedback: Open
    agenda: Published
}

/** Conference is over, there is no next conference configured */
export interface AfterConferenceState {
    conferenceState: 'conference-over'

    previousConference: ConferenceImportantInformation

    callForPapersState: NotOpenYet
    ticketSales: NotOpenYet
    talkVoting: NotOpenYet
    feedback: FeedbackState
    agenda: NotReleased
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
