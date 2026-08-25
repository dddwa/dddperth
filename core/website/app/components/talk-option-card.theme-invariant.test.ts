/**
 * Guards the colour contract of `TalkOptionCard`.
 *
 * The card forces a light surface in BOTH themes, so every colour on it must
 * come from a theme-invariant token scale. Mixing a forced-light background
 * with theme-reactive tokens is what broke it: `gray.7` resolved *light*
 * under the light theme (1.6:1 on white), and `indigo.1` resolved
 * *near-black* under the dark theme (3.03:1 behind `indigo.8` text).
 *
 * A comment in the component can't stop that regressing, so this test does:
 *
 *  1. Every colour token the card uses resolves to the same value under the
 *     base token block and under `.dark` — i.e. genuinely invariant, not
 *     merely invariant-looking today.
 *  2. The card's source references no theme-reactive colour scale, and no
 *     raw hex literal (an earlier fix hardcoded nine of them, which is
 *     invariant but drops the card out of the design system).
 *
 * If a future change makes the card's surface theme-reactive, delete this
 * file along with the note in the component — the whole set moves to
 * reactive tokens together.
 *
 * Note this reads the *generated* `styled-system/styles.css`, so it needs
 * `pnpm run setup` (panda codegen) to have run — which CI does before tests.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const cardSource = readFileSync(join(__dirname, 'TalkOptionCard.tsx'), 'utf8')
const styles = readFileSync(join(__dirname, '..', 'styled-system', 'styles.css'), 'utf8')

/** Colour tokens the card relies on being identical across themes. */
const INVARIANT_TOKENS = [
    'admin.50',
    'admin.100',
    'admin.200',
    'admin.300',
    'admin.700',
    'admin.900',
    'status.info.bg',
    'status.info.fg',
    'status.info.border',
]

/**
 * Panda emits base tokens under `:where(:root, :host)` and per-theme
 * overrides under `.dark` / `.light`. Both are flat custom-property blocks,
 * so we slice from the selector to its closing brace at the same indent.
 */
function block(selector: string): string {
    const start = styles.indexOf(`${selector} {`)
    if (start === -1) throw new Error(`Could not find a "${selector}" block in styles.css`)
    const end = styles.indexOf('\n}', start)
    return styles.slice(start, end === -1 ? undefined : end)
}

const baseBlock = block(':where(:root, :host)')
const darkBlock = block('.dark')

/** Panda escapes dots in token names: `--colors-admin\.50`. */
function readVar(source: string, token: string): string | undefined {
    const escaped = token.replace(/\./g, '\\\\.')
    return new RegExp(`--colors-${escaped}:\\s*([^;\\n}]+)`).exec(source)?.[1].trim()
}

describe('TalkOptionCard colour contract', () => {
    it.each(INVARIANT_TOKENS)('%s resolves identically in light and dark', (token) => {
        const base = readVar(baseBlock, token)
        // A missing base value means the token was renamed or dropped — fail
        // loudly rather than silently comparing undefined to undefined.
        expect(base, `${token} is not defined in the base token block`).toBeDefined()

        // `.dark` need not redefine every token; not overriding it is the
        // strongest form of invariance. Only an override that *differs* is a
        // problem.
        const dark = readVar(darkBlock, token)
        if (dark !== undefined) {
            expect(
                dark,
                `${token} is overridden under .dark — it is not safe on this card's forced-light surface`,
            ).toBe(base)
        }
    })

    it('uses no theme-reactive colour scale', () => {
        // These invert with the theme while the card's background does not.
        const reactive = /(?:bg|color|borderColor|outline)="(?:gray|indigo|slate|text|interactive|brand|surface)\./g
        expect(cardSource.match(reactive) ?? []).toEqual([])
    })

    it('uses no raw hex colour literals', () => {
        expect(cardSource.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
    })
})
