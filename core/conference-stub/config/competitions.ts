import type { CompetitionConfig } from '@ddd/conference-config'
import { conferenceTime } from './dates.ts'

/**
 * Hidden competition entry forms, each at `/competition/<slug>`. They aren't
 * linked anywhere or listed in the sitemap, and they tell crawlers not to
 * index them — share the URL (or a QR code of it) directly. Entries appear at
 * /admin/competitions.
 *
 * Point `termsUrl` at your terms. A content page works well: give its MDX
 * frontmatter `noIndex: true` so it stays out of search and the sitemap too.
 */
export const competitions: CompetitionConfig[] = [
    {
        slug: 'example-prize-draw',
        title: 'Win a DevConf Example hoodie',
        description: [
            'Tell us your favourite talk from the day for a chance to win one of three DevConf Example hoodies.',
            'Winners are picked by the organising committee and contacted by email the week after the conference.',
        ],
        question: 'Which talk was your favourite, and why?',
        answerHint: 'A sentence or two is plenty.',
        termsUrl: '/code-of-conduct',
        get opens() {
            return conferenceTime('2026-01-01T00:00:00')
        },
        get closes() {
            return conferenceTime('2030-01-01T00:00:00')
        },
    },
]
