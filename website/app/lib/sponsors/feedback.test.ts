import { describe, expect, it } from 'vitest'
import { parseFormData } from '../forms/parse-form.server'
import {
    feedbackRequestEmail,
    parseRecipients,
    planFeedbackRequests,
    sponsorFeedbackSchema,
    toSponsorFeedbackInput,
} from './feedback'

function form(values: Record<string, string>) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) formData.set(key, value)
    return parseFormData(sponsorFeedbackSchema, formData)
}

describe('sponsor feedback form', () => {
    it('accepts any single answer', () => {
        expect(form({ ideas: 'A quiet room for interviews' }).ok).toBe(true)
        expect(form({ rating: '5' }).ok).toBe(true)
    })

    it('refuses an empty submission', () => {
        const parsed = form({ rating: '', experience: '  ' })
        expect(parsed).toEqual({ ok: false, fieldErrors: { _form: 'Answer at least one question before saving' } })
    })

    it('refuses a rating outside 1–5', () => {
        expect(form({ rating: '9' }).ok).toBe(false)
    })

    it('drops the attribution when there is no testimonial to attach them to', () => {
        const parsed = form({ experience: 'Good', testimonialAttribution: 'Sam, CTO' })
        if (!parsed.ok) throw new Error('expected a valid form')
        expect(toSponsorFeedbackInput(parsed.data)).toEqual({
            rating: null,
            experience: 'Good',
            ideas: null,
            testimonial: null,
            testimonialAttribution: null,
            portalFeedback: null,
        })
    })
})

describe('parseRecipients', () => {
    it('splits on commas, semicolons and new lines, and dedupes case-insensitively', () => {
        expect(parseRecipients('a@acme.test, B@acme.test;\nc@acme.test  a@ACME.test')).toEqual({
            emails: ['a@acme.test', 'b@acme.test', 'c@acme.test'],
            invalid: [],
        })
    })

    it('keeps the address out of an Outlook-style "Name <address>" paste', () => {
        expect(parseRecipients('Sam Smith <sam@acme.test>; "Lee, Jo" <jo@acme.test>')).toEqual({
            emails: ['sam@acme.test', 'jo@acme.test'],
            invalid: [],
        })
    })

    it('reports anything that is not an address', () => {
        expect(parseRecipients('a@acme.test, not-an-email').invalid).toEqual(['not-an-email'])
    })
})

describe('planFeedbackRequests', () => {
    const sponsors = [
        { issueKey: 'SPN-1', companyName: 'Acme', contacts: ['a@acme.test', 'B@acme.test'] },
        { issueKey: 'SPN-2', companyName: 'Globex', contacts: ['g@globex.test'] },
    ]

    it('sends one email per ticked sponsor, with every address in it', () => {
        const plan = planFeedbackRequests({
            sponsors,
            selected: ['SPN-1'],
            recipientsByIssueKey: { 'SPN-1': 'a@acme.test, b@acme.test', 'SPN-2': 'g@globex.test' },
        })
        expect(plan).toEqual({
            requests: [
                { issueKey: 'SPN-1', companyName: 'Acme', recipients: ['a@acme.test', 'b@acme.test'], notContacts: [] },
            ],
            errors: [],
        })
    })

    it("flags recipients who can't sign in to the portal to answer", () => {
        const plan = planFeedbackRequests({
            sponsors,
            selected: ['SPN-2'],
            recipientsByIssueKey: { 'SPN-2': 'g@globex.test, boss@globex.test' },
        })
        expect(plan.requests[0].notContacts).toEqual(['boss@globex.test'])
    })

    it('reports a sponsor with no addresses, a bad address, or an unknown key', () => {
        const plan = planFeedbackRequests({
            sponsors,
            selected: ['SPN-1', 'SPN-2', 'SPN-99'],
            recipientsByIssueKey: { 'SPN-1': '', 'SPN-2': 'oops' },
        })
        expect(plan.requests).toEqual([])
        expect(plan.errors.map((e) => e.issueKey)).toEqual(['SPN-1', 'SPN-2', 'SPN-99'])
    })
})

describe('feedbackRequestEmail', () => {
    const vars = {
        companyName: 'Acme <Labs>',
        conferenceName: 'DDD Perth',
        year: '2026',
        feedbackUrl: 'https://dddperth.com/portal/feedback',
        senderName: 'Jake',
    }

    it('links to the portal feedback page in both bodies', () => {
        const email = feedbackRequestEmail(vars)
        expect(email.subject).toBe('How was sponsoring DDD Perth 2026?')
        expect(email.text).toContain(vars.feedbackUrl)
        expect(email.html).toContain(`href="${vars.feedbackUrl}"`)
    })

    it('escapes sponsor names in the HTML body', () => {
        const email = feedbackRequestEmail(vars)
        expect(email.html).toContain('Acme &lt;Labs&gt;')
        expect(email.html).not.toContain('<Labs>')
    })
})
