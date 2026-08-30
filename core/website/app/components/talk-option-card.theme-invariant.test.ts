/**
 * Guards the colour contract of `TalkOptionCard`.
 *
 * The card renders as a light surface in both themes, so every colour on it
 * must come from a theme-invariant token scale — mixing a fixed background
 * with theme-reactive tokens produces contrast failures in one theme or the
 * other.
 *
 * Real contrast is checked live by the axe scan in `e2e/voting.spec.ts`,
 * which runs under both the `chromium` (dark) and `chromium-light` projects.
 * This test is the cheap static guard beneath it: it fails in milliseconds if
 * a token stops being invariant or a reactive scale creeps back into the
 * component, without needing a browser.
 *
 * Reads the *generated* `styled-system/styles.css`, so it needs panda codegen
 * (`pnpm run setup`) to have run — which CI does before tests.
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
        // loudly rather than comparing undefined to undefined.
        expect(base, `${token} is not defined in the base token block`).toBeDefined()

        // `.dark` need not redefine every token; not overriding it is the
        // strongest form of invariance. Only a *differing* override is a problem.
        const dark = readVar(darkBlock, token)
        if (dark !== undefined) {
            expect(
                dark,
                `${token} is overridden under .dark — it is not safe on this card's fixed light surface`,
            ).toBe(base)
        }
    })

    it('uses no theme-reactive colour scale', () => {
        const reactive = /(?:bg|color|borderColor|outline)="(?:gray|indigo|slate|text|interactive|brand|surface)\./g
        expect(cardSource.match(reactive) ?? []).toEqual([])
    })

    it('uses no raw hex colour literals', () => {
        expect(cardSource.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
    })
})
