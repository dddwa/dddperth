import { DateTime } from 'luxon'
import { FC, PropsWithChildren } from 'react'
import { css } from 'styled-system/css'
import { Flex, styled } from 'styled-system/jsx'
import { conferenceConfig } from '~/config/conference-config'
import { ConferenceYear, Year } from '~/lib/config-types'

interface StartEventImportantDateBoxProps {
    type: 'start-event'
    dateTime: DateTime
    endDateTime: DateTime
    event: string

    eventActiveMessage: string
    eventActiveHref?: string
    eventClosedMessage: string
}

interface EndEventImportantDateBoxProps {
    type: 'end-event'
    startDateTime: DateTime
    dateTime: DateTime
    event: string

    /** End events count down while active, so no active message */
    eventActiveHref?: string
    eventClosedMessage: string
}

interface StandaloneImportantDateBoxProps {
    type: 'important-date'

    dateTime: DateTime

    event: string

    eventHref?: string

    eventClosedMessage: string
    eventClosedHref?: string

    onDayMessage?: string
    onDayHref?: string
}

type ImportantDateBoxProps =
    | StartEventImportantDateBoxProps
    | EndEventImportantDateBoxProps
    | StandaloneImportantDateBoxProps

function importantDates(year: ConferenceYear): ImportantDateBoxProps[] {
    const importantDates: ImportantDateBoxProps[] = []

    if (year.cfpDates) {
        importantDates.push({
            type: 'start-event',
            dateTime: year.cfpDates.opens,
            endDateTime: year.cfpDates.closes,
            event: 'Call for presentations open',
            eventActiveMessage: 'Submit Talk ↗',
            eventActiveHref: '/cfp',
            eventClosedMessage: 'CFP Closed',
        })

        importantDates.push({
            type: 'end-event',
            startDateTime: year.cfpDates.opens,
            dateTime: year.cfpDates.closes,
            event: 'Call for presentations close',
            eventClosedMessage: 'CFP Closed',
        })
    }

    if (year.ticketSalesDates) {
        importantDates.push({
            type: 'start-event',
            dateTime: year.ticketSalesDates.opens,
            endDateTime: year.ticketSalesDates.closes,
            event: 'Ticket Sales Open',
            eventActiveMessage: 'Buy Tickets ↗',
            eventActiveHref: '/tickets',
            eventClosedMessage: 'Ticket Sales Closed',
        })
        importantDates.push({
            type: 'end-event',
            startDateTime: year.ticketSalesDates.opens,
            dateTime: year.ticketSalesDates.closes,
            event: 'Ticket Sales Close',
            eventActiveHref: '/tickets',
            eventClosedMessage: 'Ticket Sales Closed',
        })
    }

    importantDates.push({
        type: 'important-date',
        dateTime: year.conferenceDate?.set({ hour: 17, minute: 30, second: 0, millisecond: 0 }) ?? DateTime.local(),
        event: 'After Party Tickets',
        onDayMessage: 'Buy Ticket',
        onDayHref: 'https://ti.to/dddperth/2024/with/el5pexoj6m8',
        eventClosedMessage: 'After Party Over',
    })

    if (year.talkVotingDates) {
        importantDates.push({
            type: 'start-event',
            dateTime: year.talkVotingDates.opens,
            endDateTime: year.talkVotingDates.closes,
            event: 'Voting Opens',
            eventClosedMessage: 'Voting Closed',
            eventActiveMessage: 'Vote for Agenda',
        })
        importantDates.push({
            type: 'end-event',
            startDateTime: year.talkVotingDates.opens,
            dateTime: year.talkVotingDates.closes,
            event: 'Voting Closes',
            eventClosedMessage: 'Voting Closed',
        })
    }

    if (year.agendaPublishedDateTime) {
        importantDates.push({
            type: 'important-date',
            dateTime: year.agendaPublishedDateTime,
            event: 'Agenda published',
            eventClosedMessage: 'View Agenda',
            eventClosedHref: '/agenda',
        })
    }

    if (year.conferenceDate) {
        importantDates.push({
            type: 'important-date',
            dateTime: year.conferenceDate,
            event: 'Conference day',
            onDayMessage: 'Important Info',
            onDayHref: '/conference-day',
            eventClosedMessage: 'Conference over',
        })
    }

    return importantDates.sort((a, b) => a.dateTime.diff(b.dateTime).milliseconds)
}

const ImportantDateBox: FC<{
    currentDate: DateTime
    smallSidebar?: boolean // New prop for small sidebar
    showOnlyLive?: boolean // New prop to filter only live events
    dateInfo: ImportantDateBoxProps
}> = ({ currentDate, smallSidebar, showOnlyLive, dateInfo }) => {
    if (dateInfo.type === 'start-event') {
        return (
            <StartEventImportantDateBox
                currentDate={currentDate}
                dateInfo={dateInfo}
                smallSidebar={smallSidebar}
                showOnlyLive={showOnlyLive}
            />
        )
    }
    if (dateInfo.type === 'end-event') {
        return (
            <EndEventImportantDateBox
                currentDate={currentDate}
                dateInfo={dateInfo}
                smallSidebar={smallSidebar}
                showOnlyLive={showOnlyLive}
            />
        )
    }

    return <StandaloneEventImportantDateBox currentDate={currentDate} dateInfo={dateInfo} smallSidebar={smallSidebar} />
}

const StartEventImportantDateBox: FC<{
    currentDate: DateTime
    smallSidebar?: boolean // New prop for small sidebar
    showOnlyLive?: boolean // New prop to filter only live events
    dateInfo: StartEventImportantDateBoxProps
}> = ({ currentDate, smallSidebar, showOnlyLive, dateInfo }) => {
    if (showOnlyLive) {
        // Only show if it's not yet started
        if (currentDate >= dateInfo.dateTime) {
            return null
        }
    }

    // When the event is coming up, we should countdown with an active row
    if (currentDate < dateInfo.dateTime) {
        const daysLeft = getDaysLeft(dateInfo, currentDate)

        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                {daysLeft === 0 ? (
                    <EventLink
                        highlighted
                        smallSidebar={smallSidebar}
                        message={currentDate.hasSame(dateInfo.dateTime, 'day') ? 'Today!' : 'Tomorrow!'}
                    />
                ) : (
                    <EventCountdown smallSidebar={smallSidebar} daysLeft={daysLeft} />
                )}
            </ActiveRow>
        )
    }

    if (currentDate < dateInfo.endDateTime) {
        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                <EventLink
                    highlighted
                    eventHref={dateInfo.eventActiveHref}
                    smallSidebar={smallSidebar}
                    message={dateInfo.eventActiveMessage}
                />
            </ActiveRow>
        )
    }

    return (
        <ClosedRow smallSidebar={smallSidebar}>
            <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

            <DisabledButton dateInfo={dateInfo} smallSidebar={smallSidebar} />
        </ClosedRow>
    )
}

const EndEventImportantDateBox: FC<{
    currentDate: DateTime
    smallSidebar?: boolean // New prop for small sidebar
    showOnlyLive?: boolean // New prop to filter only live events
    dateInfo: EndEventImportantDateBoxProps
}> = ({ currentDate, smallSidebar, showOnlyLive, dateInfo }) => {
    if (showOnlyLive) {
        // Don't show when event hasn't started (the start countdown will already be showing)
        if (currentDate < dateInfo.startDateTime) {
            return null
        }

        // Don't show when event has ended
        if (currentDate > dateInfo.dateTime) {
            return null
        }
    }

    if (currentDate < dateInfo.dateTime) {
        const daysLeft = getDaysLeft(dateInfo, currentDate)
        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                {daysLeft === 0 ? (
                    <EventLink eventHref={dateInfo.eventActiveHref} smallSidebar={smallSidebar} message="Last day!" />
                ) : (
                    <EventCountdown smallSidebar={smallSidebar} daysLeft={daysLeft} />
                )}
            </ActiveRow>
        )
    }

    return (
        <ClosedRow smallSidebar={smallSidebar}>
            <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

            <DisabledButton dateInfo={dateInfo} smallSidebar={smallSidebar} />
        </ClosedRow>
    )
}

const StandaloneEventImportantDateBox: FC<{
    currentDate: DateTime
    smallSidebar?: boolean // New prop for small sidebar
    showOnlyLive?: boolean // New prop to filter only live events
    dateInfo: StandaloneImportantDateBoxProps
}> = ({ currentDate, smallSidebar, showOnlyLive, dateInfo }) => {
    if (showOnlyLive) {
        // Don't show when event has ended and has no ended href
        if (currentDate > dateInfo.dateTime && !dateInfo.eventClosedHref) {
            return null
        }
    }

    if (currentDate.hasSame(dateInfo.dateTime, 'day') && dateInfo.onDayMessage) {
        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                <EventLink
                    highlighted
                    eventHref={dateInfo.onDayHref}
                    smallSidebar={smallSidebar}
                    message={dateInfo.onDayMessage}
                />
            </ActiveRow>
        )
    }

    // When the event is coming up, we should countdown with an active row
    if (currentDate < dateInfo.dateTime) {
        const daysLeft = getDaysLeft(dateInfo, currentDate)
        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                {daysLeft === 0 ? (
                    <EventLink smallSidebar={smallSidebar} message="Today!" />
                ) : (
                    <EventCountdown smallSidebar={smallSidebar} daysLeft={daysLeft} />
                )}
            </ActiveRow>
        )
    }

    // If the event has a link when closed, it is probably something like the agenda announcement, so it should always stay active
    if (dateInfo.eventClosedHref) {
        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                <EventLink
                    eventHref={dateInfo.eventClosedHref}
                    smallSidebar={smallSidebar}
                    highlighted
                    message={dateInfo.eventClosedMessage}
                />
            </ActiveRow>
        )
    }

    return (
        <ClosedRow smallSidebar={smallSidebar}>
            <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

            <DisabledButton dateInfo={dateInfo} smallSidebar={smallSidebar} />
        </ClosedRow>
    )
}

function getDaysLeft(dateInfo: ImportantDateBoxProps, currentDate: DateTime<true>) {
    return Math.floor(dateInfo.dateTime.diff(currentDate, 'days').days)
}

function ActiveRow({ children, smallSidebar }: PropsWithChildren<{ smallSidebar?: boolean }>) {
    return (
        <Flex
            flexDirection="row"
            justifyContent="space-between"
            rounded="lg"
            color={'#FFF'}
            shadow="sm"
            bgGradient="to-r"
            gradientFrom={'#00BA8D4A'}
            gradientTo={'#FF00E91A'}
            borderTop={'1px solid #FFFFFF2A'}
            p={smallSidebar ? 2 : 4}
        >
            {children}
        </Flex>
    )
}

function ClosedRow({ children, smallSidebar }: PropsWithChildren<{ smallSidebar?: boolean }>) {
    return (
        <Flex
            flexDirection="row"
            justifyContent="space-between"
            rounded="lg"
            color={'#C2C2FF'}
            shadow="sm"
            bgGradient="to-r"
            gradientFrom={'#1F1F4E'}
            gradientTo={'#151544'}
            borderTop={'none'}
            p={smallSidebar ? 2 : 4}
        >
            {children}
        </Flex>
    )
}

function EventLink({
    eventHref,
    smallSidebar,
    highlighted,
    message,
}: {
    eventHref?: string
    smallSidebar: boolean | undefined
    highlighted?: boolean
    message: string
}) {
    return (
        <styled.a
            href={eventHref}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            borderRightRadius={100}
            width={smallSidebar ? 100 : 150}
            fontSize={smallSidebar ? 'xs' : 'md'}
            paddingY={1}
            ml={smallSidebar ? 6 : 0}
            fontWeight="semibold"
            color={highlighted ? '#520030' : '#FFF'}
            // cursor="pointer"
            _hover={{ gradientTo: highlighted ? '#FF52B7' : 'white/10' }}
            bgGradient="to-r"
            gradientFrom={highlighted ? '#FF52B7' : 'white/10'}
            gradientTo={highlighted ? '#FF8273' : 'white/5'}
        >
            {message}
        </styled.a>
    )
}

function EventCountdown({
    eventHref,
    smallSidebar,
    daysLeft,
}: {
    eventHref?: string
    smallSidebar: boolean | undefined
    daysLeft: number
}) {
    const styles = css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRightRadius: 100,
        width: smallSidebar ? 100 : 150,
        fontSize: smallSidebar ? 'xs' : 'md',
        paddingY: 1,
        ml: smallSidebar ? 6 : 0,
        fontWeight: 'semibold',
        color: '#FFF',
        _hover: { gradientTo: 'white/10' },
        bgGradient: 'to-r',
        gradientFrom: 'white/10',
        gradientTo: 'white/5',
    })

    const countdownMessage = (
        <div className="countdown">
            <span>{daysLeft} days left</span>
        </div>
    )

    if (eventHref) {
        return <styled.button className={styles}>{countdownMessage}</styled.button>
    }

    return (
        <styled.a href={eventHref} className={styles} cursor="pointer">
            {countdownMessage}
        </styled.a>
    )
}

function DisabledButton({
    smallSidebar,
    dateInfo,
}: {
    smallSidebar: boolean | undefined
    dateInfo: ImportantDateBoxProps
}) {
    return (
        <styled.button
            disabled
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            rounded="lg"
            width={smallSidebar ? 100 : 150}
            paddingY={1}
            color="#9c9cd7"
            bgGradient="to-r"
            gradientFrom="white/5"
            gradientTo="transparent"
        >
            {dateInfo.eventClosedMessage}
        </styled.button>
    )
}

function EventInfo({ dateInfo, smallSidebar }: { dateInfo: ImportantDateBoxProps; smallSidebar: boolean | undefined }) {
    return (
        <Flex flexDirection="column">
            <time dateTime={dateInfo.dateTime.toISO()} />
            <styled.p fontSize={smallSidebar ? 'xs' : 'sm'} color="#C2C2FF">
                {dateInfo.dateTime.weekdayLong} {dateInfo.dateTime.toFormat('LLL dd')},{' '}
                {dateInfo.dateTime.toLocaleString(DateTime.TIME_SIMPLE)}
            </styled.p>
            <styled.h3
                fontSize={{ base: smallSidebar ? 'md' : 'md', md: smallSidebar ? 'md' : 'lg' }}
                fontWeight="semibold"
            >
                {dateInfo.event}
            </styled.h3>
        </Flex>
    )
}

export const ImportantDates: React.FC<{
    smallSidebar?: boolean
    showOnlyLive?: boolean
    currentDate: DateTime
    year: Year | undefined
}> = ({ smallSidebar, showOnlyLive, year, currentDate }) => {
    const yearConfigLookup = year
        ? (conferenceConfig.conferences as unknown as Record<Year, ConferenceYear | undefined>)[year]
        : undefined

    return (
        <Flex flexDirection="column" gap={2} mx={smallSidebar ? 0 : 4}>
            <styled.h2
                fontSize={{ base: smallSidebar ? 'lg' : 'lg', md: smallSidebar ? 'lg' : '3xl' }}
                color="white"
                fontWeight="semibold"
                width="fit-content"
            >
                Important Dates
            </styled.h2>
            {yearConfigLookup
                ? importantDates(yearConfigLookup).map((dateInfo, index) => (
                      <ImportantDateBox
                          key={index}
                          currentDate={currentDate}
                          dateInfo={dateInfo}
                          smallSidebar={smallSidebar}
                          showOnlyLive={showOnlyLive}
                      />
                  ))
                : null}
        </Flex>
    )
}

export function Workshops({ currentDate }: { currentDate: DateTime }) {
    return (
        <Flex flexDirection="column" gap={2} mx={4}>
            <styled.h2 fontSize={{ base: 'lg', md: '3xl' }} color="white" fontWeight="semibold" width="fit-content">
                Workshops
            </styled.h2>
            <styled.p fontSize="md" color="#C2C2FF" mb={4}>
                DDD runs a bunch of workshops to help you come up with some amazing talks to submit to our CFP and a
                great Bio to go with it.
            </styled.p>

            <ImportantDateBox
                dateInfo={{
                    type: 'important-date',
                    dateTime: DateTime.fromISO('2024-06-25T09:30:00.000Z'),
                    event: 'CFP & Bio Workshop - (In Person)',
                    eventHref: 'https://ti.to/dddperth/f2f-cfp-workshop-2024',
                    eventClosedMessage: 'Workshop Completed',
                }}
                currentDate={currentDate}
            />
        </Flex>
    )
}
