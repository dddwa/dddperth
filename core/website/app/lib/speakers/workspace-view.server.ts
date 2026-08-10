import { formatDate } from '../sessionize.server'
import type { SpeakerProfile, SpeakerWorkspace } from '../services/speakers-store'

/**
 * Shapes a `SpeakerWorkspace` into exactly what the dashboard renders —
 * shared between the speaker's own `/speaker-portal` and the admin
 * read-only preview at `/admin/speakers/$sessionizeId`, so both show
 * identically formatted data.
 */

export interface SpeakerWorkspaceSessionView {
    sessionizeSessionId: string
    title: string
    description?: string
    format?: string
    level?: string
    generalTopic?: string
    talkTopics: string[]
    status: string
    roomName?: string
    slot: string | null
    presenters: Array<{
        sessionizeId: string
        fullName: string
        tagLine?: string
        bio?: string
        profilePictureUrl?: string
        twitterUrl?: string
        linkedInUrl?: string
        otherLinks: Array<{ title: string; url: string; linkType: string }>
    }>
}

export interface SpeakerWorkspaceViewData {
    sessionizeId: string
    sessions: SpeakerWorkspaceSessionView[]
}

export function toWorkspaceView(workspace: SpeakerWorkspace): SpeakerWorkspaceViewData {
    return {
        sessionizeId: workspace.speaker.sessionizeId,
        sessions: workspace.sessions.map(({ session, presenters }) => ({
            sessionizeSessionId: session.sessionizeSessionId,
            title: session.sessionTitle,
            description: session.description,
            format: session.format,
            level: session.level,
            generalTopic: session.generalTopic,
            talkTopics: session.talkTopics,
            status: session.status,
            roomName: session.roomName,
            slot:
                session.startsAt && session.endsAt
                    ? `${formatDate(session.startsAt, { weekday: 'long', month: 'short', day: 'numeric' })}, ` +
                      `${formatDate(session.startsAt, { hour: 'numeric', minute: '2-digit' })}–` +
                      `${formatDate(session.endsAt, { hour: 'numeric', minute: '2-digit' })}`
                    : null,
            presenters: presenters.map(({ speaker: p }) => ({
                sessionizeId: p.sessionizeId,
                fullName: p.fullName,
                tagLine: p.tagLine,
                bio: p.bio,
                profilePictureUrl: p.profilePictureUrl,
                twitterUrl: p.links.find((l) => l.linkType === 'Twitter')?.url,
                linkedInUrl: p.links.find((l) => l.linkType === 'LinkedIn')?.url,
                otherLinks: p.links.filter((l) => l.linkType !== 'Twitter' && l.linkType !== 'LinkedIn'),
            })),
        })),
    }
}

export interface SpeakerPresenterProfile {
    sessionizeId: string
    fullName: string
    /** Sessionize bio — prefills the read-only "use my Sessionize bio" field
     * in the session-details modal. */
    bio?: string
    profile: SpeakerProfile | null
}

/**
 * Every distinct presenter across a workspace's sessions, each with their
 * "extra info for organisers" profile — de-duped, since a co-presenter
 * appearing on more than one shared session should still only get one card.
 * Shared by the speaker's own dashboard and the admin preview.
 */
export function collectPresenters(workspace: SpeakerWorkspace): SpeakerPresenterProfile[] {
    const byId = new Map<string, { fullName: string; bio?: string; profile: SpeakerProfile | null }>()
    for (const { presenters } of workspace.sessions) {
        for (const { speaker: p, profile } of presenters) {
            if (!byId.has(p.sessionizeId)) {
                byId.set(p.sessionizeId, { fullName: p.fullName, bio: p.bio, profile })
            }
        }
    }
    return [...byId.entries()].map(([sessionizeId, { fullName, bio, profile }]) => ({
        sessionizeId,
        fullName,
        bio,
        profile,
    }))
}
