/**
 * Manual "here's the Meet the Experts schedule" email for the admin seating
 * page (routes/admin.speakers.experts.tsx). Goes to speakers *and* sponsors
 * — anyone who registered for a slot — so the copy never assumes the reader
 * is a speaker. The schedule is the grid as currently seated: one row per
 * configured slot, one column per table. Pure so it's unit-testable.
 */

export interface ScheduleEmailInput {
    conferenceName: string
    slots: Array<{ id: string; label: string }>
    tables: Array<{ id: string; label: string }>
    assignments: Array<{ tableId: string; slotId: string; displayName: string }>
}

type Seat = ScheduleEmailInput['assignments'][number]

/** Each cell is the whole assignment, so a caller that seats richer records
 * (the public agenda carries each person's bio) gets them back as-is. */
export interface ScheduleGrid<T extends Seat = Seat> {
    tableLabels: string[]
    rows: Array<{ slotLabel: string; cells: Array<T | null> }>
}

export function buildScheduleGrid<T extends Seat>({
    slots,
    tables,
    assignments,
}: Omit<ScheduleEmailInput, 'conferenceName' | 'assignments'> & { assignments: T[] }): ScheduleGrid<T> {
    const seated = new Map(assignments.map((a) => [`${a.tableId}:${a.slotId}`, a]))
    return {
        tableLabels: tables.map((t) => t.label),
        rows: slots.map((slot) => ({
            slotLabel: slot.label,
            cells: tables.map((table) => seated.get(`${table.id}:${slot.id}`) ?? null),
        })),
    }
}

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function buildScheduleEmail(input: ScheduleEmailInput): { subject: string; text: string; html: string } {
    const { conferenceName } = input
    const grid = buildScheduleGrid(input)

    // Plain text can't hold a grid legibly, so it's grouped by slot instead.
    const textSchedule = grid.rows
        .map(
            (row) =>
                `${row.slotLabel}\n` +
                grid.tableLabels.map((table, i) => `  ${table}: ${row.cells[i]?.displayName ?? '—'}`).join('\n'),
        )
        .join('\n\n')

    const cell = 'border:1px solid #ccc;padding:6px 10px;text-align:left;vertical-align:top'
    const htmlSchedule = `<table style="border-collapse:collapse">
<thead><tr><th style="${cell}">Time</th>${grid.tableLabels.map((t) => `<th style="${cell}">${escapeHtml(t)}</th>`).join('')}</tr></thead>
<tbody>
${grid.rows
    .map(
        (row) =>
            `<tr><th style="${cell}">${escapeHtml(row.slotLabel)}</th>${row.cells.map((c) => `<td style="${cell}">${c ? escapeHtml(c.displayName) : '—'}</td>`).join('')}</tr>`,
    )
    .join('\n')}
</tbody>
</table>`

    return {
        subject: `Meet the Experts schedule — ${conferenceName}`,
        text: `Hi all,

Thanks for signing up for Meet the Experts at ${conferenceName}! Here's where everyone is seated:

${textSchedule}

If anything's changed and you can't make your time, just reply and let us know.

Thanks,
${conferenceName} team`,
        html: `<p>Hi all,</p>
<p>Thanks for signing up for Meet the Experts at ${escapeHtml(conferenceName)}! Here's where everyone is seated:</p>
${htmlSchedule}
<p>If anything's changed and you can't make your time, just reply and let us know.</p>
<p>Thanks,<br/>${escapeHtml(conferenceName)} team</p>`,
    }
}
