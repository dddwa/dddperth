// @vitest-environment jsdom
/**
 * The ticket-claim link is the one checklist action whose URL core doesn't
 * own — it comes from the `SPEAKER_TICKET_CLAIM_URL_<YEAR>` secret. It
 * renders when supplied and disappears when not, rather than becoming a dead
 * link.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpeakerChecklistCard } from './speaker-checklist-card'
import type { SpeakerChecklistItem } from '~/lib/speakers/checklist'

afterEach(cleanup)

const CLAIM_TICKET: SpeakerChecklistItem = {
    key: 'claimTicket',
    label: 'Claim your speaker ticket',
    done: false,
    urgency: 'normal',
    isPastDue: false,
}

function renderCard(ticketClaimUrl?: string, item: SpeakerChecklistItem = CLAIM_TICKET) {
    const Stub = createRoutesStub([
        {
            path: '/',
            Component: () => (
                <SpeakerChecklistCard
                    sessionizeId="spk-1"
                    checklist={[item]}
                    ticketClaimUrl={ticketClaimUrl}
                    onOpenModal={vi.fn()}
                />
            ),
        },
    ])
    return render(<Stub initialEntries={['/']} />)
}

describe('SpeakerChecklistCard ticket claim link', () => {
    it('links to the URL from config', () => {
        renderCard('https://ti.to/example/2026/with/speaker')

        expect(screen.getByRole('link', { name: /claim your ticket/i }).getAttribute('href')).toBe(
            'https://ti.to/example/2026/with/speaker',
        )
    })

    it('omits the claim link entirely when no URL is configured', () => {
        renderCard(undefined)

        expect(screen.queryByRole('link', { name: /claim your ticket/i })).toBeNull()
    })

    it("still offers the self-report button when there's no claim link", () => {
        renderCard(undefined)

        // Posts to the server, so it's unaffected by the missing URL.
        expect(screen.getByRole('button', { name: /i've claimed it/i })).toBeTruthy()
    })

    it('keeps the ticket link after the speaker has self-reported claiming it', () => {
        // "I've claimed it" is easy to click by mistake, and has no undo.
        renderCard('https://ti.to/example/2026/with/speaker', { ...CLAIM_TICKET, done: true })

        expect(screen.getByRole('link', { name: /ticket link/i }).getAttribute('href')).toBe(
            'https://ti.to/example/2026/with/speaker',
        )
        expect(screen.queryByRole('button', { name: /i've claimed it/i })).toBeNull()
    })
})
