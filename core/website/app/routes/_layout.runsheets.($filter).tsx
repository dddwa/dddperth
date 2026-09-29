import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, Form, redirect, useLoaderData } from 'react-router'
import { AppLink } from '~/components/app-link'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { RunsheetRefreshForm } from '~/components/runsheet-refresh-form'
import { Button } from '~/components/ui/styled/button'
import ConfluenceLogo from '~/images/svg/confluence-icon.svg?react'
import { getUser, isAdminUser, requireAdmin } from '~/lib/auth.server'
import { getRunsheetCacheState, invalidateRunsheetCache } from '~/lib/runsheets/cache-generation.server'
import { fetchRunsheet, parseRunsheetFilter } from '~/lib/runsheets/runsheet-client.server'
import { noIndexMeta } from '~/lib/seo'
import { getConferenceState, getConfig, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.runsheets.($filter)'

/**
 * The volunteer run sheet. Deliberately public — volunteers need it on the
 * day without an account — but `noindex`, because it is only meaningful to
 * people who were sent the link and shouldn't turn up in search results.
 *
 * It carries no personal information: times, locations, team labels and
 * publicly-shared Confluence links. Anything sensitive must not be added to
 * the fields this page renders (see the schema in runsheet-client.server.ts).
 */
export const meta = noIndexMeta

/**
 * How long Jira responses stay cached. Run sheets are edited right up to the
 * morning, so conference day refreshes quickly; the rest of the year the page
 * is consulted rarely and the data barely moves.
 */
const CACHE_TTL_CONFERENCE_DAY_SECONDS = 5 * 60
const CACHE_TTL_DEFAULT_SECONDS = 30 * 60

function cacheTtlSeconds(context: Route.LoaderArgs['context']): number {
    const isConferenceDay = getConferenceState(context).conferenceState === 'conference-day'
    return isConferenceDay ? CACHE_TTL_CONFERENCE_DAY_SECONDS : CACHE_TTL_DEFAULT_SECONDS
}

export async function action({ request, context }: Route.ActionArgs) {
    const config = conferenceManifest.runsheets
    if (!config) {
        throw new Response('Not Found', { status: 404 })
    }

    const formData = await request.formData()
    const filter = formData.get('filter')
    // Only ever redirect to a filter we recognise — the value arrives from a
    // form post and lands in the URL.
    const parsed = parseRunsheetFilter(typeof filter === 'string' ? filter : undefined, config)
    const target = parsed ? `/runsheets/${parsed.kind}.${parsed.value}` : '/runsheets'

    // Admin-only: every run sheet view re-reads Jira on its next load.
    if (formData.get('intent') === 'refresh') {
        const admin = await requireAdmin(request, context)
        await invalidateRunsheetCache(getServices(context), admin.email)
    }

    return redirect(target)
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
    const config = conferenceManifest.runsheets
    if (!config) {
        throw new Response('Not Found', { status: 404 })
    }

    const filter = parseRunsheetFilter(params.filter, config)
    // Same Jira credentials the sponsor portal sync uses — one set of secrets,
    // read once in build-config.server.ts.
    const { apiEmail, apiToken, apiBaseUrl } = getConfig(context).jira

    const ttl = cacheTtlSeconds(context)
    const services = getServices(context)
    const [cacheState, user] = await Promise.all([getRunsheetCacheState(services), getUser(request.headers, services)])

    const items = await fetchRunsheet({
        config,
        apiEmail,
        apiToken,
        apiBaseUrl,
        filter,
        cacheTtlSeconds: ttl,
        cacheGeneration: cacheState.generation,
    })

    const canRefresh = await isAdminUser(user, services)

    const options = [
        ...Object.entries(config.teamLabels).map(([key, label]) => ({ value: `team.${key}`, label })),
        ...Object.entries(config.locationLabels).map(([key, label]) => ({ value: `location.${key}`, label })),
    ]

    return data(
        {
            items,
            filter: filter ? `${filter.kind}.${filter.value}` : '',
            options,
            canRefresh,
            refreshedAt: canRefresh ? cacheState.refreshedAt : null,
            hasBumpIn: Boolean(config.bumpIn),
        },
        // Private while an admin is looking, so a shared cache can't hand
        // them the pre-refresh page.
        { headers: { 'Cache-Control': canRefresh ? 'private, no-store' : `max-age=${ttl}` } },
    )
}

/**
 * Formats a Jira datetime for display in the conference's timezone.
 *
 * Explicitly zoned: workers run in UTC, so reading local hours off a `Date`
 * renders every Perth time eight hours out — and correct on a developer's
 * machine, which is why that is worth stating here.
 */
function formatTime(isoDateTime: string | null): string {
    if (!isoDateTime) return '-'
    const dateTime = DateTime.fromISO(isoDateTime, { zone: conferenceManifest.public.timezone })
    return dateTime.isValid ? dateTime.toFormat('h:mm a') : '-'
}

export default function Runsheets() {
    const { items, filter, options, canRefresh, refreshedAt, hasBumpIn } = useLoaderData<typeof loader>()

    return (
        <AdminLayout heading="Runsheets">
            <Box maxW="4xl" mx="auto">
                <AdminCard overflow="auto">
                    {hasBumpIn || canRefresh ? (
                        <Flex
                            alignItems="center"
                            justifyContent="space-between"
                            gap="2"
                            marginBottom="2"
                            flexWrap="wrap"
                        >
                            {hasBumpIn ? (
                                <AppLink unstyled to="/runsheets/bump-in" textDecoration="underline">
                                    Bump-in run sheet
                                </AppLink>
                            ) : (
                                <span />
                            )}
                            {canRefresh ? <RunsheetRefreshForm refreshedAt={refreshedAt} filter={filter} /> : null}
                        </Flex>
                    ) : null}
                    <Form method="post">
                        <Flex alignItems="center" marginBottom="2" maxWidth="fit" gap="1">
                            <styled.label htmlFor="runsheet-filter" srOnly>
                                Filter by team or location
                            </styled.label>
                            <styled.select
                                id="runsheet-filter"
                                name="filter"
                                defaultValue={filter}
                                border="admin-subtle"
                                p="2"
                                borderRadius="md"
                            >
                                <option value="">Filter by Team or Location</option>
                                {options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </styled.select>
                            <Button type="submit">Apply Filter</Button>
                        </Flex>
                    </Form>

                    {items.length === 0 ? (
                        <styled.p p="2">No run sheet items match this filter.</styled.p>
                    ) : (
                        <styled.table width="full" fontSize="sm">
                            <thead>
                                <tr>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Start Time
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        End Time
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Summary
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Location
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Team
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" maxW="40" textWrap="wrap">
                                        Role Details
                                    </styled.th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <styled.tr key={item.id} border="admin-subtle">
                                        <styled.td p="2">{formatTime(item.startTime)}</styled.td>
                                        <styled.td p="2">{formatTime(item.endTime)}</styled.td>
                                        <styled.td p="2">{item.summary}</styled.td>
                                        <styled.td p="2">{item.locations.join(', ')}</styled.td>
                                        <styled.td p="2" maxW="20" overflowWrap="break-word">
                                            {item.teams.join(', ')}
                                        </styled.td>
                                        <styled.td p="2" maxW="20">
                                            {item.roleInstructionsUrl ? (
                                                <AppLink
                                                    unstyled
                                                    to={item.roleInstructionsUrl}
                                                    display="inline-flex"
                                                    alignItems="center"
                                                    aria-label={`Role instructions for ${item.summary}`}
                                                >
                                                    <ConfluenceLogo height="2rem" />
                                                </AppLink>
                                            ) : null}
                                        </styled.td>
                                    </styled.tr>
                                ))}
                            </tbody>
                        </styled.table>
                    )}
                </AdminCard>
            </Box>
        </AdminLayout>
    )
}
