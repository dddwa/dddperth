import { strToU8, zipSync } from 'fflate'

/**
 * A minimal .xlsx writer: typed string and number cells, several sheets, no
 * styling. Replaces the `xlsx` (SheetJS) package, whose npm releases stopped at
 * a version with known vulnerabilities.
 *
 * Strings are written as inline strings, never formulas, so free text that
 * starts with `=` stays text — the reason these exports aren't CSV.
 */

export type XlsxCell = string | number | null | undefined

export interface XlsxSheet {
    name: string
    rows: XlsxCell[][]
}

export function writeXlsx(sheets: XlsxSheet[]): Uint8Array<ArrayBuffer> {
    if (sheets.length === 0) throw new Error('A workbook needs at least one sheet')

    const files: Record<string, Uint8Array> = {
        '[Content_Types].xml': xml(
            `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
                `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
                `<Default Extension="xml" ContentType="application/xml"/>` +
                `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
                sheets
                    .map(
                        (_, i) =>
                            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
                    )
                    .join('') +
                `</Types>`,
        ),
        '_rels/.rels': xml(
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
                `</Relationships>`,
        ),
        'xl/workbook.xml': xml(
            `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
                sheets
                    .map(
                        (sheet, i) =>
                            `<sheet name="${escapeXml(sheetName(sheet.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
                    )
                    .join('') +
                `</sheets></workbook>`,
        ),
        'xl/_rels/workbook.xml.rels': xml(
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                sheets
                    .map(
                        (_, i) =>
                            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
                    )
                    .join('') +
                `</Relationships>`,
        ),
    }

    sheets.forEach((sheet, i) => {
        files[`xl/worksheets/sheet${i + 1}.xml`] = xml(worksheetXml(sheet.rows))
    })

    return zipSync(files)
}

function worksheetXml(rows: XlsxCell[][]): string {
    const body = rows
        .map((row, r) => {
            const cells = row
                .map((value, c) => {
                    const ref = `${columnName(c)}${r + 1}`
                    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`
                    if (value === null || value === undefined || value === '') return ''
                    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
                })
                .join('')
            return `<row r="${r + 1}">${cells}</row>`
        })
        .join('')
    return `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

export function columnName(index: number): string {
    let name = ''
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + ((n - 1) % 26)) + name
    }
    return name
}

// Excel refuses to open a workbook with a sheet name over 31 characters or
// containing any of these.
function sheetName(name: string): string {
    return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet'
}

function xml(body: string): Uint8Array {
    return strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`)
}

function escapeXml(text: string): string {
    return (
        text
            // Control characters other than tab/newline/CR are illegal in XML
            // 1.0, and one stray character from a pasted form answer would
            // make Excel report the whole file as corrupt.
            // eslint-disable-next-line no-control-regex
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    )
}
