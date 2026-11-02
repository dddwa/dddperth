import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import readWorkbook, { readSheet } from 'read-excel-file/node'
import { columnName, writeXlsx } from './xlsx-writer'

describe('writeXlsx', () => {
    it('writes each sheet in order with typed cells', async () => {
        const sheets = await readWorkbook(
            Buffer.from(
                writeXlsx([
                    {
                        name: 'First',
                        rows: [
                            ['Name', 'Count'],
                            ['Ada', 3],
                        ],
                    },
                    { name: 'Second', rows: [['x']] },
                ]),
            ),
        )

        expect(sheets).toEqual([
            {
                sheet: 'First',
                data: [
                    ['Name', 'Count'],
                    ['Ada', 3],
                ],
            },
            { sheet: 'Second', data: [['x']] },
        ])
    })

    it('keeps formula-looking text, XML metacharacters, phone numbers and newlines as text', async () => {
        const row = [
            '=HYPERLINK("x")',
            'a < b & "c"',
            'line 1\nline 2',
            '+61 400 000 000',
            '</t></is></c><c r="F1"><f>1+1</f></c>',
        ]
        const bytes = writeXlsx([{ name: 'S', rows: [row] }])
        expect(await readSheet(Buffer.from(bytes))).toEqual([row])
        const xml = strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml'])
        expect(xml).not.toMatch(/<f(?:\s|>)/)
        expect(xml).toContain('t="inlineStr"')
    })

    it('escapes literal SpreadsheetML tokens and carriage returns independently of the reader', () => {
        const bytes = writeXlsx([{ name: 'S', rows: [['_x0041_ _x000D_ _x005F_x0041_ _x00af_', 'a\rb\r\nc']] }])
        const xml = strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml'])
        // The independent reader does not decode SpreadsheetML escapes, so assert
        // their on-disk encoding directly rather than relying on a round trip.
        expect(xml).toContain(
            '<t xml:space="preserve">_x005F_x0041_ _x005F_x000D_ _x005F_x005F_x0041_ _x005F_x00af_</t>',
        )
        expect(xml).toContain('<t xml:space="preserve">a_x000D_b_x000D_\nc</t>')
    })

    it('escapes tokens that appear after illegal XML characters are removed', () => {
        const bytes = writeXlsx([{ name: 'S', rows: [['_x00\u000041_']] }])
        const xml = strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml'])
        expect(xml).toContain('<t xml:space="preserve">_x005F_x0041_</t>')
    })

    it('drops control characters that are illegal in XML', async () => {
        const bytes = writeXlsx([{ name: 'S', rows: [['a\u0000b\u0007c\td']] }])
        expect(await readSheet(Buffer.from(bytes))).toEqual([['abc\td']])
    })

    it('leaves empty cells out but keeps column positions', async () => {
        const bytes = writeXlsx([{ name: 'S', rows: [['a', '', null, undefined, 'e']] }])
        expect(await readSheet(Buffer.from(bytes))).toEqual([['a', null, null, null, 'e']])
    })

    it('makes sheet names Excel will accept', async () => {
        const bytes = writeXlsx([{ name: 'Talks: a/b [2026] and a name that runs far too long', rows: [] }])
        const [sheet] = await readWorkbook(Buffer.from(bytes))
        expect(sheet.sheet).toHaveLength(31)
        expect(sheet.sheet).not.toMatch(/[\\/?*[\]:]/)
    })

    it('declares every sheet in the content types', () => {
        const files = unzipSync(
            writeXlsx([
                { name: 'A', rows: [] },
                { name: 'B', rows: [] },
            ]),
        )
        const contentTypes = strFromU8(files['[Content_Types].xml'])
        expect(contentTypes).toContain('/xl/worksheets/sheet1.xml')
        expect(contentTypes).toContain('/xl/worksheets/sheet2.xml')
    })
})

describe('columnName', () => {
    it.each([
        [0, 'A'],
        [25, 'Z'],
        [26, 'AA'],
        [51, 'AZ'],
        [52, 'BA'],
        [701, 'ZZ'],
        [702, 'AAA'],
    ])('%i → %s', (index, name) => {
        expect(columnName(index)).toBe(name)
    })
})
