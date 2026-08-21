import { conferenceManifest } from '@conference/manifest'
import type { sessionSchema } from '@ddd/conference-config'
import type { z } from 'zod'
import { getYearConfig } from '../get-year-config.server'
import type { speakersSchema } from '../sessionize.server'
import type { AppConfig } from '../services/app-config'
import type { SpeakerLink } from '../services/speakers-store'

/**
 * Maps raw Sessionize payloads (`getConfSessions`/`getConfSpeakers`) to the
 * portal's display shape. Shared by the D1 store's read path (live content,
 * merged with D1 ids/extras) and, for the endpoint resolver only, the sync
 * service (which just needs to know which speaker ids are on
 * accepted/waitlisted sessions, not their content).
 */

type Session = z.infer<typeof sessionSchema>
type SessionizeSpeaker = z.infer<typeof speakersSchema>[number]

/** All category-item names under the category matching `categoryName`
 * (case-sensitive, matched on Sessionize's own category name). Empty array
 * if the category doesn't exist on this session — a category set up after
 * some sessions were submitted shouldn't break the mapping. */
export function categoryValues(session: Session, categoryName: string): string[] {
    const category = session.categories.find((c) => c.name === categoryName)
    return category ? category.categoryItems.map((item) => item.name) : []
}

/** Single-select convenience — first value, if any. */
export function categoryValue(session: Session, categoryName: string): string | undefined {
    return categoryValues(session, categoryName)[0]
}

export interface PortalCategoryNames {
    format: string
    level: string
    generalTopic: string
    talkTopics: string
}

export interface PortalSpeakerContent {
    fullName: string
    tagLine?: string
    bio?: string
    profilePictureUrl?: string
    links: SpeakerLink[]
}

export interface PortalSessionContent {
    sessionTitle: string
    description?: string
    format?: string
    level?: string
    generalTopic?: string
    talkTopics: string[]
    startsAt?: string
    endsAt?: string
    roomName?: string
    status: string
    isConfirmed: boolean
}

export function toPortalSpeaker(speaker: SessionizeSpeaker): PortalSpeakerContent {
    return {
        fullName: speaker.fullName,
        tagLine: speaker.tagLine,
        bio: speaker.bio ?? undefined,
        profilePictureUrl: speaker.profilePicture ?? undefined,
        links: speaker.links,
    }
}

export function toPortalSession(session: Session, categoryNames: PortalCategoryNames): PortalSessionContent {
    return {
        sessionTitle: session.title,
        description: session.description ?? undefined,
        format: categoryValue(session, categoryNames.format),
        level: categoryValue(session, categoryNames.level),
        generalTopic: categoryValue(session, categoryNames.generalTopic),
        talkTopics: categoryValues(session, categoryNames.talkTopics),
        startsAt: session.startsAt ?? undefined,
        endsAt: session.endsAt ?? undefined,
        roomName: session.room ?? undefined,
        status: session.status ?? 'Unknown',
        isConfirmed: session.isConfirmed,
    }
}

/** The Sessionize endpoint configured for the speaker portal's year, if any
 * — same resolution the sync service uses. */
export function resolveSpeakerPortalSessionizeEndpoint(config: AppConfig): string | undefined {
    const portalConfig = conferenceManifest.speakerPortal
    if (!portalConfig) return undefined

    const yearConfig = getYearConfig(portalConfig.year, config)
    if (yearConfig.kind !== 'conference' || yearConfig.sessions?.kind !== 'sessionize') return undefined
    return yearConfig.sessions.sessionizeEndpoint
}
