import { useEffect, useRef, useState } from 'react'
import { Spinner } from '~/components/ui/spinner'
import type { TicketSalesState } from '~/lib/conference-state-client-safe'
import { Flex, styled } from '~/styled-system/jsx'

const TITO_SCRIPT_SRC = 'https://js.tito.io/v2'

declare global {
    interface Window {
        tito?: (...args: unknown[]) => void
    }
}

export function TicketForm({ state }: { state: TicketSalesState }) {
    if (state.state !== 'open' || state.ticketInfo?.type !== 'tito') {
        return null
    }

    return <TitoTicketForm accountId={state.ticketInfo.accountId} eventId={state.ticketInfo.eventId} />
}

type ScriptStatus = 'loading' | 'ready' | 'error'

export function TitoTicketForm({ accountId, eventId }: { eventId: string; accountId: string }) {
    // Always start as 'loading' so SSR and client first-render agree.
    const [status, setStatus] = useState<ScriptStatus>('loading')

    useEffect(() => {
        if (window.tito) {
            setStatus('ready')
            return
        }

        // React 19's <script> hoisting can leave a tag in <head> that the
        // browser doesn't execute. Inject it ourselves to guarantee execution
        // and reliable load events.
        let script = document.querySelector<HTMLScriptElement>(`script[data-tito="v2"]`)
        if (!script) {
            script = document.createElement('script')
            script.src = TITO_SCRIPT_SRC
            script.async = true
            script.dataset.tito = 'v2'
            document.head.appendChild(script)
        }

        const onLoad = () => setStatus(window.tito ? 'ready' : 'error')
        const onError = () => setStatus('error')
        script.addEventListener('load', onLoad)
        script.addEventListener('error', onError)

        return () => {
            script.removeEventListener('load', onLoad)
            script.removeEventListener('error', onError)
        }
    }, [])

    if (status === 'ready') {
        return <TitoMount accountId={accountId} eventId={eventId} />
    }

    if (status === 'error') {
        return (
            <Flex
                alignItems="center"
                justifyContent="center"
                flexDirection="column"
                gap="3"
                bg="surface.card"
                rounded="lg"
                p="6"
                textAlign="center"
                minHeight="[400px]"
            >
                <styled.p fontWeight="semibold">Ticket form failed to load</styled.p>
                <styled.p color="text.secondary" fontSize="sm">
                    You can buy tickets directly at{' '}
                    <styled.a
                        href={`https://ti.to/${accountId}/${eventId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="text.highlight"
                        textDecoration="underline"
                    >
                        ti.to/{accountId}/{eventId}
                    </styled.a>
                </styled.p>
            </Flex>
        )
    }

    return (
        <Flex justifyContent="center" alignItems="center" gap="2" py="4">
            <Spinner size="md" />
            <styled.span color="text.secondary" fontSize="sm">
                Loading ticket form…
            </styled.span>
        </Flex>
    )
}

let titoMountCounter = 0

function TitoMount({ accountId, eventId }: { accountId: string; eventId: string }) {
    const hostRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const host = hostRef.current
        if (!host || !window.tito) return

        const mountPoint = document.createElement('div')
        mountPoint.id = `tito-mount-${++titoMountCounter}`
        // Render a placeholder spinner inside the mountpoint. Tito's mount will
        // replace these contents when it injects its widget. Because the
        // mountpoint is a non-React DOM node, mutating it doesn't upset React.
        mountPoint.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:1rem 0;color:var(--colors-text-secondary, #888);font-size:0.875rem">
                <span style="display:inline-block;width:1rem;height:1rem;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:tito-spin 0.7s linear infinite"></span>
                Loading ticket form…
            </div>
            <style>@keyframes tito-spin { to { transform: rotate(360deg) } }</style>
        `
        host.appendChild(mountPoint)
        window.tito('widget.mount', { el: `#${mountPoint.id}`, event: `${accountId}/${eventId}` })

        // Tito's widget.mount lazy-loads a chunk and then resolves the el via
        // document.querySelector. If we're torn down before that resolution
        // (StrictMode dev double-effect, or user navigating away), the
        // mountpoint disappears from the DOM and Tito logs "Element not found".
        // Park the mountpoint in a hidden orphan container on cleanup so the
        // deferred lookup still succeeds.
        return () => {
            if (mountPoint.isConnected) {
                getTitoOrphanContainer().appendChild(mountPoint)
            }
        }
    }, [accountId, eventId])

    return <div ref={hostRef} />
}

function getTitoOrphanContainer(): HTMLDivElement {
    let container = document.getElementById('tito-orphans') as HTMLDivElement | null
    if (!container) {
        container = document.createElement('div')
        container.id = 'tito-orphans'
        container.style.display = 'none'
        document.body.appendChild(container)
    }
    return container
}

