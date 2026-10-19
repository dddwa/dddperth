import type { ReactNode } from 'react'
import { css, cx } from '~/styled-system/css'
import type { BoxProps } from '~/styled-system/jsx'
import { Box } from '~/styled-system/jsx'

/**
 * Fixed rather than the `sm` token: that one is tuned for the dark site theme
 * (a 60% black drop), and admin cards are a light surface in both themes, where
 * it read as a hard smudge under every card.
 */
const cardShadow = '[0 1px 2px rgba(16, 24, 40, 0.05), 0 1px 3px rgba(16, 24, 40, 0.08)]'

const cardClass = css({
    bg: 'white',
    p: { base: '4', md: '6' },
    borderRadius: 'xl',
    boxShadow: cardShadow,
    border: 'admin-subtle',
    mb: '8',
})

/**
 * Mobile-first: a plain block on small screens — no border, radius, shadow or
 * padding, so a dense page (the run sheet) gets the whole width — and the card
 * from 50em up. A separate class rather than overrides on `cardClass`, since
 * two atomic classes for one property don't reliably win in class order.
 */
const bareOnSmallScreensClass = css({
    bg: 'white',
    mb: '8',
    '@media (min-width: 50em)': { p: '6', border: 'admin-subtle', borderRadius: 'xl', boxShadow: cardShadow },
})

export function AdminCard({
    children,
    className,
    bareOnSmallScreens,
    ...props
}: { children: ReactNode; bareOnSmallScreens?: boolean } & BoxProps) {
    return (
        <Box {...props} className={cx(bareOnSmallScreens ? bareOnSmallScreensClass : cardClass, className)}>
            {children}
        </Box>
    )
}
