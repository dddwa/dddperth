import { strFromU8, unzipSync } from 'fflate'

export interface ReadXlsxCell {
    type: 'string' | 'number'
    value: string | number
    isFormula: boolean
}

/**
 * Reads back what `writeXlsx` produces, for tests only. It understands inline
 * strings and numbers, not shared strings or styles, so it can't stand in for
 * a general .xlsx reader.
 */
export function readXlsx(bytes: Uint8Array): {
    sheetNames: string[]
    sheets: Record<string, Record<string, ReadXlsxCell>>
} {
    const files = unzipSync(bytes)
    const text = (path: string) => {
        const file = files[path]
        if (!file) throw new Error(`Missing ${path} in workbook`)
        return strFromU8(file)
    }

    const sheetNames = [...text('xl/workbook.xml').matchAll(/<sheet name="([^"]*)"/g)].map((m) => unescapeXml(m[1]))
    const sheets: Record<string, Record<string, ReadXlsxCell>> = {}
    sheetNames.forEach((name, i) => {
        const cells: Record<string, ReadXlsxCell> = {}
        for (const match of text(`xl/worksheets/sheet${i + 1}.xml`).matchAll(
            /<c r="([A-Z]+\d+)"([^>]*)>(.*?)<\/c>/gs,
        )) {
            const [, ref, attrs, inner] = match
            const isFormula = inner.includes('<f>')
            if (attrs.includes('t="inlineStr"')) {
                const t = /<t[^>]*>(.*?)<\/t>/s.exec(inner)
                cells[ref] = { type: 'string', value: unescapeXml(t?.[1] ?? ''), isFormula }
            } else {
                const v = /<v>(.*?)<\/v>/.exec(inner)
                cells[ref] = { type: 'number', value: Number(v?.[1]), isFormula }
            }
        }
        sheets[name] = cells
    })
    return { sheetNames, sheets }
}

/** A sheet's rows as objects keyed by its first-row headers. */
export function sheetRecords(sheet: Record<string, ReadXlsxCell>): Array<Record<string, string | number>> {
    const grid: Array<Array<string | number>> = []
    for (const [ref, cell] of Object.entries(sheet)) {
        const [, col, row] = /^([A-Z]+)(\d+)$/.exec(ref) ?? []
        const c = [...col].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
        const r = Number(row) - 1
        grid[r] ??= []
        grid[r][c] = cell.value
    }
    const [header = [], ...rows] = grid
    return rows.map((row) =>
        Object.fromEntries(header.flatMap((h, c) => (row?.[c] === undefined ? [] : [[String(h), row[c]]]))),
    )
}

function unescapeXml(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
}
