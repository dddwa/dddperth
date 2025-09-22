import type { DateTime } from 'luxon'
import type { conferenceConfig, ConferenceYears } from '~/config/conference-config.server'
import type {
    CFPClosed,
    CFPNotOpenYet,
    CFPOpen,
    ConferenceState,
    TalkVotingClosed,
    TalkVotingNotOpenYet,
    TalkVotingOpen,
    TalkVotingStates,
    TicketInfo,
    TicketSalesState,
} from './conference-state-client-safe'
import type { ConferenceConfigYear, ConferenceYear, DateTimeRange, TicketRelease } from './config-types.server'
import type { DateTimeProvider } from './dates/date-time-provider.server'

export function getCurrentConferenceState(
    dateTimeProvider: DateTimeProvider,
    conference: typeof conferenceConfig,
): ConferenceState {
    const currentDate = dateTimeProvider.nowDate()

    const conferenceList = (
        Object.entries(conference.conferences) as Array<[ConferenceYears, ConferenceConfigYear]>
    ).filter((year): year is [ConferenceYears, ConferenceYear] => year[1].kind === 'conference')
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
                venue: latestConference[1].venue,
                currentTicketSale: undefined,
            },
            previousConference:
                previousConference && previousConference[1].conferenceDate
                    ? {
                          date: previousConference[1].conferenceDate.toISO(),
                          year: previousConference[0],
                          sponsors: previousConference[1].sponsors,
                          venue: previousConference[1].venue,
                          currentTicketSale: undefined,
                      }
                    : undefined,
            callForPapers: getCfpState(currentDate, latestConference[1].cfpDates, latestConference[1].sessionizeUrl),
            ticketSales: { state: 'not-open-yet', opens: undefined },
            agenda: getAgendaState(currentDate, latestConference[1].agendaPublishedDateTime),
            talkVoting: getTalkVotingForBeforeConference(currentDate, latestConference[1].talkVotingDates),
            feedback: 'not-open-yet',
            volunteering: {
                needsVolunteers: conference.needVolunteers,
                form: conference.volunteerForm,
            },
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
                venue: latestConference[1].venue,
                currentTicketSale: undefined,
            },
            previousConference:
                previousConference && previousConference[1].conferenceDate
                    ? {
                          date: previousConference[1].conferenceDate.toISODate(),
                          year: previousConference[0],
                          sponsors: previousConference[1].sponsors,
                          venue: previousConference[1].venue,
                          currentTicketSale: undefined,
                      }
                    : undefined,

            agenda: 'published',
            feedback: 'open',

            callForPapers: { state: 'closed' },
            ticketSales: { state: 'closed' },
            talkVoting: {
                state: 'closed',
            },
            volunteering: {
                needsVolunteers: false,
                form: undefined,
            },
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
                venue: latestConference[1].venue,
                currentTicketSale: undefined,
            },
            callForPapers: { state: 'closed' },
            ticketSales: { state: 'closed' },
            agenda: 'published',
            talkVoting: {
                state: 'closed',
            },
            feedback: getFeedbackState(
                currentDate,
                latestConference[1].feedbackOpenUntilDateTime,
                latestConference[1].conferenceDate,
            ),
            volunteering: {
                needsVolunteers: false,
                form: undefined,
            },
        }
    }

    const currentTicketRelease = latestConference[1].ticketReleases.find(
        (release) => currentDate >= release.range.opens && currentDate <= release.range.closes,
    )
    // Conference is coming up
    return {
        conferenceState: 'before-conference',
        conference: {
            date: latestConference[1].conferenceDate.toISODate(),
            year: latestConference[0],
            sponsors: latestConference[1].sponsors,
            venue: latestConference[1].venue,
            currentTicketSale: currentTicketRelease
                ? {
                      closes: currentTicketRelease.range.closes.toISO(),
                      price: currentTicketRelease.price,
                  }
                : undefined,
        },
        previousConference:
            previousConference && previousConference[1].conferenceDate
                ? {
                      date: previousConference[1].conferenceDate.toISODate(),
                      year: previousConference[0],
                      sponsors: previousConference[1].sponsors,
                      venue: previousConference[1].venue,
                      currentTicketSale: undefined,
                  }
                : undefined,
        callForPapers: getCfpState(currentDate, latestConference[1].cfpDates, latestConference[1].sessionizeUrl),
        ticketSales: getTicketSalesState(currentDate, currentTicketRelease, latestConference[1].ticketInfo),
        agenda: getAgendaState(currentDate, latestConference[1].agendaPublishedDateTime),
        talkVoting: getTalkVotingForBeforeConference(currentDate, latestConference[1].talkVotingDates),
        feedback: 'not-open-yet',
        volunteering: {
            needsVolunteers: conference.needVolunteers,
            form: conference.volunteerForm,
        },
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

/** This function assumes an upcoming conference */
function getTicketSalesState(
    currentDate: DateTime,
    ticketRelease: TicketRelease | undefined,
    ticketInfo: TicketInfo | undefined,
): TicketSalesState {
    if (!ticketRelease) {
        return { state: 'not-open-yet', opens: undefined }
    }

    return currentDate < ticketRelease.range.opens
        ? { state: 'not-open-yet', opens: ticketRelease.range?.opens.toISO() }
        : currentDate < ticketRelease.range.closes
          ? { state: 'open', closes: ticketRelease.range.closes.toISO(), ticketInfo }
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

function getTalkVotingForBeforeConference(
    currentDate: DateTime<true>,
    talkVotingDates: DateTimeRange | undefined,
): TalkVotingOpen | TalkVotingClosed | TalkVotingNotOpenYet {
    if (!talkVotingDates) {
        return { state: 'closed' }
    }

    if (currentDate < talkVotingDates.opens) {
        return { state: 'not-open-yet', opens: talkVotingDates.opens.toISO(), closes: talkVotingDates.closes.toISO() }
    }

    if (currentDate < talkVotingDates.closes) {
        return { state: 'open', closes: talkVotingDates.closes.toISO() }
    }

    return { state: 'closed' }
}
