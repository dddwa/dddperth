import { useEffect, useMemo, useState } from 'react'

/** Advance the request provider's instant by monotonic browser elapsed time. */
export function useConferenceClock(serverNow: string | undefined, tickEveryMillis = 30_000): number | undefined {
    const serverMillis = useMemo(() => serverNow ? Date.parse(serverNow) : undefined, [serverNow])
    const [now, setNow] = useState(serverMillis)

    useEffect(() => {
        if (serverMillis === undefined) { setNow(undefined); return }
        const mountedAt = performance.now()
        let timer: ReturnType<typeof setTimeout>
        const tick = () => {
            const current = serverMillis + performance.now() - mountedAt
            setNow(current)
            clearTimeout(timer)
            // Align to the provider clock: run-sheet rows switch at the minute.
            timer = setTimeout(tick, Math.max(1, tickEveryMillis - current % tickEveryMillis))
        }
        tick()
        document.addEventListener('visibilitychange', tick)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('visibilitychange', tick)
        }
    }, [serverMillis, tickEveryMillis])

    return now
}
