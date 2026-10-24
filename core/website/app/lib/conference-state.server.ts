import { Temporal } from '~/lib/dates/temporal'
import type {
    ConferenceConfig,
    ConferenceConfigYear,
    ConferenceYear,
    DateTimeRange,
    TicketRelease,
    Year,
} from '@ddd/conference-config'
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
import type { DateTimeProvider } from './dates/date-time-provider.server'

export function getCurrentConferenceState(
    dateTimeProvider: DateTimeProvider,
    conference: ConferenceConfig,
): ConferenceState {
    const currentDate = dateTimeProvider.nowDate()

    const conferenceList = (
        Object.entries(conference.conferences) as Array<[Year, ConferenceConfigYear]>
    ).filter((year): year is [Year, ConferenceYear] => year[1].kind === 'conference')
    const [latestConference, previousConference] = conferenceList
        .sort(([, a], [, b]) => {
            const dateA = a.conferenceDate?.epochMilliseconds ?? Infinity
            const dateB = b.conferenceDate?.epochMilliseconds ?? Infinity
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
                          date: previousConference[1].conferenceDate.toPlainDate().toString(),
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
        currentDate.toPlainDate().equals(latestConference[1].conferenceDate.toPlainDate())
    ) {
        return {
            conferenceState: 'conference-day',
            conference: {
                date: latestConference[1].conferenceDate.toPlainDate().toString(),
                year: latestConference[0],
                sponsors: latestConference[1].sponsors,
                venue: latestConference[1].venue,
                currentTicketSale: undefined,
            },
            previousConference:
                previousConference && previousConference[1].conferenceDate
                    ? {
                          date: previousConference[1].conferenceDate.toPlainDate().toString(),
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
    if (Temporal.ZonedDateTime.compare(currentDate, latestConference[1].conferenceDate) > 0) {
        return {
            conferenceState: 'conference-over',
            conference: {
                date: latestConference[1].conferenceDate.toPlainDate().toString(),
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
        (release) => Temporal.ZonedDateTime.compare(currentDate, release.range.opens) >= 0 && Temporal.ZonedDateTime.compare(currentDate, release.range.closes) <= 0,
    )
    // Conference is coming up
    return {
        conferenceState: 'before-conference',
        conference: {
            date: latestConference[1].conferenceDate.toPlainDate().toString(),
            year: latestConference[0],
            sponsors: latestConference[1].sponsors,
            venue: latestConference[1].venue,
            currentTicketSale: currentTicketRelease
                ? {
                      closes: currentTicketRelease.range.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
                      price: currentTicketRelease.price,
                  }
                : undefined,
        },
        previousConference:
            previousConference && previousConference[1].conferenceDate
                ? {
                      date: previousConference[1].conferenceDate.toPlainDate().toString(),
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
    currentDate: Temporal.ZonedDateTime,
    feedbackOpenUntilDate: Temporal.ZonedDateTime | undefined,
    conferenceDate: Temporal.ZonedDateTime,
): 'open' | 'closed' {
    return !feedbackOpenUntilDate || Temporal.ZonedDateTime.compare(currentDate, conferenceDate) < 0
        ? 'closed'
        : Temporal.ZonedDateTime.compare(currentDate, feedbackOpenUntilDate) < 0
          ? 'open'
          : 'closed'
}

function getAgendaState(
    currentDate: Temporal.ZonedDateTime,
    agendaPublishedDate: Temporal.ZonedDateTime | undefined,
): 'not-released' | 'published' {
    return !agendaPublishedDate || Temporal.ZonedDateTime.compare(currentDate, agendaPublishedDate) < 0 ? 'not-released' : 'published'
}

function getTalkVotingState(currentDate: Temporal.ZonedDateTime, talkVotingDates: DateTimeRange | undefined): TalkVotingStates {
    return !talkVotingDates || Temporal.ZonedDateTime.compare(currentDate, talkVotingDates.opens) < 0
        ? 'not-open-yet'
        : Temporal.ZonedDateTime.compare(currentDate, talkVotingDates.closes) < 0
          ? 'open'
          : 'closed'
}

/** This function assumes an upcoming conference */
function getTicketSalesState(
    currentDate: Temporal.ZonedDateTime,
    ticketRelease: TicketRelease | undefined,
    ticketInfo: TicketInfo | undefined,
): TicketSalesState {
    if (!ticketRelease) {
        return { state: 'not-open-yet', opens: undefined }
    }

    return Temporal.ZonedDateTime.compare(currentDate, ticketRelease.range.opens) < 0
        ? { state: 'not-open-yet', opens: ticketRelease.range?.opens.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }) }
        : Temporal.ZonedDateTime.compare(currentDate, ticketRelease.range.closes) < 0
          ? { state: 'open', closes: ticketRelease.range.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }), ticketInfo }
          : { state: 'closed' }
}

function getCfpState(
    currentDate: Temporal.ZonedDateTime,
    cfpDates: DateTimeRange | undefined,
    sessionizeUrl: string | undefined,
): CFPOpen | CFPClosed | CFPNotOpenYet {
    return cfpDates && Temporal.ZonedDateTime.compare(currentDate, cfpDates.opens) < 0
        ? { state: 'not-open-yet', opens: cfpDates.opens.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }) }
        : cfpDates && Temporal.ZonedDateTime.compare(currentDate, cfpDates.closes) < 0 && sessionizeUrl
          ? { state: 'open', closes: cfpDates.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }), sessionizeUrl }
          : { state: 'closed' }
}

function getTalkVotingForBeforeConference(
    currentDate: Temporal.ZonedDateTime,
    talkVotingDates: DateTimeRange | undefined,
): TalkVotingOpen | TalkVotingClosed | TalkVotingNotOpenYet {
    if (!talkVotingDates) {
        return { state: 'closed' }
    }

    if (Temporal.ZonedDateTime.compare(currentDate, talkVotingDates.opens) < 0) {
        return { state: 'not-open-yet', opens: talkVotingDates.opens.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }), closes: talkVotingDates.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }) }
    }

    if (Temporal.ZonedDateTime.compare(currentDate, talkVotingDates.closes) < 0) {
        return { state: 'open', closes: talkVotingDates.closes.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }) }
    }

    return { state: 'closed' }
}
