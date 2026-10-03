import { describe, expect, it } from 'vitest'
import { read as readWorkbook, utils as sheetUtils } from 'xlsx'
import { buildFeedbackReport } from './feedback-report'
import { buildFeedbackWorkbook } from './feedback-workbook'

describe('buildFeedbackWorkbook', () => {
    it('writes conference, talk summary and talk feedback sheets, with formula-looking text kept as text', () => {
        const report = buildFeedbackReport(
            [{ id: 't1', kind: 'talk', title: 'Talk', speakers: 'Ada', time: '10:30 am', room: 'R1', label: '' }],
            [
                {
                    id: 'c1',
                    rating: 5,
                    bestThing: '=HYPERLINK("x")',
                    ideas: null,
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

        const workbook = readWorkbook(buildFeedbackWorkbook(report, 'Australia/Perth'))
        expect(workbook.SheetNames).toEqual(['Conference', 'Talk summary', 'Talk feedback'])

        const conference = workbook.Sheets.Conference
        expect(conference.B2).toMatchObject({ t: 's', v: '=HYPERLINK("x")' })
        expect(conference.B2.f).toBeUndefined()

        expect(sheetUtils.sheet_to_json(workbook.Sheets['Talk summary'])).toEqual([
            expect.objectContaining({ Talk: 'Talk', Responses: 1, Average: 4, '★4': 1 }),
        ])
        expect(sheetUtils.sheet_to_json(workbook.Sheets['Talk feedback'])).toEqual([
            expect.objectContaining({ Talk: 'Talk', Rating: 4, 'Feedback for speaker': 'Nice', Email: 'a@example.com' }),
        ])
    })
})
