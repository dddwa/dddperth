/**
 * Builds the venue's "Supplier & Exhibitor List" spreadsheet from sponsor
 * records.
 *
 * The venue (Optus Stadium) supplies a fixed template — a title row, a header
 * row, then one row per exhibitor. Its columns are reproduced here rather than
 * filled into the supplied .xlsx: the template carries printer settings and
 * data-validation dropdowns that aren't worth round-tripping through a
 * spreadsheet library, and the venue only cares about the tabular content.
 *
 * Column order is the venue's and must not be reordered — they read it by
 * position. Every column is emitted even when we have nothing for it, so the
 * shape of what's handed over stays constant and the gaps are visible.
 */

/** One exhibitor's logistics, as far as we know it. */
export interface ExhibitorSource {
    companyName: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    /** Jira's combined "Bump In Day/Time Start", e.g. "Friday 1pm - 2pm". */
    bumpInSlot?: string
    /** Jira's "Bump Out Window", e.g. "Saturday 4pm". */
    bumpOutWindow?: string
    /** Named to match the Jira mapping, so a spread can't silently drop it. */
    parking?: string
    parkingTimes?: string
    equipmentList?: string
    trolleyOrForklift?: string
    loadingDockAssistance?: string
    additionalNotes?: string
}

/** The venue's column headers, in the order the template lists them. */
export const EXHIBITOR_COLUMNS = [
    'Exhibitor Company Name',
    'Contact First & Last Name',
    'Contact Phone Number',
    'Email Address',
    'Bump-In Date (DD/MM/YYYY)',
    'Bump-In Time (HH:MM)',
    'Bump-Out Date\n(DD/MM/YYYY)',
    'Bump-Out Time\n(HH:MM)',
    'Parking Required? ',
    'Parking Times\n(If Required)',
    'Equipment List - Include Approx. Qnty and Weight',
    'Is a Trolley Required?',
    'Is a Forklift Required?',
    'Assistance Required Moving From Loading Dock to Room?',
    'Additional Notes',
] as const

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * Splits a Jira bump slot into the venue's separate date and time columns.
 *
 * Jira stores one option ("Friday 1pm - 2pm", "Saturday 6.30am to 7am"); the
 * venue wants a DD/MM/YYYY date and an HH:MM start time. The weekday in the
 * option is resolved against the conference date — the only anchor we have —
 * by walking back to the most recent matching weekday on or before it. That
 * covers the template's Friday/Saturday options without hardcoding "the day
 * before".
 *
 * Anything that doesn't parse is passed through in the date column untouched
 * rather than dropped, so the committee sees the original text and can fix it
 * by hand instead of silently shipping a blank cell to the venue.
 */
export function splitBumpSlot(
    slot: string | undefined,
    conferenceDate: Date | undefined,
): { date: string; time: string } {
    if (!slot?.trim()) return { date: '', time: '' }

    const text = slot.trim()
    const weekdayMatch = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.exec(text)
    // Anchored to just after the weekday so a range ("Friday noon - 1pm")
    // can't yield its END time as the start. A slot whose start isn't a
    // numeric time ("noon") therefore reports no time at all, rather than
    // confidently reporting the wrong one to the venue.
    const afterWeekday = weekdayMatch ? text.slice(weekdayMatch.index + weekdayMatch[0].length) : ''
    const timeMatch = /^[\s,]*(\d{1,2})([.:](\d{2}))?\s*(am|pm)\b/i.exec(afterWeekday)

    if (!weekdayMatch || !conferenceDate || Number.isNaN(conferenceDate.getTime())) {
        return { date: text, time: '' }
    }

    const target = WEEKDAYS.indexOf(weekdayMatch[1].toLowerCase())
    const date = new Date(conferenceDate)
    // Walk back to that weekday on or before the conference date. Bump-in is
    // the days before; bump-out is the conference day itself.
    const delta = (date.getDay() - target + 7) % 7
    date.setDate(date.getDate() - delta)

    const formattedDate = [
        String(date.getDate()).padStart(2, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
        date.getFullYear(),
    ].join('/')

    if (!timeMatch) return { date: formattedDate, time: '' }

    let hour = Number(timeMatch[1])
    const minutes = timeMatch[3] ?? '00'
    const meridiem = timeMatch[4].toLowerCase()
    if (meridiem === 'pm' && hour !== 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0

    return { date: formattedDate, time: `${String(hour).padStart(2, '0')}:${minutes}` }
}

/**
 * Jira holds trolley and forklift in a single free-text field, but the venue
 * asks separately. Rather than guess, the raw answer is echoed into whichever
 * column it actually mentions; an answer naming neither goes to both, since
 * that's the field the committee filled in for this question.
 */
export function splitTrolleyForklift(answer: string | undefined): { trolley: string; forklift: string } {
    if (!answer?.trim()) return { trolley: '', forklift: '' }

    const text = answer.trim()
    const mentionsTrolley = /trolley/i.test(text)
    const mentionsForklift = /forklift/i.test(text)

    if (mentionsTrolley && !mentionsForklift) return { trolley: text, forklift: '' }
    if (mentionsForklift && !mentionsTrolley) return { trolley: '', forklift: text }
    return { trolley: text, forklift: text }
}

/** One spreadsheet row (header order) for an exhibitor. */
export function buildExhibitorRow(source: ExhibitorSource, conferenceDate: Date | undefined): string[] {
    const bumpIn = splitBumpSlot(source.bumpInSlot, conferenceDate)
    const bumpOut = splitBumpSlot(source.bumpOutWindow, conferenceDate)
    const { trolley, forklift } = splitTrolleyForklift(source.trolleyOrForklift)

    return [
        source.companyName,
        source.contactName ?? '',
        source.contactPhone ?? '',
        source.contactEmail ?? '',
        bumpIn.date,
        bumpIn.time,
        bumpOut.date,
        bumpOut.time,
        source.parking ?? '',
        source.parkingTimes ?? '',
        source.equipmentList ?? '',
        trolley,
        forklift,
        source.loadingDockAssistance ?? '',
        source.additionalNotes ?? '',
    ]
}

/**
 * The full sheet: the venue's title row, the header row, then one row per
 * exhibitor sorted by company name so successive exports diff cleanly.
 */
export function buildExhibitorSheet(args: {
    sources: ExhibitorSource[]
    conferenceName: string
    conferenceDate: Date | undefined
}): string[][] {
    const { sources, conferenceName, conferenceDate } = args
    const dateLabel = conferenceDate && !Number.isNaN(conferenceDate.getTime())
        ? conferenceDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        : ''

    const title = `Supplier & Exhibitor List - ${conferenceName}${dateLabel ? ` - ${dateLabel}` : ''}`
    const rows = [...sources]
        .sort((a, b) => a.companyName.localeCompare(b.companyName))
        .map((source) => buildExhibitorRow(source, conferenceDate))

    return [[title], [...EXHIBITOR_COLUMNS], ...rows]
}
