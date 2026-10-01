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

/** 20px either side from 50em up, for `gutter`. */
const gutterClass = css({ '@media (min-width: 50em)': { px: '[20px]' } })

export function AdminLayout({
    heading,
    children,
    fullWidth,
    bareOnSmallScreens,
    gutter,
}: {
    heading: string
    children: ReactNode
    fullWidth?: boolean
    bareOnSmallScreens?: boolean
    /**
     * For a page in the public layout, which has no side padding of its own
     * (the admin shell supplies it everywhere else): without it the card's
     * edges and rounded corners run off the screen once it is as wide as the
     * viewport.
     */
    gutter?: boolean
}) {
    const layout = (
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
    return gutter ? <div className={gutterClass}>{layout}</div> : layout
}
