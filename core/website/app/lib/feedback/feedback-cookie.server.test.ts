import { describe, expect, it } from 'vitest'
import { readFeedbackBrowserId, writeFeedbackCookie } from './feedback-cookie.server'

describe('feedback cookie', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e'

    it('round-trips a browser id and ignores anything that is not a uuid', () => {
        const [pair] = writeFeedbackCookie(id).split(';')
        expect(readFeedbackBrowserId(new Request('https://x/feedback', { headers: { Cookie: `a=b; ${pair}` } }))).toBe(id)
        expect(readFeedbackBrowserId(new Request('https://x/', { headers: { Cookie: '__feedback=nope' } }))).toBeUndefined()
    })

    it('is sent with React Router data requests, not only /feedback itself', () => {
        expect(writeFeedbackCookie(id)).toContain('Path=/;')
    })
})
