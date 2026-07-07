import { data, Form, redirect, useActionData, useLoaderData, useNavigation, useSearchParams } from 'react-router'
import { getUser } from '~/lib/auth.server'
import { isValidEmail, sanitiseRedirect } from '~/lib/auth/validation'
import { recordException } from '~/lib/record-exception'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/auth.login'

const REDIRECT_PARAM = 'redirectTo'

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await getUser(request.headers, getServices(context))
    if (user) {
        const url = new URL(request.url)
        const redirectTo = sanitiseRedirect(url.searchParams.get(REDIRECT_PARAM))
        throw redirect(redirectTo)
    }
    return data({ canSendEmail: getServices(context).email.canSend() })
}

export async function action({ request, context }: Route.ActionArgs) {
    const formData = await request.formData()
    const emailRaw = formData.get('email')
    const redirectToRaw = formData.get(REDIRECT_PARAM)

    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : ''
    const redirectTo = sanitiseRedirect(typeof redirectToRaw === 'string' ? redirectToRaw : null)

    if (!isValidEmail(email)) {
        return data({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    try {
        // sendMagicLink checks the allowlist itself and is a no-op for
        // unallowlisted addresses. We always respond with "check your inbox"
        // either way, so the form can't be used to probe who has access.
        await getServices(context).auth.sendMagicLink({
            email,
            redirectTo,
            requestUrl: new URL(request.url).origin,
        })
    } catch (error) {
        recordException(error)
        // Fall through to the generic success response. The user shouldn't
        // see provider-side errors (and a real user with an allowlisted
        // address can simply retry).
    }

    return data({ sent: true as const, email })
}

export default function Login() {
    const { canSendEmail } = useLoaderData<typeof loader>()
    const [searchParams] = useSearchParams()
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const isSubmitting = navigation.state === 'submitting'
    const redirectTo = sanitiseRedirect(searchParams.get(REDIRECT_PARAM))

    if (actionData && 'sent' in actionData) {
        return (
            <Flex minH="screen" align="center" justify="center" bg="surface.body">
                <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="[440px]" w="full">
                    <styled.h1 mb="4" color="surface.body" fontSize="2xl" fontWeight="bold">
                        Check your inbox
                    </styled.h1>
                    <styled.p color="gray.9">
                        If <styled.strong>{actionData.email}</styled.strong> has access, a sign-in link is on its way.
                        The link expires in 15 minutes.
                    </styled.p>
                    {!canSendEmail && (
                        <Box
                            mt="4"
                            p="3"
                            bg="status.info.bg"
                            border="default"
                            borderColor="status.info.border"
                            borderRadius="md"
                            color="status.info.fg"
                            fontSize="sm"
                        >
                            Email isn't configured in this environment. Check the server console for the magic link.
                        </Box>
                    )}
                </Box>
            </Flex>
        )
    }

    const error = (actionData && 'error' in actionData && actionData.error) || null

    return (
        <Flex minH="screen" align="center" justify="center" bg="surface.body">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" maxW="[440px]" w="full">
                <styled.h1 mb="6" color="surface.body" fontSize="2xl" fontWeight="bold" textAlign="center">
                    Sign in
                </styled.h1>

                {error && (
                    <Box
                        mb="6"
                        p="4"
                        bg="status.danger.bg"
                        border="default"
                        borderColor="status.danger.border"
                        borderRadius="md"
                        color="status.danger.fg"
                        fontSize="sm"
                    >
                        {error}
                    </Box>
                )}

                <styled.p mb="6" color="gray.9" textAlign="center">
                    Enter your email and we'll send you a one-time sign-in link.
                </styled.p>
                <Form method="post">
                    <input type="hidden" name={REDIRECT_PARAM} value={redirectTo} />
                    <styled.label display="block" mb="2" fontSize="sm" fontWeight="medium" color="gray.10">
                        Email
                        <styled.input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            mt="1"
                            w="full"
                            px="3"
                            py="2"
                            borderWidth="1px"
                            borderStyle="solid"
                            borderColor="admin.400"
                            borderRadius="md"
                            fontSize="md"
                            color="admin.900"
                            bg="white"
                            _focus={{ outline: 'none', borderColor: 'admin.700', boxShadow: 'focus-ring' }}
                        />
                    </styled.label>
                    <styled.button
                        type="submit"
                        disabled={isSubmitting}
                        bg="admin.900"
                        color="text.primary"
                        border="none"
                        py="3"
                        px="6"
                        borderRadius="md"
                        fontSize="md"
                        fontWeight="medium"
                        cursor="pointer"
                        w="full"
                        mt="4"
                        _hover={{ bg: 'admin.800' }}
                        _disabled={{ bg: 'gray.8', cursor: 'not-allowed', opacity: 0.7 }}
                    >
                        {isSubmitting ? 'Sending sign-in link…' : 'Send sign-in link'}
                    </styled.button>
                </Form>
            </Box>
        </Flex>
    )
}
