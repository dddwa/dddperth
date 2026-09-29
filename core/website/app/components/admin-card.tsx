import type { ReactNode } from 'react'
import { css, cx } from '~/styled-system/css'
import type { BoxProps } from '~/styled-system/jsx'
import { Box } from '~/styled-system/jsx'

const cardClass = css({
    bg: 'white',
    p: { base: '4', md: '6' },
    borderRadius: 'xl',
    boxShadow: 'sm',
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
    '@media (min-width: 50em)': { p: '6', border: 'admin-subtle', borderRadius: 'xl', boxShadow: 'sm' },
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
