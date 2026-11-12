import { describe, expect, it } from 'vitest'
import { parseFormData } from '~/lib/forms/parse-form.server'
import { conferenceTime } from '~/lib/dates/temporal'
import { competitionEntrySchema, competitionStatus, emailKey, findCompetition, MAX_ANSWER } from './competition-entry'

describe('competitionStatus', () => {
    const window = {
        get opens() {
            return conferenceTime('2026-10-03T09:00')
        },
        get closes() {
            return conferenceTime('2026-10-03T17:00')
        },
    }

    it('opens at `opens` exactly and closes at `closes` exactly', () => {
        expect(competitionStatus(window, conferenceTime('2026-10-03T08:59:59'))).toBe('upcoming')
        expect(competitionStatus(window, conferenceTime('2026-10-03T09:00'))).toBe('open')
        expect(competitionStatus(window, conferenceTime('2026-10-03T16:59:59'))).toBe('open')
        expect(competitionStatus(window, conferenceTime('2026-10-03T17:00'))).toBe('closed')
    })

    it('compares instants, whatever zone "now" is expressed in', () => {
        const justOpened = conferenceTime('2026-10-03T09:00').withTimeZone('America/Los_Angeles')
        expect(competitionStatus(window, justOpened)).toBe('open')
    })
})

describe('findCompetition', () => {
    const competitions = [{ slug: 'win-a-thing' }, { slug: 'other' }] as never

    it('finds by exact slug only', () => {
        expect(findCompetition(competitions, 'other')).toEqual({ slug: 'other' })
        expect(findCompetition(competitions, 'Other')).toBeUndefined()
        expect(findCompetition(competitions, undefined)).toBeUndefined()
        expect(findCompetition(undefined, 'other')).toBeUndefined()
    })
})

describe('emailKey', () => {
    it('folds +tags, case and surrounding space for any provider', () => {
        expect(emailKey('  Jo.Smith+comp@Example.com ')).toBe('jo.smith@example.com')
    })

    it('ignores dots and googlemail.com for Gmail, as Gmail does', () => {
        expect(emailKey('j.o.smith+2@googlemail.com')).toBe(emailKey('josmith@gmail.com'))
    })

    it('keeps dots for other providers, where they are significant', () => {
        expect(emailKey('j.o@example.com')).not.toBe(emailKey('jo@example.com'))
    })

    it('leaves a leading + alone rather than producing an empty local part', () => {
        expect(emailKey('+jo@example.com')).toBe('+jo@example.com')
    })
})

describe('competitionEntrySchema', () => {
    const form = (fields: Record<string, string>) => {
        const data = new FormData()
        for (const [key, value] of Object.entries(fields)) data.set(key, value)
        return data
    }
    const valid = { name: ' Jo ', email: ' Jo@Example.com ', answer: ' Because ', acceptTerms: 'yes' }

    it('trims and lowercases a valid entry', () => {
        expect(parseFormData(competitionEntrySchema, form(valid))).toEqual({
            ok: true,
            data: { name: 'Jo', email: 'jo@example.com', answer: 'Because', acceptTerms: 'yes' },
        })
    })

    it('requires the terms to be accepted', () => {
        const { acceptTerms: _, ...withoutTerms } = valid
        const parsed = parseFormData(competitionEntrySchema, form(withoutTerms))
        expect(parsed).toEqual({
            ok: false,
            fieldErrors: { acceptTerms: 'Please accept the terms and conditions to enter.' },
        })
    })

    it('rejects blank fields, bad emails and over-long answers', () => {
        const parsed = parseFormData(
            competitionEntrySchema,
            form({ ...valid, name: '   ', email: 'not-an-email', answer: 'x'.repeat(MAX_ANSWER + 1) }),
        )
        expect(parsed.ok).toBe(false)
        if (parsed.ok) return
        expect(Object.keys(parsed.fieldErrors).sort()).toEqual(['answer', 'email', 'name'])
    })
})
