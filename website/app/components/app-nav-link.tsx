import { NavLink, type NavLinkProps } from 'react-router'
import { navLink } from '~/recipes/nav-link'
import { cx } from '~/styled-system/css'
import type { NavLinkSize, NavLinkVariant } from './app-link'

export type AppNavLinkProps = Omit<NavLinkProps, 'className'> & {
    variant?: NavLinkVariant
    size?: NavLinkSize
    active?: boolean
    className?: NavLinkProps['className']
}

export function AppNavLink({ variant, size, active, className, ...rest }: AppNavLinkProps) {
    const recipeClass = navLink({ variant, size, active })
    return (
        <NavLink
            {...rest}
            className={typeof className === 'function'
                ? (state) => cx(recipeClass, className(state))
                : cx(recipeClass, className)}
        />
    )
}
