// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRoutesStub, redirect } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import type { SponsorFeedback } from '~/lib/services/sponsor-feedback-store'
import PortalFeedback from './portal.feedback'

afterEach(cleanup)

const submission: SponsorFeedback = {
    id: 'fb-1',
    issueKey: 'SPN-1',
    rating: 4,
    experience: 'Busy booth all day',
    ideas: 'A sponsor lounge',
    testimonial: 'Our best hiring day',
    testimonialAttribution: 'Sam, CTO',
    portalFeedback: null,
    submittedBy: 'sam@acme.test',
    updatedBy: 'sam@acme.test',
    createdAt: 1_790_000_000,
    updatedAt: 1_790_000_000,
}

function renderPage(loaderData: Partial<ReturnType<typeof baseData>> = {}, path = '/portal/feedback') {
    const Stub = createRoutesStub([
        { path: '/portal/feedback', Component: PortalFeedback, loader: () => ({ ...baseData(), ...loaderData }) },
    ])
    render(<Stub initialEntries={[path]} />)
}

function baseData() {
    return {
        year: '2026',
        conferenceName: 'DDD Perth',
        submissions: [] as SponsorFeedback[],
        editing: null as SponsorFeedback | null,
        savedId: null as string | null,
    }
}

describe('sponsor portal feedback page', () => {
    it('asks for experience, ideas and a testimonial when nothing has been submitted', async () => {
        renderPage()

        expect(await screen.findByRole('heading', { name: 'Share your feedback' })).toBeTruthy()
        expect(screen.getByLabelText('How was your experience as a sponsor?')).toBeTruthy()
        expect(screen.getByLabelText('What would make sponsoring more valuable for you?')).toBeTruthy()
        expect(screen.getByLabelText('In a sentence or two, what did sponsoring do for you?')).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Submit feedback' })).toBeTruthy()
    })

    it('shows what was submitted, with a way to edit it and room to add more', async () => {
        renderPage({ submissions: [submission] })

        expect(await screen.findByText('Busy booth all day')).toBeTruthy()
        expect(screen.getByText(/Our best hiring day/).textContent).toContain('Sam, CTO')
        expect(screen.getByRole('link', { name: 'Edit feedback 1' }).getAttribute('href')).toBe(
            '/portal/feedback?edit=fb-1#feedback-form',
        )
        expect(screen.getByRole('heading', { name: 'Add more feedback' })).toBeTruthy()
    })

    it('prefills the form when editing, and submits the id so it updates rather than adds', async () => {
        renderPage({ submissions: [submission], editing: submission })

        const experience = await screen.findByLabelText<HTMLTextAreaElement>('How was your experience as a sponsor?')
        expect(experience.value).toBe('Busy booth all day')
        expect(screen.getByLabelText<HTMLInputElement>(/4 — Very good/).checked).toBe(true)
        expect(screen.getByLabelText<HTMLInputElement>('Name and role to show with the quote').value).toBe('Sam, CTO')
        const form = experience.closest('form')
        expect(form?.querySelector<HTMLInputElement>('input[name="id"]')?.value).toBe('fb-1')
        expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy()
    })

    it('confirms a save', async () => {
        renderPage({ submissions: [submission], savedId: 'fb-1' })

        expect((await screen.findByRole('status')).textContent).toMatch(/your feedback is saved/)
    })

    it('explains under the portal question that the portal was a work in progress', async () => {
        renderPage()

        const portal = await screen.findByLabelText('Sponsor portal feedback')
        expect(portal.getAttribute('aria-describedby')).toContain('portalFeedback-hint')
        expect(screen.getByText(/work in progress this year/).id).toBe('portalFeedback-hint')
    })
    it('clears the form after a save, so the next submit is new feedback rather than a copy', async () => {
        const Stub = createRoutesStub([
            {
                path: '/portal/feedback',
                Component: PortalFeedback,
                loader: ({ request }) => ({
                    ...baseData(),
                    savedId: new URL(request.url).searchParams.get('saved'),
                }),
                action: () => redirect('/portal/feedback?saved=fb-2'),
            },
        ])
        render(<Stub initialEntries={['/portal/feedback']} />)

        const experience = await screen.findByLabelText('How was your experience as a sponsor?')
        fireEvent.change(experience, { target: { value: 'Loved it' } })
        fireEvent.click(screen.getByRole('button', { name: 'Submit feedback' }))

        await screen.findByRole('status')
        expect(screen.getByLabelText<HTMLTextAreaElement>('How was your experience as a sponsor?').value).toBe('')
    })
})
