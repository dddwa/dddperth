import { conferenceManifest } from '@conference/manifest'
import type { JiraClient } from '../../sponsors/jira-client.server'
import { createJiraClient, textToAdf } from '../../sponsors/jira-client.server'
import { createStubJiraClient } from '../../sponsors/stub-jira-client.server'
import { computeSyncPlan } from '../../sponsors/sync-plan'
import { dueExpiryReminder } from '../../sponsors/token-expiry'
import type { AppConfig } from '../app-config'
import type { AssetStorage } from '../asset-storage'
import type { EmailService } from '../email-service'
import type { NotificationLog } from '../notification-log'
import type { SponsorSyncService } from '../sponsor-sync-service'
import type { SponsorsStore } from '../sponsors-store'

/**
 * If a sync run has been "running" longer than this it's considered crashed
 * (the worker died mid-run) and a new run may start over it.
 */
const STALE_RUN_SECONDS = 5 * 60

const TOKEN_URL = 'https://id.atlassian.com/manage-profile/security/api-tokens'

export function createJiraSponsorSyncService(args: {
    config: AppConfig
    sponsors: SponsorsStore
    assets: AssetStorage
    email: EmailService
    notifications: NotificationLog
}): SponsorSyncService {
    const { config, sponsors, assets, email, notifications } = args
    const portalConfig = conferenceManifest.sponsorPortal

    let client: JiraClient | null = null
    if (portalConfig) {
        if (config.jira.stub) {
            client = createStubJiraClient()
        } else if (config.jira.apiEmail && config.jira.apiToken) {
            client = createJiraClient({
                portalConfig,
                apiEmail: config.jira.apiEmail,
                apiToken: config.jira.apiToken,
                jqlOverride: config.jira.syncJqlOverride,
                apiBaseUrl: config.jira.apiBaseUrl,
            })
        }
    }

    // The stub always "writes back" (it just logs) so the full flow can be
    // walked locally; the real client is gated behind JIRA_WRITEBACK_ENABLED
    // so staging can never tick checkboxes on real issues.
    const writebackEnabled = config.jira.stub || config.jira.writebackEnabled

    /** Snapshot of what the sponsor submitted, for the completion comment. */
    function buildCompletionComment(
        profile: Awaited<ReturnType<SponsorsStore['getProfile']>>,
        logoAttached: boolean,
    ): string {
        const lines = ['Sponsor portal: profile complete — "Assets for Conference" has been ticked automatically.']

        if (profile) {
            lines.push('Submitted via the portal:')
            if (profile.blurb) {
                const blurb = profile.blurb.length > 300 ? `${profile.blurb.slice(0, 300)}…` : profile.blurb
                lines.push(`Blurb: "${blurb}"`)
            }
            if (profile.websiteUrl) lines.push(`Website: ${profile.websiteUrl}`)
            for (const [platform, url] of Object.entries(profile.socials)) {
                lines.push(`${platform[0].toUpperCase()}${platform.slice(1)}: ${url}`)
            }
            if (profile.logo) {
                lines.push(
                    `Logo: ${profile.logo.filename} (${(profile.logo.size / 1024).toFixed(0)} KB)` +
                        (logoAttached ? ' — attached to this issue' : ''),
                )
            }
        }

        lines.push('Import everything to the website with the sponsor tool (pnpm sponsor:add → Portal Import).')
        return lines.join('\n')
    }

    /**
     * Emails the committee when the Jira API token is approaching (or past)
     * its expiry date. Riding along with every sync keeps it on the hourly
     * cron with no extra trigger; the notification log makes each reminder
     * stage send exactly once. Never throws — a reminder problem must not
     * break the sync.
     */
    async function maybeSendTokenExpiryReminder(): Promise<void> {
        const expiresAt = config.jira.tokenExpiresAt
        if (!expiresAt) return

        try {
            const reminder = dueExpiryReminder(expiresAt, Date.now())
            if (!reminder || (await notifications.wasSent(reminder.key))) return

            const expiresOn = new Date(expiresAt).toISOString().slice(0, 10)
            const headline = reminder.expired
                ? `The sponsor portal's Jira API token EXPIRED on ${expiresOn} — sync is broken until it's replaced.`
                : `The sponsor portal's Jira API token expires on ${expiresOn} (${reminder.daysLeft} day${reminder.daysLeft === 1 ? '' : 's'} left).`
            const fix = `Create a new token at ${TOKEN_URL} and run: pnpm jira:auth --secrets production (and staging).`

            await email.send({
                to: conferenceManifest.brand.contactEmail,
                subject: reminder.expired
                    ? 'Sponsor portal: Jira API token has EXPIRED'
                    : `Sponsor portal: Jira API token expires in ${reminder.daysLeft} day${reminder.daysLeft === 1 ? '' : 's'}`,
                text: `${headline}\n\n${fix}`,
                html: `<p>${headline}</p><p>Create a new token at <a href="${TOKEN_URL}">${TOKEN_URL}</a> and run <code>pnpm jira:auth --secrets production</code> (and staging).</p>`,
            })
            await notifications.markSent(reminder.key)
            console.log(`Sponsor portal: sent Jira token expiry reminder (${reminder.key})`)
        } catch (error) {
            console.error('Jira token expiry reminder failed:', error instanceof Error ? error.message : error)
        }
    }

    return {
        isConfigured() {
            return client !== null
        },

        async syncNow(trigger) {
            if (!portalConfig || !client) {
                return { ok: false, reason: 'not-configured' }
            }

            // Rides along with cron and manual syncs alike; internally
            // deduped, and a failure here can't affect the sync itself.
            await maybeSendTokenExpiryReminder()

            const latest = await sponsors.getLatestSyncRun()
            if (latest?.status === 'running' && latest.startedAt > Math.floor(Date.now() / 1000) - STALE_RUN_SECONDS) {
                return { ok: false, reason: 'already-running' }
            }

            const runId = await sponsors.startSyncRun(trigger)
            try {
                const [source, currentSponsors, currentContacts] = await Promise.all([
                    client.searchSponsorIssues(),
                    sponsors.getAllSponsorsForSync(),
                    sponsors.getAllContacts(),
                ])

                const plan = computeSyncPlan({ year: portalConfig.year, source, currentSponsors, currentContacts })
                const counts = await sponsors.applySyncPlan(plan)

                await sponsors.finishSyncRun(runId, { status: 'ok', ...counts })
                console.log(
                    `Sponsor sync (${trigger}): ${counts.sponsorsUpserted} upserted, ${counts.sponsorsDeactivated} deactivated, ` +
                        `${counts.contactsAdded} contacts added, ${counts.contactsRemoved} removed`,
                )

                const run = await sponsors.getLatestSyncRun()
                return run ? { ok: true, run } : { ok: false, reason: 'error', error: 'Sync run vanished' }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                console.error(`Sponsor sync (${trigger}) failed:`, message)
                await sponsors.finishSyncRun(runId, { status: 'error', error: message }).catch(() => {})
                return { ok: false, reason: 'error', error: message }
            }
        },

        async flipAssetsTask(issueKey) {
            if (!portalConfig || !client || !writebackEnabled) return

            try {
                const optionIds = await client.getSponsorTaskOptionIds(issueKey)
                const alreadyTicked = optionIds.includes(portalConfig.jira.assetsTaskOptionId)
                if (!alreadyTicked) {
                    await client.setSponsorTaskOptionIds(issueKey, [
                        ...optionIds,
                        portalConfig.jira.assetsTaskOptionId,
                    ])
                }
                await sponsors.markAssetsTaskFlipped(issueKey)
                console.log(`Sponsor write-back: ticked "Assets for Conference" on ${issueKey}`)

                // Field edits are near-invisible in the Jira UI, so also
                // attach the logo and announce completion in the activity
                // feed (notifies watchers), including what was submitted —
                // the committee lives in Jira and shouldn't need the portal
                // to see it. Everything here is append-only snapshots: the
                // portal remains the source of truth. Best-effort — the flip
                // above already succeeded and must stay recorded even if
                // these fail; skipped entirely when the box was already
                // ticked so retries can't spam.
                if (!alreadyTicked) {
                    const profile = await sponsors.getProfile(issueKey).catch(() => null)

                    let logoAttached = false
                    if (profile?.logo) {
                        try {
                            const asset = await assets.get(profile.logo.r2Key)
                            if (asset) {
                                const content = await new Response(asset.body).arrayBuffer()
                                await client.addAttachment(issueKey, profile.logo.filename, content, asset.contentType)
                                logoAttached = true
                            }
                        } catch (attachError) {
                            console.error(
                                `Sponsor write-back: logo attachment on ${issueKey} failed (checkbox still ticked):`,
                                attachError instanceof Error ? attachError.message : attachError,
                            )
                        }
                    }

                    try {
                        await client.addComment(issueKey, buildCompletionComment(profile, logoAttached))
                    } catch (commentError) {
                        console.error(
                            `Sponsor write-back: comment on ${issueKey} failed (checkbox still ticked):`,
                            commentError instanceof Error ? commentError.message : commentError,
                        )
                    }
                }
            } catch (error) {
                // Leave/mark it pending — the next cron or manual sync retries.
                console.error(
                    `Sponsor write-back failed for ${issueKey}:`,
                    error instanceof Error ? error.message : error,
                )
                await sponsors.markAssetsTaskPending(issueKey).catch(() => {})
            }
        },

        async retryPendingWritebacks() {
            if (!portalConfig || !client || !writebackEnabled) return

            const pending = await sponsors.getPendingWritebacks()
            for (const issueKey of pending) {
                await this.flipAssetsTask(issueKey)
            }
        },

        async pushSponsorOwnedData(issueKey, change) {
            if (!portalConfig || !client || !writebackEnabled) return

            const profile = await sponsors.getProfile(issueKey).catch(() => null)
            if (!profile) return
            const jiraFields = portalConfig.jira.fields

            // Sponsor-owned fields: the portal's value wins, every save.
            // (Committee-owned fields — tier, contacts, company name — are
            // never written from here.) A PUT with unchanged values creates
            // no Jira history entry, so redundant saves stay quiet.
            try {
                const payload: Record<string, unknown> = {}
                if (profile.websiteUrl) payload[jiraFields.website] = profile.websiteUrl
                if (jiraFields.quote && profile.blurb) payload[jiraFields.quote] = textToAdf(profile.blurb)
                if (jiraFields.socialLinks && Object.keys(profile.socials).length > 0) {
                    const lines = Object.entries(profile.socials)
                        .map(([platform, url]) => `${platform[0].toUpperCase()}${platform.slice(1)}: ${url}`)
                        .join('\n')
                    payload[jiraFields.socialLinks] = textToAdf(lines)
                }
                if (Object.keys(payload).length > 0) {
                    await client.updateIssueFields(issueKey, payload)
                }
            } catch (error) {
                console.error(
                    `Sponsor push: field update on ${issueKey} failed:`,
                    error instanceof Error ? error.message : error,
                )
            }

            // A logo replaced after completion won't go through the
            // completion write-back again — attach the new file with a note
            // so the committee sees the change in the activity feed.
            if (change === 'logo' && profile.logo) {
                const sponsor = await sponsors.getSponsor(issueKey).catch(() => null)
                if (!sponsor?.assetsTaskFlippedAt) return // completion write-back will attach it

                try {
                    const asset = await assets.get(profile.logo.r2Key)
                    if (asset) {
                        const content = await new Response(asset.body).arrayBuffer()
                        await client.addAttachment(issueKey, profile.logo.filename, content, asset.contentType)
                        await client.addComment(
                            issueKey,
                            `Sponsor portal: the sponsor updated their logo — ${profile.logo.filename} ` +
                                `(${(profile.logo.size / 1024).toFixed(0)} KB) attached.`,
                        )
                    }
                } catch (error) {
                    console.error(
                        `Sponsor push: logo re-attach on ${issueKey} failed:`,
                        error instanceof Error ? error.message : error,
                    )
                }
            }
        },
    }
}
