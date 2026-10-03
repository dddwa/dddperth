import { useEffect, useMemo } from 'react'
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
