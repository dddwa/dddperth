import { styled } from '~/styled-system/jsx'

/**
 * The single wording used everywhere a link opens in a new tab. Exported so
 * tests and `aria-label` builders can't drift from the rendered text.
 */
export const NEW_TAB_HINT = '(opens in a new tab)'

/**
 * Appends "(opens in a new tab)" to a link's accessible name without changing
 * what's on screen (WCAG 3.2.5 Change on Request).
 *
 * Use this for links whose name comes from **visible text** — it renders the
 * hint as `srOnly` text inside the anchor, so the visible label is untouched
 * and the accessible name becomes "Register as a Volunteer (opens in a new
 * tab)".
 *
 * For links named by `aria-label` (an icon or logo with no text), there is no
 * visible label to preserve and a hidden span would be ignored — the label
 * wins over element content. Use `newTabLabel()` on the label instead.
 */
export function NewTabHint() {
    // The space is a text node *outside* the span, not inside it. Accessible
    // names are built by concatenating each element's contribution with its own
    // surrounding whitespace trimmed, so a space within the span is discarded
    // and the name runs together as "Register as a Volunteer(opens in a new
    // tab)". As a sibling text node it belongs to the link itself and survives.
    // (Verified against dom-accessibility-api, which is what axe and
    // testing-library both compute names with.)
    return (
        <>
            {' '}
            <styled.span srOnly>{NEW_TAB_HINT}</styled.span>
        </>
    )
}

/**
 * Builds the `aria-label` for a link that opens in a new tab and has no
 * visible text of its own (social icons, sponsor logos).
 *
 * `aria-label` replaces element content entirely, so an `srOnly` span inside
 * such a link is never announced — the hint has to go in the label itself.
 */
export function newTabLabel(label: string) {
    return `${label} ${NEW_TAB_HINT}`
}
