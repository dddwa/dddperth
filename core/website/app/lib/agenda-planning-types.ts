/**
 * Shared agenda planning state for a validation run.
 *
 * These decisions used to live in each reviewer's localStorage, which meant
 * two organizers planning the same run couldn't see each other's work. They
 * are now persisted per run so the whole team shares one board.
 */

/** Empty string is "explicitly cleared", distinct from never having been set. */
export type TalkStatus = 'locked' | 'tentative' | 'declined' | 'waitlist' | ''

/**
 * A reviewer's decisions for one talk. Every field is optional: an absent
 * value means "no override", so the UI falls back to what Sessionize and the
 * underrepresented-groups config imply.
 */
export interface TalkPlanning {
    talkId: string
    status?: TalkStatus
    um?: boolean
    exp?: boolean
    topic?: string
    updatedAt?: string
    updatedByEmail?: string | null
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

export interface PlannerBoard {
    tracks: PlannerTrack[]
    /** Capacity targets, keyed by slot length (e.g. "45 minutes" -> 12). */
    capacity: Record<string, number>
}

/** Everything the agenda page needs to render shared state for a run. */
export interface AgendaPlanningState {
    planningByTalkId: Record<string, TalkPlanning>
    board: PlannerBoard
}

/**
 * A localStorage payload being imported into the shared DB. Mirrors the three
 * keys the page used to write (`voting-agenda-status:`, `-overrides:`,
 * `-planner:`) so an existing browser's work isn't lost.
 */
export interface AgendaPlanningImport {
    statusByTalkId?: Record<string, TalkStatus>
    overridesByTalkId?: Record<string, { um?: boolean; exp?: boolean; topic?: string }>
    board?: PlannerBoard
}

export const EMPTY_PLANNER_BOARD: PlannerBoard = { tracks: [], capacity: {} }
