// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useConferenceClock } from './use-conference-clock'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('useConferenceClock', () => {
    it('advances the provider override independently of device wall-clock changes', () => {
        vi.useFakeTimers()
        let elapsed = 0
        vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
        const override = '2026-10-03T09:00:00+08:00'
        const { result } = renderHook(() => useConferenceClock(override))
        expect(result.current).toBe(Date.parse(override))
        act(() => { elapsed = 30_000; vi.setSystemTime(new Date('2030-01-01')); vi.advanceTimersByTime(30_000) })
        expect(result.current).toBe(Date.parse(override) + 30_000)
    })

    it('updates run sheets at the provider minute boundary', () => {
        vi.useFakeTimers()
        let elapsed = 0
        vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
        const override = '2026-10-03T09:00:30+08:00'
        const { result } = renderHook(() => useConferenceClock(override, 60_000))
        act(() => { elapsed = 29_999; vi.advanceTimersByTime(29_999) })
        expect(result.current).toBe(Date.parse(override))
        act(() => { elapsed = 30_000; vi.advanceTimersByTime(1) })
        expect(result.current).toBe(Date.parse(override) + 30_000)
    })

    it('resets its anchor when the loader provides a new instant and when disabled', () => {
        vi.useFakeTimers()
        vi.spyOn(performance, 'now').mockReturnValue(0)
        const initialProps: { now: string | undefined } = { now: '2026-10-03T09:00:00+08:00' }
        const { result, rerender } = renderHook(({ now }: { now: string | undefined }) => useConferenceClock(now), {
            initialProps,
        })
        rerender({ now: '2026-10-03T12:00:00+08:00' })
        expect(result.current).toBe(Date.parse('2026-10-03T12:00:00+08:00'))
        rerender({ now: undefined })
        expect(result.current).toBeUndefined()
    })
})
