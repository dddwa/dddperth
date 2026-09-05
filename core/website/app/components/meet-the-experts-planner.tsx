import { Fragment, useCallback, useRef, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Box, Flex, styled } from '~/styled-system/jsx'

/**
 * Table x timeslot grid for seating Meet-the-Experts registrants.
 *
 * Timeslots are the configured `meetTheExperts.slots` from the conference
 * manifest — the same list registrants already picked their preferences
 * from — so every table column shares the exact same set of rows; unlike the
 * agenda planner's per-track slot lists, there's no need to compute a max
 * row count.
 *
 * Drag-and-drop follows the agenda planner's precedent: plain HTML5
 * draggable/onDragStart/onDrop, no library. `onDragOver` only calls
 * `preventDefault()` (accepting the drop) when the cell's slot is one of the
 * dragged registrant's registered slots and they aren't already seated at a
 * different table for that slot — everywhere else the browser's native
 * "no-drop" cursor is the hard preference block, for free.
 */

export type MeetTheExpertsRegistrantType = 'speaker' | 'sponsor'

export interface MeetTheExpertsSlotView {
    id: string
    label: string
}

export interface MeetTheExpertsTableView {
    id: string
    label: string
    position: number
}

export interface MeetTheExpertsAssignmentView {
    tableId: string
    slotId: string
    registrantType: MeetTheExpertsRegistrantType
    registrantId: string
    displayName: string
}

export interface MeetTheExpertsRegistrantView {
    registrantType: MeetTheExpertsRegistrantType
    registrantId: string
    displayName: string
    /** Slot ids this person registered as available for. */
    slots: string[]
    assignedCount: number
}

/** One board edit, mapped 1:1 onto the route's action intents. */
export type MeetTheExpertsChange =
    | { intent: 'add_table'; label: string }
    | { intent: 'rename_table'; tableId: string; label: string }
    | { intent: 'remove_table'; tableId: string }
    | { intent: 'move_table'; tableId: string; direction: 'up' | 'down' }
    | { intent: 'assign'; tableId: string; slotId: string; registrantType: string; registrantId: string }
    | { intent: 'unassign'; tableId: string; slotId: string }

function registrantKey(type: string, id: string): string {
    return `${type}:${id}`
}

function cellKey(tableId: string, slotId: string): string {
    return `${tableId}:${slotId}`
}

interface DraggingRegistrant {
    type: MeetTheExpertsRegistrantType
    id: string
    displayName: string
    slots: string[]
    /** Slot ids this registrant already occupies at some table, so a drag
     * over a different table for the same slot can be refused — they can't
     * be seated in two places for the same slot. */
    occupiedSlotIds: Set<string>
}

export function MeetTheExpertsPlanner({
    slots,
    tables,
    assignments,
    registrants,
    onChange,
}: {
    slots: MeetTheExpertsSlotView[]
    tables: MeetTheExpertsTableView[]
    assignments: MeetTheExpertsAssignmentView[]
    registrants: MeetTheExpertsRegistrantView[]
    onChange: (change: MeetTheExpertsChange) => void
}) {
    const [draggingRegistrant, setDraggingRegistrant] = useState<DraggingRegistrant | null>(null)

    // Table names are free-text inputs, so the local draft renders while
    // being typed into — otherwise a revalidation landing mid-word would
    // replace what's in the box with the server's older value. Same idiom as
    // the agenda planner's draftNames.
    const [draftNames, setDraftNames] = useState<Record<string, string>>({})
    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
    const debouncedRename = useCallback(
        (tableId: string, label: string) => {
            clearTimeout(debounceTimers.current[tableId])
            debounceTimers.current[tableId] = setTimeout(
                () => onChange({ intent: 'rename_table', tableId, label }),
                500,
            )
        },
        [onChange],
    )

    const assignmentByCell = new Map(assignments.map((a) => [cellKey(a.tableId, a.slotId), a]))
    const assignedSlotsByRegistrant = new Map<string, Set<string>>()
    for (const a of assignments) {
        const key = registrantKey(a.registrantType, a.registrantId)
        const set = assignedSlotsByRegistrant.get(key) ?? new Set<string>()
        set.add(a.slotId)
        assignedSlotsByRegistrant.set(key, set)
    }

    function startDrag(registrant: MeetTheExpertsRegistrantView) {
        setDraggingRegistrant({
            type: registrant.registrantType,
            id: registrant.registrantId,
            displayName: registrant.displayName,
            slots: registrant.slots,
            occupiedSlotIds: assignedSlotsByRegistrant.get(
                registrantKey(registrant.registrantType, registrant.registrantId),
            ) ?? new Set(),
        })
    }

    /** True when the currently-dragged registrant may be dropped on this cell. */
    function canDropOn(tableId: string, slotId: string): boolean {
        if (!draggingRegistrant) return false
        if (!draggingRegistrant.slots.includes(slotId)) return false
        const existing = assignmentByCell.get(cellKey(tableId, slotId))
        const isSelf = existing?.registrantType === draggingRegistrant.type && existing.registrantId === draggingRegistrant.id
        if (draggingRegistrant.occupiedSlotIds.has(slotId) && !isSelf) return false
        return true
    }

    function addTable() {
        onChange({ intent: 'add_table', label: `Table ${tables.length + 1}` })
    }

    function renameTable(tableId: string, label: string) {
        setDraftNames((current) => ({ ...current, [tableId]: label }))
        debouncedRename(tableId, label)
    }

    function removeTable(tableId: string, label: string) {
        if (!confirm(`Remove "${label}"? Anyone seated at it will be unassigned.`)) return
        onChange({ intent: 'remove_table', tableId })
    }

    function moveTable(tableId: string, direction: 'up' | 'down') {
        onChange({ intent: 'move_table', tableId, direction })
    }

    function unassign(tableId: string, slotId: string) {
        onChange({ intent: 'unassign', tableId, slotId })
    }

    function dropOnCell(tableId: string, slotId: string, e: React.DragEvent) {
        e.preventDefault()
        const [registrantType, registrantId] = (e.dataTransfer.getData('text/plain') || '').split(':')
        setDraggingRegistrant(null)
        if (!registrantType || !registrantId) return

        const existing = assignmentByCell.get(cellKey(tableId, slotId))
        if (existing && (existing.registrantType !== registrantType || existing.registrantId !== registrantId)) {
            if (!confirm(`This seat holds ${existing.displayName}. Replace them?`)) return
        }
        onChange({ intent: 'assign', tableId, slotId, registrantType, registrantId })
    }

    return (
        <Box>
            <Flex gap="3" mb="4" flexWrap="wrap" alignItems="center">
                <Button type="button" variant="solid" size="sm" onClick={addTable}>
                    + Add table
                </Button>
                <styled.p fontSize="xs" color="admin.500">
                    Drag a person from the list below onto a seat. Only their registered slots (and free tables) will
                    accept the drop.
                </styled.p>
            </Flex>

            {tables.length === 0 ? (
                <styled.p fontSize="sm" color="admin.600" py="6" textAlign="center">
                    No tables yet — add one to start seating people.
                </styled.p>
            ) : (
                <Box overflowX="auto" pb="2">
                    <styled.div
                        display="grid"
                        gap="2"
                        alignItems="stretch"
                        style={{
                            gridTemplateColumns: `160px repeat(${tables.length}, 220px)`,
                            gridTemplateRows: `auto repeat(${slots.length}, auto)`,
                        }}
                    >
                        {/* Row 1: blank corner + one header per table. */}
                        <Box style={{ gridColumn: 1, gridRow: 1 }} />
                        {tables.map((table, tableIndex) => (
                            <Flex
                                key={`head-${table.id}`}
                                justifyContent="space-between"
                                alignItems="center"
                                gap="1"
                                style={{ gridColumn: tableIndex + 2, gridRow: 1 }}
                                bg="admin.50"
                                borderRadius="lg"
                                px="2"
                                py="1"
                            >
                                <styled.input
                                    value={draftNames[table.id] ?? table.label}
                                    onChange={(e) => renameTable(table.id, e.target.value)}
                                    aria-label="Table name"
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
                                <Flex gap="0.5" flexShrink="0">
                                    <styled.button
                                        type="button"
                                        onClick={() => moveTable(table.id, 'up')}
                                        disabled={tableIndex === 0}
                                        title="Move table left"
                                        aria-label="Move table left"
                                        cursor={tableIndex === 0 ? 'not-allowed' : 'pointer'}
                                        opacity={tableIndex === 0 ? '0.3' : '1'}
                                        fontSize="xs"
                                        px="0.5"
                                    >
                                        ←
                                    </styled.button>
                                    <styled.button
                                        type="button"
                                        onClick={() => moveTable(table.id, 'down')}
                                        disabled={tableIndex === tables.length - 1}
                                        title="Move table right"
                                        aria-label="Move table right"
                                        cursor={tableIndex === tables.length - 1 ? 'not-allowed' : 'pointer'}
                                        opacity={tableIndex === tables.length - 1 ? '0.3' : '1'}
                                        fontSize="xs"
                                        px="0.5"
                                    >
                                        →
                                    </styled.button>
                                    <styled.button
                                        type="button"
                                        onClick={() => removeTable(table.id, table.label)}
                                        title={`Remove ${table.label}`}
                                        aria-label={`Remove ${table.label}`}
                                        cursor="pointer"
                                        color="admin.500"
                                        fontSize="xs"
                                        px="0.5"
                                        _hover={{ color: 'status.danger.fg' }}
                                    >
                                        ×
                                    </styled.button>
                                </Flex>
                            </Flex>
                        ))}

                        {/* Rows 2..N+1: one slot-label cell, then one seat cell per table. */}
                        {slots.map((slot, slotIndex) => (
                            <Fragment key={`row-${slot.id}`}>
                                <Flex
                                    key={`label-${slot.id}`}
                                    style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
                                    alignItems="center"
                                    fontSize="xs"
                                    fontWeight="semibold"
                                    color="admin.600"
                                    px="1"
                                >
                                    {slot.label}
                                </Flex>
                                {tables.map((table, tableIndex) => {
                                    const occupant = assignmentByCell.get(cellKey(table.id, slot.id))
                                    const isValidTarget = canDropOn(table.id, slot.id)
                                    return (
                                        <Box
                                            key={`cell-${table.id}-${slot.id}`}
                                            style={{ gridColumn: tableIndex + 2, gridRow: slotIndex + 2 }}
                                            bg={occupant ? 'white' : 'admin.50'}
                                            border={
                                                draggingRegistrant
                                                    ? isValidTarget
                                                        ? 'admin-emphasis'
                                                        : 'admin-subtle'
                                                    : 'admin-subtle'
                                            }
                                            opacity={draggingRegistrant && !isValidTarget && !occupant ? '0.5' : '1'}
                                            borderRadius="md"
                                            p="2"
                                            minH="[52px]"
                                            onDragOver={(e) => {
                                                if (isValidTarget) e.preventDefault()
                                            }}
                                            onDrop={(e) => dropOnCell(table.id, slot.id, e)}
                                        >
                                            {occupant ? (
                                                <Box>
                                                    <styled.p fontSize="xs" fontWeight="medium" lineClamp={2}>
                                                        {occupant.displayName}
                                                    </styled.p>
                                                    <styled.p fontSize="2xs" color="admin.500" mb="1">
                                                        {occupant.registrantType === 'speaker' ? 'Speaker' : 'Sponsor'}
                                                    </styled.p>
                                                    <styled.button
                                                        type="button"
                                                        onClick={() => unassign(table.id, slot.id)}
                                                        fontSize="2xs"
                                                        color="prose.link"
                                                        cursor="pointer"
                                                        _hover={{ textDecoration: 'underline' }}
                                                    >
                                                        Unseat
                                                    </styled.button>
                                                </Box>
                                            ) : (
                                                <styled.p fontSize="2xs" color="admin.400" textAlign="center" mt="2">
                                                    Empty seat
                                                </styled.p>
                                            )}
                                        </Box>
                                    )
                                })}
                            </Fragment>
                        ))}
                    </styled.div>
                </Box>
            )}

            <Box mt="6">
                <styled.h3 fontSize="md" fontWeight="semibold" mb="2" color="admin.600">
                    Registered people ({registrants.length})
                </styled.h3>
                <styled.p fontSize="xs" color="admin.500" mb="2">
                    Drag onto a seat above. Chips show the slots they registered as available; the count shows how
                    many seats they currently hold — red means they aren't scheduled anywhere yet.
                </styled.p>
                <Flex gap="2" flexWrap="wrap" maxH="[280px]" overflowY="auto">
                    {registrants.length === 0 ? (
                        <styled.p fontSize="sm" color="admin.600">
                            No one has registered a slot preference yet.
                        </styled.p>
                    ) : (
                        registrants.map((registrant) => {
                            const key = registrantKey(registrant.registrantType, registrant.registrantId)
                            const isDragging =
                                draggingRegistrant &&
                                registrantKey(draggingRegistrant.type, draggingRegistrant.id) === key
                            return (
                                <Box
                                    key={key}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', key)
                                        startDrag(registrant)
                                    }}
                                    onDragEnd={() => setDraggingRegistrant(null)}
                                    bg="white"
                                    border="admin-subtle"
                                    borderRadius="md"
                                    px="2"
                                    py="1"
                                    maxW="[260px]"
                                    cursor="grab"
                                    opacity={isDragging ? '0.5' : '1'}
                                >
                                    <Flex justifyContent="space-between" alignItems="center" gap="1" mb="0.5">
                                        <styled.p fontSize="xs" fontWeight="medium" lineClamp={1}>
                                            {registrant.displayName}
                                        </styled.p>
                                        <styled.span
                                            px="1.5"
                                            py="0.5"
                                            borderRadius="full"
                                            fontSize="2xs"
                                            fontWeight="bold"
                                            bg={registrant.assignedCount === 0 ? 'status.danger.bg' : 'status.success.bg'}
                                            color={registrant.assignedCount === 0 ? 'status.danger.fg' : 'status.success.fg'}
                                            flexShrink="0"
                                        >
                                            {registrant.assignedCount}
                                        </styled.span>
                                    </Flex>
                                    <styled.p fontSize="2xs" color="admin.500" mb="1">
                                        {registrant.registrantType === 'speaker' ? 'Speaker' : 'Sponsor'}
                                    </styled.p>
                                    <Flex gap="1" flexWrap="wrap">
                                        {registrant.slots.map((slotId) => {
                                            const slot = slots.find((s) => s.id === slotId)
                                            return (
                                                <styled.span
                                                    key={slotId}
                                                    px="1"
                                                    py="0.5"
                                                    borderRadius="sm"
                                                    fontSize="2xs"
                                                    bg="admin.100"
                                                    color="admin.700"
                                                >
                                                    {slot?.label ?? slotId}
                                                </styled.span>
                                            )
                                        })}
                                    </Flex>
                                </Box>
                            )
                        })
                    )}
                </Flex>
            </Box>
        </Box>
    )
}
