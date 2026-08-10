import type { SpeakerSyncRun } from './speakers-store'

export type SpeakerSyncOutcome =
    | { ok: true; run: SpeakerSyncRun }
    | { ok: false; reason: 'not-configured' | 'already-running' | 'error'; error?: string }

/**
 * Keeps portal speaker/session data in step with Sessionize (accepted +
 * waitlisted sessions). Runs from the hourly cron (production) and the
 * admin "Sync now" button. Contact emails and profile answers are D1-native
 * — neither is touched by this sync.
 */
export interface SpeakerSyncService {
    /** True when the manifest has speakerPortal AND a Sessionize endpoint is
     * configured for its year. When false, sync is a no-op. */
    isConfigured(): boolean

    /** Pulls sessions/speakers from Sessionize and reconciles D1. Never
     * throws — failures land in the returned outcome and the sync-run row. */
    syncNow(trigger: 'cron' | 'manual'): Promise<SpeakerSyncOutcome>
}
