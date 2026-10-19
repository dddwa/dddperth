// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { useQueuedSave } from './use-queued-save'

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

it('revalidates once after a queue drains and never starts an idle reload loop', async () => {
    let finish: (response: Response) => void = () => {}
    const fetchMock = vi.fn<typeof fetch>(
        () =>
            new Promise<Response>((resolve) => {
                finish = resolve
            }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const loader = vi.fn(async () => {
        // Bound a regression so the old idle loop cannot run forever.
        if (loader.mock.calls.length > 4) throw new Error('Repeated idle reload')
        return null
    })
    function Planner() {
        const { save, isSaving } = useQueuedSave('test', '/save')
        return <button onClick={() => save({ value: 'a' })}>{isSaving ? 'Saving' : 'Edit'}</button>
    }
    const router = createMemoryRouter([{ path: '/', loader, Component: Planner }])
    render(<RouterProvider router={router} />)
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(loader).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Saving'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await act(async () => finish(Response.json({ success: true })))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(loader).toHaveBeenCalledTimes(1)
    await act(async () => finish(Response.json({ success: true })))
    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy())
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(loader).toHaveBeenCalledTimes(2)
    router.dispose()
})
