import { data, Form, redirect, useActionData, useSearchParams } from 'react-router'
import { authenticator, getUser } from '~/lib/auth.server'
import { recordException } from '~/lib/record-exception'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/auth.login'

export async function loader({ request }: Route.LoaderArgs) {
    // If user is already authenticated, redirect to admin
    const user = await getUser(request)
    if (user) {
        throw redirect('/admin')
    }
    return null
}

export async function action({ request }: Route.ActionArgs) {
    try {
        // This will redirect to GitHub OAuth
        return await authenticator.authenticate('github', request)
    } catch (error) {
        if (error instanceof Response) {
            throw error
        }

        recordException(error)

        // If there's an error, return it to display on the form
        if (error instanceof Error) {
            return data({ error: error.message }, { status: 400 })
        }

        throw error
    }
}

export default function Login() {
    const [searchParams] = useSearchParams()
    const actionData = useActionData<typeof action>()

    const error =
        (actionData && 'error' in actionData && actionData.error) ||
        (searchParams.get('error') === 'access_denied'
            ? 'Access denied. Admin privileges required.'
            : searchParams.get('error') === 'auth_failed'
              ? 'Authentication failed. Please try again.'
              : null)

    return (
        <Flex minH="100vh" align="center" justify="center" bg="#0E0E43">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="400px" w="full">
                <styled.h1 mb="6" color="#0E0E43" fontSize="2xl" fontWeight="bold">
                    Admin Login
                </styled.h1>

                {error && (
                    <Box
                        mb="6"
                        p="4"
                        bg="red.50"
                        border="1px solid"
                        borderColor="red.200"
                        borderRadius="md"
                        color="red.700"
                        fontSize="sm"
                    >
                        {error}
                    </Box>
                )}

                <styled.p mb="8" color="gray.600">
                    Sign in with your GitHub account to access the admin area.
                </styled.p>
                <Form method="post">
                    <styled.button
                        type="submit"
                        bg="#24292e"
                        color="white"
                        border="none"
                        py="3"
                        px="6"
                        borderRadius="md"
                        fontSize="md"
                        cursor="pointer"
                        display="flex"
                        alignItems="center"
                        gap="2"
                        mx="auto"
                        _hover={{ bg: '#1c2128' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Sign in with GitHub
                    </styled.button>
                </Form>
            </Box>
        </Flex>
    )
}
