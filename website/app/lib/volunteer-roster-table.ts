/**
 * One role's roster (room coordinators *or* photographers) as a table an
 * organiser copies from the volunteers admin page (routes/admin.volunteers.tsx)
 * and pastes into an email. Same calendar shape as the planner: one row per
 * time slot, one column per room, each talk listing who's on it. Pure so it's
 * unit-testable.
 */

import type { VolunteerAssignment, VolunteerRole } from '~/lib/services/volunteers-store'

export interface VolunteerRosterInput {
    rooms: Array<{ id: string; name: string }>
    /** Same shape as the planner's slots: the session *starting* in each room. */
    slots: Array<{
        id: string
        label: string
        sessions: Record<
            string,
            { title: string; rowSpan: number; colSpan: number; isService: boolean; endLabel: string }
        >
    }>
    volunteers: Array<{ id: string; name: string }>
    assignments: VolunteerAssignment[]
}

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function buildVolunteerRosterTable(
    { rooms, slots, volunteers, assignments }: VolunteerRosterInput,
    role: VolunteerRole,
): { text: string; html: string } {
    const nameById = new Map(volunteers.map((v) => [v.id, v.name]))

    /** "Ada, Grace", or "—" for an empty seat. */
    const names = (slotId: string, roomId: string) =>
        assignments
            .filter((a) => a.slotId === slotId && a.roomId === roomId && a.role === role)
            .map((a) => nameById.get(a.volunteerId) ?? 'Unknown volunteer')
            .join(', ') || '—'

    // The text version is only the clipboard's plain-text fallback. It can't
    // hold a grid with spanning talks legibly, so it's grouped by slot
    // instead, and breaks are left out.
    const text = slots
        .map((slot) => {
            const talks = rooms
                .filter((room) => slot.sessions[room.id] && !slot.sessions[room.id].isService)
                .map((room) => `  ${room.name} — ${slot.sessions[room.id].title}: ${names(slot.id, room.id)}`)
            return talks.length ? `${slot.label}\n${talks.join('\n')}` : null
        })
        .filter(Boolean)
        .join('\n\n')

    // A talk spans the slots it runs over (and a plenum talk the rooms it
    // fills), and a room covered by a talk gets no cell.
    const cell = 'border:1px solid #ccc;padding:6px 10px;text-align:left;vertical-align:top'
    const coveredUntil = new Map<string, number>()
    const rows = slots.map((slot, slotIndex) => {
        const cells = rooms.map((room, roomIndex) => {
            const session = slot.sessions[room.id]
            if (!session) return (coveredUntil.get(room.id) ?? 0) > slotIndex ? '' : `<td style="${cell}"></td>`
            for (const covered of rooms.slice(roomIndex, roomIndex + session.colSpan)) {
                coveredUntil.set(covered.id, slotIndex + session.rowSpan)
            }
            const spans =
                (session.rowSpan > 1 ? ` rowspan="${session.rowSpan}"` : '') +
                (session.colSpan > 1 ? ` colspan="${session.colSpan}"` : '')
            const title = `<em style="font-size:smaller">${escapeHtml(session.title)}</em>`
            const roster = session.isService ? '' : `<br/><strong>${escapeHtml(names(slot.id, room.id))}</strong>`
            return `<td style="${cell}"${spans}>${title}${roster}</td>`
        })
        return `<tr><th style="${cell}">${escapeHtml(slot.label)}</th>${cells.join('')}</tr>`
    })

    const html = `<table style="border-collapse:collapse">
<thead><tr><th style="${cell}">Time</th>${rooms.map((r) => `<th style="${cell}">${escapeHtml(r.name)}</th>`).join('')}</tr></thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>`

    return { text, html }
}
