import type { MeetTheExpertsRegistrantType } from './meet-the-experts-store'

/**
 * Admin-created seat for Meet the Experts. Timeslots aren't a table here —
 * the grid's rows are the configured `meetTheExperts.slots` from the
 * conference manifest, the same list registrants already picked their
 * preferences from. Only the tables (columns) and the assignment of a
 * registrant to a (table, slot) cell are admin-managed state.
 */
export interface MeetTheExpertsTable {
    id: string
    label: string
    position: number
}

export interface MeetTheExpertsAssignment {
    tableId: string
    slotId: string
    registrantType: MeetTheExpertsRegistrantType
    registrantId: string
    assignedAt: number
    assignedBy: string
}

export interface MeetTheExpertsSchedulingState {
    tables: MeetTheExpertsTable[]
    assignments: MeetTheExpertsAssignment[]
}

export interface MeetTheExpertsSchedulingStore {
    getState(): Promise<MeetTheExpertsSchedulingState>

    /** Appends a table after whatever's already there. */
    addTable(label: string): Promise<MeetTheExpertsTable>
    renameTable(tableId: string, label: string): Promise<void>
    /** Cascades: any assignments seated at this table are removed with it. */
    removeTable(tableId: string): Promise<void>
    /** Swaps position with the nearest table in that direction. No-op at
     * either end of the table list. */
    moveTable(tableId: string, direction: 'up' | 'down'): Promise<void>

    /**
     * Seats a registrant at (tableId, slotId), bumping whoever was there
     * before. Throws if `slotId` isn't one of the registrant's registered
     * slots, or if they're already seated at a *different* table for
     * `slotId` — the server-side half of the hard preference block, since a
     * person can't be in two places during the same slot.
     */
    assign(
        tableId: string,
        slotId: string,
        registrant: { type: MeetTheExpertsRegistrantType; id: string },
        assignedBy: string,
    ): Promise<void>

    /** No-op if the cell is already empty. */
    unassign(tableId: string, slotId: string): Promise<void>
}
