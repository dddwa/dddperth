import { conferenceManifest } from '@conference/manifest'
import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/styled/button'
import { isRunsheetItemNow } from '~/lib/runsheets/runsheet-now'
import type { RunsheetItem } from '~/lib/runsheets/runsheet-filters'
import { css } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

/**
 * The "happening now" highlight shared by the conference-day and bump-in run
 * sheets: which rows are current, how they look, and the button that
 * scrolls to them.
 */

/**
 * The device clock, re-read on each minute boundary — run sheet times are
 * whole minutes, so a row lights up as its minute starts rather than up to a
 * tick late — and whenever the page comes back into view, since a phone's
 * timers stall while it's locked. Null during server rendering and
 * hydration, so the server's clock never decides what is highlighted and the
 * first client render matches the server's HTML.
 */
function useNow(): number | null {
    const [now, setNow] = useState<number | null>(null)
    useEffect(() => {
        let timer: number | undefined
        const tick = () => {
            const current = Date.now()
            setNow(current)
            window.clearTimeout(timer)
            timer = window.setTimeout(tick, 60_000 - (current % 60_000))
        }
        tick()
        document.addEventListener('visibilitychange', tick)
        return () => {
            window.clearTimeout(timer)
            document.removeEventListener('visibilitychange', tick)
        }
    }, [])
    return now
}

/** The ids of the rows happening now, and the first of them in display order. */
export function useRunsheetNow(items: Array<Pick<RunsheetItem, 'id' | 'startTime' | 'endTime'>>) {
    const now = useNow()
    const { timezone } = conferenceManifest.public
    const nowIds = new Set(
        now === null ? [] : items.filter((item) => isRunsheetItemNow(item, now, timezone)).map((item) => item.id),
    )
    const firstNowId = items.find((item) => nowIds.has(item.id))?.id
    return { nowIds, firstNowId }
}

/** Prefixed so a row id (a Jira key or Sessionize id) can't collide with the page's other ids. */
export const runsheetRowId = (itemId: string) => `runsheet-row-${itemId}`

/**
 * Rows happening now. A status pair rather than a brand colour because its
 * foreground is chosen to read on its background in both themes, and it
 * overrides the conference-day sheet's even-row shading too. The inset bar
 * keeps the rows distinct from that shading for anyone who can't tell the
 * colours apart, alongside `NowLabel`.
 */
export const runsheetNowRowClass = css({
    bg: 'status.success.bg',
    color: 'status.success.fg',
    boxShadow: '[inset 6px 0 0 token(colors.status.success.emphasis)]',
    _even: { bg: 'status.success.bg', _light: { color: 'status.success.fg' } },
    // Scrolled to by "Jump to now": clear the sticky toolbar, two rows deep on a phone.
    scrollMarginTop: '[8rem]',
})

/** Put at the top of a current row's time cell, so "now" isn't told by colour alone. */
export function NowLabel() {
    return (
        <styled.span display="block" fontSize="xs" fontWeight="bold" textTransform="uppercase">
            Now
        </styled.span>
    )
}

/** Scrolls to the first current row. Render it only when there is one. */
export function JumpToNowButton({ itemId, boxShadow }: { itemId: string; boxShadow?: 'md' }) {
    return (
        <Button
            type="button"
            size="sm"
            boxShadow={boxShadow}
            onClick={() =>
                document.getElementById(runsheetRowId(itemId))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        >
            Jump to now
        </Button>
    )
}
