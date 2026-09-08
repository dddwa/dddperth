import { describe, expect, it } from 'vitest'
import { logisticsVisibility } from './logistics'
import {
    allRequiredComplete,
    nextIncompleteSection,
    splitJiraOptions,
    sponsorProgress,
    statusFlipReadiness,
    type ProgressInput,
} from './progress'
import type { SponsorProfile } from '../services/sponsors-store'

const logo: SponsorProfile['logo'] = {
    r2Key: 'k',
    filename: 'logo.svg',
    contentType: 'image/svg+xml',
    size: 10,
    uploadedAt: 1,
}

function profile(overrides: Partial<SponsorProfile> = {}): SponsorProfile {
    return { issueKey: 'SPN-1', socials: {}, ...overrides }
}

/** A fully answered exhibition section. */
const exhibitionAnswers = {
    exhibitorContactName: 'Vicki',
    exhibitorContactPhone: '0400000000',
    exhibitorContactEmail: 'vicki@example.com',
    bumpInSlot: 'Friday 1pm - 2pm',
    bumpOutWindow: 'Saturday 4pm',
    equipmentList: '1x banner',
}

function input(overrides: Partial<ProgressInput> = {}): ProgressInput {
    return {
        profile: null,
        visibility: logisticsVisibility('gold'),
        meetTheExpertsResponded: false,
        meetTheExpertsOffered: true,
        ...overrides,
    }
}

describe('sponsorProgress', () => {
    it('counts the website profile items', () => {
        const sections = sponsorProgress(input({ profile: profile({ logo, blurb: 'hi' }) }))
        const websiteProfile = sections.find((s) => s.key === 'profile')
        expect(websiteProfile).toMatchObject({ done: 2, total: 3, complete: false, notStarted: false })
    })

    it('marks a section not started when nothing is filled in', () => {
        const sections = sponsorProgress(input())
        expect(sections.find((s) => s.key === 'profile')).toMatchObject({ done: 0, notStarted: true })
    })

    it('omits exhibition and screens for a tier without a booth', () => {
        const sections = sponsorProgress(input({ visibility: logisticsVisibility('digital') }))
        expect(sections.map((s) => s.key)).not.toContain('exhibition')
        expect(sections.map((s) => s.key)).not.toContain('screens')
        // Raffle and social quote are open to every tier.
        expect(sections.map((s) => s.key)).toContain('raffle')
        expect(sections.map((s) => s.key)).toContain('social')
    })

    it('omits Meet the Experts when the conference offers no slots', () => {
        const sections = sponsorProgress(input({ meetTheExpertsOffered: false }))
        expect(sections.map((s) => s.key)).not.toContain('meetTheExperts')
    })

    it('ignores whitespace-only answers', () => {
        const sections = sponsorProgress(input({ profile: profile({ blurb: '   ', websiteUrl: '  ' }) }))
        expect(sections.find((s) => s.key === 'profile')).toMatchObject({ done: 0 })
    })
})

describe('allRequiredComplete', () => {
    it('is false while logistics are outstanding, even with a complete website profile', () => {
        // Vicki's report: the old banner said "all done" at this point.
        const sections = sponsorProgress(
            input({ profile: profile({ logo, blurb: 'hi', websiteUrl: 'https://x.test' }) }),
        )
        expect(sections.find((s) => s.key === 'profile')?.complete).toBe(true)
        expect(allRequiredComplete(sections)).toBe(false)
    })

    it('is true once every required section is done, ignoring optional ones', () => {
        const sections = sponsorProgress(
            input({
                profile: profile({
                    logo,
                    blurb: 'hi',
                    websiteUrl: 'https://x.test',
                    logistics: { ...exhibitionAnswers },
                }),
            }),
        )
        expect(allRequiredComplete(sections)).toBe(true)
        // …even though the optional ones are untouched.
        expect(sections.find((s) => s.key === 'raffle')?.complete).toBe(false)
    })
})

describe('nextIncompleteSection', () => {
    it('points at the profile first, then logistics', () => {
        expect(nextIncompleteSection(sponsorProgress(input()))?.key).toBe('profile')

        const withProfile = sponsorProgress(
            input({ profile: profile({ logo, blurb: 'hi', websiteUrl: 'https://x.test' }) }),
        )
        expect(nextIncompleteSection(withProfile)?.key).toBe('exhibition')
    })

    it('returns undefined when everything required is done', () => {
        const sections = sponsorProgress(
            input({
                profile: profile({
                    logo,
                    blurb: 'hi',
                    websiteUrl: 'https://x.test',
                    logistics: { ...exhibitionAnswers },
                }),
            }),
        )
        expect(nextIncompleteSection(sections)).toBeUndefined()
    })

    it('never points at an optional section', () => {
        const sections = sponsorProgress(
            input({
                profile: profile({
                    logo,
                    blurb: 'hi',
                    websiteUrl: 'https://x.test',
                    logistics: { ...exhibitionAnswers },
                }),
                meetTheExpertsResponded: false,
            }),
        )
        expect(nextIncompleteSection(sections)).toBeUndefined()
    })
})

describe('statusFlipReadiness', () => {
    const visibility = logisticsVisibility('gold')

    it('flips social only once there is both a logo and a social quote', () => {
        expect(statusFlipReadiness({ profile: profile({ logo }), visibility }).social).toBe(false)
        expect(
            statusFlipReadiness({ profile: profile({ logistics: { socialQuote: 'q' } }), visibility }).social,
        ).toBe(false)
        expect(
            statusFlipReadiness({ profile: profile({ logo, logistics: { socialQuote: 'q' } }), visibility }).social,
        ).toBe(true)
    })

    it('does not flip social on the website blurb alone', () => {
        // The website blurb and the social quote are different copy.
        expect(statusFlipReadiness({ profile: profile({ logo, blurb: 'website' }), visibility }).social).toBe(false)
    })

    it('flips exhibition once the required venue answers are in', () => {
        const partial = { ...exhibitionAnswers, equipmentList: '' }
        expect(statusFlipReadiness({ profile: profile({ logistics: partial }), visibility }).exhibition).toBe(false)
        expect(
            statusFlipReadiness({ profile: profile({ logistics: { ...exhibitionAnswers } }), visibility })
                .exhibition,
        ).toBe(true)
    })

    it('flips raffle on a prize description', () => {
        expect(statusFlipReadiness({ profile: profile({ logistics: { rafflePrize: 'kbd' } }), visibility }).raffle)
            .toBe(true)
    })

    it('marks induction required when someone needs dock access', () => {
        const result = statusFlipReadiness({
            profile: profile({ logistics: { ...exhibitionAnswers, loadingDockAttendees: 'Sam' } }),
            visibility,
        })
        expect(result.induction).toBe('required')
    })

    it('marks induction not-required only once the rest of the form is answered', () => {
        // Blank attendees but nothing else filled in either — can't tell
        // "nobody needs access" from "hasn't got there yet".
        expect(statusFlipReadiness({ profile: profile(), visibility }).induction).toBeUndefined()

        expect(
            statusFlipReadiness({ profile: profile({ logistics: { ...exhibitionAnswers } }), visibility })
                .induction,
        ).toBe('not-required')
    })

    it('leaves induction undefined for a tier without a booth', () => {
        expect(
            statusFlipReadiness({
                profile: profile({ logistics: { ...exhibitionAnswers, loadingDockAttendees: 'Sam' } }),
                visibility: logisticsVisibility('digital'),
            }).induction,
        ).toBeUndefined()
    })
})

describe('splitJiraOptions', () => {
    it('keeps commas inside an option label intact', () => {
        // Every "Assets Required" label carries a parenthesised tier list, so
        // a naive split(',') breaks each option in half.
        expect(
            splitJiraOptions('Logo and blurb on Website (All types), Video for Mega Screen (Platinum, Gold)'),
        ).toEqual(['Logo and blurb on Website (All types)', 'Video for Mega Screen (Platinum, Gold)'])
    })

    it('splits plain comma-separated values', () => {
        expect(splitJiraOptions('For Bump In, For Bump Out')).toEqual(['For Bump In', 'For Bump Out'])
    })

    it('handles a single value, blanks and undefined', () => {
        expect(splitJiraOptions('Just one (Platinum, Gold)')).toEqual(['Just one (Platinum, Gold)'])
        expect(splitJiraOptions('')).toEqual([])
        expect(splitJiraOptions(undefined)).toEqual([])
        expect(splitJiraOptions('a, , b')).toEqual(['a', 'b'])
    })

    it('does not lose text when parentheses are unbalanced', () => {
        expect(splitJiraOptions('Broken (open, still open')).toEqual(['Broken (open, still open'])
        expect(splitJiraOptions('Closed) extra, second')).toEqual(['Closed) extra', 'second'])
    })
})
