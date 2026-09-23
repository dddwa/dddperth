import { MAJOR_SPONSOR_TIERS, MINOR_SPONSOR_TIERS, SPONSOR_TIERS } from '@ddd/conference-config'
import type { YearSponsors } from '@ddd/conference-config'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The sponsor tier list is declared once in the core config package, and the
 * sponsor CLI tooling (`pnpm sponsor:add`, `scripts/sponsor-manager.mjs`)
 * derives its list from that declaration.
 *
 * It used to keep its own copies, and all of them had drifted: every copy was
 * missing `venue` and `prize`, and `add-sponsor.mjs` carried a `lunch` tier no
 * year config has ever used. A tier missing from the tooling can't be picked
 * when adding a sponsor, which is silent — you just don't see the option.
 */
describe('sponsor tiers', () => {
    const repoRoot = join(__dirname, '..', '..', '..', '..', '..')
    const tierHelperPath = join(repoRoot, 'scripts', 'lib', 'sponsor-tiers.mjs')

    it('covers every tier key on YearSponsors, in render order', () => {
        // Compile-time: a tier key added to YearSponsors but not to
        // SPONSOR_TIERS fails `satisfies` in types.ts. Runtime: guard the
        // reverse, and pin the order the site renders them in.
        const expected: (keyof YearSponsors)[] = [
            'platinum',
            'gold',
            'silver',
            'bronze',
            'digital',
            'community',
            'coffeeCart',
            'quietRoom',
            'venue',
            'prize',
            'keynotes',
            'inKind',
            'room',
        ]

        expect([...SPONSOR_TIERS]).toEqual(expected)
    })

    it('splits cleanly into major and minor tiers plus room', () => {
        const minor = MINOR_SPONSOR_TIERS.map(({ tier }) => tier)

        expect([...SPONSOR_TIERS]).toEqual([...MAJOR_SPONSOR_TIERS, ...minor, 'room'])
        // `room` is the one tier whose entries carry an extra field, so it is
        // neither a headline tier nor one of the pooled "Other Sponsors".
        expect(SPONSOR_TIERS).not.toContain('lunch')
    })

    it('gives every minor tier a default heading', () => {
        for (const { tier, defaultLabel } of MINOR_SPONSOR_TIERS) {
            expect(defaultLabel, `${tier} needs a default label`).toBeTruthy()
        }
    })

    /**
     * The sponsor CLI tooling re-exports these same constants (Node strips
     * types on import), so this asserts the scripts really do share the
     * declaration rather than having quietly reacquired a copy.
     */
    it.skipIf(!existsSync(tierHelperPath))('shares its tier list with the sponsor CLI tooling', async () => {
        const helper = (await import(tierHelperPath)) as {
            SPONSOR_TIERS: string[]
            MINOR_SPONSOR_TIERS: { tier: string; defaultLabel: string }[]
            tierLabel: (tier: string) => string
        }

        expect(helper.SPONSOR_TIERS).toBe(SPONSOR_TIERS)
        expect(helper.MINOR_SPONSOR_TIERS).toBe(MINOR_SPONSOR_TIERS)
        expect(helper.tierLabel('coffeeCart')).toBe('Coffee Cart')
        expect(helper.tierLabel('platinum')).toBe('Platinum')
    })

    it.skipIf(!existsSync(tierHelperPath))('offers every tier in the sponsor tool UI', () => {
        // The <option> list is generated from SPONSOR_TIERS; assert the source
        // no longer hand-maintains it, since that is what drifted before.
        const addSponsor = readFileSync(join(repoRoot, 'scripts', 'add-sponsor.mjs'), 'utf8')

        expect(addSponsor).toMatch(/SPONSOR_TIERS\.map/)
        expect(addSponsor).not.toMatch(/<option value="platinum">/)
    })
})
