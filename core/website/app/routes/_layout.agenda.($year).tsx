import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { Fragment, useMemo, useState } from 'react'
import {
    data,
    matchPath,
    Outlet,
    redirect,
    type ShouldRevalidateFunctionArgs,
    useLoaderData,
    useLocation,
    useNavigate,
    useNavigation,
    useParams,
    useRouteLoaderData,
} from 'react-router'
import { $path } from 'safe-routes'
import type { TypeOf, z } from 'zod'
import { AppLink } from '~/components/app-link'
import { FeedbackLink, useFeedbackClock, useReviewedFeedback } from '~/components/feedback-link'
import { SponsorOverview, SponsorSection } from '~/components/page-components/SponsorSection'
import { PageLayout } from '~/components/page-layout'
import { SpeakerModal } from '~/components/speaker-modal'
import { TalkDialog } from '~/components/talk-dialog'
import { Button } from '~/components/ui/button'
import type { Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { hasTalkEnded } from '~/lib/feedback/talk-ended'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getMeetTheExpertsAgenda } from '~/lib/meet-the-experts-agenda.server'
import type { MeetTheExpertsAgenda, MeetTheExpertsSeat } from '~/lib/meet-the-experts-agenda.server'
import type { AgendaTalk } from '~/lib/my-agenda'
import { getPublishedSchedule } from '~/lib/published-agenda.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { gridRoomSchema, gridSmartSchema, roomSchema, timeSlotSchema } from '~/lib/sessionize.server'
import { formatDate } from '~/lib/sessionize.server'
import { slugify } from '~/lib/slugify'
import { useMyAgenda } from '~/lib/use-my-agenda'
import { getConferenceState, getConfig, getDateTimeProvider } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.agenda.($year)'
import type { loader as talkLoader } from './_layout.agenda.($year).talk.$sessionId'

const TALK_ROUTE_ID = 'routes/_layout.agenda.($year).talk.$sessionId'
const TALK_PATH = '/agenda/:year/talk/:sessionId'

/** Set on the link that opens a talk, so closing it can step back in history. */
interface TalkLinkState {
    fromAgenda: true
}

/**
 * `location.state` is `any` in React Router: it's whatever the history entry
 * holds, which can come from another page, an older deploy, or a reload. So
 * check its shape rather than asserting it.
 */
function isTalkLinkState(state: unknown): state is TalkLinkState {
    return typeof state === 'object' && state !== null && 'fromAgenda' in state && state.fromAgenda === true
}

export async function loader({ params, context }: Route.LoaderArgs) {
    if (params.year && !/\d{4}/.test(params.year)) {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    const year =
        params.year && /\d{4}/.test(params.year) ? (params.year as Year) : getConferenceState(context).conference.year

    const yearConfig = getYearConfig(year, getConfig(context))
    const conferenceYearConfig = yearConfig.kind === 'conference' ? yearConfig : undefined

    const schedule = await getPublishedSchedule(context, year)
    // Held back with the rest of the agenda until it's published.
    const meetTheExperts = schedule ? await getMeetTheExpertsAgenda(context, year) : undefined

    // Only the current conference's agenda can be built from: past years are
    // an archive, and the shortlist counts are only useful while there is
    // still a day to plan for.
    const canPick =
        !!schedule &&
        conferenceYearConfig?.sessions?.kind === 'sessionize' &&
        year === getConferenceState(context).conference.year
    // Feedback links go away again once the window closes (the page itself is
    // cached for 5 minutes, so they can linger that long).
    const feedbackOpen =
        !!schedule &&
        year === getConferenceState(context).conference.year &&
        getConferenceState(context).feedback === 'open'
    // Each talk's link waits until that talk has finished; the page works out
    // when that is from here, so the date overrides apply to it too.
    const now = feedbackOpen ? getDateTimeProvider(context).nowDate().toISO() : undefined

    return data(
        {
            year,
            // Talk-detail pages are only worth linking for live Sessionize years
            // (which fetch speaker profiles). Archived `session-data` years have no
            // speaker store, so their talk titles render as plain text instead of
            // linking to a sparse detail page — unless the talk has a recording.
            linkTalks: conferenceYearConfig?.sessions?.kind === 'sessionize',
            recordings: conferenceYearConfig?.recordings ?? {},
            canPick,
            feedbackOpen,
            now,
            meetTheExperts,
            cancelledMessage: yearConfig.kind === 'cancelled' ? yearConfig.cancelledMessage : undefined,
            sponsors: yearConfig.kind === 'conference' ? yearConfig.sponsors : {},
            conferences: Object.values(conferenceManifest.conferences.conferences).map((conf) => ({
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

/**
 * Opening or closing a talk only mounts or unmounts the child route; the
 * agenda behind it doesn't change. Without this, opening a talk from the
 * unpinned `/agenda` (talk links always carry the year) reads as a param
 * change and refetches the whole agenda.
 */
export function shouldRevalidate({
    currentParams,
    nextParams,
    formMethod,
    defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
    const togglingTalk =
        !formMethod &&
        (!!currentParams.sessionId || !!nextParams.sessionId) &&
        (!currentParams.year || !nextParams.year || currentParams.year === nextParams.year)
    return togglingTalk ? false : defaultShouldRevalidate
}

export default function Agenda() {
    const {
        schedule,
        sponsors,
        conferences,
        year,
        cancelledMessage,
        linkTalks,
        recordings,
        canPick,
        feedbackOpen,
        now,
        meetTheExperts,
    } = useLoaderData<typeof loader>()
    const reviewedFeedback = useReviewedFeedback(feedbackOpen)
    const feedbackNow = useFeedbackClock(now)
    const canGiveFeedback = (session: { endsAt: string | null; isServiceSession: boolean }) =>
        feedbackOpen &&
        !session.isServiceSession &&
        feedbackNow !== undefined &&
        hasTalkEnded(session.endsAt, feedbackNow, conferenceManifest.public.timezone)
    const availableTimeSlots = schedule?.timeSlots.map((timeSlot) => timeSlot.slotStart.replace(/:/g, ''))

    const sessionsById = useMemo(
        () => new Map(schedule?.rooms.flatMap((room) => room.sessions.map((session) => [session.id, session])) ?? []),
        [schedule],
    )
    const pickableTalks = useMemo(() => {
        const talks = new Map<string, AgendaTalk>()
        for (const session of sessionsById.values()) {
            if (!session.isServiceSession && session.startsAt && session.endsAt) {
                talks.set(session.id, { id: session.id, startsAt: session.startsAt, endsAt: session.endsAt })
            }
        }
        return talks
    }, [sessionsById])
    const { picked, toggle } = useMyAgenda(year, pickableTalks)

    // The talk dialog opens as soon as a talk link is clicked, from the
    // session already on this page; the talk route's loader only fills in the
    // speakers' profiles. With `prefetch="intent"` on the links that has
    // usually finished before the click lands anyway.
    const params = useParams()
    const location = useLocation()
    const navigation = useNavigation()
    const navigate = useNavigate()
    const talkData = useRouteLoaderData<typeof talkLoader>(TALK_ROUTE_ID)
    const pendingTalkId = navigation.location
        ? matchPath(TALK_PATH, navigation.location.pathname)?.params.sessionId
        : undefined
    // Mid-navigation, go by where we're heading so closing is instant too.
    const openTalkId = navigation.location ? pendingTalkId : params.sessionId
    const openTalk = openTalkId ? sessionsById.get(openTalkId) : undefined
    const closeTalk = () => {
        if (params.sessionId && isTalkLinkState(location.state)) {
            void navigate(-1)
        } else {
            void navigate($path('/agenda/:year?', { year: params.year }), { preventScrollReset: true, replace: true })
        }
    }
    const [announcement, setAnnouncement] = useState('')

    const onToggle = (talk: AgendaTalk) => {
        const title = (id: string) => sessionsById.get(id)?.title ?? 'a talk'
        const outcome = toggle(talk)
        if (!outcome.added) {
            setAnnouncement(`Removed ${title(talk.id)} from your agenda.`)
            return
        }
        const clashes = outcome.displaced.map(title)
        setAnnouncement(
            `Added ${title(talk.id)} to your agenda.` +
                (clashes.length
                    ? ` Removed ${clashes.join(' and ')}, which ${clashes.length > 1 ? 'clash' : 'clashes'} with it.`
                    : ''),
        )
    }

    const isLatestConference = conferences.every((c) => c.year <= year)

    // The visible page title lives in <title> (via `meta`); this page had no
    // <h1> at all, which breaks heading-based navigation for screen reader
    // users. `srOnly` keeps it out of the (already-established) visual design
    // while giving AT users a real entry point that matches the page's
    // purpose.
    const pageHeading = (
        <styled.h1 srOnly>
            {conferenceManifest.public.name} {year} Agenda
        </styled.h1>
    )

    return cancelledMessage ? (
        <PageLayout>
            {pageHeading}
            <Box color="text.primary" textAlign="center" fontSize="3xl" mt="10">
                <p>
                    {conferenceManifest.public.name} {year} {isLatestConference ? 'is cancelled.' : 'was cancelled.'}
                </p>
                <Box color="text.primary" textAlign="center" fontSize="lg" mt="10">
                    <p>{cancelledMessage}</p>
                </Box>
                {/* Should sponsors be displayed for a cancelled conference? */}
                <SponsorSection sponsors={sponsors} year={year} />
                <ConferenceBrowser conferences={conferences} />
            </Box>
        </PageLayout>
    ) : !schedule ? (
        <PageLayout>
            {pageHeading}
            <Box color="text.primary" textAlign="center" fontSize="3xl" mt="10">
                <p>
                    {conferenceManifest.public.name} {year} agenda has not been{' '}
                    {isLatestConference
                        ? 'announced yet.'
                        : `imported from the previous ${conferenceManifest.public.name} site yet.`}
                </p>
                <SponsorSection sponsors={sponsors} year={year} />
                <ConferenceBrowser conferences={conferences} />
            </Box>
        </PageLayout>
    ) : (
        <PageLayout>
            {pageHeading}
            {canPick ? (
                // Picking a talk can silently unpick others that clash with it;
                // this is the only place that is said in words.
                <styled.div srOnly aria-live="polite" role="status">
                    {announcement}
                </styled.div>
            ) : null}
            {canPick ? (
                <Flex justifyContent="flex-end" px="1" py="2">
                    <AppLink to="/agenda/my" unstyled color="text.highlight" textDecoration="underline" fontSize="sm">
                        My agenda{picked.length ? ` (${picked.length})` : ''}
                    </AppLink>
                </Flex>
            ) : null}
            <Box width="full" overflowX={{ base: 'auto', xl: 'visible' }}>
                {conferenceManifest.public.features?.sponsorOverview ? <SponsorOverview sponsors={sponsors} /> : null}
                <Box
                    color="text.secondary"
                    p="1"
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
                    minWidth={{ base: 'auto', xl: 'full' }}
                >
                    {schedule.rooms.map((room) => {
                        return <RoomTitle key={room.id} room={room} sponsors={sponsors} />
                    })}

                    {schedule.timeSlots.map((timeSlot, timeSlotIndex) => {
                        const startTime12 = DateTime.fromISO(timeSlot.slotStart, {
                            zone: conferenceManifest.public.timezone,
                        })
                            .toFormat('h:mm a')
                            .toLowerCase()
                        const timeSlotSimple = timeSlot.slotStart.replace(/:/g, '')
                        const nextTimeSlot = schedule.timeSlots[timeSlotIndex + 1]
                        const nextTimeSlotStart = nextTimeSlot?.slotStart.replace(/:/g, '')

                        return (
                            <Fragment key={timeSlot.slotStart}>
                                <styled.h2
                                    gridColumn="times"
                                    style={{ gridRow: `time-${timeSlotSimple}` }}
                                    mt="2"
                                    xl={{ mt: '0' }}
                                    fontSize={{ base: 'sm', md: 'md' }}
                                    fontWeight="semibold"
                                    color="text.secondary"
                                    // No `role="rowheader"` here: the schedule is a flat CSS
                                    // grid, not a table/grid structure — the roles have no
                                    // `role="row"`/`role="grid"` ancestors, which axe flags as
                                    // a critical `aria-required-parent` violation. Orphaned
                                    // table roles tell a screen reader it's in a table and
                                    // then give it no row/column context to navigate, which is
                                    // worse than the plain heading this already is.
                                    aria-label={`Time slot starting at ${startTime12}`}
                                >
                                    {startTime12}
                                    {nextTimeSlot?.slotStart ? (
                                        <styled.span display={{ base: 'inline', xl: 'none' }}>
                                            {' '}
                                            -{' '}
                                            {DateTime.fromISO(nextTimeSlot.slotStart, {
                                                zone: conferenceManifest.public.timezone,
                                            })
                                                .toFormat('h:mm a')
                                                .toLowerCase()}
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
                                            nextTimeSlotIso={nextTimeSlot?.slotStart}
                                            timeSlotSimple={timeSlotSimple}
                                            timeSlot={timeSlot}
                                            year={year}
                                            linkTalks={linkTalks || !!recordings[room.session.id]}
                                            startTime12={startTime12}
                                            timeSlotIndex={timeSlotIndex}
                                            pickable={canPick ? pickableTalks.get(room.session.id) : undefined}
                                            isPicked={picked.includes(room.session.id)}
                                            onToggle={onToggle}
                                            canGiveFeedback={canGiveFeedback}
                                            reviewedFeedback={reviewedFeedback}
                                        />
                                    )
                                })}
                            </Fragment>
                        )
                    })}
                </Box>
                <TalkDialog
                    session={openTalk ?? null}
                    timeRange={openTalk ? talkTimeRange(openTalk.startsAt, openTalk.endsAt) : null}
                    roomSponsor={openTalk ? sponsors.room?.find((r) => r.roomName === openTalk.room) : undefined}
                    speakers={talkData?.sessionId === openTalkId ? talkData?.speakers : undefined}
                    recordingVideoId={openTalk ? recordings[openTalk.id] : undefined}
                    feedback={
                        openTalk && canGiveFeedback(openTalk) ? (
                            <FeedbackLink
                                id={openTalk.id}
                                title={openTalk.title}
                                reviewed={reviewedFeedback.has(openTalk.id)}
                                label="Give feedback on this talk"
                            />
                        ) : null
                    }
                    onClose={closeTalk}
                />
                <Outlet />
                {meetTheExperts ? <MeetTheExperts grid={meetTheExperts} /> : null}
                <SponsorSection sponsors={sponsors} year={year} />
                <ConferenceBrowser conferences={conferences} />
            </Box>
        </PageLayout>
    )
}

/**
 * Laid out like the talk grid above it: tables stand in for rooms (sticky
 * column headers), slots for time slots, and each seated person is a card
 * whose "location" is their table. Stacks on small screens, same as the
 * agenda. Empty seats are left out rather than drawn as blank cards.
 * Each person's name opens their registration bio in a modal.
 */
function MeetTheExperts({ grid }: { grid: MeetTheExpertsAgenda }) {
    const [selected, setSelected] = useState<{ seat: MeetTheExpertsSeat; where: string } | null>(null)

    return (
        <styled.section p="1" mt="8" color="text.secondary" fontSize="sm" aria-labelledby="meet-the-experts">
            <styled.h2 id="meet-the-experts" color="text.primary" fontSize="xl" fontWeight="semibold" mb="2">
                Meet the Experts
            </styled.h2>
            <Box
                style={{ '--table-columns': `auto repeat(${grid.tableLabels.length}, 1fr)` } as React.CSSProperties}
                xl={{ display: 'grid', gridTemplateColumns: 'var(--table-columns)', gap: '1' }}
            >
                {grid.tableLabels.map((label, i) => (
                    <Box
                        key={i}
                        style={{ gridColumn: i + 2 }}
                        gridRow="1"
                        display="none"
                        rounded="sm"
                        bgColor="border.emphasis"
                        color="surface.hero"
                        fontWeight="semibold"
                        textAlign="center"
                        padding="2"
                        xl={{ display: 'block', position: 'sticky', top: '4', zIndex: 'sticky' }}
                    >
                        {label}
                    </Box>
                ))}
                {grid.rows.map((row, r) => (
                    <Fragment key={r}>
                        <styled.h3
                            style={{ gridRow: r + 2 }}
                            gridColumn="1"
                            mt="2"
                            xl={{ mt: '0' }}
                            fontSize={{ base: 'sm', md: 'md' }}
                            fontWeight="semibold"
                        >
                            {row.slotLabel}
                        </styled.h3>
                        <styled.ul
                            style={{ gridRow: r + 2 }}
                            gridColumn="2 / -1"
                            listStyle="none"
                            xl={{ display: 'grid', gridTemplateColumns: 'subgrid' }}
                        >
                            {row.cells.map((seat, i) =>
                                seat ? (
                                    <styled.li
                                        key={i}
                                        style={{ gridColumn: i + 1 }}
                                        rounded="sm"
                                        bgColor="surface.card"
                                        padding="2"
                                        mt="2"
                                        xl={{ mt: '0' }}
                                    >
                                        <styled.button
                                            type="button"
                                            onClick={() =>
                                                setSelected({
                                                    seat,
                                                    where: `${row.slotLabel} · ${grid.tableLabels[i]}`,
                                                })
                                            }
                                            aria-haspopup="dialog"
                                            color="text.primary"
                                            fontSize="md"
                                            fontWeight="semibold"
                                            lineHeight="tight"
                                            textAlign="left"
                                            cursor="pointer"
                                            mb="2"
                                            _hover={{ color: 'text.highlight' }}
                                            _focusVisible={{
                                                outline: '[3px solid token(colors.interactive.focus)]',
                                                outlineOffset: '[2px]',
                                            }}
                                        >
                                            {seat.displayName}
                                        </styled.button>
                                        <Flex alignItems="center" gap="2" fontSize={{ base: 'xs', xl: 'sm' }}>
                                            <LocationIcon />
                                            {grid.tableLabels[i]}
                                        </Flex>
                                    </styled.li>
                                ) : null,
                            )}
                        </styled.ul>
                    </Fragment>
                ))}
            </Box>
            <SpeakerModal
                title={selected?.seat.displayName ?? ''}
                open={selected !== null}
                onOpenChange={(open) => !open && setSelected(null)}
            >
                <styled.p fontSize="sm" mb="4">
                    {selected?.where}
                </styled.p>
                <styled.p whiteSpace="pre-line">{selected?.seat.bio ?? 'No bio provided.'}</styled.p>
            </SpeakerModal>
        </styled.section>
    )
}

function LocationIcon() {
    return (
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
    )
}

function RoomTitle({ room, sponsors }: { room: z.infer<typeof gridRoomSchema>; sponsors: YearSponsors }) {
    const roomSponsor = sponsors.room?.find((r) => r.roomName === room.name)

    return (
        <Flex
            key={room.id}
            style={{ '--room-column': `room-${room.id}` } as React.CSSProperties}
            // See the note on the time-slot heading above: `role="columnheader"`
            // without a `role="row"`/`role="grid"` ancestor is an orphaned table
            // role (critical `aria-required-parent`). The aria-label is kept —
            // it still usefully names the room and its sponsor.
            aria-label={`${room.name}${roomSponsor ? `, sponsored by ${roomSponsor.name}` : ''}`}
            justifyContent="center"
            alignItems="center"
            textAlign="center"
            gridColumn="var(--room-column)"
            gridRow="rooms"
            display="none"
            rounded="sm"
            bgColor="border.emphasis"
            color="surface.hero"
            fontWeight="semibold"
            fontSize="sm"
            padding="2"
            xl={{
                display: 'block',
                position: 'sticky',
                top: '4',
                zIndex: 'sticky',
            }}
        >
            {room.name}
            {roomSponsor ? (
                <>
                    <br />
                    <styled.span fontSize="xs" opacity={0.85}>
                        Sponsored by{' '}
                    </styled.span>
                    {/*
                     * The room banner sits on `border.emphasis` (saturated
                     * mid-tone indigo/purple in both themes), so the light-on-dark
                     * `logoUrlDarkMode` variant reads on the coloured surface
                     * regardless of theme — no per-theme swap needed here.
                     *
                     * Bounding box is normalised (fixed max h/w, object-fit
                     * contain) so a wide or tall outlier asset can't unbalance
                     * the sticky room header.
                     */}
                    <styled.img
                        src={roomSponsor.logoUrlDarkMode}
                        alt={roomSponsor.name}
                        title={roomSponsor.name}
                        maxWidth="[110px]"
                        maxHeight="[28px]"
                        mt="1"
                        display="inline-block"
                        objectFit="contain"
                        verticalAlign="middle"
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
    nextTimeSlotIso,
    timeSlotSimple,
    timeSlot,
    year,
    linkTalks,
    startTime12,
    timeSlotIndex,
    pickable,
    isPicked,
    onToggle,
    canGiveFeedback,
    reviewedFeedback,
}: {
    schedule: NonNullable<Awaited<ReturnType<typeof useLoaderData<typeof loader>>>['schedule']>
    room: z.infer<typeof roomSchema>
    availableTimeSlots: string[] | undefined
    nextTimeSlotStart: string
    nextTimeSlotIso: string | undefined
    timeSlotSimple: string
    timeSlot: z.infer<typeof timeSlotSchema>
    year: string
    linkTalks: boolean
    startTime12: string
    timeSlotIndex: number
    /** Set only for a talk that can go on the person's agenda. */
    pickable: AgendaTalk | undefined
    isPicked: boolean
    onToggle: (talk: AgendaTalk) => void
    canGiveFeedback: (session: { endsAt: string | null; isServiceSession: boolean }) => boolean
    reviewedFeedback: ReadonlySet<string>
}) {
    const fullSession = schedule.rooms
        .find((r) => r.id === room.id)
        ?.sessions.find((session) => session.id === room.session.id)
    const endsAtTime = fullSession?.endsAt ? fullSession.endsAt.replace(/\d{4}-\d{2}-\d{2}T/, '') : null
    const endTime12 = fullSession?.endsAt
        ? DateTime.fromISO(fullSession.endsAt, { zone: conferenceManifest.public.timezone })
              .toFormat('h:mm a')
              .toLowerCase()
        : nextTimeSlotIso
          ? DateTime.fromISO(nextTimeSlotIso, { zone: conferenceManifest.public.timezone })
                .toFormat('h:mm a')
                .toLowerCase()
          : undefined

    const timeSlotEnd = endsAtTime?.replace(/:/g, '') ?? ''
    const earliestEnd = !availableTimeSlots?.includes(timeSlotEnd)
        ? nextTimeSlotStart
        : (timeSlotEnd ?? nextTimeSlotStart)

    const earlierTimeSlots = schedule.timeSlots.filter((_ts, index) => index < timeSlotIndex)
    const laterTimeSlots = schedule.timeSlots.filter((_ts, index) => index > timeSlotIndex)

    // If this slot overlaps with another slot, we need to likely adjust the grid-column
    const conflictingEarlierTimeslots =
        timeSlot.rooms.length === 1 &&
        earlierTimeSlots.filter((_ts) => {
            const slotEndTimes = _ts.rooms.map((r) => r.session.endsAt?.replace(/\d{4}-\d{2}-\d{2}T/, ''))
            // endsAt keeps seconds + offset (e.g. "08:45:00.000+10:30"); slotStart is
            // bare "HH:MM". Compare like-for-like on HH:MM, otherwise the longer string
            // sorts greater and every adjacent slot looks like an overlap.
            const maxEndTime = slotEndTimes.sort().at(-1)?.slice(0, 5)
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

            // Compare on HH:MM (endsAtTime carries seconds + offset).
            return ts.slotStart < endsAtTime.slice(0, 5)
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
            ? // Use the named grid lines that actually exist in the template
              // (`room-N-start` / `room-N-end`). Bare `room-N` doesn't resolve, so the
              // span collapses. With no real conflict this spans the full grid.
              `room-${overrideRoomStart ?? schedule.rooms.at(0)?.id}-start / room-${overrideRoomEnd ?? schedule.rooms.at(-1)?.id}-end`
            : `room-${room.id}`

    return (
        <styled.div
            key={room.id}
            marginBottom="0"
            xl={{ marginBottom: '1' }}
            style={{
                gridRow: `time-${timeSlotSimple} / time-${earliestEnd}`,
                gridColumn: gridColumn,
            }}
        >
            <Box
                rounded="sm"
                bgColor="surface.card"
                fontSize="sm"
                height="full"
                padding="2"
                mt="2"
                xl={{
                    mt: '0',
                }}
                outlineWidth="2px"
                outlineStyle={isPicked ? 'solid' : 'none'}
                outlineColor="border.emphasis"
            >
                <Flex alignItems="flex-start" justifyContent="space-between" gap="2" mb="2">
                    <styled.h3
                        wordWrap="break-word"
                        color="text.primary"
                        fontSize="md"
                        fontWeight="semibold"
                        lineHeight="tight"
                    >
                        {fullSession?.isServiceSession || !linkTalks ? (
                            fullSession?.title
                        ) : (
                            <AppLink
                                to={$path('/agenda/:year?/talk/:sessionId', {
                                    year,
                                    sessionId: fullSession?.id ?? '#',
                                })}
                                state={{ fromAgenda: true } satisfies TalkLinkState}
                                preventScrollReset
                                prefetch="intent"
                                // The default `primary` nav variant paints `text.on-brand` (white),
                                // which disappears on the card's `surface.card` background in light
                                // theme. Override to body text so it tracks the surrounding card.
                                color="text.primary"
                                _hover={{ color: 'text.highlight' }}
                            >
                                {fullSession?.title}
                            </AppLink>
                        )}
                    </styled.h3>
                    {pickable ? (
                        <Button
                            size="xs"
                            colorPalette="brand.primary"
                            variant={isPicked ? 'solid' : 'outline'}
                            onClick={() => onToggle(pickable)}
                            aria-label={
                                isPicked
                                    ? `Remove ${fullSession?.title} from my agenda`
                                    : `Add ${fullSession?.title} to my agenda`
                            }
                        >
                            <span aria-hidden="true">{isPicked ? '✓' : '+'}</span>
                        </Button>
                    ) : null}
                </Flex>
                <styled.span
                    display="flex"
                    alignItems="center"
                    gap="2"
                    color="text.secondary"
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
                    <Flex
                        alignItems="center"
                        gap="2"
                        color="text.secondary"
                        textOverflow="ellipsis"
                        textWrap="nowrap"
                        fontSize={{ base: 'xs', xl: 'sm' }}
                    >
                        <LocationIcon />
                        <styled.span display={{ base: 'inline', sm: 'inline' }}>{room.name}</styled.span>
                    </Flex>
                )}
                {fullSession?.speakers?.length ? (
                    <Flex alignItems="center" gap="2" color="text.secondary" fontSize={{ base: 'xs', xl: 'sm' }}>
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
                {fullSession && canGiveFeedback(fullSession) ? (
                    <FeedbackLink
                        id={fullSession.id}
                        title={fullSession.title}
                        reviewed={reviewedFeedback.has(fullSession.id)}
                    />
                ) : null}
            </Box>
        </styled.div>
    )
}

function talkTimeRange(startsAt: string | null, endsAt: string | null) {
    if (!startsAt || !endsAt) return null
    const format = (iso: string) =>
        DateTime.fromISO(iso, { zone: conferenceManifest.public.timezone }).toFormat('h:mm a').toLowerCase()
    return `${format(startsAt)} - ${format(endsAt)}`
}

function ConferenceBrowser({ conferences }: { conferences: { year: Year }[] }) {
    return (
        <styled.div padding="4" color="text.primary" textAlign="center">
            <styled.h2 fontSize="xl" marginBottom="2" id="previous-years">
                View Previous Conferences
            </styled.h2>
            <styled.div display="flex" flexWrap="wrap" gap="4" justifyContent="center">
                {conferences.map((conf) => (
                    <styled.a key={conf.year} href={`/agenda/${conf.year}`} color="text.highlight">
                        <styled.span fontSize="lg">{conf.year}</styled.span>
                    </styled.a>
                ))}
            </styled.div>
        </styled.div>
    )
}
