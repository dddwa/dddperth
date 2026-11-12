import { encode } from 'uqr'

/** Modules of blank margin around the code. The QR spec asks for 4; scanners struggle with less. */
const QUIET_ZONE = 4

/**
 * Turns what an organiser typed into an absolute URL: a site path (`/survey/abc`) is resolved against the site's
 * origin, a bare domain (`dddperth.com`) gets `https://`, and anything that still isn't an http(s) URL is rejected
 * — a QR code for a typo prints fine and then fails in front of a room full of people.
 */
export function resolveQrTarget(input: string, origin: string): { url: string } | { error: string } {
    const trimmed = input.trim()
    if (!trimmed) return { error: 'Enter a URL or a path on this site.' }

    const candidate = trimmed.startsWith('/')
        ? new URL(trimmed, origin).toString()
        : /^[a-z][a-z\d+.-]*:/i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`

    try {
        const url = new URL(candidate)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            return { error: 'Only http and https links can be turned into QR codes here.' }
        }
        if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
            return { error: `"${trimmed}" doesn't look like a URL.` }
        }
        return { url: url.toString() }
    } catch {
        return { error: `"${trimmed}" doesn't look like a URL.` }
    }
}

export interface QrMatrix {
    /** Width and height in modules, quiet zone included. */
    size: number
    /** One SVG path drawing every dark module, in module units. */
    path: string
    /** Row-major dark/light modules, quiet zone included. */
    modules: boolean[][]
}

/** Error correction `M` (~15% recoverable): survives a smudged print without making short URLs needlessly dense. */
export function qrMatrix(url: string): QrMatrix {
    const { size, data } = encode(url, { ecc: 'M', border: QUIET_ZONE })
    let path = ''
    data.forEach((row, y) => {
        row.forEach((dark, x) => {
            if (dark) path += `M${x} ${y}h1v1h-1z`
        })
    })
    return { size, path, modules: data }
}

/** A standalone SVG document, black on white whatever the page theme — printers and scanners both want that. */
export function qrSvgDocument({ size, path }: QrMatrix): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
}

/** A filename-safe slug from the URL, e.g. `dddperth.com/survey/feedback` → `qr-dddperth-com-survey-feedback`. */
export function qrFileName(url: string): string {
    const { hostname, pathname } = new URL(url)
    const slug = `${hostname}${pathname}`
        .replace(/^www\./, '')
        .replace(/[^a-z\d]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
        .slice(0, 80)
    return `qr-${slug || 'code'}`
}
