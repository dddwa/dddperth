import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import type { PlannerBoard } from '~/lib/agenda-planning-types'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { ColorToken } from '~/styled-system/tokens'

/**
 * Trello-style board for laying talks into the agenda grid.
 *
 * A track is a column, a slot is a card-shaped placeholder within it, and a
 * slot holds at most one talk. Slot lengths are free-form strings (matching
 * Sessionize's "Session format" values like "45 minutes") so capacity planning
 * lines up with the Length stats on the agenda page without a hardcoded list.
 *
 * The board is persisted in D1 by the agenda route and shared across the
 * organizer team — this component renders whatever it's handed and reports
 * every edit back through `onChange`, which posts it to the server.
 */

export interface PlannerTalk {
    talkId: string
    title: string
    length: string
    speakers: string
    /** Effective general topic (respects organizer overrides), or '' when uncategorised. */
    topic: string
    status: string
    /** Vote rank from the validation run — lower is stronger. */
    rank: number
    /** Effective level ("Beginner", "Advanced"), already normalised for display. */
    level: string
    /** Underrepresented-minority flag, respecting the per-talk override. */
    um: boolean
    /** Junior or first-time/rare speaker, respecting the per-talk override. */
    newSpeaker: boolean
}

/** One board edit, mapped 1:1 onto the route's action intents. */
export type PlannerChange =
    | { intent: 'add_track'; trackId: string; name: string }
    | { intent: 'rename_track'; trackId: string; name: string }
    | { intent: 'remove_track'; trackId: string }
    | { intent: 'add_slot'; trackId: string; slotId: string; length: string }
    | { intent: 'update_slot_length'; slotId: string; length: string }
    | { intent: 'remove_slot'; slotId: string }
    | { intent: 'assign_talk'; slotId: string; talkId: string }
    | { intent: 'set_capacity'; length: string; capacity: string }
    | { intent: 'clear_board' }

// Lengths offered in the slot dropdown when the run has no Sessionize length
// data to derive them from (e.g. every talk has vanished from the feed).
const FALLBACK_LENGTHS = ['45 minutes', '20 minutes']

function createId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

/** Pull the leading number out of "45 minutes" so slots can sort/label by duration. */
function lengthMinutes(length: string): number {
    const match = /(\d+)/.exec(length)
    return match ? Number(match[1]) : 0
}

// Levels get a one-letter chip so a card can show it without eating a line.
const LEVEL_INITIALS: Record<string, string> = {
    beginner: 'B',
    intermediate: 'I',
    advanced: 'A',
}

function levelInitial(level: string): string {
    return LEVEL_INITIALS[level.toLowerCase()] ?? level.charAt(0).toUpperCase()
}

/**
 * Signal chip on a talk card. These exist so the balance of the agenda
 * (topic mix, experience, level spread) is visible while the board is being
 * built, rather than only in the stats above the table.
 */
function SignalBadge({
    label,
    title,
    bg,
    fg,
    truncate,
}: {
    label: string
    title: string
    bg: ColorToken
    fg: ColorToken
    /** Clip long labels (topic names) rather than letting them wrap the row. */
    truncate?: boolean
}) {
    return (
        <styled.span
            title={title}
            aria-label={title}
            display="inline-block"
            px="1.5"
            py="0.5"
            borderRadius="sm"
            fontSize="xs"
            fontWeight="bold"
            lineHeight="tight"
            bg={bg}
            color={fg}
            flexShrink="0"
            {...(truncate
                ? {
                      maxW: '[130px]',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                  }
                : {})}
        >
            {label}
        </styled.span>
    )
}

/**
 * The signal chips for one talk, shared by placed cards and the unplaced list.
 *
 * `showLength` is on for the unplaced list, where length decides which slot a
 * talk can go in. Placed cards leave it off — the slot above already names its
 * length, and a mismatch is called out separately.
 */
function TalkSignals({ talk, showLength }: { talk: PlannerTalk; showLength?: boolean }) {
    return (
        <Flex gap="1" flexWrap="wrap" alignItems="center">
            {/* Rank is the strongest cue for picking, so it gets the darkest
                chip; level sits a shade lighter beside it. */}
            <SignalBadge label={`#${talk.rank}`} title={`Vote rank #${talk.rank}`} bg="admin.700" fg="white" />
            {showLength && talk.length && (
                <SignalBadge
                    label={shortLength(talk.length)}
                    title={`Length: ${talk.length}`}
                    bg="admin.200"
                    fg="admin.800"
                />
            )}
            {talk.level && (
                <SignalBadge
                    label={levelInitial(talk.level)}
                    title={`Level: ${talk.level}`}
                    bg="admin.100"
                    fg="admin.700"
                />
            )}
            {/* The topic is what the agenda is balanced across, so it's the
                one chip that carries its full label rather than an initial. */}
            <SignalBadge
                label={talk.topic || 'Uncategorised'}
                title={`Topic: ${talk.topic || 'Uncategorised'}`}
                bg="indigo.7"
                fg="white"
                truncate
            />
            {talk.um && (
                <SignalBadge
                    label="UM"
                    title="Speaker is from an underrepresented group"
                    bg="status.info.bg"
                    fg="status.info.fg"
                />
            )}
            {talk.newSpeaker && (
                <SignalBadge
                    label="NEW"
                    title="Junior or first-time / infrequent speaker"
                    bg="status.success.bg"
                    fg="status.success.fg"
                />
            )}
        </Flex>
    )
}

function shortLength(length: string): string {
    const minutes = lengthMinutes(length)
    return minutes > 0 ? `${minutes}m` : length
}

export function AgendaPlanner({
    board,
    talks,
    availableLengths,
    onChange,
}: {
    board: PlannerBoard
    talks: PlannerTalk[]
    availableLengths: string[]
    /** Posts one edit to the server; the board re-renders from the response. */
    onChange: (change: PlannerChange) => void
}) {
    const [draggingTalkId, setDraggingTalkId] = useState<string | null>(null)
    // Track names and capacity are free-text inputs, so they render the local
    // draft while being typed into — otherwise a poll landing mid-word would
    // replace what's in the box with the server's older value. The draft is
    // dropped once the value the server echoes back matches it.
    const [draftNames, setDraftNames] = useState<Record<string, string>>({})
    const [draftCapacity, setDraftCapacity] = useState<Record<string, string>>({})

    // Typing sends one request per keystroke otherwise. Held per key so two
    // tracks renamed at once don't cancel each other.
    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    const debouncedChange = useCallback(
        (key: string, change: PlannerChange) => {
            clearTimeout(debounceTimers.current[key])
            debounceTimers.current[key] = setTimeout(() => onChange(change), 500)
        },
        [onChange],
    )
    useEffect(() => {
        const timers = debounceTimers.current
        return () => {
            for (const timer of Object.values(timers)) clearTimeout(timer)
        }
    }, [])

    // Once the server echoes the draft back, stop overriding it so other
    // people's later edits to the same field can show through.
    useEffect(() => {
        setDraftNames((current) => {
            const next = { ...current }
            let changed = false
            for (const track of board.tracks) {
                if (next[track.trackId] === track.name) {
                    delete next[track.trackId]
                    changed = true
                }
            }
            return changed ? next : current
        })
        setDraftCapacity((current) => {
            const next = { ...current }
            let changed = false
            for (const [length, value] of Object.entries(current)) {
                if ((Number(value) || 0) === (board.capacity[length] ?? 0)) {
                    delete next[length]
                    changed = true
                }
            }
            return changed ? next : current
        })
    }, [board])

    const lengthOptions = availableLengths.length > 0 ? availableLengths : FALLBACK_LENGTHS
    const state = board

    const talksById = useMemo(() => new Map(talks.map((talk) => [talk.talkId, talk])), [talks])

    // A talk may only sit in one slot at a time, so the "unplaced" list is
    // every talk minus whatever the board already holds.
    const placedTalkIds = useMemo(() => {
        const ids = new Set<string>()
        for (const track of state.tracks) {
            for (const slot of track.slots) {
                if (slot.talkId) ids.add(slot.talkId)
            }
        }
        return ids
    }, [state.tracks])

    // Kept in the incoming rank order — the list is for picking the strongest
    // remaining talk, so rank is the useful sort. Tentative ones are tinted
    // rather than grouped, so they stay comparable against their rank peers.
    const unplacedTalks = useMemo(
        () => talks.filter((talk) => !placedTalkIds.has(talk.talkId)),
        [talks, placedTalkIds],
    )

    const unplacedTentativeCount = useMemo(
        () => unplacedTalks.filter((talk) => talk.status === 'tentative').length,
        [unplacedTalks],
    )

    // The board grid needs one row per slot position, sized to the longest
    // track — shorter tracks simply leave their later rows empty.
    const maxSlotCount = useMemo(
        () => state.tracks.reduce((max, track) => Math.max(max, track.slots.length), 0),
        [state.tracks],
    )

    // Slots by length vs the capacity targets, so organizers can see at a
    // glance whether the board matches the room/time budget they typed in.
    const slotSummary = useMemo(() => {
        const created = new Map<string, number>()
        const filled = new Map<string, number>()
        for (const track of state.tracks) {
            for (const slot of track.slots) {
                created.set(slot.length, (created.get(slot.length) ?? 0) + 1)
                if (slot.talkId) {
                    filled.set(slot.length, (filled.get(slot.length) ?? 0) + 1)
                }
            }
        }
        const lengths = new Set([...created.keys(), ...Object.keys(state.capacity)])
        return Array.from(lengths)
            .filter((length) => (state.capacity[length] ?? 0) > 0 || (created.get(length) ?? 0) > 0)
            .sort((a, b) => lengthMinutes(b) - lengthMinutes(a))
            .map((length) => ({
                length,
                capacity: state.capacity[length] ?? 0,
                created: created.get(length) ?? 0,
                filled: filled.get(length) ?? 0,
            }))
    }, [state])

    function addTrack() {
        onChange({ intent: 'add_track', trackId: createId('track'), name: `Track ${state.tracks.length + 1}` })
    }

    function renameTrack(trackId: string, name: string) {
        setDraftNames((current) => ({ ...current, [trackId]: name }))
        debouncedChange(`track:${trackId}`, { intent: 'rename_track', trackId, name })
    }

    function removeTrack(trackId: string) {
        onChange({ intent: 'remove_track', trackId })
    }

    function addSlot(trackId: string) {
        onChange({ intent: 'add_slot', trackId, slotId: createId('slot'), length: lengthOptions[0] })
    }

    function updateSlotLength(slotId: string, length: string) {
        onChange({ intent: 'update_slot_length', slotId, length })
    }

    function removeSlot(slotId: string) {
        onChange({ intent: 'remove_slot', slotId })
    }

    /** Drop a talk into a slot; the server clears whatever slot held it before. */
    function assignTalk(slotId: string, talkId: string | null) {
        onChange({ intent: 'assign_talk', slotId, talkId: talkId ?? '' })
    }

    function setCapacity(length: string, value: string) {
        setDraftCapacity((current) => ({ ...current, [length]: value }))
        debouncedChange(`capacity:${length}`, {
            intent: 'set_capacity',
            length,
            capacity: String(Number(value) || 0),
        })
    }

    return (
        <Box>
            <styled.h3 fontSize="md" fontWeight="semibold" mb="2" color="admin.600">
                Capacity
            </styled.h3>
            <Flex gap="4" flexWrap="wrap" mb="4" alignItems="flex-end">
                {lengthOptions.map((length) => {
                    const summary = slotSummary.find((s) => s.length === length)
                    const capacity = state.capacity[length] ?? 0
                    const created = summary?.created ?? 0
                    const over = capacity > 0 && created > capacity
                    return (
                        <Box key={length}>
                            <styled.label
                                display="block"
                                fontSize="xs"
                                fontWeight="medium"
                                color="admin.600"
                                mb="1"
                                htmlFor={`capacity-${length}`}
                            >
                                {length} slots
                            </styled.label>
                            <styled.input
                                id={`capacity-${length}`}
                                type="number"
                                min="0"
                                value={draftCapacity[length] ?? (capacity || '')}
                                placeholder="0"
                                onChange={(e) => setCapacity(length, e.target.value)}
                                bg="white"
                                border="admin-subtle"
                                borderRadius="md"
                                px="2"
                                py="1"
                                fontSize="sm"
                                width="[110px]"
                            />
                            <styled.p fontSize="xs" color={over ? 'status.danger.fg' : 'admin.500'} mt="1">
                                {created} created · {summary?.filled ?? 0} filled
                            </styled.p>
                        </Box>
                    )
                })}
                <Box>
                    <styled.p fontSize="xs" fontWeight="medium" color="admin.600" mb="1">
                        Tracks
                    </styled.p>
                    <styled.p fontSize="lg" fontWeight="medium">
                        {state.tracks.length}
                    </styled.p>
                </Box>
                <Box>
                    <styled.p fontSize="xs" fontWeight="medium" color="admin.600" mb="1">
                        Unplaced talks
                    </styled.p>
                    <styled.p fontSize="lg" fontWeight="medium">
                        {unplacedTalks.length}
                    </styled.p>
                </Box>
            </Flex>

            <Flex gap="3" mb="4" flexWrap="wrap">
                <Button type="button" variant="solid" size="sm" onClick={addTrack}>
                    + Add track
                </Button>
                {state.tracks.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (
                                confirm(
                                    'Clear the whole board for everyone? Capacity targets are kept.',
                                )
                            ) {
                                onChange({ intent: 'clear_board' })
                            }
                        }}
                    >
                        Clear board
                    </Button>
                )}
            </Flex>

            {state.tracks.length === 0 ? (
                <styled.p fontSize="sm" color="admin.600" py="6" textAlign="center">
                    No tracks yet — add one to start laying out the agenda.
                </styled.p>
            ) : (
                <Box overflowX="auto" pb="2">
                    {/* One grid for the whole board rather than a column per
                        track: slot N of every track shares a grid row, so the
                        cards line up across tracks however tall any one of them
                        gets. Each track's header, slots and "add slot" button
                        are placed into its own column by grid-column. */}
                    <styled.div
                        display="grid"
                        gap="4"
                        alignItems="start"
                        style={{
                            gridTemplateColumns: `repeat(${state.tracks.length}, 260px)`,
                            // Header, one row per slot position, then the add button.
                            gridTemplateRows: `auto repeat(${maxSlotCount}, auto) auto`,
                        }}
                    >
                        {state.tracks.map((track, trackIndex) => (
                            // The tinted panel spans the track's full column so
                            // the column still reads as one card.
                            <Box
                                key={`bg-${track.trackId}`}
                                bg="admin.50"
                                borderRadius="lg"
                                style={{ gridColumn: trackIndex + 1, gridRow: '1 / -1' }}
                            />
                        ))}

                        {state.tracks.map((track, trackIndex) => (
                            <Flex
                                key={`head-${track.trackId}`}
                                justifyContent="space-between"
                                alignItems="center"
                                gap="2"
                                style={{ gridColumn: trackIndex + 1, gridRow: 1 }}
                                px="3"
                                pt="3"
                                zIndex="[1]"
                            >
                                <styled.input
                                    value={draftNames[track.trackId] ?? track.name}
                                    onChange={(e) => renameTrack(track.trackId, e.target.value)}
                                    aria-label="Track name"
                                    bg="transparent"
                                    border="none"
                                    fontWeight="semibold"
                                    fontSize="sm"
                                    width="full"
                                    _hover={{ bg: 'white' }}
                                    _focus={{ bg: 'white' }}
                                    px="1"
                                    borderRadius="sm"
                                />
                                <styled.button
                                    type="button"
                                    onClick={() => removeTrack(track.trackId)}
                                    title={`Remove ${track.name}`}
                                    aria-label={`Remove ${track.name}`}
                                    cursor="pointer"
                                    color="admin.500"
                                    px="1"
                                    _hover={{ color: 'status.danger.fg' }}
                                >
                                    ×
                                </styled.button>
                            </Flex>
                        ))}

                        {state.tracks.map((track, trackIndex) => (
                            <Fragment key={`slots-${track.trackId}`}>
                                {track.slots.map((slot, slotIndex) => {
                                        const talk = slot.talkId ? talksById.get(slot.talkId) : undefined
                                        // Flag a talk whose Sessionize length doesn't match the
                                        // slot it's been dropped into.
                                        const mismatch =
                                            talk && talk.length && talk.length !== slot.length
                                                ? talk.length
                                                : undefined
                                        // Tentative talks stay tinted once placed, so an agenda
                                        // that looks full still shows which slots aren't settled.
                                        const isTentative = talk?.status === 'tentative'
                                        return (
                                            <Box
                                                key={slot.slotId}
                                                // Row 1 is the track header, so slot N sits in
                                                // row N+2 — the same row as slot N of every
                                                // other track. Inline rather than a Panda prop:
                                                // these values are computed, and Panda's static
                                                // extraction would emit a class with no CSS.
                                                style={{
                                                    gridColumn: trackIndex + 1,
                                                    gridRow: slotIndex + 2,
                                                }}
                                                mx="3"
                                                zIndex="[1]"
                                                bg={isTentative ? 'status.warning.bg' : 'white'}
                                                borderRadius="md"
                                                border={
                                                    draggingTalkId ? 'admin-emphasis' : 'admin-subtle'
                                                }
                                                p="2"
                                                onDragOver={(e) => {
                                                    if (draggingTalkId) e.preventDefault()
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault()
                                                    const talkId =
                                                        e.dataTransfer.getData('text/plain') || draggingTalkId
                                                    setDraggingTalkId(null)
                                                    if (!talkId || talkId === slot.talkId) return
                                                    // Dropping onto a filled slot bumps whatever
                                                    // was there back to Unplaced — say so rather
                                                    // than silently discarding someone's work.
                                                    const occupant = slot.talkId
                                                        ? talksById.get(slot.talkId)
                                                        : undefined
                                                    if (
                                                        occupant &&
                                                        !confirm(
                                                            `That slot holds "${occupant.title}". Replace it? It will move back to Unplaced talks.`,
                                                        )
                                                    ) {
                                                        return
                                                    }
                                                    assignTalk(slot.slotId, talkId)
                                                }}
                                            >
                                                <Flex justifyContent="space-between" alignItems="center" gap="1" mb="1">
                                                    <styled.select
                                                        value={slot.length}
                                                        onChange={(e) =>
                                                            updateSlotLength(slot.slotId, e.target.value)
                                                        }
                                                        aria-label="Slot length"
                                                        // White on the tinted card, so the control
                                                        // stays legible against the orange.
                                                        bg={isTentative ? 'white' : 'admin.100'}
                                                        border="none"
                                                        borderRadius="sm"
                                                        px="1"
                                                        py="0.5"
                                                        fontSize="xs"
                                                        fontWeight="semibold"
                                                        cursor="pointer"
                                                    >
                                                        {lengthOptions.map((length) => (
                                                            <option key={length} value={length}>
                                                                {shortLength(length)}
                                                            </option>
                                                        ))}
                                                    </styled.select>
                                                    <styled.button
                                                        type="button"
                                                        onClick={() => removeSlot(slot.slotId)}
                                                        title="Remove slot"
                                                        aria-label="Remove slot"
                                                        cursor="pointer"
                                                        color="admin.500"
                                                        fontSize="xs"
                                                        px="1"
                                                        _hover={{ color: 'status.danger.fg' }}
                                                    >
                                                        ×
                                                    </styled.button>
                                                </Flex>

                                                {talk ? (
                                                    // Draggable so a placed talk can be moved straight to
                                                    // another slot — the slot dropdown only offers unplaced
                                                    // talks, so without this you'd have to remove it first.
                                                    <Box
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('text/plain', talk.talkId)
                                                            setDraggingTalkId(talk.talkId)
                                                        }}
                                                        onDragEnd={() => setDraggingTalkId(null)}
                                                        cursor="grab"
                                                    >
                                                        <styled.p fontSize="xs" fontWeight="medium" mb="0.5">
                                                            {talk.title}
                                                        </styled.p>
                                                        <styled.p fontSize="xs" color="admin.600" mb="1">
                                                            {talk.speakers}
                                                        </styled.p>
                                                        <TalkSignals talk={talk} />
                                                        {mismatch && (
                                                            <styled.p
                                                                fontSize="2xs"
                                                                color="status.warning.fg"
                                                                fontWeight="medium"
                                                                mt="0.5"
                                                            >
                                                                ⚠ submitted as {mismatch}
                                                            </styled.p>
                                                        )}
                                                        <styled.button
                                                            type="button"
                                                            onClick={() => assignTalk(slot.slotId, null)}
                                                            fontSize="xs"
                                                            color="prose.link"
                                                            cursor="pointer"
                                                            mt="1"
                                                            _hover={{ textDecoration: 'underline' }}
                                                        >
                                                            Remove talk
                                                        </styled.button>
                                                    </Box>
                                                ) : (
                                                    <styled.select
                                                        value=""
                                                        onChange={(e) =>
                                                            e.target.value && assignTalk(slot.slotId, e.target.value)
                                                        }
                                                        aria-label="Assign talk to slot"
                                                        bg="white"
                                                        border="admin-subtle"
                                                        borderRadius="sm"
                                                        px="1"
                                                        py="1"
                                                        fontSize="xs"
                                                        width="full"
                                                        cursor="pointer"
                                                    >
                                                        <option value="">Drop or pick a talk…</option>
                                                        {unplacedTalks.map((candidate) => (
                                                            <option key={candidate.talkId} value={candidate.talkId}>
                                                                {candidate.title}
                                                            </option>
                                                        ))}
                                                    </styled.select>
                                                )}
                                            </Box>
                                        )
                                    })}

                                {/* Pinned to the last grid row so every track's
                                    button lines up, however few slots it has. */}
                                <styled.button
                                    type="button"
                                    onClick={() => addSlot(track.trackId)}
                                    style={{ gridColumn: trackIndex + 1, gridRow: -2 }}
                                    alignSelf="end"
                                    mx="3"
                                    mb="3"
                                    mt="2"
                                    zIndex="[1]"
                                    py="1"
                                    fontSize="xs"
                                    color="admin.600"
                                    bg="white"
                                    borderRadius="md"
                                    cursor="pointer"
                                    _hover={{ bg: 'admin.100' }}
                                >
                                    + Add slot
                                </styled.button>
                            </Fragment>
                        ))}
                    </styled.div>
                </Box>
            )}

            {state.tracks.length > 0 && (
                <Box mt="4">
                    <Flex alignItems="center" gap="2" mb="2" flexWrap="wrap">
                        <styled.h3 fontSize="md" fontWeight="semibold" color="admin.600">
                            Unplaced talks ({unplacedTalks.length})
                        </styled.h3>
                        {unplacedTentativeCount > 0 && (
                            <styled.span
                                px="2"
                                py="0.5"
                                borderRadius="full"
                                fontSize="xs"
                                fontWeight="semibold"
                                bg="status.warning.bg"
                                color="status.warning.fg"
                                title="Unplaced talks still marked tentative"
                            >
                                {unplacedTentativeCount} tentative
                            </styled.span>
                        )}
                    </Flex>
                    <styled.p fontSize="xs" color="admin.500" mb="2">
                        Drag a talk onto a slot, or use the dropdown inside an empty slot. Highest-ranked first;
                        tentative talks are shaded orange. Chips show rank, length, level (B/I/A), topic, UM and new
                        speaker.
                    </styled.p>
                    <Flex gap="2" flexWrap="wrap" maxH="[220px]" overflowY="auto">
                        {unplacedTalks.length === 0 ? (
                            <styled.p fontSize="sm" color="admin.600">
                                Every talk has been placed.
                            </styled.p>
                        ) : (
                            unplacedTalks.map((talk) => {
                                // Tentative talks are tinted so the ones still
                                // needing a decision stand out from the accepted
                                // ones while filling the board.
                                const isTentative = talk.status === 'tentative'
                                return (
                                    <Box
                                        key={talk.talkId}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', talk.talkId)
                                            setDraggingTalkId(talk.talkId)
                                        }}
                                        onDragEnd={() => setDraggingTalkId(null)}
                                        bg={isTentative ? 'status.warning.bg' : 'white'}
                                        border={isTentative ? 'admin-emphasis' : 'admin-subtle'}
                                        borderRadius="md"
                                        px="2"
                                        py="1"
                                        maxW="[240px]"
                                        cursor="grab"
                                        opacity={draggingTalkId === talk.talkId ? '0.5' : '1'}
                                        title={`${talk.title} — ${talk.speakers}${isTentative ? ' (tentative)' : ''}`}
                                    >
                                        <styled.p fontSize="xs" fontWeight="medium" lineClamp={2}>
                                            {talk.title}
                                        </styled.p>
                                        <styled.p fontSize="2xs" color="admin.600" lineClamp={1} mb="1">
                                            {talk.speakers}
                                        </styled.p>
                                        {/* Length and topic both live in the chips, so neither is
                                            repeated as small grey text above them. */}
                                        <TalkSignals talk={talk} showLength />
                                    </Box>
                                )
                            })
                        )}
                    </Flex>
                </Box>
            )}
        </Box>
    )
}
