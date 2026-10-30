import { describe, expect, it } from 'vitest'
import {
    conferenceFeedbackSchema,
    HONEYPOT_FIELD,
    looksLikeSpam,
    MIN_FILL_MS,
    STARTED_AT_FIELD,
    talkFeedbackSchema,
} from './feedback-submission'

function form(fields: Record<string, string>) {
    const data = new FormData()
    for (const [key, value] of Object.entries(fields)) data.set(key, value)
    return data
}

describe('looksLikeSpam', () => {
    const now = 1_000_000

    it('lets through a person who took a few seconds and left the honeypot empty', () => {
        expect(looksLikeSpam(form({ [STARTED_AT_FIELD]: String(now - MIN_FILL_MS), [HONEYPOT_FIELD]: '' }), now)).toBe(
            false,
        )
    })

    it('catches a filled honeypot, an instant submit, and a missing start time', () => {
        expect(looksLikeSpam(form({ [STARTED_AT_FIELD]: String(now - 60_000), [HONEYPOT_FIELD]: 'x' }), now)).toBe(true)
        expect(looksLikeSpam(form({ [STARTED_AT_FIELD]: String(now - 500) }), now)).toBe(true)
        expect(looksLikeSpam(form({}), now)).toBe(true)
    })
})

describe('feedback schemas', () => {
    it('requires a 1–5 rating and turns blank optional fields into null', () => {
        expect(conferenceFeedbackSchema.parse({ rating: '5', bestThing: '  ', email: '' })).toEqual({
            rating: 5,
            bestThing: null,
            ideas: null,
            meetTheExperts: null,
            feedback: null,
            email: null,
        })
        expect(conferenceFeedbackSchema.safeParse({ rating: '6' }).success).toBe(false)
        expect(conferenceFeedbackSchema.safeParse({}).success).toBe(false)
    })

    it('needs a talk, and rejects a malformed email rather than storing it', () => {
        expect(talkFeedbackSchema.safeParse({ rating: '3' }).success).toBe(false)
        expect(talkFeedbackSchema.safeParse({ targetId: '1', rating: '3', email: 'nope' }).success).toBe(false)
        expect(talkFeedbackSchema.parse({ targetId: '1', rating: '3', email: ' Me@Example.com ' }).email).toBe(
            'me@example.com',
        )
    })
})
