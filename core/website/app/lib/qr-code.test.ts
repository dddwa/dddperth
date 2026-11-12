import { describe, expect, it } from 'vitest'
import { qrFileName, qrMatrix, qrSvgDocument, resolveQrTarget } from './qr-code'

const origin = 'https://dddperth.com'

describe('resolveQrTarget', () => {
    it('resolves a site path against the origin', () => {
        expect(resolveQrTarget('/survey/feedback-x7k2', origin)).toEqual({
            url: 'https://dddperth.com/survey/feedback-x7k2',
        })
    })

    it('keeps a full URL, query string included', () => {
        expect(resolveQrTarget(' https://example.com/a?b=1 ', origin)).toEqual({ url: 'https://example.com/a?b=1' })
    })

    it('adds https:// to a bare domain', () => {
        expect(resolveQrTarget('example.com/tickets', origin)).toEqual({ url: 'https://example.com/tickets' })
    })

    it.each(['', '   ', 'not a url', 'javascript:alert(1)', 'mailto:hi@example.com', 'hello'])(
        'rejects %j',
        (input) => {
            expect(resolveQrTarget(input, origin)).toHaveProperty('error')
        },
    )
})

describe('qrMatrix', () => {
    it('produces a square matrix with a 4-module quiet zone', () => {
        const matrix = qrMatrix('https://dddperth.com/')
        expect(matrix.modules).toHaveLength(matrix.size)
        expect(matrix.modules.every((row) => row.length === matrix.size)).toBe(true)
        expect(matrix.modules.slice(0, 4).flat().some(Boolean)).toBe(false)
        expect(matrix.path).toMatch(/^M\d+ \d+h1v1h-1z/)
    })

    it('renders a standalone black-on-white SVG', () => {
        const svg = qrSvgDocument(qrMatrix('https://dddperth.com/'))
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
        expect(svg).toContain('fill="#fff"')
        expect(svg).toContain('fill="#000"')
    })
})

describe('qrFileName', () => {
    it('slugs the host and path', () => {
        expect(qrFileName('https://www.dddperth.com/survey/Feedback?x=1')).toBe('qr-dddperth-com-survey-feedback')
    })
})
