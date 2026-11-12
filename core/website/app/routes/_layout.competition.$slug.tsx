import { conferenceManifest } from '@conference/manifest'
import { useEffect, useId, useRef } from 'react'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AppLink } from '~/components/app-link'
import {
    choiceInputStyles,
    describedBy,
    ErrorSummary,
    FieldError,
    inputStyles,
    SpamCheckFields,
} from '~/components/public-form'
import { PageLayout } from '~/components/page-layout'
import { Button } from '~/components/ui/button'
import {
    competitionEntrySchema,
    competitionStatus,
    emailKey,
    findCompetition,
    MAX_ANSWER,
    MAX_NAME,
    TERMS_ACCEPTED,
    TERMS_FIELD,
} from '~/lib/competitions/competition-entry'
import { looksLikeSpam } from '~/lib/feedback/feedback-submission'
import { parseFormData } from '~/lib/forms/parse-form.server'
import { noIndexMeta } from '~/lib/seo'
import { getDateTimeProvider, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.competition.$slug'

/**
 * A hidden competition entry form. Hidden three ways, because each covers a
 * gap in the others:
 * - nothing links here and it isn't in `sitemap.xml` (a hardcoded list), so
 *   it's only reached from the link or QR code handed out;
 * - the page's meta says `noindex, nofollow`, and so does an `X-Robots-Tag`
 *   header, which crawlers honour even if they never parse the HTML;
 * - an unknown slug is a plain 404, so guessing `/competition/x` reveals
 *   nothing. Deliberately *not* `Disallow`ed in robots.txt: that would stop
 *   crawlers reading the `noindex` (see `~/lib/seo`).
 *
 * Spam: the shared honeypot + minimum-fill-time checks (a tripped check
 * pretends to succeed, so a bot learns nothing), and one entry per normalised
 * email (`emailKey`), so `+tags` and Gmail dots don't buy extra entries.
 */

const NO_INDEX = 'noindex, nofollow'
const ALREADY_ENTERED = 'This email address has already entered. Only one entry per person, sorry!'

const formatWhen = (value: { toLocaleString: (locale: string, options: Intl.DateTimeFormatOptions) => string }) =>
    value.toLocaleString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })

function loadCompetition(slug: string | undefined) {
    const competition = findCompetition(conferenceManifest.competitions, slug)
    if (!competition) throw new Response('Not Found', { status: 404, headers: { 'X-Robots-Tag': NO_INDEX } })
    return competition
}

export async function loader({ params, context }: Route.LoaderArgs) {
    const competition = loadCompetition(params.slug)
    const status = competitionStatus(competition, getDateTimeProvider(context).nowDate())

    return data(
        {
            title: competition.title,
            description: competition.description,
            question: competition.question,
            answerHint: competition.answerHint,
            termsUrl: competition.termsUrl,
            status,
            opensAt: formatWhen(competition.opens),
            closesAt: formatWhen(competition.closes),
            // Rendered into the form for the minimum-fill-time check, so the page can't be cached.
            // eslint-disable-next-line dates/use-date-time-provider -- Anti-spam timing must follow real elapsed time, independently of conference overrides.
            startedAt: Date.now(),
        },
        { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': NO_INDEX } },
    )
}

export async function action({ params, request, context }: Route.ActionArgs) {
    const competition = loadCompetition(params.slug)
    const headers = { 'X-Robots-Tag': NO_INDEX }
    if (competitionStatus(competition, getDateTimeProvider(context).nowDate()) !== 'open') {
        return data(
            { ok: false as const, fieldErrors: { _form: 'Sorry, this competition isn’t accepting entries.' } },
            { status: 403, headers },
        )
    }

    const formData = await request.formData()
    // eslint-disable-next-line dates/use-date-time-provider -- Anti-spam timing must follow real elapsed time, independently of conference overrides.
    if (looksLikeSpam(formData, Date.now())) return data({ ok: true as const }, { headers })

    const parsed = parseFormData(competitionEntrySchema, formData)
    if (!parsed.ok) return data({ ok: false as const, fieldErrors: parsed.fieldErrors }, { status: 400, headers })

    const { name, email, answer } = parsed.data
    const saved = await getServices(context).competitions.saveEntry(competition.slug, {
        name,
        email,
        emailKey: emailKey(email),
        answer,
    })
    if (!saved) {
        return data({ ok: false as const, fieldErrors: { email: ALREADY_ENTERED } }, { status: 409, headers })
    }
    return data({ ok: true as const }, { headers })
}

export function headers({ loaderHeaders, actionHeaders }: Route.HeadersArgs) {
    return new Headers({
        'Cache-Control': 'no-store',
        'X-Robots-Tag': actionHeaders.get('X-Robots-Tag') ?? loaderHeaders.get('X-Robots-Tag') ?? NO_INDEX,
    })
}

export const meta = ({ loaderData }: Route.MetaArgs) => [
    ...noIndexMeta(),
    { title: `${loaderData?.title ?? 'Competition'} | ${conferenceManifest.public.name}` },
]

export default function Competition() {
    const loaderData = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const thanksRef = useRef<HTMLDivElement>(null)
    const submitted = actionData?.ok === true

    // The submit button that had focus has gone; move focus (and the view) to the thank-you.
    useEffect(() => {
        if (!submitted) return
        window.scrollTo({ top: 0 })
        thanksRef.current?.focus({ preventScroll: true })
    }, [submitted, actionData])

    const heading = (
        <styled.h1 fontSize="3xl" fontWeight="bold" mb="4">
            {loaderData.title}
        </styled.h1>
    )

    if (submitted) {
        return (
            <PageLayout>
                <Box maxW="2xl" mx="auto" w="full" py="8">
                    {heading}
                    <Box ref={thanksRef} tabIndex={-1} role="status" bg="surface.card" rounded="md" p="6">
                        <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                            You&apos;re in. Good luck!
                        </styled.h2>
                        <styled.p>
                            Entries close {loaderData.closesAt}. If you win, we&apos;ll be in touch by email.
                        </styled.p>
                    </Box>
                </Box>
            </PageLayout>
        )
    }

    if (loaderData.status !== 'open') {
        return (
            <PageLayout>
                <Box maxW="2xl" mx="auto" w="full" py="8">
                    {heading}
                    <styled.p mb="4">
                        {loaderData.status === 'upcoming'
                            ? `This competition opens ${loaderData.opensAt}. Come back then to enter.`
                            : 'This competition has closed. Thanks to everyone who entered!'}
                    </styled.p>
                    <AppLink to="/" unstyled color="text.highlight" textDecoration="underline">
                        Back to the home page
                    </AppLink>
                </Box>
            </PageLayout>
        )
    }

    const fieldErrors: Record<string, string> = actionData && !actionData.ok ? actionData.fieldErrors : {}

    return (
        <PageLayout>
            <Box maxW="2xl" mx="auto" w="full" py="8">
                {heading}
                {loaderData.description.map((paragraph, index) => (
                    <styled.p key={index} mb="4">
                        {paragraph}
                    </styled.p>
                ))}
                <styled.p mb="6" color="text.secondary">
                    Entries close {loaderData.closesAt}. One entry per person. All fields are required.
                </styled.p>
                <EntryForm
                    startedAt={loaderData.startedAt}
                    fieldErrors={fieldErrors}
                    question={loaderData.question}
                    answerHint={loaderData.answerHint}
                    termsUrl={loaderData.termsUrl}
                />
            </Box>
        </PageLayout>
    )
}

function EntryForm({
    startedAt,
    fieldErrors,
    question,
    answerHint,
    termsUrl,
}: {
    startedAt: number
    fieldErrors: Record<string, string>
    question: string
    answerHint: string | undefined
    termsUrl: string
}) {
    const navigation = useNavigation()

    return (
        <Form method="post" preventScrollReset>
            <SpamCheckFields startedAt={startedAt} />
            <ErrorSummary fieldErrors={fieldErrors} />
            <Flex direction="column" gap="6">
                <TextField name="name" label="Name" autoComplete="name" maxLength={MAX_NAME} error={fieldErrors.name} />
                <TextField
                    name="email"
                    type="email"
                    label="Email"
                    hint="We'll only use this to contact you if you win."
                    autoComplete="email"
                    error={fieldErrors.email}
                />
                <AnswerField label={question} hint={answerHint} error={fieldErrors.answer} />
                <TermsField termsUrl={termsUrl} error={fieldErrors[TERMS_FIELD]} />
                <Box>
                    <Button type="submit" loading={navigation.state === 'submitting'}>
                        Enter the competition
                    </Button>
                </Box>
            </Flex>
        </Form>
    )
}

function TextField({
    name,
    label,
    hint,
    type = 'text',
    autoComplete,
    maxLength,
    error,
}: {
    name: string
    label: string
    hint?: string
    type?: 'text' | 'email'
    autoComplete: string
    maxLength?: number
    error?: string
}) {
    const id = useId()
    const hintId = useId()
    const errorId = useId()

    return (
        <Box>
            <styled.label htmlFor={id} display="block" fontWeight="semibold" mb="1">
                {label}
            </styled.label>
            {hint ? (
                <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                    {hint}
                </styled.p>
            ) : null}
            <styled.input
                id={id}
                type={type}
                name={name}
                required
                autoComplete={autoComplete}
                maxLength={maxLength}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(hint && hintId, error && errorId)}
                {...inputStyles}
            />
            <FieldError id={errorId} error={error} />
        </Box>
    )
}

function AnswerField({ label, hint, error }: { label: string; hint?: string; error?: string }) {
    const id = useId()
    const hintId = useId()
    const errorId = useId()

    return (
        <Box>
            <styled.label htmlFor={id} display="block" fontWeight="semibold" mb="1">
                {label}
            </styled.label>
            {hint ? (
                <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                    {hint}
                </styled.p>
            ) : null}
            <styled.textarea
                id={id}
                name="answer"
                rows={5}
                required
                maxLength={MAX_ANSWER}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(hint && hintId, error && errorId)}
                {...inputStyles}
            />
            <FieldError id={errorId} error={error} />
        </Box>
    )
}

function TermsField({ termsUrl, error }: { termsUrl: string; error?: string }) {
    const id = useId()
    const errorId = useId()

    return (
        <Box>
            <Flex gap="3" alignItems="flex-start">
                <styled.input
                    id={id}
                    type="checkbox"
                    name={TERMS_FIELD}
                    value={TERMS_ACCEPTED}
                    required
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy(error && errorId)}
                    {...choiceInputStyles}
                />
                {/* The link sits outside the <label>, so clicking it opens the terms instead of ticking the box. */}
                <styled.span>
                    <styled.label htmlFor={id} cursor="pointer">
                        I have read and accept the competition terms and conditions.
                    </styled.label>{' '}
                    <AppLink to={termsUrl} unstyled color="text.highlight" textDecoration="underline">
                        Read the terms and conditions
                    </AppLink>
                </styled.span>
            </Flex>
            <FieldError id={errorId} error={error} />
        </Box>
    )
}
