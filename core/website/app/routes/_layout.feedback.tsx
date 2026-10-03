import { conferenceManifest } from '@conference/manifest'
import { useEffect, useId, useRef, useState } from 'react'
import {
    data,
    Form,
    useActionData,
    useLoaderData,
    useNavigation,
    useSearchParams,
    type ShouldRevalidateFunctionArgs,
} from 'react-router'
import { AppLink } from '~/components/app-link'
import { PageLayout } from '~/components/page-layout'
import { Button } from '~/components/ui/button'
import { readFeedbackBrowserId, writeFeedbackCookie } from '~/lib/feedback/feedback-cookie.server'
import {
    conferenceFeedbackSchema,
    HONEYPOT_FIELD,
    looksLikeSpam,
    STARTED_AT_FIELD,
    talkFeedbackSchema,
} from '~/lib/feedback/feedback-submission'
import type { FeedbackTarget } from '~/lib/feedback/feedback-targets'
import { getFeedbackTargets } from '~/lib/feedback/feedback-targets.server'
import { parseFormData } from '~/lib/forms/parse-form.server'
import { noIndexMeta } from '~/lib/seo'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.feedback'

type FeedbackKind = 'conference' | 'talk'

const ALREADY_REVIEWED = 'You have already submitted feedback for this session.'

export async function loader({ request, context }: Route.LoaderArgs) {
    const state = getConferenceState(context)
    const year = state.conference.year
    if (state.feedback !== 'open') {
        return data({ open: false as const, year }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const browserId = readFeedbackBrowserId(request)
    const [targets, reviewedIds] = await Promise.all([
        getFeedbackTargets(context, year, 'public'),
        browserId ? getServices(context).feedback.listTalkFeedbackTargetIds(year, browserId) : Promise.resolve([]),
    ])

    return data(
        {
            open: true as const,
            year,
            targets,
            /** Talks this browser has already reviewed, so the form can say so. */
            reviewedIds,
            // Rendered into the form for the minimum-fill-time check, so the page can't be cached.
            startedAt: Date.now(),
        },
        { headers: { 'Cache-Control': 'no-store' } },
    )
}

export async function action({ request, context }: Route.ActionArgs) {
    const state = getConferenceState(context)
    if (state.feedback !== 'open') {
        return data({ ok: false as const, fieldErrors: { _form: 'Feedback is closed.' } }, { status: 403 })
    }
    const year = state.conference.year

    const formData = await request.formData()
    const kind: FeedbackKind = formData.get('kind') === 'talk' ? 'talk' : 'conference'

    if (looksLikeSpam(formData, Date.now())) {
        return data({ ok: true as const, kind })
    }

    const existingId = readFeedbackBrowserId(request)
    const browserId = existingId ?? crypto.randomUUID()
    const headers = existingId ? undefined : { 'Set-Cookie': writeFeedbackCookie(browserId) }
    const services = getServices(context)

    if (kind === 'conference') {
        const parsed = parseFormData(conferenceFeedbackSchema, formData)
        if (!parsed.ok) return data({ ok: false as const, fieldErrors: parsed.fieldErrors }, { status: 400 })
        await services.feedback.saveConferenceFeedback(year, browserId, parsed.data)
        return data({ ok: true as const, kind }, { headers })
    }

    const parsed = parseFormData(talkFeedbackSchema, formData)
    if (!parsed.ok) return data({ ok: false as const, fieldErrors: parsed.fieldErrors }, { status: 400 })
    // Only ids on this year's agenda, so the table can't fill with junk ids.
    const targets = await getFeedbackTargets(context, year, 'public')
    if (!targets.some((target) => target.id === parsed.data.targetId)) {
        return data({ ok: false as const, fieldErrors: { targetId: 'Please choose a talk.' } }, { status: 400 })
    }
    if (!(await services.feedback.saveTalkFeedback(year, browserId, parsed.data))) {
        return data({ ok: false as const, fieldErrors: { targetId: ALREADY_REVIEWED } }, { status: 409, headers })
    }
    return data({ ok: true as const, kind }, { headers })
}

/**
 * Picking a talk or switching between conference and talk feedback only
 * rewrites the query string. Re-running the loader for that would refetch the
 * agenda and reset `startedAt`, so it's skipped unless something was submitted.
 */
export function shouldRevalidate({
    currentUrl,
    nextUrl,
    formMethod,
    defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
    if (!formMethod && currentUrl.pathname === nextUrl.pathname) return false
    return defaultShouldRevalidate
}

export const meta = () => [...noIndexMeta(), { title: `Feedback | ${conferenceManifest.public.name}` }]

export default function Feedback() {
    const loaderData = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [searchParams, setSearchParams] = useSearchParams()
    const thanksRef = useRef<HTMLDivElement>(null)
    const submitted = actionData?.ok === true

    // The form keeps its scroll position across submits (so an error stays in
    // view), which would leave the thank-you below the fold. Go back to the top,
    // and move focus there too: the submit button the focus was on has gone.
    useEffect(() => {
        if (!submitted) return
        window.scrollTo({ top: 0 })
        thanksRef.current?.focus({ preventScroll: true })
    }, [submitted, actionData])

    const talkId = searchParams.get('talk') ?? ''
    const typeParam = searchParams.get('type')
    const kind: FeedbackKind | undefined =
        typeParam === 'conference' || typeParam === 'talk' ? typeParam : talkId ? 'talk' : undefined

    const heading = (
        <styled.h1 fontSize="3xl" fontWeight="bold" mb="4">
            {conferenceManifest.public.name} {loaderData.year} feedback
        </styled.h1>
    )

    if (!loaderData.open) {
        return (
            <PageLayout>
                <Box maxW="2xl" mx="auto" w="full" py="8">
                    {heading}
                    <styled.p mb="4">
                        Feedback is open on the day of the conference and the day after. It&apos;s closed right now.
                    </styled.p>
                    <AppLink to="/" unstyled color="text.highlight" textDecoration="underline">
                        Back to the home page
                    </AppLink>
                </Box>
            </PageLayout>
        )
    }

    if (actionData?.ok) {
        return (
            <PageLayout>
                <Box maxW="2xl" mx="auto" w="full" py="8">
                    {heading}
                    <Box ref={thanksRef} tabIndex={-1} role="status" bg="surface.card" rounded="md" p="6">
                        <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                            Thanks for your feedback!
                        </styled.h2>
                        <styled.p mb="4">
                            {actionData.kind === 'talk'
                                ? 'It helps our speakers improve, and helps us pick next year’s agenda.'
                                : 'We read every response, and it shapes the next conference.'}
                        </styled.p>
                        <Flex gap="4" flexWrap="wrap">
                            <AppLink
                                to="/feedback?type=talk"
                                unstyled
                                color="text.highlight"
                                textDecoration="underline"
                            >
                                {actionData.kind === 'talk' ? 'Review another talk' : 'Give feedback on a talk'}
                            </AppLink>
                            {actionData.kind === 'talk' ? (
                                <AppLink
                                    to="/feedback?type=conference"
                                    unstyled
                                    color="text.highlight"
                                    textDecoration="underline"
                                >
                                    Give feedback on the conference
                                </AppLink>
                            ) : null}
                        </Flex>
                    </Box>
                </Box>
            </PageLayout>
        )
    }

    const fieldErrors = actionData && !actionData.ok ? actionData.fieldErrors : {}

    return (
        <PageLayout>
            <Box maxW="2xl" mx="auto" w="full" py="8">
                {heading}
                <styled.p mb="6" color="text.secondary">
                    Tell us what you thought of the day, or of a talk you saw. Everything except the rating is optional.
                </styled.p>

                <styled.fieldset mb="6">
                    <styled.legend fontWeight="semibold" mb="2">
                        What would you like to give feedback on?
                    </styled.legend>
                    <Flex gap="6" flexWrap="wrap">
                        {(
                            [
                                ['conference', 'The conference'],
                                ['talk', 'A talk or Meet the Experts session'],
                            ] as const
                        ).map(([value, label]) => (
                            <styled.label key={value} display="flex" alignItems="center" gap="2" cursor="pointer">
                                <styled.input
                                    type="radio"
                                    name="feedback-kind"
                                    value={value}
                                    checked={kind === value}
                                    onChange={() =>
                                        setSearchParams(
                                            value === 'talk' && talkId
                                                ? { type: value, talk: talkId }
                                                : { type: value },
                                            { replace: true, preventScrollReset: true },
                                        )
                                    }
                                    width="5"
                                    height="5"
                                    accentColor="brand.primary"
                                />
                                {label}
                            </styled.label>
                        ))}
                    </Flex>
                </styled.fieldset>

                {kind === 'conference' ? (
                    <ConferenceForm startedAt={loaderData.startedAt} fieldErrors={fieldErrors} />
                ) : kind === 'talk' ? (
                    <TalkForm
                        startedAt={loaderData.startedAt}
                        fieldErrors={fieldErrors}
                        targets={loaderData.targets}
                        reviewedIds={loaderData.reviewedIds}
                        talkId={talkId}
                        onTalkChange={(id) =>
                            setSearchParams(id ? { type: 'talk', talk: id } : { type: 'talk' }, {
                                replace: true,
                                preventScrollReset: true,
                            })
                        }
                    />
                ) : null}
            </Box>
        </PageLayout>
    )
}

type FieldErrors = Record<string, string>

function ConferenceForm({ startedAt, fieldErrors }: { startedAt: number; fieldErrors: FieldErrors }) {
    return (
        <FeedbackForm kind="conference" startedAt={startedAt} fieldErrors={fieldErrors}>
            <Rating
                legend={`How would you rate ${conferenceManifest.public.name} overall?`}
                error={fieldErrors.rating}
            />
            <TextArea
                name="bestThing"
                label={`Why do you come to ${conferenceManifest.public.name}? What’s the best thing about it?`}
                error={fieldErrors.bestThing}
            />
            <TextArea name="ideas" label="Ideas or suggestions" error={fieldErrors.ideas} />
            <TextArea name="feedback" label="Any other feedback" error={fieldErrors.feedback} />
            <EmailField error={fieldErrors.email} />
        </FeedbackForm>
    )
}

function TalkForm({
    startedAt,
    fieldErrors,
    targets,
    reviewedIds,
    talkId,
    onTalkChange,
}: {
    startedAt: number
    fieldErrors: FieldErrors
    targets: FeedbackTarget[]
    reviewedIds: string[]
    talkId: string
    onTalkChange: (id: string) => void
}) {
    const selectId = useId()
    const errorId = useId()
    const reviewedNoticeId = useId()
    const reviewed = new Set(reviewedIds)
    const selected = targets.find((target) => target.id === talkId)
    const alreadyReviewed = selected ? reviewed.has(selected.id) : false
    const describedBy = [alreadyReviewed ? reviewedNoticeId : undefined, fieldErrors.targetId ? errorId : undefined]
        .filter(Boolean)
        .join(' ')

    if (!targets.length) {
        return <styled.p>The agenda isn&apos;t available right now, so talk feedback can&apos;t be given yet.</styled.p>
    }

    return (
        <FeedbackForm kind="talk" startedAt={startedAt} fieldErrors={fieldErrors} canSubmit={!alreadyReviewed}>
            <Box>
                <styled.label htmlFor={selectId} display="block" fontWeight="semibold" mb="2">
                    Which talk?
                </styled.label>
                <styled.select
                    id={selectId}
                    name="targetId"
                    required
                    value={selected ? selected.id : ''}
                    onChange={(event) => onTalkChange(event.target.value)}
                    aria-invalid={fieldErrors.targetId ? true : undefined}
                    aria-describedby={describedBy || undefined}
                    {...inputStyles}
                >
                    <option value="">Choose a talk…</option>
                    {targets.map((target) => (
                        <option key={target.id} value={target.id}>
                            {reviewed.has(target.id) ? `${target.label} (feedback given)` : target.label}
                        </option>
                    ))}
                </styled.select>
                {selected ? (
                    <styled.p mt="2" fontSize="sm" color="text.secondary">
                        {[selected.kind === 'talk' ? selected.speakers : undefined, selected.room]
                            .filter(Boolean)
                            .join(' · ')}
                    </styled.p>
                ) : null}
                {alreadyReviewed ? (
                    <styled.p
                        id={reviewedNoticeId}
                        mt="3"
                        px="3"
                        py="2"
                        rounded="md"
                        fontSize="sm"
                        bg="status.info.bg"
                        color="status.info.fg"
                    >
                        {ALREADY_REVIEWED} Thanks! Choose another talk to keep going.
                    </styled.p>
                ) : (
                    <FieldError id={errorId} error={fieldErrors.targetId} />
                )}
            </Box>
            {alreadyReviewed ? null : (
                <>
                    <Rating
                        legend={`How much did you enjoy this ${selected?.kind === 'meet-the-experts' ? 'session' : 'talk'}?`}
                        error={fieldErrors.rating}
                    />
                    <TextArea
                        name="speakerFeedback"
                        label="Constructive feedback for the speaker"
                        hint="Passed on to the speaker after the organising committee has read it. What worked, and what would make it even better?"
                        error={fieldErrors.speakerFeedback}
                    />
                    <TextArea
                        name="organiserFeedback"
                        label="Anything just for the organisers?"
                        hint="Never shared with the speaker."
                        error={fieldErrors.organiserFeedback}
                    />
                    <EmailField error={fieldErrors.email} />
                </>
            )}
        </FeedbackForm>
    )
}

function FeedbackForm({
    kind,
    startedAt,
    fieldErrors,
    canSubmit = true,
    children,
}: React.PropsWithChildren<{ kind: FeedbackKind; startedAt: number; fieldErrors: FieldErrors; canSubmit?: boolean }>) {
    const navigation = useNavigation()
    const errorRef = useRef<HTMLDivElement>(null)
    const hasErrors = Object.keys(fieldErrors).length > 0

    // Moving focus to the summary both announces it and keeps the person near the fields to fix.
    useEffect(() => {
        if (hasErrors) errorRef.current?.focus()
    }, [fieldErrors, hasErrors])

    return (
        <Form method="post" preventScrollReset>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name={STARTED_AT_FIELD} value={startedAt} />
            {/* Honeypot: hidden from sight, screen readers and the tab order, so only a bot fills it. */}
            <Box aria-hidden="true" srOnly>
                <label>
                    Leave this field empty
                    <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
                </label>
            </Box>
            {hasErrors ? (
                <Box
                    ref={errorRef}
                    role="alert"
                    tabIndex={-1}
                    mb="6"
                    p="4"
                    bg="status.danger.bg"
                    color="status.danger.fg"
                    rounded="md"
                >
                    {fieldErrors._form ?? 'Please check the highlighted fields and try again.'}
                </Box>
            ) : null}
            <Flex direction="column" gap="6">
                {children}
                {canSubmit ? (
                    <Box>
                        <Button type="submit" colorPalette="brand.primary" loading={navigation.state === 'submitting'}>
                            Send feedback
                        </Button>
                    </Box>
                ) : null}
            </Flex>
        </Form>
    )
}

/** Five stars as a native radio group, so arrow keys and screen readers work as they do for any radio. */
function Rating({ legend, error }: { legend: string; error?: string }) {
    const [value, setValue] = useState(0)
    const hintId = useId()
    const errorId = useId()

    return (
        <styled.fieldset aria-describedby={[hintId, error ? errorId : undefined].filter(Boolean).join(' ')}>
            <styled.legend fontWeight="semibold" mb="1">
                {legend}
            </styled.legend>
            <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                1 is low, 5 is high.
            </styled.p>
            <Flex gap="1">
                {[1, 2, 3, 4, 5].map((n) => (
                    <styled.label
                        key={n}
                        cursor="pointer"
                        fontSize="3xl"
                        lineHeight="none"
                        px="1"
                        rounded="sm"
                        color={n <= value ? 'brand.primary' : 'text.muted'}
                        _hover={{ color: 'interactive.highlight' }}
                        css={{
                            '&:has(input:focus-visible)': focusOutline,
                        }}
                    >
                        <styled.input
                            type="radio"
                            name="rating"
                            value={n}
                            required
                            checked={value === n}
                            onChange={() => setValue(n)}
                            srOnly
                        />
                        <span aria-hidden="true">{n <= value ? '★' : '☆'}</span>
                        <styled.span srOnly>{n} out of 5</styled.span>
                    </styled.label>
                ))}
            </Flex>
            <FieldError id={errorId} error={error} />
        </styled.fieldset>
    )
}

function TextArea({ name, label, hint, error }: { name: string; label: string; hint?: string; error?: string }) {
    const id = useId()
    const hintId = useId()
    const errorId = useId()
    const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ')

    return (
        <Box>
            <styled.label htmlFor={id} display="block" fontWeight="semibold" mb="1">
                {label} (optional)
            </styled.label>
            {hint ? (
                <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                    {hint}
                </styled.p>
            ) : null}
            <styled.textarea
                id={id}
                name={name}
                rows={4}
                maxLength={5000}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy || undefined}
                {...inputStyles}
            />
            <FieldError id={errorId} error={error} />
        </Box>
    )
}

function EmailField({ error }: { error?: string }) {
    const id = useId()
    const hintId = useId()
    const errorId = useId()

    return (
        <Box>
            <styled.label htmlFor={id} display="block" fontWeight="semibold" mb="1">
                Email (optional)
            </styled.label>
            <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                Only if you&apos;re happy for us to follow up with you. Never shared with speakers.
            </styled.p>
            <styled.input
                id={id}
                type="email"
                name="email"
                autoComplete="email"
                aria-invalid={error ? true : undefined}
                aria-describedby={[hintId, error ? errorId : undefined].filter(Boolean).join(' ')}
                {...inputStyles}
            />
            <FieldError id={errorId} error={error} />
        </Box>
    )
}

function FieldError({ id, error }: { id: string; error?: string }) {
    if (!error) return null
    return (
        <styled.p
            id={id}
            mt="1"
            fontSize="sm"
            color="status.danger.fg"
            bg="status.danger.bg"
            px="2"
            py="1"
            rounded="sm"
        >
            {error}
        </styled.p>
    )
}

/** Solid rather than the `focus-ring` shadow, which is ~20% opacity and too faint to see on these surfaces. */
const focusOutline = {
    outlineStyle: 'solid',
    outlineWidth: 'medium',
    outlineColor: 'interactive.focus',
    outlineOffset: '0.5',
} as const

const inputStyles = {
    display: 'block',
    w: 'full',
    px: '3',
    py: '2',
    rounded: 'md',
    bg: 'surface.elevated',
    color: 'text.primary',
    border: 'default',
    fontSize: 'md',
    _focusVisible: focusOutline,
} as const
