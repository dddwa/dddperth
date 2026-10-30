/**
 * "Build my agenda": which talks a person has picked for a conference day.
 *
 * The rule is one talk at a time, and "at a time" means **overlapping
 * intervals**, not "same grid slot". A slot can hold one room running a single
 * 45-minute talk beside another room running two 20-minute talks with a
 * changeover between them. Keyed on slot, those three talks would share a
 * slot and only one could ever be picked — but the two short talks don't
 * overlap each other, so someone should be able to pick both. Keyed on
 * overlap, picking the long talk displaces both short ones, and picking a
 * short one displaces the long one and leaves its sibling alone.
 */

export interface AgendaTalk {
    id: string
    startsAt: string
    endsAt: string
}

export interface PickResult {
    picked: string[]
    /** Previously picked talks removed because they clash with the new pick. */
    displaced: string[]
}

/**
 * Half-open intervals: a talk ending at 11:05 does not clash with one starting
 * at 11:05, so back-to-back talks can both be picked.
 */
export function talksOverlap(a: AgendaTalk, b: AgendaTalk): boolean {
    return Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt)
}

export function pickTalk(
    picked: readonly string[],
    talk: AgendaTalk,
    talksById: ReadonlyMap<string, AgendaTalk>,
): PickResult {
    const displaced = picked.filter((id) => {
        if (id === talk.id) return false
        const other = talksById.get(id)
        return other !== undefined && talksOverlap(talk, other)
    })

    return {
        picked: [...picked.filter((id) => id !== talk.id && !displaced.includes(id)), talk.id],
        displaced,
    }
}

export function unpickTalk(picked: readonly string[], talkId: string): string[] {
    return picked.filter((id) => id !== talkId)
}

/**
 * Parse what localStorage holds. It is user-writable and survives deploys, so
 * anything that isn't an array of strings is treated as "nothing picked"
 * rather than trusted.
 */
export function parseStoredPicks(raw: string | null): string[] {
    if (!raw) return []
    try {
        const value: unknown = JSON.parse(raw)
        return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : []
    } catch {
        return []
    }
}

export const myAgendaStorageKey = (year: string) => `my-agenda:${year}`
