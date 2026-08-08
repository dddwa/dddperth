import type {
    AgendaPlanningImport,
    AgendaPlanningState,
    PlannerBoard,
    SlotKind,
    TalkPlanning,
    TalkStatus,
} from './agenda-planning-types'
import { EMPTY_PLANNER_BOARD } from './agenda-planning-types'
import { recordException } from './record-exception'

/**
 * D1 access for shared agenda planning. Writes are last-write-wins at row
 * granularity — the organizer team is small and edits are per-talk or
 * per-slot, so the worst case is one field being clobbered rather than a
 * whole board.
 */

interface TalkPlanningRow {
    talk_id: string
    status: string | null
    um_override: number | null
    exp_override: number | null
    topic_override: string | null
    updated_at: string
    updated_by_email: string | null
}

interface TrackRow {
    track_id: string
    name: string
    position: number
}

interface SlotRow {
    slot_id: string
    track_id: string
    length: string
    talk_id: string | null
    position: number
    kind: string
    label: string | null
}

interface CapacityRow {
    length: string
    capacity: number
}

/** SQLite has no boolean type — override columns store 0/1 or NULL. */
function toDbBool(value: boolean | undefined): number | null {
    return value === undefined ? null : value ? 1 : 0
}

function fromDbBool(value: number | null): boolean | undefined {
    return value === null ? undefined : value === 1
}

function rowToTalkPlanning(row: TalkPlanningRow): TalkPlanning {
    return {
        talkId: row.talk_id,
        // '' is a real status ("explicitly cleared"), so only a NULL column
        // means "never set" — don't collapse the two with `|| undefined`.
        status: row.status === null ? undefined : (row.status as TalkStatus),
        um: fromDbBool(row.um_override),
        exp: fromDbBool(row.exp_override),
        topic: row.topic_override ?? undefined,
        updatedAt: row.updated_at,
        updatedByEmail: row.updated_by_email,
    }
}

export async function getAgendaPlanningState(db: D1Database, runId: string): Promise<AgendaPlanningState> {
    try {
        const [planningResult, trackResult, slotResult, capacityResult] = await db.batch([
            db
                .prepare(
                    `SELECT talk_id, status, um_override, exp_override, topic_override, updated_at, updated_by_email
                     FROM agenda_talk_planning WHERE run_id = ?`,
                )
                .bind(runId),
            db
                .prepare(`SELECT track_id, name, position FROM agenda_track WHERE run_id = ? ORDER BY position`)
                .bind(runId),
            db
                .prepare(
                    `SELECT slot_id, track_id, length, talk_id, position, kind, label
                     FROM agenda_slot WHERE run_id = ? ORDER BY position`,
                )
                .bind(runId),
            db.prepare(`SELECT length, capacity FROM agenda_planner_capacity WHERE run_id = ?`).bind(runId),
        ])

        const planningByTalkId: Record<string, TalkPlanning> = {}
        for (const row of (planningResult.results ?? []) as unknown as TalkPlanningRow[]) {
            planningByTalkId[row.talk_id] = rowToTalkPlanning(row)
        }

        const slotsByTrackId = new Map<string, SlotRow[]>()
        for (const row of (slotResult.results ?? []) as unknown as SlotRow[]) {
            const slots = slotsByTrackId.get(row.track_id)
            if (slots) {
                slots.push(row)
            } else {
                slotsByTrackId.set(row.track_id, [row])
            }
        }

        const tracks = ((trackResult.results ?? []) as unknown as TrackRow[]).map((track) => ({
            trackId: track.track_id,
            name: track.name,
            slots: (slotsByTrackId.get(track.track_id) ?? []).map((slot) => ({
                slotId: slot.slot_id,
                length: slot.length,
                talkId: slot.talk_id,
                kind: slot.kind === 'break' ? ('break' as const) : ('talk' as const),
                label: slot.label,
            })),
        }))

        const capacity: Record<string, number> = {}
        for (const row of (capacityResult.results ?? []) as unknown as CapacityRow[]) {
            capacity[row.length] = row.capacity
        }

        return { planningByTalkId, board: { tracks, capacity } }
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

/**
 * True when nothing has been planned for this run yet — gates the import
 * button and the import action's overwrite guard. Split from the DB read so
 * the loader can reuse the state it already fetched instead of querying twice.
 */
export function isPlanningStateEmpty(state: AgendaPlanningState): boolean {
    return (
        Object.keys(state.planningByTalkId).length === 0 &&
        state.board.tracks.length === 0 &&
        Object.keys(state.board.capacity).length === 0
    )
}

export async function isAgendaPlanningEmpty(db: D1Database, runId: string): Promise<boolean> {
    return isPlanningStateEmpty(await getAgendaPlanningState(db, runId))
}

/**
 * Upsert one field of a talk's planning row. Only the named column is touched
 * so two organizers editing different fields of the same talk don't clobber
 * each other's work.
 */
export async function saveTalkPlanningField(
    db: D1Database,
    args: {
        runId: string
        talkId: string
        field: 'status' | 'um' | 'exp' | 'topic'
        /** A TalkStatus for `status`, a boolean for um/exp, free text for topic. */
        value: string | boolean | null
        email: string | null
    },
): Promise<void> {
    const { runId, talkId, field, value, email } = args
    const column = { status: 'status', um: 'um_override', exp: 'exp_override', topic: 'topic_override' }[field]
    const dbValue = typeof value === 'boolean' ? (value ? 1 : 0) : value

    try {
        await db
            .prepare(
                `INSERT INTO agenda_talk_planning (run_id, talk_id, ${column}, updated_at, updated_by_email)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(run_id, talk_id) DO UPDATE SET
                     ${column} = excluded.${column},
                     updated_at = excluded.updated_at,
                     updated_by_email = excluded.updated_by_email`,
            )
            .bind(runId, talkId, dbValue, new Date().toISOString(), email)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function addTrack(
    db: D1Database,
    args: { runId: string; trackId: string; name: string; email: string | null },
): Promise<void> {
    try {
        // Append after whatever is already there. Two racing adds can land on
        // the same position; ties just render in track_id order, which is
        // harmless for a board organizers reorder by hand anyway.
        await db
            .prepare(
                `INSERT INTO agenda_track (run_id, track_id, name, position, updated_at, updated_by_email)
                 VALUES (
                     ?, ?, ?,
                     (SELECT COALESCE(MAX(position), -1) + 1 FROM agenda_track WHERE run_id = ?),
                     ?, ?
                 )`,
            )
            .bind(args.runId, args.trackId, args.name, args.runId, new Date().toISOString(), args.email)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function renameTrack(
    db: D1Database,
    args: { runId: string; trackId: string; name: string; email: string | null },
): Promise<void> {
    try {
        await db
            .prepare(
                `UPDATE agenda_track SET name = ?, updated_at = ?, updated_by_email = ?
                 WHERE run_id = ? AND track_id = ?`,
            )
            .bind(args.name, new Date().toISOString(), args.email, args.runId, args.trackId)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function removeTrack(db: D1Database, args: { runId: string; trackId: string }): Promise<void> {
    try {
        // Slots cascade via the composite FK, but D1 doesn't enable
        // foreign_keys on every connection — delete them explicitly so a
        // removed track can never strand its slots (and with them, the
        // unique index entries that keep talks placeable elsewhere).
        await db.batch([
            db.prepare(`DELETE FROM agenda_slot WHERE run_id = ? AND track_id = ?`).bind(args.runId, args.trackId),
            db.prepare(`DELETE FROM agenda_track WHERE run_id = ? AND track_id = ?`).bind(args.runId, args.trackId),
        ])
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function addSlot(
    db: D1Database,
    args: {
        runId: string
        trackId: string
        slotId: string
        length: string
        email: string | null
        /** 'break' creates a labelled divider instead of a talk placeholder. */
        kind?: SlotKind
        label?: string | null
    },
): Promise<void> {
    try {
        await db
            .prepare(
                `INSERT INTO agenda_slot (run_id, slot_id, track_id, length, talk_id, position, updated_at, updated_by_email, kind, label)
                 VALUES (
                     ?, ?, ?, ?, NULL,
                     (SELECT COALESCE(MAX(position), -1) + 1 FROM agenda_slot WHERE run_id = ? AND track_id = ?),
                     ?, ?, ?, ?
                 )`,
            )
            .bind(
                args.runId,
                args.slotId,
                args.trackId,
                args.length,
                args.runId,
                args.trackId,
                new Date().toISOString(),
                args.email,
                args.kind ?? 'talk',
                args.label ?? null,
            )
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

/** Rename a break slot. No-op on talk slots, which take their label from the talk. */
export async function updateSlotLabel(
    db: D1Database,
    args: { runId: string; slotId: string; label: string; email: string | null },
): Promise<void> {
    try {
        await db
            .prepare(
                `UPDATE agenda_slot SET label = ?, updated_at = ?, updated_by_email = ?
                 WHERE run_id = ? AND slot_id = ? AND kind = 'break'`,
            )
            .bind(args.label, new Date().toISOString(), args.email, args.runId, args.slotId)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function updateSlotLength(
    db: D1Database,
    args: { runId: string; slotId: string; length: string; email: string | null },
): Promise<void> {
    try {
        await db
            .prepare(
                `UPDATE agenda_slot SET length = ?, updated_at = ?, updated_by_email = ?
                 WHERE run_id = ? AND slot_id = ?`,
            )
            .bind(args.length, new Date().toISOString(), args.email, args.runId, args.slotId)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function removeSlot(db: D1Database, args: { runId: string; slotId: string }): Promise<void> {
    try {
        await db
            .prepare(`DELETE FROM agenda_slot WHERE run_id = ? AND slot_id = ?`)
            .bind(args.runId, args.slotId)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

/**
 * Place a talk in a slot, vacating whatever slot held it before. Both
 * statements go in one batch (D1 batches are a transaction) so the unique
 * index on (run_id, talk_id) can never see the talk in two slots at once.
 */
export async function assignTalkToSlot(
    db: D1Database,
    args: { runId: string; slotId: string; talkId: string | null; email: string | null },
): Promise<void> {
    const now = new Date().toISOString()
    try {
        const statements = []
        if (args.talkId) {
            statements.push(
                db
                    .prepare(
                        `UPDATE agenda_slot SET talk_id = NULL, updated_at = ?, updated_by_email = ?
                         WHERE run_id = ? AND talk_id = ? AND slot_id != ?`,
                    )
                    .bind(now, args.email, args.runId, args.talkId, args.slotId),
            )
        }
        statements.push(
            db
                .prepare(
                    // kind guard: a break is a divider, never a home for a talk.
                    `UPDATE agenda_slot SET talk_id = ?, updated_at = ?, updated_by_email = ?
                     WHERE run_id = ? AND slot_id = ? AND kind = 'talk'`,
                )
                .bind(args.talkId, now, args.email, args.runId, args.slotId),
        )
        await db.batch(statements)
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function setCapacity(
    db: D1Database,
    args: { runId: string; length: string; capacity: number; email: string | null },
): Promise<void> {
    try {
        await db
            .prepare(
                `INSERT INTO agenda_planner_capacity (run_id, length, capacity, updated_at, updated_by_email)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(run_id, length) DO UPDATE SET
                     capacity = excluded.capacity,
                     updated_at = excluded.updated_at,
                     updated_by_email = excluded.updated_by_email`,
            )
            .bind(args.runId, args.length, args.capacity, new Date().toISOString(), args.email)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

/** Clear every track and slot for a run, keeping capacity targets. */
export async function clearBoard(db: D1Database, runId: string): Promise<void> {
    try {
        await db.batch([
            db.prepare(`DELETE FROM agenda_slot WHERE run_id = ?`).bind(runId),
            db.prepare(`DELETE FROM agenda_track WHERE run_id = ?`).bind(runId),
        ])
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

/**
 * One-shot migration of a browser's localStorage planning into the shared
 * tables. Replaces the board wholesale (it's a single coherent layout) and
 * upserts the per-talk rows.
 */
export async function importAgendaPlanning(
    db: D1Database,
    args: { runId: string; payload: AgendaPlanningImport; email: string | null },
): Promise<{ statuses: number; overrides: number; tracks: number; slots: number }> {
    const { runId, payload, email } = args
    const now = new Date().toISOString()
    const board: PlannerBoard = payload.board ?? EMPTY_PLANNER_BOARD

    // Merge the two localStorage maps into one row per talk so a talk with
    // both a status and overrides is written once.
    const merged = new Map<string, { status?: TalkStatus; um?: boolean; exp?: boolean; topic?: string }>()
    for (const [talkId, status] of Object.entries(payload.statusByTalkId ?? {})) {
        merged.set(talkId, { ...merged.get(talkId), status })
    }
    for (const [talkId, overrides] of Object.entries(payload.overridesByTalkId ?? {})) {
        merged.set(talkId, { ...merged.get(talkId), ...overrides })
    }

    // A talk may only sit in one slot, so drop duplicates rather than letting
    // the unique index reject the whole import.
    const seenTalkIds = new Set<string>()

    try {
        const statements = [
            db.prepare(`DELETE FROM agenda_slot WHERE run_id = ?`).bind(runId),
            db.prepare(`DELETE FROM agenda_track WHERE run_id = ?`).bind(runId),
        ]

        let slotCount = 0
        board.tracks.forEach((track, trackIndex) => {
            statements.push(
                db
                    .prepare(
                        `INSERT INTO agenda_track (run_id, track_id, name, position, updated_at, updated_by_email)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                    )
                    .bind(runId, track.trackId, track.name, trackIndex, now, email),
            )

            track.slots.forEach((slot, slotIndex) => {
                // A break never holds a talk, so drop any talkId a malformed
                // payload attached to one.
                let talkId = slot.kind === 'break' ? null : slot.talkId
                if (talkId) {
                    if (seenTalkIds.has(talkId)) {
                        talkId = null
                    } else {
                        seenTalkIds.add(talkId)
                    }
                }
                slotCount++
                statements.push(
                    db
                        .prepare(
                            `INSERT INTO agenda_slot (run_id, slot_id, track_id, length, talk_id, position, updated_at, updated_by_email, kind, label)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        )
                        .bind(
                            runId,
                            slot.slotId,
                            track.trackId,
                            slot.length,
                            talkId,
                            slotIndex,
                            now,
                            email,
                            slot.kind === 'break' ? 'break' : 'talk',
                            slot.kind === 'break' ? (slot.label ?? 'Break') : null,
                        ),
                )
            })
        })

        for (const [length, capacity] of Object.entries(board.capacity)) {
            statements.push(
                db
                    .prepare(
                        `INSERT INTO agenda_planner_capacity (run_id, length, capacity, updated_at, updated_by_email)
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(run_id, length) DO UPDATE SET
                             capacity = excluded.capacity,
                             updated_at = excluded.updated_at,
                             updated_by_email = excluded.updated_by_email`,
                    )
                    .bind(runId, length, capacity, now, email),
            )
        }

        for (const [talkId, planning] of merged) {
            statements.push(
                db
                    .prepare(
                        `INSERT INTO agenda_talk_planning
                             (run_id, talk_id, status, um_override, exp_override, topic_override, updated_at, updated_by_email)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(run_id, talk_id) DO UPDATE SET
                             status = excluded.status,
                             um_override = excluded.um_override,
                             exp_override = excluded.exp_override,
                             topic_override = excluded.topic_override,
                             updated_at = excluded.updated_at,
                             updated_by_email = excluded.updated_by_email`,
                    )
                    .bind(
                        runId,
                        talkId,
                        planning.status ?? null,
                        toDbBool(planning.um),
                        toDbBool(planning.exp),
                        planning.topic ?? null,
                        now,
                        email,
                    ),
            )
        }

        await db.batch(statements)

        return {
            statuses: Object.keys(payload.statusByTalkId ?? {}).length,
            overrides: Object.keys(payload.overridesByTalkId ?? {}).length,
            tracks: board.tracks.length,
            slots: slotCount,
        }
    } catch (error: any) {
        recordException(error)
        throw error
    }
}
