import type { MeetTheExpertsStore } from '../meet-the-experts-store'
import type {
    MeetTheExpertsAssignment,
    MeetTheExpertsSchedulingStore,
    MeetTheExpertsTable,
} from '../meet-the-experts-scheduling-store'

interface TableRow {
    id: string
    label: string
    position: number
}

interface AssignmentRow {
    table_id: string
    slot_id: string
    registrant_type: string
    registrant_id: string
    assigned_at: number
    assigned_by: string
}

function toTable(row: TableRow): MeetTheExpertsTable {
    return { id: row.id, label: row.label, position: row.position }
}

function toAssignment(row: AssignmentRow): MeetTheExpertsAssignment {
    return {
        tableId: row.table_id,
        slotId: row.slot_id,
        registrantType: row.registrant_type as MeetTheExpertsAssignment['registrantType'],
        registrantId: row.registrant_id,
        assignedAt: row.assigned_at,
        assignedBy: row.assigned_by,
    }
}

/**
 * `meetTheExperts` is the registration store, injected so `assign` can check
 * a registrant's chosen slots before seating them — the server-side half of
 * the hard preference block (the client already refuses to start a drop
 * outside a registrant's slots, but the server is the authority).
 */
export function createD1MeetTheExpertsSchedulingStore(
    db: D1Database,
    meetTheExperts: MeetTheExpertsStore,
): MeetTheExpertsSchedulingStore {
    return {
        async getState() {
            const [tables, assignments] = await db.batch<TableRow | AssignmentRow>([
                db.prepare(`SELECT id, label, position FROM meet_the_experts_tables ORDER BY position`),
                db.prepare(`SELECT * FROM meet_the_experts_assignments`),
            ])
            return {
                tables: tables.results.map((row) => toTable(row as TableRow)),
                assignments: assignments.results.map((row) => toAssignment(row as AssignmentRow)),
            }
        },

        async addTable(label) {
            const id = crypto.randomUUID()
            const now = Math.floor(Date.now() / 1000)
            await db
                .prepare(
                    `INSERT INTO meet_the_experts_tables (id, label, position, created_at, updated_at)
                     VALUES (?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM meet_the_experts_tables), ?, ?)`,
                )
                .bind(id, label, now, now)
                .run()
            const row = await db
                .prepare(`SELECT id, label, position FROM meet_the_experts_tables WHERE id = ?`)
                .bind(id)
                .first<TableRow>()
            if (!row) throw new Error('Table vanished immediately after being created')
            return toTable(row)
        },

        async renameTable(tableId, label) {
            await db
                .prepare(`UPDATE meet_the_experts_tables SET label = ?, updated_at = ? WHERE id = ?`)
                .bind(label, Math.floor(Date.now() / 1000), tableId)
                .run()
        },

        async removeTable(tableId) {
            // Delete assignments explicitly rather than relying on the FK's
            // ON DELETE CASCADE — D1 doesn't enable foreign_keys on every
            // connection, same caveat as the agenda planner's removeTrack.
            await db.batch([
                db.prepare(`DELETE FROM meet_the_experts_assignments WHERE table_id = ?`).bind(tableId),
                db.prepare(`DELETE FROM meet_the_experts_tables WHERE id = ?`).bind(tableId),
            ])
        },

        async moveTable(tableId, direction) {
            const current = await db
                .prepare(`SELECT position FROM meet_the_experts_tables WHERE id = ?`)
                .bind(tableId)
                .first<{ position: number }>()
            if (!current) return

            const neighbour = await db
                .prepare(
                    direction === 'up'
                        ? `SELECT id, position FROM meet_the_experts_tables WHERE position < ? ORDER BY position DESC LIMIT 1`
                        : `SELECT id, position FROM meet_the_experts_tables WHERE position > ? ORDER BY position ASC LIMIT 1`,
                )
                .bind(current.position)
                .first<{ id: string; position: number }>()
            // Already at the start/end of the table list.
            if (!neighbour) return

            const now = Math.floor(Date.now() / 1000)
            await db.batch([
                db
                    .prepare(`UPDATE meet_the_experts_tables SET position = ?, updated_at = ? WHERE id = ?`)
                    .bind(neighbour.position, now, tableId),
                db
                    .prepare(`UPDATE meet_the_experts_tables SET position = ?, updated_at = ? WHERE id = ?`)
                    .bind(current.position, now, neighbour.id),
            ])
        },

        async assign(tableId, slotId, registrant, assignedBy) {
            const registration = await meetTheExperts.getRegistration(registrant.type, registrant.id)
            if (!registration || !registration.slots.includes(slotId)) {
                throw new Error("That person didn't register this slot as one they're available for.")
            }

            const elsewhere = await db
                .prepare(
                    `SELECT table_id FROM meet_the_experts_assignments
                     WHERE slot_id = ? AND registrant_type = ? AND registrant_id = ? AND table_id != ?`,
                )
                .bind(slotId, registrant.type, registrant.id, tableId)
                .first<{ table_id: string }>()
            if (elsewhere) {
                throw new Error('That person is already seated at another table for this slot.')
            }

            await db
                .prepare(
                    `INSERT INTO meet_the_experts_assignments
                         (table_id, slot_id, registrant_type, registrant_id, assigned_at, assigned_by)
                     VALUES (?, ?, ?, ?, unixepoch(), ?)
                     ON CONFLICT(table_id, slot_id) DO UPDATE SET
                         registrant_type = excluded.registrant_type,
                         registrant_id = excluded.registrant_id,
                         assigned_at = excluded.assigned_at,
                         assigned_by = excluded.assigned_by`,
                )
                .bind(tableId, slotId, registrant.type, registrant.id, assignedBy)
                .run()
        },

        async unassign(tableId, slotId) {
            await db
                .prepare(`DELETE FROM meet_the_experts_assignments WHERE table_id = ? AND slot_id = ?`)
                .bind(tableId, slotId)
                .run()
        },
    }
}
