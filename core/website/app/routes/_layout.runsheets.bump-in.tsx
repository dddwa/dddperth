import { conferenceManifest } from '@conference/manifest'
import type { RunsheetsBumpInConfig, RunsheetsConfig } from '@ddd/conference-config'
import { DateTime } from 'luxon'
import { data, useLoaderData, useSearchParams, type ShouldRevalidateFunctionArgs } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { RunsheetFreshness } from '~/components/runsheet-freshness'
import { JumpToNowButton, useRunsheetNow } from '~/components/runsheet-now'
import {
    RunsheetFilterButton,
    RunsheetFilterPanel,
    runsheetFilterOptions,
    RunsheetTable,
    RunsheetToolbar,
    useRunsheetOffline,
} from '~/components/runsheet-table'
import { Button } from '~/components/ui/styled/button'
import { getUser, isAdminUser, requireAdmin } from '~/lib/auth.server'
import { getRunsheetCacheState, invalidateRunsheetCache } from '~/lib/runsheets/cache-generation.server'
import { requireRunsheetOpen } from '~/lib/runsheets/runsheet-availability.server'
import { fetchRunsheet } from '~/lib/runsheets/runsheet-client.server'
import { filterRunsheetItems, labelsInUse, parseRunsheetFilters } from '~/lib/runsheets/runsheet-filters'
import { type BumpInItem, fetchSponsorBumpIn, sortByStartTime } from '~/lib/runsheets/sponsor-bump-in.server'
import { noIndexMeta } from '~/lib/seo'
import { getConfig, getServices } from '~/remix-app-load-context'
import { styled } from '~/styled-system/jsx'
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

/**
 * Bump-in is the day before, and plans move right up to it. A minute matches
 * how often an open page reloads itself, so a Jira edit reaches it within
 * about two minutes with no refresh button, while still capping Jira at three
 * calls a minute.
 */
const CACHE_TTL_SECONDS = 60

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

    const [volunteer, exhibitorItems] = await Promise.all([
        fetchRunsheet({ ...shared, jql: bumpIn.volunteerJql, timezone }),
        fetchSponsorBumpIn({ ...shared, bumpIn }),
    ])
    const items: BumpInItem[] = [...volunteer.items, ...exhibitorItems]
    // The sponsor rows go through the same Jira cache, so the volunteer
    // board's fetch time stands for both.
    return { config, items: sortByStartTime(items), fetchedAt: volunteer.fetchedAt }
}

/** Admin-only: make both run sheets re-read Jira on their next load. */
export async function action({ request, context }: Route.ActionArgs) {
    requireBumpInConfig()
    requireRunsheetOpen(context)
    const formData = await request.formData()
    if (formData.get('intent') === 'refresh') {
        const admin = await requireAdmin(request, context)
        await invalidateRunsheetCache(getServices(context), admin.email)
    }
    // No redirect: only RunsheetFreshness's fetcher posts here, and it
    // revalidates the page's loaders itself (see the /runsheets action).
    return null
}

export async function loader({ request, context }: Route.LoaderArgs) {
    requireRunsheetOpen(context)
    const services = getServices(context)
    const [cacheState, user] = await Promise.all([getRunsheetCacheState(services), getUser(request.headers, services)])
    // Always the whole run sheet: the page filters it in the browser.
    const { config, items, fetchedAt } = await loadBumpIn(context, cacheState.generation)
    const canRefresh = await isAdminUser(user, services)

    return data(
        {
            items,
            canRefresh,
            teamLabels: config.teamLabels,
            teamIcons: config.teamIcons ?? {},
            locationLabels: config.locationLabels,
            fetchedAt,
        },
        // As /runsheets: not cached by the browser, and never stored at all
        // while an admin is looking.
        { headers: { 'Cache-Control': canRefresh ? 'private, no-store' : 'no-cache' } },
    )
}

/** As /runsheets: a filter change only changes the query string, so it doesn't reload. */
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
    if (currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search) return false
    return defaultShouldRevalidate
}

/** Time in the conference's zone. The day is the section's heading. */
function formatTime(isoDateTime: string | null): string {
    if (!isoDateTime) return '-'
    const dateTime = DateTime.fromISO(isoDateTime, { zone: conferenceManifest.public.timezone })
    return dateTime.isValid ? dateTime.toFormat('h:mm a') : '-'
}

/** "Friday 2 October" — bump-in spans Friday and Saturday morning. Untimed rows sort last, into their own section. */
function dayOf(item: BumpInItem): string {
    const dateTime = item.startTime
        ? DateTime.fromISO(item.startTime, { zone: conferenceManifest.public.timezone })
        : null
    return dateTime?.isValid ? dateTime.toFormat('cccc d LLLL') : 'Time to be confirmed'
}

/** What an exhibitor needs help with on arrival, one per line. */
function exhibitorNeeds(exhibitor: NonNullable<BumpInItem['exhibitor']>) {
    const needs = [
        exhibitor.trolley && `Trolley: ${exhibitor.trolley}`,
        exhibitor.loadingDockAssistance && `Loading dock: ${exhibitor.loadingDockAssistance}`,
        exhibitor.porterAssistance && `Porter: ${exhibitor.porterAssistance}`,
    ].filter((need): need is string => Boolean(need))
    if (needs.length === 0) return null
    return (
        <styled.ul listStyle="none" display="inline">
            {needs.map((need) => (
                <li key={need}>{need}</li>
            ))}
        </styled.ul>
    )
}

export default function BumpInRunsheet() {
    const {
        items: allItems,
        canRefresh,
        teamLabels,
        teamIcons,
        locationLabels,
        fetchedAt,
    } = useLoaderData<typeof loader>()
    const [searchParams] = useSearchParams()
    // No agenda sessions on this run sheet, so no Agenda team or Show Agenda.
    const filters = parseRunsheetFilters(searchParams, { teamLabels, locationLabels }, { agenda: false })
    const items = filterRunsheetItems(allItems, filters).map((item) =>
        item.exhibitor && item.locations.length === 0 ? { ...item, locations: ['Space TBC'] } : item,
    )
    const { nowIds, firstNowId } = useRunsheetNow(items)
    useRunsheetOffline()
    const filterOptions = runsheetFilterOptions({
        teamLabels: labelsInUse(
            teamLabels,
            allItems.flatMap((item) => item.teamKeys),
        ),
        teamIcons,
        locationLabels: labelsInUse(
            locationLabels,
            allItems.flatMap((item) => item.locationKeys),
        ),
    })

    return (
        <>
            <RunsheetToolbar>
                <Button asChild size="sm" boxShadow="md">
                    <AppLink unstyled to="/runsheets">
                        Conference day run sheet
                    </AppLink>
                </Button>
                {firstNowId ? <JumpToNowButton itemId={firstNowId} boxShadow="md" /> : null}
                <RunsheetFilterButton filters={filters} />
                <RunsheetFreshness
                    fetchedAt={fetchedAt}
                    timezone={conferenceManifest.public.timezone}
                    clearsJiraCache={canRefresh}
                />
            </RunsheetToolbar>
            <AdminLayout heading="Bump-in run sheet" fullWidth bareOnSmallScreens gutter>
                <AdminCard overflow="auto" bareOnSmallScreens>
                    <RunsheetTable
                        items={items}
                        nowIds={nowIds}
                        teamIcons={teamIcons}
                        formatTime={formatTime}
                        emptyMessage={
                            allItems.length === 0
                                ? 'Nothing is scheduled for bump-in yet.'
                                : 'No run sheet items match this filter.'
                        }
                        startFallback={(item) => item.exhibitor?.slot ?? (item.exhibitor ? 'Slot not chosen' : '-')}
                        summaryExtra={(item) =>
                            item.exhibitor?.tier ? (
                                <styled.span display="block" fontWeight="normal">
                                    {item.exhibitor.tier}
                                </styled.span>
                            ) : null
                        }
                        sectionOf={dayOf}
                        extraColumns={[
                            {
                                header: 'Ring road',
                                cell: (item) => (item.exhibitor ? (item.exhibitor.ringRoad ? 'Yes' : 'No') : null),
                            },
                            {
                                header: 'Trolley / assistance',
                                cell: (item) => (item.exhibitor ? exhibitorNeeds(item.exhibitor) : null),
                            },
                        ]}
                    />
                </AdminCard>
                <RunsheetFilterPanel
                    filters={filters}
                    {...filterOptions}
                    clearTo="/runsheets/bump-in"
                    // Their room and space are free text from the sponsor
                    // issue, so a location filter has nothing to match.
                    hint="Exhibitor rows have no location to match, so a location filter hides them."
                />
            </AdminLayout>
        </>
    )
}
