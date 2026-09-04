import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { navLink } from '~/styled-system/recipes'
import { css, cx } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'
import type { JsxStyleProps } from '~/styled-system/types'
import { NewTabHint, newTabLabel } from './new-tab-hint'

export type NavLinkVariant = 'primary' | 'chrome' | 'admin' | 'ghost' | 'accent' | 'onDark'
export type NavLinkSize = 'sm' | 'md' | 'lg'

const StyledLink = styled(Link)
const StyledAnchor = styled('a')

/**
 * True for a URL that leaves the site: `https://…`, `http://…` and
 * protocol-relative `//…`.
 *
 * Deliberately *not* true for `mailto:`/`tel:` — those leave the page too, but
 * they hand off to the OS rather than opening a browser tab, so the new-tab
 * affordance would be a lie. They get their own branch in `AppLink`.
 */
export function isExternalHref(href: string): boolean {
    return /^(https?:)?\/\//i.test(href)
}

/** `mailto:`, `tel:`, and any other non-http scheme the OS handles. */
function isProtocolHandler(href: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(href) && !isExternalHref(href)
}

export type AppLinkProps = Omit<LinkProps, 'className' | 'to'> &
    JsxStyleProps & {
        /**
         * Destination. An internal path (`/agenda`, `#section`) routes through
         * React Router; an external URL renders a real anchor that opens in a
         * new tab. See the component docs for why this is one prop.
         */
        to: LinkProps['to']
        variant?: NavLinkVariant
        size?: NavLinkSize
        active?: boolean
        className?: string
        /**
         * Skip the `navLink` recipe and take styling purely from this
         * component's own style props. For links that are part of page content
         * rather than navigation chrome — MDX prose, CTAs, logo links — which
         * would otherwise pick up nav-link padding and sizing.
         */
        unstyled?: boolean
        /**
         * Force the new-tab treatment off for an external URL. For links whose
         * target is a *file* rather than a page — a `.ics`, a PDF, a
         * `?download=1` endpoint — where the browser hands off to a download
         * and no tab is left open for "(opens in a new tab)" to describe.
         */
        download?: boolean | string
        children?: ReactNode
    }

/**
 * The single link component. Picks its own element from the shape of `to`:
 *
 * - **Internal** (`/path`, `#anchor`) → React Router `<Link>`, so navigation
 *   stays client-side and gets prefetching.
 * - **External** (`https://…`, `//…`) → `<a target="_blank">` with
 *   `rel="noopener noreferrer"` and an appended "(opens in a new tab)" hint
 *   (WCAG 3.2.5).
 * - **Protocol handler** (`mailto:`, `tel:`) → plain `<a>`, same tab. The OS
 *   takes over, so neither `target="_blank"` nor the new-tab hint applies.
 * - **Download** (`download` prop set) → plain `<a>`, no hint, whatever the
 *   URL shape. The browser saves a file instead of opening a tab.
 *
 * **Why the branch lives here rather than at the call sites.** Almost every
 * href in this codebase is a runtime value — `sponsor.website`, `action.href`,
 * `link.url` from a speaker's profile — so whether a given link is external
 * isn't knowable by reading the JSX. Leaving that to call sites means every
 * new link is a chance to forget `rel="noopener"` or the new-tab hint, and the
 * omission is invisible in review. Three separate copies of this check had
 * already grown (`MdxLink`, `important-dates.tsx`, and the manual
 * `NewTabHint` call sites) before this was consolidated.
 *
 * `to` rather than `href` for both cases: it matches the React Router
 * convention this component already used, and one prop is what lets a caller
 * pass a runtime URL without first deciding which kind it is.
 */
export function AppLink({
    variant,
    size,
    active,
    className,
    css: cssProp,
    to,
    unstyled,
    download,
    children,
    ...rest
}: AppLinkProps) {
    // `unstyled` opts out of the navLink recipe. The recipe defaults to
    // `variant: primary, size: md`, which carries real padding and sizing, and
    // every pre-existing AppLink caller relies on that default — so it stays on
    // by default. But links absorbed from plain anchors (MDX prose, CTAs,
    // sponsor logos, important-dates) never had it, and applying it to them
    // reflows the pages they sit on. Those pass `unstyled`.
    const classes = cx(unstyled ? undefined : navLink({ variant, size, active }), css(cssProp ?? {}), className)

    // Only a string `to` can be inspected. React Router also accepts a
    // partial-path object, which is internal by construction.
    const href = typeof to === 'string' ? to : null

    if (href !== null && (isExternalHref(href) || download !== undefined || isProtocolHandler(href))) {
        const external = isExternalHref(href)
        // A download never opens a tab, so it never gets the tab treatment —
        // even when the file lives on another origin.
        const opensTab = external && download === undefined

        // `aria-label` *replaces* element content when the accessible name is
        // computed, so an appended srOnly span inside the anchor would be
        // dropped and an icon link would announce nothing about the new tab.
        // Fold the hint into the label instead. (Icon links — social icons,
        // sponsor logos — are exactly the ones that carry a label.)
        const label = rest['aria-label']
        const labelled = opensTab && typeof label === 'string'

        return (
            <StyledAnchor
                {...rest}
                aria-label={labelled ? newTabLabel(label) : label}
                href={href}
                download={download}
                target={opensTab ? '_blank' : undefined}
                rel={opensTab ? 'noopener noreferrer' : undefined}
                className={classes}
            >
                {children}
                {opensTab && !labelled && <NewTabHint />}
            </StyledAnchor>
        )
    }

    return (
        <StyledLink {...rest} to={to} className={classes}>
            {children}
        </StyledLink>
    )
}
