// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createRoutesStub, data } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import AdminLayout, { ErrorBoundary } from './admin'

afterEach(cleanup)

describe('admin error page', () => {
    function renderThrowing(thrown: unknown) {
        const Stub = createRoutesStub([
            {
                path: '/admin',
                Component: AdminLayout,
                ErrorBoundary,
                loader: () => {
                    throw thrown
                },
            },
        ])
        render(<Stub initialEntries={['/admin']} />)
    }

    it('says the signed-in email has no admin access, without mentioning sponsors', async () => {
        renderThrowing(data({ reason: 'not-an-admin', email: 'someone@elsewhere.test' }, { status: 403 }))

        expect(await screen.findByText('someone@elsewhere.test')).toBeTruthy()
        expect(screen.getByText(/doesn't have admin access/)).toBeTruthy()
        expect(screen.queryByText(/sponsor/i)).toBeNull()
    })

    it('lets the user sign out and straight back in to the admin area', async () => {
        renderThrowing(data({ reason: 'not-an-admin', email: 'someone@elsewhere.test' }, { status: 403 }))

        const button = await screen.findByRole('button', { name: 'Sign in with a different email' })
        const form = button.closest('form')
        expect(form?.getAttribute('action')).toBe('/auth/logout')
        const redirectTo = form?.querySelector<HTMLInputElement>('input[name="redirectTo"]')?.value
        expect(redirectTo).toBe('/auth/login?redirectTo=%2Fadmin')
    })

    it('keeps a generic message for anything else', async () => {
        renderThrowing(new Error('D1 unavailable'))

        expect(await screen.findByText(/something went wrong loading the admin area/i)).toBeTruthy()
    })
})
