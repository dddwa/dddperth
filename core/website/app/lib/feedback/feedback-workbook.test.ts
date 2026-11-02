import { describe, expect, it } from 'vitest'
import { buildFeedbackReport } from './feedback-report'
import readWorkbook from 'read-excel-file/node'
import { buildFeedbackWorkbook } from './feedback-workbook'

describe('buildFeedbackWorkbook', () => {
    it('writes conference, talk summary and talk feedback sheets, with formula-looking text kept as text', async () => {
        const report = buildFeedbackReport(
            [{ id: 't1', kind: 'talk', title: 'Talk', speakers: 'Ada', time: '10:30 am', room: 'R1', label: '' }],
            [
                {
                    id: 'c1',
                    rating: 5,
                    bestThing: '=HYPERLINK("x")',
                    ideas: null,
                    meetTheExperts: null,
                    feedback: null,
                    email: null,
                    submittedAt: 1_791_000_000,
                },
            ],
            [
                {
                    id: 'f1',
                    targetId: 't1',
                    rating: 4,
                    speakerFeedback: 'Nice',
                    organiserFeedback: null,
                    email: 'a@example.com',
                    submittedAt: 1_791_000_000,
                },
            ],
        )

        const sheets = await readWorkbook(Buffer.from(buildFeedbackWorkbook(report, 'Australia/Perth')))
        expect(sheets.map((sheet) => sheet.sheet)).toEqual(['Conference', 'Talk summary', 'Talk feedback'])
        expect(sheets[0].data[1][1]).toBe('=HYPERLINK("x")')

        const records = (sheet: (typeof sheets)[number]) => {
            const [headers, ...rows] = sheet.data
            return rows.map((row) => Object.fromEntries(headers.map((header, i) => [String(header), row[i]])))
        }
        expect(records(sheets[1])).toEqual([
            expect.objectContaining({ Talk: 'Talk', Responses: 1, Average: 4, '★4': 1 }),
        ])
        expect(records(sheets[2])).toEqual([
            expect.objectContaining({
                Talk: 'Talk',
                Rating: 4,
                'Feedback for speaker': 'Nice',
                Email: 'a@example.com',
            }),
        ])
    })
})
