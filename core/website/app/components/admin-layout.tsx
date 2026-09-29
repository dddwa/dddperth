import type { ReactNode } from 'react'
import { css, cx } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

const layoutClass = css({
    bg: 'white',
    p: { base: '6', md: '12' },
    mx: 'auto',
    borderRadius: '2xl',
    boxShadow: 'lg',
    border: 'admin-subtle',
})

/** See `AdminCard`'s option of the same name: no card chrome below 50em, and
 * only a little padding so content doesn't touch the screen edges. */
const bareOnSmallScreensClass = css({
    bg: 'white',
    mx: 'auto',
    p: '3',
    '@media (min-width: 50em)': { p: '12', border: 'admin-subtle', borderRadius: '2xl', boxShadow: 'lg' },
})

export function AdminLayout({
    heading,
    children,
    fullWidth,
    bareOnSmallScreens,
}: {
    heading: string
    children: ReactNode
    fullWidth?: boolean
    bareOnSmallScreens?: boolean
}) {
    return (
        <div
            className={cx(
                bareOnSmallScreens ? bareOnSmallScreensClass : layoutClass,
                fullWidth ? css({ maxW: 'full' }) : css({ maxW: '7xl' }),
            )}
        >
            <styled.h1 fontSize="2xl" fontWeight="bold" mb="8" letterSpacing="tight">
                {heading}
            </styled.h1>
            {children}
        </div>
    )
}
