// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import PortalLayout from './portal'

afterEach(cleanup)

const loaderData = {
    user: { email: 'sponsor@acme.test' },
    sponsor: { companyName: 'Acme & Co', tier: 'Gold' },
    year: '2026',
    conferenceName: 'DDD Perth',
    sponsorshipEmail: 'sponsorship@dddperth.com',
}

function renderLayout() {
    const Stub = createRoutesStub([{ path: '/portal', Component: PortalLayout, loader: () => loaderData }])
    render(<Stub initialEntries={['/portal']} />)
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
