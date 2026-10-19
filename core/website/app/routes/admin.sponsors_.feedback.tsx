import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useEffect, useRef } from 'react'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { recordException } from '~/lib/record-exception'
import {
    feedbackRequestEmail,
    planFeedbackRequests,
    type FeedbackRequestPlan,
    type PlannedFeedbackRequest,
} from '~/lib/sponsors/feedback'
import { getServices } from '~/remix-app-load-context'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.sponsors_.feedback'

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.sponsorPortal
    if (!portalConfig) return data({ configured: false as const })

    const [sponsors, requests, feedback] = await Promise.all([
        services.sponsors.listSponsors(portalConfig.year),
        services.sponsorFeedback.listRequests(portalConfig.year),
        services.sponsorFeedback.listForYear(portalConfig.year),
    ])

    const companyNames = new Map(sponsors.map((sponsor) => [sponsor.issueKey, sponsor.companyName]))

    return data({
        configured: true as const,
        year: portalConfig.year,
        adminEmail: user.email,
        canSendEmail: services.email.canSend(),
        sponsors: sponsors
            .filter((sponsor) => sponsor.active)
            .sort((a, b) => a.companyName.localeCompare(b.companyName))
            .map((sponsor) => ({
                issueKey: sponsor.issueKey,
                companyName: sponsor.companyName,
                tier: sponsor.tier,
                contacts: sponsor.contacts,
                // Newest first, so the first match is the latest request.
                lastRequest: requests.find((r) => r.issueKey === sponsor.issueKey) ?? null,
                feedbackCount: feedback.filter((f) => f.issueKey === sponsor.issueKey).length,
            })),
        feedback: feedback.map((entry) => ({
            ...entry,
            companyName: companyNames.get(entry.issueKey) ?? entry.issueKey,
        })),
    })
}

/** Reads the request form: ticked sponsors, and a `to_<issueKey>` field each. */
async function planFromForm(formData: FormData, year: string, services: ReturnType<typeof getServices>) {
    const sponsors = (await services.sponsors.listSponsors(year)).filter((sponsor) => sponsor.active)
    const selected = formData.getAll('selected').filter((value): value is string => typeof value === 'string')
    const recipientsByIssueKey: Record<string, string> = {}
    for (const issueKey of selected) {
        const value = formData.get(`to_${issueKey}`)
        recipientsByIssueKey[issueKey] = typeof value === 'string' ? value : ''
    }
    return planFeedbackRequests({ sponsors, selected, recipientsByIssueKey })
}

export async function action({ request, context }: Route.ActionArgs) {
    const user = await requireAdmin(request, context)
    const services = getServices(context)

    const portalConfig = conferenceManifest.sponsorPortal
    if (!portalConfig)
        return data({ intent: 'error' as const, error: 'Sponsor portal not configured' }, { status: 400 })

    const formData = await request.formData()
    const intent = formData.get('_action')
    const emailVars = {
        conferenceName: conferenceManifest.public.name,
        year: portalConfig.year,
        feedbackUrl: `${new URL(request.url).origin}/sponsor-portal/feedback`,
        senderName: user.name || undefined,
    }
    const replyTo = conferenceManifest.brand.sponsorshipEmail

    if (intent === 'test') {
        const email = feedbackRequestEmail({ ...emailVars, companyName: 'Example Sponsor' })
        await services.email.send({ to: user.email, replyTo, ...email, subject: `[Test] ${email.subject}` })
        return data({ intent: 'test' as const, sentTo: user.email })
    }

    if (intent === 'preview') {
        const plan = await planFromForm(formData, portalConfig.year, services)
        if (plan.requests.length === 0 && plan.errors.length === 0) {
            return data({ intent: 'error' as const, error: 'Tick at least one sponsor to send to.' }, { status: 400 })
        }
        return data({ intent: 'preview' as const, plan })
    }

    if (intent === 'send') {
        // Re-planned from the confirmation form's hidden fields, so what goes
        // out is exactly the list the admin confirmed — and an address that
        // was valid at preview is still checked against the sponsors now.
        const plan = await planFromForm(formData, portalConfig.year, services)
        if (plan.errors.length > 0) return data({ intent: 'preview' as const, plan }, { status: 400 })

        const sent: string[] = []
        const failed: string[] = []
        for (const planned of plan.requests) {
            try {
                await services.email.send({
                    to: planned.recipients,
                    replyTo,
                    ...feedbackRequestEmail({ ...emailVars, companyName: planned.companyName }),
                })
                await services.sponsorFeedback.recordRequest(
                    portalConfig.year,
                    planned.issueKey,
                    planned.recipients,
                    user.email,
                )
                sent.push(planned.companyName)
            } catch (error) {
                // One rejected address shouldn't stop the rest of the batch.
                recordException(error)
                failed.push(planned.companyName)
            }
        }
        return data({ intent: 'sent' as const, sent, failed })
    }

    return data({ intent: 'error' as const, error: 'Unknown action' }, { status: 400 })
}

function formatDate(unixSeconds: number): string {
    return DateTime.fromSeconds(unixSeconds, { zone: conferenceManifest.public.timezone }).toLocaleString(
        { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' },
        { locale: 'en-AU' },
    )
}

const cell = { py: '3', pr: '4', verticalAlign: 'top' } as const

const recipientsClass = css({
    w: 'full',
    minW: '64',
    px: '2',
    py: '1.5',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.400',
    borderRadius: 'md',
    fontSize: 'sm',
    bg: 'white',
    color: 'admin.900',
    resize: 'vertical',
    _focus: { outline: 'none', borderColor: 'indigo.7', boxShadow: 'focus-ring' },
})

function Muted({ children }: { children: React.ReactNode }) {
    return (
        <styled.span color="admin.600" fontSize="xs">
            {children}
        </styled.span>
    )
}

const noticeClass = {
    success: css({ bg: 'status.success.bg', color: 'status.success.fg' }),
    warning: css({ bg: 'status.warning.bg', color: 'status.warning.fg' }),
    danger: css({ bg: 'status.danger.bg', color: 'status.danger.fg' }),
} as const

function Notice({ tone, children }: { tone: keyof typeof noticeClass; children: React.ReactNode }) {
    return (
        <Box
            role={tone === 'danger' ? 'alert' : 'status'}
            className={noticeClass[tone]}
            mb="4"
            p="3"
            borderRadius="md"
            fontSize="sm"
        >
            {children}
        </Box>
    )
}

export default function AdminSponsorFeedback() {
    const loaderData = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const busy = navigation.state === 'submitting'

    if (!loaderData.configured) {
        return (
            <AdminLayout heading="Sponsor feedback">
                <AdminCard>
                    <styled.p fontSize="sm" color="admin.700">
                        The sponsor portal isn't configured for this conference.
                    </styled.p>
                </AdminCard>
            </AdminLayout>
        )
    }

    const { year, sponsors, feedback, adminEmail, canSendEmail } = loaderData
    const plan = actionData?.intent === 'preview' ? actionData.plan : null
    const responded = sponsors.filter((sponsor) => sponsor.feedbackCount > 0).length
    const asked = sponsors.filter((sponsor) => sponsor.lastRequest).length
    const ratings = feedback.map((entry) => entry.rating).filter((rating) => rating !== null)

    return (
        <AdminLayout heading={`Sponsor feedback (${year})`} fullWidth>
            <styled.p fontSize="sm" color="admin.600" mb="6">
                <AppLink unstyled to="/admin/sponsors" textDecoration="underline">
                    ← Back to sponsors
                </AppLink>
            </styled.p>

            <AdminCard>
                <Flex gap="4" flexWrap="wrap">
                    <Stat label="Sponsors asked" value={`${asked} of ${sponsors.length}`} />
                    <Stat label="Sponsors who replied" value={`${responded} of ${sponsors.length}`} />
                    <Stat label="Responses" value={String(feedback.length)} />
                    <Stat
                        label="Average rating"
                        value={
                            ratings.length > 0
                                ? `${(ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)} / 5`
                                : '—'
                        }
                    />
                </Flex>
            </AdminCard>

            <AdminCard>
                <Flex justify="space-between" align="flex-start" gap="4" flexWrap="wrap" mb="2">
                    <styled.h2 fontSize="xl" fontWeight="semibold">
                        Request feedback
                    </styled.h2>
                    <Form method="post">
                        <input type="hidden" name="_action" value="test" />
                        <Button
                            type="submit"
                            variant="outline"
                            color="admin.900"
                            borderColor="admin.400"
                            bg="white"
                            _hover={{ bg: 'admin.100' }}
                            disabled={busy}
                        >
                            Send a test to {adminEmail}
                        </Button>
                    </Form>
                </Flex>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    Tick the sponsors to ask and check who each email goes to. Each sponsor gets one email with every
                    address in the To: line, linking to the feedback page in their portal. Replies go to{' '}
                    {conferenceManifest.brand.sponsorshipEmail}. You'll confirm the list before anything is sent.
                </styled.p>

                {!canSendEmail && (
                    <Notice tone="warning">
                        No email provider is configured in this environment, so emails are printed to the server log
                        instead of being sent.
                    </Notice>
                )}
                {actionData?.intent === 'error' && <Notice tone="danger">{actionData.error}</Notice>}
                {actionData?.intent === 'test' && (
                    <Notice tone="success">Test email sent to {actionData.sentTo}.</Notice>
                )}
                {actionData?.intent === 'sent' && (
                    <>
                        {actionData.sent.length > 0 && (
                            <Notice tone="success">
                                Sent to {actionData.sent.length} sponsor{actionData.sent.length === 1 ? '' : 's'}:{' '}
                                {actionData.sent.join(', ')}.
                            </Notice>
                        )}
                        {actionData.failed.length > 0 && (
                            <Notice tone="danger">
                                Couldn't send to {actionData.failed.join(', ')}. Check the addresses and try again.
                            </Notice>
                        )}
                    </>
                )}

                {plan && <ConfirmSend plan={plan} busy={busy} />}

                {/* Keyed on the latest sends so the ticks reset to "not yet
                    asked" after a send, instead of re-offering who was just emailed. */}
                <Form method="post" key={sponsors.map((sponsor) => sponsor.lastRequest?.sentAt ?? 0).join()}>
                    <input type="hidden" name="_action" value="preview" />
                    <Box overflowX="auto">
                        <styled.table w="full" fontSize="sm">
                            <styled.thead>
                                <styled.tr textAlign="left" color="admin.600" borderBottom="admin-subtle">
                                    <styled.th {...cell}>Send</styled.th>
                                    <styled.th {...cell}>Sponsor</styled.th>
                                    <styled.th {...cell}>To</styled.th>
                                    <styled.th {...cell}>Last asked</styled.th>
                                    <styled.th {...cell}>Feedback</styled.th>
                                </styled.tr>
                            </styled.thead>
                            <styled.tbody>
                                {sponsors.map((sponsor) => (
                                    <styled.tr key={sponsor.issueKey} borderBottom="admin-subtle" color="admin.900">
                                        <styled.td {...cell}>
                                            <input
                                                type="checkbox"
                                                name="selected"
                                                value={sponsor.issueKey}
                                                aria-label={`Send to ${sponsor.companyName}`}
                                                // Default to whoever hasn't been asked or replied yet.
                                                defaultChecked={!sponsor.lastRequest && sponsor.feedbackCount === 0}
                                            />
                                        </styled.td>
                                        <styled.td {...cell}>
                                            <styled.span fontWeight="medium">{sponsor.companyName}</styled.span>
                                            <Box>
                                                <Muted>
                                                    {sponsor.tier} · {sponsor.issueKey}
                                                </Muted>
                                            </Box>
                                        </styled.td>
                                        <styled.td {...cell}>
                                            <textarea
                                                name={`to_${sponsor.issueKey}`}
                                                aria-label={`Email addresses for ${sponsor.companyName}`}
                                                rows={Math.max(1, sponsor.contacts.length)}
                                                defaultValue={sponsor.contacts.join(',\n')}
                                                className={recipientsClass}
                                            />
                                        </styled.td>
                                        <styled.td {...cell}>
                                            {sponsor.lastRequest ? (
                                                <Box>
                                                    <Box>{formatDate(sponsor.lastRequest.sentAt)}</Box>
                                                    <Muted>{sponsor.lastRequest.recipients.join(', ')}</Muted>
                                                </Box>
                                            ) : (
                                                <Muted>Not yet</Muted>
                                            )}
                                        </styled.td>
                                        <styled.td {...cell}>
                                            {sponsor.feedbackCount > 0 ? (
                                                <AppLink
                                                    unstyled
                                                    to={`#feedback-${sponsor.issueKey}`}
                                                    textDecoration="underline"
                                                >
                                                    {sponsor.feedbackCount} response
                                                    {sponsor.feedbackCount === 1 ? '' : 's'}
                                                </AppLink>
                                            ) : (
                                                <Muted>None yet</Muted>
                                            )}
                                        </styled.td>
                                    </styled.tr>
                                ))}
                            </styled.tbody>
                        </styled.table>
                    </Box>
                    <Flex mt="4" justify="flex-end">
                        <Button type="submit" disabled={busy || sponsors.length === 0}>
                            Review emails
                        </Button>
                    </Flex>
                </Form>
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Feedback received
                </styled.h2>
                {feedback.length === 0 ? (
                    <styled.p fontSize="sm" color="admin.600">
                        No feedback yet.
                    </styled.p>
                ) : (
                    <Flex direction="column" gap="4">
                        {feedback.map((entry, index) => (
                            <Box
                                key={entry.id}
                                // Anchor the first response per sponsor for the table's link.
                                id={
                                    feedback.findIndex((other) => other.issueKey === entry.issueKey) === index
                                        ? `feedback-${entry.issueKey}`
                                        : undefined
                                }
                                p="4"
                                border="admin-subtle"
                                borderRadius="md"
                                fontSize="sm"
                            >
                                <Flex justify="space-between" gap="4" flexWrap="wrap" mb="3">
                                    <styled.h3 fontWeight="semibold" fontSize="md" color="admin.900">
                                        {entry.companyName}
                                    </styled.h3>
                                    <Muted>
                                        {entry.submittedBy}, {formatDate(entry.createdAt)}
                                        {entry.updatedAt !== entry.createdAt &&
                                            ` · edited by ${entry.updatedBy}, ${formatDate(entry.updatedAt)}`}
                                    </Muted>
                                </Flex>
                                <styled.dl display="grid" gap="3">
                                    {entry.rating !== null && (
                                        <Answer label="Overall">
                                            {entry.rating} / 5 — {RATING_LABELS[entry.rating - 1]}
                                        </Answer>
                                    )}
                                    {entry.experience && <Answer label="Experience">{entry.experience}</Answer>}
                                    {entry.ideas && <Answer label="Ideas">{entry.ideas}</Answer>}
                                    {entry.testimonial && (
                                        <Answer label="Testimonial">
                                            “{entry.testimonial}”
                                            {entry.testimonialAttribution && ` — ${entry.testimonialAttribution}`}
                                        </Answer>
                                    )}
                                    {entry.portalFeedback && (
                                        <Answer label="Sponsor portal">{entry.portalFeedback}</Answer>
                                    )}
                                </styled.dl>
                            </Box>
                        ))}
                    </Flex>
                )}
            </AdminCard>
        </AdminLayout>
    )
}

/**
 * The "are you sure" step: every email that will go out, with each address.
 * Its own form with the confirmed list in hidden fields, so editing the table
 * afterwards can't change what this button sends.
 */
function ConfirmSend({ plan, busy }: { plan: FeedbackRequestPlan; busy: boolean }) {
    const headingRef = useRef<HTMLHeadingElement>(null)

    // The review appears above the button that asked for it; move focus there
    // so keyboard and screen reader users land on it.
    useEffect(() => {
        headingRef.current?.focus()
    }, [plan])

    const blocked = plan.errors.length > 0

    return (
        <Box mb="6" p="4" border="admin-subtle" borderRadius="md" bg="admin.50">
            <styled.h3 ref={headingRef} tabIndex={-1} fontSize="lg" fontWeight="semibold" mb="3" outline="none">
                {blocked
                    ? 'Fix these before sending'
                    : `Send ${plan.requests.length} email${plan.requests.length === 1 ? '' : 's'}?`}
            </styled.h3>

            {blocked && (
                <styled.ul mb="4" pl="5" listStyleType="disc" fontSize="sm" color="status.danger.fg">
                    {plan.errors.map((error) => (
                        <li key={error.issueKey}>
                            {error.companyName}: {error.message}
                        </li>
                    ))}
                </styled.ul>
            )}

            <styled.ul display="grid" gap="2" mb="4" fontSize="sm">
                {plan.requests.map((request) => (
                    <PlannedRow key={request.issueKey} request={request} />
                ))}
            </styled.ul>

            {!blocked && (
                <Form method="post">
                    <input type="hidden" name="_action" value="send" />
                    {plan.requests.map((request) => (
                        <span key={request.issueKey}>
                            <input type="hidden" name="selected" value={request.issueKey} />
                            <input type="hidden" name={`to_${request.issueKey}`} value={request.recipients.join(',')} />
                        </span>
                    ))}
                    <Button type="submit" disabled={busy}>
                        {busy
                            ? 'Sending…'
                            : `Send ${plan.requests.length} email${plan.requests.length === 1 ? '' : 's'}`}
                    </Button>
                </Form>
            )}
            <styled.p mt="3" fontSize="xs" color="admin.600">
                To change anything, edit the table below and review again.
            </styled.p>
        </Box>
    )
}

function PlannedRow({ request }: { request: PlannedFeedbackRequest }) {
    return (
        <li>
            <styled.span fontWeight="medium">{request.companyName}</styled.span> — To: {request.recipients.join(', ')}
            {request.notContacts.length > 0 && (
                <styled.span display="block" color="status.warning.fg">
                    Not a portal contact, so can't sign in to answer until added to the sponsor in Jira:{' '}
                    {request.notContacts.join(', ')}
                </styled.span>
            )}
        </li>
    )
}

function Answer({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box>
            <styled.dt fontWeight="medium" color="admin.700">
                {label}
            </styled.dt>
            <styled.dd mt="0.5" color="admin.900" whiteSpace="pre-wrap">
                {children}
            </styled.dd>
        </Box>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <Box p="3" borderRadius="md" bg="admin.100" minW="40">
            <styled.p fontSize="lg" fontWeight="semibold" color="admin.900">
                {value}
            </styled.p>
            <styled.p fontSize="xs" color="admin.600">
                {label}
            </styled.p>
        </Box>
    )
}
