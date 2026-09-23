import sharp from 'sharp'

/**
 * How close to the sampled background colour a pixel must be to be treated as
 * background. Generous enough to catch JPEG ringing around a wordmark without
 * eating antialiased glyph edges.
 */
const BACKGROUND_MATCH_DISTANCE = 60

/**
 * Detects a solid background colour by sampling the first and last pixel, and
 * keys it out to transparency.
 *
 * Sponsors often supply a logo sitting on a solid brand field (a blue tile, a
 * white square) rather than on transparency. `.trim()` alone crops uniform
 * edges but leaves the colour behind, which renders as an opaque box on the
 * site's dark cards. Alpha is derived from each pixel's distance from the
 * background so antialiased edges stay smooth rather than going hard-edged.
 *
 * Returns the original data untouched when the corners disagree — that means
 * artwork or an existing transparent background, not a solid field.
 */
function keyOutBackground(data, channels) {
    const corners = [0, (data.length / channels - 1) * channels]
    const [r0, g0, b0, a0] = [data[corners[0]], data[corners[0] + 1], data[corners[0] + 2], data[corners[0] + 3]]
    const [r1, g1, b1, a1] = [data[corners[1]], data[corners[1] + 1], data[corners[1] + 2], data[corners[1] + 3]]

    // Already transparent, or corners disagree: nothing to key out.
    if (a0 < 250 || a1 < 250) return false
    if (Math.abs(r0 - r1) + Math.abs(g0 - g1) + Math.abs(b0 - b1) > BACKGROUND_MATCH_DISTANCE) return false

    const bgLuma = r0 * 0.299 + g0 * 0.587 + b0 * 0.114
    // Key against whichever pole the artwork sits on relative to the background.
    const towardsWhite = bgLuma < 128

    for (let i = 0; i < data.length; i += channels) {
        const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        const ratio = towardsWhite ? (luma - bgLuma) / (255 - bgLuma) : (bgLuma - luma) / bgLuma
        data[i + 3] = Math.max(0, Math.min(255, Math.round(ratio * 255)))
    }

    return true
}

/**
 * Generates light- and dark-mode variants of a sponsor logo from a single source image.
 *
 * Returns an object with `success`, `original`, `light`, `dark` (and optionally `error`).
 * Each of `original`, `light`, `dark` is a `data:` URL; SVG inputs produce SVG outputs,
 * raster inputs produce PNG outputs.
 *
 * The transformation:
 *   1. Any solid background colour is keyed out to transparency.
 *   2. Light variant: the artwork is rendered black (suitable for light bgs).
 *   3. Dark variant: invert the light variant (black -> white) for dark bgs.
 */
export async function processLogo(buffer, filename) {
    const results = {}

    try {
        if (filename.endsWith('.svg')) {
            // SVG processing - two-step approach as requested
            const svgContent = buffer.toString('utf-8')
            results.original = 'data:image/svg+xml;base64,' + buffer.toString('base64')

            // Step 1: Create white/light version - make all non-white areas black
            const whiteVersion = svgContent
                // Handle CSS styles in <style> tags - convert fill colors to black
                .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
                    const newStyleContent = styleContent
                        // Convert fill colors in CSS to black (except white/transparent)
                        .replace(/fill:\s*#([a-f0-9]{3,6})/gi, (fillMatch, color) => {
                            const c = color.toLowerCase()
                            if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                                return fillMatch // Keep whites/very light colors
                            }
                            return 'fill: #000000'
                        })
                        .replace(/fill:\s*rgb\(([^)]+)\)/gi, (fillMatch, rgb) => {
                            const values = rgb.split(',').map((v) => parseInt(v.trim()))
                            if (values.every((v) => v >= 240)) {
                                return fillMatch
                            }
                            return 'fill: rgb(0,0,0)'
                        })
                        .replace(/fill:\s*(?!white|transparent|none)([a-z]+)/gi, 'fill: #000000')
                        // Also handle stroke colors
                        .replace(/stroke:\s*#([a-f0-9]{3,6})/gi, (strokeMatch, color) => {
                            const c = color.toLowerCase()
                            if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                                return strokeMatch
                            }
                            return 'stroke: #000000'
                        })
                        .replace(/stroke:\s*rgb\(([^)]+)\)/gi, (strokeMatch, rgb) => {
                            const values = rgb.split(',').map((v) => parseInt(v.trim()))
                            if (values.every((v) => v >= 240)) {
                                return strokeMatch
                            }
                            return 'stroke: rgb(0,0,0)'
                        })
                        .replace(/stroke:\s*(?!white|transparent|none)([a-z]+)/gi, 'stroke: #000000')

                    return `<style${match.slice(6, match.indexOf('>'))}>${newStyleContent}</style>`
                })
                // Convert any inline hex colors to black (except white variations)
                .replace(/fill="#([a-f0-9]{3,6})"/gi, (match, color) => {
                    const c = color.toLowerCase()
                    if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                        return match
                    }
                    return 'fill="#000000"'
                })
                .replace(/stroke="#([a-f0-9]{3,6})"/gi, (match, color) => {
                    const c = color.toLowerCase()
                    if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                        return match
                    }
                    return 'stroke="#000000"'
                })
                // Convert inline RGB colors to black (except white)
                .replace(/fill="rgb\(([^)]+)\)"/gi, (match, rgb) => {
                    const values = rgb.split(',').map((v) => parseInt(v.trim()))
                    if (values.every((v) => v >= 240)) {
                        return match
                    }
                    return 'fill="rgb(0,0,0)"'
                })
                .replace(/stroke="rgb\(([^)]+)\)"/gi, (match, rgb) => {
                    const values = rgb.split(',').map((v) => parseInt(v.trim()))
                    if (values.every((v) => v >= 240)) {
                        return match
                    }
                    return 'stroke="rgb(0,0,0)"'
                })
                // Handle inline named colors
                .replace(/fill="(?!none|transparent|white)([a-z]+)"/gi, 'fill="#000000"')
                .replace(/stroke="(?!none|transparent|white)([a-z]+)"/gi, 'stroke="#000000"')

            results.light = 'data:image/svg+xml;base64,' + Buffer.from(whiteVersion).toString('base64')

            // Step 2: Create dark version by inverting the white version
            const darkVersion = whiteVersion
                // Handle CSS styles in <style> tags - invert black to white
                .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
                    const newStyleContent = styleContent
                        // Invert black colors in CSS to white
                        .replace(/fill:\s*#000000/gi, 'fill: #FFFFFF')
                        .replace(/fill:\s*#000/gi, 'fill: #FFF')
                        .replace(/fill:\s*black/gi, 'fill: white')
                        .replace(/fill:\s*rgb\(0,\s*0,\s*0\)/gi, 'fill: rgb(255,255,255)')
                        // Also handle stroke colors
                        .replace(/stroke:\s*#000000/gi, 'stroke: #FFFFFF')
                        .replace(/stroke:\s*#000/gi, 'stroke: #FFF')
                        .replace(/stroke:\s*black/gi, 'stroke: white')
                        .replace(/stroke:\s*rgb\(0,\s*0,\s*0\)/gi, 'stroke: rgb(255,255,255)')

                    return `<style${match.slice(6, match.indexOf('>'))}>${newStyleContent}</style>`
                })
                // Invert inline black colors to white
                .replace(/fill="#000000"/gi, 'fill="#FFFFFF"')
                .replace(/fill="#000"/gi, 'fill="#FFF"')
                .replace(/fill="black"/gi, 'fill="white"')
                .replace(/stroke="#000000"/gi, 'stroke="#FFFFFF"')
                .replace(/stroke="#000"/gi, 'stroke="#FFF"')
                .replace(/stroke="black"/gi, 'stroke="white"')
                // Handle RGB black values
                .replace(/fill="rgb\(0,\s*0,\s*0\)"/gi, 'fill="rgb(255,255,255)"')
                .replace(/stroke="rgb\(0,\s*0,\s*0\)"/gi, 'stroke="rgb(255,255,255)"')

            results.dark = 'data:image/svg+xml;base64,' + Buffer.from(darkVersion).toString('base64')
        } else {
            // PNG/JPG processing with Sharp - two-step approach to match SVG logic
            results.original = 'data:image/png;base64,' + buffer.toString('base64')

            // Step 1: Create white/light version - convert non-white areas to black
            // First trim whitespace, then process
            const trimmedBuffer = await sharp(buffer)
                .trim() // Remove whitespace/transparent edges
                .ensureAlpha() // Ensure we have an alpha channel
                .raw()
                .toBuffer({ resolveWithObject: true })

            const { data, info } = trimmedBuffer
            const { width, height, channels } = info

            // Sponsors often supply artwork on a solid brand field rather than
            // on transparency; key it out before recolouring.
            const keyed = keyOutBackground(data, channels)

            // A logo supplied as white-on-transparent (a "reversed" asset, meant
            // for dark backgrounds) is entirely "very light", so the brightness
            // guard below would leave it white — invisible on a light card.
            // Detect that up front and treat it as artwork too.
            const isReversedArtwork =
                !keyed &&
                (() => {
                    let visible = 0
                    let light = 0
                    for (let i = 0; i < data.length; i += channels) {
                        if (data[i + 3] <= 50) continue
                        visible++
                        if ((data[i] + data[i + 1] + data[i + 2]) / 3 >= 240) light++
                    }
                    return visible > 0 && light / visible > 0.9
                })()

            // Process pixel by pixel to convert colored areas to black, keep transparency
            for (let i = 0; i < data.length; i += channels) {
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                const a = data[i + 3]

                if (a > 50) {
                    // Once the background is keyed out, every remaining pixel IS
                    // the artwork — including white-on-transparent logos, which
                    // the brightness guard below would otherwise leave white and
                    // therefore invisible against a light background.
                    const brightness = (r + g + b) / 3
                    if (keyed || isReversedArtwork || brightness < 240) {
                        data[i] = 0 // R = black
                        data[i + 1] = 0 // G = black
                        data[i + 2] = 0 // B = black
                        // Keep original alpha
                    }
                }
            }

            const whiteVersionBuffer = await sharp(data, {
                raw: { width, height, channels },
            })
                .png()
                .toBuffer()

            results.light = 'data:image/png;base64,' + whiteVersionBuffer.toString('base64')

            // Step 2: Create dark version by inverting the light version (black → white)
            const darkVersionBuffer = await sharp(whiteVersionBuffer)
                .negate({ alpha: false }) // Don't negate alpha channel
                .toBuffer()

            results.dark = 'data:image/png;base64,' + darkVersionBuffer.toString('base64')
        }

        results.success = true
        return results
    } catch (error) {
        return {
            success: false,
            error: error.message,
            original: 'data:image/png;base64,' + buffer.toString('base64'),
        }
    }
}

/**
 * Decodes a `data:` URL produced by `processLogo` back to a Buffer.
 */
export function dataUrlToBuffer(dataUrl) {
    const commaIndex = dataUrl.indexOf(',')
    if (commaIndex < 0) throw new Error('Invalid data URL')
    return Buffer.from(dataUrl.slice(commaIndex + 1), 'base64')
}
