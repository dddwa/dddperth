import { conferenceManifest } from '@conference/manifest'
import type { RunsheetsBumpInConfig, RunsheetsConfig } from '@ddd/conference-config'
import { DateTime } from 'luxon'
import { data, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { floatingPanelAnchorClass } from '~/components/floating-panel'
import { RunsheetFreshness } from '~/components/runsheet-freshness'
import { Button } from '~/components/ui/styled/button'
import ConfluenceLogo from '~/images/svg/confluence-icon.svg?react'
import { getUser, isAdminUser, requireAdmin } from '~/lib/auth.server'
import { getRunsheetCacheState, invalidateRunsheetCache } from '~/lib/runsheets/cache-generation.server'
import { fetchRunsheet } from '~/lib/runsheets/runsheet-client.server'
import { type BumpInItem, fetchSponsorBumpIn, sortByStartTime } from '~/lib/runsheets/sponsor-bump-in.server'
import { noIndexMeta } from '~/lib/seo'
import { getConfig, getServices } from '~/remix-app-load-context'
import { css, cx } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.runsheets.bump-in'

/**
 * The bump-in run sheet: the committee's bump-in items from the volunteer
 * board merged with one row per exhibiting sponsor from the sponsors board.
 *
 * Public and `noindex` for the same reasons as /runsheets. The sponsor rows
 * carry only what `bumpIn.sponsors.fields` allowlists — see
 * sponsor-bump-in.server.ts for how the rest of a sponsor issue is kept out.
 */
export const meta = noIndexMeta

/** Bump-in is the day before, and plans move right up to it. */
const CACHE_TTL_SECONDS = 5 * 60

type LoadContext = Route.LoaderArgs['context']

function requireBumpInConfig(): { config: RunsheetsConfig; bumpIn: RunsheetsBumpInConfig } {
    const config = conferenceManifest.runsheets
    if (!config?.bumpIn) {
        throw new Response('Not Found', { status: 404 })
    }
    return { config, bumpIn: config.bumpIn }
}

async function loadBumpIn(context: LoadContext, cacheGeneration: string) {
    const { config, bumpIn } = requireBumpInConfig()
    const { apiEmail, apiToken, apiBaseUrl } = getConfig(context).jira
    const shared = { config, apiEmail, apiToken, apiBaseUrl, cacheTtlSeconds: CACHE_TTL_SECONDS, cacheGeneration }
    const { timezone } = conferenceManifest.public

    const [volunteer, exhibitors] = await Promise.all([
        fetchRunsheet({ ...shared, jql: bumpIn.volunteerJql, timezone }),
        fetchSponsorBumpIn({ ...shared, bumpIn }),
    ])
    const items: BumpInItem[] = [...volunteer.items, ...exhibitors.items]
    // The older of the two, so "Updated" never claims a cached half is fresh.
    const fetchedAt = volunteer.fetchedAt < exhibitors.fetchedAt ? volunteer.fetchedAt : exhibitors.fetchedAt
    return { items: sortByStartTime(items), fetchedAt }
}

/** Admin-only: make both run sheets re-read Jira on their next load. */
export async function action({ request, context }: Route.ActionArgs) {
    requireBumpInConfig()
    const formData = await request.formData()
    if (formData.get('intent') === 'refresh') {
        const admin = await requireAdmin(request, context)
        await invalidateRunsheetCache(getServices(context), admin.email)
    }
    // No redirect, for the same reason as /runsheets: RunsheetFreshness posts
    // this from a fetcher, which revalidates the loader itself, and a redirect
    // built from the request would send the page to the `.data` endpoint.
    return null
}

export async function loader({ request, context }: Route.LoaderArgs) {
    const services = getServices(context)
    const [cacheState, user] = await Promise.all([getRunsheetCacheState(services), getUser(request.headers, services)])
    const { items, fetchedAt } = await loadBumpIn(context, cacheState.generation)
    const canRefresh = await isAdminUser(user, services)

    return data(
        { items, canRefresh, fetchedAt },
        // Not cached by the browser, or Refresh would get the same copy back —
        // the server-side Jira cache is what protects the API budget. Never
        // stored at all while an admin is looking, so a shared cache can't
        // hand them the pre-refresh page.
        { headers: { 'Cache-Control': canRefresh ? 'private, no-store' : 'no-cache' } },
    )
}

/** Day and time in the conference's zone — bump-in spans Friday and Saturday morning. */
function formatTime(isoDateTime: string | null): string {
    if (!isoDateTime) return '-'
    const dateTime = DateTime.fromISO(isoDateTime, { zone: conferenceManifest.public.timezone })
    return dateTime.isValid ? dateTime.toFormat('ccc h:mm a') : '-'
}

/** Matches the conference day run sheet's toolbar. */
const toolbarClass = css({ mt: '[20px]', mr: '[20px]', top: '[20px]' })

export default function BumpInRunsheet() {
    const { items, canRefresh, fetchedAt } = useLoaderData<typeof loader>()

    return (
        <>
            {/* The same sticky toolbar as /runsheets, so Refresh is in the same
                place on both — and available to everyone, not only admins. */}
            <Flex
                className={cx(floatingPanelAnchorClass, toolbarClass)}
                position="sticky"
                zIndex="docked"
                justifyContent="flex-end"
                gap="2"
                mb="2"
            >
                <Button asChild size="sm" boxShadow="md">
                    <AppLink unstyled to="/runsheets">
                        Conference day run sheet
                    </AppLink>
                </Button>
                <RunsheetFreshness
                    fetchedAt={fetchedAt}
                    timezone={conferenceManifest.public.timezone}
                    clearsJiraCache={canRefresh}
                />
            </Flex>
            <AdminLayout heading="Bump-in run sheet">
                <Box maxW="6xl" mx="auto">
                    <AdminCard overflow="auto">
                        {items.length === 0 ? (
                            <styled.p p="2">Nothing is scheduled for bump-in yet.</styled.p>
                        ) : (
                            <styled.table width="full" fontSize="sm">
                                <thead>
                                    <tr>
                                        <styled.th textAlign="left" p="2">
                                            Start
                                        </styled.th>
                                        <styled.th textAlign="left" p="2">
                                            End
                                        </styled.th>
                                        <styled.th textAlign="left" p="2">
                                            Summary
                                        </styled.th>
                                        <styled.th textAlign="left" p="2">
                                            Location
                                        </styled.th>
                                        <styled.th textAlign="left" p="2">
                                            Team
                                        </styled.th>
                                        <styled.th textAlign="left" p="2">
                                            Ring road
                                        </styled.th>
                                        <styled.th textAlign="left" p="2">
                                            Trolley / assistance
                                        </styled.th>
                                        <styled.th textAlign="left" p="2">
                                            Role Details
                                        </styled.th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => {
                                        const { exhibitor } = item
                                        const needs = exhibitor
                                            ? [
                                                  exhibitor.trolley && `Trolley: ${exhibitor.trolley}`,
                                                  exhibitor.loadingDockAssistance &&
                                                      `Loading dock: ${exhibitor.loadingDockAssistance}`,
                                                  exhibitor.porterAssistance && `Porter: ${exhibitor.porterAssistance}`,
                                              ].filter((need): need is string => Boolean(need))
                                            : []

                                        return (
                                            <styled.tr key={item.id} border="admin-subtle">
                                                <styled.td p="2" whiteSpace="nowrap">
                                                    {item.startTime
                                                        ? formatTime(item.startTime)
                                                        : (exhibitor?.slot ?? 'Slot not chosen')}
                                                </styled.td>
                                                <styled.td p="2" whiteSpace="nowrap">
                                                    {formatTime(item.endTime)}
                                                </styled.td>
                                                <styled.td p="2">
                                                    {item.summary}
                                                    {exhibitor?.tier ? (
                                                        <styled.span display="block" color="admin.600">
                                                            {exhibitor.tier}
                                                        </styled.span>
                                                    ) : null}
                                                </styled.td>
                                                <styled.td p="2">
                                                    {item.locations.length > 0
                                                        ? item.locations.join(', ')
                                                        : exhibitor
                                                          ? 'Space TBC'
                                                          : ''}
                                                </styled.td>
                                                <styled.td p="2">{item.teams.join(', ')}</styled.td>
                                                <styled.td p="2">
                                                    {exhibitor ? (exhibitor.ringRoad ? 'Yes' : 'No') : ''}
                                                </styled.td>
                                                <styled.td p="2" maxW="64">
                                                    {needs.length > 0 ? (
                                                        <styled.ul listStyle="none" p="0" m="0">
                                                            {needs.map((need) => (
                                                                <li key={need}>{need}</li>
                                                            ))}
                                                        </styled.ul>
                                                    ) : null}
                                                </styled.td>
                                                <styled.td p="2">
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
                                        )
                                    })}
                                </tbody>
                            </styled.table>
                        )}
                    </AdminCard>
                </Box>
            </AdminLayout>
        </>
    )
}
