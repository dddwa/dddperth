import { useEffect, useState } from 'react'
import { useLoaderData, useSearchParams } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getConferenceState } from '~/remix-app-load-context'
import { Divider, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.share'

export function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(getConferenceState(context).conference.year)
    return {
        conferenceName: conferenceManifest.public.name,
        sharecastUrl: yearConfig.kind === 'conference' ? (yearConfig.sharecastUrl ?? null) : null,
    }
}

type Ticket = { name?: string; first_name?: string; last_name?: string }

type Registration = {
    name?: string
    tickets?: Ticket[]
}

type State =
    | { kind: 'loading' }
    | { kind: 'no-slug' }
    | { kind: 'error'; message: string }
    | { kind: 'ticket'; ticket: Ticket }
    | { kind: 'registration'; registration: Registration }

function base64EncodeUtf8(input: string) {
    const bytes = new TextEncoder().encode(input)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
}

function hashString(input: string): number {
    let hash = 5381
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
}

function hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100
    const lNorm = l / 100
    const a = sNorm * Math.min(lNorm, 1 - lNorm)
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const color = lNorm - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0')
            .toUpperCase()
    }
    return `${f(0)}${f(8)}${f(4)}`
}

function colorsFromName(userName: string): [string, string, string] {
    const baseHue = hashString(userName || 'anon') % 360
    const saturation = 70
    const lightness = 60
    return [
        hslToHex(baseHue, saturation, lightness),
        hslToHex((baseHue + 120) % 360, saturation, lightness),
        hslToHex((baseHue + 240) % 360, saturation, lightness),
    ]
}

function buildShareUrl(sharecastUrl: string, userName: string) {
    const [screenColor1, screenColor2, screenColor3] = colorsFromName(userName)
    const payload = {
        userData: {
            userName,
            operatingSystem: 0,
            screenColor1,
            screenColor2,
            screenColor3,
        },
    }

    const encoded = encodeURIComponent(base64EncodeUtf8(JSON.stringify(payload)))
    const url = new URL(sharecastUrl)
    url.hash = `data=${encoded}`
    return url.toString()
}

function ticketDisplayName(ticket: Ticket): string {
    return ticket.name ?? [ticket.first_name, ticket.last_name].filter(Boolean).join(' ')
}

/** Embed mode: the Tito widget on the tickets page stashes the registration slug after purchase. */
function stashedRegistrationSlug(): string | undefined {
    const stashed = localStorage.getItem('tito:registration')
    if (!stashed) return undefined
    try {
        const slug: unknown = JSON.parse(stashed).slug
        return typeof slug === 'string' && slug ? slug : undefined
    } catch {
        return undefined
    }
}

export default function Share() {
    const { conferenceName, sharecastUrl } = useLoaderData<typeof loader>()

    if (!sharecastUrl) {
        return <p className="c_white">Sorry, share images aren’t available for {conferenceName} this year.</p>
    }

    return <ShareResolver sharecastUrl={sharecastUrl} />
}

function ShareResolver({ sharecastUrl }: { sharecastUrl: string }) {
    const [state, setState] = useState<State>({ kind: 'loading' })
    const [searchParams] = useSearchParams()
    // Direct mode: Tito custom messages link here with ?ticket={{{slug}}} (or ?registration={{{registration_slug}}})
    const ticketSlug = searchParams.get('ticket')
    const registrationSlug = searchParams.get('registration')

    useEffect(() => {
        const request = ticketSlug
            ? { ticketSlug }
            : { registrationSlug: registrationSlug ?? stashedRegistrationSlug() }

        if (!('ticketSlug' in request) && !request.registrationSlug) {
            setState({ kind: 'no-slug' })
            return
        }

        const controller = new AbortController()
        fetch('/api/tito-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal: controller.signal,
        })
            .then(async (res) => {
                const body = (await res.json()) as { error?: string; ticket?: Ticket; registration?: Registration }
                if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
                if (body.ticket) {
                    setState({ kind: 'ticket', ticket: body.ticket })
                } else {
                    setState({ kind: 'registration', registration: body.registration ?? {} })
                }
            })
            .catch((err) => {
                if (controller.signal.aborted) return
                setState({
                    kind: 'error',
                    message: err instanceof Error ? err.message : String(err),
                })
            })

        return () => controller.abort()
    }, [ticketSlug, registrationSlug])

    if (state.kind === 'loading') return <p className="c_white">Loading your registration…</p>
    if (state.kind === 'no-slug')
        return (
            <p className="c_white">
                No registration found. Please complete a ticket purchase first, or use the share link from your ticket
                confirmation email.
            </p>
        )
    if (state.kind === 'error') return <p className="c_white">Couldn’t load registration: {state.message}</p>

    if (state.kind === 'ticket') {
        return (
            <ShareContainer>
                <ShareFrame sharecastUrl={sharecastUrl} userName={ticketDisplayName(state.ticket)} />
            </ShareContainer>
        )
    }

    return <RegistrationShare sharecastUrl={sharecastUrl} registration={state.registration} />
}

function RegistrationShare({ sharecastUrl, registration }: { sharecastUrl: string; registration: Registration }) {
    const tickets = registration.tickets ?? []
    const [selectedIdx, setSelectedIdx] = useState(0)

    const selected = tickets[selectedIdx]
    const userName = (selected ? ticketDisplayName(selected) : undefined) ?? registration.name ?? ''

    return (
        <ShareContainer>
            {tickets.length > 1 && (
                <styled.fieldset border="none" p="0" m="0" mb="4">
                    <styled.legend color="white" fontWeight="semibold" mb="2">
                        Select a ticket
                    </styled.legend>
                    <Flex direction="column" gap="2">
                        {tickets.map((ticket, idx) => (
                            <styled.label
                                key={idx}
                                display="flex"
                                alignItems="center"
                                gap="2"
                                color="white"
                                cursor="pointer"
                            >
                                <input
                                    type="radio"
                                    name="ticket"
                                    value={idx}
                                    checked={idx === selectedIdx}
                                    onChange={() => setSelectedIdx(idx)}
                                />
                                <span>{ticket.name ?? `Ticket ${idx + 1}`}</span>
                            </styled.label>
                        ))}
                    </Flex>
                </styled.fieldset>
            )}

            {tickets.length > 1 && <Divider color="#8D8DFF33" my="6" />}

            <ShareFrame sharecastUrl={sharecastUrl} userName={userName} />
        </ShareContainer>
    )
}

function ShareContainer({ children }: { children: React.ReactNode }) {
    return (
        <styled.div mx={{ base: '5', md: 'auto' }} mt="[5vh]" maxW="[555px]">
            {children}
        </styled.div>
    )
}

function ShareFrame({ sharecastUrl, userName }: { sharecastUrl: string; userName: string }) {
    return (
        <styled.iframe
            src={buildShareUrl(sharecastUrl, userName)}
            title="Generate your share image"
            w="full"
            h={{ base: '[60dvh]', xl: '[80dvh]' }}
            border="none"
            allow="web-share"
        />
    )
}
