import { conferenceManifest } from '@conference/manifest'
import { useConferenceClock } from '~/lib/dates/use-conference-clock'
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

/** The ids of the rows happening now, and the first of them in display order. */
export function useRunsheetNow(items: Array<Pick<RunsheetItem, 'id' | 'startTime' | 'endTime'>>, serverNow: string) {
    const now = useConferenceClock(serverNow, 60_000)
    const { timezone } = conferenceManifest.public
    const nowIds = new Set(
        now === undefined ? [] : items.filter((item) => isRunsheetItemNow(item, now, timezone)).map((item) => item.id),
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
    boxShadow: 'current-row',
    // The table's even-row selector, repeated so this wins over its shading.
    '&:nth-child(even of :not([data-section-heading]))': {
        bg: 'status.success.bg',
        _light: { color: 'status.success.fg' },
    },
    // Scrolled to by "Jump to now": clear the sticky toolbar, two rows deep on a phone.
    scrollMarginTop: '32',
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
