import { DateTime } from 'luxon'
import {
    CFPClosed,
    CFPNotOpenYet,
    CFPOpen,
    ConferenceConfig,
    ConferenceConfigYear,
    ConferenceState,
    ConferenceYear,
    DateTimeRange,
    TalkVotingStates,
    TicketSalesState,
    Year,
} from './config-types'
import { DateTimeProvider } from './dates/date-time-provider.server'
import { localeTimeFormat } from './dates/formatting'

export function getCurrentConferenceState(
    dateTimeProvider: DateTimeProvider,
    conference: ConferenceConfig,
): ConferenceState {
    const currentDate = dateTimeProvider.nowDate()

    const conferenceList = (Object.entries(conference.conferences) as Array<[Year, ConferenceConfigYear]>).filter(
        (year): year is [Year, ConferenceYear] => !('cancelledMessage' in year[1]),
    )
    const [latestConference, previousConference] = conferenceList
        .sort(([, a], [, b]) => {
            const dateA = a.conferenceDate?.valueOf() ?? Infinity
            const dateB = b.conferenceDate?.valueOf() ?? Infinity
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
                year: latestConference[0],
                sponsors: latestConference[1].sponsors,
                sessions: latestConference[1].sessions,
                ticketPrice: latestConference[1].ticketPrice,
                votingOpens: latestConference[1].talkVotingDates?.opens.toLocaleString(localeTimeFormat),
            },
            previousConference:
                previousConference && previousConference[1].conferenceDate
                    ? {
                          date: previousConference[1].conferenceDate.toISO(),
                          year: previousConference[0],
                          sponsors: previousConference[1].sponsors,
                          sessions: previousConference[1].sessions,
                          ticketPrice: previousConference[1].ticketPrice,
                          votingOpens: previousConference[1].talkVotingDates?.opens.toLocaleString(localeTimeFormat),
                      }
                    : undefined,
            callForPapers: getCfpState(currentDate, latestConference[1].cfpDates, latestConference[1].sessionizeUrl),
            ticketSales: getTicketSalesState(currentDate, latestConference[1]),
            agenda: getAgendaState(currentDate, latestConference[1].agendaPublishedDateTime),
            talkVoting: getTalkVotingState(currentDate, latestConference[1].talkVotingDates),
            feedback: 'not-open-yet',
            needsVolunteers: conference.needVolunteers,
        }
    }

    // Conference day!
    if (
        currentDate.hasSame(latestConference[1].conferenceDate, 'day') &&
        currentDate.hasSame(latestConference[1].conferenceDate, 'year')
    ) {
        return {
            conferenceState: 'conference-day',
            conference: {
                date: latestConference[1].conferenceDate.toISODate(),
                year: latestConference[0],
                sponsors: latestConference[1].sponsors,
                sessions: latestConference[1].sessions,
                ticketPrice: latestConference[1].ticketPrice,
                votingOpens: latestConference[1].talkVotingDates?.opens.toLocaleString(localeTimeFormat),
            },
            previousConference:
                previousConference && previousConference[1].conferenceDate
                    ? {
                          date: previousConference[1].conferenceDate.toISODate(),
                          year: previousConference[0],
                          sponsors: previousConference[1].sponsors,
                          sessions: previousConference[1].sessions,
                          ticketPrice: previousConference[1].ticketPrice,
                          votingOpens: previousConference[1].talkVotingDates?.opens.toLocaleString(localeTimeFormat),
                      }
                    : undefined,

            agenda: 'published',
            feedback: 'open',

            callForPapers: { state: 'closed' },
            ticketSales: { state: 'closed' },
            talkVoting: 'closed',
            needsVolunteers: false,
        }
    }

    // Conference is over, and no conference setup yet
    if (currentDate > latestConference[1].conferenceDate) {
        return {
            conferenceState: 'conference-over',
            conference: {
                date: latestConference[1].conferenceDate.toISODate(),
                year: latestConference[0],
                sponsors: latestConference[1].sponsors,
                sessions: latestConference[1].sessions,
                ticketPrice: latestConference[1].ticketPrice,
                votingOpens: latestConference[1].talkVotingDates?.opens.toLocaleString(localeTimeFormat),
            },
            callForPapers: { state: 'closed' },
            ticketSales: { state: 'closed' },
            agenda: 'not-released',
            talkVoting: 'not-open-yet',
            feedback: getFeedbackState(
                currentDate,
                latestConference[1].feedbackOpenUntilDateTime,
                latestConference[1].conferenceDate,
            ),
            needsVolunteers: false,
        }
    }

    // Conference is coming up
    return {
        conferenceState: 'before-conference',
        conference: {
            date: latestConference[1].conferenceDate.toISODate(),
            year: latestConference[0],
            sponsors: latestConference[1].sponsors,
            sessions: latestConference[1].sessions,
            ticketPrice: latestConference[1].ticketPrice,
            votingOpens: latestConference[1].talkVotingDates?.opens.toLocaleString(localeTimeFormat),
        },
        previousConference:
            previousConference && previousConference[1].conferenceDate
                ? {
                      date: previousConference[1].conferenceDate.toISODate(),
                      year: previousConference[0],
                      sponsors: previousConference[1].sponsors,
                      sessions: previousConference[1].sessions,
                      ticketPrice: previousConference[1].ticketPrice,
                      votingOpens: previousConference[1].talkVotingDates?.opens.toLocaleString(localeTimeFormat),
                  }
                : undefined,
        callForPapers: getCfpState(currentDate, latestConference[1].cfpDates, latestConference[1].sessionizeUrl),
        ticketSales: getTicketSalesState(currentDate, latestConference[1]),
        agenda: getAgendaState(currentDate, latestConference[1].agendaPublishedDateTime),
        talkVoting: getTalkVotingState(currentDate, latestConference[1].talkVotingDates),
        feedback: 'not-open-yet',
        needsVolunteers: conference.needVolunteers,
    }
}

function getFeedbackState(
    currentDate: DateTime,
    feedbackOpenUntilDate: DateTime | undefined,
    conferenceDate: DateTime,
): 'open' | 'closed' {
    return !feedbackOpenUntilDate || currentDate < conferenceDate
        ? 'closed'
        : currentDate < feedbackOpenUntilDate
          ? 'open'
          : 'closed'
}

function getAgendaState(
    currentDate: DateTime,
    agendaPublishedDate: DateTime | undefined,
): 'not-released' | 'published' {
    return !agendaPublishedDate || currentDate < agendaPublishedDate ? 'not-released' : 'published'
}

function getTalkVotingState(currentDate: DateTime, talkVotingDates: DateTimeRange | undefined): TalkVotingStates {
    return !talkVotingDates || currentDate < talkVotingDates.opens
        ? 'not-open-yet'
        : currentDate < talkVotingDates.closes
          ? 'open'
          : 'closed'
}

function getTicketSalesState(currentDate: DateTime, yearConfig: ConferenceYear): TicketSalesState {
    return !yearConfig.ticketSalesDates || currentDate < yearConfig.ticketSalesDates.opens
        ? { state: 'not-open-yet', opens: yearConfig.ticketSalesDates?.opens.toISO() }
        : currentDate < yearConfig.ticketSalesDates.closes
          ? { state: 'open', closes: yearConfig.ticketSalesDates.closes.toISO(), ticketInfo: yearConfig.ticketInfo }
          : { state: 'closed' }
}

function getCfpState(
    currentDate: DateTime,
    cfpDates: DateTimeRange | undefined,
    sessionizeUrl: string | undefined,
): CFPOpen | CFPClosed | CFPNotOpenYet {
    return cfpDates && currentDate < cfpDates.opens
        ? { state: 'not-open-yet', opens: cfpDates.opens.toISO() }
        : cfpDates && currentDate < cfpDates.closes && sessionizeUrl
          ? { state: 'open', closes: cfpDates.closes.toISO(), sessionizeUrl }
          : { state: 'closed' }
}
