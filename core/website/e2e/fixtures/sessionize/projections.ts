/**
 * Projects the fixture model in `model.ts` into the three Sessionize views the
 * app reads.
 *
 * Each projection is a pure function of the model, so the views cannot
 * disagree: a session has one title, one start time and one room, and
 * `GridSmart`, `Sessions` and `Speakers` all read them from the same place.
 * That is the property the hand-written JSON kept losing — see the note at the
 * top of `model.ts`.
 *
 * The return types are the app's own inferred Zod types (`gridSmartSchema`,
 * `sessionsSchema`, `speakersSchema`), so a Sessionize schema change breaks
 * these projections at compile time rather than at test time.
 */
import type { z } from 'zod'
import type { gridSmartSchema, sessionSchema } from '@ddd/conference-config'
import type { sessionsSchema, speakersSchema } from '~/lib/sessionize.server'
import {
    CATEGORY_GROUPS,
    FIXTURE_DATE,
    ROOMS,
    SESSIONS,
    SPEAKERS,
    speakerId,
    speakerName,
    TALKS,
    talkDescription,
    talkTitle,
    type FixtureSession,
    type FixtureTalk,
} from './model.ts'

type SessionizeSession = z.infer<typeof sessionSchema>
type GridSmart = z.infer<typeof gridSmartSchema>
type Sessions = z.infer<typeof sessionsSchema>
type Speakers = z.input<typeof speakersSchema>

/** Sessionize timestamps are local, unzoned: `YYYY-MM-DDTHH:mm:ss`. */
const at = (time: string) => `${FIXTURE_DATE}T${time}:00`

const roomsById = new Map(ROOMS.map((room) => [room.id, room]))

/**
 * Expands a session's category *keys* into the inline group/item structure
 * Sessionize repeats on every session.
 *
 * Because the names come from one taxonomy, an item id maps to exactly one
 * name across the whole fixture — which the hand-written JSON did not manage
 * (id `10` was both `"Keynote"` and `"45 mins"`).
 */
function projectCategories(talk: FixtureTalk): SessionizeSession['categories'] {
    const { sessionFormat, level, topic, talkTopics } = CATEGORY_GROUPS
    const { categories } = talk

    return [
        {
            id: sessionFormat.id,
            name: sessionFormat.name,
            categoryItems: [sessionFormat.items[categories.format]],
            sort: sessionFormat.sort,
        },
        {
            id: level.id,
            name: level.name,
            categoryItems: [level.items[categories.level]],
            sort: level.sort,
        },
        {
            id: topic.id,
            name: topic.name,
            categoryItems: [topic.items[categories.topic]],
            sort: topic.sort,
        },
        {
            id: talkTopics.id,
            name: talkTopics.name,
            categoryItems: categories.talkTopics.map((key) => talkTopics.items[key]),
            sort: talkTopics.sort,
        },
    ].map((group) => ({
        ...group,
        categoryItems: group.categoryItems.map((item) => ({ id: item.id, name: item.name })),
    }))
}

/** The main room — where every service session sits. */
const MAIN_ROOM = ROOMS[0]

/**
 * The one place a fixture session becomes a Sessionize session. Both the
 * `GridSmart` and `Sessions` projections call it, which is what keeps the two
 * views' shared fields identical by construction.
 */
function projectSession(session: FixtureSession): SessionizeSession {
    if (session.kind === 'service') {
        return {
            id: session.id,
            title: session.title,
            description: null,
            startsAt: at(session.start),
            endsAt: at(session.end),
            isServiceSession: true,
            // Breaks occupy the whole venue, so Sessionize marks them plenum
            // too. The voting filter excludes both flags; keeping them
            // accurate is what makes that filter testable.
            isPlenumSession: true,
            speakers: [],
            categories: [],
            roomId: MAIN_ROOM.id,
            room: MAIN_ROOM.name,
            liveUrl: null,
            recordingUrl: null,
            status: null,
            isInformed: false,
            isConfirmed: false,
        }
    }

    const room = roomsById.get(session.room)
    /* c8 ignore next 3 -- unreachable: `room` is typed as a RoomId, so this
       can only fire if ROOMS and the RoomId type drift apart. */
    if (!room) {
        throw new Error(`[sessionize-fixtures] Talk ${session.id} references unknown room ${session.room}`)
    }

    return {
        id: session.id,
        title: talkTitle(session.n),
        description: talkDescription(session.n),
        startsAt: at(session.start),
        endsAt: at(session.end),
        isServiceSession: false,
        isPlenumSession: session.isPlenum ?? false,
        speakers: session.speakers.map((n) => ({ id: speakerId(n), name: speakerName(n) })),
        categories: projectCategories(session),
        roomId: room.id,
        room: room.name,
        liveUrl: null,
        recordingUrl: null,
        status: 'Accepted',
        isInformed: true,
        isConfirmed: session.isConfirmed ?? true,
    }
}

/** Every session, ordered by start time then by room order — Sessionize's own ordering. */
function sessionsInOrder(): SessionizeSession[] {
    const roomOrder = new Map<number, number>(ROOMS.map((room, index) => [room.id, index]))

    return SESSIONS.map(projectSession).sort((a, b) => {
        const byStart = (a.startsAt ?? '').localeCompare(b.startsAt ?? '')
        if (byStart !== 0) return byStart
        return (roomOrder.get(a.roomId ?? -1) ?? 0) - (roomOrder.get(b.roomId ?? -1) ?? 0)
    })
}

/**
 * `GridSmart` — the scheduled agenda, as the `/agenda/:year` route reads it.
 *
 * Sessionize returns each day's sessions **twice**: grouped by room, and again
 * grouped by time slot. Both groupings are derived here from one ordered list,
 * so a session cannot appear in one and not the other, or appear with
 * different times in each.
 */
export function projectGridSmart(): GridSmart {
    const ordered = sessionsInOrder()

    const rooms = ROOMS.map((room) => {
        const sessions = ordered.filter((session) => session.roomId === room.id)
        return {
            id: room.id,
            name: room.name,
            sessions,
            // Sessionize sets this when a room hosts nothing but plenum
            // sessions. The main room holds the breaks (plenum) *and* ordinary
            // talks, so it is false there; deriving it means it stays correct
            // if the timetable changes.
            hasOnlyPlenumSessions: sessions.length > 0 && sessions.every((session) => session.isPlenumSession),
        }
    })

    /**
     * Time slots, keyed by start time. A slot lists only the rooms that have a
     * session starting then, and each carries its `index` — the room's
     * position in the day's room list.
     */
    const slotStarts = [...new Set(ordered.map((session) => session.startsAt))]
        .filter((startsAt): startsAt is string => startsAt !== null)
        .sort()

    const timeSlots = slotStarts.map((startsAt) => ({
        // `slotStart` is a time of day, not a timestamp.
        slotStart: startsAt.slice(11),
        rooms: ROOMS.map((room, index) => {
            const session = ordered.find((s) => s.startsAt === startsAt && s.roomId === room.id)
            return session ? { id: room.id, name: room.name, session, index } : null
        }).filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    }))

    return [
        {
            date: `${FIXTURE_DATE}T00:00:00`,
            isDefault: true,
            rooms,
            timeSlots,
        },
    ]
}

/**
 * `Sessions` — the flat submission list, as the voting flow and the
 * talk-detail route read it.
 *
 * The talk-detail page reads its time and room from *this* view, not from
 * `GridSmart`, which is why the schedule fields matter here: leaving them null
 * renders a talk with no time or room even though the agenda grid looks right.
 * Projecting both views from one model is what makes that impossible.
 */
export function projectAllSessions(): Sessions {
    return [
        {
            groupId: null,
            groupName: 'All',
            isDefault: true,
            // Sessionize returns this view ordered by id rather than by time:
            // submitted sessions (numeric ids) first, then organiser-created
            // agenda items (uuids), each group sorted. The app doesn't depend
            // on the order — it filters and re-sorts — but matching it keeps
            // the fixture honest about the shape it stands in for.
            sessions: sessionsInOrder()
                .sort((a, b) => {
                    const numeric = (id: string) => /^\d+$/.test(id)
                    if (numeric(a.id) !== numeric(b.id)) return numeric(a.id) ? -1 : 1
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
                })
                .map((session) => ({
                    ...session,
                    // Present on the `Sessions` view only.
                    questionAnswers: [],
                })),
        },
    ]
}

/**
 * `Speakers` — names, bios and photos, as the talk-detail route resolves them.
 *
 * Each speaker's session list is derived from the timetable, so it always
 * agrees with what the sessions claim; and because talks reference speakers by
 * number, every referenced speaker necessarily appears here.
 */
export function projectSpeakers(): Speakers {
    return SPEAKERS.map(({ n }) => ({
        id: speakerId(n),
        firstName: 'Fixture',
        lastName: `Speaker ${String(n).padStart(2, '0')}`,
        fullName: speakerName(n),
        bio: `${speakerName(n)} is a synthetic speaker used only by the e2e fixtures.`,
        // Deliberately null: a real URL would make the baselines depend on a
        // third party staying online. A test asserts no fixture references a
        // live host.
        profilePicture: null,
        tagLine: `Fixture speaker, ${String(n).padStart(2, '0')}`,
        sessions: TALKS.filter((talk) => talk.speakers.includes(n)).map((talk) => ({
            // Sessionize types the id as a number in this view and a string in
            // the others. That inconsistency is theirs, and the app's schemas
            // mirror it, so the fixture has to reproduce it.
            id: Number(talk.id),
            name: talkTitle(talk.n),
        })),
        isTopSpeaker: false,
        links: [],
        questionAnswers: [],
        categories: [],
    }))
}

/** The three views, keyed by the Sessionize view name the fixture server serves them under. */
export const VIEW_PROJECTIONS = {
    GridSmart: projectGridSmart,
    Sessions: projectAllSessions,
    Speakers: projectSpeakers,
} as const

export type ViewName = keyof typeof VIEW_PROJECTIONS
