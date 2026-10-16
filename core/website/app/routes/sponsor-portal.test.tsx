// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createRoutesStub, data } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import PortalLayout, { ErrorBoundary } from './sponsor-portal'

afterEach(cleanup)

const loaderData = {
    user: { email: 'sponsor@acme.test' },
    sponsor: { companyName: 'Acme & Co', tier: 'Gold' },
    year: '2026',
    conferenceName: 'DDD Perth',
    sponsorshipEmail: 'sponsorship@dddperth.com',
}

function renderLayout() {
    const Stub = createRoutesStub([{ path: '/sponsor-portal', Component: PortalLayout, loader: () => loaderData }])
    render(<Stub initialEntries={['/sponsor-portal']} />)
}

describe('sponsor portal support link', () => {
    it('offers the sponsorship inbox on every portal page', async () => {
        renderLayout()

        const link = await screen.findByRole('link', { name: /sponsorship@dddperth\.com/ })
        expect(link.getAttribute('href')).toMatch(/^mailto:sponsorship@dddperth\.com\?/)
    })

    it('scopes the subject to the portal and the sponsor', async () => {
        // An open-ended "email us" lands portal bugs in the same inbox as
        // sponsorship enquiries with nothing to tell them apart.
        renderLayout()

        const href = (await screen.findByRole('link', { name: /sponsorship@dddperth\.com/ })).getAttribute('href') ?? ''
        const subject = new URL(href).searchParams.get('subject')
        expect(subject).toBe('Sponsor portal issue — Acme & Co')
    })

    it('opens in the same tab, with no new-tab hint', async () => {
        // mailto hands off to the OS, so the new-tab affordance would be a lie.
        renderLayout()

        const link = await screen.findByRole('link', { name: /sponsorship@dddperth\.com/ })
        expect(link.getAttribute('target')).toBeNull()
        expect(link.textContent).not.toMatch(/new tab/i)
    })
})

describe('sponsor portal header', () => {
    function renderAt(path: string) {
        const Stub = createRoutesStub([
            {
                path: '/sponsor-portal',
                Component: PortalLayout,
                loader: () => loaderData,
                children: [
                    { index: true, Component: () => null },
                    { path: 'profile', Component: () => null },
                ],
            },
        ])
        render(<Stub initialEntries={[path]} />)
    }

    it('names the sponsor as the page heading, with their tier', async () => {
        renderAt('/sponsor-portal')

        const heading = await screen.findByRole('heading', { level: 1 })
        expect(heading.textContent).toBe('Acme & Co')
        expect(screen.getByText('Gold')).toBeTruthy()
    })

    it('marks only the current tab as the current page', async () => {
        // Dashboard is the index route, so without `end` it would stay
        // current on every portal page.
        renderAt('/sponsor-portal/profile')

        const nav = await screen.findByRole('navigation', { name: 'Sponsor portal sections' })
        const current = [...nav.querySelectorAll('[aria-current="page"]')].map((link) => link.textContent)
        expect(current).toEqual(['Company profile'])
    })
})

describe('sponsor portal error page', () => {
    function renderThrowing(thrown: unknown) {
        const Stub = createRoutesStub([
            {
                path: '/sponsor-portal',
                Component: PortalLayout,
                ErrorBoundary,
                loader: () => {
                    throw thrown
                },
            },
        ])
        render(<Stub initialEntries={['/sponsor-portal']} />)
    }

    it('names the signed-in email when it is not linked to a sponsor', async () => {
        // Seen in production: a contact signed in with a different address
        // from the one on the sponsor's Jira contact list and got "Something
        // went wrong", with nothing to tell them which address was wrong.
        renderThrowing(data({ reason: 'not-a-sponsor-contact', email: 'someone@elsewhere.test' }, { status: 404 }))

        expect(await screen.findByText('someone@elsewhere.test')).toBeTruthy()
        expect(screen.queryByText(/something went wrong/i)).toBeNull()
    })

    it('lets an unlinked user sign out and straight back in to the portal', async () => {
        renderThrowing(data({ reason: 'not-a-sponsor-contact', email: 'someone@elsewhere.test' }, { status: 404 }))

        const button = await screen.findByRole('button', { name: 'Sign in with a different email' })
        const form = button.closest('form')
        expect(form?.getAttribute('action')).toBe('/auth/logout')
        const redirectTo = form?.querySelector<HTMLInputElement>('input[name="redirectTo"]')?.value
        expect(redirectTo).toBe('/auth/login?redirectTo=%2Fsponsor-portal')
    })

    it('keeps the generic message for anything else', async () => {
        renderThrowing(new Error('D1 unavailable'))

        expect(await screen.findByText(/something went wrong loading your sponsor workspace/i)).toBeTruthy()
    })
})
