/* eslint-disable react/prop-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SerializeFrom } from '@remix-run/server-runtime'
import { LRUCache } from 'lru-cache'
import { DateTime } from 'luxon'
import * as mdxBundler from 'mdx-bundler/client/index.js'
import { MDXComponents } from 'mdx/types'
import { useMemo } from 'react'
import { TicketForm } from '~/components/page-components/TicketForm'
import { VolunteerForm } from '~/components/page-components/VolunteerForm'
import { Button } from '~/components/ui/button'
import { styled } from '../../styled-system/jsx'
import { ConferenceState } from './config-types'

const mdxComponentCache = new LRUCache<string, ReturnType<typeof getMdxComponent>>({
    max: 1000,
})

export function useMdxPage(code: string, conferenceState: SerializeFrom<ConferenceState>) {
    return useMemo(() => {
        if (mdxComponentCache.has(code)) {
            return mdxComponentCache.get(code)!
        }
        const component = getMdxComponent(code, conferenceState)
        mdxComponentCache.set(code, component)
        return component
    }, [code, conferenceState])
}

/**
 * This should be rendered within a useMemo
 * @param code the code to get the component from
 * @returns the component
 */
function getMdxComponent(code: string, conferenceState: SerializeFrom<ConferenceState>) {
    const Component = mdxBundler.getMDXComponent(code)
    const mdxComponents: MDXComponents = {
        a: ({ ref, ...props }) => <styled.a {...props} />,
        h1: ({ ref, ...props }) => <styled.h1 fontSize="3xl" {...props} />,
        h2: ({ ref, ...props }) => <styled.h2 fontSize="2xl" {...props} />,
        h3: ({ ref, ...props }) => <styled.h3 fontSize="xl" {...props} />,
        ul: ({ ref, ...props }) => <styled.ul {...props} listStyle="inside" />,
        VolunteerForm: () => <VolunteerForm />,
        SubmitSession: () => {
            if (conferenceState.callForPapers.state === 'open') {
                if (conferenceState.callForPapers.sessionizeUrl) {
                    return (
                        <styled.div>
                            <Button asChild>
                                <a
                                    href={conferenceState.callForPapers.sessionizeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Submit a session via Sessionize
                                </a>
                            </Button>
                        </styled.div>
                    )
                }
            }
            if (conferenceState.callForPapers.state === 'closed') {
                return <CFPClosed />
            }

            if (conferenceState.callForPapers.state === 'not-open-yet') {
                return <CFPNotOpenYet cfpOpens={DateTime.fromISO(conferenceState.callForPapers.opens)} />
            }
        },
        EditSession: () => {
            if (conferenceState.callForPapers.state === 'open') {
                return (
                    <styled.div>
                        <Button asChild>
                            <a href="https://sessionize.com/app/speaker" target="_blank" rel="noopener noreferrer">
                                Submit a session via Sessionize
                            </a>
                        </Button>
                    </styled.div>
                )
            }
            if (conferenceState.callForPapers.state === 'closed') {
                return <CFPClosed />
            }

            if (conferenceState.callForPapers.state === 'not-open-yet') {
                return <CFPNotOpenYet cfpOpens={DateTime.fromISO(conferenceState.callForPapers.opens)} />
            }
        },
        VolunteersNeeded: ({ children }) => {
            if (conferenceState.needsVolunteers) {
                return children
            }
        },
        TicketWaitListOpen: ({ children }) => {
            if (conferenceState.ticketSales.state === 'wait-list-open') {
                return children
            }
        },
        TicketSalesOpen: ({ children }) => {
            if (conferenceState.ticketSales.state === 'open') {
                return children
            }
        },
        BuyTicketForm: () => {
            if (conferenceState.ticketSales.state === 'open') {
                return <TicketForm state={conferenceState.ticketSales} />
            }
        },
        ConferenceDay: ({ children }) => {
            if (conferenceState.conferenceState === 'conference-day') {
                return children
            }
        },
        OutsideConferenceDay: ({ children }) => {
            if (conferenceState.conferenceState !== 'conference-day') {
                return children
            }
        },
    }
    function MdxComponent({ components, ...rest }: Parameters<typeof Component>['0']) {
        return (
            <Component
                conference={conferenceState.conference}
                components={{ ...mdxComponents, ...components }}
                {...rest}
            />
        )
    }
    return MdxComponent
}

export function CFPNotOpenYet({ cfpOpens }: { cfpOpens: DateTime }) {
    return (
        <styled.div>
            <Button disabled>
                Call for Papers not open yet, it opens on {cfpOpens.toLocaleString(DateTime.DATETIME_SHORT)}
            </Button>
        </styled.div>
    )
}

export function CFPClosed() {
    return (
        <styled.div>
            <Button disabled>Call for Papers is closed</Button>
        </styled.div>
    )
}
