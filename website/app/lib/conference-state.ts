import { isSameDay } from 'date-fns'
import {
    CallForPaperStates,
    ConferenceConfig,
    ConferenceState,
    DateRange,
    TalkVotingStates,
    TicketSalesStates,
} from './config-types'
import { DateTimeProvider } from './dates/date-time-provider.server'

export function getCurrentConferenceState(
    dateTimeProvider: DateTimeProvider,
    conference: ConferenceConfig,
): ConferenceState {
    const currentDate = dateTimeProvider.nowDate()

    const [latestConference, previousConference] = Object.entries(conference.conferences)
        .sort(([, a], [, b]) => {
            const dateA = a.conferenceDate ? new Date(a.conferenceDate).getTime() : Infinity
            const dateB = b.conferenceDate ? new Date(b.conferenceDate).getTime() : Infinity
            return dateB - dateA
        })
        .slice(0, 2)

    // No conference date announced yet, but there is a conference coming up
    // We can assume the date announcement is the first thing setup so everything is closed
    if (!latestConference[1].conferenceDate) {
        return {
            conferenceState: 'before-conference',

            conference: {
                date: undefined,
            },
            previousConference:
                previousConference && previousConference[1].conferenceDate
                    ? { date: previousConference[1].conferenceDate.toISOString() }
                    : undefined,
            callForPapersState: getCfpState(currentDate, latestConference[1].cfpDates),
            ticketSales: getTicketSalesState(currentDate, latestConference[1].ticketSalesDates),
            agenda: getAgendaState(currentDate, latestConference[1].agendaPublishedDate),
            talkVoting: getTalkVotingState(currentDate, latestConference[1].talkVotingDates),
            feedback: 'not-open-yet',
        }
    }

    // Conference day!
    if (isSameDay(currentDate, latestConference[1].conferenceDate)) {
        return {
            conferenceState: 'conference-day',
            conference: {
                date: latestConference[1].conferenceDate.toISOString(),
            },
            previousConference:
                previousConference && previousConference[1].conferenceDate
                    ? { date: previousConference[1].conferenceDate.toISOString() }
                    : undefined,

            agenda: 'published',
            feedback: 'open',

            callForPapersState: 'closed',
            ticketSales: 'closed',
            talkVoting: 'closed',
        }
    }

    // Conference is over, and no conference setup yet
    if (currentDate > latestConference[1].conferenceDate) {
        return {
            conferenceState: 'conference-over',
            previousConference: {
                date: latestConference[1].conferenceDate.toISOString(),
            },
            callForPapersState: 'not-open-yet',
            ticketSales: 'not-open-yet',
            agenda: 'not-released',
            talkVoting: 'not-open-yet',
            feedback: getFeedbackState(
                currentDate,
                latestConference[1].feedbackOpenUntilDate,
                latestConference[1].conferenceDate,
            ),
        }
    }

    // Conference is coming up
    return {
        conferenceState: 'before-conference',
        conference: {
            date: latestConference[1].conferenceDate.toISOString(),
        },
        previousConference:
            previousConference && previousConference[1].conferenceDate
                ? { date: previousConference[1].conferenceDate.toISOString() }
                : undefined,
        callForPapersState: getCfpState(currentDate, latestConference[1].cfpDates),
        ticketSales: getTicketSalesState(currentDate, latestConference[1].ticketSalesDates),
        agenda: getAgendaState(currentDate, latestConference[1].agendaPublishedDate),
        talkVoting: getTalkVotingState(currentDate, latestConference[1].talkVotingDates),
        feedback: 'not-open-yet',
    }
}

function getFeedbackState(
    currentDate: Date,
    feedbackOpenUntilDate: Date | undefined,
    conferenceDate: Date,
): 'open' | 'closed' {
    return !feedbackOpenUntilDate || currentDate < conferenceDate
        ? 'closed'
        : currentDate < feedbackOpenUntilDate
          ? 'open'
          : 'closed'
}

function getAgendaState(currentDate: Date, agendaPublishedDate: Date | undefined): 'not-released' | 'published' {
    return !agendaPublishedDate || currentDate < agendaPublishedDate ? 'not-released' : 'published'
}

function getTalkVotingState(currentDate: Date, talkVotingDates: DateRange | undefined): TalkVotingStates {
    return !talkVotingDates || currentDate < talkVotingDates.opens
        ? 'not-open-yet'
        : currentDate < talkVotingDates.closes
          ? 'open'
          : 'closed'
}

function getTicketSalesState(currentDate: Date, ticketSalesDates: DateRange | undefined): TicketSalesStates {
    return !ticketSalesDates || currentDate < ticketSalesDates.opens
        ? 'not-open-yet'
        : currentDate < ticketSalesDates.closes
          ? 'open'
          : 'closed'
}

function getCfpState(currentDate: Date, cfpDates: DateRange | undefined): CallForPaperStates {
    return !cfpDates || currentDate < cfpDates.opens
        ? 'not-open-yet'
        : currentDate < cfpDates.closes
          ? 'open'
          : 'closed'
}
