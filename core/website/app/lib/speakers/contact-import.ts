/**
 * CSV import for speaker portal access. Sessionize's "flattened accepted
 * sessions" export has one row per (session, speaker) pair — Session Id +
 * Speaker Id + Email is everything needed to grant portal access; speaker
 * bio/sessions/links etc. are already sourced from the Sessionize API sync
 * (see sync-plan.ts) so this only ever reads the three columns above (plus
 * name, for display). No I/O — parsing and planning are pure so both can be
 * unit tested; the D1 write lives in the route action.
 */

export interface CsvSpeakerRow {
    sessionizeId: string
    sessionId: string
    email: string
    sessionTitle: string
    fullName: string
}

/** RFC4180-ish CSV parser: quoted fields, "" escaped quotes, and commas or
 * newlines inside quotes (Sessionize's export has all three, since session
 * descriptions are free text). Strips a leading BOM. */
export function parseCsv(text: string): string[][] {
    const src = text.startsWith('﻿') ? text.slice(1) : text
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuotes = false
    let i = 0

    while (i < src.length) {
        const char = src[i]

        if (inQuotes) {
            if (char === '"') {
                if (src[i + 1] === '"') {
                    field += '"'
                    i += 2
                    continue
                }
                inQuotes = false
                i += 1
                continue
            }
            field += char
            i += 1
            continue
        }

        if (char === '"') {
            inQuotes = true
            i += 1
            continue
        }
        if (char === ',') {
            row.push(field)
            field = ''
            i += 1
            continue
        }
        if (char === '\r') {
            i += 1
            continue
        }
        if (char === '\n') {
            row.push(field)
            rows.push(row)
            row = []
            field = ''
            i += 1
            continue
        }
        field += char
        i += 1
    }

    // Last field/row when the file doesn't end with a trailing newline.
    if (field.length > 0 || row.length > 0) {
        row.push(field)
        rows.push(row)
    }

    return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** Parses Sessionize's flattened sessions export into one row per speaker.
 * Rows missing a Speaker Id or Email are dropped — everything else in the
 * export is sourced from the API instead. Throws if the required columns
 * aren't present (wrong export, or a hand-edited file missing a header). */
export function parseSpeakerContactsCsv(csvText: string): CsvSpeakerRow[] {
    const rows = parseCsv(csvText)
    if (rows.length === 0) return []

    const header = rows[0].map((h) => h.trim())
    const indexOf = (name: string) => header.indexOf(name)

    const idxSessionizeId = indexOf('Speaker Id')
    const idxEmail = indexOf('Email')
    const idxSessionId = indexOf('Session Id')
    const idxTitle = indexOf('Title')
    const idxFirstName = indexOf('FirstName')
    const idxLastName = indexOf('LastName')

    if (idxSessionizeId === -1 || idxEmail === -1) {
        throw new Error('CSV is missing the required "Speaker Id" and/or "Email" columns')
    }

    const dataRows = rows.slice(1)

    // Co-presenter continuation rows repeat the Session Id but leave Title
    // blank in Sessionize's export — build a lookup so every row still gets
    // a title for display, regardless of file order.
    const titleBySessionId = new Map<string, string>()
    if (idxSessionId >= 0 && idxTitle >= 0) {
        for (const cells of dataRows) {
            const sid = (cells[idxSessionId] ?? '').trim()
            const title = (cells[idxTitle] ?? '').trim()
            if (sid && title && !titleBySessionId.has(sid)) titleBySessionId.set(sid, title)
        }
    }

    const out: CsvSpeakerRow[] = []
    for (const cells of dataRows) {
        const sessionizeId = (cells[idxSessionizeId] ?? '').trim()
        const email = (cells[idxEmail] ?? '').trim()
        if (!sessionizeId || !email) continue

        const sessionId = idxSessionId >= 0 ? (cells[idxSessionId] ?? '').trim() : ''
        const titleRaw = idxTitle >= 0 ? (cells[idxTitle] ?? '').trim() : ''
        const fullName = [idxFirstName >= 0 ? cells[idxFirstName] : '', idxLastName >= 0 ? cells[idxLastName] : '']
            .filter((part) => part && part.trim())
            .join(' ')
            .trim()

        out.push({
            sessionizeId,
            sessionId,
            email,
            sessionTitle: titleRaw || titleBySessionId.get(sessionId) || '',
            fullName,
        })
    }

    return out
}

export type ContactImportRowStatus = 'granted' | 'already-granted' | 'unknown-speaker' | 'session-mismatch'

export interface ContactImportResultRow {
    sessionizeId: string
    email: string
    fullName: string
    sessionTitle: string
    status: ContactImportRowStatus
}

export interface ContactImportPlan {
    /** Every (sessionizeId, email) pair to grant — always includes every
     * valid, deduped row. Speaker Id + Email is authoritative for portal
     * access regardless of whether that speaker has synced from Sessionize
     * yet; `addContact` is idempotent, so re-importing the same file is
     * always safe. */
    grants: Array<{ sessionizeId: string; email: string }>
    /** Same rows annotated with a verification status against currently
     * synced speaker/session data, for the admin's review only — this never
     * gates whether a row is granted. */
    rows: ContactImportResultRow[]
}

/** Cross-references CSV rows against currently synced speakers (matched by
 * Speaker Id, verified against Session Id — not session title, which isn't
 * a stable identifier) to annotate each row for the admin's review. Every
 * row still grants; status is informational. */
export function computeContactImportPlan(args: {
    rows: CsvSpeakerRow[]
    speakers: Array<{
        sessionizeId: string
        contacts: string[]
        sessions: Array<{ sessionizeSessionId: string }>
    }>
}): ContactImportPlan {
    const { rows, speakers } = args
    const speakerById = new Map(speakers.map((s) => [s.sessionizeId, s]))

    const grants: ContactImportPlan['grants'] = []
    const resultRows: ContactImportResultRow[] = []
    const seen = new Set<string>()

    for (const row of rows) {
        const dedupeKey = `${row.sessionizeId} ${row.email.toLowerCase()}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        const speaker = speakerById.get(row.sessionizeId)
        let status: ContactImportRowStatus
        if (!speaker) {
            status = 'unknown-speaker'
        } else if (speaker.contacts.some((c) => c.toLowerCase() === row.email.toLowerCase())) {
            status = 'already-granted'
        } else if (row.sessionId && !speaker.sessions.some((s) => s.sessionizeSessionId === row.sessionId)) {
            status = 'session-mismatch'
        } else {
            status = 'granted'
        }

        grants.push({ sessionizeId: row.sessionizeId, email: row.email })
        resultRows.push({
            sessionizeId: row.sessionizeId,
            email: row.email,
            fullName: row.fullName,
            sessionTitle: row.sessionTitle,
            status,
        })
    }

    return { grants, rows: resultRows }
}
