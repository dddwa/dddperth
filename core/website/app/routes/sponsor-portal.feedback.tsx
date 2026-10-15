import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { useEffect, useRef } from 'react'
import { data, Form, redirect, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AppLink } from '~/components/app-link'
import { FieldError, fieldLabelClass, inputClass, PrimaryButton, textareaClass } from '~/components/portal-form'
import { requireSponsorContact } from '~/lib/auth.server'
import { parseFormData } from '~/lib/forms/parse-form.server'
import type { SponsorFeedback } from '~/lib/services/sponsor-feedback-store'
import { sponsorFeedbackSchema, toSponsorFeedbackInput } from '~/lib/sponsors/feedback'
import { logSponsorPortalEvent } from '~/lib/sponsors/log.server'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/sponsor-portal.feedback'

function portalYear(): string {
    const year = conferenceManifest.sponsorPortal?.year
    if (!year) throw new Response('Not Found', { status: 404 })
    return year
}

export async function loader({ request, context }: Route.LoaderArgs) {
    const { sponsor } = await requireSponsorContact(request, context)
    const year = portalYear()
    const submissions = await getServices(context).sponsorFeedback.listForSponsor(year, sponsor.issueKey)

    const params = new URL(request.url).searchParams
    const editing = submissions.find((submission) => submission.id === params.get('edit')) ?? null

    return {
        year,
        conferenceName: conferenceManifest.public.name,
        submissions,
        editing,
        savedId: params.get('saved'),
    }
}

export async function action({ request, context }: Route.ActionArgs) {
    const { user, sponsor } = await requireSponsorContact(request, context)
    const year = portalYear()
    const store = getServices(context).sponsorFeedback

    const formData = await request.formData()
    const parsed = parseFormData(sponsorFeedbackSchema, formData)
    if (!parsed.ok) {
        logSponsorPortalEvent({
            event: 'portal.save_rejected',
            issueKey: sponsor.issueKey,
            form: 'feedback',
            fields: Object.keys(parsed.fieldErrors),
        })
        return data({ fieldErrors: parsed.fieldErrors }, { status: 400 })
    }

    const input = toSponsorFeedbackInput(parsed.data)
    const id = formData.get('id')
    if (typeof id === 'string' && id) {
        if (!(await store.update(sponsor.issueKey, id, input, user.email))) {
            throw new Response('Not Found', { status: 404 })
        }
        return redirect(`/sponsor-portal/feedback?saved=${encodeURIComponent(id)}`)
    }

    const newId = await store.create(year, sponsor.issueKey, input, user.email)
    return redirect(`/sponsor-portal/feedback?saved=${encodeURIComponent(newId)}`)
}

function formatDate(unixSeconds: number): string {
    return DateTime.fromSeconds(unixSeconds, { zone: conferenceManifest.public.timezone }).toLocaleString(
        DateTime.DATE_MED,
        { locale: 'en-AU' },
    )
}

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const

export default function PortalFeedback() {
    const { year, conferenceName, submissions, editing, savedId } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const isSubmitting = navigation.state === 'submitting'
    const fieldErrors: Record<string, string> = actionData?.fieldErrors ?? {}

    return (
        <Box maxW="4xl" mx="auto">
            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Your feedback
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600">
                    Tell us how sponsoring {conferenceName} {year} went for you. Everyone with access to this workspace
                    can see and edit what's submitted here, and you can add more feedback as often as you like.
                </styled.p>

                {savedId && (
                    <Box
                        role="status"
                        mt="4"
                        p="4"
                        bg="status.success.bg"
                        borderRadius="md"
                        fontSize="sm"
                        color="status.success.fg"
                    >
                        <styled.p fontWeight="medium">Thank you — your feedback is saved.</styled.p>
                        <styled.p mt="1">You can edit it below, or add more any time.</styled.p>
                    </Box>
                )}
            </AdminCard>

            {submissions.map((submission, index) => (
                <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    number={index + 1}
                    beingEdited={editing?.id === submission.id}
                />
            ))}

            {/* Keyed on the save too: the redirect after a save reuses this
                component, so without a remount the "add more" form would still
                hold the answers just sent, one click from a duplicate. */}
            <FeedbackForm
                key={`${editing?.id ?? 'new'}:${savedId ?? ''}`}
                editing={editing}
                hasSubmissions={submissions.length > 0}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                conferenceName={conferenceName}
            />
        </Box>
    )
}

function SubmissionCard({
    submission,
    number,
    beingEdited,
}: {
    submission: SponsorFeedback
    number: number
    beingEdited: boolean
}) {
    const edited = submission.updatedAt !== submission.createdAt
    return (
        <AdminCard>
            <Flex justify="space-between" align="flex-start" gap="4" flexWrap="wrap" mb="4">
                <Box>
                    <styled.h3 fontSize="lg" fontWeight="semibold" color="admin.900">
                        Feedback {number}
                    </styled.h3>
                    <styled.p fontSize="xs" color="admin.600">
                        From {submission.submittedBy} on {formatDate(submission.createdAt)}
                        {edited && ` · edited by ${submission.updatedBy} on ${formatDate(submission.updatedAt)}`}
                    </styled.p>
                </Box>
                {beingEdited ? (
                    <styled.span fontSize="sm" color="admin.600">
                        Editing below
                    </styled.span>
                ) : (
                    <AppLink
                        unstyled
                        to={`/sponsor-portal/feedback?edit=${encodeURIComponent(submission.id)}#feedback-form`}
                        fontSize="sm"
                        color="admin.900"
                        textDecoration="underline"
                        aria-label={`Edit feedback ${number}`}
                    >
                        Edit
                    </AppLink>
                )}
            </Flex>
            <styled.dl display="grid" gap="3" fontSize="sm">
                {submission.rating !== null && (
                    <Answer label="Overall experience">
                        {submission.rating} / 5 — {RATING_LABELS[submission.rating - 1]}
                    </Answer>
                )}
                {submission.experience && <Answer label="Your experience">{submission.experience}</Answer>}
                {submission.ideas && <Answer label="Ideas for next time">{submission.ideas}</Answer>}
                {submission.testimonial && (
                    <Answer label="Testimonial">
                        “{submission.testimonial}”
                        {submission.testimonialAttribution && ` — ${submission.testimonialAttribution}`}
                    </Answer>
                )}
                {submission.portalFeedback && <Answer label="The sponsor portal">{submission.portalFeedback}</Answer>}
            </styled.dl>
        </AdminCard>
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

function FeedbackForm({
    editing,
    hasSubmissions,
    fieldErrors,
    isSubmitting,
    conferenceName,
}: {
    editing: SponsorFeedback | null
    hasSubmissions: boolean
    fieldErrors: Record<string, string>
    isSubmitting: boolean
    conferenceName: string
}) {
    const formErrorRef = useRef<HTMLDivElement>(null)
    const formError = fieldErrors._form

    // A save with nothing filled in has no field to put the error beside, so
    // the summary takes focus — otherwise a screen reader hears nothing.
    useEffect(() => {
        if (formError) formErrorRef.current?.focus()
    }, [formError])

    const heading = editing ? 'Edit your feedback' : hasSubmissions ? 'Add more feedback' : 'Share your feedback'

    return (
        <AdminCard>
            <styled.h3 id="feedback-form" fontSize="lg" fontWeight="semibold" color="admin.900" mb="2">
                {heading}
            </styled.h3>
            <styled.p fontSize="sm" color="admin.600" mb="6">
                Every question is optional — answer as many as you like.
            </styled.p>

            {formError && (
                <Box
                    ref={formErrorRef}
                    tabIndex={-1}
                    role="alert"
                    mb="4"
                    p="3"
                    bg="status.danger.bg"
                    borderRadius="md"
                    fontSize="sm"
                    color="status.danger.fg"
                >
                    {formError}
                </Box>
            )}

            <Form method="post">
                {editing && <input type="hidden" name="id" value={editing.id} />}

                <styled.fieldset mb="6" border="none" p="0" m="0">
                    <styled.legend className={fieldLabelClass} mb="2">
                        Overall, how was sponsoring {conferenceName}?
                    </styled.legend>
                    <Flex gap="2" flexWrap="wrap">
                        {RATING_LABELS.map((label, index) => {
                            const value = index + 1
                            return (
                                <styled.label
                                    key={value}
                                    display="inline-flex"
                                    alignItems="center"
                                    gap="2"
                                    py="2"
                                    px="3"
                                    border="[1px solid]"
                                    borderColor="admin.400"
                                    borderRadius="md"
                                    fontSize="sm"
                                    color="admin.900"
                                    cursor="pointer"
                                    _hover={{ bg: 'admin.100' }}
                                    _focusWithin={{ boxShadow: 'focus-ring' }}
                                >
                                    <input
                                        type="radio"
                                        name="rating"
                                        value={value}
                                        defaultChecked={editing?.rating === value}
                                    />
                                    {value} — {label}
                                </styled.label>
                            )
                        })}
                    </Flex>
                    <FieldError message={fieldErrors.rating} />
                </styled.fieldset>

                <TextArea
                    name="experience"
                    label="How was your experience as a sponsor?"
                    hint="What worked well and what didn't — in the lead-up, on the day and afterwards."
                    defaultValue={editing?.experience}
                    error={fieldErrors.experience}
                />
                <TextArea
                    name="ideas"
                    label="What would make sponsoring more valuable for you?"
                    hint="Ideas for next year: things we could add, change or drop."
                    defaultValue={editing?.ideas}
                    error={fieldErrors.ideas}
                />

                <styled.fieldset mb="6" border="none" p="0" m="0">
                    <styled.legend fontSize="md" fontWeight="semibold" color="admin.900" mb="3">
                        Quote or testimonial
                    </styled.legend>
                    <TextArea
                        name="testimonial"
                        label="In a sentence or two, what did sponsoring do for you?"
                        hint="We may use it on our website, socials or when we approach sponsors next year."
                        defaultValue={editing?.testimonial}
                        error={fieldErrors.testimonial}
                    />
                    <Box mb="4">
                        <label htmlFor="testimonialAttribution" className={fieldLabelClass}>
                            Name and role to show with the quote
                        </label>
                        <input
                            id="testimonialAttribution"
                            name="testimonialAttribution"
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Sam Lee, Head of Engineering"
                            defaultValue={editing?.testimonialAttribution ?? ''}
                            aria-invalid={fieldErrors.testimonialAttribution ? true : undefined}
                            aria-describedby={
                                fieldErrors.testimonialAttribution ? 'testimonialAttribution-error' : undefined
                            }
                            className={inputClass}
                        />
                        <FieldError id="testimonialAttribution-error" message={fieldErrors.testimonialAttribution} />
                    </Box>
                </styled.fieldset>

                <TextArea
                    name="portalFeedback"
                    label="Sponsor portal feedback"
                    hint="The portal was a work in progress this year. We plan to fully adopt it next year, so your feedback on what was good will be helpful."
                    defaultValue={editing?.portalFeedback}
                    error={fieldErrors.portalFeedback}
                />

                <Flex mt="8" justify="flex-end" align="center" gap="4" flexWrap="wrap">
                    {editing && (
                        <AppLink
                            unstyled
                            to="/sponsor-portal/feedback"
                            fontSize="sm"
                            color="admin.900"
                            textDecoration="underline"
                        >
                            Cancel
                        </AppLink>
                    )}
                    <PrimaryButton disabled={isSubmitting}>
                        {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Submit feedback'}
                    </PrimaryButton>
                </Flex>
            </Form>
        </AdminCard>
    )
}

function TextArea({
    name,
    label,
    hint,
    defaultValue,
    error,
}: {
    name: string
    label: string
    hint: string
    defaultValue: string | null | undefined
    error: string | undefined
}) {
    const hintId = `${name}-hint`
    const errorId = `${name}-error`
    return (
        <Box mb="6">
            <label htmlFor={name} className={fieldLabelClass}>
                {label}
            </label>
            <styled.p id={hintId} fontSize="xs" color="admin.600" mt="0.5">
                {hint}
            </styled.p>
            <textarea
                id={name}
                name={name}
                rows={4}
                defaultValue={defaultValue ?? ''}
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                aria-invalid={error ? true : undefined}
                className={textareaClass}
            />
            <FieldError id={errorId} message={error} />
        </Box>
    )
}
