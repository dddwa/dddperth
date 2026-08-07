import type { SpeakerSyncRun } from './speakers-store'

export type SpeakerSyncOutcome =
    | { ok: true; run: SpeakerSyncRun }
    | { ok: false; reason: 'not-configured' | 'already-running' | 'error'; error?: string }

/**
 * Keeps portal speaker/contact data in step with Sessionize (accepted +
 * waitlisted sessions) and the conference's Jira speakers project, and
 * pushes a speaker's submitted extra info back to their Jira issue. Runs
 * from the hourly cron (production) and the admin "Sync now" button.
 */
export interface SpeakerSyncService {
    /** True when the manifest has speakerPortal AND Jira credentials exist
     * (or the stub is active). When false, sync/write-back are no-ops. */
    isConfigured(): boolean

    /** Pulls sessions/speakers from Sessionize and speaker issues from Jira,
     * reconciles D1. Never throws — failures land in the returned outcome
     * and the sync-run row. */
    syncNow(trigger: 'cron' | 'manual'): Promise<SpeakerSyncOutcome>

    /**
     * Pushes a speaker's submitted extra info onto their Jira issue (via
     * `speakers.jiraIssueKey`). Best-effort — never throws and never blocks
     * the portal save; a no-op if the speaker has no matched Jira issue or
     * write-back isn't enabled in this environment.
     */
    pushProfileWriteback(sessionizeId: string): Promise<void>
}
