/**
 * SponsorLogo — renders both light/dark variants and toggles per-theme.
 *
 * The data model carries two image URLs (`logoUrlDarkMode` = light-on-dark
 * variant, `logoUrlLightMode` = dark-on-light variant). We render both and
 * swap visibility with Panda's `_dark` condition.
 *
 * Why two <img>s instead of swapping `src`: both URLs are loaded up-front,
 * so a theme toggle is an instant CSS swap (no flash, no network).
 *
 * Why only `_dark` controls visibility: Park UI's preset configures
 * `_light` as `:root &, .light &`, making it an always-on base condition,
 * not a "light only" selector. See memory `panda_light_dark_conditions`.
 */

import { styled } from '~/styled-system/jsx'
import type { JsxStyleProps } from '~/styled-system/types'

export type SponsorLogoProps = JsxStyleProps & {
    /** Light-on-dark variant — used in dark theme. */
    logoUrlDarkMode: string
    /** Dark-on-light variant — used in light theme. */
    logoUrlLightMode: string
    /** Sponsor name for alt text on the visible image. */
    name: string
}

export function SponsorLogo({ logoUrlDarkMode, logoUrlLightMode, name, ...style }: SponsorLogoProps) {
    return (
        <>
            <styled.img
                src={logoUrlDarkMode}
                alt={name}
                display="none"
                _dark={{ display: 'block' }}
                {...style}
            />
            <styled.img
                src={logoUrlLightMode}
                alt=""
                aria-hidden="true"
                display="block"
                _dark={{ display: 'none' }}
                {...style}
            />
        </>
    )
}
