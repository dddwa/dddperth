import { conferenceInstant } from '~/lib/dates/temporal'
import type { CompetitionEntry } from '~/lib/services/competition-store'
import { writeXlsx } from '~/lib/xlsx-writer'

/**
 * Entries as an .xlsx rather than a CSV: cells are typed values, so an answer
 * starting with `=` stays text instead of becoming a formula.
 */
export function buildCompetitionWorkbook(entries: CompetitionEntry[], timezone?: string): Uint8Array<ArrayBuffer> {
    const submitted = (seconds: number) =>
        conferenceInstant(seconds * 1000, { timeZone: timezone })
            .toPlainDateTime()
            .toString({ smallestUnit: 'minute' })
            .replace('T', ' ')

    return writeXlsx([
        {
            name: 'Entries',
            rows: [
                ['Name', 'Email', 'Answer', 'Submitted'],
                ...entries.map((entry) => [entry.name, entry.email, entry.answer, submitted(entry.submittedAt)]),
            ],
        },
    ])
}
