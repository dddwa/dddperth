/**
 * SponsorInlineLogo — a compact, baseline-aligned variant of SponsorLogo
 * for use inside running text or tight horizontal strips.
 *
 * Defaults to a height tracking the current font size (~1.25em) and lets the
 * width scale to whatever the logo's aspect ratio dictates, with a sensible
 * cap. Pass `height` (or any other JSX style prop) to override.
 *
 * Uses the same dual-image swap as `SponsorLogo` so theme toggles are an
 * instant CSS swap — no flash, no network. See that file for the rationale
 * behind only toggling `_dark`.
 */

import { styled } from '~/styled-system/jsx'
import type { JsxStyleProps } from '~/styled-system/types'

export type SponsorInlineLogoProps = JsxStyleProps & {
    /** Light-on-dark variant — used in dark theme. */
    logoUrlDarkMode: string
    /** Dark-on-light variant — used in light theme. */
    logoUrlLightMode: string
    /** Sponsor name for alt text + hover tooltip. */
    name: string
}

export function SponsorInlineLogo({
    logoUrlDarkMode,
    logoUrlLightMode,
    name,
    ...style
}: SponsorInlineLogoProps) {
    const baseStyle: JsxStyleProps = {
        height: '[1.25em]',
        width: 'auto',
        maxWidth: '[140px]',
        objectFit: 'contain',
        verticalAlign: 'middle',
    }

    return (
        <>
            <styled.img
                src={logoUrlDarkMode}
                alt={name}
                title={name}
                display="none"
                _dark={{ display: 'inline-block' }}
                {...baseStyle}
                {...style}
            />
            <styled.img
                src={logoUrlLightMode}
                alt=""
                aria-hidden="true"
                display="inline-block"
                _dark={{ display: 'none' }}
                {...baseStyle}
                {...style}
            />
        </>
    )
}
