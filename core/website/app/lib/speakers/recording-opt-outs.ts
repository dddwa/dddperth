import type { SpeakerListEntry } from '../services/speakers-store'

export interface RecordingOptOut {
    sessionizeSessionId: string
    title: string
    presenters: string[]
}

/**
 * Accepted sessions whose session details say "don't record this", with
 * their presenters — the list the AV team needs. Opt-out is session-level
 * (shared by co-presenters), so each session appears once. Inactive speakers
 * are left out, same as the rest of the admin speakers list.
 */
export function recordingOptOuts(speakers: SpeakerListEntry[]): RecordingOptOut[] {
    const bySession = new Map<string, RecordingOptOut>()
    for (const speaker of speakers.filter((s) => s.active)) {
        for (const session of speaker.sessions) {
            if (session.status !== 'Accepted' || !speaker.sessionOptedOutOfRecording[session.sessionizeSessionId]) continue
            const entry = bySession.get(session.sessionizeSessionId) ?? {
                sessionizeSessionId: session.sessionizeSessionId,
                title: session.sessionTitle,
                presenters: [],
            }
            entry.presenters.push(speaker.fullName)
            bySession.set(session.sessionizeSessionId, entry)
        }
    }
    return [...bySession.values()].sort((a, b) => a.title.localeCompare(b.title))
}
