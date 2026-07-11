import { data, Form, useNavigation, useSearchParams } from 'react-router'
import { createUserSession } from '~/lib/auth.server'
import { sanitiseRedirect } from '~/lib/auth/validation'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/auth.verify.$token'

/**
 * GET renders a "Click to sign in" page only — it never consumes the token.
 * That stops corporate link scanners (Defender, Proofpoint, etc.) from
 * burning the token before the human clicks. Consumption happens in the
 * action, on the explicit POST.
 */

export async function action({ request, context, params }: Route.ActionArgs) {
    const token = params.token
    if (!token) {
        return data({ error: 'Missing sign-in token.' as const }, { status: 400 })
    }

    const result = await getServices(context).auth.consumeMagicLink(token)
    if (!result) {
        return data(
            { error: 'This sign-in link is invalid or has expired. Request a new one.' as const },
            { status: 400 },
        )
    }

    // Re-sanitise: the login route validated this on the way in, but a
    // future code path that issues tokens (e.g. an admin-driven invite)
    // shouldn't be able to plant an open redirect via a malformed
    // redirect_to column. Defence in depth.
    return await createUserSession(
        request.headers,
        getServices(context),
        { email: result.email, name: null },
        sanitiseRedirect(result.redirectTo),
    )
}

export default function Verify() {
    const [searchParams] = useSearchParams()
    const navigation = useNavigation()
    const isSubmitting = navigation.state === 'submitting'
    const error = searchParams.get('error')

    return (
        <Flex minH="screen" align="center" justify="center" bg="surface.body">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="[440px]" w="full">
                <styled.h1 mb="4" color="surface.body" fontSize="2xl" fontWeight="bold">
                    Confirm sign-in
                </styled.h1>
                <styled.p mb="6" color="gray.9">
                    Click the button to finish signing in.
                </styled.p>
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
                <Form method="post">
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
                        _hover={{ bg: 'admin.800' }}
                        _disabled={{ bg: 'gray.8', cursor: 'not-allowed', opacity: 0.7 }}
                    >
                        {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </styled.button>
                </Form>
            </Box>
        </Flex>
    )
}

export function ErrorBoundary() {
    return (
        <Flex minH="screen" align="center" justify="center" bg="surface.body">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="[440px]" w="full">
                <styled.h1 mb="4" color="surface.body" fontSize="2xl" fontWeight="bold">
                    Sign-in failed
                </styled.h1>
                <styled.p color="gray.9">
                    The sign-in link couldn't be used. Please request a new one from the{' '}
                    <styled.a href="/auth/login" color="admin.900" textDecoration="underline">
                        login page
                    </styled.a>
                    .
                </styled.p>
            </Box>
        </Flex>
    )
}
