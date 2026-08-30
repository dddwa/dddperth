// @vitest-environment jsdom
/**
 * The ticket-claim link is the one checklist action whose URL core doesn't
 * own — it comes from the fork's `speakerPortal.checklist.ticketClaimUrl`.
 *
 * That URL used to be hardcoded in core alongside a `?? ticketClaimUrl`
 * fallback in the card, which meant the hardcoded value silently won and the
 * config value was dead code. Now the action declares
 * `configuredHref: 'ticketClaimUrl'` and there is exactly one source.
 *
 * These assertions lock in the contract that replaced the fallback: the link
 * renders from config when set, and the action disappears when it isn't —
 * rather than rendering a dead link to nowhere.
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

function renderCard(ticketClaimUrl?: string) {
    const Stub = createRoutesStub([
        {
            path: '/',
            Component: () => (
                <SpeakerChecklistCard
                    sessionizeId="spk-1"
                    checklist={[CLAIM_TICKET]}
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

        // A fork with no claim URL simply can't offer ticket claiming, so
        // there should be no link at all — not a dead one.
        expect(screen.queryByRole('link', { name: /claim your ticket/i })).toBeNull()
    })

    it("still offers the self-report button when there's no claim link", () => {
        renderCard(undefined)

        // The "I've claimed it" action posts to the server and is unrelated
        // to the external URL, so dropping the link must not drop it too.
        expect(screen.getByRole('button', { name: /i've claimed it/i })).toBeTruthy()
    })
})
