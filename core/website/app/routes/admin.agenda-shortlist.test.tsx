// @vitest-environment jsdom
/**
 * The organiser shortlist page, rendered with its real component and report
 * builder. The e2e suite can't reach it: admin pages sit behind a magic-link
 * login against a D1 allowlist, which no test run has. The e2e suite does
 * assert that the page is guarded (`e2e/my-agenda.spec.ts`).
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { buildShortlistReport, type ReportTalk } from '~/lib/agenda-shortlist-report'
import AgendaShortlistAdmin from './admin.agenda-shortlist.($year)'

afterEach(cleanup)

const talks: ReportTalk[] = [
    { id: '1', title: 'Popular Talk', startsAt: '2026-09-20T10:45:00', room: 'River Room 1', speakers: 'Ada' },
    { id: '2', title: 'Quiet Talk', startsAt: '2026-09-20T10:45:00', room: 'River Room 2', speakers: 'Grace' },
]

function renderPage(browsers = { anonymous: 20, signedIn: 0 }) {
    const rows = buildShortlistReport(
        talks,
        {
            year: '2026',
            browsers,
            countsByTalkId: {
                '1': { talkId: '1', anonymous: 15, signedIn: 2 },
                gone: { talkId: 'gone', anonymous: 3, signedIn: 0 },
            },
        },
        'popular',
    ).map((row) => ({ ...row, time: row.talk ? '10:45 am' : undefined }))

    const Stub = createRoutesStub([
        {
            path: '/admin/agenda-shortlist/:year?',
            Component: AgendaShortlistAdmin,
            loader: () => ({ year: '2026', sort: 'popular', rows, browsers, years: ['2026', '2025'] }),
        },
    ])
    render(<Stub initialEntries={['/admin/agenda-shortlist/2026']} />)
}

const bodyRows = async () => (await screen.findAllByRole('row')).slice(1)

describe('agenda shortlist admin page', () => {
    it('says plainly that the number is not a headcount', async () => {
        renderPage()

        expect(await screen.findByText('This is a soft signal, not a headcount.')).toBeTruthy()
    })

    it('shows anonymous and signed-in picks in separate columns, never a total', async () => {
        renderPage()

        const headers = (await screen.findAllByRole('columnheader')).map((th) => th.textContent)
        expect(headers).toEqual(['Talk', 'Time', 'Room', 'Anonymous picks', '% of browsers', 'Signed-in picks'])

        const [popular] = await bodyRows()
        const cells = within(popular)
            .getAllByRole('cell')
            .map((td) => td.textContent)
        expect(cells.slice(3)).toEqual(['15', '75%', '2'])
    })

    it('lists talks nobody picked and picks for talks that left the agenda', async () => {
        renderPage()

        const text = (await bodyRows()).map((row) => row.textContent)
        expect(text[0]).toContain('Popular Talk')
        expect(text[1]).toContain('No longer on the agenda (id gone)')
        expect(text[2]).toContain('Quiet Talk')
    })

    it('shows 0% rather than NaN before anyone has picked', async () => {
        renderPage({ anonymous: 0, signedIn: 0 })

        const [first] = await bodyRows()
        expect(first.textContent).not.toContain('NaN')
    })

    it('links to the other years', async () => {
        renderPage()

        expect((await screen.findByRole('link', { name: '2025' })).getAttribute('href')).toBe(
            '/admin/agenda-shortlist/2025',
        )
    })
})
