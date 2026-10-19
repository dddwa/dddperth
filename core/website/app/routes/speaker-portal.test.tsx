// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import SpeakerPortalLayout from './speaker-portal'

afterEach(cleanup)

const loaderData = {
    user: { email: 'speaker@example.test' },
    speaker: { fullName: 'Alex Example' },
    year: '2026',
    conferenceName: 'DDD Perth',
}

function renderLayout() {
    const Stub = createRoutesStub([{ path: '/speaker-portal', Component: SpeakerPortalLayout, loader: () => loaderData }])
    render(<Stub initialEntries={['/speaker-portal']} />)
}

describe('speaker portal header', () => {
    it('names the speaker as the page heading', async () => {
        renderLayout()

        const heading = await screen.findByRole('heading', { level: 1 })
        expect(heading.textContent).toBe('Alex Example')
    })

    it('has no section tabs, since the portal is a single page', async () => {
        renderLayout()

        await screen.findByRole('heading', { level: 1 })
        expect(screen.queryByRole('navigation')).toBeNull()
    })

    it('signs out through the logout action', async () => {
        renderLayout()

        const button = await screen.findByRole('button', { name: 'Sign out' })
        expect(button.closest('form')?.getAttribute('action')).toBe('/auth/logout')
    })
})
