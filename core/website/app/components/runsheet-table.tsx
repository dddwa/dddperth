import { Fragment, useEffect, type ReactNode } from 'react'
import { Form } from 'react-router'
import { AppLink } from '~/components/app-link'
import { FloatingPanel, floatingPanelAnchorClass } from '~/components/floating-panel'
import { NowLabel, runsheetNowRowClass, runsheetRowId } from '~/components/runsheet-now'
import { Button } from '~/components/ui/styled/button'
import ConfluenceLogo from '~/images/svg/confluence-icon.svg?react'
import { SHOW_AGENDA_PARAM, type RunsheetFilters, type RunsheetItem } from '~/lib/runsheets/runsheet-filters'
import { css, cx } from '~/styled-system/css'
import { Flex, styled } from '~/styled-system/jsx'

/**
 * The run sheet's parts: the floating toolbar, the table and the filter panel.
 */

const FILTER_PANEL_ID = 'runsheet-filters'

/**
 * Keeps a copy of the page and its data so it still opens with no connection
 * (see public/runsheets-sw.js). Not in dev, where it would cache Vite's
 * modules over hot reloads.
 */
export function useRunsheetOffline() {
    useEffect(() => {
        if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
        let registration: ServiceWorkerRegistration | undefined

        // The browser only checks for a new worker on a full page load, and
        // volunteers keep this page open all day, so a fixed worker would
        // otherwise wait until tomorrow.
        const checkForUpdate = () => {
            if (document.visibilityState === 'visible') void registration?.update().catch(() => {})
        }

        // Everything the page loaded, which the worker may have missed (see
        // the worker's message handler). The `.data` URL is what the page's
        // in-place refresh fetches, which a full page load never does — saved
        // now, a refresh that fails on bad Wi-Fi gets this copy instead of an
        // error page.
        const sendUrls = () => {
            navigator.serviceWorker.controller?.postMessage({
                type: 'cache-urls',
                urls: [
                    location.href,
                    `${location.pathname}.data${location.search}`,
                    ...performance.getEntriesByType('resource').map((entry) => entry.name),
                ],
            })
        }

        document.addEventListener('visibilitychange', checkForUpdate)
        // Again whenever a new worker takes over: it has just dropped the
        // previous worker's copies.
        navigator.serviceWorker.addEventListener('controllerchange', sendUrls)
        navigator.serviceWorker
            .register('/runsheets-sw.js', { scope: '/runsheets', updateViaCache: 'none' })
            .then((registered) => {
                registration = registered
                sendUrls()
            })
            .catch((error: unknown) => {
                console.warn('Run sheet offline support unavailable', error)
            })

        return () => {
            document.removeEventListener('visibilitychange', checkForUpdate)
            navigator.serviceWorker.removeEventListener('controllerchange', sendUrls)
        }
    }, [])
}

/** 20px in from the right edge and 20px down, and 20px from the top once stuck. */
const toolbarClass = css({ mt: '[20px]', mr: '[20px]', top: '[20px]' })

/**
 * Just below the site header, sticking to the top once scrolled past, so the
 * filters and freshness stay to hand however far down the run sheet a
 * volunteer is. The panels open under it.
 */
export function RunsheetToolbar({ children }: { children: ReactNode }) {
    return (
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
            {children}
        </Flex>
    )
}

/** Opens the filter panel, counting the filters in force. */
export function RunsheetFilterButton({ filters }: { filters: RunsheetFilters }) {
    const count = filters.teams.length + filters.locations.length + (filters.showAgenda ? 1 : 0)
    return (
        <Button type="button" size="sm" boxShadow="md" popoverTarget={FILTER_PANEL_ID}>
            Filter{count ? ` (${count})` : ''}
        </Button>
    )
}

type FilterOption = { value: string; label: string }

/**
 * The Team and Location options, with each team's icon in front of its name
 * so the options match the Related column.
 */
export function runsheetFilterOptions({
    teamLabels,
    teamIcons,
    locationLabels,
}: {
    teamLabels: Record<string, string>
    teamIcons: Record<string, string>
    locationLabels: Record<string, string>
}): { teamOptions: FilterOption[]; locationOptions: FilterOption[] } {
    const toOptions = (labels: Record<string, string>) =>
        Object.entries(labels).map(([value, label]) => ({ value, label }))
    return {
        teamOptions: toOptions(teamLabels).map((option) => {
            const icon = teamIcons[option.value]
            return icon ? { ...option, label: `${icon} ${option.label}` } : option
        }),
        locationOptions: toOptions(locationLabels),
    }
}

/**
 * The "Show Agenda" switch: an Off and an On segment, each a label over a
 * visually hidden radio, with the checked one filled in. The panel is white
 * in both themes, so the colours don't need a light/dark pair.
 */
const switchClass = css({
    '& label': {
        display: 'inline-block',
        px: '3',
        py: '1',
        border: 'admin-subtle',
        cursor: 'pointer',
        _first: { borderLeftRadius: 'full' },
        _last: { borderRightRadius: 'full' },
        '&:has(:checked)': { bg: 'admin.900', color: 'white' },
        // The radio holding focus is hidden, so its segment shows the outline.
        '&:has(:focus-visible)': { outline: '[2px solid token(colors.admin.900)]', outlineOffset: '[2px]' },
    },
    '& input': { srOnly: true },
})

export function RunsheetFilterPanel({
    filters,
    teamOptions,
    locationOptions,
    clearTo,
    showAgendaSwitch,
}: {
    filters: RunsheetFilters
    teamOptions: FilterOption[]
    locationOptions: FilterOption[]
    /** The run sheet's own path, which is that run sheet unfiltered. */
    clearTo: string
    /** Only for a run sheet that carries the agenda's sessions. */
    showAgendaSwitch?: boolean
}) {
    return (
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
                {/* First, so they're in reach without scrolling the panel
                    past two tall lists on a phone. */}
                <Flex gap="2" marginBottom="4" alignItems="center">
                    <Button type="submit">Apply Filter</Button>
                    <AppLink to={clearTo} unstyled>
                        Clear
                    </AppLink>
                </Flex>
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
                    {/* Keeps the agenda's sessions in view even when the
                        team/location selection would filter them out. A switch
                        drawn over two radios, so it submits with the GET form
                        and works from the keyboard with no JS. */}
                    {showAgendaSwitch ? (
                        <fieldset className={switchClass}>
                            <styled.legend fontWeight="medium" mb="1">
                                Show Agenda
                            </styled.legend>
                            {[
                                { value: '0', label: 'Off' },
                                { value: '1', label: 'On' },
                            ].map((option) => (
                                <label key={option.value}>
                                    <input
                                        type="radio"
                                        name={SHOW_AGENDA_PARAM}
                                        value={option.value}
                                        defaultChecked={filters.showAgenda === (option.value === '1')}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </fieldset>
                    ) : null}
                </Flex>
                <styled.p id="runsheet-filter-hint" fontSize="sm" marginBottom="2">
                    Hold Ctrl (Cmd on a Mac) to select more than one.
                </styled.p>
            </Form>
        </FloatingPanel>
    )
}

/**
 * Below 50em the table would be squeezed into unreadable columns, so each row
 * becomes a small grid instead — time beside the summary, with related and
 * details under the summary — and the header row goes, since the layout itself says what each
 * part is. From 50em up it's a plain table.
 * Mobile-first: the grid is the base, the table display is restored above.
 */
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

export function RunsheetTable<Item extends RunsheetItem>({
    items,
    nowIds,
    teamIcons,
    formatTime,
    emptyMessage,
    onOpenSession,
}: {
    items: Item[]
    nowIds: Set<string>
    teamIcons: Record<string, string>
    formatTime: (isoDateTime: string | null) => string
    emptyMessage: string
    /** Makes an agenda talk's summary a button that opens its details. */
    onOpenSession?: (item: Item) => void
}) {
    if (items.length === 0) return <styled.p p="2">{emptyMessage}</styled.p>

    // Hidden when nothing on screen has a link, rather than an empty column.
    const showRoleDetails = items.some((item) => item.roleInstructionsUrl)

    return (
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
                                {item.sessionizeSessionId && onOpenSession ? (
                                    <styled.button
                                        type="button"
                                        onClick={() => onOpenSession(item)}
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
    )
}
