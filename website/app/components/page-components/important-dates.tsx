import { DateTime } from 'luxon'
import type { FC, PropsWithChildren } from 'react'
import { Link } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import type { ImportantDate, StandaloneImportantDate, StartEventImportantDate } from '~/lib/important-dates'
import { css } from '~/styled-system/css'
import { Flex, styled } from '~/styled-system/jsx'

const StyledLink = styled(Link)

function isExternalHref(href: string | undefined): boolean {
    if (!href) return false
    return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:')
}

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
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} currentDate={currentDate} />

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
        const daysUntilClose = Math.floor(eventEndTime.diff(currentDate, 'days').days)

        return (
            <ActiveRow smallSidebar={smallSidebar}>
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} currentDate={currentDate} />

                <Flex alignItems="center" gap={smallSidebar ? '2' : '3'}>
                    <DaysLeftPill smallSidebar={smallSidebar} daysLeft={daysUntilClose} />
                    <EventLink
                        highlighted
                        eventHref={dateInfo.eventActiveHref}
                        smallSidebar={smallSidebar}
                        message={dateInfo.eventActiveMessage}
                    />
                </Flex>
            </ActiveRow>
        )
    }

    return (
        <ClosedRow smallSidebar={smallSidebar}>
            <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} currentDate={currentDate} />

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
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} currentDate={currentDate} />

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
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} currentDate={currentDate} />

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
                <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} currentDate={currentDate} />

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
            <EventInfo dateInfo={dateInfo} smallSidebar={smallSidebar} currentDate={currentDate} />

            <DisabledButton dateInfo={dateInfo} smallSidebar={smallSidebar} />
        </ClosedRow>
    )
}

function getDaysLeft(dateInfo: ImportantDate, currentDate: DateTime<true>) {
    return Math.floor(DateTime.fromISO(dateInfo.dateTime).diff(currentDate, 'days').days)
}

/**
 * A date is considered "past/done" when it has nothing left to display — i.e.
 * it would render as a `ClosedRow` or be filtered out by `showOnlyLive`. For
 * standalone dates with an `eventClosedHref` we keep them visible because they
 * stay actionable after the date (e.g. "View Agenda").
 */
function isPastDate(dateInfo: ImportantDate, currentDate: DateTime): boolean {
    if (dateInfo.type === 'start-event') {
        return currentDate >= DateTime.fromISO(dateInfo.endDateTime)
    }
    // standalone
    if (dateInfo.eventClosedHref) {
        return false
    }
    return currentDate > DateTime.fromISO(dateInfo.dateTime)
}

function ActiveRow({ children, smallSidebar }: PropsWithChildren<{ smallSidebar?: boolean }>) {
    return (
        <Flex
            flexDirection={smallSidebar ? 'row' : { base: 'column', sm: 'row' }}
            alignItems={smallSidebar ? 'stretch' : { base: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            gap={smallSidebar ? '0' : { base: '3', sm: '0' }}
            rounded="lg"
            color="text.primary"
            shadow="sm"
            bgGradient="to-r"
            gradientFrom="overlay.active-row-start"
            gradientTo="overlay.active-row-end"
            borderTop="emphasis"
            p={smallSidebar ? '2' : '4'}
        >
            {children}
        </Flex>
    )
}

function ClosedRow({ children, smallSidebar }: PropsWithChildren<{ smallSidebar?: boolean }>) {
    return (
        <Flex
            flexDirection={smallSidebar ? 'row' : { base: 'column', sm: 'row' }}
            alignItems={smallSidebar ? 'stretch' : { base: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            gap={smallSidebar ? '0' : { base: '3', sm: '0' }}
            rounded="lg"
            color="text.secondary"
            shadow="sm"
            bgGradient="to-r"
            gradientFrom="surface.card"
            gradientTo="surface.card-alt"
            borderTop="none"
            p={smallSidebar ? '2' : '4'}
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
    const styleProps = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        rounded: smallSidebar ? '[0]' : ({ base: 'lg', sm: '[0]' } as const),
        borderRightRadius: smallSidebar ? '[100px]' : ({ base: 'lg', sm: '[100px]' } as const),
        width: smallSidebar ? '[100px]' : ({ base: 'full', sm: '[150px]' } as const),
        fontSize: smallSidebar ? 'xs' : 'md',
        paddingY: smallSidebar ? '1' : ({ base: '2', sm: '1' } as const),
        ml: smallSidebar ? '6' : '0',
        fontWeight: 'semibold',
        // Highlighted CTA: white text on the pink/coral gradient. Was
        // `gradient.cta-start` (dark magenta) — in dark theme that lands on a
        // brighter gradient and reads, but in light theme `cta-start` is a
        // darkened pink that merges with the lighter pink/coral gradient stops
        // and the contrast collapses. White is high-contrast in both themes.
        color: highlighted ? 'text.on-brand' : 'text.primary',
        _hover: { gradientTo: highlighted ? 'gradient.cta-mid' : 'white/10' },
        bgGradient: 'to-r',
        gradientFrom: highlighted ? 'gradient.cta-mid' : 'white/10',
        gradientTo: highlighted ? 'gradient.cta-end' : 'white/5',
    } as const

    if (eventHref && !isExternalHref(eventHref)) {
        return (
            <StyledLink to={eventHref} {...styleProps}>
                {message}
            </StyledLink>
        )
    }

    return (
        <styled.a href={eventHref} {...styleProps}>
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
        rounded: smallSidebar ? '[0]' : { base: 'lg', sm: '[0]' },
        borderRightRadius: smallSidebar ? '[100px]' : { base: 'lg', sm: '[100px]' },
        width: smallSidebar ? '[100px]' : { base: 'full', sm: '[150px]' },
        fontSize: smallSidebar ? 'xs' : 'md',
        paddingY: smallSidebar ? '1' : { base: '2', sm: '1' },
        ml: smallSidebar ? '6' : '0',
        fontWeight: 'semibold',
        // `text.primary` flips to dark indigo in light theme so the countdown
        // stays legible on the pale ClosedRow gradient (was hard-coded `white`).
        color: 'text.primary',
        _hover: { gradientTo: 'overlay.subtle' },
        bgGradient: 'to-r',
        gradientFrom: 'overlay.subtle',
        gradientTo: 'overlay.moderate',
    })

    const countdownMessage = (
        <div className="countdown">
            <span>{daysLeft} days left</span>
        </div>
    )

    if (!eventHref) {
        return <styled.button className={styles}>{countdownMessage}</styled.button>
    }

    if (isExternalHref(eventHref)) {
        return (
            <styled.a href={eventHref} className={styles} cursor="pointer">
                {countdownMessage}
            </styled.a>
        )
    }

    return (
        <StyledLink to={eventHref} className={styles} cursor="pointer">
            {countdownMessage}
        </StyledLink>
    )
}

function DaysLeftPill({ smallSidebar, daysLeft }: { smallSidebar: boolean | undefined; daysLeft: number }) {
    // Sits left of the open-state CTA to add a soft urgency cue without
    // competing with the pink button. Hidden in narrow contexts (mobile + the
    // small sidebar) where horizontal space is tight.
    const label = daysLeft === 0 ? 'Last day!' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`

    return (
        <styled.span
            display={smallSidebar ? 'none' : { base: 'none', sm: 'inline-flex' }}
            alignItems="center"
            fontSize="xs"
            fontWeight="semibold"
            paddingX="3"
            paddingY="1"
            rounded="full"
            bg="overlay.subtle"
            color="text.primary"
            whiteSpace="nowrap"
        >
            {label}
        </styled.span>
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
            width={smallSidebar ? '[100px]' : { base: 'full', sm: '[150px]' }}
            paddingY={smallSidebar ? '1' : { base: '2', sm: '1' }}
            color="text.muted"
            bgGradient="to-r"
            gradientFrom="white/5"
            gradientTo="transparent"
        >
            {dateInfo.eventClosedMessage}
        </styled.button>
    )
}

function formatEventDateTime(dateTime: DateTime) {
    return `${dateTime.weekdayLong} ${dateTime.toFormat('LLL dd')}, ${dateTime.toLocaleString(DateTime.TIME_SIMPLE, { locale: 'en-AU' })}`
}

function EventInfo({
    dateInfo,
    smallSidebar,
    currentDate,
}: {
    dateInfo: ImportantDate
    smallSidebar: boolean | undefined
    currentDate: DateTime
}) {
    const eventDateTime = DateTime.fromISO(dateInfo.dateTime, { zone: conferenceManifest.public.timezone })
    // For windowed events (CFP / tickets / voting) that are currently open, fold
    // the close date into the same row instead of rendering a separate "closes"
    // entry. Before the window opens, keep the open date as the primary line
    // and tack the close date on as a secondary line.
    const closeDateTime =
        dateInfo.type === 'start-event'
            ? DateTime.fromISO(dateInfo.endDateTime, { zone: conferenceManifest.public.timezone })
            : null
    const isOpen = closeDateTime !== null && currentDate >= eventDateTime && currentDate < closeDateTime

    return (
        <Flex flexDirection="column">
            <time dateTime={isOpen && closeDateTime ? closeDateTime.toISO() ?? undefined : dateInfo.dateTime} />
            <styled.p fontSize={smallSidebar ? 'xs' : 'sm'} color="text.secondary">
                {isOpen && closeDateTime
                    ? `Closes ${formatEventDateTime(closeDateTime)}`
                    : formatEventDateTime(eventDateTime)}
            </styled.p>
            <styled.h3
                fontSize={{ base: smallSidebar ? 'md' : 'md', md: smallSidebar ? 'md' : 'lg' }}
                fontWeight="semibold"
            >
                {dateInfo.event}
            </styled.h3>
            {closeDateTime && !isOpen && (
                <styled.p fontSize="xs" color="text.muted" mt="0.5">
                    Closes {formatEventDateTime(closeDateTime)}
                </styled.p>
            )}
        </Flex>
    )
}

export const ImportantDates: React.FC<{
    smallSidebar?: boolean
    showOnlyLive?: boolean
    currentDate: DateTime
    importantDates: ImportantDate[]
}> = ({ smallSidebar, showOnlyLive, currentDate, importantDates }) => {
    const upcomingDates = importantDates.filter((dateInfo) => !isPastDate(dateInfo, currentDate))
    // If the source list had dates but they're all in the past, the conference
    // for this year is done — show a friendly send-off instead of an empty list.
    const conferenceComplete = importantDates.length > 0 && upcomingDates.length === 0

    return (
        <Flex flexDirection="column" gap="2">
            <styled.h2
                fontSize={{ base: smallSidebar ? 'lg' : 'lg', md: smallSidebar ? 'lg' : '3xl' }}
                color="text.primary"
                fontWeight="semibold"
                width="fit"
            >
                Important Dates
            </styled.h2>
            {conferenceComplete ? (
                <Flex
                    flexDirection="column"
                    rounded="lg"
                    color="text.primary"
                    shadow="sm"
                    bgGradient="to-r"
                    gradientFrom="overlay.active-row-start"
                    gradientTo="overlay.active-row-end"
                    borderTop="emphasis"
                    p={smallSidebar ? '2' : '4'}
                >
                    <styled.p
                        fontSize={{ base: smallSidebar ? 'sm' : 'md', md: smallSidebar ? 'sm' : 'lg' }}
                        fontWeight="semibold"
                    >
                        That's a wrap!
                    </styled.p>
                    <styled.p fontSize={smallSidebar ? 'xs' : 'sm'} color="text.secondary">
                        Thanks for being part of {conferenceManifest.public.name} this year — hope to see you next year!
                    </styled.p>
                </Flex>
            ) : (
                upcomingDates.map((dateInfo, index) => (
                    <ImportantDateBox
                        key={index}
                        currentDate={currentDate}
                        dateInfo={dateInfo}
                        smallSidebar={smallSidebar}
                        showOnlyLive={showOnlyLive}
                    />
                ))
            )}
        </Flex>
    )
}

export function Workshops() {
    return (
        <Flex flexDirection="column" gap="2">
            <styled.h2 fontSize={{ base: 'lg', md: '3xl' }} color="text.primary" fontWeight="semibold" width="fit">
                Workshops
            </styled.h2>
            <styled.p fontSize="md" color="text.secondary" mb="4">
                DDD runs a bunch of workshops to help you come up with some amazing talks to submit to our CFP and a
                great Bio to go with it.
            </styled.p>

            <styled.p fontSize="xl" color="text.secondary">
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
