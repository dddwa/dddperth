import type { AgendaPlanningImport, AgendaPlanningState, SlotKind } from '../agenda-planning-types'

/**
 * Persistence boundary for shared agenda planning — the per-talk decisions
 * and the planner board for a validation run. Domain-shaped like the other
 * stores: implementations pick their own storage, the interface stays in the
 * language of agenda planning.
 */
export interface AgendaPlanningStore {
    getPlanningState(runId: string): Promise<AgendaPlanningState>
    /** True when nothing has been planned yet — gates the localStorage import. */
    isPlanningEmpty(runId: string): Promise<boolean>

    // ---------- Per-talk decisions ----------
    saveTalkPlanningField(args: {
        runId: string
        talkId: string
        field: 'status' | 'um' | 'exp' | 'topic'
        /** A TalkStatus for `status`, a boolean for um/exp, free text for topic. */
        value: string | boolean | null
        email: string | null
    }): Promise<void>

    // ---------- Planner board ----------
    addTrack(args: { runId: string; trackId: string; name: string; email: string | null }): Promise<void>
    renameTrack(args: { runId: string; trackId: string; name: string; email: string | null }): Promise<void>
    removeTrack(args: { runId: string; trackId: string }): Promise<void>
    addSlot(args: {
        runId: string
        trackId: string
        slotId: string
        length: string
        email: string | null
        /** 'break' creates a labelled divider (Morning Tea, Lunch). */
        kind?: SlotKind
        label?: string | null
    }): Promise<void>
    updateSlotLength(args: { runId: string; slotId: string; length: string; email: string | null }): Promise<void>
    /** Rename a break slot. */
    updateSlotLabel(args: { runId: string; slotId: string; label: string; email: string | null }): Promise<void>
    removeSlot(args: { runId: string; slotId: string }): Promise<void>
    /** Place a talk in a slot (or clear it), vacating whatever slot held it. */
    assignTalkToSlot(args: {
        runId: string
        slotId: string
        talkId: string | null
        email: string | null
    }): Promise<void>
    setCapacity(args: { runId: string; length: string; capacity: number; email: string | null }): Promise<void>
    clearBoard(runId: string): Promise<void>

    // ---------- localStorage migration ----------
    importPlanning(args: {
        runId: string
        payload: AgendaPlanningImport
        email: string | null
    }): Promise<{ statuses: number; overrides: number; tracks: number; slots: number }>
}
