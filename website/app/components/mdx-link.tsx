import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { styled } from '~/styled-system/jsx'

const StyledLink = styled(Link)

interface MdxLinkProps {
    href?: string
    title?: string
    children?: ReactNode
}

/**
 * Anchor used for links inside MDX prose. Branches by URL shape:
 * - Internal paths (`/...`, `#...`) → React Router `<Link>` so navigation
 *   stays client-side and benefits from prefetching.
 * - External `http(s)` URLs → opens in a new tab.
 * - Protocol handlers (`mailto:`, `tel:`, etc.) → plain anchor, same tab —
 *   the OS handles the hand-off.
 */
export function MdxLink({ href, title, children }: MdxLinkProps) {
    if (typeof href !== 'string' || href.length === 0) {
        return <styled.a title={title}>{children}</styled.a>
    }

    if (/^https?:\/\//i.test(href)) {
        return (
            <styled.a href={href} title={title} target="_blank" rel="noopener noreferrer">
                {children}
            </styled.a>
        )
    }

    if (href.startsWith('/') || href.startsWith('#')) {
        return (
            <StyledLink to={href} title={title}>
                {children}
            </StyledLink>
        )
    }

    // mailto:, tel:, and any other custom scheme — let the browser/OS handle it.
    return (
        <styled.a href={href} title={title}>
            {children}
        </styled.a>
    )
}
