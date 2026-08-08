import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useEffect, useMemo, useState } from 'react'
import { useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { Button } from '~/components/ui/button'
import * as Modal from '~/components/ui/drawer'
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

type TalkStatus = 'locked' | 'tentative' | 'declined' | 'waitlist' | ''

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
    winPct: number
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

                    // Any disclosed answer counts as underrepresented unless the
                    // speaker explicitly answered "No" — organizers override
                    // individual talks case-by-case via the UM checkbox instead
                    // of maintaining a curated group list.
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
                            ? underrepresentedGroup.trim().toLowerCase() !== 'no'
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
                    winPct: result.winPct,
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

    return { runId, runDetails, agendaTalks }
}

function formatSpeakerValues(speakers: AgendaSpeaker[], get: (speaker: AgendaSpeaker) => string | undefined) {
    if (speakers.length === 0) {
        return '—'
    }
    return speakers.map((speaker) => get(speaker) || '—').join(', ')
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

function formatLevel(level: string): string {
    return level.replace(/Mostly /g, '').replace('No experience necessary', 'Beginner')
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
        talk.winPct.toFixed(2),
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
}: {
    label: string
    value: string | number
    tentativeCount?: number
}) {
    return (
        <Box flex="1" minW="[170px]">
            <styled.p fontSize="sm" color="admin.600" mb="1">
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
}: {
    label: string
    totalCount: number
    totalPct: number
    lockedCount: number
    lockedPct: number
    tentativeCount: number
}) {
    return (
        <Box flex="1" minW="[170px]">
            <styled.p fontSize="sm" color="admin.600" mb="1">
                {label}
            </styled.p>
            <styled.p fontSize="xs" color="admin.500" mb="0.5">
                {totalCount} / {totalPct.toFixed(1)}%
            </styled.p>
            <styled.p fontSize="lg" fontWeight="medium">
                {lockedCount} ({lockedPct.toFixed(1)}%)
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
                        >
                            {tentativeCount}
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
            fontSize="[0.7rem]"
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
    const selectWidthCh = Math.min(selectedText.length, 16) + 2

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
                fontSize="xs"
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
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
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
    const activeFilterLabel = filter ? filter.options.find((o) => o.value === filter.value)?.label : undefined
    const tooltip = activeFilterLabel && filter?.value ? `${column.label} — filter: ${activeFilterLabel}` : column.label

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
                    color={filter?.value ? 'indigo.7' : 'admin.600'}
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
                <styled.select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    bg="white"
                    border="admin-subtle"
                    borderRadius="sm"
                    px="1"
                    py="1"
                    fontSize="2xs"
                    fontWeight="normal"
                    width="full"
                >
                    {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </styled.select>
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

export default function VotingAgenda() {
    const { runId, runDetails, agendaTalks } = useLoaderData<typeof loader>()

    const statusStorageKey = `voting-agenda-status:${runId}`
    const overridesStorageKey = `voting-agenda-overrides:${runId}`
    const [statusByTalkId, setStatusByTalkId] = useState<Record<string, TalkStatus>>({})
    const [overridesByTalkId, setOverridesByTalkId] = useState<Record<string, TalkOverrides>>({})
    const [selectedTalkId, setSelectedTalkId] = useState<string | null>(null)

    const [lengthFilter, setLengthFilter] = useState('')
    const [tagFilter, setTagFilter] = useState('')
    const [umFilter, setUmFilter] = useState('')
    const [pronounFilter, setPronounFilter] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [expFilter, setExpFilter] = useState('')

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

    useEffect(() => {
        try {
            const raw = localStorage.getItem(statusStorageKey)
            if (raw) {
                setStatusByTalkId(JSON.parse(raw))
            }
        } catch (error) {
            console.error('Failed to load saved talk statuses:', error)
        }

        try {
            const raw = localStorage.getItem(overridesStorageKey)
            if (raw) {
                setOverridesByTalkId(JSON.parse(raw))
            }
        } catch (error) {
            console.error('Failed to load saved talk overrides:', error)
        }
    }, [statusStorageKey, overridesStorageKey])

    function updateStatus(talkId: string, status: TalkStatus) {
        setStatusByTalkId((current) => {
            const next = { ...current, [talkId]: status }
            try {
                localStorage.setItem(statusStorageKey, JSON.stringify(next))
            } catch (error) {
                console.error('Failed to save talk status:', error)
            }
            return next
        })
    }

    function updateOverride<K extends keyof TalkOverrides>(talkId: string, key: K, value: TalkOverrides[K]) {
        setOverridesByTalkId((current) => {
            const next = { ...current, [talkId]: { ...current[talkId], [key]: value } }
            try {
                localStorage.setItem(overridesStorageKey, JSON.stringify(next))
            } catch (error) {
                console.error('Failed to save talk override:', error)
            }
            return next
        })
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
        const generalTopics = new Set<string>()
        const pronouns = new Set<string>()
        const roles = new Set<string>()
        const experiences = new Set<string>()

        for (const talk of agendaTalks) {
            if (talk.length) lengths.add(talk.length)
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
            generalTopics: Array.from(generalTopics).sort(),
            pronouns: Array.from(pronouns).sort(),
            roles: Array.from(roles).sort(),
            experiences: Array.from(experiences).sort(),
        }
    }, [agendaTalks])

    const hasActiveFilters = Boolean(
        lengthFilter || tagFilter || umFilter || pronounFilter || roleFilter || expFilter,
    )

    function clearFilters() {
        setLengthFilter('')
        setTagFilter('')
        setUmFilter('')
        setPronounFilter('')
        setRoleFilter('')
        setExpFilter('')
    }

    const filteredTalks = useMemo(() => {
        return agendaTalks.filter((talk) => {
            if (lengthFilter && talk.length !== lengthFilter) return false
            if (tagFilter && getEffectiveTopic(talk) !== tagFilter && !talk.tags.includes(tagFilter)) return false
            if (umFilter === 'yes' && !getEffectiveUm(talk)) return false
            if (umFilter === 'no' && getEffectiveUm(talk)) return false
            if (pronounFilter && !talk.speakers.some((s) => s.pronoun === pronounFilter)) return false
            if (roleFilter && !talk.speakers.some((s) => s.role === roleFilter)) return false
            if (expFilter && !talk.speakers.some((s) => s.experience === expFilter)) return false
            return true
        })
    }, [agendaTalks, lengthFilter, tagFilter, umFilter, pronounFilter, roleFilter, expFilter, overridesByTalkId])

    const stats = useMemo(() => {
        const totalTalks = agendaTalks.length
        const lockedTalks = agendaTalks.filter((talk) => getEffectiveStatus(talk) === 'locked')
        const tentativeTalks = agendaTalks.filter((talk) => getEffectiveStatus(talk) === 'tentative')
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

    const selectedTalk = selectedTalkId ? agendaTalks.find((t) => t.talkId === selectedTalkId) : undefined

    const columns: ColumnDef[] = [
        {
            id: 'status',
            label: 'Status',
            headerWidth: '[130px]',
            renderCell: (talk) => (
                <styled.select
                    value={getEffectiveStatus(talk)}
                    onChange={(e) => updateStatus(talk.talkId, e.target.value as TalkStatus)}
                    bg="white"
                    border="admin-subtle"
                    borderRadius="md"
                    px="2"
                    py="1"
                    fontSize="xs"
                    width="full"
                >
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </styled.select>
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
            cellProps: { minW: '[300px]', maxW: '[420px]' },
            renderCell: (talk) => (
                <styled.button
                    type="button"
                    onClick={() => setSelectedTalkId(talk.talkId)}
                    display="block"
                    width="full"
                    textAlign="left"
                    whiteSpace="normal"
                    fontWeight="medium"
                    color="prose.link"
                    cursor="pointer"
                    _hover={{ textDecoration: 'underline' }}
                >
                    {talk.title}
                </styled.button>
            ),
        },
        {
            id: 'length',
            label: 'Length',
            filter: {
                value: lengthFilter,
                onChange: setLengthFilter,
                options: [{ value: '', label: 'All' }, ...filterOptions.lengths.map((l) => ({ value: l, label: l }))],
            },
            cellProps: { fontSize: 'xs', whiteSpace: 'nowrap' },
            renderCell: (talk) => talk.length || '—',
        },
        {
            id: 'level',
            label: 'Level',
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
                value: tagFilter,
                onChange: setTagFilter,
                options: [{ value: '', label: 'All' }, ...filterOptions.tags.map((t) => ({ value: t, label: t }))],
            },
            cellProps: { minW: '[220px]', maxW: '[260px]' },
            renderCell: (talk) => {
                const visibleTags = talk.tags.slice(0, 3)
                const hiddenTags = talk.tags.slice(3)
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
                            <styled.span fontSize="[0.7rem]" color="admin.500" title={hiddenTags.join(', ')}>
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
                value: umFilter,
                onChange: setUmFilter,
                options: [
                    { value: '', label: 'Any' },
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
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
                value: pronounFilter,
                onChange: setPronounFilter,
                options: [
                    { value: '', label: 'All' },
                    ...filterOptions.pronouns.map((p) => ({ value: p, label: p })),
                ],
            },
            cellProps: { fontSize: 'xs', color: 'admin.600' },
            renderCell: (talk) => formatSpeakerValues(talk.speakers, (s) => s.pronoun),
        },
        {
            id: 'role',
            label: 'Role',
            filter: {
                value: roleFilter,
                onChange: setRoleFilter,
                options: [{ value: '', label: 'All' }, ...filterOptions.roles.map((r) => ({ value: r, label: r }))],
            },
            cellProps: { fontSize: 'xs', color: 'admin.600' },
            renderCell: (talk) => formatSpeakerValues(talk.speakers, (s) => s.role),
        },
        {
            id: 'exp',
            label: 'Exp',
            filter: {
                value: expFilter,
                onChange: setExpFilter,
                options: [
                    { value: '', label: 'All' },
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
            label: 'Additional Info',
            cellProps: { fontSize: 'xs', color: 'admin.600', maxW: '[240px]' },
            renderCell: (talk) => {
                const info = formatSpeakerValues(talk.speakers, (s) => s.additionalInfo)
                return (
                    <styled.div whiteSpace="normal" lineClamp={3} title={info}>
                        {info}
                    </styled.div>
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

            {agendaTalks.length > 0 && (
                <AdminCard mb="6">
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                        Locked Talks Overview ({stats.total} of {stats.totalTalks})
                    </styled.h2>

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
                                />
                                <StatTile
                                    label="New"
                                    value={formatCountPercent(stats.juniorOrNewSpeakerCount, stats.totalSpeakers)}
                                />
                            </Flex>
                        </Box>
                    </Flex>
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
                                    Clear filters
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

                {filteredTalks.length > 0 ? (
                    <Box overflowX="auto">
                        <styled.table width="full" fontSize="sm">
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
                                    <StatTile label="Win %" value={`${selectedTalk.winPct.toFixed(1)}%`} />
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
