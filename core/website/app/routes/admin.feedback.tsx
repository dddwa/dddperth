import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { data, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import type { RatingSummary } from '~/lib/feedback/feedback-report'
import { feedbackYears, loadFeedbackReport, resolveFeedbackYear } from '~/lib/feedback/feedback-report.server'
import { Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.feedback'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const year = resolveFeedbackYear(context, new URL(request.url).searchParams.get('year'))
    const report = await loadFeedbackReport(context, year)
    const submitted = (seconds: number) =>
        DateTime.fromSeconds(seconds, { zone: conferenceManifest.public.timezone }).toFormat('d MMM, h:mm a')

    return data({
        year,
        years: feedbackYears(),
        conference: report.conference,
        conferenceResponses: report.conferenceResponses.map((response) => ({
            ...response,
            submitted: submitted(response.submittedAt),
        })),
        talks: report.talks,
        talkResponses: report.talkResponses.map((response) => ({
            ...response,
            submitted: submitted(response.submittedAt),
        })),
    })
}

const cell = { p: '2', border: 'admin-emphasis', verticalAlign: 'top' } as const

export default function FeedbackAdmin() {
    const { year, years, conference, conferenceResponses, talks, talkResponses } = useLoaderData<typeof loader>()

    return (
        <AdminLayout heading={`Feedback — ${year}`}>
            <Flex gap="6" flexWrap="wrap" alignItems="center" mb="4" fontSize="sm">
                <Flex gap="3" alignItems="center">
                    <span>Year:</span>
                    {years.map((y) =>
                        y === year ? (
                            <styled.span key={y} fontWeight="bold" aria-current="page">
                                {y}
                            </styled.span>
                        ) : (
                            <AppLink key={y} to={`/admin/feedback?year=${y}`} unstyled textDecoration="underline">
                                {y}
                            </AppLink>
                        ),
                    )}
                </Flex>
                <AppLink to={`/admin/feedback/export?year=${year}`} download unstyled textDecoration="underline">
                    Download as Excel (.xlsx)
                </AppLink>
            </Flex>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="3">
                    Conference feedback
                </styled.h2>
                <SummaryLine summary={conference} />
                {conferenceResponses.length ? (
                    <styled.table width="full" fontSize="sm" mt="4">
                        <thead>
                            <tr>
                                <styled.th {...cell} textAlign="right">
                                    Rating
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Why come / best thing
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Ideas or suggestions
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Meet the Experts
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Other feedback
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Email
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Submitted
                                </styled.th>
                            </tr>
                        </thead>
                        <tbody>
                            {conferenceResponses.map((response) => (
                                <tr key={response.id}>
                                    <styled.td {...cell} textAlign="right">
                                        {response.rating}
                                    </styled.td>
                                    <TextCell value={response.bestThing} />
                                    <TextCell value={response.ideas} />
                                    <TextCell value={response.meetTheExperts} />
                                    <TextCell value={response.feedback} />
                                    <TextCell value={response.email} />
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {response.submitted}
                                    </styled.td>
                                </tr>
                            ))}
                        </tbody>
                    </styled.table>
                ) : null}
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="3">
                    Talk feedback — by talk
                </styled.h2>
                {talks.length ? (
                    <styled.table width="full" fontSize="sm">
                        <thead>
                            <tr>
                                <styled.th {...cell} textAlign="left">
                                    Time
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Talk
                                </styled.th>
                                <styled.th {...cell} textAlign="right">
                                    Responses
                                </styled.th>
                                <styled.th {...cell} textAlign="right">
                                    Average
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    ★1 / ★2 / ★3 / ★4 / ★5
                                </styled.th>
                            </tr>
                        </thead>
                        <tbody>
                            {talks.map((row) => (
                                <tr key={row.targetId}>
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {row.target?.time || '—'}
                                    </styled.td>
                                    <styled.td {...cell}>
                                        <TalkName target={row.target} targetId={row.targetId} />
                                    </styled.td>
                                    <styled.td {...cell} textAlign="right">
                                        {row.count}
                                    </styled.td>
                                    <styled.td {...cell} textAlign="right">
                                        {row.average ?? '—'}
                                    </styled.td>
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {row.distribution.join(' / ')}
                                    </styled.td>
                                </tr>
                            ))}
                        </tbody>
                    </styled.table>
                ) : (
                    <p>No agenda is available for {year}, and nobody has left talk feedback.</p>
                )}
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="3">
                    Talk feedback — every response ({talkResponses.length})
                </styled.h2>
                {talkResponses.length ? (
                    <styled.table width="full" fontSize="sm">
                        <thead>
                            <tr>
                                <styled.th {...cell} textAlign="left">
                                    Talk
                                </styled.th>
                                <styled.th {...cell} textAlign="right">
                                    Rating
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Feedback for speaker
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    For organisers only
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Email
                                </styled.th>
                                <styled.th {...cell} textAlign="left">
                                    Submitted
                                </styled.th>
                            </tr>
                        </thead>
                        <tbody>
                            {talkResponses.map((response) => (
                                <tr key={response.id}>
                                    <styled.td {...cell}>
                                        <TalkName target={response.target} targetId={response.targetId} />
                                    </styled.td>
                                    <styled.td {...cell} textAlign="right">
                                        {response.rating}
                                    </styled.td>
                                    <TextCell value={response.speakerFeedback} />
                                    <TextCell value={response.organiserFeedback} />
                                    <TextCell value={response.email} />
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {response.submitted}
                                    </styled.td>
                                </tr>
                            ))}
                        </tbody>
                    </styled.table>
                ) : (
                    <p>No talk feedback yet.</p>
                )}
            </AdminCard>
        </AdminLayout>
    )
}

function SummaryLine({ summary }: { summary: RatingSummary }) {
    if (!summary.count) return <p>No conference feedback yet.</p>
    return (
        <p>
            {summary.count} {summary.count === 1 ? 'response' : 'responses'}, averaging{' '}
            <strong>{summary.average}</strong> out of 5. ★1–★5: {summary.distribution.join(' / ')}
        </p>
    )
}

function TalkName({
    target,
    targetId,
}: {
    target: { title: string; speakers: string; kind: 'talk' | 'meet-the-experts' } | undefined
    targetId: string
}) {
    if (!target) return <styled.span fontStyle="italic">No longer on the agenda (id {targetId})</styled.span>
    return (
        <>
            {target.title}
            {target.kind === 'talk' && target.speakers ? (
                <styled.span display="block" color="admin.600">
                    {target.speakers}
                </styled.span>
            ) : null}
        </>
    )
}

function TextCell({ value }: { value: string | null }) {
    return (
        <styled.td {...cell} whiteSpace="pre-wrap">
            {value ?? ''}
        </styled.td>
    )
}
