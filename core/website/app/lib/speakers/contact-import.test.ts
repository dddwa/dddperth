import { describe, expect, it } from 'vitest'
import { computeContactImportPlan, parseCsv, parseSpeakerContactsCsv, type CsvSpeakerRow } from './contact-import'

describe('parseCsv', () => {
    it('splits simple rows', () => {
        expect(parseCsv('a,b,c\n1,2,3')).toEqual([
            ['a', 'b', 'c'],
            ['1', '2', '3'],
        ])
    })

    it('handles quoted fields containing commas and embedded newlines', () => {
        const csv = 'Title,Description\n"Hello, world","Line one\nLine two"\n'
        expect(parseCsv(csv)).toEqual([
            ['Title', 'Description'],
            ['Hello, world', 'Line one\nLine two'],
        ])
    })

    it('unescapes doubled quotes inside a quoted field', () => {
        expect(parseCsv('Title\n"She said ""hi"""')).toEqual([['Title'], ['She said "hi"']])
    })

    it('strips a leading BOM', () => {
        expect(parseCsv('﻿a,b\n1,2')).toEqual([
            ['a', 'b'],
            ['1', '2'],
        ])
    })

    it('tolerates a missing trailing newline', () => {
        expect(parseCsv('a,b\n1,2')).toEqual([
            ['a', 'b'],
            ['1', '2'],
        ])
    })
})

const HEADER =
    'Session Id,Title,Description,Owner,Owner Email,Session format,Level,General Topic Category,Talk Topics,' +
    'Did you use AI to write this proposal?,Owner Informed,Owner Confirmed,Room,Scheduled At,Scheduled Duration,' +
    'Live Link,Recording Link,Favorited Count,Speaker Id,FirstName,LastName,Email,TagLine,Bio,Mobile phone,' +
    'Are you a member of any underrepresented groups?,Your pronoun,How would you identify your job role?,' +
    'How much speaking experience do you have?,Speaker Additional Information ,I will uphold and exemplify the Code of Conduct,' +
    'LinkedIn,Blog,X (Twitter),Profile Picture'

function csvRow(fields: Record<string, string>): string {
    const values = HEADER.split(',').map((col) => {
        const value = fields[col] ?? ''
        return value.includes(',') || value.includes('"') ? `"${value.replaceAll('"', '""')}"` : value
    })
    return values.join(',')
}

describe('parseSpeakerContactsCsv', () => {
    it('extracts sessionizeId, sessionId, email, title and name', () => {
        const csv =
            HEADER +
            '\n' +
            csvRow({
                'Session Id': '1231798',
                Title: 'A great talk',
                'Speaker Id': 'spk-1',
                FirstName: 'Ada',
                LastName: 'Lovelace',
                Email: 'ada@example.com',
            })

        const rows = parseSpeakerContactsCsv(csv)
        expect(rows).toEqual([
            {
                sessionizeId: 'spk-1',
                sessionId: '1231798',
                email: 'ada@example.com',
                sessionTitle: 'A great talk',
                fullName: 'Ada Lovelace',
            },
        ])
    })

    it('carries the session title forward onto a co-presenter continuation row with a blank title', () => {
        const csv =
            HEADER +
            '\n' +
            csvRow({
                'Session Id': '1270736',
                Title: 'What Women Want',
                'Speaker Id': 'spk-1',
                FirstName: 'Cheryl',
                LastName: 'Watts',
                Email: 'cheryl@example.com',
            }) +
            '\n' +
            csvRow({
                'Session Id': '1270736',
                'Speaker Id': 'spk-2',
                FirstName: 'Dale',
                LastName: 'Field',
                Email: 'dale@example.com',
            })

        const rows = parseSpeakerContactsCsv(csv)
        expect(rows[1]).toMatchObject({
            sessionizeId: 'spk-2',
            sessionId: '1270736',
            sessionTitle: 'What Women Want',
            email: 'dale@example.com',
        })
    })

    it('drops rows missing a Speaker Id or Email', () => {
        const csv =
            HEADER +
            '\n' +
            csvRow({ 'Session Id': '1', Title: 'No speaker id', Email: 'x@example.com' }) +
            '\n' +
            csvRow({ 'Session Id': '2', Title: 'No email', 'Speaker Id': 'spk-9' })

        expect(parseSpeakerContactsCsv(csv)).toEqual([])
    })

    it('throws when the required columns are missing', () => {
        expect(() => parseSpeakerContactsCsv('Title,Description\nA,B')).toThrow(/Speaker Id/)
    })

    it('returns an empty array for an empty file', () => {
        expect(parseSpeakerContactsCsv('')).toEqual([])
    })
})

describe('computeContactImportPlan', () => {
    const row = (overrides: Partial<CsvSpeakerRow> = {}): CsvSpeakerRow => ({
        sessionizeId: 'spk-1',
        sessionId: 'SESS-1',
        email: 'ada@example.com',
        sessionTitle: 'A great talk',
        fullName: 'Ada Lovelace',
        ...overrides,
    })

    it('grants a synced speaker whose session id matches', () => {
        const plan = computeContactImportPlan({
            rows: [row()],
            speakers: [{ sessionizeId: 'spk-1', contacts: [], sessions: [{ sessionizeSessionId: 'SESS-1' }] }],
        })
        expect(plan.grants).toEqual([{ sessionizeId: 'spk-1', email: 'ada@example.com' }])
        expect(plan.rows[0].status).toBe('granted')
    })

    it('still grants — but flags — a speaker with no synced record yet', () => {
        const plan = computeContactImportPlan({ rows: [row()], speakers: [] })
        expect(plan.grants).toEqual([{ sessionizeId: 'spk-1', email: 'ada@example.com' }])
        expect(plan.rows[0].status).toBe('unknown-speaker')
    })

    it('still grants — but flags — a session id that does not match any synced session', () => {
        const plan = computeContactImportPlan({
            rows: [row()],
            speakers: [{ sessionizeId: 'spk-1', contacts: [], sessions: [{ sessionizeSessionId: 'SESS-OTHER' }] }],
        })
        expect(plan.grants).toEqual([{ sessionizeId: 'spk-1', email: 'ada@example.com' }])
        expect(plan.rows[0].status).toBe('session-mismatch')
    })

    it('flags an email already granted for that speaker', () => {
        const plan = computeContactImportPlan({
            rows: [row()],
            speakers: [{ sessionizeId: 'spk-1', contacts: ['ADA@example.com'], sessions: [] }],
        })
        expect(plan.rows[0].status).toBe('already-granted')
    })

    it('dedupes repeated (sessionizeId, email) pairs within the file', () => {
        const plan = computeContactImportPlan({
            rows: [row(), row({ sessionTitle: 'Different casing of same row' })],
            speakers: [],
        })
        expect(plan.grants).toHaveLength(1)
        expect(plan.rows).toHaveLength(1)
    })

    it('does not flag session-mismatch when the row has no session id to check', () => {
        const plan = computeContactImportPlan({
            rows: [row({ sessionId: '' })],
            speakers: [{ sessionizeId: 'spk-1', contacts: [], sessions: [{ sessionizeSessionId: 'SESS-OTHER' }] }],
        })
        expect(plan.rows[0].status).toBe('granted')
    })
})
