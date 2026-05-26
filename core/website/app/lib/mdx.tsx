import { DateTime } from 'luxon'
import type { MDXComponents } from 'mdx/types'
import type { ComponentType } from 'react'
import { use } from 'react'
import bundles from 'virtual:mdx-bundles'
import type { Sponsor, Year } from './conference-state-client-safe'
import { MdxLink } from '~/components/mdx-link'
import {
    Bullet,
    Card,
    CardGrid,
    CTA,
    Hero,
    PastSponsorsGrid,
    Section,
    SponsorQuotes,
    Stat,
    Stats,
} from '~/components/mdx-primitives'
import { SponsorAcknowledgement } from '~/components/sponsor-acknowledgement'
import { TicketForm } from '~/components/page-components/TicketForm'
import { VolunteerForm } from '~/components/page-components/VolunteerForm'
import { Button } from '~/components/ui/button'
import { conferenceManifest } from '@conference/manifest'
import { styled } from '~/styled-system/jsx'
import type { ConferenceState } from './conference-state-client-safe'

type ContentType = 'page' | 'blog'

/**
 * Sponsors surfaced inside MDX components — resolved server-side (so the
 * fallback helper can read `conferenceConfig`) and passed in by the route.
 */
export interface MdxSponsorContext {
    /** Year used to label CTAs (e.g. "Sponsor 2026"). Always the active year. */
    currentYear: Year
    /** Sponsors to credit. Empty when no current sponsors and no fallback. */
    sponsors: Sponsor[]
    /** True when `sponsors` came from a prior year, not the current one. */
    isFallback: boolean
}

// Each entry's `.load()` call is memoized because ES module imports are
// singletons — calling it repeatedly returns the same promise.
export function useMdxPage(
    slug: string,
    type: ContentType,
    conferenceState: ConferenceState,
    ticketSponsors?: MdxSponsorContext,
) {
    const entry = bundles[type][slug]
    if (!entry) throw new Error(`[mdx] Unknown ${type}: ${slug}`)
    const mod = use(entry.load())
    return wrapMdxComponent(
        mod.default as ComponentType<Record<string, unknown>>,
        conferenceState,
        ticketSponsors,
    )
}

function wrapMdxComponent(
    Component: ComponentType<Record<string, unknown>>,
    conferenceState: ConferenceState,
    ticketSponsors?: MdxSponsorContext,
) {
    const mdxComponents: MDXComponents = {
        a: ({ ref, ...props }) => <MdxLink {...props} />,
        h1: ({ ref, ...props }) => <styled.h1 fontSize="3xl" {...props} />,
        h2: ({ ref, ...props }) => <styled.h2 fontSize="2xl" {...props} />,
        h3: ({ ref, ...props }) => <styled.h3 fontSize="xl" {...props} />,
        ul: ({ ref, ...props }) => <styled.ul {...props} listStyle="inside" />,
        Hero,
        Stats,
        Stat,
        CardGrid,
        Card,
        Bullet,
        CTA,
        Section,
        SponsorQuotes,
        PastSponsorsGrid,
        TicketSponsorAcknowledgement: () => {
            // Uses the resolved sponsor context the route loader passes in
            // (via `useMdxPage(..., ticketSponsors)`), so this component
            // doesn't need to know about the fallback resolver itself.
            if (!ticketSponsors || ticketSponsors.sponsors.length === 0) return null
            const { sponsors, isFallback, currentYear } = ticketSponsors
            return (
                <SponsorAcknowledgement
                    prefix={
                        isFallback
                            ? `Sponsors keep tickets affordable. Recent supporters include`
                            : 'Tickets stay affordable thanks to'
                    }
                    sponsors={sponsors}
                    cta={
                        isFallback
                            ? { href: '/sponsorship', label: `Sponsor ${currentYear}` }
                            : undefined
                    }
                />
            )
        },
        VolunteerForm: () => <VolunteerForm conferenceState={conferenceState} />,
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
                return <CFPNotOpenYet cfpOpens={DateTime.fromISO(conferenceState.callForPapers.opens, { zone: conferenceManifest.public.timezone })} />
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
                return <CFPNotOpenYet cfpOpens={DateTime.fromISO(conferenceState.callForPapers.opens, { zone: conferenceManifest.public.timezone })} />
            }
        },
        VolunteersNeeded: ({ children }) => {
            if (conferenceState.volunteering.needsVolunteers) {
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
    function MdxComponent(props: { components?: MDXComponents } & Record<string, unknown>) {
        const { components, ...rest } = props
        return (
            <Component
                conference={conferenceState.conference}
                components={{ ...mdxComponents, ...(components ?? {}) }}
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
                Call for Papers not open yet, it opens on{' '}
                {cfpOpens.toLocaleString(DateTime.DATETIME_SHORT, {
                    locale: 'en-AU',
                })}
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
