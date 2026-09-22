/**
 * Structured logger for the sponsor portal, mirroring `lib/auth/log.server.ts`:
 * one JSON line per event so Cloudflare's observability can filter on `event`
 * rather than on substrings of a prose message.
 *
 * **Why this exists.** A portal action answers a failed save with
 * `data({ fieldErrors }, { status: 400 })` — the right thing for the sponsor,
 * but it means nothing is thrown, so nothing reaches the worker's top-level
 * `console.error` and the request logs as an ordinary POST. A sponsor bouncing
 * off validation five times is indistinguishable, in the logs, from five clean
 * saves. Jira write-back failures had the same shape until they were made to
 * return 502; these events cover what is left.
 *
 * Sponsors are identified by Jira issue key, never by email: the key is what
 * the committee works in, and it keeps sponsor contact details out of logs that
 * are read for routine debugging. `logAuthEvent` already carries emails for the
 * login flow, where knowing *who* is the entire point — that trade does not
 * apply here.
 */
type SponsorPortalEvent =
    | { event: 'portal.save_rejected'; issueKey: string; form: 'profile' | 'logistics'; fields: string[] }
    | { event: 'portal.logo_rejected'; issueKey: string; reason: string; contentType?: string; size?: number }
    | { event: 'portal.writeback_failed'; issueKey: string; form: 'profile' | 'logistics'; error: string }

export function logSponsorPortalEvent(payload: SponsorPortalEvent): void {
    console.log(JSON.stringify({ scope: 'sponsor-portal', ...payload }))
}
