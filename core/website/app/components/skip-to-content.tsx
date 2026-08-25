import { css } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

const skipLinkStyles = css({
    bg: 'black',
    color: 'white',
    left: '4',
    textDecoration: 'none',
    top: '4',
    transition: 'transform',
    zIndex: '9999',
    borderWidth: '0',
    h: '[1px]',
    m: '[-1px]',
    opacity: '0',
    overflow: 'hidden',
    p: '0',
    position: 'absolute',
    transform: '[translateY(-3rem)]',
    whiteSpace: 'nowrap',
    w: '[1px]',
    clipPath: '[inset(50%)]',
    _focus: {
        clipPath: 'none',
        margin: 'auto',
        opacity: '1',
        p: '4',
        position: 'fixed',
        transform: '[translateY(0)]',
        w: 'auto',
        h: 'auto',
    },
})

/**
 * WCAG 2.4.1 (Bypass Blocks) skip links. Rendered once, as the very first
 * focusable elements in the document (see `_layout.tsx`), so a keyboard
 * user's first Tab press lands here before the header/nav — not after it.
 *
 * Three targets, each a real, focusable landmark:
 * - `#main` — every page's `<main>` landmark (`_layout.tsx`).
 * - `#header` — the header itself (`Header`, `header.tsx`), shown at `lg+`
 *   where the primary nav lives directly inside the header.
 * - `#navigation` — the hamburger menu button (`Header`'s `MenuButton`),
 *   shown below `lg` where the nav is otherwise hidden inside a closed
 *   drawer; jumping here lets a keyboard user open it directly.
 *
 * The `lg` breakpoint here must track the header's own hamburger/desktop-nav
 * swap (`header.tsx`, also `lg`). These were previously `md`, which left
 * 768–1023px pointing at `#header` while the nav was still collapsed inside
 * the closed drawer — the link landed somewhere the navigation wasn't
 * actually reachable. `e2e/a11y.spec.ts` asserts this across widths.
 *
 * Only one of the header/navigation links is ever visible (or in the a11y
 * tree) at a given viewport width, so screen reader users never hear a
 * duplicate "Skip to Navigation" announcement.
 */
export function SkipToContent() {
    return (
        <>
            <styled.a id="skip-to-content" href="#main" className={skipLinkStyles}>
                Skip to main content
            </styled.a>
            <styled.a
                id="skip-to-header"
                href="#header"
                display="none"
                lg={{ display: 'block' }}
                className={skipLinkStyles}
            >
                Skip to Navigation
            </styled.a>
            <styled.a
                id="skip-to-navigation"
                href="#navigation"
                display="block"
                lg={{ display: 'none' }}
                className={skipLinkStyles}
            >
                Skip to Navigation
            </styled.a>
        </>
    )
}
