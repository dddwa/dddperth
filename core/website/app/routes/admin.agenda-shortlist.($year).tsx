import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { buildShortlistReport, type ShortlistReportSort } from '~/lib/agenda-shortlist-report'
import { requireAdmin } from '~/lib/auth.server'
import type { Year } from '~/lib/conference-state-client-safe'
import { isConferenceYear } from '~/lib/get-year-config.server'
import { getPublishedSchedule, scheduleTalks } from '~/lib/published-agenda.server'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import { Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.agenda-shortlist.($year)'

export async function loader({ request, context, params }: Route.LoaderArgs) {
    await requireAdmin(request, context)

    if (params.year && !isConferenceYear(params.year)) {
        throw new Response('Unknown conference year', { status: 404 })
    }
    const year = (params.year ?? getConferenceState(context).conference.year) as Year
    const sort: ShortlistReportSort = new URL(request.url).searchParams.get('sort') === 'time' ? 'time' : 'popular'

    const [counts, schedule] = await Promise.all([
        getServices(context).agendaShortlist.getCountsForYear(year),
        getPublishedSchedule(context, year),
    ])

    const talks = schedule
        ? scheduleTalks(schedule).map((talk) => ({
              id: talk.id,
              title: talk.title,
              startsAt: talk.startsAt,
              room: talk.room,
              speakers: talk.speakers.map((speaker) => speaker.name).join(', '),
          }))
        : []

    const rows = buildShortlistReport(talks, counts, sort).map((row) => ({
        ...row,
        time: row.talk?.startsAt
            ? DateTime.fromISO(row.talk.startsAt, { zone: conferenceManifest.public.timezone })
                  .toFormat('h:mm a')
                  .toLowerCase()
            : undefined,
    }))

    const years = Object.values(conferenceManifest.conferences.conferences)
        .filter((conference) => conference.kind === 'conference')
        .map((conference) => conference.year)
        .sort()
        .reverse()

    return data({ year, sort, rows, browsers: counts.browsers, years })
}

const cell = { p: '2', border: 'admin-emphasis' } as const

export default function AgendaShortlistAdmin() {
    const { year, sort, rows, browsers, years } = useLoaderData<typeof loader>()
    const base = `/admin/agenda-shortlist/${year}`

    return (
        <AdminLayout heading={`Agenda shortlist — ${year}`}>
            <AdminCard>
                <styled.p mb="3">
                    How many browsers have added each talk to their agenda. Use it to spot a talk that is unusually
                    popular for its slot.
                </styled.p>
                <styled.p mb="3">
                    <strong>This is a soft signal, not a headcount.</strong> Anonymous picks are counted once per
                    browser, so someone with a phone and a laptop counts twice and clearing cookies counts again.
                    Don&apos;t size a room on this number alone.
                </styled.p>
                <styled.p>
                    {browsers.anonymous} {browsers.anonymous === 1 ? 'browser has' : 'browsers have'} picked talks
                    anonymously; {browsers.signedIn} signed in.
                </styled.p>
            </AdminCard>

            <Flex gap="6" flexWrap="wrap" mb="4" fontSize="sm">
                <Flex gap="3" alignItems="center">
                    <span>Year:</span>
                    {years.map((y) =>
                        y === year ? (
                            <styled.span key={y} fontWeight="bold" aria-current="page">
                                {y}
                            </styled.span>
                        ) : (
                            <AppLink key={y} to={`/admin/agenda-shortlist/${y}`} unstyled textDecoration="underline">
                                {y}
                            </AppLink>
                        ),
                    )}
                </Flex>
                <Flex gap="3" alignItems="center">
                    <span>Order:</span>
                    {sort === 'popular' ? (
                        <styled.span fontWeight="bold">Most picked</styled.span>
                    ) : (
                        <AppLink to={base} unstyled textDecoration="underline">
                            Most picked
                        </AppLink>
                    )}
                    {sort === 'time' ? (
                        <styled.span fontWeight="bold">By time</styled.span>
                    ) : (
                        <AppLink to={`${base}?sort=time`} unstyled textDecoration="underline">
                            By time
                        </AppLink>
                    )}
                </Flex>
            </Flex>

            {rows.length === 0 ? (
                <p>No agenda has been published for {year}, and nobody has picked any talks.</p>
            ) : (
                <styled.table width="full" fontSize="sm">
                    <thead>
                        <tr>
                            <styled.th {...cell} textAlign="left">
                                Talk
                            </styled.th>
                            <styled.th {...cell} textAlign="left">
                                Time
                            </styled.th>
                            <styled.th {...cell} textAlign="left">
                                Room
                            </styled.th>
                            <styled.th {...cell} textAlign="right">
                                Anonymous picks
                            </styled.th>
                            <styled.th {...cell} textAlign="right">
                                % of browsers
                            </styled.th>
                            <styled.th {...cell} textAlign="right">
                                Signed-in picks
                            </styled.th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.talkId}>
                                <styled.td {...cell}>
                                    {row.talk ? (
                                        <>
                                            {row.talk.title}
                                            {row.talk.speakers ? (
                                                <styled.span display="block" color="admin.600">
                                                    {row.talk.speakers}
                                                </styled.span>
                                            ) : null}
                                        </>
                                    ) : (
                                        <styled.span fontStyle="italic">
                                            No longer on the agenda (id {row.talkId})
                                        </styled.span>
                                    )}
                                </styled.td>
                                <styled.td {...cell}>{row.time ?? '—'}</styled.td>
                                <styled.td {...cell}>{row.talk?.room ?? '—'}</styled.td>
                                <styled.td {...cell} textAlign="right">
                                    {row.anonymous}
                                </styled.td>
                                <styled.td {...cell} textAlign="right">
                                    {Math.round(row.anonymousShare * 100)}%
                                </styled.td>
                                <styled.td {...cell} textAlign="right">
                                    {row.signedIn}
                                </styled.td>
                            </tr>
                        ))}
                    </tbody>
                </styled.table>
            )}
        </AdminLayout>
    )
}
