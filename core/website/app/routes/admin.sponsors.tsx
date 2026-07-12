import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { isProfileComplete } from '~/lib/sponsors/profile'
import { getConfig, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.sponsors'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.sponsorPortal
    if (!portalConfig) {
        return data({
            configured: false as const,
            year: null,
            sponsors: [],
            lastRun: null,
            syncAvailable: false,
            tokenExpiry: null,
        })
    }

    // Surface upcoming token expiry (recorded by `pnpm jira:auth`) well
    // before the emailed reminders start at 30 days.
    const tokenExpiresAt = getConfig(context).jira.tokenExpiresAt
    const tokenExpiry = tokenExpiresAt
        ? {
              expiresOn: new Date(tokenExpiresAt).toISOString().slice(0, 10),
              daysLeft: Math.ceil((tokenExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)),
          }
        : null

    const [sponsors, lastRun] = await Promise.all([
        services.sponsors.listSponsors(portalConfig.year),
        services.sponsors.getLatestSyncRun(),
    ])

    return data({
        configured: true as const,
        year: portalConfig.year,
        sponsors: sponsors.map((s) => ({
            issueKey: s.issueKey,
            companyName: s.companyName,
            tier: s.tier,
            active: s.active,
            contacts: s.contacts,
            complete: isProfileComplete(s.profile),
            hasLogo: Boolean(s.profile?.logo),
            writeback: s.assetsTaskFlippedAt ? 'done' : s.assetsTaskPending ? 'pending' : null,
            jiraUrl: `${portalConfig.jira.baseUrl}/browse/${s.issueKey}`,
        })),
        lastRun,
        syncAvailable: services.sponsorSync.isConfigured(),
        tokenExpiry,
    })
}

export async function action({ request, context }: Route.ActionArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    if (formData.get('_action') !== 'sync-now') {
        return data({ error: 'Unknown action' }, { status: 400 })
    }

    const outcome = await services.sponsorSync.syncNow('manual')
    if (outcome.ok) {
        await services.sponsorSync.retryPendingWritebacks()
        return data({ synced: true as const })
    }

    const message =
        outcome.reason === 'not-configured'
            ? 'Sync is not configured — set the Jira secrets (or JIRA_STUB=true locally).'
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

export default function AdminSponsors() {
    const loaderData = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const isSyncing = navigation.state === 'submitting'
    const timezone = conferenceManifest.public.timezone

    if (!loaderData.configured) {
        return (
            <AdminLayout heading="Sponsors">
                <AdminCard>
                    <styled.p fontSize="sm" color="admin.700">
                        The sponsor portal isn't configured for this conference — add <code>sponsorPortal</code> to
                        the conference manifest to enable it.
                    </styled.p>
                </AdminCard>
            </AdminLayout>
        )
    }

    const { sponsors, lastRun, syncAvailable, year, tokenExpiry } = loaderData
    const tokenExpiringSoon = tokenExpiry && tokenExpiry.daysLeft <= 30

    return (
        <AdminLayout heading={`Sponsors (${year})`}>
            {tokenExpiringSoon && (
                <Box
                    mb="6"
                    p="4"
                    bg={tokenExpiry.daysLeft <= 0 ? 'status.danger.bg' : 'status.warning.bg'}
                    borderRadius="md"
                    fontSize="sm"
                    color={tokenExpiry.daysLeft <= 0 ? 'status.danger.fg' : 'status.warning.fg'}
                >
                    <styled.p fontWeight="medium">
                        {tokenExpiry.daysLeft <= 0
                            ? `The Jira API token expired on ${tokenExpiry.expiresOn} — sync is broken until it's replaced.`
                            : `The Jira API token expires on ${tokenExpiry.expiresOn} (${tokenExpiry.daysLeft} days left).`}
                    </styled.p>
                    <styled.p mt="1">
                        Create a new token at id.atlassian.com and run <code>pnpm jira:auth --secrets production</code>.
                    </styled.p>
                </Box>
            )}
            <AdminCard>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap="4" mb="4">
                    <Box>
                        <styled.h2 fontSize="xl" fontWeight="semibold">
                            Jira sync
                        </styled.h2>
                        <styled.p fontSize="sm" color="admin.600" mt="1">
                            {lastRun ? (
                                <>
                                    Last run ({lastRun.trigger}) {formatRunTime(lastRun.startedAt, timezone)} —{' '}
                                    {lastRun.status === 'ok'
                                        ? `${lastRun.sponsorsUpserted ?? 0} sponsors, ` +
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
                        JIRA_STUB=true locally), so sync is disabled. The portal still serves already-synced data.
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
                    Sponsor submissions
                </styled.h2>
                {sponsors.length === 0 ? (
                    <styled.p fontSize="sm" color="admin.600">
                        No sponsors synced yet — run a sync once the committee has added Sponsor issues (labelled{' '}
                        {year}) in Jira.
                    </styled.p>
                ) : (
                    <Box overflowX="auto">
                        <styled.table w="full" fontSize="sm">
                            <styled.thead>
                                <styled.tr textAlign="left" color="admin.600" borderBottom="admin-subtle">
                                    <styled.th py="2" pr="4">Sponsor</styled.th>
                                    <styled.th py="2" pr="4">Tier</styled.th>
                                    <styled.th py="2" pr="4">Contacts</styled.th>
                                    <styled.th py="2" pr="4">Profile</styled.th>
                                    <styled.th py="2" pr="4">Logo</styled.th>
                                    <styled.th py="2" pr="4">Jira task</styled.th>
                                </styled.tr>
                            </styled.thead>
                            <styled.tbody>
                                {sponsors.map((sponsor) => (
                                    <styled.tr key={sponsor.issueKey} borderBottom="admin-subtle" color="admin.900">
                                        <styled.td py="2" pr="4">
                                            <styled.a
                                                href={sponsor.jiraUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                textDecoration="underline"
                                            >
                                                {sponsor.companyName}
                                            </styled.a>{' '}
                                            <styled.span color="admin.600" fontSize="xs">
                                                {sponsor.issueKey}
                                                {!sponsor.active && ' (departed)'}
                                            </styled.span>
                                        </styled.td>
                                        <styled.td py="2" pr="4">{sponsor.tier}</styled.td>
                                        <styled.td py="2" pr="4">
                                            {sponsor.contacts.length > 0 ? sponsor.contacts.join(', ') : '—'}
                                        </styled.td>
                                        <styled.td py="2" pr="4">{sponsor.complete ? '✅ Complete' : 'In progress'}</styled.td>
                                        <styled.td py="2" pr="4">
                                            {sponsor.hasLogo ? (
                                                <styled.a
                                                    href={`/portal/logo/${sponsor.issueKey}?download=1`}
                                                    textDecoration="underline"
                                                >
                                                    Download
                                                </styled.a>
                                            ) : (
                                                '—'
                                            )}
                                        </styled.td>
                                        <styled.td py="2" pr="4">
                                            {sponsor.writeback === 'done'
                                                ? '✅ Ticked'
                                                : sponsor.writeback === 'pending'
                                                  ? '⏳ Retry queued'
                                                  : '—'}
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
