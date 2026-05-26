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

export function AdminCard({
    children,
    className,
    ...props
}: { children: ReactNode } & BoxProps) {
    return (
        <Box {...props} className={cx(cardClass, className)}>
            {children}
        </Box>
    )
}
