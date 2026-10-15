// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createRoutesStub, data } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import AdminSponsorFeedback from './admin.sponsors_.feedback'

afterEach(cleanup)

const loaderData = {
    configured: true as const,
    year: '2026',
    adminEmail: 'admin@ddd.test',
    canSendEmail: true,
    sponsors: [
        {
            issueKey: 'SPN-1',
            companyName: 'Acme',
            tier: 'Gold',
            contacts: ['a@acme.test', 'b@acme.test'],
            lastRequest: null,
            feedbackCount: 0,
        },
        {
            issueKey: 'SPN-2',
            companyName: 'Globex',
            tier: 'Silver',
            contacts: ['g@globex.test'],
            lastRequest: { issueKey: 'SPN-2', recipients: ['g@globex.test'], sentAt: 1_790_000_000, sentBy: 'admin@ddd.test' },
            feedbackCount: 1,
        },
    ],
    feedback: [],
}

function renderPage(action: () => unknown = () => null) {
    const Stub = createRoutesStub([
        { path: '/admin/sponsors/feedback', Component: AdminSponsorFeedback, loader: () => loaderData, action },
    ])
    render(<Stub initialEntries={['/admin/sponsors/feedback']} />)
}

describe('admin sponsor feedback requests', () => {
    it("prefills each sponsor's To: field with all of their portal contacts", async () => {
        renderPage()

        const to = (await screen.findByLabelText('Email addresses for Acme')) as HTMLTextAreaElement
        expect(to.value).toBe('a@acme.test,\nb@acme.test')
    })

    it("ticks only sponsors who haven't been asked or replied", async () => {
        renderPage()

        expect(((await screen.findByLabelText('Send to Acme')) as HTMLInputElement).checked).toBe(true)
        expect((screen.getByLabelText('Send to Globex') as HTMLInputElement).checked).toBe(false)
    })

    it('asks for confirmation of every address before sending, flagging ones that cannot sign in', async () => {
        renderPage(async () => {
            return data({
                intent: 'preview' as const,
                plan: {
                    requests: [
                        {
                            issueKey: 'SPN-1',
                            companyName: 'Acme',
                            recipients: ['a@acme.test', 'boss@acme.test'],
                            notContacts: ['boss@acme.test'],
                        },
                    ],
                    errors: [],
                },
            })
        })

        fireEvent.click(await screen.findByRole('button', { name: 'Review emails' }))

        const heading = await screen.findByRole('heading', { name: 'Send 1 email?' })
        const review = heading.parentElement as HTMLElement
        expect(within(review).getByText(/To: a@acme\.test, boss@acme\.test/)).toBeTruthy()
        expect(within(review).getByText(/can't sign in to answer/).textContent).toContain('boss@acme.test')

        // The confirmed list travels in hidden fields, not the editable table.
        const form = within(review).getByRole('button', { name: 'Send 1 email' }).closest('form')
        const submitted = new FormData(form ?? undefined)
        expect(submitted.get('_action')).toBe('send')
        expect(submitted.getAll('selected')).toEqual(['SPN-1'])
        expect(submitted.get('to_SPN-1')).toBe('a@acme.test,boss@acme.test')
    })

    it('blocks the send while any sponsor has a problem', async () => {
        renderPage(() =>
            data({
                intent: 'preview' as const,
                plan: { requests: [], errors: [{ issueKey: 'SPN-1', companyName: 'Acme', message: 'Add at least one email address' }] },
            }),
        )

        fireEvent.click(await screen.findByRole('button', { name: 'Review emails' }))

        expect(await screen.findByText('Acme: Add at least one email address')).toBeTruthy()
        expect(screen.queryByRole('button', { name: /^Send \d/ })).toBeNull()
    })
})
