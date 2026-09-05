/**
 * The e2e Sessionize fixtures, as one typed model.
 *
 * ## Why this exists
 *
 * Sessionize serves three *views* of one event — `GridSmart` (the scheduled
 * agenda), `Sessions` (the submission list) and `Speakers` — and the app reads
 * all three. They overlap heavily: a session appears in `GridSmart` twice
 * (once under its room, once under its time slot) and again in `Sessions`,
 * with its title, times and room repeated each time; every speaker referenced
 * by a session must exist in `Speakers`, which in turn lists that speaker's
 * sessions back again.
 *
 * Maintained as three hand-edited JSON files, none of that redundancy is
 * enforced, and it drifted — the three files were originally generated
 * independently and had **entirely disjoint session ids**, so the agenda and
 * the talk-detail page showed unrelated talks and a talk id valid in one view
 * 404'd in the other. That was invisible until you clicked through. A round of
 * hand-reconciliation fixed the ids and added unit tests to assert the
 * agreement, but those tests could only ever check what someone thought to
 * check, on data a later edit could desynchronise again.
 *
 * So this file holds the fixture *once*, normalised — rooms, speakers and a
 * timetable — and `projections.ts` derives each view from it with typed
 * `.map`s. Cross-view agreement stops being an invariant to test and becomes
 * a property of the projection: there is only one title, one start time and
 * one room for a session, and every view reads it from the same place.
 * A speaker who doesn't exist is a type error, not a broken page.
 *
 * ## What is still checked, and where
 *
 * `app/lib/sessionize-fixtures.test.ts` validates the projected output against
 * the production Zod schemas (so a Sessionize schema change fails loudly in
 * unit tests), asserts the fixtures still cover the cases the voting filter
 * must exclude, and asserts the committed JSON matches what these projections
 * produce. What it no longer needs to assert by hand is that the three views
 * agree with each other.
 *
 * ## Editing
 *
 * Change the data here, then run `pnpm nx generate-sessionize-fixtures website`
 * to rewrite the committed JSON. The JSON stays committed because the fixture
 * server is a plain static file server and the worker fetches over HTTP — see
 * `../sessionize-server.ts`.
 *
 * Everything here is synthetic. The shape was derived from a live response for
 * **unannounced** CFP submissions, so no real speaker, title or abstract
 * appears; the naming convention (`Fixture Speaker NN`, `Fixture Talk NN`) is
 * asserted by a test so a future edit can't quietly reintroduce real data.
 */

/** The fixture conference's single day. */
export const FIXTURE_DATE = '2026-10-03'

/**
 * Rooms, in the order Sessionize returns them for the day.
 *
 * Order is load-bearing: `GridSmart`'s per-time-slot `index` is a room's
 * position in this list, so the projection derives it rather than repeating
 * it. Ids are Sessionize's own numeric room ids.
 */
export const ROOMS = [
    { id: 84523, name: 'River Room 1 (Lv 3)' },
    { id: 84527, name: 'River Room 2 (Lv 3)' },
    { id: 84524, name: 'River Room 3 (Lv 3)' },
    { id: 84525, name: 'Cygnet room (Lv 2)' },
    { id: 84526, name: 'Black Swan (Lv 2)' },
] as const satisfies readonly FixtureRoom[]

export interface FixtureRoom {
    id: number
    name: string
}

/** A room id that exists in {@link ROOMS}. Referencing any other is a type error. */
export type RoomId = (typeof ROOMS)[number]['id']

/**
 * The category taxonomy, as Sessionize models it: a handful of category
 * *groups*, each offering a set of *items* a session picks from.
 *
 * Declaring it once and referring to items by key is the point. In the
 * hand-written JSON each session repeated the whole taxonomy inline, and the
 * copies disagreed — category item id `10` was `"Keynote"` on one session and
 * `"45 mins"` on every other, which is not a shape Sessionize can produce.
 * Here an item has exactly one id and one name, everywhere.
 */
export const CATEGORY_GROUPS = {
    sessionFormat: {
        id: 1,
        name: 'Session format',
        sort: 0,
        items: {
            keynote: { id: 10, name: 'Keynote' },
            fortyFiveMins: { id: 11, name: '45 mins' },
        },
    },
    level: {
        id: 2,
        name: 'Level',
        sort: 1,
        items: {
            beginner: { id: 20, name: 'Mostly beginner' },
            intermediate: { id: 21, name: 'Mostly intermediate' },
            advanced: { id: 22, name: 'Mostly advanced' },
        },
    },
    topic: {
        id: 3,
        name: 'General Topic Category',
        sort: 2,
        items: {
            design: { id: 30, name: 'Design' },
            career: { id: 31, name: 'Career' },
            data: { id: 32, name: 'Data' },
            culture: { id: 33, name: 'Culture' },
            ai: { id: 34, name: 'AI' },
            security: { id: 35, name: 'Security' },
        },
    },
    talkTopics: {
        id: 4,
        name: 'Talk Topics',
        sort: 3,
        items: {
            designSystems: { id: 40, name: 'Design Systems' },
            accessibility: { id: 41, name: 'Accessibility' },
            careerGrowth: { id: 42, name: 'Career Growth' },
            mentoring: { id: 43, name: 'Mentoring' },
            dataPipelines: { id: 44, name: 'Data Pipelines' },
            streaming: { id: 45, name: 'Streaming' },
            ethics: { id: 46, name: 'Ethics' },
            teams: { id: 47, name: 'Teams' },
            appliedAi: { id: 48, name: 'Applied AI' },
            llms: { id: 49, name: 'LLMs' },
            appSec: { id: 50, name: 'AppSec' },
            threatModelling: { id: 51, name: 'Threat Modelling' },
        },
    },
} as const

type CategoryGroups = typeof CATEGORY_GROUPS
type ItemKey<G extends keyof CategoryGroups> = keyof CategoryGroups[G]['items']

/**
 * A session's category selection: one format, one level, one topic and any
 * number of talk topics, all referenced by key.
 */
export interface FixtureCategories {
    format: ItemKey<'sessionFormat'>
    level: ItemKey<'level'>
    topic: ItemKey<'topic'>
    talkTopics: readonly ItemKey<'talkTopics'>[]
}

/**
 * A speaker.
 *
 * `n` is the fixture's speaker number; the uuid and every display string are
 * derived from it, so a speaker cannot end up with a name that disagrees with
 * its id, and adding one is a single line.
 */
export interface FixtureSpeaker {
    n: number
}

/** The 28 synthetic speakers, numbered 1-28. */
export const SPEAKERS: readonly FixtureSpeaker[] = Array.from({ length: 28 }, (_, i) => ({ n: i + 1 }))

/** Zero-padded fixture number, matching the `Fixture Talk 01` naming convention. */
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Sessionize speaker ids are uuids, and the app's `speakersSchema` validates
 * that with `z.string().uuid()`, so these have to be well-formed v4 uuids
 * rather than readable strings.
 */
export const speakerId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const speakerName = (n: number) => `Fixture Speaker ${pad(n)}`

/**
 * A speaker number.
 *
 * Speakers are generated as a contiguous run (1..N) and assigned to talks by
 * `assignSpeakers()` rather than written out by hand, so a talk cannot
 * reference a speaker the `Speakers` view won't contain — the two are built
 * from the same counter. That is the invariant which used to need a unit test
 * ("speakers.json covers every speaker the session fixtures reference"): a
 * referenced-but-absent speaker rendered a talk page with a missing byline.
 *
 * A literal union would be tighter still, but `SPEAKERS` is generated with
 * `Array.from`, so there are no literal types to derive one from; the test
 * suite covers the remaining direction (a speaker no talk references).
 */
export type SpeakerNumber = number

/**
 * A break, changeover or other non-talk item on the timetable.
 *
 * Sessionize marks these `isServiceSession`, and they always sit in the main
 * room. Their ids are uuids rather than numeric — that's Sessionize's own
 * distinction between an organiser-created agenda item and a submitted talk,
 * and the app's voting filter relies on the `isServiceSession` flag, so the
 * fixture keeps both properties.
 */
export interface FixtureServiceSession {
    kind: 'service'
    id: string
    title: string
    /** `HH:mm`, local to the conference day. */
    start: string
    end: string
}

/** A submitted, accepted talk. */
export interface FixtureTalk {
    kind: 'talk'
    /**
     * Sessionize's numeric session id, as a string. Preserved verbatim from
     * the response the fixtures were shaped from — arbitrary, but stable, and
     * `e2e/routes.ts` pins one of them (`FIXTURE_TALK_ID`) as the talk-detail
     * route under test.
     */
    id: string
    /** The fixture's talk number; drives the title and abstract. */
    n: number
    start: string
    end: string
    room: RoomId
    speakers: readonly SpeakerNumber[]
    categories: FixtureCategories
    /**
     * Sessionize sets this on sessions that occupy the whole venue — the
     * keynote here. The agenda renders those as a full-width row, and the
     * voting filter excludes them, so the fixture needs at least one.
     */
    isPlenum?: boolean
    /**
     * Sessionize's "speaker has confirmed" flag. A few talks leave it false so
     * the fixture carries both states — an accepted-but-unconfirmed session is
     * a shape the real API returns, and a projection that hardcoded `true`
     * would quietly stop covering it.
     */
    isConfirmed?: boolean
}

export type FixtureSession = FixtureServiceSession | FixtureTalk

export const talkTitle = (n: number) => `Fixture Talk ${pad(n)}`

/**
 * Deliberately long enough to wrap in an agenda grid cell — the fixture backs
 * visual baselines, so text that never wraps would leave that layout untested.
 */
export const talkDescription = (n: number) =>
    `Synthetic abstract ${pad(n)} for the agenda fixture. Long enough to exercise grid cell layout ` +
    `and text wrapping without reproducing a real submission.`

/** The main room, where every service session and the keynote sit. */
const MAIN_ROOM = 84523 satisfies RoomId

/**
 * The talk-slot grid: five concurrent tracks across five time slots, minus the
 * last slot's fifth track (25 talks, not 30), which keeps the agenda from
 * being a perfect rectangle and so exercises the empty-cell rendering.
 *
 * Talks are numbered down each room in turn — talks 1-6 in room 1, 7-11 in
 * room 2, and so on — which is how the ids below are ordered.
 */
const TALK_SLOTS: readonly { start: string; end: string }[] = [
    { start: '10:45', end: '11:30' },
    { start: '11:40', end: '12:25' },
    { start: '13:25', end: '13:45' },
    { start: '13:55', end: '14:40' },
    { start: '14:50', end: '15:35' },
]

/**
 * Sessionize's numeric ids for the 25 talks, in talk-number order.
 *
 * These are arbitrary and carry no meaning, but they must stay stable:
 * `e2e/routes.ts` pins `1240238` (talk 02) as the talk-detail route, and the
 * committed visual baselines are keyed off that URL.
 */
const TALK_IDS: readonly string[] = [
    '1276730', // 01 — the keynote
    '1240238', // 02 — FIXTURE_TALK_ID, the pinned talk-detail route
    '1271640', // 03
    '1273544', // 04
    '1242790', // 05
    '1232680', // 06
    '1275071', // 07
    '1275236', // 08
    '1274379', // 09
    '1274860', // 10
    '1269920', // 11
    '1231798', // 12
    '1270736', // 13
    '1275351', // 14
    '1258207', // 15
    '1269744', // 16
    '1275363', // 17
    '1275355', // 18
    '1275367', // 19
    '1274888', // 20
    '1245540', // 21
    '1274814', // 22
    '1261542', // 23
    '1273177', // 24
    '1274981', // 25
]

/**
 * The six topic themes talks cycle through, so the fixture carries a realistic
 * spread of categories rather than 25 identical ones — the agenda and voting
 * cards both render category chips.
 */
const THEMES = [
    { topic: 'design', talkTopics: ['designSystems', 'accessibility'] },
    { topic: 'career', talkTopics: ['careerGrowth', 'mentoring'] },
    { topic: 'data', talkTopics: ['dataPipelines', 'streaming'] },
    { topic: 'culture', talkTopics: ['ethics', 'teams'] },
    { topic: 'ai', talkTopics: ['appliedAi', 'llms'] },
    { topic: 'security', talkTopics: ['appSec', 'threatModelling'] },
] as const satisfies readonly Pick<FixtureCategories, 'topic' | 'talkTopics'>[]

const LEVELS = ['intermediate', 'advanced', 'beginner'] as const satisfies readonly FixtureCategories['level'][]

/**
 * Talks with more than one speaker, so the fixture covers the multi-speaker
 * byline the talk-detail and agenda templates both render.
 *
 * Keyed by talk number; the value is the extra speaker. Every other talk has a
 * single speaker, numbered so that speakers are consumed in order.
 */
const CO_PRESENTED = new Set([9, 13, 14])

/**
 * Talks left `isConfirmed: false` — accepted, but the speaker hasn't confirmed.
 * A real Sessionize response mixes both states; keeping a few here means the
 * templates are exercised against both.
 */
const UNCONFIRMED = new Set([17, 21, 23])

/**
 * The topic theme and level for a talk, cycling by talk number so the fixture
 * carries a realistic spread rather than 25 identical sessions. Both the
 * agenda and the voting cards render category chips, so the variety is what
 * gives those baselines something to cover.
 */
const categoriesForTalk = (n: number, format: FixtureCategories['format']): FixtureCategories => {
    const theme = THEMES[(n - 1) % THEMES.length]
    return {
        format,
        level: LEVELS[(n - 1) % LEVELS.length],
        topic: theme.topic,
        talkTopics: theme.talkTopics,
    }
}

/**
 * Assigns speakers to talks: one each, in order, plus a second for the
 * co-presented ones. Doing it here rather than by hand is what guarantees
 * every speaker in {@link SPEAKERS} is referenced exactly once and no talk
 * references a speaker that doesn't exist.
 */
function assignSpeakers(): Map<number, number[]> {
    const assignment = new Map<number, number[]>()
    let next = 1
    for (let talk = 1; talk <= TALK_IDS.length; talk++) {
        const speakers = [next++]
        if (CO_PRESENTED.has(talk)) speakers.push(next++)
        assignment.set(talk, speakers)
    }
    return assignment
}

const SPEAKERS_BY_TALK = assignSpeakers()

/** Talk 01 is the keynote: plenum, in the main room, in its own slot. */
const KEYNOTE: FixtureTalk = {
    kind: 'talk',
    id: TALK_IDS[0],
    n: 1,
    start: '09:30',
    end: '10:15',
    room: MAIN_ROOM,
    speakers: SPEAKERS_BY_TALK.get(1) ?? [],
    categories: categoriesForTalk(1, 'keynote'),
    isPlenum: true,
}

/**
 * Talks 02-25, laid out room by room across {@link TALK_SLOTS}.
 *
 * Five rooms x five slots is 25 cells, but talk 01 is the keynote and sits
 * outside the grid, so the ids run out one cell early and the last room's
 * final slot stays empty. That's deliberate: an agenda that isn't a perfect
 * rectangle exercises the empty-cell rendering.
 */
function buildTalks(): FixtureTalk[] {
    const talks: FixtureTalk[] = []
    // Talk 01 is the keynote and sits outside the track grid; the remaining
    // slots are filled room by room from talk 02 onwards.
    let n = 2

    for (const room of ROOMS) {
        for (const slot of TALK_SLOTS) {
            if (n > TALK_IDS.length) break
            talks.push({
                kind: 'talk',
                id: TALK_IDS[n - 1],
                n,
                start: slot.start,
                end: slot.end,
                room: room.id,
                speakers: SPEAKERS_BY_TALK.get(n) ?? [],
                categories: categoriesForTalk(n, 'fortyFiveMins'),
                isConfirmed: !UNCONFIRMED.has(n),
            })
            n++
        }
    }

    return talks
}

/**
 * Breaks and housekeeping. Uuid ids, matching how Sessionize identifies
 * organiser-created agenda items rather than submitted sessions.
 */
const SERVICE_SESSIONS: readonly FixtureServiceSession[] = [
    { kind: 'service', id: '5485b325-64ce-4d01-94f2-795c3c6ffb11', title: 'Registration', start: '08:00', end: '08:50' },
    {
        kind: 'service',
        id: '6556ec30-4061-4926-8753-699554f13c98',
        title: 'Welcome and Housekeeping',
        start: '08:50',
        end: '09:30',
    },
    { kind: 'service', id: '8fd66a05-b397-40c6-9d7a-93c1c27a5ce4', title: 'Morning Tea', start: '10:15', end: '10:45' },
    { kind: 'service', id: 'd7beecb0-63ec-498f-91cb-617b63ddf90b', title: 'Changeover', start: '11:30', end: '11:40' },
    { kind: 'service', id: '780f7fe0-1c49-4b2a-a4ed-3ef803b4ff03', title: 'Lunch', start: '12:25', end: '13:25' },
    { kind: 'service', id: 'b76ded0e-0d33-45f2-8510-ef304d840d32', title: 'Changeover', start: '13:45', end: '13:55' },
    { kind: 'service', id: 'dc2a886e-2f4a-4659-94c1-c7c00afc32c8', title: 'Changeover', start: '14:40', end: '14:50' },
    {
        kind: 'service',
        id: '00dec223-77e9-47b1-9648-ef828eed3ae2',
        title: 'Afternoon Tea',
        start: '15:35',
        end: '16:05',
    },
    { kind: 'service', id: '1d9bfe96-0b12-44dd-bab1-ae8243eb3be9', title: 'Locknote', start: '16:05', end: '16:45' },
    {
        kind: 'service',
        id: '9552fc05-4320-4ca2-8846-7df0ac9712ce',
        title: 'Wrap Up and Prize Draw',
        start: '16:45',
        end: '17:00',
    },
]

/**
 * The whole timetable: every session, of either kind.
 *
 * This is the single source the three views are projected from.
 */
export const SESSIONS: readonly FixtureSession[] = [KEYNOTE, ...buildTalks(), ...SERVICE_SESSIONS]

/** Every talk, in talk-number order. */
export const TALKS: readonly FixtureTalk[] = SESSIONS.filter((s): s is FixtureTalk => s.kind === 'talk').sort(
    (a, b) => a.n - b.n,
)
