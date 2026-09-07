import { conferenceManifest } from '@conference/manifest'
import { describe, expect, it } from 'vitest'
import { planStatusWrite } from './sync-plan'

/**
 * Guards the fork's Jira ids against the two mistakes that are silent at
 * runtime: pointing a flip at an option belonging to a *different* field, and
 * listing a target that's also its own "pending" value (which makes the flip
 * a permanent no-op).
 *
 * Both fail invisibly in production — Jira rejects an unknown option id by
 * failing the whole update, and the portal swallows that as a best-effort
 * write-back, so the committee just never sees the status move.
 *
 * The option ids below mirror the SPN project's Sponsor issue type
 * (issuetype 10043). Re-read them from Jira's createmeta if the fields change.
 */

/** Option ids per status field, as configured in Jira. */
const JIRA_OPTIONS: Record<string, string[]> = {
    customfield_10205: ['10201', '10202', '10203', '10204'], // Asset Creation Status
    customfield_10201: ['10183', '10184', '10185'], // Social Media Status
    customfield_10202: ['10187', '10188', '10205', '10189'], // Exhibition Information and Setup
    customfield_10204: ['10198', '10199', '10200'], // Raffle Prize Status
    customfield_10199: ['10190', '10177', '10178', '10180', '10181'], // Optus Induction Status
}

const portal = conferenceManifest.sponsorPortal

describe.runIf(portal)('sponsor portal Jira status flips', () => {
    // Guarded by describe.runIf above; the non-null narrowing keeps every
    // assertion below free of `?.` noise that would hide a real undefined.
    const jira = (portal as NonNullable<typeof portal>).jira
    const { fields, statusFlips } = jira

    it('points the assets flip at options belonging to the assets field', () => {
        const allowed = JIRA_OPTIONS[fields.assetsStatus]
        expect(allowed).toBeDefined()
        expect(allowed).toContain(jira.assetsCompleteOptionId)
        for (const pending of jira.assetsPendingOptionIds) expect(allowed).toContain(pending)
    })

    it('points each simple flip at options belonging to its own field', () => {
        const simpleFlips = [
            ['social', fields.socialStatus, statusFlips?.social],
            ['exhibition', fields.exhibitionStatus, statusFlips?.exhibition],
            ['raffle', fields.raffleStatus, statusFlips?.raffle],
        ] as const

        for (const [name, fieldId, flip] of simpleFlips) {
            expect(fieldId, `${name} field id`).toBeDefined()
            const allowed = JIRA_OPTIONS[fieldId ?? '']
            expect(allowed, `${name} options`).toBeDefined()
            expect(allowed, `${name} target`).toContain(flip?.targetOptionId)
            for (const pending of flip?.pendingOptionIds ?? []) {
                expect(allowed, `${name} pending`).toContain(pending)
            }
        }
    })

    it('points both induction targets at options belonging to the induction field', () => {
        const allowed = JIRA_OPTIONS[fields.inductionStatus ?? '']
        const induction = statusFlips?.induction
        expect(allowed).toBeDefined()
        expect(allowed).toContain(induction?.requiredOptionId)
        expect(allowed).toContain(induction?.notRequiredOptionId)
        for (const pending of induction?.pendingOptionIds ?? []) expect(allowed).toContain(pending)
    })

    it('never lists a target as its own pending value', () => {
        // Such a flip would plan 'already-set' forever and never fire.
        for (const flip of [statusFlips?.social, statusFlips?.exhibition, statusFlips?.raffle]) {
            if (flip) expect(flip.pendingOptionIds).not.toContain(flip.targetOptionId)
        }
        expect(jira.assetsPendingOptionIds).not.toContain(jira.assetsCompleteOptionId)

        const induction = statusFlips?.induction
        if (induction) {
            expect(induction.pendingOptionIds).not.toContain(induction.requiredOptionId)
            expect(induction.pendingOptionIds).not.toContain(induction.notRequiredOptionId)
        }
    })

    it('advances each workstream off its Jira default, then stops', () => {
        // Each field's Jira default is the value the portal may move off.
        const cases = [
            ['10183', statusFlips?.social],
            ['10187', statusFlips?.exhibition],
            ['10198', statusFlips?.raffle],
        ] as const

        for (const [defaultOption, flip] of cases) {
            if (!flip) continue
            expect(flip.pendingOptionIds).toContain(defaultOption)
            expect(
                planStatusWrite({
                    current: defaultOption,
                    targetOptionId: flip.targetOptionId,
                    pendingOptionIds: flip.pendingOptionIds,
                }),
            ).toBe('set')
            // A second save must not rewrite it.
            expect(
                planStatusWrite({
                    current: flip.targetOptionId,
                    targetOptionId: flip.targetOptionId,
                    pendingOptionIds: flip.pendingOptionIds,
                }),
            ).toBe('already-set')
        }
    })

    it('leaves a committee-advanced status alone', () => {
        const raffle = statusFlips?.raffle
        if (!raffle) return
        // "Raffle Prize collected/arranged (Sponsorship)" is past the portal's
        // target — the sponsorship team owns it from there.
        expect(
            planStatusWrite({
                current: '10200',
                targetOptionId: raffle.targetOptionId,
                pendingOptionIds: raffle.pendingOptionIds,
            }),
        ).toBe('committee-advanced')
    })
})
