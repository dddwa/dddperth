// @vitest-environment jsdom
/**
 * Tests for how the sign-in form's validation error reaches assistive tech
 * (WCAG 4.1.3 Status Messages).
 *
 * The error is server-rendered from the route's `action`, not a client-side
 * toast — the response replaces the page and focus starts at the top with
 * nothing indicating the submit failed. A screen reader user would only find
 * the message by reading down the page again.
 *
 * `role="alert"` alone is not obviously enough here (the container isn't in the
 * DOM before the error exists, so there's no live region for the AT to have
 * been watching), which is why focus moves to it as well. Both halves are
 * asserted below.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRoutesStub, data } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import Login from './auth.login'

afterEach(cleanup)

const ERROR = 'Please enter a valid email address.'

/**
 * Renders the real component with the route's loader/action stubbed. `action`
 * returning an error mirrors what the real one does for an invalid address.
 */
function renderLogin({ withError }: { withError: boolean }) {
    const Stub = createRoutesStub([
        {
            path: '/auth/login',
            Component: Login,
            loader: () => ({ canSendEmail: true }),
            // Mirrors the real action: `data(..., { status: 400 })` for an
            // invalid address. The status matters — a bare object and a
            // `data()` response are not interchangeable here.
            action: () =>
                withError
                    ? data({ error: ERROR }, { status: 400 })
                    : data({ sent: true as const, email: 'someone@example.com' }),
        },
    ])
    return render(<Stub initialEntries={['/auth/login']} />)
}

/**
 * Submits the form the way a user would, via the real submit button.
 * `findBy` rather than `getBy`: createRoutesStub resolves its loader before
 * the component mounts, so nothing is rendered on the first tick.
 */
async function submit() {
    // The email input is `required`, so leaving it blank means the browser
    // blocks submission and the action never runs.
    fireEvent.change(await screen.findByLabelText(/email/i), {
        target: { value: 'someone@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send sign-in link' }))
}

describe('sign-in error announcement', () => {
    it('exposes the error as an alert', async () => {
        renderLogin({ withError: true })
        await submit()

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain(ERROR)
    })

    it('moves focus to the error so it is not silently missed on a fresh document', async () => {
        renderLogin({ withError: true })
        await submit()

        const alert = await screen.findByRole('alert')
        await waitFor(() => {
            expect(document.activeElement).toBe(alert)
        })
    })

    it('renders no alert before a failed submit', async () => {
        renderLogin({ withError: true })
        await screen.findByRole('button', { name: 'Send sign-in link' })

        expect(screen.queryByRole('alert')).toBeNull()
    })
})
