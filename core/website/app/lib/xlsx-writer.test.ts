import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { readXlsx } from './test-utils/read-xlsx'
import { columnName, writeXlsx } from './xlsx-writer'

describe('writeXlsx', () => {
    it('writes each sheet in order with typed cells', () => {
        const { sheetNames, sheets } = readXlsx(
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
        )

        expect(sheetNames).toEqual(['First', 'Second'])
        expect(sheets.First.A2).toEqual({ type: 'string', value: 'Ada', isFormula: false })
        expect(sheets.First.B2).toEqual({ type: 'number', value: 3, isFormula: false })
        expect(sheets.Second.A1.value).toBe('x')
    })

    it('keeps formula-looking text as a string, escapes XML and keeps newlines', () => {
        const { sheets } = readXlsx(
            writeXlsx([{ name: 'S', rows: [['=HYPERLINK("x")', 'a < b & "c"', 'line 1\nline 2']] }]),
        )

        expect(sheets.S.A1).toEqual({ type: 'string', value: '=HYPERLINK("x")', isFormula: false })
        expect(sheets.S.B1.value).toBe('a < b & "c"')
        expect(sheets.S.C1.value).toBe('line 1\nline 2')
    })

    it('drops control characters that are illegal in XML', () => {
        const { sheets } = readXlsx(writeXlsx([{ name: 'S', rows: [['a\u0000b\u0007c\td']] }]))
        expect(sheets.S.A1.value).toBe('abc\td')
    })

    it('leaves empty cells out but keeps column positions', () => {
        const { sheets } = readXlsx(writeXlsx([{ name: 'S', rows: [['a', '', null, undefined, 'e']] }]))
        expect(Object.keys(sheets.S)).toEqual(['A1', 'E1'])
    })

    it('makes sheet names Excel will accept', () => {
        const bytes = writeXlsx([{ name: 'Talks: a/b [2026] and a name that runs far too long', rows: [] }])
        const [name] = readXlsx(bytes).sheetNames
        expect(name).toHaveLength(31)
        expect(name).not.toMatch(/[\\/?*[\]:]/)
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
