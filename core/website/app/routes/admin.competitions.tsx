import { conferenceManifest } from '@conference/manifest'
import { data, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { competitionStatus, findCompetition } from '~/lib/competitions/competition-entry'
import { conferenceInstant } from '~/lib/dates/temporal'
import { getDateTimeProvider, getServices } from '~/remix-app-load-context'
import { Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.competitions'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const competitions = conferenceManifest.competitions ?? []
    const services = getServices(context)
    const now = getDateTimeProvider(context).nowDate()
    const shortDate = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' } as const

    const selected =
        findCompetition(competitions, new URL(request.url).searchParams.get('slug') ?? undefined) ?? competitions[0]
    const [counts, entries] = await Promise.all([
        services.competitions.countEntries(),
        selected ? services.competitions.listEntries(selected.slug) : Promise.resolve([]),
    ])

    return data({
        competitions: competitions.map((competition) => ({
            slug: competition.slug,
            title: competition.title,
            status: competitionStatus(competition, now),
            opens: competition.opens.toLocaleString('en-AU', shortDate),
            closes: competition.closes.toLocaleString('en-AU', shortDate),
            entries: counts[competition.slug] ?? 0,
        })),
        selectedSlug: selected?.slug,
        entries: entries.map((entry) => ({
            ...entry,
            submitted: conferenceInstant(entry.submittedAt * 1000).toLocaleString('en-AU', shortDate),
        })),
    })
}

const cell = { p: '2', border: 'admin-emphasis', verticalAlign: 'top' } as const
const STATUS_LABEL = { upcoming: 'Not open yet', open: 'Open', closed: 'Closed' } as const

export default function CompetitionsAdmin() {
    const { competitions, selectedSlug, entries } = useLoaderData<typeof loader>()
    const selected = competitions.find((competition) => competition.slug === selectedSlug)

    return (
        <AdminLayout heading="Competitions">
            <AdminCard>
                {competitions.length ? (
                    <styled.table width="full" fontSize="sm">
                        <thead>
                            <tr>
                                <styled.th {...cell} textAlign="left">
                                    Competition
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Entry page
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Status
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Opens
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Closes
                                </styled.th>
                                <styled.th {...cell} textAlign="right">
                                    Entries
                                </styled.th>
                            </tr>
                        </thead>
                        <tbody>
                            {competitions.map((competition) => (
                                <tr key={competition.slug}>
                                    <styled.td {...cell}>
                                        {competition.slug === selectedSlug ? (
                                            <styled.span fontWeight="bold" aria-current="page">
                                                {competition.title}
                                            </styled.span>
                                        ) : (
                                            <AppLink
                                                to={`/admin/competitions?slug=${competition.slug}`}
                                                unstyled
                                                textDecoration="underline"
                                            >
                                                {competition.title}
                                            </AppLink>
                                        )}
                                    </styled.td>
                                    <styled.td {...cell}>
                                        <AppLink
                                            to={`/competition/${competition.slug}`}
                                            unstyled
                                            textDecoration="underline"
                                        >
                                            /competition/{competition.slug}
                                        </AppLink>{' '}
                                        (
                                        <AppLink
                                            to={`/admin/qr-codes?url=${encodeURIComponent(`/competition/${competition.slug}`)}`}
                                            unstyled
                                            textDecoration="underline"
                                        >
                                            QR code
                                        </AppLink>
                                        )
                                    </styled.td>
                                    <styled.td {...cell}>{STATUS_LABEL[competition.status]}</styled.td>
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {competition.opens}
                                    </styled.td>
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {competition.closes}
                                    </styled.td>
                                    <styled.td {...cell} textAlign="right">
                                        {competition.entries}
                                    </styled.td>
                                </tr>
                            ))}
                        </tbody>
                    </styled.table>
                ) : (
                    <p>
                        No competitions are configured. Add one to <code>competitions</code> in the conference
                        manifest.
                    </p>
                )}
            </AdminCard>

            {selected ? (
                <AdminCard>
                    <Flex gap="4" flexWrap="wrap" alignItems="baseline" justifyContent="space-between" mb="3">
                        <styled.h2 fontSize="xl" fontWeight="semibold">
                            {selected.title} — entries ({entries.length})
                        </styled.h2>
                        <AppLink
                            to={`/admin/competitions/export?slug=${selected.slug}`}
                            download
                            unstyled
                            textDecoration="underline"
                            fontSize="sm"
                        >
                            Download as Excel (.xlsx)
                        </AppLink>
                    </Flex>
                    {entries.length ? (
                        <styled.table width="full" fontSize="sm">
                            <thead>
                                <tr>
                                    <styled.th {...cell} textAlign="left">
                                        Name
                                    </styled.th>
                                    <styled.th {...cell} textAlign="left">
                                        Email
                                    </styled.th>
                                    <styled.th {...cell} textAlign="left">
                                        Answer
                                    </styled.th>
                                    <styled.th {...cell} textAlign="left">
                                        Submitted
                                    </styled.th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <styled.td {...cell}>{entry.name}</styled.td>
                                        <styled.td {...cell}>{entry.email}</styled.td>
                                        <styled.td {...cell} whiteSpace="pre-wrap">
                                            {entry.answer}
                                        </styled.td>
                                        <styled.td {...cell} whiteSpace="nowrap">
                                            {entry.submitted}
                                        </styled.td>
                                    </tr>
                                ))}
                            </tbody>
                        </styled.table>
                    ) : (
                        <p>No entries yet.</p>
                    )}
                </AdminCard>
            ) : null}
        </AdminLayout>
    )
}
