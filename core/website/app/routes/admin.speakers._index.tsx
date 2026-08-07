import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.speakers._index'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.speakerPortal
    if (!portalConfig) {
        return data({ configured: false as const, year: null, speakers: [], lastRun: null, syncAvailable: false })
    }

    const [speakers, lastRun] = await Promise.all([
        services.speakers.listSpeakers(portalConfig.year),
        services.speakers.getLatestSyncRun(),
    ])

    return data({
        configured: true as const,
        year: portalConfig.year,
        speakers: speakers.map((s) => ({
            sessionizeId: s.sessionizeId,
            fullName: s.fullName,
            active: s.active,
            contacts: s.contacts,
            sessions: s.sessions.map((sess) => ({
                title: sess.sessionTitle,
                status: sess.status,
                hasSlot: Boolean(sess.startsAt),
            })),
            hasProfile: s.profile !== null,
            jiraUrl: s.jiraIssueKey ? `${portalConfig.jira.baseUrl}/browse/${s.jiraIssueKey}` : null,
        })),
        lastRun,
        syncAvailable: services.speakerSync.isConfigured(),
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    if (formData.get('_action') !== 'sync-now') {
        return data({ error: 'Unknown action' }, { status: 400 })
    }

    const outcome = await services.speakerSync.syncNow('manual')
    if (outcome.ok) {
        return data({ synced: true as const })
    }

    const message =
        outcome.reason === 'not-configured'
            ? 'Sync is not configured — set the Jira secrets (or JIRA_STUB=true locally), and check the Sessionize endpoint is set for this year.'
            : outcome.reason === 'already-running'
              ? 'A sync is already running — try again shortly.'
              : `Sync failed: ${outcome.error}`
    return data({ error: message }, { status: outcome.reason === 'error' ? 502 : 409 })
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
    const isSyncing = navigation.state === 'submitting'
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

    const { speakers, lastRun, syncAvailable, year } = loaderData

    return (
        <AdminLayout heading={`Speakers (${year})`}>
            <AdminCard>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap="4" mb="4">
                    <Box>
                        <styled.h2 fontSize="xl" fontWeight="semibold">
                            Sessionize + Jira sync
                        </styled.h2>
                        <styled.p fontSize="sm" color="admin.600" mt="1">
                            {lastRun ? (
                                <>
                                    Last run ({lastRun.trigger}) {formatRunTime(lastRun.startedAt, timezone)} —{' '}
                                    {lastRun.status === 'ok'
                                        ? `${lastRun.speakersUpserted ?? 0} speakers, ` +
                                          `+${lastRun.contactsAdded ?? 0}/−${lastRun.contactsRemoved ?? 0} contacts`
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
                        Jira credentials aren't set in this environment (JIRA_API_EMAIL / JIRA_API_TOKEN secrets, or
                        JIRA_STUB=true locally), or the Sessionize endpoint isn't set for this year, so sync is
                        disabled. The portal still serves already-synced data.
                    </Box>
                )}
                {actionData && 'error' in actionData && (
                    <Box p="3" bg="status.danger.bg" borderRadius="md" fontSize="sm" color="status.danger.fg">
                        {actionData.error}
                    </Box>
                )}
                {actionData && 'synced' in actionData && (
                    <Box p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                        Sync complete.
                    </Box>
                )}
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Speakers
                </styled.h2>
                {speakers.length === 0 ? (
                    <styled.p fontSize="sm" color="admin.600">
                        No speakers synced yet — run a sync once there are accepted or waitlisted sessions in
                        Sessionize.
                    </styled.p>
                ) : (
                    <Box overflowX="auto">
                        <styled.table w="full" fontSize="sm">
                            <styled.thead>
                                <styled.tr textAlign="left" color="admin.600" borderBottom="admin-subtle">
                                    <styled.th py="2" pr="4">Speaker</styled.th>
                                    <styled.th py="2" pr="4">Sessions</styled.th>
                                    <styled.th py="2" pr="4">Portal access</styled.th>
                                    <styled.th py="2" pr="4">Profile</styled.th>
                                    <styled.th py="2" pr="4">Jira</styled.th>
                                    <styled.th py="2" pr="4">Preview</styled.th>
                                </styled.tr>
                            </styled.thead>
                            <styled.tbody>
                                {speakers.map((speaker) => (
                                    <styled.tr key={speaker.sessionizeId} borderBottom="admin-subtle" color="admin.900">
                                        <styled.td py="2" pr="4">
                                            {speaker.fullName}{' '}
                                            <styled.span color="admin.600" fontSize="xs">
                                                {!speaker.active && '(no longer accepted/waitlisted)'}
                                            </styled.span>
                                        </styled.td>
                                        <styled.td py="2" pr="4">
                                            {speaker.sessions.length > 0
                                                ? speaker.sessions
                                                      .map((s) => `${s.title} (${s.status}${s.hasSlot ? '' : ', no slot'})`)
                                                      .join('; ')
                                                : '—'}
                                        </styled.td>
                                        <styled.td py="2" pr="4">
                                            {speaker.contacts.length > 0 ? speaker.contacts.join(', ') : 'No Jira email matched'}
                                        </styled.td>
                                        <styled.td py="2" pr="4">{speaker.hasProfile ? '✅ Submitted' : '—'}</styled.td>
                                        <styled.td py="2" pr="4">
                                            {speaker.jiraUrl ? (
                                                <styled.a
                                                    href={speaker.jiraUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    textDecoration="underline"
                                                >
                                                    View issue
                                                </styled.a>
                                            ) : (
                                                '—'
                                            )}
                                        </styled.td>
                                        <styled.td py="2" pr="4">
                                            <AppLink
                                                to={`/admin/speakers/${speaker.sessionizeId}`}
                                                color="admin.700"
                                                textDecoration="underline"
                                            >
                                                View as speaker
                                            </AppLink>
                                        </styled.td>
                                    </styled.tr>
                                ))}
                            </styled.tbody>
                        </styled.table>
                    </Box>
                )}
            </AdminCard>
        </AdminLayout>
    )
}
