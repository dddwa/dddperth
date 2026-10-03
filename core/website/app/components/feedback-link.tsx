import { useEffect, useMemo, useState } from 'react'
import { useFetcher } from 'react-router'
import { AppLink } from '~/components/app-link'
import type { loader as reviewedLoader } from '~/routes/api.feedback.reviewed'
import { styled } from '~/styled-system/jsx'

/**
 * Which talks this browser has already reviewed. Fetched after the page loads
 * (see `api.feedback.reviewed`), so until it arrives every talk shows the link.
 */
export function useReviewedFeedback(enabled: boolean): ReadonlySet<string> {
    const fetcher = useFetcher<typeof reviewedLoader>()
    const { load, state, data } = fetcher

    useEffect(() => {
        if (enabled && state === 'idle' && !data) void load('/api/feedback/reviewed')
    }, [enabled, state, data, load])

    return useMemo(() => new Set(data?.ids ?? []), [data])
}

/**
 * "Now" for deciding which talks have finished, in epoch millis. It starts at
 * the server's now, which follows the admin and e2e date overrides, and so
 * renders the same on the server and at hydration. From then it advances with
 * the browser's clock, so a talk's link appears when it ends without a reload.
 * The agenda is cached, so the starting point can be up to that cache's age
 * behind, and a link can appear that much late.
 */
export function useFeedbackClock(serverNow: string | undefined): number | undefined {
    const serverMillis = useMemo(() => (serverNow ? Date.parse(serverNow) : undefined), [serverNow])
    const [now, setNow] = useState(serverMillis)

    useEffect(() => {
        if (serverMillis === undefined) return
        const mountedAt = Date.now()
        const tick = () => setNow(serverMillis + (Date.now() - mountedAt))
        tick()
        const interval = setInterval(tick, 30_000)
        return () => clearInterval(interval)
    }, [serverMillis])

    return now
}

/** "Give feedback", or plain "Feedback submitted" once this browser has reviewed it. */
export function FeedbackLink({
    id,
    title,
    reviewed,
    label = 'Give feedback',
}: {
    id: string
    title: string
    reviewed: boolean
    label?: string
}) {
    if (reviewed) {
        return (
            <styled.span display="inline-block" mt="2" color="text.secondary" fontSize={{ base: 'xs', xl: 'sm' }}>
                ✓ Feedback submitted
            </styled.span>
        )
    }

    return (
        <AppLink
            to={`/feedback?talk=${encodeURIComponent(id)}`}
            unstyled
            aria-label={`Give feedback on ${title}`}
            display="inline-block"
            mt="2"
            color="text.highlight"
            textDecoration="underline"
            fontSize={{ base: 'xs', xl: 'sm' }}
        >
            {label}
        </AppLink>
    )
}
