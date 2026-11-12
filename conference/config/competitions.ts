import type { CompetitionConfig } from '@ddd/conference-config'
// When adding one, also: import { conferenceTime } from './dates.ts'

/**
 * Hidden competition entry forms, each at `/competition/<slug>`. They aren't
 * linked anywhere or listed in the sitemap, and they tell crawlers not to
 * index them — share the URL (or a QR code of it) directly. Entries, and a
 * download of them, are at /admin/competitions.
 *
 * - `slug` is the only thing keeping the page from being found by guessing,
 *   so add a random suffix (e.g. `win-a-lego-set-7q4k`). Entries are stored
 *   under it: don't rename it once entries exist.
 * - `opens`/`closes`: entries are accepted from `opens` until (not including)
 *   `closes`, in Perth time. Outside that window the page says so.
 * - `termsUrl`: point at a content page with `noIndex: true` in its
 *   frontmatter, so the terms stay out of search and the sitemap as well.
 */
export const competitions: CompetitionConfig[] = [
    // {
    //     slug: 'win-a-lego-set-7q4k',
    //     title: 'Win a LEGO set',
    //     description: ['Tell us your favourite talk of the day for a chance to win.'],
    //     question: 'Which talk was your favourite, and why?',
    //     answerHint: 'A sentence or two is plenty.',
    //     termsUrl: '/competition-terms',
    //     get opens() {
    //         return conferenceTime('2026-10-03T08:00:00')
    //     },
    //     get closes() {
    //         return conferenceTime('2026-10-03T17:00:00')
    //     },
    // },
]
