import type { SurveyQuestion } from '@ddd/conference-config'
import { conferenceManifest } from '@conference/manifest'
import { useEffect, useId, useRef } from 'react'
import { data, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import { AppLink } from '~/components/app-link'
import { PageLayout } from '~/components/page-layout'
import {
    choiceInputStyles,
    describedBy,
    ErrorSummary,
    FieldError,
    focusOutline,
    inputStyles,
    SpamCheckFields,
} from '~/components/public-form'
import { Button } from '~/components/ui/button'
import { looksLikeSpam } from '~/lib/feedback/feedback-submission'
import { openWindowStatus } from '~/lib/forms/open-window'
import { noIndexMeta } from '~/lib/seo'
import {
    EMAIL_FIELD,
    fieldName,
    findSurvey,
    MAX_LONG_TEXT,
    MAX_SHORT_TEXT,
    OTHER_LABEL,
    OTHER_VALUE,
    otherFieldName,
    parseSurveyResponse,
    SCALE_POINTS,
} from '~/lib/surveys/survey-response'
import { getDateTimeProvider, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.survey.$slug'

/**
 * A hidden survey, defined in the manifest's `surveys`. Kept out of search
 * the same three ways as a competition (see `_layout.competition.$slug.tsx`):
 * not linked or in the sitemap, `noindex` in both the meta tags and an
 * `X-Robots-Tag` header, and a 404 for an unknown slug. Same spam checks too:
 * honeypot plus minimum fill time, which pretend to succeed when tripped.
 */

const NO_INDEX = 'noindex, nofollow'

function loadSurvey(slug: string | undefined) {
    const survey = findSurvey(conferenceManifest.surveys, slug)
    if (!survey) throw new Response('Not Found', { status: 404, headers: { 'X-Robots-Tag': NO_INDEX } })
    return survey
}

const formatWhen = (value: { toLocaleString: (locale: string, options: Intl.DateTimeFormatOptions) => string }) =>
    value.toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export async function loader({ params, context }: Route.LoaderArgs) {
    const survey = loadSurvey(params.slug)
    return data(
        {
            title: survey.title,
            description: survey.description,
            questions: survey.questions,
            askForEmail: survey.askForEmail ?? true,
            emailPosition: survey.emailPosition ?? 'last',
            emailHint: survey.emailHint,
            status: openWindowStatus(survey, getDateTimeProvider(context).nowDate()),
            opensAt: formatWhen(survey.opens),
            // Rendered into the form for the minimum-fill-time check, so the page can't be cached.
            // eslint-disable-next-line dates/use-date-time-provider -- Anti-spam timing must follow real elapsed time, independently of conference overrides.
            startedAt: Date.now(),
        },
        { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': NO_INDEX } },
    )
}

export async function action({ params, request, context }: Route.ActionArgs) {
    const survey = loadSurvey(params.slug)
    const headers = { 'X-Robots-Tag': NO_INDEX }
    if (openWindowStatus(survey, getDateTimeProvider(context).nowDate()) !== 'open') {
        return data(
            { ok: false as const, fieldErrors: { _form: 'Sorry, this survey isn’t taking responses.' } },
            { status: 403, headers },
        )
    }

    const formData = await request.formData()
    // eslint-disable-next-line dates/use-date-time-provider -- Anti-spam timing must follow real elapsed time, independently of conference overrides.
    if (looksLikeSpam(formData, Date.now())) return data({ ok: true as const }, { headers })

    const parsed = parseSurveyResponse(survey, formData)
    if (!parsed.ok) return data({ ok: false as const, fieldErrors: parsed.fieldErrors }, { status: 400, headers })

    await getServices(context).surveys.saveResponse(survey.slug, parsed.data)
    return data({ ok: true as const }, { headers })
}

export function headers() {
    return new Headers({ 'Cache-Control': 'no-store', 'X-Robots-Tag': NO_INDEX })
}

export const meta = ({ loaderData }: Route.MetaArgs) => [
    ...noIndexMeta(),
    { title: `${loaderData?.title ?? 'Survey'} | ${conferenceManifest.public.name}` },
]

export default function Survey() {
    const loaderData = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
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
                            Thanks for sharing!
                        </styled.h2>
                        <styled.p>We read every response, and it shapes the conferences we put on.</styled.p>
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
                            ? `This survey opens on ${loaderData.opensAt}.`
                            : 'This survey has closed. Thanks to everyone who took part!'}
                    </styled.p>
                    <AppLink to="/" unstyled color="text.highlight" textDecoration="underline">
                        Back to the home page
                    </AppLink>
                </Box>
            </PageLayout>
        )
    }

    const fieldErrors: Record<string, string> = actionData && !actionData.ok ? actionData.fieldErrors : {}
    const emailField = <EmailField error={fieldErrors[EMAIL_FIELD]} hint={loaderData.emailHint} />

    return (
        <PageLayout>
            <Box maxW="2xl" mx="auto" w="full" py="8">
                {heading}
                {loaderData.description.map((paragraph, index) => (
                    <styled.p key={index} mb="4">
                        {paragraph}
                    </styled.p>
                ))}

                <Form method="post" preventScrollReset>
                    <SpamCheckFields startedAt={loaderData.startedAt} />
                    <ErrorSummary fieldErrors={fieldErrors} />
                    <Flex direction="column" gap="8">
                        {loaderData.askForEmail && loaderData.emailPosition === 'first' ? emailField : null}
                        {loaderData.questions.map((question) => (
                            <Question key={question.id} question={question} error={fieldErrors[fieldName(question)]} />
                        ))}
                        {loaderData.askForEmail && loaderData.emailPosition === 'last' ? emailField : null}
                        <Box>
                            <Button type="submit" loading={navigation.state === 'submitting'}>
                                Send my answers
                            </Button>
                        </Box>
                    </Flex>
                </Form>
            </Box>
        </PageLayout>
    )
}

function Question({ question, error }: { question: SurveyQuestion; error?: string }) {
    switch (question.kind) {
        case 'single':
        case 'multiple':
            return <ChoiceQuestion question={question} error={error} />
        case 'scale':
            return <ScaleQuestion question={question} error={error} />
        case 'text':
            return <TextQuestion question={question} error={error} />
    }
}

function QuestionLabel({ question }: { question: SurveyQuestion }) {
    return (
        <>
            {question.label}
            {question.required ? (
                <styled.span fontWeight="normal" color="text.secondary">
                    {' '}
                    (required)
                </styled.span>
            ) : null}
        </>
    )
}

function ChoiceQuestion({
    question,
    error,
}: {
    question: Extract<SurveyQuestion, { kind: 'single' | 'multiple' }>
    error?: string
}) {
    const hintId = useId()
    const errorId = useId()
    const otherId = useId()
    const type = question.kind === 'single' ? 'radio' : 'checkbox'
    const hint =
        question.hint ??
        (question.kind === 'multiple' ? (question.maxChoices ? `Choose up to ${question.maxChoices}.` : 'Choose any.') : undefined)

    return (
        <styled.fieldset aria-describedby={describedBy(hint && hintId, error && errorId)}>
            <styled.legend fontWeight="semibold" mb="1">
                <QuestionLabel question={question} />
            </styled.legend>
            {hint ? (
                <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                    {hint}
                </styled.p>
            ) : null}
            <Flex direction="column" gap="2">
                {question.options.map((option) => (
                    <styled.label key={option} display="flex" gap="3" alignItems="flex-start" cursor="pointer">
                        <styled.input
                            type={type}
                            name={fieldName(question)}
                            value={option}
                            required={question.required && type === 'radio'}
                            {...choiceInputStyles}
                        />
                        {option}
                    </styled.label>
                ))}
                {question.allowOther ? (
                    <Flex gap="3" alignItems="flex-start" flexWrap="wrap">
                        <styled.label display="flex" gap="3" alignItems="flex-start" cursor="pointer">
                            <styled.input
                                type={type}
                                name={fieldName(question)}
                                value={OTHER_VALUE}
                                {...choiceInputStyles}
                            />
                            {OTHER_LABEL}
                        </styled.label>
                        <styled.label htmlFor={otherId} srOnly>
                            {`${OTHER_LABEL} — please specify`}
                        </styled.label>
                        <styled.input
                            id={otherId}
                            type="text"
                            name={otherFieldName(question)}
                            maxLength={MAX_SHORT_TEXT}
                            placeholder="Please specify"
                            {...inputStyles}
                            flex="1"
                            minW="0"
                            py="1"
                        />
                    </Flex>
                ) : null}
            </Flex>
            <FieldError id={errorId} error={error} />
        </styled.fieldset>
    )
}

function ScaleQuestion({ question, error }: { question: Extract<SurveyQuestion, { kind: 'scale' }>; error?: string }) {
    const hintId = useId()
    const errorId = useId()

    return (
        <styled.fieldset aria-describedby={describedBy(hintId, error && errorId)}>
            <styled.legend fontWeight="semibold" mb="1">
                <QuestionLabel question={question} />
            </styled.legend>
            <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                {question.hint ? `${question.hint} ` : ''}1 = {question.minLabel}, 5 = {question.maxLabel}.
            </styled.p>
            <Flex gap="2" flexWrap="wrap">
                {SCALE_POINTS.map((point) => (
                    <styled.label
                        key={point}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        minW="11"
                        h="11"
                        rounded="md"
                        border="default"
                        bg="surface.elevated"
                        cursor="pointer"
                        fontWeight="semibold"
                        _hover={{ borderColor: 'interactive.highlight' }}
                        css={{
                            '&:has(input:checked)': { bg: 'brand.primary', color: 'text.on-brand' },
                            '&:has(input:focus-visible)': focusOutline,
                        }}
                    >
                        <styled.input
                            type="radio"
                            name={fieldName(question)}
                            value={point}
                            required={question.required}
                            srOnly
                        />
                        {point}
                        {point === 1 || point === 5 ? (
                            <styled.span srOnly>{` — ${point === 1 ? question.minLabel : question.maxLabel}`}</styled.span>
                        ) : null}
                    </styled.label>
                ))}
            </Flex>
            <FieldError id={errorId} error={error} />
        </styled.fieldset>
    )
}

function TextQuestion({ question, error }: { question: Extract<SurveyQuestion, { kind: 'text' }>; error?: string }) {
    const id = useId()
    const hintId = useId()
    const errorId = useId()
    const shared = {
        id,
        name: fieldName(question),
        required: question.required,
        maxLength: question.long ? MAX_LONG_TEXT : MAX_SHORT_TEXT,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy(question.hint && hintId, error && errorId),
    }

    return (
        <Box>
            <styled.label htmlFor={id} display="block" fontWeight="semibold" mb="1">
                <QuestionLabel question={question} />
            </styled.label>
            {question.hint ? (
                <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                    {question.hint}
                </styled.p>
            ) : null}
            {question.long ? (
                <styled.textarea rows={5} {...shared} {...inputStyles} />
            ) : (
                <styled.input type="text" {...shared} {...inputStyles} />
            )}
            <FieldError id={errorId} error={error} />
        </Box>
    )
}

function EmailField({ error, hint }: { error?: string; hint?: string }) {
    const id = useId()
    const hintId = useId()
    const errorId = useId()

    return (
        <Box>
            <styled.label htmlFor={id} display="block" fontWeight="semibold" mb="1">
                Email (optional)
            </styled.label>
            <styled.p id={hintId} fontSize="sm" color="text.secondary" mb="2">
                {hint ??
                    'Only if you’re happy for us to follow up about your answers. Leave it blank to stay anonymous.'}
            </styled.p>
            <styled.input
                id={id}
                type="email"
                name={EMAIL_FIELD}
                autoComplete="email"
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(hintId, error && errorId)}
                {...inputStyles}
            />
            <FieldError id={errorId} error={error} />
        </Box>
    )
}
