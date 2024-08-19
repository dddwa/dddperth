/* eslint-disable react/prop-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { DateTime } from 'luxon'
import { MDXContent } from 'mdx/types'
import { renderToStaticMarkup } from 'react-dom/server'
import { VolunteerForm } from '~/components/page-components/VolunteerForm'
import { Button } from '~/components/ui/button'
import { styled } from '../../styled-system/jsx'
import { ConferenceState } from './config-types'

export function renderMdx(Component: MDXContent, conferenceState: ConferenceState): string {
    return renderToStaticMarkup(
        <Component
            components={{
                a: ({ ref, ...props }) => <styled.a {...props} />,
                h1: ({ ref, ...props }) => <styled.h1 fontSize="3xl" {...props} />,
                h2: ({ ref, ...props }) => <styled.h2 fontSize="2xl" {...props} />,
                h3: ({ ref, ...props }) => <styled.h3 fontSize="xl" {...props} />,
                ul: ({ ref, ...props }) => <styled.ul {...props} listStyle="inside" />,
                VolunteerForm: ({ ref, ...props }) => <VolunteerForm />,
                SubmitSession: ({ ref, ...props }) => {
                    if (conferenceState.callForPapers.state === 'open') {
                        if (conferenceState.callForPapers.sessionizeUrl) {
                            return (
                                <styled.div {...props}>
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
                        return <CFPNotOpenYet cfpOpens={conferenceState.callForPapers.opens} />
                    }
                },
                EditSession: ({ ref, ...props }) => {
                    if (conferenceState.callForPapers.state === 'open') {
                        return (
                            <styled.div {...props}>
                                <Button asChild>
                                    <a
                                        href="https://sessionize.com/app/speaker"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
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
                        return <CFPNotOpenYet cfpOpens={conferenceState.callForPapers.opens} />
                    }
                },
                VolunteersNeeded: ({ ref, ...props }) => {
                    if (conferenceState.needsVolunteers) {
                        return props.children
                    }
                },
            }}
            conference={conferenceState}
        />,
    )
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
