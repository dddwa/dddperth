import { DateTime } from 'luxon'
import type { FC, PropsWithChildren } from 'react'
import type {
    EndEventImportantDate,
    ImportantDate,
    StandaloneImportantDate,
    StartEventImportantDate,
} from '~/lib/important-dates'
import { css } from '~/styled-system/css'
import { Flex, styled } from '~/styled-system/jsx'

const ImportantDateBox: FC<{
    currentDate: DateTime
    smallSidebar?: boolean // New prop for small sidebar
    showOnlyLive?: boolean // New prop to filter only live events
    dateInfo: ImportantDate
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
    dateInfo: StartEventImportantDate
}> = ({ currentDate, smallSidebar, showOnlyLive, dateInfo }) => {
    const eventDateTime = DateTime.fromISO(dateInfo.dateTime)
    const eventEndTime = DateTime.fromISO(dateInfo.endDateTime)

    if (showOnlyLive) {
        // Only show if it's not yet started
        if (currentDate >= eventDateTime) {
            return null
        }
    }

    // When the event is coming up, we should countdown with an active row
    if (currentDate < eventDateTime) {
        const daysLeft = getDaysLeft(dateInfo, currentDate)

        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                {daysLeft === 0 ? (
                    <EventLink
                        highlighted
                        smallSidebar={smallSidebar}
                        eventHref={dateInfo.eventActiveHref}
                        message={currentDate.hasSame(eventDateTime, 'day') ? 'Today!' : 'Tomorrow!'}
                    />
                ) : (
                    <EventCountdown smallSidebar={smallSidebar} daysLeft={daysLeft} />
                )}
            </ActiveRow>
        )
    }

    if (currentDate < eventEndTime) {
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
    dateInfo: EndEventImportantDate
}> = ({ currentDate, smallSidebar, showOnlyLive, dateInfo }) => {
    const eventDateTime = DateTime.fromISO(dateInfo.dateTime)
    const eventStartTime = DateTime.fromISO(dateInfo.startDateTime)

    if (showOnlyLive) {
        // Don't show when event hasn't started (the start countdown will already be showing)
        if (currentDate < eventStartTime) {
            return null
        }

        // Don't show when event has ended
        if (currentDate > eventDateTime) {
            return null
        }
    }

    if (currentDate < eventDateTime) {
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
    dateInfo: StandaloneImportantDate
}> = ({ currentDate, smallSidebar, showOnlyLive, dateInfo }) => {
    const eventDateTime = DateTime.fromISO(dateInfo.dateTime)

    if (showOnlyLive) {
        // Don't show when event has ended and has no ended href
        if (currentDate > eventDateTime && !dateInfo.eventClosedHref) {
            return null
        }
    }

    if (currentDate.hasSame(eventDateTime, 'day') && dateInfo.onDayMessage) {
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
    if (currentDate < eventDateTime) {
        const daysLeft = getDaysLeft(dateInfo, currentDate)
        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} />

                {daysLeft === 0 ? (
                    <EventLink
                        smallSidebar={smallSidebar}
                        message={currentDate.hasSame(eventDateTime, 'day') ? 'Today!' : 'Tomorrow!'}
                    />
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

function getDaysLeft(dateInfo: ImportantDate, currentDate: DateTime<true>) {
    return Math.floor(DateTime.fromISO(dateInfo.dateTime).diff(currentDate, 'days').days)
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

function DisabledButton({ smallSidebar, dateInfo }: { smallSidebar: boolean | undefined; dateInfo: ImportantDate }) {
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

function EventInfo({ dateInfo, smallSidebar }: { dateInfo: ImportantDate; smallSidebar: boolean | undefined }) {
    const eventDateTime = DateTime.fromISO(dateInfo.dateTime)

    return (
        <Flex flexDirection="column">
            <time dateTime={dateInfo.dateTime} />
            <styled.p fontSize={smallSidebar ? 'xs' : 'sm'} color="#C2C2FF">
                {eventDateTime.weekdayLong} {eventDateTime.toFormat('LLL dd')},{' '}
                {eventDateTime.toLocaleString(DateTime.TIME_SIMPLE, { locale: 'en-AU' })}
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
    importantDates: ImportantDate[]
}> = ({ smallSidebar, showOnlyLive, currentDate, importantDates }) => {
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
            {importantDates.length
                ? importantDates.map((dateInfo, index) => (
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

            <styled.p fontSize="xl" color="#C2C2FF">
                Coming soon!
            </styled.p>

            {/* TODO Drive by config */}
            {/* <ImportantDateBox
                dateInfo={{
                    type: 'important-date',
                    dateTime: DateTime.fromISO('2024-06-25T09:30:00.000Z'),
                    event: 'CFP & Bio Workshop - (In Person)',
                    eventHref: 'https://ti.to/dddperth/f2f-cfp-workshop-2024',
                    eventClosedMessage: 'Workshop Completed',
                }}
                currentDate={currentDate}
            /> */}
        </Flex>
    )
}
