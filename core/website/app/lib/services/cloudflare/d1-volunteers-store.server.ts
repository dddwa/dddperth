import {
    isVolunteerRole,
    VOLUNTEER_ROLES,
    type Volunteer,
    type VolunteerAssignment,
    type VolunteerRole,
    type VolunteersStore,
} from '../volunteers-store'

interface VolunteerRow {
    id: string
    name: string
    email: string | null
    roles_json: string
}

interface AssignmentRow {
    slot_id: string
    room_id: string
    role: string
    volunteer_id: string
}

/** Drops anything that's no longer a role in code, rather than failing on it. */
function parseRoles(json: string): VolunteerRole[] {
    const parsed: unknown = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((role): role is VolunteerRole => isVolunteerRole(role)) : []
}

function toVolunteer(row: VolunteerRow): Volunteer {
    return { id: row.id, name: row.name, email: row.email, roles: parseRoles(row.roles_json) }
}

function toAssignment(row: AssignmentRow): VolunteerAssignment {
    return {
        slotId: row.slot_id,
        roomId: row.room_id,
        role: row.role as VolunteerAssignment['role'],
        volunteerId: row.volunteer_id,
    }
}

export function createD1VolunteersStore(db: D1Database): VolunteersStore {
    return {
        async listVolunteers() {
            const { results } = await db
                .prepare(`SELECT id, name, email, roles_json FROM volunteers ORDER BY name COLLATE NOCASE`)
                .all<VolunteerRow>()
            return results.map(toVolunteer)
        },

        async addVolunteer(name, email, roles) {
            const id = crypto.randomUUID()
            const now = Math.floor(Date.now() / 1000)
            await db
                .prepare(
                    `INSERT INTO volunteers (id, name, email, roles_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
                )
                .bind(id, name, email, JSON.stringify(roles), now, now)
                .run()
            return { id, name, email, roles }
        },

        async setVolunteerRoles(volunteerId, roles, year) {
            const dropped = VOLUNTEER_ROLES.map((role) => role.id).filter((role) => !roles.includes(role))
            await db.batch([
                db
                    .prepare(`UPDATE volunteers SET roles_json = ?, updated_at = ? WHERE id = ?`)
                    .bind(JSON.stringify(roles), Math.floor(Date.now() / 1000), volunteerId),
                ...dropped.map((role) =>
                    db
                        .prepare(`DELETE FROM volunteer_assignments WHERE volunteer_id = ? AND year = ? AND role = ?`)
                        .bind(volunteerId, year, role),
                ),
            ])
        },

        async removeVolunteer(volunteerId) {
            // Delete assignments explicitly rather than relying on the FK's
            // ON DELETE CASCADE — D1 doesn't enable foreign_keys on every
            // connection, same caveat as the Meet the Experts removeTable.
            await db.batch([
                db.prepare(`DELETE FROM volunteer_assignments WHERE volunteer_id = ?`).bind(volunteerId),
                db.prepare(`DELETE FROM volunteers WHERE id = ?`).bind(volunteerId),
            ])
        },

        async listAssignments(year) {
            const { results } = await db
                .prepare(
                    `SELECT slot_id, room_id, role, volunteer_id FROM volunteer_assignments WHERE year = ? ORDER BY id`,
                )
                .bind(year)
                .all<AssignmentRow>()
            return results.map(toAssignment)
        },

        async assign(year, { slotId, roomId, role, volunteerId }, assignedBy) {
            const volunteer = await db
                .prepare(`SELECT roles_json FROM volunteers WHERE id = ?`)
                .bind(volunteerId)
                .first<{ roles_json: string }>()
            if (!volunteer) throw new Error('That volunteer no longer exists.')
            if (!parseRoles(volunteer.roles_json).includes(role)) {
                const label = VOLUNTEER_ROLES.find((r) => r.id === role)?.label ?? role
                throw new Error(`That volunteer isn't down as a ${label.toLowerCase()}.`)
            }

            const existing = await db
                .prepare(`SELECT room_id, role FROM volunteer_assignments WHERE year = ? AND slot_id = ? AND volunteer_id = ?`)
                .bind(year, slotId, volunteerId)
                .first<{ room_id: string; role: string }>()
            if (existing) {
                if (existing.room_id === roomId && existing.role === role) return
                throw new Error('That volunteer is already rostered somewhere else during this slot.')
            }

            await db
                .prepare(
                    `INSERT INTO volunteer_assignments
                         (year, slot_id, room_id, role, volunteer_id, assigned_at, assigned_by)
                     VALUES (?, ?, ?, ?, ?, unixepoch(), ?)`,
                )
                .bind(year, slotId, roomId, role, volunteerId, assignedBy)
                .run()
        },

        async unassign(year, { slotId, roomId, role, volunteerId }) {
            await db
                .prepare(
                    `DELETE FROM volunteer_assignments
                     WHERE year = ? AND slot_id = ? AND room_id = ? AND role = ? AND volunteer_id = ?`,
                )
                .bind(year, slotId, roomId, role, volunteerId)
                .run()
        },
    }
}
