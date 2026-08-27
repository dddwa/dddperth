import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useEffect, useState } from 'react'
import { data, Form, useActionData, useFetcher, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { SpeakerModal } from '~/components/speaker-modal'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { formatRelativeTime } from '~/lib/format-relative-time'
import { recordException } from '~/lib/record-exception'
import { dueDateRemainingLabel, urgencyFor, type ChecklistUrgency } from '~/lib/speakers/checklist'
import { SPEAKER_CHECKLIST_ITEMS, type ChecklistItemDefinition } from '~/lib/speakers/checklist-items'
import { computeContactImportPlan, parseSpeakerContactsCsv, parseSpeakerContactsExcel } from '~/lib/speakers/contact-import'
import { speakersMissingChecklistItem } from '~/lib/speakers/follow-up'
import { FOLLOW_UP_EMAIL_TEMPLATES } from '~/lib/speakers/follow-up-emails'
import { buildRsvpHeadcount, type RsvpHeadcount } from '~/lib/speakers/rsvp-summary'
import { getConfig, getDateTimeProvider, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.speakers._index'

interface SessionTableRow {
    sessionizeSessionId: string
    title: string
    hasSlot: boolean
    isConfirmed: boolean
    /** Self-reported "I accept being a backup speaker" — session-level
     * (shared by every presenter, so only one of them needs to accept), only
     * relevant for a waitlisted session but populated regardless of status. */
    backupAccepted: boolean
    presenters: Array<{
        sessionizeId: string
        fullName: string
        hasProfile: boolean
        /** Session-level `isConfirmed` from the Sessionize sync, OR the
         * speaker's own self-report — same definition the checklist uses. */
        confirmed: boolean
        trainingResponded: boolean
        trainingSessionCount: number
        /** undefined = hasn't RSVP'd at all yet. 'No' is still a real answer,
         * distinct from not having responded. */
        dinnerResponse: string | undefined
        /** "Today" / "3 days ago" / etc — the most recent login across all of
         * this speaker's contact emails. Null if they've never logged in. */
        lastLoginLabel: string | null
    }>
}

/** Most recent login across every contact email a speaker has — a speaker
 * may have more than one contact, any of whom logging in counts. */
function latestLoginFor(contacts: string[], lastLoginTimes: Record<string, number>): number | undefined {
    const times = contacts
        .map((email) => lastLoginTimes[email.toLowerCase()])
        .filter((t): t is number => t !== undefined)
    return times.length > 0 ? Math.max(...times) : undefined
}

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.speakerPortal
    if (!portalConfig) {
        return data({
            configured: false as const,
            year: null,
            acceptedSessions: [],
            waitlistedSessions: [],
            lastRun: null,
            syncAvailable: false,
            rsvpHeadcount: null,
            followUps: [],
            speakerEmailAddress: undefined,
        })
    }

    const [speakers, lastRun, lastLoginTimes] = await Promise.all([
        services.speakers.listSpeakers(portalConfig.year),
        services.speakers.getLatestSyncRun(),
        services.auth.getLastLoginTimes(),
    ])

    const now = getDateTimeProvider(context).nowDate()

    // Statuses that sync in are now the real Accepted/Waitlisted decisions
    // (see conference/config/speaker-portal.ts), so a speaker going inactive
    // means they're genuinely out — no need to keep showing them here.
    // Grouped by session rather than by speaker so co-presenters share one
    // row, and split by status rather than showing it inline per row.
    const sessionsById = new Map<string, SessionTableRow & { status: string; foundInSessionize: boolean }>()
    for (const speaker of speakers.filter((s) => s.active)) {
        for (const session of speaker.sessions) {
            let row = sessionsById.get(session.sessionizeSessionId)
            if (!row) {
                row = {
                    sessionizeSessionId: session.sessionizeSessionId,
                    title: session.sessionTitle,
                    status: session.status,
                    hasSlot: Boolean(session.startsAt),
                    isConfirmed: session.isConfirmed,
                    backupAccepted: speaker.sessionBackupAccepted[session.sessionizeSessionId] ?? false,
                    foundInSessionize: session.foundInSessionize,
                    presenters: [],
                }
                sessionsById.set(session.sessionizeSessionId, row)
            }
            row.presenters.push({
                sessionizeId: speaker.sessionizeId,
                fullName: speaker.fullName,
                hasProfile: speaker.profile !== null,
                confirmed: session.isConfirmed || Boolean(speaker.profile?.sessionConfirmedReportedAt),
                trainingResponded: Boolean(speaker.profile?.rsvpSpeakerTrainingRespondedAt),
                trainingSessionCount: speaker.profile?.rsvpSpeakerTraining.length ?? 0,
                dinnerResponse: speaker.profile?.rsvpSpeakersDinner,
                lastLoginLabel: formatRelativeTime(latestLoginFor(speaker.contacts, lastLoginTimes), now),
            })
        }
    }

    const allSessions = [...sessionsById.values()].sort((a, b) => a.title.localeCompare(b.title))

    const activeSpeakers = speakers.filter((s) => s.active)
    const rsvpHeadcount = buildRsvpHeadcount(
        activeSpeakers.map((s) => s.profile),
        portalConfig.checklist?.speakerTrainingSessions?.map((s) => ({ id: s.id, title: s.title })) ?? [],
    )
    const followUps = SPEAKER_CHECKLIST_ITEMS.map((definition) => {
        const dueDateIso = definition.dueDate?.toISO() ?? undefined
        return {
            key: definition.key,
            label: definition.label,
            count: speakersMissingChecklistItem(speakers, definition.key, now).length,
            dueDateIso,
            remainingLabel: dueDateRemainingLabel(dueDateIso, now),
            urgency: urgencyFor(dueDateIso, false, now),
        }
    })

    return data({
        configured: true as const,
        year: portalConfig.year,
        acceptedSessions: allSessions.filter((s) => s.status === 'Accepted'),
        // A waitlisted session id Sessionize no longer lists at all (as
        // opposed to one that's just not synced yet) most likely means it's
        // been declined/withdrawn since — nothing useful to show an admin,
        // so drop it instead of a row of raw ids.
        waitlistedSessions: allSessions.filter((s) => s.status !== 'Accepted' && s.foundInSessionize),
        lastRun,
        syncAvailable: services.speakerSync.isConfigured(),
        rsvpHeadcount,
        followUps,
        speakerEmailAddress: portalConfig.speakerEmailAddress,
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    const { email } = await requireAdmin(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    const actionName = formData.get('_action')

    if (actionName === 'sync-now') {
        const outcome = await services.speakerSync.syncNow('manual')
        if (outcome.ok) {
            return data({ _action: actionName, synced: true as const })
        }

        const message =
            outcome.reason === 'not-configured'
                ? 'Sync is not configured — check the Sessionize endpoint is set for this year.'
                : outcome.reason === 'already-running'
                  ? 'A sync is already running — try again shortly.'
                  : `Sync failed: ${outcome.error}`
        return data({ _action: actionName, error: message }, { status: outcome.reason === 'error' ? 502 : 409 })
    }

    if (actionName === 'import-contacts') {
        const portalConfig = conferenceManifest.speakerPortal
        if (!portalConfig) {
            return data({ _action: actionName, error: 'Speaker portal not configured' }, { status: 400 })
        }

        const file = formData.get('csv')
        if (!(file instanceof File) || file.size === 0) {
            return data({ _action: actionName, error: 'Choose a CSV or Excel file to upload' }, { status: 400 })
        }

        const isExcel = /\.xlsx?$/i.test(file.name) || EXCEL_MIME_TYPES.has(file.type)

        let rows
        try {
            rows = isExcel
                ? parseSpeakerContactsExcel(await file.arrayBuffer())
                : parseSpeakerContactsCsv(await file.text())
        } catch (error) {
            return data(
                { _action: actionName, error: error instanceof Error ? error.message : 'Could not parse file' },
                { status: 400 },
            )
        }

        const speakers = await services.speakers.listSpeakers(portalConfig.year)
        const plan = computeContactImportPlan({
            rows,
            speakers: speakers.map((s) => ({
                sessionizeId: s.sessionizeId,
                contacts: s.contacts,
                sessions: s.sessions.map((sess) => ({ sessionizeSessionId: sess.sessionizeSessionId })),
            })),
        })

        for (const grant of plan.grants) {
            await services.speakers.addContact(grant.sessionizeId, grant.email)
        }

        return data({ _action: actionName, imported: plan.rows })
    }

    if (actionName === 'accept-backup') {
        const sessionizeSessionId = formData.get('sessionizeSessionId')
        if (typeof sessionizeSessionId !== 'string' || !sessionizeSessionId) {
            return data({ _action: actionName, error: 'Missing session' }, { status: 400 })
        }
        await services.speakers.markBackupAccepted(sessionizeSessionId, email)
        return data({ _action: actionName, sessionizeSessionId })
    }

    if (actionName === 'follow-up') {
        const portalConfig = conferenceManifest.speakerPortal
        if (!portalConfig) {
            return data({ _action: actionName, error: 'Speaker portal not configured' }, { status: 400 })
        }

        const definition = requireChecklistDefinition(formData.get('itemKey'))
        if (!definition) {
            return data({ _action: actionName, error: 'Unknown checklist item' }, { status: 400 })
        }

        const { targets, portalUrl, conferenceName } = await loadFollowUpTargets(services, context, portalConfig, definition.key)
        const template = FOLLOW_UP_EMAIL_TEMPLATES[definition.key]

        let emailsSent = 0
        for (const target of targets) {
            const vars = { firstName: target.fullName.split(' ')[0], portalUrl, conferenceName }
            for (const email of target.contacts) {
                try {
                    await services.email.send({
                        to: email,
                        replyTo: portalConfig.speakerEmailAddress,
                        subject: template.subject,
                        text: template.text(vars),
                        html: template.html(vars),
                    })
                    emailsSent += 1
                } catch (error) {
                    // One bad address shouldn't stop the rest of the blast —
                    // log it and keep going.
                    recordException(error)
                }
            }
        }

        return data({ _action: actionName, itemKey: definition.key, speakersCount: targets.length, emailsSent })
    }

    if (actionName === 'follow-up-test') {
        const portalConfig = conferenceManifest.speakerPortal
        if (!portalConfig) {
            return data({ _action: actionName, error: 'Speaker portal not configured' }, { status: 400 })
        }

        const speakerEmailAddress = portalConfig.speakerEmailAddress
        if (!speakerEmailAddress) {
            return data({ _action: actionName, error: 'No speaker email address configured for this conference' }, { status: 400 })
        }

        const definition = requireChecklistDefinition(formData.get('itemKey'))
        if (!definition) {
            return data({ _action: actionName, error: 'Unknown checklist item' }, { status: 400 })
        }

        const { targets, portalUrl, conferenceName } = await loadFollowUpTargets(services, context, portalConfig, definition.key)
        const template = FOLLOW_UP_EMAIL_TEMPLATES[definition.key]
        const vars = { firstName: 'there', portalUrl, conferenceName }
        const recipientEmails = targets.flatMap((target) => target.contacts)

        // The real send only ever goes to `speakerEmailAddress` — this list is
        // logged so an admin can sanity-check who a live send would reach
        // without actually emailing any of them.
        console.log(
            `[follow-up test email] ${definition.label}: would send to ${recipientEmails.length} address(es): ${recipientEmails.join(', ') || '(none)'}`,
        )

        await services.email.send({
            to: speakerEmailAddress,
            replyTo: speakerEmailAddress,
            subject: template.subject,
            text: template.text(vars),
            html: template.html(vars),
        })

        return data({
            _action: actionName,
            itemKey: definition.key,
            speakerEmailAddress,
            recipientCount: recipientEmails.length,
        })
    }

    if (actionName === 'follow-up-manual') {
        const portalConfig = conferenceManifest.speakerPortal
        if (!portalConfig) {
            return data({ _action: actionName, error: 'Speaker portal not configured' }, { status: 400 })
        }

        const definition = requireChecklistDefinition(formData.get('itemKey'))
        if (!definition) {
            return data({ _action: actionName, error: 'Unknown checklist item' }, { status: 400 })
        }

        const { targets, portalUrl, conferenceName } = await loadFollowUpTargets(services, context, portalConfig, definition.key)
        const template = FOLLOW_UP_EMAIL_TEMPLATES[definition.key]
        const vars = { firstName: 'there', portalUrl, conferenceName }
        const recipientEmails = targets.flatMap((target) => target.contacts)

        return data({
            _action: actionName,
            itemKey: definition.key,
            subject: template.subject,
            emailText: template.text(vars),
            emailAddresses: recipientEmails.join(', '),
        })
    }

    return data({ _action: 'unknown' as const, error: 'Unknown action' }, { status: 400 })
}

function requireChecklistDefinition(itemKey: FormDataEntryValue | null): ChecklistItemDefinition | undefined {
    return SPEAKER_CHECKLIST_ITEMS.find((d): d is ChecklistItemDefinition => d.key === itemKey)
}

/** Shared setup for all three follow-up actions (real send, test send,
 * manual-copy preview) — the audience and template variables (other than
 * `firstName`) never differ between them. */
async function loadFollowUpTargets(
    services: ReturnType<typeof getServices>,
    context: Route.ActionArgs['context'],
    portalConfig: NonNullable<typeof conferenceManifest.speakerPortal>,
    itemKey: ChecklistItemDefinition['key'],
) {
    const speakers = await services.speakers.listSpeakers(portalConfig.year)
    const now = getDateTimeProvider(context).nowDate()
    const targets = speakersMissingChecklistItem(speakers, itemKey, now)
    const portalUrl = new URL('/speaker-portal', getConfig(context).webUrl).toString()
    const conferenceName = conferenceManifest.public.name
    return { targets, portalUrl, conferenceName }
}

const EXCEL_MIME_TYPES = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
])

const IMPORT_STATUS_LABEL: Record<string, string> = {
    granted: '✅ Granted',
    'already-granted': 'Already had access',
    'unknown-speaker': '⚠️ Speaker not synced yet — granted anyway',
    'session-mismatch': "⚠️ Session Id doesn't match this speaker's synced sessions — granted anyway",
}

function formatRunTime(unixSeconds: number, timezone: string): string {
    return DateTime.fromSeconds(unixSeconds, { zone: timezone }).toLocaleString(DateTime.DATETIME_SHORT, {
        locale: 'en-AU',
    })
}

const URGENCY_TEXT_COLOR = {
    normal: 'admin.600',
    upcoming: 'status.warning.fg',
    overdue: 'status.danger.fg',
} as const satisfies Record<ChecklistUrgency, string>

function dueDateLabel(dueDateIso: string | undefined): string | null {
    if (!dueDateIso) return null
    return `Due ${DateTime.fromISO(dueDateIso).toLocaleString(DateTime.DATE_MED, { locale: 'en-AU' })}`
}

export default function AdminSpeakers() {
    const loaderData = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const isSyncing = navigation.state === 'submitting' && navigation.formData?.get('_action') === 'sync-now'
    const isImporting = navigation.state === 'submitting' && navigation.formData?.get('_action') === 'import-contacts'
    const timezone = conferenceManifest.public.timezone

    if (!loaderData.configured) {
        return (
            <AdminLayout heading="Speakers">
                <AdminCard>
                    <styled.p fontSize="sm" color="admin.700">
                        The speaker portal isn't configured for this conference — add <code>speakerPortal</code> to
                        the conference manifest to enable it.
                    </styled.p>
                </AdminCard>
            </AdminLayout>
        )
    }

    const { acceptedSessions, waitlistedSessions, lastRun, syncAvailable, year, rsvpHeadcount, followUps, speakerEmailAddress } =
        loaderData

    return (
        <AdminLayout heading={`Speakers (${year})`}>
            {rsvpHeadcount && <RsvpHeadcountCard headcount={rsvpHeadcount} />}

            {followUps.length > 0 && (
                <FollowUpCard
                    followUps={followUps}
                    actionData={actionData}
                    navigation={navigation}
                    speakerEmailAddress={speakerEmailAddress}
                />
            )}

            <AdminCard>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap="4" mb="4">
                    <Box>
                        <styled.h2 fontSize="xl" fontWeight="semibold">
                            Sessionize sync
                        </styled.h2>
                        <styled.p fontSize="sm" color="admin.600" mt="1">
                            {lastRun ? (
                                <>
                                    Last run ({lastRun.trigger}) {formatRunTime(lastRun.startedAt, timezone)} —{' '}
                                    {lastRun.status === 'ok'
                                        ? `${lastRun.speakersUpserted ?? 0} speakers, ${lastRun.speakersDeactivated ?? 0} deactivated`
                                        : lastRun.status === 'running'
                                          ? 'still running'
                                          : `failed: ${lastRun.error ?? 'unknown error'}`}
                                </>
                            ) : (
                                'Never synced'
                            )}
                        </styled.p>
                    </Box>
                    <Flex gap="2" align="center">
                        <Button
                            asChild
                            variant="outline"
                            color="admin.900"
                            borderColor="admin.400"
                            bg="white"
                            _hover={{ bg: 'admin.100' }}
                        >
                            <a href="/admin/speakers/export">Export sessions + photos</a>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            color="admin.900"
                            borderColor="admin.400"
                            bg="white"
                            _hover={{ bg: 'admin.100' }}
                        >
                            <a href="/admin/speakers/experts">Meet the Experts seating</a>
                        </Button>
                        <Form method="post">
                            <input type="hidden" name="_action" value="sync-now" />
                            <Button type="submit" disabled={isSyncing || !syncAvailable}>
                                {isSyncing ? 'Syncing…' : 'Sync now'}
                            </Button>
                        </Form>
                    </Flex>
                </Flex>

                {!syncAvailable && (
                    <Box p="3" bg="status.warning.bg" borderRadius="md" fontSize="sm" color="status.warning.fg">
                        The Sessionize endpoint isn't set for this year, so sync is disabled. The portal still serves
                        already-synced data.
                    </Box>
                )}
                {actionData?._action === 'sync-now' && 'error' in actionData && (
                    <Box role="alert" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                        {actionData.error}
                    </Box>
                )}
                {actionData?._action === 'sync-now' && 'synced' in actionData && (
                    <Box role="status" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                        Sync complete.
                    </Box>
                )}
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Import portal access from CSV or Excel
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    Upload Sessionize's "flattened accepted sessions" export (CSV or Excel, first sheet only) to
                    grant portal access in bulk. Only Speaker Id, Session Id and Email are used — everything else
                    comes from the Sessionize sync above. Re-uploading the same file is safe; existing access is
                    never removed.
                </styled.p>
                <Form method="post" encType="multipart/form-data">
                    <input type="hidden" name="_action" value="import-contacts" />
                    <Flex gap="2" align="center" flexWrap="wrap">
                        <styled.input
                            type="file"
                            name="csv"
                            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            required
                            fontSize="sm"
                        />
                        <Button type="submit" disabled={isImporting}>
                            {isImporting ? 'Importing…' : 'Import'}
                        </Button>
                    </Flex>
                </Form>

                {actionData?._action === 'import-contacts' && 'error' in actionData && (
                    <Box role="alert" mt="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                        {actionData.error}
                    </Box>
                )}
                {actionData?._action === 'import-contacts' && 'imported' in actionData && (
                    <Box mt="4">
                        <styled.p role="status" fontSize="sm" color="admin.700" mb="2">
                            Processed {actionData.imported.length} row{actionData.imported.length === 1 ? '' : 's'}.
                        </styled.p>
                        {actionData.imported.length > 0 && (
                            <Box overflowX="auto">
                                <styled.table w="full" fontSize="xs">
                                    <styled.thead>
                                        <styled.tr textAlign="left" color="admin.600" borderBottom="admin-subtle">
                                            <styled.th py="1" pr="3">Speaker</styled.th>
                                            <styled.th py="1" pr="3">Email</styled.th>
                                            <styled.th py="1" pr="3">Session</styled.th>
                                            <styled.th py="1" pr="3">Result</styled.th>
                                        </styled.tr>
                                    </styled.thead>
                                    <styled.tbody>
                                        {actionData.imported.map((row) => (
                                            <styled.tr
                                                key={`${row.sessionizeId} ${row.email}`}
                                                borderBottom="admin-subtle"
                                                color="admin.900"
                                            >
                                                <styled.td py="1" pr="3">{row.fullName || row.sessionizeId}</styled.td>
                                                <styled.td py="1" pr="3">{row.email}</styled.td>
                                                <styled.td py="1" pr="3">{row.sessionTitle || '—'}</styled.td>
                                                <styled.td py="1" pr="3">{IMPORT_STATUS_LABEL[row.status]}</styled.td>
                                            </styled.tr>
                                        ))}
                                    </styled.tbody>
                                </styled.table>
                            </Box>
                        )}
                    </Box>
                )}
            </AdminCard>

            <SessionsTable
                heading="Accepted"
                emptyMessage="No accepted sessions synced yet."
                sessions={acceptedSessions}
            />
            <SessionsTable
                heading="Backup"
                emptyMessage="No waitlisted sessions synced yet."
                sessions={waitlistedSessions}
                showBackupAccepted
                navigation={navigation}
            />
        </AdminLayout>
    )
}

/** Icon-only status cell — the emoji is decorative, the actual state is
 * conveyed through a visually-hidden label so screen readers get the full
 * picture without the table turning into a wall of text. */
function StatusIcon({ ok, label }: { ok: boolean; label: string }) {
    return (
        <styled.span title={label}>
            <span aria-hidden="true">{ok ? '✅' : '❌'}</span>
            <styled.span srOnly>{label}</styled.span>
        </styled.span>
    )
}

function trainingStatusLabel(responded: boolean, sessionCount: number): string {
    if (!responded) return 'Training RSVP: not yet responded'
    return sessionCount > 0 ? `Training RSVP: attending ${sessionCount}` : 'Training RSVP: not attending any'
}

function dinnerStatusLabel(response: string | undefined): string {
    return response ? `Dinner RSVP: ${response}` : 'Dinner RSVP: not yet responded'
}

function StatTile({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
    return (
        <Box p="3" borderRadius="md" bg={muted ? 'admin.50' : 'admin.100'} minW="28">
            <styled.span display="block" fontSize="2xl" fontWeight="bold" color="admin.900">
                {value}
            </styled.span>
            <styled.span display="block" fontSize="xs" color="admin.600">
                {label}
            </styled.span>
        </Box>
    )
}

/** One row per checklist item, each with three actions:
 * - "Follow up" emails every active speaker who hasn't completed it yet (see
 *   the `follow-up` action, which reuses
 *   `speakersMissingChecklistItem`/`speakerChecklist` so this can never
 *   drift from what the speaker's own dashboard considers done).
 * - "Send test email" (`follow-up-test`) sends the same template to a fixed
 *   inbox instead of real speakers, so wording/rendering can be checked
 *   before a real send — it also logs the real recipient list to the
 *   console for a sanity check.
 * - "Send manual email" (`follow-up-manual`) doesn't send anything; it
 *   fetches the rendered text and recipient list so they can be copy/pasted
 *   into an external mail client. */
function FollowUpCard({
    followUps,
    actionData,
    navigation,
    speakerEmailAddress,
}: {
    followUps: Array<{
        key: string
        label: string
        count: number
        dueDateIso: string | undefined
        remainingLabel: string | null
        urgency: ChecklistUrgency
    }>
    actionData: ReturnType<typeof useActionData<typeof action>>
    navigation: ReturnType<typeof useNavigation>
    speakerEmailAddress: string | undefined
}) {
    return (
        <AdminCard>
            <styled.h2 fontSize="xl" fontWeight="semibold" mb="1">
                Follow up
            </styled.h2>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                Email every active speaker who hasn't completed a checklist item yet.
            </styled.p>

            {actionData?._action === 'follow-up' && 'error' in actionData && (
                <Box role="alert" mb="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                    {actionData.error}
                </Box>
            )}
            {actionData?._action === 'follow-up' && 'emailsSent' in actionData && (
                <Box role="status" mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                    {actionData.emailsSent > 0
                        ? `Sent ${actionData.emailsSent} email${actionData.emailsSent === 1 ? '' : 's'} to ${actionData.speakersCount} speaker${actionData.speakersCount === 1 ? '' : 's'}.`
                        : "Nobody to email — either everyone's done, or nobody outstanding has a contact on file."}
                </Box>
            )}
            {actionData?._action === 'follow-up-test' && 'error' in actionData && (
                <Box role="alert" mb="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                    {actionData.error}
                </Box>
            )}
            {actionData?._action === 'follow-up-test' && 'speakerEmailAddress' in actionData && (
                <Box role="status" mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                    Test email sent to {actionData.speakerEmailAddress}. A real send would reach{' '}
                    {actionData.recipientCount} address{actionData.recipientCount === 1 ? '' : 'es'} — see the
                    server console for the full list.
                </Box>
            )}

            <Flex direction="column" gap="2">
                {followUps.map((item) => {
                    const isSubmittingThis =
                        navigation.state === 'submitting' &&
                        navigation.formData?.get('_action') === 'follow-up' &&
                        navigation.formData?.get('itemKey') === item.key
                    const isSendingTest =
                        navigation.state === 'submitting' &&
                        navigation.formData?.get('_action') === 'follow-up-test' &&
                        navigation.formData?.get('itemKey') === item.key
                    return (
                        <Flex
                            key={item.key}
                            justify="space-between"
                            align="center"
                            gap="3"
                            p="3"
                            bg="admin.100"
                            borderRadius="md"
                            flexWrap="wrap"
                        >
                            <Box>
                                <styled.span display="block" fontSize="sm" color="admin.900">
                                    {item.label} — <styled.strong>{item.count}</styled.strong> outstanding
                                </styled.span>
                                {dueDateLabel(item.dueDateIso) && (
                                    <styled.span
                                        display="block"
                                        fontSize="xs"
                                        fontWeight={item.urgency === 'normal' ? 'normal' : 'semibold'}
                                        color={URGENCY_TEXT_COLOR[item.urgency]}
                                    >
                                        {dueDateLabel(item.dueDateIso)}
                                        {item.remainingLabel ? ` — ${item.remainingLabel}` : ''}
                                    </styled.span>
                                )}
                            </Box>
                            <Flex gap="2" flexWrap="wrap">
                                <Form method="post">
                                    <input type="hidden" name="_action" value="follow-up" />
                                    <input type="hidden" name="itemKey" value={item.key} />
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        color="admin.900"
                                        borderColor="admin.400"
                                        bg="white"
                                        _hover={{ bg: 'admin.100' }}
                                        disabled={item.count === 0 || isSubmittingThis}
                                    >
                                        {isSubmittingThis ? 'Sending…' : `Follow up`}
                                    </Button>
                                </Form>
                                {speakerEmailAddress && (
                                    <Form method="post">
                                        <input type="hidden" name="_action" value="follow-up-test" />
                                        <input type="hidden" name="itemKey" value={item.key} />
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            color="admin.900"
                                            borderColor="admin.400"
                                            bg="white"
                                            _hover={{ bg: 'admin.100' }}
                                            disabled={isSendingTest}
                                            title={`Sends to ${speakerEmailAddress}`}
                                        >
                                            {isSendingTest ? 'Sending…' : 'Send test'}
                                        </Button>
                                    </Form>
                                )}
                                <ManualEmailButton itemKey={item.key} label={item.label} />
                            </Flex>
                        </Flex>
                    )
                })}
            </Flex>
        </AdminCard>
    )
}

/** Fetches the rendered follow-up text + recipient list without sending
 * anything (`follow-up-manual`), then shows both in read-only fields sized
 * for a quick select-all/copy into an external mail client (Outlook, Gmail,
 * etc. — wherever the admin actually sends manual follow-ups from). */
function ManualEmailButton({ itemKey, label }: { itemKey: string; label: string }) {
    const fetcher = useFetcher<typeof action>()
    const [open, setOpen] = useState(false)
    const isLoading = fetcher.state !== 'idle'
    const result = fetcher.data

    // This fetcher only ever submits `follow-up-manual` for this one item, so
    // any response it receives is this button's own — open the modal as soon
    // as it lands rather than requiring a second click.
    useEffect(() => {
        if (result) setOpen(true)
    }, [result])

    return (
        <>
            <fetcher.Form method="post">
                <input type="hidden" name="_action" value="follow-up-manual" />
                <input type="hidden" name="itemKey" value={itemKey} />
                <Button
                    type="submit"
                    variant="outline"
                    color="admin.900"
                    borderColor="admin.400"
                    bg="white"
                    _hover={{ bg: 'admin.100' }}
                    disabled={isLoading}
                >
                    {isLoading ? 'Preparing…' : 'Manual Email'}
                </Button>
            </fetcher.Form>

            <SpeakerModal title={`Manual email — ${label}`} open={open && Boolean(result)} onOpenChange={setOpen}>
                {result && 'error' in result && (
                    <Box role="alert" mb="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                        {result.error}
                    </Box>
                )}
                {result && 'emailText' in result && (
                    <Flex direction="column" gap="4">
                        <Box>
                            <styled.label display="block" fontSize="sm" fontWeight="medium" color="admin.700" mb="1">
                                Subject
                            </styled.label>
                            <styled.input
                                readOnly
                                value={result.subject}
                                onFocus={(e) => e.currentTarget.select()}
                                w="full"
                                px="3"
                                py="2"
                                borderWidth="1px"
                                borderStyle="solid"
                                borderColor="admin.400"
                                borderRadius="md"
                                fontSize="sm"
                                bg="admin.50"
                                color="admin.900"
                            />
                        </Box>
                        <Box>
                            <styled.label display="block" fontSize="sm" fontWeight="medium" color="admin.700" mb="1">
                                Email text
                            </styled.label>
                            <styled.textarea
                                readOnly
                                value={result.emailText}
                                onFocus={(e) => e.currentTarget.select()}
                                w="full"
                                rows={10}
                                px="3"
                                py="2"
                                borderWidth="1px"
                                borderStyle="solid"
                                borderColor="admin.400"
                                borderRadius="md"
                                fontSize="sm"
                                bg="admin.50"
                                color="admin.900"
                                fontFamily="mono"
                            />
                        </Box>
                        <Box>
                            <styled.label display="block" fontSize="sm" fontWeight="medium" color="admin.700" mb="1">
                                Recipients ({result.emailAddresses ? result.emailAddresses.split(', ').length : 0})
                            </styled.label>
                            <styled.textarea
                                readOnly
                                value={result.emailAddresses}
                                onFocus={(e) => e.currentTarget.select()}
                                w="full"
                                rows={3}
                                px="3"
                                py="2"
                                borderWidth="1px"
                                borderStyle="solid"
                                borderColor="admin.400"
                                borderRadius="md"
                                fontSize="sm"
                                bg="admin.50"
                                color="admin.900"
                                fontFamily="mono"
                            />
                        </Box>
                    </Flex>
                )}
            </SpeakerModal>
        </>
    )
}

/** RSVP headcount summary at the top of the speakers list — how many active
 * speakers have committed to each training session and the dinner, with
 * "not attending" (a completed RSVP that says so) broken out separately from
 * "hasn't responded yet" so admins can tell the two apart at a glance. */
function RsvpHeadcountCard({ headcount }: { headcount: RsvpHeadcount }) {
    return (
        <AdminCard>
            <styled.h2 fontSize="xl" fontWeight="semibold" mb="1">
                RSVP headcount
            </styled.h2>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                Out of {headcount.totalSpeakers} active speaker{headcount.totalSpeakers === 1 ? '' : 's'}.
            </styled.p>

            {headcount.training.sessions.length > 0 && (
                <Box mb="6">
                    <styled.h3 fontSize="sm" fontWeight="semibold" color="admin.700" mb="2">
                        Speaker training
                    </styled.h3>
                    <Flex gap="3" flexWrap="wrap">
                        {headcount.training.sessions.map((session) => (
                            <StatTile key={session.id} label={session.title} value={session.attendingCount} />
                        ))}
                        <StatTile label="Not attending any" value={headcount.training.notAttendingAnyCount} />
                        <StatTile label="Not yet responded" value={headcount.training.notRespondedCount} muted />
                    </Flex>
                </Box>
            )}

            <Box>
                <styled.h3 fontSize="sm" fontWeight="semibold" color="admin.700" mb="2">
                    Speaker dinner
                </styled.h3>
                <Flex gap="3" flexWrap="wrap">
                    <StatTile label="Yes" value={headcount.dinner.yesCount} />
                    <StatTile label="Maybe" value={headcount.dinner.maybeCount} />
                    <StatTile label="Not attending" value={headcount.dinner.noCount} />
                    <StatTile label="Not yet responded" value={headcount.dinner.notRespondedCount} muted />
                </Flex>
            </Box>
        </AdminCard>
    )
}

/** One row per presenter — co-presenters on a shared session get consecutive
 * rows with the session's title/confirmation cell row-spanned across them,
 * so it's clear at a glance who's on a shared talk without repeating the
 * session details, while each presenter's own training/dinner RSVP status
 * stays on their own row. */
function SessionsTable({
    heading,
    emptyMessage,
    sessions,
    showBackupAccepted = false,
    navigation,
}: {
    heading: string
    emptyMessage: string
    sessions: SessionTableRow[]
    /** Adds a "Backup accepted" indicator + quick self-report button next to
     * the session title, so an admin doesn't have to open the per-speaker
     * preview just to mark a waitlisted session as accepted. Session-level —
     * one control per session, not per presenter, since a dual-speaker
     * session only needs one presenter to accept it. */
    showBackupAccepted?: boolean
    navigation?: ReturnType<typeof useNavigation>
}) {
    return (
        <AdminCard>
            <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                {heading} ({sessions.length})
            </styled.h2>
            {sessions.length === 0 ? (
                <styled.p fontSize="sm" color="admin.600">
                    {emptyMessage}
                </styled.p>
            ) : (
                <Box overflowX="auto">
                    <styled.table w="full" fontSize="sm">
                        <styled.thead>
                            <styled.tr textAlign="left" color="admin.600" borderBottom="admin-subtle">
                                <styled.th py="2" pr="4">Session</styled.th>
                                <styled.th py="2" pr="4">Speaker</styled.th>
                                <styled.th py="2" pr="4">Training</styled.th>
                                <styled.th py="2" pr="4">Dinner</styled.th>
                                <styled.th py="2" pr="4">Last login</styled.th>
                                <styled.th py="2" pr="4">Impersonate</styled.th>
                            </styled.tr>
                        </styled.thead>
                        <styled.tbody>
                            {sessions.map((session) => {
                                const confirmed = session.presenters.some((p) => p.confirmed)
                                const isSubmittingThis =
                                    navigation?.state === 'submitting' &&
                                    navigation.formData?.get('_action') === 'accept-backup' &&
                                    navigation.formData?.get('sessionizeSessionId') === session.sessionizeSessionId
                                return session.presenters.map((presenter, index) => (
                                    <styled.tr
                                        key={presenter.sessionizeId}
                                        borderBottom="admin-subtle"
                                        color="admin.900"
                                    >
                                        {index === 0 && (
                                            <styled.td py="2" pr="4" rowSpan={session.presenters.length} verticalAlign="top">
                                                <Flex direction="column" align="flex-start" gap="1">
                                                    <Box>
                                                        {session.title}{' '}
                                                        {!showBackupAccepted && (
                                                            <StatusIcon
                                                                ok={confirmed}
                                                                label={confirmed ? 'Session confirmed' : 'Session not yet confirmed'}
                                                            />
                                                        )}
                                                    </Box>
                                                    {showBackupAccepted &&
                                                        (session.backupAccepted ? (
                                                            <StatusIcon ok label="Backup speaker accepted" />
                                                        ) : (
                                                            <Form method="post">
                                                                <input type="hidden" name="_action" value="accept-backup" />
                                                                <input
                                                                    type="hidden"
                                                                    name="sessionizeSessionId"
                                                                    value={session.sessionizeSessionId}
                                                                />
                                                                <Button
                                                                    type="submit"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    color="admin.900"
                                                                    borderColor="admin.400"
                                                                    bg="white"
                                                                    _hover={{ bg: 'admin.100' }}
                                                                    disabled={isSubmittingThis}
                                                                >
                                                                    {isSubmittingThis ? 'Marking…' : 'Accept'}
                                                                </Button>
                                                            </Form>
                                                        ))}
                                                </Flex>
                                            </styled.td>
                                        )}
                                        <styled.td py="2" pr="4">
                                            <Flex align="center" gap="2" flexWrap="wrap">
                                                <styled.span>{presenter.fullName}</styled.span>
                                                <StatusIcon
                                                    ok={presenter.hasProfile}
                                                    label={
                                                        presenter.hasProfile
                                                            ? 'Session details submitted'
                                                            : 'Session details not submitted'
                                                    }
                                                />
                                            </Flex>
                                        </styled.td>
                                        <styled.td py="2" pr="4">
                                            <StatusIcon
                                                ok={presenter.trainingResponded}
                                                label={trainingStatusLabel(
                                                    presenter.trainingResponded,
                                                    presenter.trainingSessionCount,
                                                )}
                                            />
                                        </styled.td>
                                        <styled.td py="2" pr="4">
                                            <StatusIcon
                                                ok={Boolean(presenter.dinnerResponse)}
                                                label={dinnerStatusLabel(presenter.dinnerResponse)}
                                            />
                                        </styled.td>
                                        <styled.td py="2" pr="4" color={presenter.lastLoginLabel ? 'admin.700' : 'admin.400'}>
                                            {presenter.lastLoginLabel ?? 'Never'}
                                        </styled.td>
                                        <styled.td py="2" pr="4">
                                            <AppLink to={`/admin/speakers/${presenter.sessionizeId}`} title="View as speaker">
                                                <span aria-hidden="true">🕵️‍♀️</span>
                                                <styled.span srOnly>View as speaker</styled.span>
                                            </AppLink>
                                        </styled.td>
                                    </styled.tr>
                                ))
                            })}
                        </styled.tbody>
                    </styled.table>
                </Box>
            )}
        </AdminCard>
    )
}
