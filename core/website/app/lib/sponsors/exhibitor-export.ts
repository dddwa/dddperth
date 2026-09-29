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
    /** Free text, nominally one name per line. */
    loadingDockAttendees?: string
    /** Every email we hold for this sponsor, used to fill in attendees who
     * were named without one. */
    knownEmails?: string[]
    equipmentList?: string
    trolleyOrForklift?: string
    loadingDockAssistance?: string
    additionalNotes?: string
}

export interface ExhibitorSponsorRecord {
    companyName: string
    /** Portal contact emails, synced from Jira. */
    contacts?: string[]
    profile: {
        logistics?: Record<string, string>
        logisticsUpdatedAt?: number
    } | null
}

/** Builds one export source with an explicit authority boundary. Before the
 * sponsor has submitted logistics, Jira supplies legacy committee-entered
 * values. After the first full portal submission, D1 wins wholesale so a
 * failed write-back—or an intentionally cleared field—cannot be masked by a
 * stale non-empty Jira value. */
export function buildExhibitorSource(
    sponsor: ExhibitorSponsorRecord,
    fromJira: Record<string, string>,
): ExhibitorSource {
    const fromPortal = sponsor.profile?.logistics ?? {}
    const portalOwnsLogistics = sponsor.profile?.logisticsUpdatedAt !== undefined
    const pick = (key: string) =>
        (portalOwnsLogistics ? fromPortal[key] : fromJira[key] || fromPortal[key]) || undefined

    const contactEmail = pick('exhibitorContactEmail')

    return {
        companyName: sponsor.companyName,
        contactName: pick('exhibitorContactName'),
        contactPhone: pick('exhibitorContactPhone'),
        contactEmail,
        bumpInSlot: pick('bumpInSlot'),
        bumpOutWindow: pick('bumpOutWindow'),
        parking: pick('parking'),
        loadingDockAttendees: pick('loadingDockAttendees'),
        knownEmails: [...(contactEmail ? [contactEmail] : []), ...(sponsor.contacts ?? [])],
        equipmentList: pick('equipmentList'),
        trolleyOrForklift: pick('trolleyOrForklift'),
        loadingDockAssistance: pick('loadingDockAssistance'),
        additionalNotes: fromPortal.additionalNotes,
    }
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
    'Loading Dock Attendees - requiring inductions',
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

/** The venue asks for parking times separately, while the portal asks whether
 * parking is needed for bump-in/out. Reuse the corresponding submitted slots
 * rather than emitting a permanently blank column. */
export function deriveParkingTimes(
    parking: string | undefined,
    bumpInSlot: string | undefined,
    bumpOutWindow: string | undefined,
): string {
    const selected = new Set(
        (parking ?? '')
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
    )
    const times: string[] = []
    if (selected.has('for bump in') && bumpInSlot) times.push(bumpInSlot)
    if (selected.has('for bump out') && bumpOutWindow) times.push(bumpOutWindow)
    return times.join('; ')
}

function nameTokens(text: string): string[] {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter(Boolean)
}

/** "Wile Coyote" matches wile.coyote@, coyote_wile@ or wilecoyote@. Needs a
 * first and last name: a single name alone is too weak to attach anyone's email. */
function emailBelongsTo(email: string, name: string[]): boolean {
    if (name.length < 2) return false
    const first = name[0]
    const last = name[name.length - 1]
    const local = email.split('@')[0] ?? ''
    const localTokens = nameTokens(local)
    return (localTokens.includes(first) && localTokens.includes(last)) || localTokens.join('') === first + last
}

/**
 * The venue inducts each loading dock attendee by email, but the portal only
 * asked for names, so sponsors typically supply names alone while the matching
 * emails already sit in their contact list. Attach an email only when exactly
 * one known address matches the name; anything less certain stays a bare name
 * for the committee to chase, rather than inducting the wrong person.
 */
export function formatLoadingDockAttendees(attendees: string | undefined, knownEmails: string[] = []): string {
    if (!attendees?.trim()) return ''

    const emails = [...new Map(knownEmails.map((email) => [email.trim().toLowerCase(), email.trim()])).values()]

    return attendees
        .split(/\r?\n|[;,]|\s+(?:and|&)\s+/i)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            if (entry.includes('@')) return entry
            const name = nameTokens(entry)
            const matches = emails.filter((email) => emailBelongsTo(email, name))
            return matches.length === 1 ? `${entry} - ${matches[0]}` : entry
        })
        .join('\n')
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
        source.parkingTimes ?? deriveParkingTimes(source.parking, source.bumpInSlot, source.bumpOutWindow),
        formatLoadingDockAttendees(source.loadingDockAttendees, source.knownEmails),
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
    const dateLabel =
        conferenceDate && !Number.isNaN(conferenceDate.getTime())
            ? conferenceDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
            : ''

    const title = `Supplier & Exhibitor List - ${conferenceName}${dateLabel ? ` - ${dateLabel}` : ''}`
    const rows = [...sources]
        .sort((a, b) => a.companyName.localeCompare(b.companyName))
        .map((source) => buildExhibitorRow(source, conferenceDate))

    return [[title], [...EXHIBITOR_COLUMNS], ...rows]
}
