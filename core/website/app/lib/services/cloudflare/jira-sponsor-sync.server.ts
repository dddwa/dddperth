import { conferenceManifest } from '@conference/manifest'
import type { JiraClient } from '../../sponsors/jira-client.server'
import { createJiraClient, textToAdf } from '../../sponsors/jira-client.server'
import { createStubJiraClient } from '../../sponsors/stub-jira-client.server'
import { logisticsVisibility } from '../../sponsors/logistics'
import { statusFlipReadiness } from '../../sponsors/progress'
import { computeSyncPlan, planStatusWrite } from '../../sponsors/sync-plan'
import { dueExpiryReminder } from '../../sponsors/token-expiry'
import type { AppConfig } from '../app-config'
import type { AssetStorage } from '../asset-storage'
import type { EmailService } from '../email-service'
import type { NotificationLog } from '../notification-log'
import type { SponsorSyncService } from '../sponsor-sync-service'
import type { SponsorProfile, SponsorsStore } from '../sponsors-store'

/**
 * If a sync run has been "running" longer than this it's considered crashed
 * (the worker died mid-run) and a new run may start over it.
 */
const STALE_RUN_SECONDS = 5 * 60

const TOKEN_URL = 'https://id.atlassian.com/manage-profile/security/api-tokens'

interface SponsorOwnedJiraFields {
    website: string
    quote?: string
    socials?: Record<string, string>
}

/** Builds a complete replacement for the sponsor-owned profile fields.
 * Details are only eligible after the required blurb and website form has
 * been submitted; once they are, every configured social field is included
 * so deleting an optional URL clears the corresponding Jira value. */
export function buildSponsorDetailsPayload(
    profile: Pick<SponsorProfile, 'blurb' | 'websiteUrl' | 'socials'>,
    fields: SponsorOwnedJiraFields,
): Record<string, unknown> {
    if (!profile.blurb || !profile.websiteUrl) return {}

    const payload: Record<string, unknown> = { [fields.website]: profile.websiteUrl }
    if (fields.quote) payload[fields.quote] = textToAdf(profile.blurb)
    for (const [platform, fieldId] of Object.entries(fields.socials ?? {})) {
        payload[fieldId] = profile.socials[platform] || null
    }
    return payload
}

export function createJiraSponsorSyncService(args: {
    config: AppConfig
    sponsors: SponsorsStore
    assets: AssetStorage
    email: EmailService
    notifications: NotificationLog
    /** Test seam for exercising orchestration without real Jira I/O. */
    jiraClient?: JiraClient
}): SponsorSyncService {
    const { config, sponsors, assets, email, notifications } = args
    const portalConfig = conferenceManifest.sponsorPortal

    let client: JiraClient | null = args.jiraClient ?? null
    if (portalConfig && !client) {
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
    // so staging can never write to real issues.
    const writebackEnabled = config.jira.stub || config.jira.writebackEnabled

    /**
     * Stamps the current year onto issues that synced without a year label.
     * The JQL picks those up deliberately (a sponsor added mid-year is never
     * silently missed); labelling them here means every issue is labelled by
     * the time the year is archived, so archiving stays a bulk label edit.
     *
     * Best-effort per issue and never throws: the sponsor data is already
     * synced by this point, and a label that fails to stamp is picked up
     * again by the next run — the JQL keeps matching it until it sticks.
     */
    async function stampMissingYearLabels(source: Awaited<ReturnType<JiraClient['searchSponsorIssues']>>) {
        if (!portalConfig?.jira.writeYearLabel || !client || !writebackEnabled) return

        const unlabelled = source.filter((s) => s.hasYearLabel === false)
        for (const sponsor of unlabelled) {
            try {
                await client.addLabel(sponsor.issueKey, portalConfig.year)
                console.log(`Sponsor sync: stamped year label ${portalConfig.year} on ${sponsor.issueKey}`)
            } catch (error) {
                console.error(
                    `Sponsor sync: could not stamp year label on ${sponsor.issueKey}:`,
                    error instanceof Error ? error.message : error,
                )
            }
        }
    }

    /** Snapshot of what the sponsor submitted, for the completion comment. */
    function buildCompletionComment(
        profile: Awaited<ReturnType<SponsorsStore['getProfile']>>,
        logoAttached: boolean,
    ): string {
        const lines = ['Sponsor portal: profile complete — "Asset Creation Status" has been updated automatically.']

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

                // After the plan is applied — the sponsor data landing in D1
                // matters more than the label, and this must not fail the run.
                await stampMissingYearLabels(source)

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
                const completeOptionId = portalConfig.jira.assetsCompleteOptionId
                const assetsField = portalConfig.jira.fields.assetsStatus
                const currentOptionId = await client.getStatusOptionId(issueKey, assetsField)
                const action = planStatusWrite({
                    current: currentOptionId,
                    targetOptionId: completeOptionId,
                    pendingOptionIds: portalConfig.jira.assetsPendingOptionIds,
                })

                if (action === 'set') {
                    await client.setStatusOptionId(issueKey, assetsField, completeOptionId)
                } else if (action === 'committee-advanced') {
                    console.log(
                        `Sponsor write-back: assets status on ${issueKey} already advanced by the committee ` +
                            `(option ${currentOptionId}) — leaving it alone`,
                    )
                }
                // Attach + comment only alongside a status we actually moved.
                // 'already-set' means a previous run did it; 'committee-advanced'
                // means they're past this point and already have the assets.
                // Re-announcing in either case just spams the activity feed.
                const alreadyTicked = action !== 'set'
                await sponsors.markAssetsTaskFlipped(issueKey)
                console.log(`Sponsor write-back: moved assets status on ${issueKey}`)

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
                                `Sponsor write-back: logo attachment on ${issueKey} failed (status still updated):`,
                                attachError instanceof Error ? attachError.message : attachError,
                            )
                        }
                    }

                    try {
                        await client.addComment(issueKey, buildCompletionComment(profile, logoAttached))
                    } catch (commentError) {
                        console.error(
                            `Sponsor write-back: comment on ${issueKey} failed (status still updated):`,
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

        async flipWorkstreamStatuses(issueKey) {
            if (!portalConfig || !client || !writebackEnabled) return

            const flips = portalConfig.jira.statusFlips
            const fields = portalConfig.jira.fields
            if (!flips) return

            try {
                const sponsor = await sponsors.getSponsor(issueKey)
                const profile = await sponsors.getProfile(issueKey)
                const visibility = logisticsVisibility(portalConfig.jira.tierMap[sponsor?.tier ?? ''])
                const readiness = statusFlipReadiness({ profile, visibility })

                // Each entry: the Jira field, the option to write, and the
                // values the portal is allowed to overwrite. `undefined`
                // target = not ready yet, so nothing is written.
                const writes: Array<{
                    name: string
                    fieldId: string | undefined
                    targetOptionId: string | undefined
                    pendingOptionIds: string[]
                    portalOwnedOptionIds?: string[]
                }> = [
                    {
                        name: 'social',
                        fieldId: fields.socialStatus,
                        targetOptionId: readiness.social ? flips.social?.targetOptionId : undefined,
                        pendingOptionIds: flips.social?.pendingOptionIds ?? [],
                    },
                    {
                        name: 'exhibition',
                        fieldId: fields.exhibitionStatus,
                        targetOptionId: readiness.exhibition ? flips.exhibition?.targetOptionId : undefined,
                        pendingOptionIds: flips.exhibition?.pendingOptionIds ?? [],
                    },
                    {
                        name: 'raffle',
                        fieldId: fields.raffleStatus,
                        targetOptionId: readiness.raffle ? flips.raffle?.targetOptionId : undefined,
                        pendingOptionIds: flips.raffle?.pendingOptionIds ?? [],
                    },
                    {
                        name: 'induction',
                        fieldId: fields.inductionStatus,
                        targetOptionId:
                            readiness.induction === 'required'
                                ? flips.induction?.requiredOptionId
                                : readiness.induction === 'not-required'
                                  ? flips.induction?.notRequiredOptionId
                                  : undefined,
                        pendingOptionIds: flips.induction?.pendingOptionIds ?? [],
                        portalOwnedOptionIds: [
                            flips.induction?.requiredOptionId,
                            flips.induction?.notRequiredOptionId,
                        ].filter((optionId): optionId is string => Boolean(optionId)),
                    },
                ]

                for (const write of writes) {
                    if (!write.fieldId || !write.targetOptionId) continue

                    // Each flip is independent: one failing field (or one the
                    // committee has advanced) must not stop the others.
                    try {
                        const current = await client.getStatusOptionId(issueKey, write.fieldId)
                        const action = planStatusWrite({
                            current,
                            targetOptionId: write.targetOptionId,
                            pendingOptionIds: write.pendingOptionIds,
                            portalOwnedOptionIds: write.portalOwnedOptionIds,
                        })

                        if (action === 'set') {
                            await client.setStatusOptionId(issueKey, write.fieldId, write.targetOptionId)
                            console.log(`Sponsor write-back: moved ${write.name} status on ${issueKey}`)
                        } else if (action === 'committee-advanced') {
                            console.log(
                                `Sponsor write-back: ${write.name} status on ${issueKey} already advanced by the ` +
                                    `committee (option ${current}) — leaving it alone`,
                            )
                        }
                    } catch (error) {
                        console.error(
                            `Sponsor write-back: ${write.name} status on ${issueKey} failed:`,
                            error instanceof Error ? error.message : error,
                        )
                    }
                }
            } catch (error) {
                console.error(
                    `Sponsor write-back: workstream statuses on ${issueKey} failed:`,
                    error instanceof Error ? error.message : error,
                )
            }
        },

        async getIssueLogistics(issueKey) {
            if (!portalConfig || !client) return {}
            try {
                return await client.getIssueLogistics(issueKey)
            } catch (error) {
                // Seeding is a convenience: the form still renders with
                // whatever the portal holds, so a Jira outage must not stop a
                // sponsor filling it in.
                console.error(
                    `Sponsor logistics lookup for ${issueKey} failed:`,
                    error instanceof Error ? error.message : error,
                )
                return {}
            }
        },

        async getSponsorDeliverables(issueKey) {
            if (!portalConfig || !client) return {}
            try {
                return await client.getSponsorDeliverables(issueKey)
            } catch (error) {
                // Informational only — the dashboard hides these sections
                // rather than failing to load because Jira is down.
                console.error(
                    `Sponsor deliverables lookup for ${issueKey} failed:`,
                    error instanceof Error ? error.message : error,
                )
                return {}
            }
        },

        async getExhibitorLogistics() {
            // Deliberately not caught: the caller is building a document for
            // the venue, and a blank spreadsheet is worse than an error page.
            if (!portalConfig || !client) {
                throw new Error('Sponsor portal Jira client is not configured')
            }
            return client.getExhibitorLogistics()
        },

        async pushLogistics(issueKey, logistics) {
            if (!portalConfig || !client || !writebackEnabled) return
            try {
                await client.pushLogistics(issueKey, logistics)
            } catch (error) {
                console.error(
                    `Sponsor push: logistics update on ${issueKey} failed:`,
                    error instanceof Error ? error.message : error,
                )
            }
        },

        async retryPendingWritebacks() {
            if (!portalConfig || !client || !writebackEnabled) return

            const pendingAssets = new Set(await sponsors.getPendingWritebacks())
            const activeSponsors = (await sponsors.listSponsors(portalConfig.year)).filter((sponsor) => sponsor.active)

            // Reconcile all sponsor-owned state, not just writes for which we
            // happened to persist a pending flag. Jira updates are idempotent,
            // and this makes a transient failure after the sponsor's final
            // save self-heal on the next hourly/manual sync.
            for (const sponsor of activeSponsors) {
                if (pendingAssets.has(sponsor.issueKey)) {
                    await this.flipAssetsTask(sponsor.issueKey)
                }

                const profile = sponsor.profile
                if (!profile) continue
                if (profile.blurb && profile.websiteUrl) {
                    await this.pushSponsorOwnedData(sponsor.issueKey, 'details')
                }
                if (profile.logisticsUpdatedAt !== undefined) {
                    await this.pushLogistics(sponsor.issueKey, profile.logistics ?? {})
                }
                await this.flipWorkstreamStatuses(sponsor.issueKey)
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
                const payload = buildSponsorDetailsPayload(profile, jiraFields)
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
