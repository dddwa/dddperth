// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRoutesStub, data } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import PortalDashboard from './portal._index'

afterEach(cleanup)

const loaderData = {
    issueKey: 'SPN-1',
    sections: [],
    complete: true,
    nextSection: null,
    contacts: ['sponsor@example.com'],
    deliverables: {},
    meetTheExpertsSlots: [{ id: 'slot-1', label: 'Friday 3pm' }],
    meetTheExpertsResponded: true,
    meetTheExpertsSelectedSlotIds: ['slot-1'],
    meetTheExpertsSelectedSlotLabels: ['Friday 3pm'],
    meetTheExpertsBioUseDefault: true,
    meetTheExpertsBioCustomText: undefined,
    blurb: 'About Acme',
}

async function saveOpenModal() {
    fireEvent.click(await screen.findByRole('button', { name: 'Update' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}

describe('sponsor Meet the Experts modal', () => {
    it('closes after every successful save, including an update after reopening', async () => {
        const Stub = createRoutesStub([
            {
                path: '/portal',
                Component: PortalDashboard,
                loader: () => loaderData,
                // A fresh action-data object is returned for each successful
                // save, matching the real action.
                action: () => data({ meetTheExpertsSaved: true as const }),
            },
        ])
        render(<Stub initialEntries={['/portal']} />)

        await saveOpenModal()
        await saveOpenModal()
    })
})
