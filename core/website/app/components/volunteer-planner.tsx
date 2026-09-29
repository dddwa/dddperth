import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { VOLUNTEER_ROLES, type VolunteerAssignment, type VolunteerRole } from '~/lib/services/volunteers-store'
import { css, cx } from '~/styled-system/css'
import { Box, styled } from '~/styled-system/jsx'

/**
 * Day-calendar grid for rostering volunteers, modelled on the Meet the
 * Experts seating board — but rows and columns come from the agenda
 * (Sessionize time slots and rooms) rather than admin-created tables.
 *
 * Time slots run down the side; each room is a column. Each session card
 * fills its room's column and sits underneath one lane per `VOLUNTEER_ROLES`
 * entry, so only its left edge (and title) shows — the lanes overlap it, and
 * each other slightly, like a calendar's clashing events. A role lane holds
 * one card per *shift* — a
 * volunteer's run of consecutive talks in that room and role — spanning from
 * the first talk's start to the last one's end. People sharing a lane at the
 * same time sit side by side.
 *
 * Storage is still per talk (one assignment per slot); shifts are derived
 * here by joining a volunteer's assignments on consecutive talks in a room.
 *
 * Everything is drag-and-drop (plain HTML5 draggable, no library, as in the
 * Meet the Experts board). Each talk leaves an empty drop zone in each role
 * lane, under the cards; while dragging, cards stop catching the pointer so
 * the zones beneath them can. A zone only calls `preventDefault()` on
 * dragover when the drop would change something, so the browser's "no-drop"
 * cursor is the block.
 *
 * - volunteer (from the pool) → zone: rosters them for that talk;
 * - shift card → zone in its own lane: extends the shift to that talk;
 * - shift card → zone in another room or role: moves the whole shift there;
 * - a card's top/bottom edge → zone in its own lane: moves that end of the
 *   shift, lengthening or shortening it.
 *
 * Only roles a volunteer holds accept them, and not a slot where they're
 * already somewhere else; the store enforces both.
 */

export interface VolunteerPlannerRoom {
    id: string
    name: string
}

export interface VolunteerPlannerSlot {
    /** Sessionize `slotStart`, e.g. "09:30:00". */
    id: string
    label: string
    /**
     * The session starting in each room at this slot, by room id. A room
     * with nothing starting here is either covered by a longer session from
     * above or empty. Service sessions (breaks) get no shifts.
     */
    sessions: Record<string, { title: string; rowSpan: number; isService: boolean; endLabel: string }>
}

export interface VolunteerPlannerVolunteer {
    id: string
    name: string
    roles: VolunteerRole[]
    shifts: number
}

/** One roster edit, mapped 1:1 onto the route's action intents. */
export type VolunteerRosterChange = {
    intent: 'assign' | 'unassign'
    slotId: string
    roomId: string
    role: VolunteerRole
    volunteerId: string
}

interface Seat {
    slotIndex: number
    roomId: string
    role: VolunteerRole
}

/** A volunteer's run of consecutive talks in one room and role. */
interface Shift {
    volunteerId: string
    roomId: string
    role: VolunteerRole
    /** Ascending; each has a talk in `roomId`. */
    slotIndices: number[]
    /** Side-by-side position among shifts sharing the lane at the same time. */
    stack: number
    stackCount: number
}

type Dragging = { kind: 'new'; volunteerId: string } | { kind: 'move' | 'start' | 'end'; shift: Shift }

interface DropPlan {
    adds: Seat[]
    removes: Seat[]
}

const NOTHING: DropPlan = { adds: [], removes: [] }

function seatKey(slotId: string, roomId: string, role: string) {
    return `${slotId}|${roomId}|${role}`
}

const LANES = 1 + VOLUNTEER_ROLES.length
/** Content tracks alternate with the narrow tracks neighbouring lanes overlap in. */
const ROOM_TRACKS = Array.from({ length: LANES }, () => 'minmax(7rem, 1fr)').join(' 0.75rem ')
const TRACKS_PER_ROOM = LANES * 2 - 1

function roomStartLine(roomIndex: number) {
    // Line 1 | time column | line 2 | room 0 ... | 1rem gap track | room 1 ...
    return 2 + roomIndex * (TRACKS_PER_ROOM + 1)
}

/** Grid lines for lane `lane` (0 = session) of room `roomIndex`: each lane
 * reaches into the overlap track either side of it. */
function laneColumn(roomIndex: number, lane: number) {
    const roomStart = roomStartLine(roomIndex)
    const start = roomStart + lane * 2 - (lane > 0 ? 1 : 0)
    const end = roomStart + lane * 2 + 1 + (lane < LANES - 1 ? 1 : 0)
    return `${start} / ${end}`
}

// css() rather than spread props objects, so Panda's static extraction sees them.
// Status tints are the same in both site themes, so they read on the white
// admin card whichever theme the organiser has picked.
const calendarClass = css({
    '--session_bg': 'token(colors.status.info.bg)',
    '--session_edge': 'token(colors.status.info.emphasis)',
    '--room-coordinators_bg': 'token(colors.status.warning.bg)',
    '--room-coordinators_edge': 'token(colors.status.warning.emphasis)',
    '--room-coordinators_strong': 'token(colors.status.warning.border)',
    '--photographers_bg': 'token(colors.status.success.bg)',
    '--photographers_edge': 'token(colors.status.success.emphasis)',
    '--photographers_strong': 'token(colors.status.success.border)',
    fontSize: 'sm',
})
const gridClass = css({ display: 'grid', rowGap: '1.5', alignItems: 'stretch' })
/** Maps `data-lane` to that lane's tint and edge colour. */
const laneColourClass = css({
    '&[data-lane="session"]': { '--lane_bg': 'var(--session_bg)', '--lane_edge': 'var(--session_edge)' },
    '&[data-lane="room-coordinators"]': {
        '--lane_bg': 'var(--room-coordinators_bg)',
        '--lane_edge': 'var(--room-coordinators_edge)',
    },
    '&[data-lane="photographers"]': {
        '--lane_bg': 'var(--photographers_bg)',
        '--lane_edge': 'var(--photographers_edge)',
    },
    '&[data-lane="service"]': { '--lane_bg': 'token(colors.admin.100)', '--lane_edge': 'token(colors.admin.400)' },
})
/** Colours a person by the roles they hold — striped when they hold both. */
const personClass = css({
    bg: 'white',
    color: 'admin.900',
    '&[data-roles~="room-coordinators"]': { bg: 'var(--room-coordinators_strong)' },
    '&[data-roles~="photographers"]': { bg: 'var(--photographers_strong)' },
    '&[data-roles~="room-coordinators"][data-roles~="photographers"]': {
        bgImage:
            'repeating-linear-gradient(135deg, var(--room-coordinators_strong) 0 6px, var(--photographers_strong) 6px 12px)',
    },
})
/**
 * Spans the whole room, under the role lanes, so only its left edge shows.
 * A subgrid of the room's tracks keeps the title in the first track — the
 * part the lanes don't cover. A break has no lanes over it, so its title
 * gets the full width.
 */
const sessionClass = css({
    display: 'grid',
    gridTemplateColumns: 'subgrid',
    alignContent: 'start',
    py: '1.5',
    ps: '1.5',
    borderRadius: 'md',
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    borderLeftColor: 'var(--lane_edge)',
    bg: 'var(--lane_bg)',
    boxShadow: 'sm',
    fontSize: 'xs',
    '& > *': { gridColumn: '1' },
    '&[data-lane="service"] > *': { gridColumn: '1 / -1' },
})
const zoneClass = css({
    minH: '12',
    borderRadius: 'md',
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: 'var(--lane_edge)',
    bg: 'var(--lane_bg)',
    '&[data-drop="valid"]': { outlineWidth: '2px', outlineStyle: 'dashed', outlineColor: 'indigo.7' },
    '&[data-drop="add"]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'indigo.7' },
    '&[data-drop="remove"]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'status.danger.emphasis' },
})
const shiftClass = css({
    position: 'relative',
    // Above the drop zones, below the sticky volunteer pool.
    zIndex: '[1]',
    // Side by side with anyone sharing the lane at the same time.
    width: '[calc(100% / var(--stack_count))]',
    marginLeft: '[calc(100% * var(--stack) / var(--stack_count))]',
    px: '1.5',
    py: '2',
    borderRadius: 'md',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.400',
    borderLeftWidth: '4px',
    borderLeftColor: 'var(--lane_edge)',
    boxShadow: 'md',
    fontSize: 'xs',
    cursor: 'grab',
    '&[data-overlapped]': { pe: '4' },
    // Let the drop zones underneath catch a drag.
    '[data-dragging] &': { pointerEvents: 'none' },
})
const handleClass = css({
    position: 'absolute',
    insetInline: '0',
    height: '1.5',
    cursor: 'ns-resize',
    '&[data-edge="start"]': { top: '0' },
    '&[data-edge="end"]': { bottom: '0' },
    _hover: { bg: 'var(--lane_edge)' },
})
const chipListClass = css({ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '1', my: '1' })
const chipClass = css({
    px: '2',
    py: '0.5',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.400',
    borderRadius: 'full',
    fontSize: 'xs',
    cursor: 'grab',
})
const legendClass = css({ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '3', fontSize: 'xs', mb: '2' })

export function VolunteerPlanner({
    rooms,
    slots,
    volunteers,
    assignments,
    onChange,
}: {
    rooms: VolunteerPlannerRoom[]
    slots: VolunteerPlannerSlot[]
    volunteers: VolunteerPlannerVolunteer[]
    assignments: VolunteerAssignment[]
    onChange: (change: VolunteerRosterChange) => void
}) {
    // Edits show straight away rather than waiting on the save round-trip.
    // Fresh loader data replaces them, so a refused save reverts to what's
    // stored.
    const [pending, setPending] = useState<VolunteerRosterChange[]>([])
    useEffect(() => setPending([]), [assignments])

    const [dragging, setDragging] = useState<Dragging | null>(null)
    const [hover, setHover] = useState<Seat | null>(null)
    const pendingDragStart = useRef<ReturnType<typeof setTimeout>>(undefined)

    const seats = new Map<string, string[]>()
    for (const a of [...assignments.map((a) => ({ intent: 'assign', ...a }) as const), ...pending]) {
        const key = seatKey(a.slotId, a.roomId, a.role)
        const others = (seats.get(key) ?? []).filter((id) => id !== a.volunteerId)
        seats.set(key, a.intent === 'assign' ? [...others, a.volunteerId] : others)
    }

    // Where each volunteer is during each slot.
    const seatOf = new Map<string, string>()
    for (const [key, ids] of seats) {
        const [slotId] = key.split('|')
        for (const id of ids) seatOf.set(`${slotId}|${id}`, key)
    }

    const volunteerById = new Map(volunteers.map((v) => [v.id, v]))
    const keyOf = (seat: Seat) => seatKey(slots[seat.slotIndex].id, seat.roomId, seat.role)

    function hasTalk(slotIndex: number, roomId: string) {
        const session = slots[slotIndex].sessions[roomId]
        return !!session && !session.isService
    }

    /** Slot indices of the talks in `roomId` between `from` and `to`, inclusive. */
    function talksBetween(roomId: string, from: number, to: number) {
        const indices: number[] = []
        for (let i = from; i <= to; i++) if (hasTalk(i, roomId)) indices.push(i)
        return indices
    }

    // Join each volunteer's assignments on consecutive talks in a room and
    // role into shifts. Breaks between talks don't split a shift.
    const shifts: Shift[] = []
    for (const room of rooms) {
        const talks = talksBetween(room.id, 0, slots.length - 1)
        for (const role of VOLUNTEER_ROLES) {
            const lane: Shift[] = []
            let open = new Map<string, Shift>()
            for (const slotIndex of talks) {
                const next = new Map<string, Shift>()
                for (const volunteerId of seats.get(seatKey(slots[slotIndex].id, room.id, role.id)) ?? []) {
                    let shift = open.get(volunteerId)
                    if (!shift) {
                        shift = {
                            volunteerId,
                            roomId: room.id,
                            role: role.id,
                            slotIndices: [],
                            stack: 0,
                            stackCount: 1,
                        }
                        lane.push(shift)
                    }
                    shift.slotIndices.push(slotIndex)
                    next.set(volunteerId, shift)
                }
                open = next
            }

            // Stack shifts that share the lane at the same time side by side:
            // each takes the first column free by its start, and is as narrow
            // as the busiest overlap it's part of.
            const columnEnds: number[] = []
            for (const shift of lane) {
                const first = shift.slotIndices[0]
                const column = columnEnds.findIndex((end) => end < first)
                shift.stack = column === -1 ? columnEnds.length : column
                columnEnds[shift.stack] = shift.slotIndices[shift.slotIndices.length - 1]
            }
            for (const shift of lane) {
                const [first, last] = [shift.slotIndices[0], shift.slotIndices[shift.slotIndices.length - 1]]
                const overlapping = lane.filter(
                    (other) => other.slotIndices[0] <= last && other.slotIndices[other.slotIndices.length - 1] >= first,
                )
                shift.stackCount = 1 + Math.max(...overlapping.map((other) => other.stack))
            }
            shifts.push(...lane)
        }
    }

    /** Somewhere else this slot. `leaving` is a seat they're being moved off. */
    function busyElsewhere(volunteerId: string, seat: Seat, leaving?: Seat) {
        const at = seatOf.get(`${slots[seat.slotIndex].id}|${volunteerId}`)
        return at !== undefined && at !== keyOf(seat) && at !== (leaving && keyOf(leaving))
    }

    function canAdd(volunteerId: string, seat: Seat, leaving?: Seat) {
        return (
            !!volunteerById.get(volunteerId)?.roles.includes(seat.role) &&
            !(seats.get(keyOf(seat)) ?? []).includes(volunteerId) &&
            !busyElsewhere(volunteerId, seat, leaving)
        )
    }

    /** What dropping the current drag onto `target` would do. */
    function plan(target: Seat): DropPlan {
        if (!dragging) return NOTHING
        if (dragging.kind === 'new') {
            return canAdd(dragging.volunteerId, target) ? { adds: [target], removes: [] } : NOTHING
        }

        const { shift } = dragging
        const { volunteerId, roomId, role } = shift
        const first = shift.slotIndices[0]
        const last = shift.slotIndices[shift.slotIndices.length - 1]
        const t = target.slotIndex
        const inLane = (slotIndex: number) => ({ slotIndex, roomId, role })
        const addable = (indices: number[]) => indices.map(inLane).filter((seat) => canAdd(volunteerId, seat))
        const sameLane = target.roomId === roomId && target.role === role

        if (dragging.kind === 'move' && !sameLane) {
            const moves: DropPlan = { adds: [], removes: [] }
            for (const slotIndex of shift.slotIndices) {
                const from = inLane(slotIndex)
                const to = { ...target, slotIndex }
                if (hasTalk(slotIndex, target.roomId) && canAdd(volunteerId, to, from)) {
                    moves.removes.push(from)
                    moves.adds.push(to)
                }
            }
            return moves
        }
        if (!sameLane) return NOTHING

        if (dragging.kind === 'end') {
            if (t < first) return NOTHING
            return {
                adds: addable(talksBetween(roomId, last + 1, t)),
                removes: shift.slotIndices.filter((i) => i > t).map(inLane),
            }
        }
        if (dragging.kind === 'start') {
            if (t > last) return NOTHING
            return {
                adds: addable(talksBetween(roomId, t, first - 1)),
                removes: shift.slotIndices.filter((i) => i < t).map(inLane),
            }
        }
        // Moved within its own lane: stretch to reach the drop.
        if (t < first) return { adds: addable(talksBetween(roomId, t, first - 1)), removes: [] }
        if (t > last) return { adds: addable(talksBetween(roomId, last + 1, t)), removes: [] }
        return NOTHING
    }

    const isNothing = (p: DropPlan) => p.adds.length === 0 && p.removes.length === 0

    function edit(intent: VolunteerRosterChange['intent'], volunteerId: string, seat: Seat) {
        const change = { intent, slotId: slots[seat.slotIndex].id, roomId: seat.roomId, role: seat.role, volunteerId }
        setPending((current) => [...current, change])
        onChange(change)
    }

    function endDrag() {
        // A drag that ends before its deferred start lands mustn't leave the
        // board stuck in dragging mode (cards unclickable).
        clearTimeout(pendingDragStart.current)
        setDragging(null)
        setHover(null)
    }

    function drop(target: Seat) {
        const { adds, removes } = plan(target)
        const volunteerId = dragging?.kind === 'new' ? dragging.volunteerId : dragging?.shift.volunteerId
        endDrag()
        if (!volunteerId) return
        // Removes first: the store refuses a second seat in the same slot.
        for (const seat of removes) edit('unassign', volunteerId, seat)
        for (const seat of adds) edit('assign', volunteerId, seat)
    }

    function startDrag(e: React.DragEvent, next: Dragging) {
        // A handle sits inside its card; don't let the card's own drag take over.
        e.stopPropagation()
        // Firefox won't start a drag without data.
        e.dataTransfer.setData('text/plain', next.kind)
        // Deferred: dragging turns off pointer events on shift cards (so the
        // drop zones under them can catch the drag), and Chrome cancels a
        // drag whose source stops taking pointer events during dragstart.
        pendingDragStart.current = setTimeout(() => setDragging(next))
    }

    const hoverPlan = hover ? plan(hover) : NOTHING
    const hoverAdds = new Set(hoverPlan.adds.map(keyOf))
    const hoverRemoves = new Set(hoverPlan.removes.map(keyOf))

    return (
        <div className={calendarClass} data-dragging={dragging ? '' : undefined}>
            {/* Sticky, so there's always something to drag from however far down the grid is. */}
            <Box position="sticky" top="0" zIndex="docked" bg="white" py="2" mb="3" borderBottom="admin-subtle">
                <ul className={legendClass} aria-label="Colour key">
                    <li>
                        <span className={cx(laneColourClass, sessionClass)} data-lane="session">
                            Session
                        </span>
                    </li>
                    {VOLUNTEER_ROLES.map((role) => (
                        <li key={role.id}>
                            <span className={cx(personClass, chipClass)} data-roles={role.id}>
                                {role.label}
                            </span>
                        </li>
                    ))}
                    <li>
                        <span
                            className={cx(personClass, chipClass)}
                            data-roles={VOLUNTEER_ROLES.map((role) => role.id).join(' ')}
                        >
                            Does both
                        </span>
                    </li>
                </ul>
                <styled.p fontSize="xs" color="admin.600" mb="1">
                    Drag a volunteer into a room&apos;s lane to roster them for that talk. Drag a shift up or down its
                    lane to extend it, drag its top or bottom edge to change when it starts or ends, or drag it into
                    another room or role to move it.
                </styled.p>
                {/* TODO: adding and reshaping shifts is drag-only by request, so it can't be done from the keyboard (WCAG 2.1.1). Removing still can, via each shift's × button. */}
                <ul className={chipListClass}>
                    {volunteers
                        .filter((volunteer) => volunteer.roles.length > 0)
                        .map((volunteer) => (
                            <li
                                key={volunteer.id}
                                className={cx(personClass, chipClass)}
                                data-roles={volunteer.roles.join(' ')}
                                draggable
                                onDragStart={(e) => startDrag(e, { kind: 'new', volunteerId: volunteer.id })}
                                onDragEnd={endDrag}
                            >
                                {volunteer.name} ({volunteer.shifts} {volunteer.shifts === 1 ? 'talk' : 'talks'})
                            </li>
                        ))}
                </ul>
            </Box>

            <Box overflowX="auto" pb="2">
                <div
                    className={gridClass}
                    style={{
                        gridTemplateColumns: `max-content ${rooms.map(() => ROOM_TRACKS).join(' 1rem ')}`,
                        gridTemplateRows: `auto repeat(${slots.length}, auto)`,
                    }}
                >
                    {rooms.map((room, roomIndex) => (
                        <styled.h3
                            key={room.id}
                            fontWeight="semibold"
                            textAlign="center"
                            style={{ gridRow: 1, gridColumn: `${roomStartLine(roomIndex)} / span ${TRACKS_PER_ROOM}` }}
                        >
                            {room.name}
                        </styled.h3>
                    ))}

                    {slots.map((slot, slotIndex) => (
                        <Fragment key={slot.id}>
                            <styled.p
                                fontSize="xs"
                                fontWeight="semibold"
                                color="admin.700"
                                pe="3"
                                whiteSpace="nowrap"
                                style={{ gridRow: slotIndex + 2, gridColumn: 1 }}
                            >
                                <time dateTime={slot.id.slice(0, 5)}>{slot.label}</time>
                            </styled.p>
                            {rooms.map((room, roomIndex) => {
                                const session = slot.sessions[room.id]
                                if (!session) return null
                                const gridRow = `${slotIndex + 2} / span ${session.rowSpan}`
                                return (
                                    <Fragment key={room.id}>
                                        <div
                                            className={cx(laneColourClass, sessionClass)}
                                            data-lane={session.isService ? 'service' : 'session'}
                                            style={{
                                                gridRow,
                                                gridColumn: `${roomStartLine(roomIndex)} / span ${TRACKS_PER_ROOM}`,
                                            }}
                                        >
                                            <styled.p
                                                fontWeight={session.isService ? 'normal' : 'medium'}
                                                color={session.isService ? 'admin.700' : 'admin.900'}
                                                lineClamp={4}
                                            >
                                                {session.title}
                                                <styled.span srOnly>
                                                    , {room.name}, {slot.label}
                                                </styled.span>
                                            </styled.p>
                                        </div>
                                        {!session.isService &&
                                            VOLUNTEER_ROLES.map((role, roleIndex) => {
                                                const seat = { slotIndex, roomId: room.id, role: role.id }
                                                const key = keyOf(seat)
                                                const droppable = !isNothing(plan(seat))
                                                return (
                                                    <div
                                                        key={role.id}
                                                        className={cx(laneColourClass, zoneClass)}
                                                        data-lane={role.id}
                                                        data-drop={
                                                            hoverAdds.has(key)
                                                                ? 'add'
                                                                : hoverRemoves.has(key)
                                                                  ? 'remove'
                                                                  : droppable
                                                                    ? 'valid'
                                                                    : undefined
                                                        }
                                                        style={{
                                                            gridRow,
                                                            gridColumn: laneColumn(roomIndex, roleIndex + 1),
                                                        }}
                                                        onDragEnter={() => setHover(droppable ? seat : null)}
                                                        onDragOver={(e) => {
                                                            if (droppable) e.preventDefault()
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault()
                                                            drop(seat)
                                                        }}
                                                    />
                                                )
                                            })}
                                    </Fragment>
                                )
                            })}
                        </Fragment>
                    ))}

                    {shifts.map((shift) => {
                        const roomIndex = rooms.findIndex((room) => room.id === shift.roomId)
                        const roleIndex = VOLUNTEER_ROLES.findIndex((role) => role.id === shift.role)
                        const first = shift.slotIndices[0]
                        const last = shift.slotIndices[shift.slotIndices.length - 1]
                        const lastTalk = slots[last].sessions[shift.roomId]
                        const volunteer = volunteerById.get(shift.volunteerId)
                        const name = volunteer?.name ?? 'Removed volunteer'
                        const when = `${slots[first].label}–${lastTalk.endLabel || slots[last].label}`
                        const where = `${VOLUNTEER_ROLES[roleIndex].label}, ${rooms[roomIndex].name}`
                        return (
                            <div
                                key={`${shift.roomId}|${shift.role}|${shift.volunteerId}|${first}`}
                                className={cx(laneColourClass, personClass, shiftClass)}
                                data-lane={shift.role}
                                data-roles={volunteer?.roles.join(' ')}
                                data-overlapped={roleIndex < VOLUNTEER_ROLES.length - 1 || undefined}
                                draggable
                                onDragStart={(e) => startDrag(e, { kind: 'move', shift })}
                                onDragEnd={endDrag}
                                style={
                                    {
                                        gridRow: `${first + 2} / ${last + 2 + lastTalk.rowSpan}`,
                                        gridColumn: laneColumn(roomIndex, roleIndex + 1),
                                        '--stack': shift.stack,
                                        '--stack_count': shift.stackCount,
                                    } as CSSProperties
                                }
                            >
                                {(['start', 'end'] as const).map((edge) => (
                                    <span
                                        key={edge}
                                        className={handleClass}
                                        data-edge={edge}
                                        aria-hidden="true"
                                        title={`Drag to change when this shift ${edge === 'start' ? 'starts' : 'ends'}`}
                                        draggable
                                        onDragStart={(e) => startDrag(e, { kind: edge, shift })}
                                        onDragEnd={endDrag}
                                    />
                                ))}
                                <styled.p fontWeight="semibold">
                                    {name}
                                    <styled.span srOnly>
                                        , {where}, {when}
                                    </styled.span>
                                </styled.p>
                                <styled.button
                                    type="button"
                                    position="absolute"
                                    top="1"
                                    right="1"
                                    px="1"
                                    cursor="pointer"
                                    _hover={{ color: 'status.danger.fg' }}
                                    onClick={() => {
                                        for (const slotIndex of shift.slotIndices) {
                                            edit('unassign', shift.volunteerId, {
                                                slotIndex,
                                                roomId: shift.roomId,
                                                role: shift.role,
                                            })
                                        }
                                    }}
                                >
                                    <span aria-hidden="true">×</span>
                                    <styled.span srOnly>
                                        Remove {name}&apos;s shift: {where}, {when}
                                    </styled.span>
                                </styled.button>
                            </div>
                        )
                    })}
                </div>
            </Box>
        </div>
    )
}
