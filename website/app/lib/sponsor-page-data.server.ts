import { conferenceConfig } from '@ddd/conference-config'
import type { Sponsor, YearSponsors } from './conference-state-client-safe'

export interface PastSponsor {
    name: string
    logo: string
    website: string
}

export interface FeaturedQuote {
    sponsor: Sponsor
    category: 'platinum' | 'gold'
}

export interface SponsorPageData {
    latestYear: string | undefined
    featuredQuotes: FeaturedQuote[]
    pastSponsors: PastSponsor[]
}

const COMPANY_SUFFIXES = [
    'energy',
    'australia',
    'pty ltd',
    'pty',
    'ltd',
    'limited',
    'inc',
    'incorporated',
    'corp',
    'corporation',
    'group',
    'holdings',
]

function normaliseSponsorName(name: string): string {
    let normalised = name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[‘’“”]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    let changed = true
    while (changed) {
        changed = false
        for (const suffix of COMPANY_SUFFIXES) {
            if (normalised.endsWith(' ' + suffix)) {
                normalised = normalised.slice(0, -suffix.length).trim()
                changed = true
            }
        }
    }
    return normalised
}

function sponsorIdentityKey(sponsor: Sponsor): string {
    const normalisedName = normaliseSponsorName(sponsor.name)
    let host = ''
    try {
        host = new URL(sponsor.website).hostname.replace(/^www\./, '').toLowerCase()
    } catch {
        host = sponsor.website.toLowerCase()
    }
    return `${normalisedName}|${host}`
}

export function getSponsorPageData(): SponsorPageData {
    const conferences = Object.values(conferenceConfig.conferences)
        .filter((conf) => conf.kind === 'conference')
        .sort((a, b) => parseInt(b.year) - parseInt(a.year))

    const latest = conferences[0]
    const latestSponsors: YearSponsors = latest?.sponsors ?? {}
    const latestYear = latest?.year

    const featuredQuotes: FeaturedQuote[] = [
        ...(latestSponsors.platinum ?? [])
            .filter((s) => s.quote && s.quote.trim().length > 0)
            .map((sponsor) => ({ sponsor, category: 'platinum' as const })),
        ...(latestSponsors.gold ?? [])
            .filter((s) => s.quote && s.quote.trim().length > 0)
            .map((sponsor) => ({ sponsor, category: 'gold' as const })),
    ]

    const seenSponsors = new Set<string>()
    const pastSponsors: PastSponsor[] = []
    for (const conf of conferences) {
        const tiers: (Sponsor[] | undefined)[] = [
            conf.sponsors?.platinum,
            conf.sponsors?.gold,
            conf.sponsors?.silver,
            conf.sponsors?.bronze,
            conf.sponsors?.room,
            conf.sponsors?.digital,
            conf.sponsors?.community,
            conf.sponsors?.coffeeCart,
            conf.sponsors?.quietRoom,
            conf.sponsors?.keynotes,
        ]
        for (const tier of tiers) {
            if (!tier) continue
            for (const sponsor of tier) {
                const key = sponsorIdentityKey(sponsor)
                if (seenSponsors.has(key)) continue
                seenSponsors.add(key)
                pastSponsors.push({
                    name: sponsor.name,
                    logo: sponsor.logoUrlDarkMode,
                    website: sponsor.website,
                })
            }
        }
    }

    return { latestYear, featuredQuotes, pastSponsors }
}
