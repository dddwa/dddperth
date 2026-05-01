import { Link, type LinkProps } from 'react-router'
import { navLink } from '~/recipes/nav-link'
import { css, cx } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'
import type { JsxStyleProps } from '~/styled-system/types'

export type NavLinkVariant = 'primary' | 'admin' | 'ghost' | 'accent'
export type NavLinkSize = 'sm' | 'md' | 'lg'

const StyledLink = styled(Link)

export type AppLinkProps = Omit<LinkProps, 'className'> &
    JsxStyleProps & {
        variant?: NavLinkVariant
        size?: NavLinkSize
        active?: boolean
        className?: string
    }

export function AppLink({ variant, size, active, className, css: cssProp, ...rest }: AppLinkProps) {
    return (
        <StyledLink
            {...rest}
            className={cx(navLink({ variant, size, active }), css(cssProp ?? {}), className)}
        />
    )
}
