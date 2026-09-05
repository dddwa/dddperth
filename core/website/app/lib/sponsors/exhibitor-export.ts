/**
 * Builds the venue's "Supplier & Exhibitor List" spreadsheet.
 *
 * Columns are reproduced rather than filled into the venue's template file.
 * Don't reorder them — the venue reads by position — and keep emitting every
 * column even when empty, so gaps stay visible.
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
 * Splits a Jira bump slot ("Friday 1pm - 2pm") into the venue's separate date
 * and time columns, resolving the weekday against the conference date.
 * Unparseable text passes through in the date column so the committee sees it.
 */
export function splitBumpSlot(
    slot: string | undefined,
    conferenceDate: Date | undefined,
): { date: string; time: string } {
    if (!slot?.trim()) return { date: '', time: '' }

    const text = slot.trim()
    const weekdayMatch = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.exec(text)
    // Anchored after the weekday so "Friday noon - 1pm" can't report 1pm as
    // the start time.
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

/** Jira has one trolley/forklift field; the venue asks separately. Route the
 * answer to whichever it mentions, or both if it names neither. */
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

/** Title row, headers, then one row per exhibitor sorted by name. */
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
