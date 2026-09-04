// @vitest-environment jsdom
/**
 * Tests for AppLink's element/affordance branching.
 *
 * These exist because the branch is invisible at the call site: almost every
 * href in this codebase is a runtime value (`sponsor.website`, `action.href`),
 * so "is this link external?" cannot be answered by reading the JSX. The whole
 * point of centralising the decision is that these four cases stay correct for
 * every caller at once, so they're asserted directly.
 *
 * The assertions are on the *rendered contract* — element, target, rel and the
 * computed accessible name — not on internals, since that contract is what
 * both users and axe see.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AppLink, isExternalHref } from './app-link'
import { NEW_TAB_HINT } from './new-tab-hint'

afterEach(cleanup)

/** AppLink can render a React Router <Link>, so it needs a router context. */
function renderLink(element: React.ReactNode) {
    const Stub = createRoutesStub([{ path: '/', Component: () => <>{element}</> }])
    return render(<Stub initialEntries={['/']} />)
}

describe('AppLink external URLs', () => {
    it('opens in a new tab, with rel and an announced hint', async () => {
        renderLink(<AppLink to="https://example.com">Sponsor site</AppLink>)

        const link = await screen.findByRole('link', { name: `Sponsor site ${NEW_TAB_HINT}` })
        expect(link.getAttribute('target')).toBe('_blank')
        // noopener matters: target="_blank" otherwise hands the opened page a
        // window.opener reference back to this one.
        expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('treats protocol-relative URLs as external', async () => {
        renderLink(<AppLink to="//cdn.example.com/thing">CDN</AppLink>)

        const link = await screen.findByRole('link', { name: `CDN ${NEW_TAB_HINT}` })
        expect(link.getAttribute('target')).toBe('_blank')
    })
})

describe('AppLink internal paths', () => {
    it('routes through React Router rather than a bare anchor', async () => {
        renderLink(<AppLink to="/agenda">Agenda</AppLink>)

        // No new-tab treatment: same tab, same app.
        const link = await screen.findByRole('link', { name: 'Agenda' })
        expect(link.getAttribute('target')).toBeNull()
        expect(link.getAttribute('href')).toBe('/agenda')
    })

    it('does not announce a new tab for in-page anchors', async () => {
        renderLink(<AppLink to="#speakers">Speakers</AppLink>)

        expect(await screen.findByRole('link', { name: 'Speakers' })).toBeTruthy()
        expect(screen.queryByRole('link', { name: /opens in a new tab/i })).toBeNull()
    })
})

describe('AppLink protocol handlers', () => {
    // mailto/tel leave the page but hand off to the OS — no tab is opened, so
    // claiming one would be wrong.
    it.each(['mailto:info@example.com', 'tel:+61400000000'])('renders %s in the same tab with no hint', async (href) => {
        renderLink(<AppLink to={href}>Contact</AppLink>)

        const link = await screen.findByRole('link', { name: 'Contact' })
        expect(link.getAttribute('href')).toBe(href)
        expect(link.getAttribute('target')).toBeNull()
    })
})

describe('AppLink downloads', () => {
    it('does not claim a new tab for a download, even on another origin', async () => {
        renderLink(
            <AppLink to="https://example.com/talk.ics" download="Talk.ics">
                Add to calendar
            </AppLink>,
        )

        // The browser saves a file; no tab is left open for the hint to describe.
        const link = await screen.findByRole('link', { name: 'Add to calendar' })
        expect(link.getAttribute('download')).toBe('Talk.ics')
        expect(link.getAttribute('target')).toBeNull()
    })
})

describe('isExternalHref', () => {
    it.each([
        ['https://example.com', true],
        ['http://example.com', true],
        ['//example.com', true],
        ['/agenda', false],
        ['#anchor', false],
        ['mailto:a@b.com', false],
    ])('%s → %s', (href, expected) => {
        expect(isExternalHref(href)).toBe(expected)
    })
})

describe('AppLink with an aria-label', () => {
    it('still announces the new tab when the label would otherwise swallow the hint', async () => {
        renderLink(
            <AppLink to="https://twitter.com/DDDPerth" aria-label="Visit us on Twitter">
                <svg aria-hidden="true" />
            </AppLink>,
        )

        // aria-label replaces element content, so the appended srOnly span is
        // dropped from the name. An icon link must still say it opens a tab.
        expect(screen.getByRole('link', { name: `Visit us on Twitter ${NEW_TAB_HINT}` })).toBeTruthy()
    })
})

describe('AppLink navLink recipe', () => {
    /*
     * Both directions are load-bearing, and each broke a different set of
     * visual baselines while this was being written:
     *
     * - Applying the recipe to links absorbed from plain anchors (MDX prose,
     *   CTAs, sponsor logos) gave them nav-link padding they never had and
     *   reflowed those pages — 21 baselines.
     * - Then making it opt-in stripped it from the pre-existing AppLink callers
     *   that pass no variant and rely on the default — 18 baselines.
     *
     * So: recipe on by default, `unstyled` for the absorbed cases.
     */
    it('applies the recipe by default, since existing callers rely on it', async () => {
        renderLink(<AppLink to="/agenda">Agenda</AppLink>)

        const link = await screen.findByRole('link', { name: 'Agenda' })
        expect(link.className).toMatch(/navLink/)
    })

    it('skips the recipe when unstyled, so content links keep their own styling', async () => {
        renderLink(
            <AppLink to="/agenda" unstyled>
                Agenda
            </AppLink>,
        )

        const link = await screen.findByRole('link', { name: 'Agenda' })
        expect(link.className).not.toMatch(/navLink/)
    })
})

describe('AppLink external arrow', () => {
    it('shows ↗ on a text link', async () => {
        renderLink(<AppLink to="https://example.com">Docs</AppLink>)

        const link = await screen.findByRole('link', { name: `Docs ${NEW_TAB_HINT}` })
        expect(link.textContent).toContain('↗')
    })

    it('shows no ↗ on an icon link, where it would sit beside a logo as noise', async () => {
        renderLink(
            <AppLink to="https://twitter.com/DDDPerth" aria-label="Visit us on Twitter">
                <svg aria-hidden="true" />
            </AppLink>,
        )

        // Still announced — the hint rides in the aria-label — just not drawn.
        const link = screen.getByRole('link', { name: `Visit us on Twitter ${NEW_TAB_HINT}` })
        expect(link.textContent).not.toContain('↗')
    })

    it('shows no ↗ on internal links or downloads', async () => {
        renderLink(
            <>
                <AppLink to="/agenda">Agenda</AppLink>
                <AppLink to="https://example.com/talk.ics" download="Talk.ics">
                    Calendar
                </AppLink>
            </>,
        )

        expect((await screen.findByRole('link', { name: 'Agenda' })).textContent).not.toContain('↗')
        expect(screen.getByRole('link', { name: 'Calendar' }).textContent).not.toContain('↗')
    })
})
