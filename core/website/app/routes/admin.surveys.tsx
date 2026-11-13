import { conferenceManifest } from '@conference/manifest'
import { data, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { conferenceInstant } from '~/lib/dates/temporal'
import { openWindowStatus } from '~/lib/forms/open-window'
import { findSurvey, formatAnswer, tallySurvey } from '~/lib/surveys/survey-response'
import { getDateTimeProvider, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.surveys'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const surveys = conferenceManifest.surveys ?? []
    const services = getServices(context)
    const now = getDateTimeProvider(context).nowDate()
    const shortDate = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' } as const

    const selected = findSurvey(surveys, new URL(request.url).searchParams.get('slug') ?? undefined) ?? surveys[0]
    const [counts, responses] = await Promise.all([
        services.surveys.countResponses(),
        selected ? services.surveys.listResponses(selected.slug) : Promise.resolve([]),
    ])
    const tallies = selected ? tallySurvey(selected, responses) : {}

    return data({
        surveys: surveys.map((survey) => ({
            slug: survey.slug,
            title: survey.title,
            status: openWindowStatus(survey, now),
            opens: survey.opens.toLocaleString('en-AU', shortDate),
            closes: survey.closes.toLocaleString('en-AU', shortDate),
            responses: counts[survey.slug] ?? 0,
        })),
        selected: selected
            ? {
                  slug: selected.slug,
                  title: selected.title,
                  questions: selected.questions.map((question) => ({
                      id: question.id,
                      label: question.label,
                      tally: tallies[question.id],
                  })),
                  rows: responses.map((response) => ({
                      id: response.id,
                      cells: selected.questions.map((question) => formatAnswer(response, question)),
                      email: response.email,
                      submitted: conferenceInstant(response.submittedAt * 1000).toLocaleString('en-AU', shortDate),
                  })),
              }
            : undefined,
    })
}

const cell = { p: '2', border: 'admin-emphasis', verticalAlign: 'top' } as const
const STATUS_LABEL = { upcoming: 'Not open yet', open: 'Open', closed: 'Closed' } as const

export default function SurveysAdmin() {
    const { surveys, selected } = useLoaderData<typeof loader>()

    return (
        <AdminLayout heading="Surveys">
            <AdminCard>
                {surveys.length ? (
                    <styled.table width="full" fontSize="sm">
                        <thead>
                            <tr>
                                {['Survey', 'Page', 'Status', 'Opens', 'Closes'].map((heading) => (
                                    <styled.th key={heading} {...cell} textAlign="left">
                                        {heading}
                                    </styled.th>
                                ))}
                                <styled.th {...cell} textAlign="right">
                                    Responses
                                </styled.th>
                            </tr>
                        </thead>
                        <tbody>
                            {surveys.map((survey) => (
                                <tr key={survey.slug}>
                                    <styled.td {...cell}>
                                        {survey.slug === selected?.slug ? (
                                            <styled.span fontWeight="bold" aria-current="page">
                                                {survey.title}
                                            </styled.span>
                                        ) : (
                                            <AppLink to={`/admin/surveys?slug=${survey.slug}`} unstyled textDecoration="underline">
                                                {survey.title}
                                            </AppLink>
                                        )}
                                    </styled.td>
                                    <styled.td {...cell}>
                                        <AppLink to={`/survey/${survey.slug}`} unstyled textDecoration="underline">
                                            /survey/{survey.slug}
                                        </AppLink>{' '}
                                        (
                                        <AppLink
                                            to={`/admin/qr-codes?url=${encodeURIComponent(`/survey/${survey.slug}`)}`}
                                            unstyled
                                            textDecoration="underline"
                                        >
                                            QR code
                                        </AppLink>
                                        )
                                    </styled.td>
                                    <styled.td {...cell}>{STATUS_LABEL[survey.status]}</styled.td>
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {survey.opens}
                                    </styled.td>
                                    <styled.td {...cell} whiteSpace="nowrap">
                                        {survey.closes}
                                    </styled.td>
                                    <styled.td {...cell} textAlign="right">
                                        {survey.responses}
                                    </styled.td>
                                </tr>
                            ))}
                        </tbody>
                    </styled.table>
                ) : (
                    <p>
                        No surveys are configured. Add one to <code>surveys</code> in the conference manifest.
                    </p>
                )}
            </AdminCard>

            {selected ? (
                <>
                    <AdminCard>
                        <Flex gap="4" flexWrap="wrap" alignItems="baseline" justifyContent="space-between" mb="3">
                            <styled.h2 fontSize="xl" fontWeight="semibold">
                                {selected.title} — summary ({selected.rows.length}{' '}
                                {selected.rows.length === 1 ? 'response' : 'responses'})
                            </styled.h2>
                            <AppLink
                                to={`/admin/surveys/export?slug=${selected.slug}`}
                                download
                                unstyled
                                textDecoration="underline"
                                fontSize="sm"
                            >
                                Download as Excel (.xlsx)
                            </AppLink>
                        </Flex>
                        <Flex direction="column" gap="6">
                            {selected.questions.map((question) => (
                                <Box key={question.id}>
                                    <styled.h3 fontWeight="semibold" mb="1">
                                        {question.label}
                                    </styled.h3>
                                    <Tally tally={question.tally} />
                                </Box>
                            ))}
                        </Flex>
                    </AdminCard>

                    <AdminCard>
                        <styled.h2 fontSize="xl" fontWeight="semibold" mb="3">
                            Every response
                        </styled.h2>
                        {selected.rows.length ? (
                            <Box overflowX="auto">
                                <styled.table width="full" fontSize="sm">
                                    <thead>
                                        <tr>
                                            {selected.questions.map((question) => (
                                                <styled.th key={question.id} {...cell} textAlign="left">
                                                    {question.label}
                                                </styled.th>
                                            ))}
                                            <styled.th {...cell} textAlign="left">
                                                Email
                                            </styled.th>
                                            <styled.th {...cell} textAlign="left">
                                                Submitted
                                            </styled.th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selected.rows.map((row) => (
                                            <tr key={row.id}>
                                                {row.cells.map((value, index) => (
                                                    <styled.td key={index} {...cell} whiteSpace="pre-wrap">
                                                        {value}
                                                    </styled.td>
                                                ))}
                                                <styled.td {...cell}>{row.email ?? ''}</styled.td>
                                                <styled.td {...cell} whiteSpace="nowrap">
                                                    {row.submitted}
                                                </styled.td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </styled.table>
                            </Box>
                        ) : (
                            <p>No responses yet.</p>
                        )}
                    </AdminCard>
                </>
            ) : null}
        </AdminLayout>
    )
}

type Tally = NonNullable<NonNullable<ReturnType<typeof useLoaderData<typeof loader>>['selected']>['questions'][number]['tally']>

function Tally({ tally }: { tally: Tally }) {
    if (!tally.answered) return <styled.p color="admin.600">No answers yet.</styled.p>

    if (tally.kind === 'scale') {
        return (
            <p>
                Average <strong>{tally.average}</strong> out of 5 from {tally.answered}. 1–5:{' '}
                {tally.distribution.join(' / ')}
            </p>
        )
    }

    if (tally.kind === 'text') {
        return (
            <styled.ul listStyleType="disc" pl="5">
                {tally.answers.map((answer, index) => (
                    <styled.li key={index} whiteSpace="pre-wrap">
                        {answer}
                    </styled.li>
                ))}
            </styled.ul>
        )
    }

    const max = Math.max(1, ...tally.counts.map(({ count }) => count))
    return (
        <>
            <styled.p fontSize="sm" color="admin.600" mb="2">
                {tally.answered} answered
            </styled.p>
            <styled.table fontSize="sm">
                <tbody>
                    {tally.counts.map(({ option, count }) => (
                        <tr key={option}>
                            <styled.td pr="3" py="0.5">
                                {option}
                            </styled.td>
                            <styled.td pr="2" py="0.5" textAlign="right">
                                {count}
                            </styled.td>
                            <styled.td py="0.5" w="40">
                                {/* Decorative: the count beside it carries the number. */}
                                <Box aria-hidden="true" h="2" bg="admin.400" rounded="sm" style={{ width: `${(count / max) * 100}%` }} />
                            </styled.td>
                        </tr>
                    ))}
                </tbody>
            </styled.table>
            {tally.others.length ? (
                <styled.p fontSize="sm" mt="2">
                    <strong>Other:</strong> {tally.others.join(' · ')}
                </styled.p>
            ) : null}
        </>
    )
}
