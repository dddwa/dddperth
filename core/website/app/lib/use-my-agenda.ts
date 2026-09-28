import { useCallback, useSyncExternalStore } from 'react'
import { type AgendaTalk, myAgendaStorageKey, parseStoredPicks, pickTalk, unpickTalk } from './my-agenda'

/**
 * A person's picked talks for one conference year, held in localStorage.
 *
 * localStorage is the source of truth for someone's own agenda. The shortlist
 * endpoint only feeds organisers' popularity counts, so it is called in the
 * background and its failures are ignored: a dropped request costs a count,
 * never a pick.
 */

const NO_PICKS: string[] = []
const listeners = new Set<() => void>()

// useSyncExternalStore compares snapshots by reference, so the parsed array is
// cached against the raw string it came from.
const cache = new Map<string, { raw: string | null; picks: string[] }>()

function readPicks(year: string): string[] {
    let raw: string | null
    try {
        raw = localStorage.getItem(myAgendaStorageKey(year))
    } catch {
        // Storage can be blocked outright (some private modes, disabled
        // site data); behave as if nothing is picked.
        return NO_PICKS
    }
    const cached = cache.get(year)
    if (cached && cached.raw === raw) return cached.picks
    const picks = parseStoredPicks(raw)
    cache.set(year, { raw, picks })
    return picks
}

function writePicks(year: string, picks: string[]) {
    try {
        localStorage.setItem(myAgendaStorageKey(year), JSON.stringify(picks))
    } catch {
        // Quota or blocked storage: the pick is lost on reload, but there is
        // nowhere better to put it.
    }
    for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    // Keeps two open tabs of the agenda in step.
    window.addEventListener('storage', listener)
    return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', listener)
    }
}

function reportShortlist(year: string, talkId: string, action: 'add' | 'remove') {
    void fetch('/api/agenda/shortlist', {
        method: 'POST',
        body: new URLSearchParams({ year, talkId, action }),
        // Survives the person navigating away straight after picking.
        keepalive: true,
    }).catch(() => {})
}

export interface ToggleOutcome {
    added: boolean
    displaced: string[]
}

const noopSubscribe = () => () => {}

/**
 * False during SSR and the hydration pass, true after. Picks are invisible to
 * the server, so a page that shows "you haven't picked anything" before this
 * flips would flash that at everyone who has.
 */
export function useHydrated() {
    return useSyncExternalStore(
        noopSubscribe,
        () => true,
        () => false,
    )
}

export function useMyAgenda(year: string, talksById: ReadonlyMap<string, AgendaTalk>) {
    const picked = useSyncExternalStore(
        subscribe,
        () => readPicks(year),
        // The server can't see localStorage; render nothing picked and let
        // hydration fill it in.
        () => NO_PICKS,
    )

    const toggle = useCallback(
        (talk: AgendaTalk): ToggleOutcome => {
            const current = readPicks(year)
            if (current.includes(talk.id)) {
                writePicks(year, unpickTalk(current, talk.id))
                reportShortlist(year, talk.id, 'remove')
                return { added: false, displaced: [] }
            }

            const result = pickTalk(current, talk, talksById)
            writePicks(year, result.picked)
            reportShortlist(year, talk.id, 'add')
            for (const id of result.displaced) reportShortlist(year, id, 'remove')
            return { added: true, displaced: result.displaced }
        },
        [year, talksById],
    )

    // Picks that are no longer on the agenda (a withdrawn talk) have nothing
    // to report to the counter — the endpoint would reject the id — so they
    // are only dropped locally.
    const forget = useCallback(
        (talkIds: readonly string[]) => {
            writePicks(
                year,
                readPicks(year).filter((id) => !talkIds.includes(id)),
            )
        },
        [year],
    )

    return { picked, toggle, forget }
}
