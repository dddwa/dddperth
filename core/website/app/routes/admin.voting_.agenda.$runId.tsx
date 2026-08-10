import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFetcher, useLoaderData, useRevalidator } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AgendaPlanner, type PlannerTalk } from '~/components/agenda-planner'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { MultiSelectFilter, type MultiSelectOption } from '~/components/multi-select-filter'
import { Button } from '~/components/ui/button'
import * as Modal from '~/components/ui/drawer'
import { isPlanningStateEmpty } from '~/lib/agenda-planning.server'
import type { AgendaPlanningImport, PlannerBoard, TalkStatus } from '~/lib/agenda-planning-types'
import { requireAdmin } from '~/lib/auth.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getConfSessions, getConfSpeakers, getSpeakerUnderrepresentedGroup } from '~/lib/sessionize.server'
import { getConferenceState, getConfig, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { ColorToken } from '~/styled-system/tokens'
import type { Route } from './+types/admin.voting_.agenda.$runId'

// DDD Perth's Sessionize organizer/event ID, used to deep-link talks into the
// Sessionize back office. Sessionize mints a new numeric event ID per year —
// update this when wiring up the agenda tool for a new conference year.
const SESSIONIZE_ORGANIZER_EVENT_ID = '24207'

const SESSION_FORMAT_CATEGORY = 'Session format'
const LEVEL_CATEGORY = 'Level'
const GENERAL_TOPIC_CATEGORY = 'General Topic Category'
const TALK_TOPICS_CATEGORY = 'Talk Topics'
const PRONOUN_CATEGORY = 'Your pronoun'
const ROLE_CATEGORY = 'How would you identify your job role?'
const EXPERIENCE_CATEGORY = 'How much speaking experience do you have?'
const ADDITIONAL_INFO_QUESTION = 'Speaker Additional Information'

const JUNIOR_ROLE = 'Graduate / Junior'
const NEW_SPEAKER_EXPERIENCE = new Set(["I haven't done it before :)", 'A few times'])
const HE_HIM_PRONOUN = 'He/Him'

// Sessionize session statuses that mean a talk was withdrawn/rejected — used
// to auto-default the agenda status below rather than making reviewers set it by hand.
const DECLINED_SESSIONIZE_STATUSES = new Set(['declined', 'rejected', 'withdrawn'])

// Sentinel values used inside otherwise value-based filters, prefixed so they
// can never collide with a real Sessionize answer.
const NEW_SPEAKER_FLAG_FILTER = '__new_speaker_flag__'
const ANY_MINORITY_FILTER = 'minority'

const STATUS_OPTIONS: { value: TalkStatus; label: string }[] = [
    { value: '', label: '—' },
    { value: 'locked', label: 'Accepted' },
    { value: 'tentative', label: 'Tentative' },
    { value: 'waitlist', label: 'Waitlist' },
    { value: 'declined', label: 'Declined' },
]

// Locked=green, tentative=yellow/orange, waitlist=blue, declined=red.
const STATUS_STYLES: Record<Exclude<TalkStatus, ''>, { bg: ColorToken; fg: ColorToken }> = {
    locked: { bg: 'status.success.bg', fg: 'status.success.fg' },
    tentative: { bg: 'status.warning.bg', fg: 'status.warning.fg' },
    waitlist: { bg: 'status.info.bg', fg: 'status.info.fg' },
    declined: { bg: 'status.danger.bg', fg: 'status.danger.fg' },
}

// Light flag applied to a talk when a co-speaker already has a locked talk
// elsewhere, so reviewers notice potential over-programming before locking more.
const FLAGGED_ROW_BG: ColorToken = 'pink.200'

interface AgendaSpeaker {
    id: string
    name: string
    tagLine: string
    bio: string | null
    pronoun: string | undefined
    role: string | undefined
    experience: string | undefined
    additionalInfo: string | undefined
    underrepresentedGroup: string | undefined
    isUnderrepresented: boolean
}

interface AgendaTalk {
    talkId: string
    rank: number
    title: string
    description: string | null
    length: string
    level: string
    generalTopic: string
    tags: string[]
    wins: number
    losses: number
    totalVotes: number
    speakers: AgendaSpeaker[]
    isDeclinedInSessionize: boolean
    // False when Sessionize no longer returns this talk at all (withdrawn talks
    // vanish from the API rather than coming back with a "Declined" status) —
    // every session-derived field is blank in that case, only the title survives.
    hasSessionData: boolean
}

interface TalkOverrides {
    um?: boolean
    exp?: boolean
    topic?: string
}

function getCategoryItemNames(
    categories: { name: string; categoryItems: { name: string }[] }[],
    categoryName: string,
): string[] {
    const category = categories.find((c) => c.name === categoryName)
    return category ? category.categoryItems.map((item) => item.name) : []
}

function getSpeakerCategoryValue(speaker: { categories: any[] }, categoryName: string): string | undefined {
    const category = speaker.categories.find((c: any) => c?.name === categoryName)
    return category?.categoryItems?.[0]?.name
}

function getSpeakerAdditionalInfo(speaker: { questionAnswers?: any[] }): string | undefined {
    const qa = speaker.questionAnswers?.find((q: any) => q?.question?.trim() === ADDITIONAL_INFO_QUESTION)
    const answer = qa?.answer
    if (typeof answer === 'string' && answer.trim().length > 0) {
        return answer.trim()
    }
    return undefined
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)

    const { runId } = params
    const voting = getServices(context).voting

    let runYear: string | null = null
    let runDetails: { startedAt: string; completedAt?: string; status: string } | null = null
    try {
        const runEntity = await voting.getValidationRunById(runId)
        if (runEntity) {
            runYear = runEntity.year
            runDetails = {
                startedAt: runEntity.startedAt,
                completedAt: runEntity.completedAt,
                status: runEntity.status,
            }
        }
    } catch (error: any) {
        console.error('Error getting run details:', error)
    }

    // Use the run's own year so a past run still enriches against the
    // Sessionize event it was voted on, not the current conference's.
    const year = runYear ?? getConferenceState(context).conference.year

    const yearConfig = getYearConfig(year, getConfig(context))

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    // Validation runs cover every submitted talk, so enrich from the
    // all-sessions endpoint — the public sessionizeEndpoint only lists
    // accepted talks (and may not exist yet while the agenda is planned),
    // which would wrongly auto-default the rest to Declined.
    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.allSessionsEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }
    const sessionizeEndpoint = yearConfig.sessions.allSessionsEndpoint
    const underrepresentedGroupsQuestionId = yearConfig.sessions.underrepresentedGroupsQuestionId

    const talkResults = await voting.getTalkResults(runId)

    // The curated list of disclosed answers that actually count as
    // underrepresented, ticked by organizers on /admin/voting. Matched
    // case-insensitively on the trimmed answer, since the free-text answers
    // come straight from Sessionize ("Women in Tech" vs "women in tech").
    let underrepresentedGroupConfig = new Set<string>()
    try {
        const selectedGroups = await voting.getUnderrepresentedGroupsConfig()
        underrepresentedGroupConfig = new Set(selectedGroups.map((group) => group.trim().toLowerCase()))
    } catch (error: any) {
        console.error('Error loading underrepresented groups config:', error)
    }

    let agendaTalks: AgendaTalk[] = []

    if (talkResults.length > 0) {
        const [sessions, speakers] = await Promise.all([
            getConfSessions({ sessionizeEndpoint }),
            getConfSpeakers({ sessionizeEndpoint }),
        ])

        const sessionsById = new Map(sessions.map((session) => [session.id, session]))
        const speakersById = new Map(speakers.map((speaker) => [speaker.id, speaker]))

        agendaTalks = talkResults
            .map((result): AgendaTalk => {
                const session = sessionsById.get(result.talkId)

                const generalTopics = session ? getCategoryItemNames(session.categories, GENERAL_TOPIC_CATEGORY) : []
                const talkTopics = session ? getCategoryItemNames(session.categories, TALK_TOPICS_CATEGORY) : []
                const lengths = session ? getCategoryItemNames(session.categories, SESSION_FORMAT_CATEGORY) : []
                const levels = session ? getCategoryItemNames(session.categories, LEVEL_CATEGORY) : []

                const agendaSpeakers: AgendaSpeaker[] = (session?.speakers ?? []).map((sessionSpeaker) => {
                    const speaker = speakersById.get(sessionSpeaker.id)
                    const underrepresentedGroup =
                        speaker && underrepresentedGroupsQuestionId
                            ? getSpeakerUnderrepresentedGroup(speaker, underrepresentedGroupsQuestionId)
                            : undefined

                    // A disclosed answer only counts as underrepresented when
                    // organizers have ticked it on /admin/voting — the raw
                    // answers are free text, so plenty of them ("No", or a
                    // speaker musing that their groups are debatable) shouldn't
                    // count. Individual talks can still be overridden by hand
                    // via the UM checkbox.
                    return {
                        id: sessionSpeaker.id,
                        name: sessionSpeaker.name,
                        tagLine: speaker?.tagLine ?? '',
                        bio: speaker?.bio ?? null,
                        pronoun: speaker ? getSpeakerCategoryValue(speaker, PRONOUN_CATEGORY) : undefined,
                        role: speaker ? getSpeakerCategoryValue(speaker, ROLE_CATEGORY) : undefined,
                        experience: speaker ? getSpeakerCategoryValue(speaker, EXPERIENCE_CATEGORY) : undefined,
                        additionalInfo: speaker ? getSpeakerAdditionalInfo(speaker) : undefined,
                        underrepresentedGroup,
                        isUnderrepresented: underrepresentedGroup
                            ? underrepresentedGroupConfig.has(underrepresentedGroup.trim().toLowerCase())
                            : false,
                    }
                })

                return {
                    talkId: result.talkId,
                    rank: result.rank,
                    title: session?.title ?? `Talk ${result.talkId} (removed from Sessionize)`,
                    description: session?.description ?? null,
                    length: lengths.join(', '),
                    level: levels.join(', '),
                    generalTopic: generalTopics.join(', '),
                    tags: talkTopics,
                    wins: result.wins,
                    losses: result.losses,
                    totalVotes: result.totalVotes,
                    speakers: agendaSpeakers,
                    // Sessionize's Sessions view drops declined/withdrawn talks
                    // entirely rather than returning them with a "Declined"
                    // status — a talk that was voted on but no longer appears
                    // at all is just as strong a signal as an explicit status.
                    isDeclinedInSessionize: session
                        ? Boolean(session.status && DECLINED_SESSIONIZE_STATUSES.has(session.status.toLowerCase()))
                        : true,
                    hasSessionData: session != null,
                }
            })
            .sort((a, b) => a.rank - b.rank)
    }

    const agendaPlanning = getServices(context).agendaPlanning
    const planning = await agendaPlanning.getPlanningState(runId)
    // Same predicate the import action guards with, so the button's
    // visibility and the server-side check can't drift apart.
    const planningIsEmpty = isPlanningStateEmpty(planning)

    return { runId, runDetails, agendaTalks, planning, planningIsEmpty }
}

/**
 * Talk ids currently laid onto the planner board.
 *
 * Drives the "In agenda" pill in the ranked table, so organizers can see
 * which talks already have a home without cross-referencing the board.
 */
export function getPlacedTalkIds(board: PlannerBoard): Set<string> {
    const ids = new Set<string>()
    for (const track of board.tracks) {
        for (const slot of track.slots) {
            // Breaks never hold a talk, but guard on talkId rather than kind
            // so a slot is only counted when it actually has one.
            if (slot.talkId) ids.add(slot.talkId)
        }
    }
    return ids
}

/**
 * Coerce a localStorage payload into the shape `importPlanning` binds into
 * SQL. The JSON comes from a browser this code wrote to months ago, so treat
 * it as untrusted: anything the wrong shape is dropped rather than bound as
 * an object. Returns null when the payload isn't usable at all.
 */
export function parseImportPayload(raw: string): AgendaPlanningImport | null {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return null
    }
    if (typeof parsed !== 'object' || parsed === null) return null
    const source = parsed as Record<string, unknown>

    const statusByTalkId: Record<string, TalkStatus> = {}
    if (typeof source.statusByTalkId === 'object' && source.statusByTalkId !== null) {
        for (const [talkId, value] of Object.entries(source.statusByTalkId as Record<string, unknown>)) {
            if (STATUS_OPTIONS.some((option) => option.value === value)) {
                statusByTalkId[talkId] = value as TalkStatus
            }
        }
    }

    const overridesByTalkId: Record<string, TalkOverrides> = {}
    if (typeof source.overridesByTalkId === 'object' && source.overridesByTalkId !== null) {
        for (const [talkId, value] of Object.entries(source.overridesByTalkId as Record<string, unknown>)) {
            if (typeof value !== 'object' || value === null) continue
            const entry = value as Record<string, unknown>
            const overrides: TalkOverrides = {}
            if (typeof entry.um === 'boolean') overrides.um = entry.um
            if (typeof entry.exp === 'boolean') overrides.exp = entry.exp
            if (typeof entry.topic === 'string') overrides.topic = entry.topic
            if (Object.keys(overrides).length > 0) overridesByTalkId[talkId] = overrides
        }
    }

    const tracks: PlannerBoard['tracks'] = []
    const capacity: Record<string, number> = {}
    if (typeof source.board === 'object' && source.board !== null) {
        const board = source.board as Record<string, unknown>
        if (Array.isArray(board.tracks)) {
            for (const value of board.tracks) {
                if (typeof value !== 'object' || value === null) continue
                const track = value as Record<string, unknown>
                if (typeof track.trackId !== 'string' || typeof track.name !== 'string') continue
                const slots: PlannerBoard['tracks'][number]['slots'] = []
                if (Array.isArray(track.slots)) {
                    for (const slotValue of track.slots) {
                        if (typeof slotValue !== 'object' || slotValue === null) continue
                        const slot = slotValue as Record<string, unknown>
                        if (typeof slot.slotId !== 'string' || typeof slot.length !== 'string') continue
                        const isBreak = slot.kind === 'break'
                        slots.push({
                            slotId: slot.slotId,
                            length: slot.length,
                            talkId: isBreak || typeof slot.talkId !== 'string' ? null : slot.talkId,
                            kind: isBreak ? 'break' : 'talk',
                            label: isBreak && typeof slot.label === 'string' ? slot.label : null,
                        })
                    }
                }
                tracks.push({ trackId: track.trackId, name: track.name, slots })
            }
        }
        if (typeof board.capacity === 'object' && board.capacity !== null) {
            for (const [length, value] of Object.entries(board.capacity as Record<string, unknown>)) {
                if (typeof value === 'number' && Number.isFinite(value)) capacity[length] = Math.trunc(value)
            }
        }
    }

    return { statusByTalkId, overridesByTalkId, board: { tracks, capacity } }
}

/**
 * Every planning edit posts here, so decisions are shared across the
 * organizer team rather than trapped in one browser. Writes are
 * last-write-wins per row; the page polls for other people's changes.
 */
export async function action({ request, params, context }: Route.ActionArgs) {
    const user = await requireAdmin(request, context)
    const { runId } = params
    const store = getServices(context).agendaPlanning
    const email = user.email

    const formData = await request.formData()
    // Every field this action reads is a plain text input; a File would
    // stringify to '[object Object]', so treat it as absent instead.
    const str = (key: string) => {
        const value = formData.get(key)
        return typeof value === 'string' ? value : ''
    }
    const intent = str('intent')

    try {
        switch (intent) {
            case 'set_status':
                await store.saveTalkPlanningField({
                    runId,
                    talkId: str('talkId'),
                    field: 'status',
                    value: str('status'),
                    email,
                })
                break

            case 'set_override': {
                const field = str('field')
                if (field !== 'um' && field !== 'exp' && field !== 'topic') {
                    return { success: false as const, error: `Unknown override field: ${field}` }
                }
                await store.saveTalkPlanningField({
                    runId,
                    talkId: str('talkId'),
                    field,
                    value: field === 'topic' ? str('value') : str('value') === 'true',
                    email,
                })
                break
            }

            case 'add_track':
                await store.addTrack({ runId, trackId: str('trackId'), name: str('name'), email })
                break

            case 'rename_track':
                await store.renameTrack({ runId, trackId: str('trackId'), name: str('name'), email })
                break

            case 'remove_track':
                await store.removeTrack({ runId, trackId: str('trackId') })
                break

            case 'add_slot':
                await store.addSlot({
                    runId,
                    trackId: str('trackId'),
                    slotId: str('slotId'),
                    length: str('length'),
                    email,
                    kind: str('kind') === 'break' ? 'break' : 'talk',
                    label: str('kind') === 'break' ? str('label') || 'Break' : null,
                })
                break

            case 'update_slot_length':
                await store.updateSlotLength({ runId, slotId: str('slotId'), length: str('length'), email })
                break

            case 'update_slot_label':
                await store.updateSlotLabel({ runId, slotId: str('slotId'), label: str('label'), email })
                break

            case 'move_slot':
                await store.moveSlot({
                    runId,
                    slotId: str('slotId'),
                    direction: str('direction') === 'up' ? 'up' : 'down',
                    email,
                })
                break

            case 'remove_slot':
                await store.removeSlot({ runId, slotId: str('slotId') })
                break

            case 'assign_talk':
                await store.assignTalkToSlot({
                    runId,
                    slotId: str('slotId'),
                    // An empty talkId means "clear this slot".
                    talkId: str('talkId') || null,
                    email,
                })
                break

            case 'set_capacity':
                await store.setCapacity({
                    runId,
                    length: str('length'),
                    capacity: Number(str('capacity')) || 0,
                    email,
                })
                break

            case 'import_local': {
                // Guarded server-side too: the button only shows when the run
                // has no shared data, but a stale page could still post this.
                const force = str('force') === 'true'
                if (!force && !(await store.isPlanningEmpty(runId))) {
                    return {
                        success: false as const,
                        error: 'This run already has shared planning data. Reload to see it.',
                    }
                }
                const payload = parseImportPayload(str('payload'))
                if (!payload) {
                    return { success: false as const, error: 'Could not read the planning data in this browser.' }
                }
                const imported = await store.importPlanning({ runId, payload, email })
                return {
                    success: true as const,
                    message: `Imported ${imported.statuses} statuses, ${imported.overrides} overrides, ${imported.tracks} tracks and ${imported.slots} slots.`,
                }
            }

            default:
                return { success: false as const, error: `Unknown intent: ${intent}` }
        }

        return { success: true as const }
    } catch (error: any) {
        console.error('Agenda planning action failed:', error)
        return { success: false as const, error: error?.message ?? 'Failed to save' }
    }
}

function formatSpeakerValues(speakers: AgendaSpeaker[], get: (speaker: AgendaSpeaker) => string | undefined) {
    if (speakers.length === 0) {
        return '—'
    }
    return speakers.map((speaker) => get(speaker) || '—').join(', ')
}

// Derived from wins/totalVotes rather than the stored winPct, because the two
// supported ELO import formats disagree on units: the Monte Carlo importer
// derives a fraction (0.83) while the original format passes the file's own
// value through as a percentage (83.3). Wins and totalVotes are unambiguous.
function formatWinPct(talk: { wins: number; totalVotes: number }): string {
    if (talk.totalVotes <= 0) return '0.0'
    return ((talk.wins / talk.totalVotes) * 100).toFixed(1)
}

function formatCountPercent(count: number, total: number): string {
    const pct = total > 0 ? (count / total) * 100 : 0
    return `${count} (${pct.toFixed(1)}%)`
}

// Shorten Sessionize's speaking-experience answers for compact display —
// filtering/stats still match against the original disclosed text.
const EXPERIENCE_SHORT_LABELS: Record<string, string> = {
    "I haven't done it before :)": 'First time',
    'A few times': 'A few times',
    'Once every few months': '< monthly',
    'Once a month or so': 'Monthly',
    'Usually more than once a month': '> monthly',
}

function formatExperience(experience: string): string {
    return EXPERIENCE_SHORT_LABELS[experience] ?? experience
}

// Sessionize's speaking-frequency answers, least to most experienced. Used to
// pick which co-speaker's answer represents the talk on the planner board.
const EXPERIENCE_ORDER = [
    "I haven't done it before :)",
    'A few times',
    'Once every few months',
    'Once a month or so',
    'Usually more than once a month',
]

/**
 * The most experienced speaker's disclosed frequency, shortened for display.
 *
 * Most-experienced rather than least: a first-timer paired with a regular is
 * a supported talk, so the pairing shouldn't read as inexperienced on the
 * board. The separate new/junior flag still catches the first-timer.
 * Returns '' when nobody disclosed an answer.
 */
export function getMostExperienced(speakers: AgendaSpeaker[]): string {
    let best = -1
    let fallback = ''
    for (const speaker of speakers) {
        if (!speaker.experience) continue
        const rank = EXPERIENCE_ORDER.indexOf(speaker.experience)
        if (rank < 0) {
            // An answer Sessionize has since reworded: unrankable, but still
            // better than showing nothing.
            fallback ||= formatExperience(speaker.experience)
            continue
        }
        if (rank > best) best = rank
    }
    if (best >= 0) return formatExperience(EXPERIENCE_ORDER[best])
    return fallback
}

function formatLevel(level: string): string {
    const normalised = level.replace(/Mostly /g, '').replace('No experience necessary', 'Beginner')
    // Sessionize's level answers are inconsistently cased ("Mostly advanced" vs
    // "No experience necessary"), which makes the filter list look ragged and
    // sort oddly — upper-case the first letter so they line up.
    return normalised.charAt(0).toUpperCase() + normalised.slice(1)
}

function csvEscape(value: string): string {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

function downloadAgendaCsv(
    runId: string,
    talks: AgendaTalk[],
    getEffectiveStatus: (talk: AgendaTalk) => TalkStatus,
    getEffectiveUm: (talk: AgendaTalk) => boolean,
    getEffectiveExpFlag: (talk: AgendaTalk) => boolean,
    flaggedTalkIds: Set<string>,
) {
    const headers = [
        'Rank',
        'Status',
        'Flagged (speaker locked elsewhere)',
        'Title',
        'Length',
        'Level',
        'General Topic',
        'Tags',
        'Speakers',
        'UM Disclosed',
        'UM Flag',
        'Pronoun',
        'Role',
        'Experience',
        'Junior/New Speaker Flag',
        'Additional Info',
        'Wins',
        'Losses',
        'Total Votes',
        'Win %',
    ]

    const rows = talks.map((talk) => [
        String(talk.rank),
        getEffectiveStatus(talk),
        flaggedTalkIds.has(talk.talkId) ? 'Yes' : 'No',
        talk.title,
        talk.length,
        talk.level,
        talk.generalTopic,
        talk.tags.join('; '),
        talk.speakers.map((s) => s.name).join(', '),
        formatSpeakerValues(talk.speakers, (s) => s.underrepresentedGroup),
        getEffectiveUm(talk) ? 'Yes' : 'No',
        formatSpeakerValues(talk.speakers, (s) => s.pronoun),
        formatSpeakerValues(talk.speakers, (s) => s.role),
        formatSpeakerValues(talk.speakers, (s) => s.experience),
        getEffectiveExpFlag(talk) ? 'Yes' : 'No',
        formatSpeakerValues(talk.speakers, (s) => s.additionalInfo),
        String(talk.wins),
        String(talk.losses),
        String(talk.totalVotes),
        formatWinPct(talk),
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agenda_${runId}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

function StatTile({
    label,
    value,
    tentativeCount,
    active,
    onToggle,
}: {
    label: string
    value: string | number
    tentativeCount?: number
    /** True when this tile's value is currently in the matching filter. */
    active?: boolean
    onToggle?: () => void
}) {
    return (
        <Box
            flex="1"
            minW="[170px]"
            {...(onToggle
                ? {
                      as: 'button' as const,
                      type: 'button' as const,
                      onClick: onToggle,
                      textAlign: 'left' as const,
                      cursor: 'pointer',
                      title: active ? `Remove "${label}" filter` : `Filter by "${label}"`,
                      'aria-pressed': active,
                      borderRadius: 'md',
                      p: '2',
                      m: '-2',
                      bg: active ? 'admin.100' : 'transparent',
                      _hover: { bg: 'admin.50' },
                  }
                : {})}
        >
            <styled.p fontSize="sm" color={active ? 'indigo.7' : 'admin.600'} fontWeight={active ? 'semibold' : 'normal'} mb="1">
                {label}
            </styled.p>
            <styled.p fontSize="lg" fontWeight="medium">
                {value}
                {Boolean(tentativeCount) && (
                    <>
                        {' + '}
                        <styled.span
                            px="2"
                            py="0.5"
                            borderRadius="full"
                            fontSize="sm"
                            fontWeight="semibold"
                            bg="status.warning.bg"
                            color="status.warning.fg"
                        >
                            {tentativeCount}
                        </styled.span>
                    </>
                )}
            </styled.p>
        </Box>
    )
}

// Topic/length breakdown tile: shows how big the category is across every
// talk, then how many of those are locked (and its share of all locked talks).
function CategoryStatTile({
    label,
    totalCount,
    totalPct,
    lockedCount,
    lockedPct,
    tentativeCount,
    waitlistCount,
    active,
    onToggle,
}: {
    label: string
    totalCount: number
    totalPct: number
    lockedCount: number
    lockedPct: number
    tentativeCount: number
    waitlistCount: number
    /** True when this tile's value is currently in the matching filter. */
    active?: boolean
    onToggle?: () => void
}) {
    return (
        <Box
            flex="1"
            minW="[170px]"
            // Tiles double as filter toggles — clicking one adds/removes its
            // value from the multi-select filter for that dimension.
            {...(onToggle
                ? {
                      as: 'button' as const,
                      type: 'button' as const,
                      onClick: onToggle,
                      textAlign: 'left' as const,
                      cursor: 'pointer',
                      title: active ? `Remove "${label}" from filter` : `Filter by "${label}"`,
                      'aria-pressed': active,
                      borderRadius: 'md',
                      p: '2',
                      m: '-2',
                      bg: active ? 'admin.100' : 'transparent',
                      _hover: { bg: 'admin.50' },
                  }
                : {})}
        >
            <styled.p fontSize="sm" color={active ? 'indigo.7' : 'admin.600'} fontWeight={active ? 'semibold' : 'normal'} mb="1">
                {label}
            </styled.p>
            <styled.p fontSize="xs" color="admin.500" mb="0.5">
                {totalCount} / {totalPct.toFixed(1)}%
            </styled.p>
            <styled.p fontSize="lg" fontWeight="medium">
                {lockedCount} ({lockedPct.toFixed(1)}%)
                {/* Tentative (amber) then waitlist (blue), matching the row
                    tints in the table below so the counts read the same way. */}
                {tentativeCount > 0 && (
                    <>
                        {' + '}
                        <styled.span
                            px="2"
                            py="0.5"
                            borderRadius="full"
                            fontSize="sm"
                            fontWeight="semibold"
                            bg="status.warning.bg"
                            color="status.warning.fg"
                            title={`${tentativeCount} tentative`}
                        >
                            {tentativeCount}
                        </styled.span>
                    </>
                )}
                {waitlistCount > 0 && (
                    <>
                        {' + '}
                        <styled.span
                            px="2"
                            py="0.5"
                            borderRadius="full"
                            fontSize="sm"
                            fontWeight="semibold"
                            bg="status.info.bg"
                            color="status.info.fg"
                            title={`${waitlistCount} waitlisted`}
                        >
                            {waitlistCount}
                        </styled.span>
                    </>
                )}
            </styled.p>
        </Box>
    )
}

function TagBadge({ children, emphasis }: { children: string; emphasis?: boolean }) {
    return (
        <styled.span
            px="2"
            py="1"
            bg={emphasis ? 'indigo.7' : 'admin.100'}
            color={emphasis ? 'white' : 'admin.700'}
            borderRadius="sm"
            fontSize="xs"
            fontWeight={emphasis ? 'semibold' : 'normal'}
        >
            {children}
        </styled.span>
    )
}

// The general-topic tag itself doubles as the override control — it's a
// <select> styled to look exactly like the emphasised tag badge. When the
// chosen value differs from what the speaker disclosed, the original stays
// visible right after it, struck through at reduced opacity.
function TopicSelectBadge({
    disclosedTopic,
    value,
    options,
    onChange,
}: {
    disclosedTopic: string
    value: string
    options: string[]
    onChange: (value: string) => void
}) {
    const isOverridden = value !== disclosedTopic
    // Native <select> boxes normally size to the widest option, not the
    // selected one — pin the width to the selected text instead (options may
    // clip in the closed-select UI, which is expected). Capped so a long
    // topic name (e.g. "Cloud, Infrastructure & Operations") can't blow out
    // the whole Tags column — it clips with the full name in the tooltip.
    const selectedText = value || 'Uncategorised'
    // Cap sized for the badge's font — long topic names still clip, but with
    // the full name in the tooltip. Keep in step with the fontSize below.
    const selectWidthCh = Math.min(selectedText.length, 24) + 2

    return (
        <>
            <styled.select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                title={selectedText}
                px="2"
                py="1"
                bg="indigo.7"
                color="white"
                borderRadius="sm"
                fontSize="sm"
                fontWeight="semibold"
                border="none"
                appearance="none"
                cursor="pointer"
                style={{ width: `${selectWidthCh}ch` }}
            >
                {!value && <option value="">Uncategorised</option>}
                {options.map((topic) => (
                    <option key={topic} value={topic}>
                        {topic}
                    </option>
                ))}
            </styled.select>
            {isOverridden && (
                <styled.span
                    px="2"
                    py="1"
                    bg="indigo.7"
                    color="white"
                    borderRadius="sm"
                    fontSize="xs"
                    fontWeight="semibold"
                    opacity="0.75"
                    textDecoration="line-through"
                    maxW="[110px]"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    display="inline-block"
                    title={`Disclosed topic (overridden): ${disclosedTopic || 'Uncategorised'}`}
                >
                    {disclosedTopic || 'Uncategorised'}
                </styled.span>
            )}
        </>
    )
}

type ColumnId =
    | 'status'
    | 'rank'
    | 'title'
    | 'length'
    | 'level'
    | 'tags'
    | 'speakers'
    | 'um'
    | 'pronoun'
    | 'role'
    | 'exp'
    | 'info'

// Columns that only make sense when Sessionize still has the talk — these
// render blank (not even a "—") for talks that have vanished from the feed.
const SESSION_DEPENDENT_COLUMNS = new Set<ColumnId>([
    'length',
    'level',
    'tags',
    'speakers',
    'um',
    'pronoun',
    'role',
    'exp',
    'info',
])

interface ColumnFilter {
    values: string[]
    onChange: (values: string[]) => void
    options: MultiSelectOption[]
}

interface ColumnDef {
    id: ColumnId
    label: string
    align?: 'left' | 'center'
    headerWidth?: `[${string}]`
    filter?: ColumnFilter
    cellProps?: Record<string, unknown>
    renderCell: (talk: AgendaTalk) => React.ReactNode
}

// Narrow placeholder both header and body cells collapse to, so the table
// stays column-aligned while freeing up horizontal space.
const COLLAPSED_COLUMN_WIDTH = '[32px]'

function ColumnHeaderCell({
    column,
    collapsed,
    onToggle,
}: {
    column: ColumnDef
    collapsed: boolean
    onToggle: () => void
}) {
    const filter = column.filter
    const activeFilterLabels = filter
        ? filter.options.filter((o) => filter.values.includes(o.value)).map((o) => o.label)
        : []
    const tooltip = activeFilterLabels.length
        ? `${column.label} — filter: ${activeFilterLabels.join(', ')}`
        : column.label

    if (collapsed) {
        return (
            <styled.th p="1" border="admin-emphasis" width={COLLAPSED_COLUMN_WIDTH} verticalAlign="top">
                <styled.button
                    type="button"
                    onClick={onToggle}
                    title={tooltip}
                    aria-label={`Show ${column.label} column`}
                    display="block"
                    width="full"
                    textAlign="center"
                    cursor="pointer"
                    bg="admin.100"
                    borderRadius="sm"
                    py="1"
                    fontSize="xs"
                    color={activeFilterLabels.length ? 'indigo.7' : 'admin.600'}
                >
                    »
                </styled.button>
            </styled.th>
        )
    }

    return (
        <styled.th
            textAlign={column.align ?? 'left'}
            p="2"
            border="admin-emphasis"
            width={column.headerWidth}
            verticalAlign="top"
        >
            <Flex justifyContent="space-between" alignItems="center" gap="1" mb={filter ? '1' : '0'}>
                <span>{column.label}</span>
                <styled.button
                    type="button"
                    onClick={onToggle}
                    title={`Hide ${column.label} column`}
                    aria-label={`Hide ${column.label} column`}
                    cursor="pointer"
                    color="admin.500"
                    fontWeight="normal"
                    px="1"
                    _hover={{ color: 'admin.800' }}
                >
                    «
                </styled.button>
            </Flex>
            {filter && (
                <MultiSelectFilter
                    label={column.label}
                    values={filter.values}
                    options={filter.options}
                    onChange={filter.onChange}
                    minWidth="[80px]"
                />
            )}
        </styled.th>
    )
}

function ColumnBodyCell({ column, collapsed, talk }: { column: ColumnDef; collapsed: boolean; talk: AgendaTalk }) {
    if (collapsed) {
        return <styled.td p="1" border="admin-subtle" width={COLLAPSED_COLUMN_WIDTH} bg="admin.50" />
    }
    const blank = !talk.hasSessionData && SESSION_DEPENDENT_COLUMNS.has(column.id)
    return (
        <styled.td p="2" border="admin-subtle" textAlign={column.align ?? 'left'} {...column.cellProps}>
            {blank ? null : column.renderCell(talk)}
        </styled.td>
    )
}

/** How often the page picks up other organizers' changes. */
const POLL_INTERVAL_MS = 10_000

// The three keys this page used to save into before planning moved to D1.
// Kept so an organizer who did their planning before the change can pull it
// into the shared board rather than redoing it.
const LEGACY_STATUS_KEY = (runId: string) => `voting-agenda-status:${runId}`
const LEGACY_OVERRIDES_KEY = (runId: string) => `voting-agenda-overrides:${runId}`
const LEGACY_PLANNER_KEY = (runId: string) => `voting-agenda-planner:${runId}`

function readLegacyJson<T>(key: string): T | undefined {
    try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : undefined
    } catch (error) {
        console.error(`Failed to read ${key}:`, error)
        return undefined
    }
}

/**
 * Offers a one-click migration of planning left in this browser's
 * localStorage into the shared tables. Only appears when this browser
 * actually has something to import; importing over existing shared data
 * needs an explicit confirmation so a stale tab can't quietly replace the
 * team's work.
 */
function LocalPlanningImport({ runId, planningIsEmpty }: { runId: string; planningIsEmpty: boolean }) {
    const fetcher = useFetcher<typeof action>()
    const [local, setLocal] = useState<{ payload: AgendaPlanningImport; summary: string } | null>(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        const statusByTalkId = readLegacyJson<Record<string, TalkStatus>>(LEGACY_STATUS_KEY(runId))
        const overridesByTalkId = readLegacyJson<Record<string, TalkOverrides>>(LEGACY_OVERRIDES_KEY(runId))
        const board = readLegacyJson<PlannerBoard>(LEGACY_PLANNER_KEY(runId))

        const statuses = Object.keys(statusByTalkId ?? {}).length
        const overrides = Object.keys(overridesByTalkId ?? {}).length
        const tracks = board?.tracks?.length ?? 0
        if (statuses === 0 && overrides === 0 && tracks === 0) {
            setLocal(null)
            return
        }

        const parts = []
        if (statuses) parts.push(`${statuses} status${statuses === 1 ? '' : 'es'}`)
        if (overrides) parts.push(`${overrides} override${overrides === 1 ? '' : 's'}`)
        if (tracks) parts.push(`${tracks} track${tracks === 1 ? '' : 's'}`)

        setLocal({
            payload: {
                statusByTalkId,
                overridesByTalkId,
                board: board ? { tracks: board.tracks ?? [], capacity: board.capacity ?? {} } : undefined,
            },
            summary: parts.join(', '),
        })
    }, [runId])

    // Clearing the old keys on success stops the banner coming back and
    // makes it obvious the browser copy is no longer the source of truth.
    const imported = fetcher.data && 'success' in fetcher.data && fetcher.data.success
    useEffect(() => {
        if (imported) {
            localStorage.removeItem(LEGACY_STATUS_KEY(runId))
            localStorage.removeItem(LEGACY_OVERRIDES_KEY(runId))
            localStorage.removeItem(LEGACY_PLANNER_KEY(runId))
        }
    }, [imported, runId])

    if (!local || dismissed) return null

    if (imported) {
        const message = fetcher.data && 'message' in fetcher.data ? fetcher.data.message : 'Imported.'
        return (
            <AdminCard mb="6">
                <styled.p fontSize="sm" color="status.success.fg">
                    {message}
                </styled.p>
            </AdminCard>
        )
    }

    const error = fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null
    const payload = local.payload

    function runImport() {
        if (
            !planningIsEmpty &&
            !confirm(
                'This run already has shared planning data that other organizers may have entered. ' +
                    'Importing will overwrite the board and merge your local statuses over the top. Continue?',
            )
        ) {
            return
        }
        void fetcher.submit(
            {
                intent: 'import_local',
                force: String(!planningIsEmpty),
                payload: JSON.stringify(payload),
            },
            { method: 'post' },
        )
    }

    return (
        <AdminCard mb="6">
            <Flex justifyContent="space-between" alignItems="center" gap="4" flexWrap="wrap">
                <Box>
                    <styled.h2 fontSize="md" fontWeight="semibold" mb="1">
                        Planning found in this browser
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600">
                        {local.summary} saved locally before agenda planning became shared.
                        {planningIsEmpty
                            ? ' Import it so the rest of the team can see it.'
                            : ' This run already has shared data — importing will overwrite the board.'}
                    </styled.p>
                    {error && (
                        <styled.p fontSize="sm" color="status.danger.fg" mt="1">
                            {error}
                        </styled.p>
                    )}
                </Box>
                <Flex gap="3">
                    <Button type="button" variant="outline" size="sm" onClick={() => setDismissed(true)}>
                        Not now
                    </Button>
                    <Button
                        type="button"
                        variant="solid"
                        size="sm"
                        disabled={fetcher.state !== 'idle'}
                        onClick={runImport}
                    >
                        {fetcher.state === 'idle' ? 'Import into shared agenda' : 'Importing…'}
                    </Button>
                </Flex>
            </Flex>
        </AdminCard>
    )
}

export default function VotingAgenda() {
    const { runId, runDetails, agendaTalks, planning, planningIsEmpty } = useLoaderData<typeof loader>()
    const revalidator = useRevalidator()

    // Planning decisions now live in D1 so the whole organizer team shares
    // one view. Server state is the source of truth; `pending` holds edits
    // that haven't round-tripped yet so the UI stays responsive and a poll
    // landing mid-edit can't flicker the old value back.
    const [pendingStatus, setPendingStatus] = useState<Record<string, TalkStatus>>({})
    const [pendingOverrides, setPendingOverrides] = useState<Record<string, TalkOverrides>>({})

    const statusByTalkId = useMemo(() => {
        const merged: Record<string, TalkStatus> = {}
        for (const [talkId, entry] of Object.entries(planning.planningByTalkId)) {
            if (entry.status !== undefined) merged[talkId] = entry.status
        }
        return { ...merged, ...pendingStatus }
    }, [planning.planningByTalkId, pendingStatus])

    const overridesByTalkId = useMemo(() => {
        const merged: Record<string, TalkOverrides> = {}
        for (const [talkId, entry] of Object.entries(planning.planningByTalkId)) {
            merged[talkId] = { um: entry.um, exp: entry.exp, topic: entry.topic }
        }
        for (const [talkId, overrides] of Object.entries(pendingOverrides)) {
            merged[talkId] = { ...merged[talkId], ...overrides }
        }
        return merged
    }, [planning.planningByTalkId, pendingOverrides])

    // Edits post through a queue rather than a fetcher: a fetcher aborts its
    // own in-flight request when it submits again, so two edits landing close
    // together (two debounced track renames, a capacity change during a
    // rename) would silently drop the first. Chaining keeps every write, and
    // in submission order — which matters because these are last-write-wins.
    const queue = useRef<Promise<unknown>>(Promise.resolve())
    const [inFlight, setInFlight] = useState(0)
    const [saveError, setSaveError] = useState<string | null>(null)

    const save = useCallback(
        (fields: Record<string, string>) => {
            setInFlight((n) => n + 1)
            queue.current = queue.current
                .then(async () => {
                    const response = await fetch(window.location.pathname, {
                        method: 'POST',
                        body: new URLSearchParams(fields),
                    })
                    if (!response.ok) {
                        throw new Error(`Save failed (${response.status})`)
                    }
                    const result: { success: boolean; error?: string } = await response.json()
                    if (!result.success) {
                        throw new Error(result.error ?? 'Save failed')
                    }
                    setSaveError(null)
                })
                .catch((error: unknown) => {
                    console.error('Failed to save agenda planning:', error)
                    setSaveError(error instanceof Error ? error.message : 'Failed to save')
                })
                .finally(() => setInFlight((n) => n - 1))
        },
        [],
    )

    const isSaving = inFlight > 0

    // Pull the saved values back once the queue drains, so the optimistic
    // copies below can be retired against real server state. Guarding on
    // revalidator.state keeps this from re-entering while a fetch is running.
    useEffect(() => {
        if (!isSaving && revalidator.state === 'idle') {
            void revalidator.revalidate()
        }
    }, [isSaving, revalidator])

    // Drop an optimistic value only once the server echoes it back. Clearing
    // as soon as the request settles would briefly un-apply the edit: the
    // save resolves before the revalidated loader data lands, so the UI would
    // flip to the stale server value and back again.
    useEffect(() => {
        setPendingStatus((current) => {
            const next = { ...current }
            let changed = false
            for (const [talkId, status] of Object.entries(current)) {
                if (planning.planningByTalkId[talkId]?.status === status) {
                    delete next[talkId]
                    changed = true
                }
            }
            return changed ? next : current
        })
        setPendingOverrides((current) => {
            const next = { ...current }
            let changed = false
            for (const [talkId, overrides] of Object.entries(current)) {
                const saved = planning.planningByTalkId[talkId]
                if (!saved) continue
                const remaining = { ...overrides }
                let touched = false
                for (const key of ['um', 'exp', 'topic'] as const) {
                    if (key in remaining && saved[key] === remaining[key]) {
                        delete remaining[key]
                        touched = true
                    }
                }
                if (!touched) continue
                changed = true
                if (Object.keys(remaining).length === 0) {
                    delete next[talkId]
                } else {
                    next[talkId] = remaining
                }
            }
            return changed ? next : current
        })
    }, [planning])

    // Poll so one organizer's changes show up on everyone else's screen.
    // Skipped while a save is in flight or the tab is hidden.
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && revalidator.state === 'idle' && !isSaving) {
                void revalidator.revalidate()
            }
        }, POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [revalidator, isSaving])

    const [selectedTalkId, setSelectedTalkId] = useState<string | null>(null)
    // Additional Info is too long to sit inline in the table, so the cell is a
    // one-line preview that opens the full text in its own popup.
    const [infoTalkId, setInfoTalkId] = useState<string | null>(null)

    // Every filter is multi-select: an empty array means "no filter", and
    // multiple values within one filter are OR'd. Separate filters are AND'd.
    // The stat tiles at the top of the page write into the same state, so
    // clicking a tile and picking from a dropdown are the same action.
    const [lengthFilter, setLengthFilter] = useState<string[]>([])
    const [tagFilter, setTagFilter] = useState<string[]>([])
    const [levelFilter, setLevelFilter] = useState<string[]>([])
    const [umFilter, setUmFilter] = useState<string[]>([])
    const [pronounFilter, setPronounFilter] = useState<string[]>([])
    const [roleFilter, setRoleFilter] = useState<string[]>([])
    const [expFilter, setExpFilter] = useState<string[]>([])
    const [statusFilter, setStatusFilter] = useState<string[]>([])

    /** Toggle a value in a multi-select filter — used by the clickable stat tiles. */
    function toggleFilterValue(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
        setter((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]))
    }

    const [collapsedColumns, setCollapsedColumns] = useState<Set<ColumnId>>(new Set())

    function toggleColumn(id: ColumnId) {
        setCollapsedColumns((current) => {
            const next = new Set(current)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    function updateStatus(talkId: string, status: TalkStatus) {
        setPendingStatus((current) => ({ ...current, [talkId]: status }))
        save({ intent: 'set_status', talkId, status })
    }

    function updateOverride<K extends keyof TalkOverrides>(talkId: string, key: K, value: TalkOverrides[K]) {
        setPendingOverrides((current) => ({ ...current, [talkId]: { ...current[talkId], [key]: value } }))
        save({ intent: 'set_override', talkId, field: key, value: String(value) })
    }

    // A manual override always wins; otherwise a talk Sessionize marked
    // declined/withdrawn defaults to "declined" without needing to be saved.
    function getEffectiveStatus(talk: AgendaTalk): TalkStatus {
        const override = statusByTalkId[talk.talkId]
        if (override !== undefined) {
            return override
        }
        return talk.isDeclinedInSessionize ? 'declined' : ''
    }

    function getComputedUm(talk: AgendaTalk): boolean {
        return talk.speakers.some((s) => s.isUnderrepresented)
    }

    function getEffectiveUm(talk: AgendaTalk): boolean {
        return overridesByTalkId[talk.talkId]?.um ?? getComputedUm(talk)
    }

    function getComputedExpFlag(talk: AgendaTalk): boolean {
        return talk.speakers.some((s) => s.role === JUNIOR_ROLE || (s.experience && NEW_SPEAKER_EXPERIENCE.has(s.experience)))
    }

    function getEffectiveExpFlag(talk: AgendaTalk): boolean {
        return overridesByTalkId[talk.talkId]?.exp ?? getComputedExpFlag(talk)
    }

    // The disclosed general topic always stays visible on the talk's tag
    // badge; an override only changes what the category counts roll up under.
    function getEffectiveTopic(talk: AgendaTalk): string {
        return overridesByTalkId[talk.talkId]?.topic || talk.generalTopic
    }

    const filterOptions = useMemo(() => {
        const lengths = new Set<string>()
        const tags = new Set<string>()
        const levels = new Set<string>()
        const generalTopics = new Set<string>()
        const pronouns = new Set<string>()
        const roles = new Set<string>()
        const experiences = new Set<string>()

        for (const talk of agendaTalks) {
            if (talk.length) lengths.add(talk.length)
            // Normalised the same way the Level column and stat tiles display
            // it, so the filter values match what's on screen.
            const level = formatLevel(talk.level)
            if (level) levels.add(level)
            if (talk.generalTopic) {
                tags.add(talk.generalTopic)
                generalTopics.add(talk.generalTopic)
            }
            for (const tag of talk.tags) tags.add(tag)
            for (const speaker of talk.speakers) {
                if (speaker.pronoun) pronouns.add(speaker.pronoun)
                if (speaker.role) roles.add(speaker.role)
                if (speaker.experience) experiences.add(speaker.experience)
            }
        }

        return {
            lengths: Array.from(lengths).sort(),
            tags: Array.from(tags).sort(),
            levels: Array.from(levels).sort(),
            generalTopics: Array.from(generalTopics).sort(),
            pronouns: Array.from(pronouns).sort(),
            roles: Array.from(roles).sort(),
            experiences: Array.from(experiences).sort(),
        }
    }, [agendaTalks])

    const activeFilterCount = [
        statusFilter,
        lengthFilter,
        tagFilter,
        levelFilter,
        umFilter,
        pronounFilter,
        roleFilter,
        expFilter,
    ].reduce((total, filter) => total + filter.length, 0)
    const hasActiveFilters = activeFilterCount > 0

    function clearFilters() {
        setStatusFilter([])
        setLengthFilter([])
        setTagFilter([])
        setLevelFilter([])
        setUmFilter([])
        setPronounFilter([])
        setRoleFilter([])
        setExpFilter([])
    }

    const filteredTalks = useMemo(() => {
        // An empty filter array matches everything; otherwise any one selected
        // value is enough (OR). Filters are then AND'd together.
        const matchesAny = (selected: string[], predicate: (value: string) => boolean) =>
            selected.length === 0 || selected.some(predicate)

        return agendaTalks.filter((talk) => {
            if (!matchesAny(statusFilter, (value) => getEffectiveStatus(talk) === value)) return false
            if (!matchesAny(lengthFilter, (value) => talk.length === value)) return false
            // The Tags filter covers both the general-topic badge and the
            // individual talk topics, since both render in that column.
            if (!matchesAny(tagFilter, (value) => getEffectiveTopic(talk) === value || talk.tags.includes(value))) {
                return false
            }
            if (!matchesAny(levelFilter, (value) => formatLevel(talk.level) === value)) return false
            if (!matchesAny(pronounFilter, (value) => talk.speakers.some((s) => s.pronoun === value))) return false
            if (!matchesAny(roleFilter, (value) => talk.speakers.some((s) => s.role === value))) return false

            // UM: the ticked-group checkbox, plus a wider "any minority" option
            // matching the UM stat tile (ticked group OR non-He/Him pronoun).
            if (
                !matchesAny(umFilter, (value) => {
                    if (value === ANY_MINORITY_FILTER) {
                        return (
                            getEffectiveUm(talk) ||
                            talk.speakers.some((s) => s.pronoun && s.pronoun !== HE_HIM_PRONOUN)
                        )
                    }
                    return getEffectiveUm(talk) === (value === 'yes')
                })
            ) {
                return false
            }

            // Exp: specific disclosed experience levels, plus the derived
            // junior/new-speaker flag.
            if (
                !matchesAny(expFilter, (value) =>
                    value === NEW_SPEAKER_FLAG_FILTER
                        ? getEffectiveExpFlag(talk)
                        : talk.speakers.some((s) => s.experience === value),
                )
            ) {
                return false
            }
            return true
        })
    }, [
        agendaTalks,
        statusFilter,
        lengthFilter,
        tagFilter,
        levelFilter,
        umFilter,
        pronounFilter,
        roleFilter,
        expFilter,
        overridesByTalkId,
        statusByTalkId,
    ])

    const stats = useMemo(() => {
        const totalTalks = agendaTalks.length
        const lockedTalks = agendaTalks.filter((talk) => getEffectiveStatus(talk) === 'locked')
        const tentativeTalks = agendaTalks.filter((talk) => getEffectiveStatus(talk) === 'tentative')
        const waitlistTalks = agendaTalks.filter((talk) => getEffectiveStatus(talk) === 'waitlist')
        const totalLocked = lockedTalks.length

        // Topic grouping uses the effective (possibly overridden) topic;
        // length has no override so it always uses the talk's raw length.
        // Talks with no topic/length (uncategorised/unspecified — including
        // talks that have vanished from Sessionize) are excluded entirely,
        // both as a bucket and from the % denominator for that breakdown.
        const byTopicTotal = new Map<string, number>()
        const byLengthTotal = new Map<string, number>()
        const byLevelTotal = new Map<string, number>()
        const byTopic = new Map<string, number>()
        const byLength = new Map<string, number>()
        const byLevel = new Map<string, number>()
        const byTopicTentative = new Map<string, number>()
        const byLengthTentative = new Map<string, number>()
        const byLevelTentative = new Map<string, number>()
        const byTopicWaitlist = new Map<string, number>()
        const byLengthWaitlist = new Map<string, number>()
        const byLevelWaitlist = new Map<string, number>()
        let totalTalksWithTopic = 0
        let totalTalksWithLength = 0
        let totalTalksWithLevel = 0
        let lockedTalksWithTopic = 0
        let lockedTalksWithLength = 0
        let lockedTalksWithLevel = 0

        for (const talk of agendaTalks) {
            const topic = getEffectiveTopic(talk)
            if (topic) {
                byTopicTotal.set(topic, (byTopicTotal.get(topic) ?? 0) + 1)
                totalTalksWithTopic++
            }

            const length = talk.length
            if (length) {
                byLengthTotal.set(length, (byLengthTotal.get(length) ?? 0) + 1)
                totalTalksWithLength++
            }

            const level = formatLevel(talk.level)
            if (level) {
                byLevelTotal.set(level, (byLevelTotal.get(level) ?? 0) + 1)
                totalTalksWithLevel++
            }
        }

        for (const talk of lockedTalks) {
            const topic = getEffectiveTopic(talk)
            if (topic) {
                byTopic.set(topic, (byTopic.get(topic) ?? 0) + 1)
                lockedTalksWithTopic++
            }

            const length = talk.length
            if (length) {
                byLength.set(length, (byLength.get(length) ?? 0) + 1)
                lockedTalksWithLength++
            }

            const level = formatLevel(talk.level)
            if (level) {
                byLevel.set(level, (byLevel.get(level) ?? 0) + 1)
                lockedTalksWithLevel++
            }
        }

        for (const talk of tentativeTalks) {
            const topic = getEffectiveTopic(talk)
            if (topic) {
                byTopicTentative.set(topic, (byTopicTentative.get(topic) ?? 0) + 1)
            }

            const length = talk.length
            if (length) {
                byLengthTentative.set(length, (byLengthTentative.get(length) ?? 0) + 1)
            }

            const level = formatLevel(talk.level)
            if (level) {
                byLevelTentative.set(level, (byLevelTentative.get(level) ?? 0) + 1)
            }
        }

        for (const talk of waitlistTalks) {
            const topic = getEffectiveTopic(talk)
            if (topic) {
                byTopicWaitlist.set(topic, (byTopicWaitlist.get(topic) ?? 0) + 1)
            }

            const length = talk.length
            if (length) {
                byLengthWaitlist.set(length, (byLengthWaitlist.get(length) ?? 0) + 1)
            }

            const level = formatLevel(talk.level)
            if (level) {
                byLevelWaitlist.set(level, (byLevelWaitlist.get(level) ?? 0) + 1)
            }
        }

        // Diversity/experience signals are counted per distinct speaker (not
        // per talk) — a speaker with multiple locked talks is only counted once.
        const lockedSpeakersById = new Map<string, AgendaSpeaker>()
        for (const talk of lockedTalks) {
            for (const speaker of talk.speakers) {
                if (!lockedSpeakersById.has(speaker.id)) {
                    lockedSpeakersById.set(speaker.id, speaker)
                }
            }
        }
        const lockedSpeakers = Array.from(lockedSpeakersById.values())
        const totalSpeakers = lockedSpeakers.length

        const diverseSpeakerCount = lockedSpeakers.filter(
            (s) => s.isUnderrepresented || (s.pronoun && s.pronoun !== HE_HIM_PRONOUN),
        ).length
        const juniorOrNewSpeakerCount = lockedSpeakers.filter(
            (s) => s.role === JUNIOR_ROLE || (s.experience && NEW_SPEAKER_EXPERIENCE.has(s.experience)),
        ).length

        // byTopicTotal/byLengthTotal are built from every talk, so their keys
        // are already a superset of the locked/tentative-only maps.
        return {
            total: totalLocked,
            totalTalks,
            totalTentative: tentativeTalks.length,
            totalWaitlist: waitlistTalks.length,
            totalSpeakers,
            byTopic: Array.from(byTopicTotal.entries())
                .map(([topic, totalCount]) => ({
                    key: topic,
                    totalCount,
                    totalPct: totalTalksWithTopic > 0 ? (totalCount / totalTalksWithTopic) * 100 : 0,
                    lockedCount: byTopic.get(topic) ?? 0,
                    lockedPct:
                        lockedTalksWithTopic > 0 ? ((byTopic.get(topic) ?? 0) / lockedTalksWithTopic) * 100 : 0,
                    tentativeCount: byTopicTentative.get(topic) ?? 0,
                    waitlistCount: byTopicWaitlist.get(topic) ?? 0,
                }))
                .sort((a, b) => b.lockedCount - a.lockedCount),
            byLength: Array.from(byLengthTotal.entries())
                .map(([length, totalCount]) => ({
                    key: length,
                    totalCount,
                    totalPct: totalTalksWithLength > 0 ? (totalCount / totalTalksWithLength) * 100 : 0,
                    lockedCount: byLength.get(length) ?? 0,
                    lockedPct:
                        lockedTalksWithLength > 0 ? ((byLength.get(length) ?? 0) / lockedTalksWithLength) * 100 : 0,
                    tentativeCount: byLengthTentative.get(length) ?? 0,
                    waitlistCount: byLengthWaitlist.get(length) ?? 0,
                }))
                .sort((a, b) => b.lockedCount - a.lockedCount),
            byLevel: Array.from(byLevelTotal.entries())
                .map(([level, totalCount]) => ({
                    key: level,
                    totalCount,
                    totalPct: totalTalksWithLevel > 0 ? (totalCount / totalTalksWithLevel) * 100 : 0,
                    lockedCount: byLevel.get(level) ?? 0,
                    lockedPct: lockedTalksWithLevel > 0 ? ((byLevel.get(level) ?? 0) / lockedTalksWithLevel) * 100 : 0,
                    tentativeCount: byLevelTentative.get(level) ?? 0,
                    waitlistCount: byLevelWaitlist.get(level) ?? 0,
                }))
                .sort((a, b) => b.lockedCount - a.lockedCount),
            diverseSpeakerCount,
            juniorOrNewSpeakerCount,
        }
    }, [agendaTalks, statusByTalkId, overridesByTalkId])

    // Speakers who have at least one locked talk — used to flag their other
    // talks, even ones with co-speakers, as a heads-up before locking more.
    const speakerIdsWithLockedTalk = useMemo(() => {
        const ids = new Set<string>()
        for (const talk of agendaTalks) {
            if (getEffectiveStatus(talk) === 'locked') {
                for (const speaker of talk.speakers) ids.add(speaker.id)
            }
        }
        return ids
    }, [agendaTalks, statusByTalkId])

    const flaggedTalkIds = useMemo(() => {
        const ids = new Set<string>()
        for (const talk of agendaTalks) {
            if (getEffectiveStatus(talk) === 'locked') continue
            if (talk.speakers.some((s) => speakerIdsWithLockedTalk.has(s.id))) {
                ids.add(talk.talkId)
            }
        }
        return ids
    }, [agendaTalks, speakerIdsWithLockedTalk, statusByTalkId])

    // Talks already laid onto the planner board, so the ranked table can show
    // at a glance which ones are spoken for and which still need a home.
    const placedTalkIds = useMemo(() => getPlacedTalkIds(planning.board), [planning.board])

    const selectedTalk = selectedTalkId ? agendaTalks.find((t) => t.talkId === selectedTalkId) : undefined
    const infoTalk = infoTalkId ? agendaTalks.find((t) => t.talkId === infoTalkId) : undefined

    // Only talks in the running are worth laying onto the board — scheduling a
    // declined talk isn't meaningful, and the full ranked list would swamp it.
    const plannerTalks: PlannerTalk[] = useMemo(
        () =>
            agendaTalks
                .filter((talk) => {
                    const status = getEffectiveStatus(talk)
                    return status === 'locked' || status === 'tentative'
                })
                .map((talk) => ({
                    talkId: talk.talkId,
                    title: talk.title,
                    length: talk.length,
                    speakers: talk.speakers.map((s) => s.name).join(', ') || 'Unknown Speaker',
                    topic: getEffectiveTopic(talk),
                    status: getEffectiveStatus(talk),
                    // Signals mirrored from the table so the balance of the
                    // agenda (diversity, experience, level) is visible while
                    // the board is being filled, not only in the stats above.
                    rank: talk.rank,
                    level: formatLevel(talk.level),
                    um: getEffectiveUm(talk),
                    newSpeaker: getEffectiveExpFlag(talk),
                    speakerExperience: getMostExperienced(talk.speakers),
                })),
        [agendaTalks, statusByTalkId, overridesByTalkId],
    )

    const columns: ColumnDef[] = [
        {
            id: 'status',
            label: 'Status',
            headerWidth: '[150px]',
            cellProps: { minW: '[150px]' },
            filter: {
                values: statusFilter,
                onChange: setStatusFilter,
                // '' is offered as "No status" so undecided talks can be
                // filtered for alongside a real status (e.g. waitlist + no
                // status). getEffectiveStatus returns '' for them, so the
                // existing equality match already works.
                options: STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.value === '' ? 'No status' : o.label,
                })),
            },
            renderCell: (talk) => (
                <>
                    {placedTalkIds.has(talk.talkId) && (
                        <styled.span
                            display="inline-block"
                            mb="1"
                            px="2"
                            py="1"
                            borderRadius="full"
                            fontSize="xs"
                            fontWeight="semibold"
                            bg="status.success.bg"
                            color="status.success.fg"
                            title="This talk is placed on the agenda planner board"
                        >
                            ✓ In agenda
                        </styled.span>
                    )}
                <styled.select
                    value={getEffectiveStatus(talk)}
                    onChange={(e) => updateStatus(talk.talkId, e.target.value as TalkStatus)}
                    bg="white"
                    border="admin-subtle"
                    borderRadius="md"
                    px="2"
                    py="1"
                    fontSize="sm"
                    width="full"
                >
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </styled.select>
                </>
            ),
        },
        {
            id: 'rank',
            label: 'Rank',
            align: 'center',
            headerWidth: '[60px]',
            cellProps: { fontWeight: 'semibold' },
            renderCell: (talk) => `#${talk.rank}`,
        },
        {
            id: 'title',
            label: 'Talk Title',
            headerWidth: '[420px]',
            cellProps: { minW: '[420px]', maxW: '[560px]' },
            renderCell: (talk) => (
                <>
                    <styled.button
                        type="button"
                        onClick={() => setSelectedTalkId(talk.talkId)}
                        display="block"
                        width="full"
                        // Anchors the column's intrinsic width — an auto-layout
                        // <td> ignores minW, so the content has to carry it.
                        minW="[380px]"
                        textAlign="left"
                        whiteSpace="normal"
                        fontWeight="medium"
                        color="prose.link"
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                    >
                        {talk.title}
                    </styled.button>
                </>
            ),
        },
        {
            id: 'length',
            label: 'Length',
            filter: {
                values: lengthFilter,
                onChange: setLengthFilter,
                options: filterOptions.lengths.map((l) => ({ value: l, label: l })),
            },
            cellProps: { fontSize: 'xs', whiteSpace: 'nowrap' },
            renderCell: (talk) => talk.length || '—',
        },
        {
            id: 'level',
            label: 'Level',
            filter: {
                values: levelFilter,
                onChange: setLevelFilter,
                options: filterOptions.levels.map((l) => ({ value: l, label: l })),
            },
            cellProps: { fontSize: 'xs', maxW: '[140px]' },
            renderCell: (talk) => {
                const displayLevel = formatLevel(talk.level)
                return displayLevel ? (
                    <styled.div overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={displayLevel}>
                        {displayLevel}
                    </styled.div>
                ) : (
                    '—'
                )
            },
        },
        {
            id: 'tags',
            label: 'Tags',
            filter: {
                values: tagFilter,
                onChange: setTagFilter,
                options: filterOptions.tags.map((t) => ({ value: t, label: t })),
            },
            headerWidth: '[280px]',
            cellProps: { minW: '[280px]', maxW: '[320px]' },
            renderCell: (talk) => {
                // Two visible tags keeps rows compact now the badges are
                // larger; the rest stay in the "+N" tooltip.
                const visibleTags = talk.tags.slice(0, 2)
                const hiddenTags = talk.tags.slice(2)
                return (
                    <Flex gap="1" flexWrap="wrap" alignItems="center">
                        <TopicSelectBadge
                            disclosedTopic={talk.generalTopic}
                            value={getEffectiveTopic(talk)}
                            options={filterOptions.generalTopics}
                            onChange={(value) => updateOverride(talk.talkId, 'topic', value)}
                        />
                        {visibleTags.map((tag) => (
                            <TagBadge key={tag}>{tag}</TagBadge>
                        ))}
                        {hiddenTags.length > 0 && (
                            <styled.span fontSize="xs" color="admin.500" title={hiddenTags.join(', ')}>
                                … +{hiddenTags.length}
                            </styled.span>
                        )}
                    </Flex>
                )
            },
        },
        {
            id: 'speakers',
            label: 'Speaker(s)',
            cellProps: { fontSize: 'xs', color: 'admin.600' },
            renderCell: (talk) => (
                <>
                    {talk.speakers.map((s) => s.name).join(', ') || 'Unknown Speaker'}
                </>
            ),
        },
        {
            id: 'um',
            label: 'UM',
            filter: {
                values: umFilter,
                onChange: setUmFilter,
                // "Ticked group" is the checkbox in this column; "incl. pronoun"
                // is the wider definition the UM stat tile counts (ticked group
                // OR any non-He/Him pronoun).
                options: [
                    { value: 'yes', label: 'Ticked group' },
                    { value: 'no', label: 'Not ticked' },
                    { value: ANY_MINORITY_FILTER, label: 'Any minority (incl. pronoun)' },
                ],
            },
            cellProps: { fontSize: 'xs', color: 'admin.600' },
            renderCell: (talk) => {
                const disclosed = formatSpeakerValues(talk.speakers, (s) => s.underrepresentedGroup)
                const tooltip = disclosed === '—' ? 'No group disclosed — click to override' : disclosed
                return (
                    <input
                        type="checkbox"
                        checked={getEffectiveUm(talk)}
                        onChange={(e) => updateOverride(talk.talkId, 'um', e.target.checked)}
                        title={tooltip}
                    />
                )
            },
        },
        {
            id: 'pronoun',
            label: 'Pronoun',
            filter: {
                values: pronounFilter,
                onChange: setPronounFilter,
                options: filterOptions.pronouns.map((p) => ({ value: p, label: p })),
            },
            cellProps: { fontSize: 'xs', color: 'admin.600' },
            renderCell: (talk) => formatSpeakerValues(talk.speakers, (s) => s.pronoun),
        },
        {
            id: 'role',
            label: 'Role',
            filter: {
                values: roleFilter,
                onChange: setRoleFilter,
                options: filterOptions.roles.map((r) => ({ value: r, label: r })),
            },
            cellProps: { fontSize: 'xs', color: 'admin.600' },
            renderCell: (talk) => formatSpeakerValues(talk.speakers, (s) => s.role),
        },
        {
            id: 'exp',
            label: 'Exp',
            filter: {
                values: expFilter,
                onChange: setExpFilter,
                // The disclosed experience levels, plus the derived junior/new
                // flag (which honours the per-talk checkbox override).
                options: [
                    { value: NEW_SPEAKER_FLAG_FILTER, label: 'New / junior (flagged)' },
                    ...filterOptions.experiences.map((exp) => ({ value: exp, label: formatExperience(exp) })),
                ],
            },
            cellProps: { fontSize: 'xs', color: 'admin.600' },
            renderCell: (talk) => (
                <Flex align="center" gap="2">
                    <input
                        type="checkbox"
                        checked={getEffectiveExpFlag(talk)}
                        onChange={(e) => updateOverride(talk.talkId, 'exp', e.target.checked)}
                        title="Manually override Graduate/Junior or first-time/rare flag"
                    />
                    <span>{formatSpeakerValues(talk.speakers, (s) => s.experience && formatExperience(s.experience))}</span>
                </Flex>
            ),
        },
        {
            id: 'info',
            label: 'Info',
            align: 'center',
            headerWidth: '[130px]',
            cellProps: { fontSize: 'xs', color: 'admin.600', maxW: '[130px]' },
            renderCell: (talk) => {
                const hasInfo = talk.speakers.some((s) => s.additionalInfo)
                if (!hasInfo) {
                    return <styled.span color="admin.400">—</styled.span>
                }
                const info = formatSpeakerValues(talk.speakers, (s) => s.additionalInfo)
                return (
                    <styled.button
                        type="button"
                        onClick={() => setInfoTalkId(talk.talkId)}
                        title={info}
                        display="block"
                        // A fixed max width (not width="full") keeps the long
                        // single-line text from forcing the whole table wide —
                        // an auto-layout <td> grows to its content's intrinsic
                        // width no matter what maxW the cell itself carries.
                        maxW="[120px]"
                        textAlign="left"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        color="prose.link"
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                    >
                        {info}
                    </styled.button>
                )
            },
        },
    ]

    return (
        <AdminLayout heading="Agenda" fullWidth>
            <AdminCard mb="6">
                <Flex justifyContent="space-between" alignItems="flex-start" mb="4">
                    <Box>
                        <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                            Validation Run Details
                        </styled.h2>
                        <styled.p fontSize="sm" color="admin.600" mb="1">
                            Run ID:{' '}
                            <styled.code fontSize="xs" bg="admin.100" px="1" borderRadius="sm">
                                {runId}
                            </styled.code>
                        </styled.p>
                        {runDetails && (
                            <>
                                <styled.p fontSize="sm" color="admin.600" mb="1">
                                    Started:{' '}
                                    {DateTime.fromISO(runDetails.startedAt, {
                                        zone: conferenceManifest.public.timezone,
                                    }).toLocaleString(DateTime.DATETIME_SHORT, {
                                        locale: 'en-AU',
                                    })}
                                </styled.p>
                                <styled.p fontSize="sm" color="admin.600">
                                    Status:{' '}
                                    <styled.span
                                        px="2"
                                        py="1"
                                        borderRadius="full"
                                        fontSize="xs"
                                        fontWeight="medium"
                                        bg={
                                            runDetails.status === 'completed'
                                                ? 'status.success.bg'
                                                : runDetails.status === 'running'
                                                  ? 'status.info.bg'
                                                  : 'status.danger.bg'
                                        }
                                        color={
                                            runDetails.status === 'completed'
                                                ? 'status.success.fg'
                                                : runDetails.status === 'running'
                                                  ? 'status.info.fg'
                                                  : 'status.danger.fg'
                                        }
                                    >
                                        {runDetails.status}
                                    </styled.span>
                                </styled.p>
                            </>
                        )}
                    </Box>
                    <AppLink
                        to="/admin/voting"
                        display="inline-block"
                        color="prose.link"
                        textDecoration="underline"
                        py="2"
                        px="4"
                        borderRadius="md"
                        fontSize="sm"
                        fontWeight="medium"
                        _hover={{ bg: 'admin.800' }}
                    >
                        ← Back to Voting Admin
                    </AppLink>
                </Flex>
            </AdminCard>

            {saveError && (
                <AdminCard mb="6">
                    <styled.p fontSize="sm" color="status.danger.fg">
                        Couldn&rsquo;t save your last change: {saveError}. Your edits may not be shared with the rest
                        of the team — reload to see the current state.
                    </styled.p>
                </AdminCard>
            )}

            <LocalPlanningImport runId={runId} planningIsEmpty={planningIsEmpty} />

            {agendaTalks.length > 0 && (
                <AdminCard mb="6">
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                        Locked Talks Overview ({stats.total} of {stats.totalTalks})
                    </styled.h2>

                    {/* Headline counts for the two undecided buckets, so the
                        size of the remaining decisions is visible without
                        totting up the per-category tiles. Both are clickable
                        filters, like the category tiles below. */}
                    <Flex gap="4" flexWrap="wrap" mb="4">
                        <StatTile
                            label="Accepted"
                            value={stats.total}
                            active={statusFilter.includes('locked')}
                            onToggle={() => toggleFilterValue(setStatusFilter, 'locked')}
                        />
                        <StatTile
                            label="Tentative"
                            value={stats.totalTentative}
                            active={statusFilter.includes('tentative')}
                            onToggle={() => toggleFilterValue(setStatusFilter, 'tentative')}
                        />
                        <StatTile
                            label="Waitlist"
                            value={stats.totalWaitlist}
                            active={statusFilter.includes('waitlist')}
                            onToggle={() => toggleFilterValue(setStatusFilter, 'waitlist')}
                        />
                    </Flex>

                    <styled.h3 fontSize="md" fontWeight="semibold" mb="2" color="admin.600">
                        By General Topic Category
                    </styled.h3>
                    <Flex gap="4" direction={{ base: 'column', sm: 'row' }} flexWrap="wrap" mb="4">
                        {stats.byTopic.length === 0 ? (
                            <styled.p fontSize="sm" color="admin.600">
                                No talks yet.
                            </styled.p>
                        ) : (
                            stats.byTopic.map((item) => (
                                <CategoryStatTile
                                    key={item.key}
                                    label={item.key}
                                    totalCount={item.totalCount}
                                    totalPct={item.totalPct}
                                    lockedCount={item.lockedCount}
                                    lockedPct={item.lockedPct}
                                    tentativeCount={item.tentativeCount}
                                    waitlistCount={item.waitlistCount}
                                    active={tagFilter.includes(item.key)}
                                    onToggle={() => toggleFilterValue(setTagFilter, item.key)}
                                />
                            ))
                        )}
                    </Flex>

                    <Flex gap="6" direction={{ base: 'column', lg: 'row' }} alignItems="flex-start">
                        <Box flex="[0.8]" minW="0" w="full">
                            <styled.h3 fontSize="md" fontWeight="semibold" mb="2" color="admin.600">
                                By Length
                            </styled.h3>
                            <Flex gap="4" flexWrap="wrap">
                                {stats.byLength.length === 0 ? (
                                    <styled.p fontSize="sm" color="admin.600">
                                        No talks yet.
                                    </styled.p>
                                ) : (
                                    stats.byLength.map((item) => (
                                        <CategoryStatTile
                                            key={item.key}
                                            label={item.key}
                                            totalCount={item.totalCount}
                                            totalPct={item.totalPct}
                                            lockedCount={item.lockedCount}
                                            lockedPct={item.lockedPct}
                                            tentativeCount={item.tentativeCount}
                                            waitlistCount={item.waitlistCount}
                                            active={lengthFilter.includes(item.key)}
                                            onToggle={() => toggleFilterValue(setLengthFilter, item.key)}
                                        />
                                    ))
                                )}
                            </Flex>
                        </Box>

                        <Box flex="[1.6]" minW="0" w="full">
                            <styled.h3 fontSize="md" fontWeight="semibold" mb="2" color="admin.600">
                                By Level
                            </styled.h3>
                            <Flex gap="4" flexWrap="wrap">
                                {stats.byLevel.length === 0 ? (
                                    <styled.p fontSize="sm" color="admin.600">
                                        No talks yet.
                                    </styled.p>
                                ) : (
                                    stats.byLevel.map((item) => (
                                        <CategoryStatTile
                                            key={item.key}
                                            label={item.key}
                                            totalCount={item.totalCount}
                                            totalPct={item.totalPct}
                                            lockedCount={item.lockedCount}
                                            lockedPct={item.lockedPct}
                                            tentativeCount={item.tentativeCount}
                                            waitlistCount={item.waitlistCount}
                                            active={levelFilter.includes(item.key)}
                                            onToggle={() => toggleFilterValue(setLevelFilter, item.key)}
                                        />
                                    ))
                                )}
                            </Flex>
                        </Box>

                        <Box flex="[0.8]" minW="0" w="full">
                            <styled.h3 fontSize="md" fontWeight="semibold" mb="2" color="admin.600">
                                Speakers ({stats.totalSpeakers} distinct locked speakers)
                            </styled.h3>
                            <Flex gap="4" flexWrap="wrap">
                                <StatTile
                                    label="UM"
                                    value={formatCountPercent(stats.diverseSpeakerCount, stats.totalSpeakers)}
                                    active={umFilter.includes(ANY_MINORITY_FILTER)}
                                    onToggle={() => toggleFilterValue(setUmFilter, ANY_MINORITY_FILTER)}
                                />
                                <StatTile
                                    label="New"
                                    value={formatCountPercent(stats.juniorOrNewSpeakerCount, stats.totalSpeakers)}
                                    active={expFilter.includes(NEW_SPEAKER_FLAG_FILTER)}
                                    onToggle={() => toggleFilterValue(setExpFilter, NEW_SPEAKER_FLAG_FILTER)}
                                />
                            </Flex>
                        </Box>
                    </Flex>
                </AdminCard>
            )}

            {agendaTalks.length > 0 && (
                <AdminCard mb="6">
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="1">
                        Agenda Planner
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        Lay out tracks and slots for the {plannerTalks.length} accepted and tentative talks. Shared
                        with the whole organizer team.
                    </styled.p>
                    <AgendaPlanner
                        board={planning.board}
                        talks={plannerTalks}
                        availableLengths={filterOptions.lengths}
                        onChange={(change) => save(change)}
                        onSelectTalk={setSelectedTalkId}
                    />
                </AdminCard>
            )}

            <AdminCard>
                <Flex justifyContent="space-between" alignItems="center" mb="4" flexWrap="wrap" gap="3">
                    <styled.h2 fontSize="xl" fontWeight="semibold">
                        Ranked Talks
                    </styled.h2>
                    {agendaTalks.length > 0 && (
                        <Flex gap="3">
                            {hasActiveFilters && (
                                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                                    Clear filters ({activeFilterCount})
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="solid"
                                size="sm"
                                onClick={() =>
                                    downloadAgendaCsv(
                                        runId,
                                        agendaTalks,
                                        getEffectiveStatus,
                                        getEffectiveUm,
                                        getEffectiveExpFlag,
                                        flaggedTalkIds,
                                    )
                                }
                            >
                                Export CSV
                            </Button>
                        </Flex>
                    )}
                </Flex>

                {agendaTalks.length > 0 && (
                    <styled.p fontSize="sm" color="admin.600" mb="3">
                        Showing {filteredTalks.length} of {agendaTalks.length}
                    </styled.p>
                )}

                {filteredTalks.length > 0 ? (
                    <Box overflowX="auto">
                        {/* minWidth stops the browser squeezing every column to
                            fit the viewport — the wrapper scrolls instead, so
                            Status and Talk Title keep their intended widths. */}
                        <styled.table width="full" minWidth="[1500px]" fontSize="sm">
                            <thead>
                                <tr>
                                    {columns.map((column) => (
                                        <ColumnHeaderCell
                                            key={column.id}
                                            column={column}
                                            collapsed={collapsedColumns.has(column.id)}
                                            onToggle={() => toggleColumn(column.id)}
                                        />
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTalks.map((talk) => {
                                    const status = getEffectiveStatus(talk)
                                    const statusStyle = status ? STATUS_STYLES[status] : undefined
                                    const isFlagged = flaggedTalkIds.has(talk.talkId)

                                    return (
                                        <styled.tr
                                            key={talk.talkId}
                                            bg={isFlagged ? FLAGGED_ROW_BG : (statusStyle?.bg ?? 'transparent')}
                                        >
                                            {columns.map((column) => (
                                                <ColumnBodyCell
                                                    key={column.id}
                                                    column={column}
                                                    collapsed={collapsedColumns.has(column.id)}
                                                    talk={talk}
                                                />
                                            ))}
                                        </styled.tr>
                                    )
                                })}
                            </tbody>
                        </styled.table>
                    </Box>
                ) : agendaTalks.length > 0 ? (
                    <styled.p textAlign="center" py="8" color="admin.600">
                        No talks match the current filters.
                    </styled.p>
                ) : (
                    <styled.p textAlign="center" py="8" color="admin.600">
                        No results uploaded for this run yet.{' '}
                        <AppLink to="/admin/voting" color="prose.link" textDecoration="underline">
                            Run or upload validation results
                        </AppLink>{' '}
                        first.
                    </styled.p>
                )}
            </AdminCard>

            <Modal.Root open={infoTalk != null} onOpenChange={(details) => !details.open && setInfoTalkId(null)}>
                <Modal.Backdrop position="fixed" inset="0" bg="overlay.scrim" zIndex="modal" />
                <Modal.Positioner
                    position="fixed"
                    inset="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    p="4"
                    zIndex="modal"
                >
                    <Modal.Content
                        bg="white"
                        borderRadius="xl"
                        boxShadow="lg"
                        maxW="[640px]"
                        w="full"
                        maxH="[85vh]"
                        overflowY="auto"
                        p="6"
                    >
                        {infoTalk && (
                            <>
                                <Flex justifyContent="space-between" alignItems="flex-start" gap="4" mb="4">
                                    <Box>
                                        <Modal.Title fontSize="lg" fontWeight="semibold">
                                            Additional Info
                                        </Modal.Title>
                                        <styled.p fontSize="sm" color="admin.600" mt="1">
                                            {infoTalk.title}
                                        </styled.p>
                                    </Box>
                                    <Modal.CloseTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            Close
                                        </Button>
                                    </Modal.CloseTrigger>
                                </Flex>

                                <Flex direction="column" gap="3">
                                    {infoTalk.speakers
                                        .filter((speaker) => speaker.additionalInfo)
                                        .map((speaker) => (
                                            <Box key={speaker.id} p="3" bg="admin.50" borderRadius="md">
                                                <styled.p fontWeight="semibold" fontSize="sm" mb="1">
                                                    {speaker.name}
                                                </styled.p>
                                                <styled.p fontSize="sm" color="admin.800" whiteSpace="pre-wrap">
                                                    {speaker.additionalInfo}
                                                </styled.p>
                                            </Box>
                                        ))}
                                </Flex>
                            </>
                        )}
                    </Modal.Content>
                </Modal.Positioner>
            </Modal.Root>

            <Modal.Root open={selectedTalk != null} onOpenChange={(details) => !details.open && setSelectedTalkId(null)}>
                <Modal.Backdrop position="fixed" inset="0" bg="overlay.scrim" zIndex="modal" />
                <Modal.Positioner
                    position="fixed"
                    inset="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    p="4"
                    zIndex="modal"
                >
                    <Modal.Content
                        bg="white"
                        borderRadius="xl"
                        boxShadow="lg"
                        maxW="[720px]"
                        w="full"
                        maxH="[85vh]"
                        overflowY="auto"
                        p="6"
                    >
                        {selectedTalk && (
                            <>
                                <Flex justifyContent="space-between" alignItems="flex-start" gap="4" mb="4">
                                    <Modal.Title fontSize="xl" fontWeight="semibold">
                                        {selectedTalk.title}
                                    </Modal.Title>
                                    <Modal.CloseTrigger asChild>
                                        <Button type="button" variant="outline" size="sm">
                                            Close
                                        </Button>
                                    </Modal.CloseTrigger>
                                </Flex>

                                <Flex gap="4" flexWrap="wrap" mb="4">
                                    <StatTile
                                        label="Status"
                                        value={
                                            STATUS_OPTIONS.find((o) => o.value === getEffectiveStatus(selectedTalk))
                                                ?.label ?? '—'
                                        }
                                    />
                                    <StatTile label="Rank" value={`#${selectedTalk.rank}`} />
                                    <StatTile label="Wins" value={selectedTalk.wins} />
                                    <StatTile label="Losses" value={selectedTalk.losses} />
                                    <StatTile label="Total Votes" value={selectedTalk.totalVotes} />
                                    <StatTile label="Win %" value={`${formatWinPct(selectedTalk)}%`} />
                                    {selectedTalk.hasSessionData && (
                                        <>
                                            <StatTile label="Length" value={selectedTalk.length || '—'} />
                                            <StatTile label="Level" value={selectedTalk.level || '—'} />
                                        </>
                                    )}
                                </Flex>

                                {!selectedTalk.hasSessionData && (
                                    <styled.p fontSize="sm" color="status.danger.fg" fontWeight="medium" mb="4">
                                        This talk no longer appears in Sessionize — topic, length, tags and speaker
                                        details aren't available.
                                    </styled.p>
                                )}

                                {flaggedTalkIds.has(selectedTalk.talkId) && (
                                    <styled.p fontSize="sm" color="pink.700" fontWeight="medium" mb="4">
                                        ⚠ A speaker on this talk already has a locked talk elsewhere.
                                    </styled.p>
                                )}

                                {selectedTalk.hasSessionData && (
                                    <>
                                        <Flex gap="1" flexWrap="wrap" alignItems="center" mb="4">
                                            <TopicSelectBadge
                                                disclosedTopic={selectedTalk.generalTopic}
                                                value={getEffectiveTopic(selectedTalk)}
                                                options={filterOptions.generalTopics}
                                                onChange={(value) => updateOverride(selectedTalk.talkId, 'topic', value)}
                                            />
                                            {selectedTalk.tags.map((tag) => (
                                                <TagBadge key={tag}>{tag}</TagBadge>
                                            ))}
                                        </Flex>

                                        {selectedTalk.description && (
                                            <styled.p fontSize="sm" color="admin.700" mb="4" whiteSpace="pre-wrap">
                                                {selectedTalk.description}
                                            </styled.p>
                                        )}

                                        <styled.a
                                            href={`https://sessionize.com/app/organizer/session/${SESSIONIZE_ORGANIZER_EVENT_ID}/${selectedTalk.talkId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            display="inline-block"
                                            fontSize="sm"
                                            color="prose.link"
                                            textDecoration="underline"
                                            mb="6"
                                        >
                                            View on Sessionize ↗
                                        </styled.a>

                                        <styled.h3 fontSize="md" fontWeight="semibold" mb="3">
                                            Speakers
                                        </styled.h3>
                                        <Flex direction="column" gap="4">
                                            {selectedTalk.speakers.length === 0 && (
                                                <styled.p fontSize="sm" color="admin.600">
                                                    No speaker data available.
                                                </styled.p>
                                            )}
                                            {selectedTalk.speakers.map((speaker) => (
                                                <Box key={speaker.id} p="3" bg="admin.50" borderRadius="md">
                                                    <styled.p fontWeight="semibold" mb="1">
                                                        {speaker.name}
                                                    </styled.p>
                                                    {speaker.tagLine && (
                                                        <styled.p fontSize="sm" color="admin.600" mb="2">
                                                            {speaker.tagLine}
                                                        </styled.p>
                                                    )}

                                                    <Flex gap="4" flexWrap="wrap" mb="2">
                                                        <styled.p fontSize="xs" color="admin.600">
                                                            Pronoun:{' '}
                                                            <styled.span fontWeight="medium">
                                                                {speaker.pronoun || '—'}
                                                            </styled.span>
                                                        </styled.p>
                                                        <styled.p fontSize="xs" color="admin.600">
                                                            Role:{' '}
                                                            <styled.span fontWeight="medium">
                                                                {speaker.role || '—'}
                                                            </styled.span>
                                                        </styled.p>
                                                        <styled.p fontSize="xs" color="admin.600">
                                                            Experience:{' '}
                                                            <styled.span fontWeight="medium">
                                                                {speaker.experience || '—'}
                                                            </styled.span>
                                                        </styled.p>
                                                        <styled.p fontSize="xs" color="admin.600">
                                                            UM:{' '}
                                                            <styled.span fontWeight="medium">
                                                                {speaker.underrepresentedGroup || '—'}
                                                            </styled.span>
                                                        </styled.p>
                                                    </Flex>

                                                    {speaker.bio && (
                                                        <styled.p fontSize="sm" color="admin.700" mb="2" whiteSpace="pre-wrap">
                                                            {speaker.bio}
                                                        </styled.p>
                                                    )}

                                                    {speaker.additionalInfo && (
                                                        <Box mt="2" p="3" bg="status.info.bg" borderRadius="md">
                                                            <styled.p
                                                                fontSize="xs"
                                                                fontWeight="bold"
                                                                color="status.info.fg"
                                                                mb="1"
                                                                textTransform="uppercase"
                                                                letterSpacing="wide"
                                                            >
                                                                Additional Info
                                                            </styled.p>
                                                            <styled.p
                                                                fontSize="sm"
                                                                fontWeight="medium"
                                                                color="admin.900"
                                                                whiteSpace="pre-wrap"
                                                            >
                                                                {speaker.additionalInfo}
                                                            </styled.p>
                                                        </Box>
                                                    )}
                                                </Box>
                                            ))}
                                        </Flex>
                                    </>
                                )}
                            </>
                        )}
                    </Modal.Content>
                </Modal.Positioner>
            </Modal.Root>
        </AdminLayout>
    )
}
