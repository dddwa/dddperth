import { conferenceManifest } from '@conference/manifest'
import { resolveSpeakerPortalSessionizeEndpoint } from '../../speakers/map-sessionize'
import { getConfSessions } from '../../sessionize.server'
import { computeSpeakerSyncPlan, type SyncSourceSession } from '../../speakers/sync-plan'
import type { AppConfig } from '../app-config'
import type { SpeakerSyncService } from '../speaker-sync-service'
import type { SpeakersStore } from '../speakers-store'

/**
 * If a sync run has been "running" longer than this it's considered crashed
 * (the worker died mid-run) and a new run may start over it.
 */
const STALE_RUN_SECONDS = 5 * 60

export function createSessionizeSpeakerSyncService(args: { config: AppConfig; speakers: SpeakersStore }): SpeakerSyncService {
    const { config, speakers } = args
    const portalConfig = conferenceManifest.speakerPortal

    return {
        isConfigured() {
            return Boolean(portalConfig && resolveSpeakerPortalSessionizeEndpoint(config))
        },

        async syncNow(trigger) {
            if (!portalConfig) {
                return { ok: false, reason: 'not-configured' }
            }
            const sessionizeEndpoint = resolveSpeakerPortalSessionizeEndpoint(config)
            if (!sessionizeEndpoint) {
                return { ok: false, reason: 'not-configured' }
            }

            const latest = await speakers.getLatestSyncRun()
            if (latest?.status === 'running' && latest.startedAt > Math.floor(Date.now() / 1000) - STALE_RUN_SECONDS) {
                return { ok: false, reason: 'already-running' }
            }

            const runId = await speakers.startSyncRun(trigger)
            try {
                const [allSessions, currentSpeakers, currentSpeakerSessions] = await Promise.all([
                    getConfSessions({ sessionizeEndpoint }),
                    speakers.getAllSpeakersForSync(),
                    speakers.getAllSpeakerSessions(),
                ])

                const accessStatuses = new Set(portalConfig.portalAccessStatuses)
                const sessions: SyncSourceSession[] = allSessions
                    .filter((s) => s.status && accessStatuses.has(s.status))
                    .map((s) => ({
                        sessionizeSessionId: s.id,
                        speakerIds: s.speakers.map((sp) => sp.id),
                    }))

                const plan = computeSpeakerSyncPlan({
                    year: portalConfig.year,
                    sessions,
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
