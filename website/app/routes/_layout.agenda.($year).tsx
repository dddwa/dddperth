import { DateTime } from 'luxon'
import { Fragment } from 'react'
import { data, redirect, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import type { TypeOf, z } from 'zod'
import { AppLink } from '~/components/app-link'
import { SponsorSection } from '~/components/page-components/SponsorSection'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { conferenceConfig } from '~/config/conference-config.server'
import type { Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { gridRoomSchema, gridSmartSchema, roomSchema, timeSlotSchema } from '~/lib/sessionize.server'
import { formatDate, getScheduleGrid } from '~/lib/sessionize.server'
import { slugify } from '~/lib/slugify'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { PageLayout } from '~/components/page-layout'
import type { Route } from './+types/_layout.agenda.($year)'

export async function loader({ params, context }: Route.LoaderArgs) {
    if (params.year && !/\d{4}/.test(params.year)) {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    const year =
        params.year && /\d{4}/.test(params.year) ? (params.year as Year) : context.conferenceState.conference.year

    const yearConfig = getYearConfig(year)
    const conferenceYearConfig = yearConfig.kind === 'conference' ? yearConfig : undefined

    if (conferenceYearConfig?.sessions?.kind === 'sessionize' && !conferenceYearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const schedules: TypeOf<typeof gridSmartSchema> =
        conferenceYearConfig?.sessions?.kind === 'sessionize' && context.conferenceState.agenda === 'published'
            ? await getScheduleGrid({
                  sessionizeEndpoint: conferenceYearConfig.sessions.sessionizeEndpoint,
              })
            : // TODO Deal with data type
              []

    const schedule = schedules[0]

    return data(
        {
            year,
            cancelledMessage: yearConfig.kind === 'cancelled' ? yearConfig.cancelledMessage : undefined,
            sponsors: yearConfig.kind === 'conference' ? yearConfig.sponsors : {},
            conferences: Object.values(conferenceConfig.conferences).map((conf) => ({
                year: conf.year,
            })),
            schedule: schedule
                ? {
                      ...schedule,
                      dateSlug: slugify(
                          formatDate(schedule.date, {
                              month: 'short',
                              day: 'numeric',
                          }),
                      ),
                      dateISO: schedule.date,
                      dateFormatted: formatDate(schedule.date, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                      }),
                      dateFormattedShort: formatDate(schedule.date, {
                          month: 'short',
                          day: 'numeric',
                      }),
                  }
                : undefined,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.schedule } },
    )
}

export default function Agenda() {
    const { schedule, sponsors, conferences, year, cancelledMessage } = useLoaderData<typeof loader>()
    const availableTimeSlots = schedule?.timeSlots.map((timeSlot) => timeSlot.slotStart.replace(/:/g, ''))

    const isLatestConference = conferences.every((c) => c.year <= year)

    return cancelledMessage ? (
        <Box color="white" textAlign="center" fontSize="3xl" mt="10">
            <p>
                {conferenceConfigPublic.name} {year} {isLatestConference ? 'is cancelled.' : 'was cancelled.'}
            </p>
            <Box color="white" textAlign="center" fontSize="lg" mt="10">
                <p>{cancelledMessage}</p>
            </Box>
            {/* Should sponsors be displayed for a cancelled conference? */}
            <SponsorSection sponsors={sponsors} year={year} />
            <ConferenceBrowser conferences={conferences} />
        </Box>
    ) : !schedule ? (
        <Box color="white" textAlign="center" fontSize="3xl" mt="10">
            <p>
                {conferenceConfigPublic.name} {year} agenda has not been{' '}
                {isLatestConference
                    ? 'announced yet.'
                    : `imported from the previous ${conferenceConfigPublic.name} site yet.`}
            </p>
            <SponsorSection sponsors={sponsors} year={year} />
            <ConferenceBrowser conferences={conferences} />
        </Box>
    ) : (
        <PageLayout>
            <Box width="100%" overflowX={{ base: 'auto', xl: 'visible' }}>
                <Box
                    color="#C2C2FF"
                    p={1}
                    fontSize="sm"
                    style={
                        {
                            /**
                     * Note 1:
                     * Use 24hr time for gridline names for simplicity
                     *
                     * Note 2: Use "auto" instead of "1fr" for a more compact schedule where height of a slot is not proportional to the session length. Implementing a "compact" shortcode attribute might make sense for this!
                     *
                     Try 0.5fr for more compact equal rows. I don't quite understand how that works :)
                    */
                            '--slot-rows': [
                                '[rooms] auto',
                                ...schedule.timeSlots.map(
                                    (timeSlot) => `[time-${timeSlot.slotStart.replace(/:/g, '')}] auto`,
                                ),
                            ].join(' '),
                            '--room-columns': [
                                '[times] auto',
                                ...schedule.rooms.map((room, index, rooms) =>
                                    index === 0
                                        ? `[room-${room.id}-start] 1fr`
                                        : index + 1 === rooms.length
                                          ? `[room-${rooms[index - 1].id}-end room-${room.id}-start] 1fr [room-${room.id}-end]`
                                          : `[room-${rooms[index - 1].id}-end room-${room.id}-start] 1fr`,
                                ),
                            ].join(' '),
                        } as React.CSSProperties
                    }
                    xl={{
                        display: 'grid',
                        gridTemplateRows: 'var(--slot-rows)',
                        gridTemplateColumns: 'var(--room-columns)',
                        gridGap: '1',
                    }}
                    minWidth={{ base: 'auto', xl: '100%' }}
                >
                    {schedule.rooms.map((room) => {
                        return <RoomTitle key={room.id} room={room} sponsors={sponsors} />
                    })}

                    {schedule.timeSlots.map((timeSlot, timeSlotIndex) => {
                        const startTime12 = DateTime.fromISO(timeSlot.slotStart).toFormat('h:mm a').toLowerCase()
                        const timeSlotSimple = timeSlot.slotStart.replace(/:/g, '')
                        const nextTimeSlot = schedule.timeSlots[timeSlotIndex + 1]
                        const nextTimeSlotStart = nextTimeSlot?.slotStart.replace(/:/g, '')

                        return (
                            <Fragment key={timeSlot.slotStart}>
                                <styled.h2
                                    gridColumn="times"
                                    style={{ gridRow: `time-${timeSlotSimple}` }}
                                    mt="2"
                                    xl={{ mt: 0 }}
                                    fontSize={{ base: 'sm', md: 'md' }}
                                    fontWeight="semibold"
                                    color="#C2C2FF"
                                    role="rowheader"
                                    aria-label={`Time slot starting at ${startTime12}`}
                                >
                                    {startTime12}
                                    {nextTimeSlot?.slotStart ? (
                                        <styled.span display={{ base: 'inline', xl: 'none' }}>
                                            {' '}
                                            -{' '}
                                            {DateTime.fromISO(nextTimeSlot.slotStart).toFormat('h:mm a').toLowerCase()}
                                        </styled.span>
                                    ) : null}
                                </styled.h2>

                                {timeSlot.rooms.map((room) => {
                                    return (
                                        <RoomTimeSlot
                                            key={room.id}
                                            schedule={schedule}
                                            room={room}
                                            availableTimeSlots={availableTimeSlots}
                                            nextTimeSlotStart={nextTimeSlotStart}
                                            timeSlotSimple={timeSlotSimple}
                                            timeSlot={timeSlot}
                                            year={year}
                                            startTime12={startTime12}
                                            timeSlotIndex={timeSlotIndex}
                                        />
                                    )
                                })}
                            </Fragment>
                        )
                    })}
                </Box>
                <SponsorSection sponsors={sponsors} year={year} />
                <ConferenceBrowser conferences={conferences} />
            </Box>
        </PageLayout>
    )
}

function RoomTitle({ room, sponsors }: { room: z.infer<typeof gridRoomSchema>; sponsors: YearSponsors }) {
    const roomSponsor = sponsors.room?.find((r) => r.roomName === room.name)

    return (
        <Flex
            key={room.id}
            style={{ '--room-column': `room-${room.id}` } as React.CSSProperties}
            role="columnheader"
            aria-label={`${room.name}${roomSponsor ? `, sponsored by ${roomSponsor.name}` : ''}`}
            justifyContent="center"
            alignItems="center"
            textAlign="center"
            gridColumn="var(--room-column)"
            gridRow="rooms"
            display="none"
            rounded="sm"
            bgColor="#8D8DFF"
            color="#070727"
            fontWeight="semibold"
            fontSize="sm"
            padding={2}
            xl={{
                display: 'block',
                position: 'sticky',
                top: 4,
                zIndex: 1000,
            }}
        >
            {room.name}
            {roomSponsor ? (
                <>
                    <br />
                    <styled.span fontSize="xs">Sponsored by{' '}</styled.span>
                    <styled.img
                        src={roomSponsor.logoUrlLightMode}
                        alt={roomSponsor.name}
                        maxWidth={100}
                        width="100%"
                        maxHeight={50}
                        display="inline-block"
                        objectFit="contain"
                    />
                </>
            ) : null}
        </Flex>
    )
}

function RoomTimeSlot({
    schedule,
    room,
    availableTimeSlots,
    nextTimeSlotStart,
    timeSlotSimple,
    timeSlot,
    year,
    startTime12,
    timeSlotIndex,
}: {
    schedule: NonNullable<Awaited<ReturnType<typeof useLoaderData<typeof loader>>>['schedule']>
    room: z.infer<typeof roomSchema>
    availableTimeSlots: string[] | undefined
    nextTimeSlotStart: string
    timeSlotSimple: string
    timeSlot: z.infer<typeof timeSlotSchema>
    year: string
    startTime12: string
    timeSlotIndex: number
}) {
    const fullSession = schedule.rooms
        .find((r) => r.id === room.id)
        ?.sessions.find((session) => session.id === room.session.id)
    const endsAtTime = fullSession?.endsAt ? fullSession.endsAt.replace(/\d{4}-\d{2}-\d{2}T/, '') : null
    const endTime12 = fullSession?.endsAt
        ? DateTime.fromISO(fullSession.endsAt).toFormat('h:mm a').toLowerCase()
        : undefined

    const timeSlotEnd = endsAtTime?.replace(/:/g, '') ?? ''
    const earliestEnd = !availableTimeSlots?.includes(timeSlotEnd)
        ? nextTimeSlotStart
        : (timeSlotEnd ?? nextTimeSlotStart)

    const earlierTimeSlots = schedule.timeSlots.filter((ts, index) => index < timeSlotIndex)
    const laterTimeSlots = schedule.timeSlots.filter((ts, index) => index > timeSlotIndex)

    // If this slot overlaps with another slot, we need to likely adjust the grid-column
    const conflictingEarlierTimeslots =
        timeSlot.rooms.length === 1 &&
        earlierTimeSlots.filter((_ts) => {
            const slotEndTimes = _ts.rooms.map((r) => r.session.endsAt?.replace(/\d{4}-\d{2}-\d{2}T/, ''))
            const maxEndTime = slotEndTimes.sort().at(-1)
            if (maxEndTime && maxEndTime > timeSlot.slotStart) {
                return true
            }

            return false
        })
    const conflictingLaterTimeslots =
        timeSlot.rooms.length === 1 &&
        laterTimeSlots.filter((ts) => {
            if (!endsAtTime) {
                return false
            }

            return ts.slotStart < endsAtTime
        })

    const hasConflictingEarlierSlots = conflictingEarlierTimeslots && conflictingEarlierTimeslots.length
    const hasConflictingLaterSlots = conflictingLaterTimeslots && conflictingLaterTimeslots.length

    const overrideRoomStart = hasConflictingEarlierSlots ? schedule.rooms.at(-1)?.id : undefined
    const overrideRoomEnd = hasConflictingLaterSlots
        ? schedule.rooms.at(
              Math.min(
                  ...conflictingLaterTimeslots.map((cf) =>
                      schedule.rooms.findIndex((r) => cf.rooms.some((cfRoom) => cfRoom.id === r.id)),
                  ),
              ) - 1,
          )?.id
        : undefined

    const gridColumn =
        timeSlot.rooms.length === 1 || (hasConflictingEarlierSlots && hasConflictingLaterSlots)
            ? `room-${overrideRoomStart ?? schedule.rooms.at(0)?.id} / room-${overrideRoomEnd ?? schedule.rooms.at(-1)?.id}`
            : `room-${room.id}`

    return (
        <styled.div
            key={room.id}
            marginBottom="0"
            xl={{ marginBottom: 1 }}
            style={{
                gridRow: `time-${timeSlotSimple} / time-${earliestEnd}`,
                gridColumn: gridColumn,
            }}
        >
            <Box
                rounded="sm"
                bgColor="#1F1F4E"
                fontSize="sm"
                height="full"
                padding={2}
                mt="2"
                xl={{
                    mt: 0,
                }}
            >
                <styled.h3
                    wordWrap="break-word"
                    color="white"
                    fontSize="md"
                    fontWeight="semibold"
                    lineHeight="tight"
                    mb={2}
                >
                    {fullSession?.isServiceSession ? (
                        fullSession?.title
                    ) : (
                        <AppLink
                            to={$path('/agenda/:year/talk/:sessionId', {
                                year,
                                sessionId: fullSession?.id ?? '#',
                            })}
                        >
                            {fullSession?.title}
                        </AppLink>
                    )}
                </styled.h3>
                <styled.span
                    display="flex"
                    alignItems="center"
                    gap={2}
                    color="#C2C2FF"
                    textWrap="nowrap"
                    fontSize={{ base: 'xs', xl: 'sm' }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        style={{ width: '16px', height: '16px' }}
                        aria-label="Time"
                        role="img"
                    >
                        <path
                            fillRule="evenodd"
                            d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z"
                            clipRule="evenodd"
                        />
                    </svg>
                    {startTime12} - {endTime12}
                </styled.span>
                {fullSession?.isServiceSession ? null : (
                    <Flex alignItems="center" gap={2} color="#C2C2FF" textOverflow="ellipsis" textWrap="nowrap" fontSize={{ base: 'xs', xl: 'sm' }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            style={{ width: '16px', height: '16px' }}
                            aria-label="Location"
                            role="img"
                        >
                            <path
                                fillRule="evenodd"
                                d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <styled.span display={{ base: 'inline', sm: 'inline' }}>{room.name}</styled.span>
                    </Flex>
                )}
                {fullSession?.speakers?.length ? (
                    <Flex alignItems="center" gap={2} color="#C2C2FF" fontSize={{ base: 'xs', xl: 'sm' }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            style={{ width: '16px', height: '16px' }}
                            aria-label="Speaker"
                            role="img"
                        >
                            <path
                                fillRule="evenodd"
                                d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-5-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 9c-1.825 0-3.422.977-4.295 2.437A5.49 5.49 0 0 0 8 13.5a5.49 5.49 0 0 0 4.294-2.063A4.997 4.997 0 0 0 8 9Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <styled.span>{fullSession?.speakers.map((speaker) => speaker.name)?.join(', ')}</styled.span>
                    </Flex>
                ) : null}
            </Box>
        </styled.div>
    )
}

function ConferenceBrowser({ conferences }: { conferences: { year: Year }[] }) {
    return (
        <styled.div padding="4" color="white">
            <styled.h2 fontSize="xl" marginBottom="2" id="previous-years">
                View Previous Conferences
            </styled.h2>
            <styled.div display="flex" flexWrap="wrap" gap={4}>
                {conferences.map((conf) => (
                    <styled.a key={conf.year} href={`/agenda/${conf.year}`} color="#8282FB">
                        <styled.span fontSize="lg">{conf.year}</styled.span>
                    </styled.a>
                ))}
            </styled.div>
        </styled.div>
    )
}
