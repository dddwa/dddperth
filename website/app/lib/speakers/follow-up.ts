import type { DateTime } from 'luxon'
import { speakerChecklist, type SpeakerSessionChecklistInput } from './checklist'
import type { ChecklistItemDefinition } from './checklist-items'
import type { SpeakerListEntry } from '../services/speakers-store'

export interface FollowUpTarget {
    sessionizeId: string
    fullName: string
    contacts: string[]
}

/**
 * Active speakers who haven't completed a given checklist item yet — the
 * audience for the admin speakers list's "follow up" email buttons. Reuses
 * `speakerChecklist` so this can never drift from what the speaker's own
 * dashboard considers done.
 */
export function speakersMissingChecklistItem(
    speakers: SpeakerListEntry[],
    itemKey: ChecklistItemDefinition['key'],
    now: DateTime,
): FollowUpTarget[] {
    return speakers
        .filter((speaker) => speaker.active)
        .filter((speaker) => {
            const sessions: SpeakerSessionChecklistInput[] = speaker.sessions.map((session) => ({
                status: session.status,
                isConfirmed: session.isConfirmed,
                sessionDetailsComplete: speaker.sessionDetailsComplete[session.sessionizeSessionId] ?? false,
                backupAccepted: speaker.sessionBackupAccepted[session.sessionizeSessionId] ?? false,
            }))
            const item = speakerChecklist(speaker.profile, sessions, speaker.meetTheExpertsResponded, now).find(
                (i) => i.key === itemKey,
            )
            return item ? !item.done : false
        })
        .map((speaker) => ({ sessionizeId: speaker.sessionizeId, fullName: speaker.fullName, contacts: speaker.contacts }))
}
