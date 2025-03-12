import { useScript } from '@uidotdev/usehooks'
import { useEffect } from 'react'
import type { TicketSalesState } from '~/lib/config-types'

declare const tito: any

export function TicketForm({ state }: { state: TicketSalesState }) {
    if (state.state === 'open') {
        if (state.ticketInfo?.type === 'tito') {
            return <TitoTicketForm accountId={state.ticketInfo.accountId} eventId={state.ticketInfo.eventId} />
        }

        return null
    }

    return null
}

export function TitoTicketForm({ accountId, eventId }: { eventId: string; accountId: string }) {
    const status = useScript(`https://js.tito.io/v2`, {
        removeOnUnmount: false,
    })

    useEffect(() => {
        if (status === 'ready' && typeof tito !== 'undefined') {
            tito('widget.mount', { el: '#tito-widget', event: `${accountId}/${eventId}` })
        }
    }, [accountId, eventId, status])

    return (
        <div>
            <div id="tito-widget"></div>
        </div>
    )
}
