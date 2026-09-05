// @vitest-environment jsdom
/**
 * Tests for the "(opens in a new tab)" affordance (WCAG 3.2.5 Change on
 * Request).
 *
 * These assert the *accessible name*, not the presence of a span, because the
 * distinction the two helpers exist for is invisible in the markup and easy to
 * get backwards: `aria-label` replaces element content, so an `srOnly` span
 * inside an icon link named by a label is silently dropped from the name. The
 * "ignored when there's an aria-label" case below is the regression that would
 * otherwise ship looking correct.
 *
 * Axe can't catch any of this — a link that opens a new tab with no warning is
 * a valid link as far as automated rules are concerned.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { NEW_TAB_HINT, NewTabArrow, NewTabHint, newTabLabel } from './new-tab-hint'

afterEach(cleanup)

describe('NewTabHint', () => {
    it('appends the hint to a link named by its visible text', () => {
        render(
            <a href="https://example.com" target="_blank" rel="noopener noreferrer">
                Register as a Volunteer
                <NewTabHint />
            </a>,
        )

        expect(screen.getByRole('link', { name: `Register as a Volunteer ${NEW_TAB_HINT}` })).toBeTruthy()
    })

    it('leaves the visible text alone', () => {
        const { container } = render(
            <a href="https://example.com">
                Register as a Volunteer
                <NewTabHint />
            </a>,
        )

        // srOnly clips the hint visually; the on-screen label must not change.
        const hint = container.querySelector('span')
        expect(hint?.textContent?.trim()).toBe(NEW_TAB_HINT)
        expect(hint?.className).toBeTruthy()
    })

    it('is ignored when the link is named by aria-label — which is why newTabLabel exists', () => {
        render(
            <a href="https://example.com" aria-label="Visit us on Twitter">
                <NewTabHint />
            </a>,
        )

        // aria-label wins over element content, so the hidden span contributes
        // nothing. Use newTabLabel() for icon/logo links instead.
        expect(screen.getByRole('link', { name: 'Visit us on Twitter' })).toBeTruthy()
        expect(screen.queryByRole('link', { name: /opens in a new tab/i })).toBeNull()
    })
})

describe('newTabLabel', () => {
    it('builds an accessible name carrying the hint', () => {
        render(
            <a href="https://example.com" target="_blank" rel="noopener noreferrer" aria-label={newTabLabel('Visit us on Twitter')}>
                <svg aria-hidden="true" />
            </a>,
        )

        expect(screen.getByRole('link', { name: `Visit us on Twitter ${NEW_TAB_HINT}` })).toBeTruthy()
    })
})

describe('NewTabArrow', () => {
    it('is visible but contributes nothing to the accessible name', () => {
        render(
            <a href="https://example.com" target="_blank" rel="noopener noreferrer">
                Docs
                <NewTabHint />
            </a>,
        )

        // The arrow is aria-hidden: the srOnly hint already says "opens in a new
        // tab" in words, so announcing the glyph too would say it twice.
        expect(screen.getByRole('link', { name: `Docs ${NEW_TAB_HINT}` })).toBeTruthy()
    })

    it('renders the glyph for sighted users', () => {
        const { container } = render(<NewTabArrow />)

        // WCAG 3.2.5 is about warning everyone, not only screen reader users.
        expect(container.textContent).toContain('↗')
        expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
    })
})
