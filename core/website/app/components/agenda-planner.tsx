import { useEffect, useMemo, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Box, Flex, styled } from '~/styled-system/jsx'

/**
 * Trello-style board for laying talks into the agenda grid.
 *
 * A track is a column, a slot is a card-shaped placeholder within it, and a
 * slot holds at most one talk. Slot lengths are free-form strings (matching
 * Sessionize's "Session format" values like "45 minutes") so capacity planning
 * lines up with the Length stats on the agenda page without a hardcoded list.
 *
 * Board state lives in localStorage alongside the page's talk statuses and
 * overrides — it's a planning scratchpad, so it's per-browser and never synced.
 */

export interface PlannerTalk {
    talkId: string
    title: string
    length: string
    speakers: string
    /** Effective general topic (respects organizer overrides), or '' when uncategorised. */
    topic: string
    status: string
}

export interface PlannerSlot {
    slotId: string
    length: string
    talkId: string | null
}

export interface PlannerTrack {
    trackId: string
    name: string
    slots: PlannerSlot[]
}

export interface PlannerState {
    tracks: PlannerTrack[]
    /** Capacity targets, keyed by slot length (e.g. "45 minutes" -> 12). */
    capacity: Record<string, number>
}

const EMPTY_STATE: PlannerState = { tracks: [], capacity: {} }

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

function shortLength(length: string): string {
    const minutes = lengthMinutes(length)
    return minutes > 0 ? `${minutes}m` : length
}

export function AgendaPlanner({
    storageKey,
    talks,
    availableLengths,
}: {
    storageKey: string
    talks: PlannerTalk[]
    availableLengths: string[]
}) {
    const [state, setState] = useState<PlannerState>(EMPTY_STATE)
    const [loaded, setLoaded] = useState(false)
    const [draggingTalkId, setDraggingTalkId] = useState<string | null>(null)

    const lengthOptions = availableLengths.length > 0 ? availableLengths : FALLBACK_LENGTHS

    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey)
            if (raw) {
                const parsed = JSON.parse(raw) as PlannerState
                setState({ tracks: parsed.tracks ?? [], capacity: parsed.capacity ?? {} })
            }
        } catch (error) {
            console.error('Failed to load agenda planner state:', error)
        }
        setLoaded(true)
    }, [storageKey])

    function update(next: PlannerState) {
        setState(next)
        try {
            localStorage.setItem(storageKey, JSON.stringify(next))
        } catch (error) {
            console.error('Failed to save agenda planner state:', error)
        }
    }

    function updateTracks(tracks: PlannerTrack[]) {
        update({ ...state, tracks })
    }

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

    const unplacedTalks = useMemo(
        () => talks.filter((talk) => !placedTalkIds.has(talk.talkId)),
        [talks, placedTalkIds],
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
        updateTracks([
            ...state.tracks,
            { trackId: createId('track'), name: `Track ${state.tracks.length + 1}`, slots: [] },
        ])
    }

    function renameTrack(trackId: string, name: string) {
        updateTracks(state.tracks.map((track) => (track.trackId === trackId ? { ...track, name } : track)))
    }

    function removeTrack(trackId: string) {
        updateTracks(state.tracks.filter((track) => track.trackId !== trackId))
    }

    function addSlot(trackId: string) {
        updateTracks(
            state.tracks.map((track) =>
                track.trackId === trackId
                    ? {
                          ...track,
                          slots: [
                              ...track.slots,
                              { slotId: createId('slot'), length: lengthOptions[0], talkId: null },
                          ],
                      }
                    : track,
            ),
        )
    }

    function updateSlot(trackId: string, slotId: string, changes: Partial<PlannerSlot>) {
        updateTracks(
            state.tracks.map((track) =>
                track.trackId === trackId
                    ? {
                          ...track,
                          slots: track.slots.map((slot) =>
                              slot.slotId === slotId ? { ...slot, ...changes } : slot,
                          ),
                      }
                    : track,
            ),
        )
    }

    function removeSlot(trackId: string, slotId: string) {
        updateTracks(
            state.tracks.map((track) =>
                track.trackId === trackId
                    ? { ...track, slots: track.slots.filter((slot) => slot.slotId !== slotId) }
                    : track,
            ),
        )
    }

    /** Drop a talk into a slot, clearing it from whatever slot held it before. */
    function assignTalk(trackId: string, slotId: string, talkId: string | null) {
        updateTracks(
            state.tracks.map((track) => ({
                ...track,
                slots: track.slots.map((slot) => {
                    if (track.trackId === trackId && slot.slotId === slotId) {
                        return { ...slot, talkId }
                    }
                    // Same talk parked elsewhere — vacate that slot.
                    if (talkId && slot.talkId === talkId) {
                        return { ...slot, talkId: null }
                    }
                    return slot
                }),
            })),
        )
    }

    function setCapacity(length: string, value: number) {
        update({ ...state, capacity: { ...state.capacity, [length]: value } })
    }

    // Avoid rendering the empty default over saved state on first paint.
    if (!loaded) {
        return null
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
                                value={capacity || ''}
                                placeholder="0"
                                onChange={(e) => setCapacity(length, Number(e.target.value) || 0)}
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
                            if (confirm('Clear the whole board? Capacity targets are kept.')) {
                                update({ ...state, tracks: [] })
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
                    <Flex gap="4" alignItems="flex-start" minW="0">
                        {state.tracks.map((track) => (
                            <Box
                                key={track.trackId}
                                minW="[260px]"
                                maxW="[260px]"
                                bg="admin.50"
                                borderRadius="lg"
                                p="3"
                            >
                                <Flex justifyContent="space-between" alignItems="center" gap="2" mb="2">
                                    <styled.input
                                        value={track.name}
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

                                <Flex direction="column" gap="2" mb="2">
                                    {track.slots.map((slot) => {
                                        const talk = slot.talkId ? talksById.get(slot.talkId) : undefined
                                        // Flag a talk whose Sessionize length doesn't match the
                                        // slot it's been dropped into.
                                        const mismatch =
                                            talk && talk.length && talk.length !== slot.length
                                                ? talk.length
                                                : undefined
                                        return (
                                            <Box
                                                key={slot.slotId}
                                                bg="white"
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
                                                    if (talkId) {
                                                        assignTalk(track.trackId, slot.slotId, talkId)
                                                    }
                                                    setDraggingTalkId(null)
                                                }}
                                            >
                                                <Flex justifyContent="space-between" alignItems="center" gap="1" mb="1">
                                                    <styled.select
                                                        value={slot.length}
                                                        onChange={(e) =>
                                                            updateSlot(track.trackId, slot.slotId, {
                                                                length: e.target.value,
                                                            })
                                                        }
                                                        aria-label="Slot length"
                                                        bg="admin.100"
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
                                                        onClick={() => removeSlot(track.trackId, slot.slotId)}
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
                                                        <styled.p fontSize="xs" color="admin.600">
                                                            {talk.speakers}
                                                        </styled.p>
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
                                                            onClick={() =>
                                                                assignTalk(track.trackId, slot.slotId, null)
                                                            }
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
                                                            e.target.value &&
                                                            assignTalk(track.trackId, slot.slotId, e.target.value)
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
                                </Flex>

                                <styled.button
                                    type="button"
                                    onClick={() => addSlot(track.trackId)}
                                    width="full"
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
                            </Box>
                        ))}
                    </Flex>
                </Box>
            )}

            {state.tracks.length > 0 && (
                <Box mt="4">
                    <styled.h3 fontSize="md" fontWeight="semibold" mb="2" color="admin.600">
                        Unplaced talks ({unplacedTalks.length})
                    </styled.h3>
                    <styled.p fontSize="xs" color="admin.500" mb="2">
                        Drag a talk onto a slot, or use the dropdown inside an empty slot.
                    </styled.p>
                    <Flex gap="2" flexWrap="wrap" maxH="[220px]" overflowY="auto">
                        {unplacedTalks.length === 0 ? (
                            <styled.p fontSize="sm" color="admin.600">
                                Every talk has been placed.
                            </styled.p>
                        ) : (
                            unplacedTalks.map((talk) => (
                                <Box
                                    key={talk.talkId}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', talk.talkId)
                                        setDraggingTalkId(talk.talkId)
                                    }}
                                    onDragEnd={() => setDraggingTalkId(null)}
                                    bg="white"
                                    border="admin-subtle"
                                    borderRadius="md"
                                    px="2"
                                    py="1"
                                    maxW="[240px]"
                                    cursor="grab"
                                    opacity={draggingTalkId === talk.talkId ? '0.5' : '1'}
                                    title={`${talk.title} — ${talk.speakers}`}
                                >
                                    <styled.p fontSize="xs" fontWeight="medium" lineClamp={2}>
                                        {talk.title}
                                    </styled.p>
                                    <styled.p fontSize="2xs" color="admin.600" lineClamp={1}>
                                        {talk.speakers}
                                    </styled.p>
                                    <styled.p fontSize="2xs" color="admin.600">
                                        {shortLength(talk.length) || '—'} · {talk.topic || 'Uncategorised'}
                                    </styled.p>
                                </Box>
                            ))
                        )}
                    </Flex>
                </Box>
            )}
        </Box>
    )
}
