import type { SpeakerListEntry } from '~/lib/services/speakers-store'

export interface SessionExportSpeaker {
    sessionizeId: string
    fullName: string
    tagLine?: string
    bio?: string
}

export interface SessionExportEntry {
    sessionizeSessionId: string
    title: string
    description?: string
    status: 'Accepted' | 'Backup'
    speakers: SessionExportSpeaker[]
}

export interface PhotoSpeaker {
    sessionizeId: string
    fullName: string
    profilePictureUrl: string
}

/** Accepted + backup sessions with speaker bios, grouped by session so
 * co-presenters share one entry — same grouping as the admin speakers
 * table, but flattened to bio fields for the JSON/photo export. */
export function buildSessionExport(speakers: SpeakerListEntry[]): SessionExportEntry[] {
    const sessionsById = new Map<string, SessionExportEntry>()

    for (const speaker of speakers.filter((s) => s.active)) {
        for (const session of speaker.sessions) {
            let entry = sessionsById.get(session.sessionizeSessionId)
            if (!entry) {
                entry = {
                    sessionizeSessionId: session.sessionizeSessionId,
                    title: session.sessionTitle,
                    description: session.description,
                    status: session.status === 'Accepted' ? 'Accepted' : 'Backup',
                    speakers: [],
                }
                sessionsById.set(session.sessionizeSessionId, entry)
            }
            entry.speakers.push({
                sessionizeId: speaker.sessionizeId,
                fullName: speaker.fullName,
                tagLine: speaker.tagLine,
                bio: speaker.bio,
            })
        }
    }

    return [...sessionsById.values()].sort((a, b) => a.title.localeCompare(b.title))
}

/** Distinct speakers (with a photo) appearing in the given sessions — the
 * set of images the export ZIP needs to fetch. */
export function collectPhotoSpeakers(sessions: SessionExportEntry[], speakers: SpeakerListEntry[]): PhotoSpeaker[] {
    const includedIds = new Set(sessions.flatMap((s) => s.speakers.map((sp) => sp.sessionizeId)))
    const seen = new Set<string>()
    const result: PhotoSpeaker[] = []

    for (const speaker of speakers) {
        if (!includedIds.has(speaker.sessionizeId) || seen.has(speaker.sessionizeId) || !speaker.profilePictureUrl) {
            continue
        }
        seen.add(speaker.sessionizeId)
        result.push({
            sessionizeId: speaker.sessionizeId,
            fullName: speaker.fullName,
            profilePictureUrl: speaker.profilePictureUrl,
        })
    }

    return result
}

export function slugifyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}
