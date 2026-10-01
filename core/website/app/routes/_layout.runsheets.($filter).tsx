import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useState } from 'react'
import {
    data,
    redirect,
    useFetcher,
    useLoaderData,
    useSearchParams,
    type ShouldRevalidateFunctionArgs,
} from 'react-router'
import { AppLink } from '~/components/app-link'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { RunsheetFreshness } from '~/components/runsheet-freshness'
import { JumpToNowButton, useRunsheetNow } from '~/components/runsheet-now'
import { RunsheetSessionModal } from '~/components/runsheet-session-modal'
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
import { getPublishedSchedule } from '~/lib/published-agenda.server'
import { recordException } from '~/lib/record-exception'
import { isVolunteerRole } from '~/lib/services/volunteers-store'
import { getRunsheetCacheState, invalidateRunsheetCache } from '~/lib/runsheets/cache-generation.server'
import { compareRunsheetItems, fetchRunsheet, sessionsToRunsheetItems } from '~/lib/runsheets/runsheet-client.server'
import { requireRunsheetOpen } from '~/lib/runsheets/runsheet-availability.server'
import { AGENDA_TEAM_FILTER, filterRunsheetItems, parseRunsheetFilters } from '~/lib/runsheets/runsheet-filters'
import { noIndexMeta } from '~/lib/seo'
import { getConferenceState, getConfig, getServices } from '~/remix-app-load-context'
import { styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.runsheets.($filter)'
import type { loader as sessionLoader } from './api.runsheets.session.$sessionId'

/**
 * The volunteer run sheet. Deliberately public — volunteers need it on the
 * day without an account — but `noindex`, because it is only meaningful to
 * people who were sent the link and shouldn't turn up in search results.
 *
 * It carries no personal information: times, locations, team labels and
 * publicly-shared Confluence links, plus the published agenda's sessions (whose
 * titles and speaker names are already public on /agenda). Anything sensitive
 * must not be added to the fields this page renders (see the schema in
 * runsheet-client.server.ts).
 */
export const meta = noIndexMeta

/**
 * How long Jira responses stay cached: the same minute an open page waits
 * between refreshes (see RunsheetFreshness), so an edit in Jira reaches every
 * open run sheet within about two minutes. The cache is shared per data
 * centre, so Jira sees about two calls a minute however many volunteers have
 * the page open.
 */
const CACHE_TTL_SECONDS = 60

/**
 * Admin-only: every run sheet view re-reads Jira on its next load. The form
 * posts to the current URL, so the redirect keeps the page's filters.
 */
export async function action({ request, context }: Route.ActionArgs) {
    if (!conferenceManifest.runsheets) {
        throw new Response('Not Found', { status: 404 })
    }
    requireRunsheetOpen(context)
    const formData = await request.formData()
    if (formData.get('intent') === 'refresh') {
        const admin = await requireAdmin(request, context)
        await invalidateRunsheetCache(getServices(context), admin.email)
    }
    // No redirect: this is only posted by RunsheetFreshness's fetcher, which
    // revalidates the page's loaders itself. A redirect built from
    // `request.url` would also point at the single-fetch `/runsheets.data`
    // endpoint, and a fetcher that gets a redirect navigates the page to it.
    return null
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
    const config = conferenceManifest.runsheets
    if (!config) {
        throw new Response('Not Found', { status: 404 })
    }
    requireRunsheetOpen(context)

    // The filter used to be a single `/runsheets/team.team-1` path segment,
    // and those links went out to volunteers — carry them over to the query
    // string, where the parser below still vets the value.
    if (params.filter) {
        const [kind, value] = params.filter.split(/\.(.*)/)
        const legacy =
            (kind === 'team' || kind === 'location') && value ? `?${new URLSearchParams({ [kind]: value })}` : ''
        throw redirect(`/runsheets${legacy}`)
    }

    // Same Jira credentials the sponsor portal sync uses — one set of secrets,
    // read once in build-config.server.ts.
    const { apiEmail, apiToken, apiBaseUrl } = getConfig(context).jira

    const conferenceState = getConferenceState(context)
    const { timezone } = conferenceManifest.public
    const services = getServices(context)
    const [cacheState, user] = await Promise.all([getRunsheetCacheState(services), getUser(request.headers, services)])

    // Always the whole run sheet: the page filters it in the browser, so
    // changing a filter needs nothing more from the server.
    const [jira, schedule, volunteerSettings] = await Promise.all([
        fetchRunsheet({
            config,
            apiEmail,
            apiToken,
            apiBaseUrl,
            cacheTtlSeconds: CACHE_TTL_SECONDS,
            cacheGeneration: cacheState.generation,
            timezone,
        }),
        // The *published* schedule only: this page is public, so a draft
        // agenda here would announce talks early. A Sessionize outage drops
        // the talks rather than taking the volunteers' Jira items down too.
        getPublishedSchedule(context, conferenceState.conference.year).catch((error: unknown) => {
            recordException(error, { attributes: { route: 'runsheets' } })
            return undefined
        }),
        // A failure costs the info links, not the run sheet.
        services.adminSettings.get('volunteers').catch((error: unknown) => {
            recordException(error, { attributes: { route: 'runsheets' } })
            return null
        }),
    ])

    const sessions = schedule?.rooms.flatMap((room) => room.sessions) ?? []
    const sessionItems = sessionsToRunsheetItems(sessions, config, { placeholders: jira.placeholders, timezone })
    const items = [...jira.items, ...sessionItems].sort(compareRunsheetItems(timezone))

    // Every team's admin-entered info links, keyed by team label. A team's
    // volunteer role id is its label minus `team-` (see VOLUNTEER_ROLES).
    const teamLinks = Object.fromEntries(
        Object.keys(config.teamLabels).flatMap((team) => {
            const role = team.replace(/^team-/, '')
            const links = isVolunteerRole(role) ? volunteerSettings?.value.roleLinks[role] : undefined
            return links?.length ? [[team, links] as const] : []
        }),
    )

    const canRefresh = await isAdminUser(user, services)

    return data(
        {
            items,
            teamLinks,
            canRefresh,
            hasBumpIn: Boolean(config.bumpIn),
            teamLabels: config.teamLabels,
            teamIcons: config.teamIcons ?? {},
            locationLabels: config.locationLabels,
            fetchedAt: jira.fetchedAt,
        },
        // Not cached by the browser: the page refreshes itself, and a cached
        // copy would make Refresh a no-op. Jira is still protected by the
        // server-side cache in fetchRunsheet. Never stored at all while an
        // admin is looking, so a shared cache can't hand them the
        // pre-refresh page.
        { headers: { 'Cache-Control': canRefresh ? 'private, no-store' : 'no-cache' } },
    )
}

/**
 * Changing the filters only changes the query string, and the page already
 * holds the whole run sheet — so that alone doesn't reload it. Everything
 * else (a refresh, the legacy `/runsheets/team.x` redirect) does.
 */
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
    if (currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search) return false
    return defaultShouldRevalidate
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

/** "9:30 AM – 10:15 AM", or just the start when there's no end. */
function formatTimeRange(start: string | null, end: string | null): string {
    return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

export default function Runsheets() {
    const {
        items: allItems,
        teamLinks,
        teamLabels,
        teamIcons,
        locationLabels,
        fetchedAt,
        canRefresh,
        hasBumpIn,
    } = useLoaderData<typeof loader>()
    const [searchParams] = useSearchParams()
    // Filtered here, not in the loader, so a filter change is instant and
    // works offline. The server renders the same filter first, from the URL.
    const filters = parseRunsheetFilters(searchParams, { teamLabels, locationLabels })
    const items = filterRunsheetItems(allItems, filters)
    const { nowIds, firstNowId } = useRunsheetNow(items)
    const selectedTeamLinks = filters.teams.flatMap((team) =>
        teamLinks[team] ? [{ team, label: teamLabels[team] ?? team, links: teamLinks[team] }] : [],
    )
    const { teamOptions, locationOptions } = runsheetFilterOptions({ teamLabels, teamIcons, locationLabels })
    useRunsheetOffline()

    const [openItem, setOpenItem] = useState<(typeof items)[number] | null>(null)
    const sessionFetcher = useFetcher<typeof sessionLoader>()

    const openSession = (item: (typeof items)[number]) => {
        setOpenItem(item)
        void sessionFetcher.load(`/api/runsheets/session/${item.sessionizeSessionId}`)
    }

    return (
        <>
            <RunsheetToolbar>
                {hasBumpIn ? (
                    <Button asChild size="sm" boxShadow="md">
                        <AppLink unstyled to="/runsheets/bump-in">
                            Bump-in run sheet
                        </AppLink>
                    </Button>
                ) : null}
                {firstNowId ? <JumpToNowButton itemId={firstNowId} boxShadow="md" /> : null}
                <RunsheetFilterButton filters={filters} />
                <RunsheetFreshness
                    fetchedAt={fetchedAt}
                    timezone={conferenceManifest.public.timezone}
                    clearsJiraCache={canRefresh}
                />
            </RunsheetToolbar>
            <AdminLayout heading="Runsheets" fullWidth bareOnSmallScreens gutter>
                <AdminCard overflow="auto" bareOnSmallScreens>
                    {selectedTeamLinks.map((team) => (
                        <styled.section key={team.team} aria-labelledby={`team-links-${team.team}`} mb="4">
                            <styled.h2 id={`team-links-${team.team}`} fontSize="md" fontWeight="semibold" mb="1">
                                {team.label} info
                            </styled.h2>
                            <styled.ul listStyleType="disc" pl="5">
                                {team.links.map((link) => (
                                    <li key={link.url}>
                                        <AppLink to={link.url} unstyled textDecoration="underline">
                                            {link.title}
                                        </AppLink>
                                    </li>
                                ))}
                            </styled.ul>
                        </styled.section>
                    ))}

                    <RunsheetTable
                        items={items}
                        nowIds={nowIds}
                        teamIcons={teamIcons}
                        formatTime={formatTime}
                        emptyMessage="No run sheet items match this filter."
                        onOpenSession={openSession}
                    />
                </AdminCard>
                <RunsheetFilterPanel
                    filters={filters}
                    // "Agenda" first, with the 📢 its rows carry, so a team can keep
                    // the sessions in view around its own items.
                    teamOptions={[{ value: AGENDA_TEAM_FILTER, label: '📢 Agenda' }, ...teamOptions]}
                    locationOptions={locationOptions}
                    clearTo="/runsheets"
                    showAgendaSwitch
                />
                <RunsheetSessionModal
                    title={openItem?.summary ?? null}
                    when={formatTimeRange(openItem?.startTime ?? null, openItem?.endTime ?? null)}
                    where={openItem?.locations.join(', ') ?? ''}
                    loading={sessionFetcher.state !== 'idle'}
                    detail={sessionFetcher.data}
                    onClose={() => setOpenItem(null)}
                />
            </AdminLayout>
        </>
    )
}
