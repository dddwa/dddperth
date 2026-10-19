// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useMyAgenda } from './use-my-agenda'

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

it('waits for the first shortlist identity and preserves add/remove ordering', async () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
    })
    let finish: (response: Response) => void = () => {}
    const fetchMock = vi.fn<typeof fetch>(
        () =>
            new Promise<Response>((resolve) => {
                finish = resolve
            }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const a = { id: 'A', startsAt: '2026-11-14T09:00:00', endsAt: '2026-11-14T10:00:00' }
    const b = { ...a, id: 'B' }
    const { result } = renderHook(() =>
        useMyAgenda(
            '2026',
            new Map([
                ['A', a],
                ['B', b],
            ]),
        ),
    )
    act(() => {
        result.current.toggle(a)
        result.current.toggle(b)
    })
    expect(result.current.picked).toEqual(['B'])
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await act(async () => finish(Response.json({ ok: true })))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await act(async () => finish(Response.json({ ok: true })))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    await act(async () => finish(Response.json({ ok: true })))
    expect(
        fetchMock.mock.calls.map(([, init]) => {
            const body = init?.body
            if (!(body instanceof URLSearchParams)) throw new Error('Expected shortlist form body')
            return [body.get('talkId'), body.get('action')]
        }),
    ).toEqual([
        ['A', 'add'],
        ['B', 'add'],
        ['A', 'remove'],
    ])
})
