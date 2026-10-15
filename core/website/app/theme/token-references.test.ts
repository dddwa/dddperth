/**
 * Every theme token the generated CSS references must also be defined.
 *
 * A `var()` pointing at an undefined custom property fails silently: the
 * declaration computes to its initial value, so a border becomes no border
 * and prose text inherits whatever colour is around it. Nothing errors and
 * nothing looks obviously broken, which is how the theme's dotted token keys
 * (`'border.default'`) went unnoticed: Panda defined them as
 * `--colors-border\.default` while every reference asked for
 * `--colors-border-default`.
 *
 * Reads the *generated* `styled-system/styles.css`, so it needs panda codegen
 * (`pnpm run setup`) to have run — which CI does before tests.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(join(__dirname, '..', 'styled-system', 'styles.css'), 'utf8')

/** Only token namespaces: Panda also references runtime vars (`--animate-from`) that are set inline. */
const TOKEN_VAR = /var\((--(?:colors|borders|shadows)-[\w\\.-]+)/g
const DEFINITION = /(?:^|[;{\s])(--(?:colors|borders|shadows)-[\w\\.-]+)\s*:/g

const referenced = new Set([...styles.matchAll(TOKEN_VAR)].map((m) => m[1]))
const defined = new Set([...styles.matchAll(DEFINITION)].map((m) => m[1]))

describe('theme token references', () => {
    it('finds the token references it is meant to check', () => {
        // Guards the regexes: an empty set would pass the test below vacuously.
        expect(referenced).toContain('--colors-border-default')
        expect(defined).toContain('--borders-default')
    })

    it('references no undefined colour, border or shadow token', () => {
        const undefinedRefs = [...referenced].filter((name) => !defined.has(name)).sort()
        expect(undefinedRefs).toEqual([])
    })

    it('emits no dot-escaped token names', () => {
        // A flat dotted key in the theme builder is what produces these, and
        // no `{colors.x.y}` or `token()` reference ever resolves to one.
        expect(styles).not.toMatch(/--(?:colors|borders|shadows)-[\w-]*\\\./)
    })
})
