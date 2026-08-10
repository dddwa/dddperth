import { conferenceManifest } from '@conference/manifest'
import type { sessionSchema } from '@ddd/conference-config'
import type { z } from 'zod'
import { getYearConfig } from '../../get-year-config.server'
import { getConfSessions, getConfSpeakers } from '../../sessionize.server'
import { computeSpeakerSyncPlan, type SyncSourceSession } from '../../speakers/sync-plan'
import type { AppConfig } from '../app-config'
import type { SpeakerSyncService } from '../speaker-sync-service'
import type { SpeakersStore } from '../speakers-store'

/**
 * If a sync run has been "running" longer than this it's considered crashed
 * (the worker died mid-run) and a new run may start over it.
 */
const STALE_RUN_SECONDS = 5 * 60

type Session = z.infer<typeof sessionSchema>

/** All category-item names under the category matching `categoryName`
 * (case-sensitive, matched on Sessionize's own category name). Empty array
 * if the category doesn't exist on this session — a category set up after
 * some sessions were submitted shouldn't break the sync. */
function categoryValues(session: Session, categoryName: string): string[] {
    const category = session.categories.find((c) => c.name === categoryName)
    return category ? category.categoryItems.map((item) => item.name) : []
}

/** Single-select convenience — first value, if any. */
function categoryValue(session: Session, categoryName: string): string | undefined {
    return categoryValues(session, categoryName)[0]
}

export function createSessionizeSpeakerSyncService(args: { config: AppConfig; speakers: SpeakersStore }): SpeakerSyncService {
    const { config, speakers } = args
    const portalConfig = conferenceManifest.speakerPortal

    function sessionizeEndpointFor(year: string): string | undefined {
        const yearConfig = getYearConfig(year, config)
        if (yearConfig.kind !== 'conference' || yearConfig.sessions?.kind !== 'sessionize') return undefined
        return yearConfig.sessions.sessionizeEndpoint
    }

    return {
        isConfigured() {
            return Boolean(portalConfig && sessionizeEndpointFor(portalConfig.year))
        },

        async syncNow(trigger) {
            if (!portalConfig) {
                return { ok: false, reason: 'not-configured' }
            }
            const sessionizeEndpoint = sessionizeEndpointFor(portalConfig.year)
            if (!sessionizeEndpoint) {
                return { ok: false, reason: 'not-configured' }
            }

            const latest = await speakers.getLatestSyncRun()
            if (latest?.status === 'running' && latest.startedAt > Math.floor(Date.now() / 1000) - STALE_RUN_SECONDS) {
                return { ok: false, reason: 'already-running' }
            }

            const runId = await speakers.startSyncRun(trigger)
            try {
                const [allSessions, allSpeakers, currentSpeakers, currentSpeakerSessions] = await Promise.all([
                    getConfSessions({ sessionizeEndpoint }),
                    getConfSpeakers({ sessionizeEndpoint }),
                    speakers.getAllSpeakersForSync(),
                    speakers.getAllSpeakerSessions(),
                ])

                const { format, level, generalTopic, talkTopics } = portalConfig.sessionizeCategoryNames
                const accessStatuses = new Set(portalConfig.portalAccessStatuses)
                const sessions: SyncSourceSession[] = allSessions
                    .filter((s) => s.status && accessStatuses.has(s.status))
                    .map((s) => ({
                        sessionizeSessionId: s.id,
                        sessionTitle: s.title,
                        description: s.description ?? undefined,
                        format: categoryValue(s, format),
                        level: categoryValue(s, level),
                        generalTopic: categoryValue(s, generalTopic),
                        talkTopics: categoryValues(s, talkTopics),
                        startsAt: s.startsAt ?? undefined,
                        endsAt: s.endsAt ?? undefined,
                        roomName: s.room ?? undefined,
                        status: s.status ?? 'Unknown',
                        isConfirmed: s.isConfirmed,
                        speakerIds: s.speakers.map((sp) => sp.id),
                    }))

                const speakerInfo = allSpeakers.map((s) => ({
                    sessionizeId: s.id,
                    fullName: s.fullName,
                    tagLine: s.tagLine,
                    bio: s.bio ?? undefined,
                    profilePictureUrl: s.profilePicture ?? undefined,
                    links: s.links,
                }))

                const plan = computeSpeakerSyncPlan({
                    year: portalConfig.year,
                    sessions,
                    speakerInfo,
                    currentSpeakers,
                    currentSpeakerSessions,
                })
                const counts = await speakers.applySyncPlan(plan)

                await speakers.finishSyncRun(runId, { status: 'ok', ...counts })
                console.log(`Speaker sync (${trigger}): ${counts.speakersUpserted} upserted, ${counts.speakersDeactivated} deactivated`)

                const run = await speakers.getLatestSyncRun()
                return run ? { ok: true, run } : { ok: false, reason: 'error', error: 'Sync run vanished' }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                console.error(`Speaker sync (${trigger}) failed:`, message)
                await speakers.finishSyncRun(runId, { status: 'error', error: message }).catch(() => {})
                return { ok: false, reason: 'error', error: message }
            }
        },
    }
}
