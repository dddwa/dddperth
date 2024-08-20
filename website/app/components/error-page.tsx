import { isRouteErrorResponse, useRouteError } from '@remix-run/react'
import type { ReactNode } from 'react'
import { Center, Flex, styled } from 'styled-system/jsx'

export function ErrorPage() {
    const error = useRouteError()

    if (isRouteErrorResponse(error)) {
        // code that used to be in the catch boundary
        let heading
        let message
        switch (error.status) {
            case 400:
                heading = 'Bad Request'
                message = 'This request was not properly formed.'
                break
            case 401:
                heading = 'Unauthorized'
                message = 'Looks like you tried to visit a page that you do not have access to.'
                break
            case 403:
                heading = 'Unauthorized'
                message = 'Looks like you tried to visit a page that you do not have access to.'
                break
            case 404:
                heading = 'Page not Found'
                message = 'Oh, it looks like the page you are looking for got lost in the clouds.'
                break

            default:
                throw new Error(JSON.stringify(error.data) || error.statusText)
        }

        return (
            <Flex width="full" justifyContent="center">
                <ErrorView heading={heading} description={message} />
            </Flex>
        )
    }

    console.error('Unexpected error', error)
    if (error instanceof Error) {
        return (
            <Flex width="full" justifyContent="center">
                <ErrorView
                    heading="Something went wrong"
                    description={
                        <>
                            <styled.p textStyle="h4" color="text.h4">
                                Oops, we have encountered an unexpected error and our team has been alerted. Please{' '}
                                <styled.a
                                    color="text.highlight"
                                    textDecoration="underline"
                                    href={`mailto:info@dddperth.com`}
                                >
                                    email us
                                </styled.a>{' '}
                                if this error persists.
                            </styled.p>
                            {process.env.NODE_ENV === 'development' && (
                                <styled.pre fontSize="xs" whiteSpace="pre-line">
                                    {error.stack}
                                </styled.pre>
                            )}
                        </>
                    }
                />
            </Flex>
        )
    }
}

export interface ErrorViewProps {
    buttonLabel?: ReactNode
    heading: string
    redirectUrl?: string
    description: ReactNode
    showReloadButton?: boolean
    showBackHomeButton?: boolean
    showLogoutButton?: boolean
}

export function ErrorView({ heading, description }: ErrorViewProps) {
    return (
        <Center maxW="3xl">
            <Flex
                width="full"
                direction="column"
                alignItems="center"
                gap={{ base: '3', md: '8' }}
                py={{ base: '20', md: '36' }}
            >
                <styled.h1 textStyle="h1" fontSize="2xl" color="text.h1">
                    {heading}
                </styled.h1>
                {typeof description === 'string' ? (
                    <styled.p textStyle="h4" color="text.h4">
                        {description}
                    </styled.p>
                ) : (
                    description
                )}
            </Flex>
        </Center>
    )
}
