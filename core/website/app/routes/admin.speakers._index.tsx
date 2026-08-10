import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { computeContactImportPlan, parseSpeakerContactsCsv } from '~/lib/speakers/contact-import'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.speakers._index'

interface SessionTableRow {
    sessionizeSessionId: string
    title: string
    hasSlot: boolean
    presenters: Array<{ sessionizeId: string; fullName: string; hasProfile: boolean }>
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
        })
    }

    const [speakers, lastRun] = await Promise.all([
        services.speakers.listSpeakers(portalConfig.year),
        services.speakers.getLatestSyncRun(),
    ])

    // Statuses that sync in are now the real Accepted/Waitlisted decisions
    // (see conference/config/speaker-portal.ts), so a speaker going inactive
    // means they're genuinely out — no need to keep showing them here.
    // Grouped by session rather than by speaker so co-presenters share one
    // row, and split by status rather than showing it inline per row.
    const sessionsById = new Map<string, SessionTableRow & { status: string }>()
    for (const speaker of speakers.filter((s) => s.active)) {
        for (const session of speaker.sessions) {
            let row = sessionsById.get(session.sessionizeSessionId)
            if (!row) {
                row = {
                    sessionizeSessionId: session.sessionizeSessionId,
                    title: session.sessionTitle,
                    status: session.status,
                    hasSlot: Boolean(session.startsAt),
                    presenters: [],
                }
                sessionsById.set(session.sessionizeSessionId, row)
            }
            row.presenters.push({
                sessionizeId: speaker.sessionizeId,
                fullName: speaker.fullName,
                hasProfile: speaker.profile !== null,
            })
        }
    }

    const allSessions = [...sessionsById.values()].sort((a, b) => a.title.localeCompare(b.title))

    return data({
        configured: true as const,
        year: portalConfig.year,
        acceptedSessions: allSessions.filter((s) => s.status === 'Accepted'),
        waitlistedSessions: allSessions.filter((s) => s.status !== 'Accepted'),
        lastRun,
        syncAvailable: services.speakerSync.isConfigured(),
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    await requireAdmin(request, context)
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
            return data({ _action: actionName, error: 'Choose a CSV file to upload' }, { status: 400 })
        }

        let rows
        try {
            rows = parseSpeakerContactsCsv(await file.text())
        } catch (error) {
            return data(
                { _action: actionName, error: error instanceof Error ? error.message : 'Could not parse CSV' },
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

    return data({ _action: 'unknown' as const, error: 'Unknown action' }, { status: 400 })
}

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

    const { acceptedSessions, waitlistedSessions, lastRun, syncAvailable, year } = loaderData

    return (
        <AdminLayout heading={`Speakers (${year})`}>
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
                    <Form method="post">
                        <input type="hidden" name="_action" value="sync-now" />
                        <Button type="submit" disabled={isSyncing || !syncAvailable}>
                            {isSyncing ? 'Syncing…' : 'Sync now'}
                        </Button>
                    </Form>
                </Flex>

                {!syncAvailable && (
                    <Box p="3" bg="status.warning.bg" borderRadius="md" fontSize="sm" color="status.warning.fg">
                        The Sessionize endpoint isn't set for this year, so sync is disabled. The portal still serves
                        already-synced data.
                    </Box>
                )}
                {actionData?._action === 'sync-now' && 'error' in actionData && (
                    <Box p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                        {actionData.error}
                    </Box>
                )}
                {actionData?._action === 'sync-now' && 'synced' in actionData && (
                    <Box p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                        Sync complete.
                    </Box>
                )}
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Import portal access from CSV
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    Upload Sessionize's "flattened accepted sessions" export to grant portal access in bulk. Only
                    Speaker Id, Session Id and Email are used — everything else comes from the Sessionize sync above.
                    Re-uploading the same file is safe; existing access is never removed.
                </styled.p>
                <Form method="post" encType="multipart/form-data">
                    <input type="hidden" name="_action" value="import-contacts" />
                    <Flex gap="2" align="center" flexWrap="wrap">
                        <styled.input type="file" name="csv" accept=".csv,text/csv" required fontSize="sm" />
                        <Button type="submit" disabled={isImporting}>
                            {isImporting ? 'Importing…' : 'Import'}
                        </Button>
                    </Flex>
                </Form>

                {actionData?._action === 'import-contacts' && 'error' in actionData && (
                    <Box mt="4" p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                        {actionData.error}
                    </Box>
                )}
                {actionData?._action === 'import-contacts' && 'imported' in actionData && (
                    <Box mt="4">
                        <styled.p fontSize="sm" color="admin.700" mb="2">
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
            />
        </AdminLayout>
    )
}

/** One row per session — co-presenters share a row so it's clear at a
 * glance who's on a shared talk, rather than duplicating the session across
 * one row per speaker. */
function SessionsTable({
    heading,
    emptyMessage,
    sessions,
}: {
    heading: string
    emptyMessage: string
    sessions: SessionTableRow[]
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
                                <styled.th py="2" pr="4">Speakers</styled.th>
                            </styled.tr>
                        </styled.thead>
                        <styled.tbody>
                            {sessions.map((session) => (
                                <styled.tr
                                    key={session.sessionizeSessionId}
                                    borderBottom="admin-subtle"
                                    color="admin.900"
                                >
                                    <styled.td py="2" pr="4">
                                        {session.title}
                                        {!session.hasSlot && (
                                            <styled.span color="admin.600" fontSize="xs">
                                                {' '}
                                                (no slot yet)
                                            </styled.span>
                                        )}
                                    </styled.td>
                                    <styled.td py="2" pr="4">
                                        <Flex direction="column" gap="1">
                                            {session.presenters.map((presenter) => (
                                                <Flex key={presenter.sessionizeId} align="center" gap="2">
                                                    <styled.span>{presenter.fullName}</styled.span>
                                                    <styled.span fontSize="xs" color="admin.600">
                                                        {presenter.hasProfile ? '✅ Submitted' : '— No profile'}
                                                    </styled.span>
                                                    <AppLink
                                                        to={`/admin/speakers/${presenter.sessionizeId}`}
                                                        color="admin.700"
                                                        textDecoration="underline"
                                                        fontSize="xs"
                                                    >
                                                        View as speaker
                                                    </AppLink>
                                                </Flex>
                                            ))}
                                        </Flex>
                                    </styled.td>
                                </styled.tr>
                            ))}
                        </styled.tbody>
                    </styled.table>
                </Box>
            )}
        </AdminCard>
    )
}
