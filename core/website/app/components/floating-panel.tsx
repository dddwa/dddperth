import type { ReactNode } from 'react'
import { css } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

/**
 * Put on the toolbar holding the floating buttons: panels open just under it,
 * right-aligned, wherever it has scrolled or stuck to.
 */
export const floatingPanelAnchorClass = css({ anchorName: '--floating-panel-anchor' })

/**
 * Popovers render in the top layer, detached from their button, so they're
 * tethered with CSS anchor positioning. Browsers without it get a fixed spot
 * near the top-right instead — close to a toolbar stuck to the top.
 */
const panelClass = css({
    position: 'fixed',
    inset: 'auto',
    m: '0',
    top: '16',
    right: '4',
    '@supports (anchor-name: --a)': {
        positionAnchor: '--floating-panel-anchor',
        top: '[anchor(bottom)]',
        right: '[anchor(right)]',
        mt: '2',
    },
    w: '[max-content]',
    maxW: '[calc(100vw - 2rem)]',
    maxH: '[70vh]',
    overflow: 'auto',
    p: '4',
    bg: 'white',
    color: 'admin.900',
    border: 'admin-subtle',
    borderRadius: 'lg',
    boxShadow: 'lg',
})

/**
 * A panel that pops out over the page from a button, using the native popover
 * API: open/close, Escape, click-outside and the trigger's expanded state all
 * come from the browser, with no JS needed. Open it from a button with
 * `popoverTarget={id}`, inside an element carrying `floatingPanelAnchorClass`.
 */
export function FloatingPanel({ id, label, children }: { id: string; label: string; children: ReactNode }) {
    return (
        <styled.div id={id} popover="auto" aria-label={label} className={panelClass}>
            {children}
        </styled.div>
    )
}
