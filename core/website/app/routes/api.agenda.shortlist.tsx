import { data, type ActionFunctionArgs } from 'react-router'
import type { Year } from '~/lib/conference-state-client-safe'
import {
    newShortlistBrowserId,
    readShortlistBrowserId,
    writeShortlistCookie,
} from '~/lib/agenda-shortlist-cookie.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getScheduleGrid } from '~/lib/sessionize.server'
import { getConfig, getServices } from '~/remix-app-load-context'

/**
 * POST /api/agenda/shortlist  body=`year=2026&talkId=123&action=add|remove`
 *
 * Records that this browser has shortlisted a talk, so organisers can see
 * which sessions are unusually popular. A person's own agenda lives in
 * localStorage and is unaffected by whether this call succeeds — the client
 * fires it in the background and ignores the result, so a failure here costs
 * a count, never someone's picks.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return data({ ok: false, error: 'method not allowed' }, { status: 405 })
    }

    const form = await request.formData()
    const year = form.get('year')
    const talkId = form.get('talkId')
    const shortlistAction = form.get('action')

    if (typeof year !== 'string' || typeof talkId !== 'string') {
        return data({ ok: false, error: 'year and talkId are required' }, { status: 400 })
    }

    if (shortlistAction !== 'add' && shortlistAction !== 'remove') {
        return data({ ok: false, error: "action must be 'add' or 'remove'" }, { status: 400 })
    }

    // The talk must actually be on that year's published agenda. Without this
    // the table is an open write endpoint: anyone could insert arbitrary ids
    // and the organiser-facing stats would be reporting on talks that never
    // existed. Unknown ids are rejected rather than silently dropped, so a
    // client bug surfaces instead of quietly losing counts.
    if (!(await isTalkOnAgenda({ context, year: year as Year, talkId }))) {
        return data({ ok: false, error: 'unknown talk for that year' }, { status: 400 })
    }

    const services = getServices(context)
    const existingBrowserId = readShortlistBrowserId(request)

    if (shortlistAction === 'remove') {
        // No cookie means nothing was ever recorded for this browser, so
        // there is nothing to remove and no reason to mint an id.
        if (existingBrowserId) {
            await services.agendaShortlist.removePick({
                browserId: existingBrowserId,
                year: year as Year,
                talkId,
            })
        }
        return data({ ok: true })
    }

    const browserId = existingBrowserId ?? newShortlistBrowserId()

    await services.agendaShortlist.addPick({
        browserId,
        year: year as Year,
        talkId,
    })

    return data(
        { ok: true },
        // Only set the cookie when we minted one, so a repeat pick does not
        // rewrite a perfectly good header on every request.
        existingBrowserId ? undefined : { headers: { 'Set-Cookie': writeShortlistCookie(browserId) } },
    )
}

/**
 * Whether `talkId` appears on the given year's schedule.
 *
 * Reads the same cached Sessionize grid the agenda page renders from
 * (`getScheduleGrid` is LRU-cached for 5 minutes), so this costs a map lookup
 * rather than a fetch on all but the first call.
 */
async function isTalkOnAgenda(args: {
    context: ActionFunctionArgs['context']
    year: Year
    talkId: string
}): Promise<boolean> {
    const yearConfig = getYearConfig(args.year, getConfig(args.context))
    if (yearConfig.kind !== 'conference') return false

    const sessions = yearConfig.sessions

    if (sessions?.kind === 'session-data') {
        return sessions.sessions.some((day) =>
            day.rooms.some((room) => room.sessions.some((session) => session.id === args.talkId)),
        )
    }

    if (sessions?.kind !== 'sessionize' || !sessions.sessionizeEndpoint) {
        return false
    }

    const schedules = await getScheduleGrid({ sessionizeEndpoint: sessions.sessionizeEndpoint })

    return schedules.some((day) =>
        day.rooms.some((room) =>
            room.sessions.some(
                // Service sessions (breaks, changeovers) are on the grid but
                // are not talks anyone shortlists.
                (session) => session.id === args.talkId && !session.isServiceSession,
            ),
        ),
    )
}
