import { DateTime } from 'luxon'
import { useEffect, useSyncExternalStore } from 'react'
import { useFetcher, useRevalidator } from 'react-router'
import { FloatingPanel } from '~/components/floating-panel'
import { Button } from '~/components/ui/styled/button'
import { styled } from '~/styled-system/jsx'

/** How often an open run sheet refreshes itself — the server's conference-day Jira cache time. */
const AUTO_REFRESH_MS = 5 * 60 * 1000

const PANEL_ID = 'runsheet-updates'

function subscribeToOnline(onChange: () => void) {
    window.addEventListener('online', onChange)
    window.addEventListener('offline', onChange)
    return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
    }
}

/**
 * "Last updated" for the run sheet, a manual Refresh, and a notice when
 * offline — as a floating button that pops out a panel. The page holds the whole run sheet in memory, so it also refreshes
 * itself when the tab comes back into view and every few minutes while open —
 * otherwise a volunteer who opened it first thing would filter the morning's
 * run sheet all day.
 *
 * Refreshing is skipped while offline: a failed reload would replace the page
 * with an error, when the copy already on screen is still the best there is.
 */
export function RunsheetFreshness({
    fetchedAt,
    timezone,
    clearsJiraCache,
}: {
    fetchedAt: string
    timezone: string
    /**
     * An admin's Refresh also clears the server's Jira cache (the page's
     * `intent=refresh` action), so it shows Jira as it is right now. Everyone
     * else's reloads through that cache, which is what keeps a busy morning
     * inside the Jira API budget.
     */
    clearsJiraCache: boolean
}) {
    const revalidator = useRevalidator()
    const cacheClear = useFetcher()
    // Assumed online during server rendering; corrected on hydration.
    const online = useSyncExternalStore(
        subscribeToOnline,
        () => navigator.onLine,
        () => true,
    )

    useEffect(() => {
        const refresh = () => {
            if (navigator.onLine && document.visibilityState === 'visible') void revalidator.revalidate()
        }
        const timer = window.setInterval(refresh, AUTO_REFRESH_MS)
        document.addEventListener('visibilitychange', refresh)
        return () => {
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', refresh)
        }
        // `revalidate` is stable across renders; depending on the whole
        // revalidator object would restart the timer on every state change.
    }, [revalidator.revalidate])

    const updated = DateTime.fromISO(fetchedAt, { zone: timezone })
    const refreshing = revalidator.state === 'loading' || cacheClear.state !== 'idle'
    const refresh = () => {
        // The action redirects back to this page, which reloads its data.
        if (clearsJiraCache) void cacheClear.submit({ intent: 'refresh' }, { method: 'post' })
        else void revalidator.revalidate()
    }

    const time = updated.isValid ? updated.toFormat('h:mm a') : 'unknown'

    return (
        <>
            {/* The trigger carries the gist — how fresh, or that it's
                refreshing or offline — so the panel is only needed to act.
                Solid, like the Filter button: the outline variant's text is
                coloured for the dark site background, and all but vanished on
                the white this floats over. The hidden suffix says what it
                opens, after the visible text so voice control still matches. */}
            <Button type="button" size="sm" boxShadow="md" popoverTarget={PANEL_ID}>
                {refreshing ? 'Refreshing…' : online ? `Updated ${time}` : `Offline · ${time}`}
                <styled.span srOnly>, refresh options</styled.span>
            </Button>
            <FloatingPanel id={PANEL_ID} label="Run sheet updates">
                <styled.p role="status" fontSize="sm" mb="3">
                    {refreshing ? (
                        'Refreshing…'
                    ) : (
                        <>
                            Last updated{' '}
                            <time dateTime={fetchedAt}>
                                {updated.isValid ? updated.toFormat('ccc d LLL, h:mm a') : 'unknown'}
                            </time>
                            {online ? null : (
                                <>
                                    <br />
                                    You’re offline, so this is the last copy saved on this device.
                                </>
                            )}
                        </>
                    )}
                </styled.p>
                <Button type="button" size="sm" onClick={refresh} disabled={!online || refreshing}>
                    Refresh
                </Button>
            </FloatingPanel>
        </>
    )
}
