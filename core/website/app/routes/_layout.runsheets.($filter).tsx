import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { Fragment, useEffect, useState } from 'react'
import {
    data,
    Form,
    redirect,
    useFetcher,
    useLoaderData,
    useSearchParams,
    type ShouldRevalidateFunctionArgs,
} from 'react-router'
import { AppLink } from '~/components/app-link'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { FloatingPanel, floatingPanelAnchorClass } from '~/components/floating-panel'
import { RunsheetFreshness } from '~/components/runsheet-freshness'
import {
    JumpToNowButton,
    NowLabel,
    runsheetNowRowClass,
    runsheetRowId,
    useRunsheetNow,
} from '~/components/runsheet-now'
import { RunsheetSessionModal } from '~/components/runsheet-session-modal'
import { Button } from '~/components/ui/styled/button'
import ConfluenceLogo from '~/images/svg/confluence-icon.svg?react'
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
import { css, cx } from '~/styled-system/css'
import { Flex, styled } from '~/styled-system/jsx'
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

/**
 * Below 50em the table would be squeezed into unreadable columns, so each row
 * becomes a small grid instead — time beside the summary, with related and
 * details under the summary — and the header row goes, since the layout itself says what each
 * part is. From 50em up it's a plain table.
 * Mobile-first: the grid is the base, the table display is restored above.
 */
const FILTER_PANEL_ID = 'runsheet-filters'

/** 20px in from the right edge and 20px down, and 20px from the top once stuck. */
const toolbarClass = css({ mt: '[20px]', mr: '[20px]', top: '[20px]' })

const WIDE = '@media (min-width: 50em)'
const tableClass = css({ display: 'block', [WIDE]: { display: 'table' } })
const theadClass = css({ display: 'none', [WIDE]: { display: 'table-header-group' } })
const tbodyClass = css({ display: 'block', [WIDE]: { display: 'table-row-group' } })
const rowClass = css({
    display: 'grid',
    gridTemplateAreas: '"time summary summary" ". related details"',
    gridTemplateColumns: 'auto 1fr auto',
    columnGap: '2',
    py: '2',
    // Alternate rows shaded, so a line is easy to follow across a wide table.
    // indigo.11 is light in the dark theme and dark in the light one, so the
    // text flips to white there: the dark admin text would be 2.96:1 on it,
    // under WCAG AA's 4.5:1 (white is 6.0:1; dark text on the dark theme's
    // shade is 8.6:1).
    _even: { bg: 'indigo.11', _light: { color: 'white' } },
    [WIDE]: { display: 'table-row', py: '0' },
})
const startTimeClass = css({ fontWeight: 'bold', [WIDE]: { fontWeight: 'normal' } })
const cellClass = {
    time: css({ gridArea: 'time', [WIDE]: { display: 'table-cell' } }),
    // Bold on small screens, where they head each stacked row.
    summary: css({ gridArea: 'summary', fontWeight: 'bold', [WIDE]: { display: 'table-cell', fontWeight: 'normal' } }),
    related: css({ gridArea: 'related', [WIDE]: { display: 'table-cell' } }),
    details: css({ gridArea: 'details', [WIDE]: { display: 'table-cell' } }),
}

/** A row's locations, then its teams on the next line, each comma-separated. */
function RelatedList({
    locations,
    teams,
}: {
    locations: string[]
    /** A team shows as its icon, where it has one, named for screen readers and on hover. */
    teams: Array<{ label: string; icon: string | undefined }>
}) {
    return (
        <>
            {locations.length ? <p>{locations.join(', ')}</p> : null}
            {teams.length ? (
                <p>
                    {teams.map(({ label, icon }, i) => (
                        <Fragment key={label}>
                            {i > 0 ? ', ' : null}
                            {icon ? (
                                <span role="img" aria-label={label} title={label}>
                                    {icon}
                                </span>
                            ) : (
                                label
                            )}
                        </Fragment>
                    ))}
                </p>
            ) : null}
        </>
    )
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
    const activeFilterCount = filters.teams.length + filters.locations.length
    // Hidden when nothing on screen has a link, rather than an empty column.
    const showRoleDetails = items.some((item) => item.roleInstructionsUrl)
    const selectedTeamLinks = filters.teams.flatMap((team) =>
        teamLinks[team] ? [{ team, label: teamLabels[team] ?? team, links: teamLinks[team] }] : [],
    )
    const toOptions = (labels: Record<string, string>) =>
        Object.entries(labels).map(([value, label]) => ({ value, label }))
    // Each team's icon in front of its name, so the options match the Related column.
    // "Agenda" first, with the 📢 its rows carry, so a team can keep the
    // sessions in view around its own items.
    const teamOptions = [
        { value: AGENDA_TEAM_FILTER, label: '📢 Agenda' },
        ...toOptions(teamLabels).map((option) => {
            const icon = teamIcons[option.value]
            return icon ? { ...option, label: `${icon} ${option.label}` } : option
        }),
    ]
    const locationOptions = toOptions(locationLabels)

    // Keeps a copy of the page and its data so it still opens with no
    // connection (see public/runsheets-sw.js). Not in dev, where it would
    // cache Vite's modules over hot reloads.
    useEffect(() => {
        if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
        navigator.serviceWorker.register('/runsheets-sw.js', { scope: '/runsheets' }).catch((error: unknown) => {
            console.warn('Run sheet offline support unavailable', error)
        })
    }, [])

    const [openItem, setOpenItem] = useState<(typeof items)[number] | null>(null)
    const sessionFetcher = useFetcher<typeof sessionLoader>()

    const openSession = (item: (typeof items)[number]) => {
        setOpenItem(item)
        void sessionFetcher.load(`/api/runsheets/session/${item.sessionizeSessionId}`)
    }

    return (
        <>
            {/* Just below the site header, sticking to the top once scrolled
                past, so the filters and freshness stay to hand however far down
                the run sheet a volunteer is. The panels open under it. */}
            <Flex
                className={cx(floatingPanelAnchorClass, toolbarClass)}
                position="sticky"
                zIndex="docked"
                justifyContent="flex-end"
                // Wraps on a phone: four buttons don't fit in one row at 390px.
                flexWrap="wrap"
                gap="2"
                mb="2"
            >
                {hasBumpIn ? (
                    <Button asChild size="sm" boxShadow="md">
                        <AppLink unstyled to="/runsheets/bump-in">
                            Bump-in run sheet
                        </AppLink>
                    </Button>
                ) : null}
                {firstNowId ? <JumpToNowButton itemId={firstNowId} boxShadow="md" /> : null}
                <Button type="button" size="sm" boxShadow="md" popoverTarget={FILTER_PANEL_ID}>
                    Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
                </Button>
                <RunsheetFreshness
                    fetchedAt={fetchedAt}
                    timezone={conferenceManifest.public.timezone}
                    clearsJiraCache={canRefresh}
                />
            </Flex>
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

                    {items.length === 0 ? (
                        <styled.p p="2">No run sheet items match this filter.</styled.p>
                    ) : (
                        <styled.table width="full" fontSize="sm" className={tableClass}>
                            <thead className={theadClass}>
                                <tr>
                                    {/* Time and Details shrink to fit (a 1% width is
                                    the table idiom for that), Related gets a fixed slice,
                                    and Summary takes everything left. */}
                                    <styled.th textAlign="left" p="2" w="[1%]" whiteSpace="nowrap">
                                        Time
                                    </styled.th>
                                    <styled.th textAlign="left" p="2">
                                        Summary
                                    </styled.th>
                                    {/* Table cells ignore min-width, so the 40ch floor goes in the width. */}
                                    <styled.th textAlign="left" p="2" w="[max(20%, 40ch)]">
                                        Related
                                    </styled.th>
                                    {showRoleDetails ? (
                                        <styled.th textAlign="left" p="2" w="[1%]" whiteSpace="nowrap">
                                            Details
                                        </styled.th>
                                    ) : null}
                                </tr>
                            </thead>
                            <tbody className={tbodyClass}>
                                {items.map((item) => {
                                    const isNow = nowIds.has(item.id)
                                    return (
                                        <styled.tr
                                            key={item.id}
                                            id={runsheetRowId(item.id)}
                                            aria-current={isNow ? 'time' : undefined}
                                            border="admin-subtle"
                                            className={cx(rowClass, isNow && runsheetNowRowClass)}
                                        >
                                            <styled.td p="2" whiteSpace="nowrap" className={cellClass.time}>
                                                {isNow ? <NowLabel /> : null}
                                                {/* Start and end on their own lines, keeping the column narrow. */}
                                                <span className={startTimeClass}>{formatTime(item.startTime)}</span>
                                                {item.endTime ? (
                                                    <>
                                                        {' –'}
                                                        <br />
                                                        <styled.span pl="[1ch]">{formatTime(item.endTime)}</styled.span>
                                                    </>
                                                ) : null}
                                            </styled.td>
                                            <styled.td p="2" className={cellClass.summary}>
                                                {item.source === 'agenda' ? (
                                                    <span role="img" aria-label="Agenda session">
                                                        📢{' '}
                                                    </span>
                                                ) : null}
                                                {item.sessionizeSessionId ? (
                                                    <styled.button
                                                        type="button"
                                                        onClick={() => openSession(item)}
                                                        aria-haspopup="dialog"
                                                        bg="transparent"
                                                        border="none"
                                                        p="0"
                                                        color="[inherit]"
                                                        font="inherit"
                                                        textAlign="left"
                                                        textDecoration="underline"
                                                        cursor="pointer"
                                                    >
                                                        {item.summary}
                                                    </styled.button>
                                                ) : (
                                                    item.summary
                                                )}
                                            </styled.td>
                                            <styled.td p="2" overflowWrap="anywhere" className={cellClass.related}>
                                                <RelatedList
                                                    locations={item.locations}
                                                    teams={item.teams.map((label, i) => ({
                                                        label,
                                                        icon: teamIcons[item.teamKeys[i]],
                                                    }))}
                                                />
                                            </styled.td>
                                            {showRoleDetails ? (
                                                <styled.td p="2" className={cellClass.details}>
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
                                            ) : null}
                                        </styled.tr>
                                    )
                                })}
                            </tbody>
                        </styled.table>
                    )}
                </AdminCard>
                <FloatingPanel id={FILTER_PANEL_ID} label="Filter the run sheet">
                    {/* A GET form, so the selection lands in the query string
                            (`?team=a&team=b`) and a filtered view is a link that can
                            be shared. Selecting nothing in a field means all of it.
                            Keyed on the filters because `defaultValue` only applies on
                            mount: without it, "Clear" would leave the old selection
                            showing over an unfiltered run sheet. */}
                    <Form
                        method="get"
                        key={JSON.stringify(filters)}
                        // Applying a filter closes the panel, so the result is in view.
                        onSubmit={() => document.getElementById(FILTER_PANEL_ID)?.hidePopover()}
                    >
                        <Flex gap="4" marginBottom="2" flexWrap="wrap" alignItems="flex-end">
                            {(
                                [
                                    {
                                        name: 'team',
                                        label: 'Team',
                                        allLabel: 'All Teams',
                                        values: filters.teams,
                                        options: teamOptions,
                                    },
                                    {
                                        name: 'location',
                                        label: 'Location',
                                        allLabel: 'All Locations',
                                        values: filters.locations,
                                        options: locationOptions,
                                    },
                                ] as const
                            ).map((field) => (
                                <Flex key={field.name} direction="column" gap="1">
                                    <styled.label htmlFor={`runsheet-${field.name}`} fontWeight="medium">
                                        {field.label}
                                    </styled.label>
                                    <styled.select
                                        id={`runsheet-${field.name}`}
                                        name={field.name}
                                        multiple
                                        size={6}
                                        // The "All" option's empty value is dropped by the
                                        // filter parser, so choosing it means no filter.
                                        defaultValue={field.values.length ? field.values : ['']}
                                        aria-describedby="runsheet-filter-hint"
                                        border="admin-subtle"
                                        p="1"
                                        borderRadius="md"
                                        minW="48"
                                    >
                                        <option value="">{field.allLabel}</option>
                                        {field.options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </styled.select>
                                </Flex>
                            ))}
                            <Flex gap="2" alignItems="center">
                                <Button type="submit">Apply Filter</Button>
                                <AppLink to="/runsheets" unstyled>
                                    Clear
                                </AppLink>
                            </Flex>
                        </Flex>
                        <styled.p id="runsheet-filter-hint" fontSize="sm" marginBottom="2">
                            Hold Ctrl (Cmd on a Mac) to select more than one.
                        </styled.p>
                    </Form>
                </FloatingPanel>
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
