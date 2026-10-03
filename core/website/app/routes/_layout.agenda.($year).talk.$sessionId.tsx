import { conferenceManifest } from '@conference/manifest'
import { data, redirect } from 'react-router'
import { $path } from 'safe-routes'
import type { TalkDialogSpeaker } from '~/components/talk-dialog'
import type { Year } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getPublishedSchedule } from '~/lib/published-agenda.server'
import { getConfSpeakers } from '~/lib/sessionize.server'
import { getConferenceState, getConfig } from '~/remix-app-load-context'
import type { Route } from './+types/_layout.agenda.($year).talk.$sessionId'

/**
 * A talk opened over the agenda. The agenda route renders the dialog: it
 * already has the session from its own schedule, so it can open the dialog
 * before this loader has finished. All this route adds is the speakers'
 * profiles (bio, tagline, photo, links), which the agenda doesn't load.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
    const year =
        params.year && /\d{4}/.test(params.year) ? (params.year as Year) : getConferenceState(context).conference.year
    const yearConfig = getYearConfig(year, getConfig(context))

    if (yearConfig.kind === 'cancelled') {
        throw redirect($path('/agenda/:year?', { year: undefined }))
    }

    // The same publication gate as the agenda, so a talk id can't be used to
    // read an unannounced talk.
    const schedule = await getPublishedSchedule(context, year)
    const session = schedule?.rooms.flatMap((room) => room.sessions).find((s) => s.id === params.sessionId)

    if (!session) {
        throw new Response(JSON.stringify({ message: 'No session found' }), { status: 404 })
    }

    const allSpeakers =
        yearConfig.sessions?.kind === 'sessionize' && yearConfig.sessions.sessionizeEndpoint
            ? await getConfSpeakers({ sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint })
            : []
    const speakers: TalkDialogSpeaker[] = session.speakers.flatMap(({ id }) => {
        const speaker = allSpeakers.find((s) => s.id === id)
        return speaker
            ? [
                  {
                      id: speaker.id,
                      fullName: speaker.fullName,
                      tagLine: speaker.tagLine ?? null,
                      bio: speaker.bio ?? null,
                      profilePicture: speaker.profilePicture ?? null,
                      links: speaker.links.map(({ title, url }) => ({ title, url })),
                  },
              ]
            : []
    })

    return data(
        {
            year,
            sessionId: session.id,
            title: session.title,
            description: session.description,
            speakers,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.schedule } },
    )
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
    // A child route's `meta` replaces its parents' outright, so start from the
    // parent's tags and override the ones that describe this page. Only the
    // direct parent: a route without `meta` already carries its own parent's,
    // so collecting every match would repeat them.
    const inherited = matches.at(-2)?.meta ?? []
    if (!loaderData) return inherited

    const title = `${loaderData.title} | ${conferenceManifest.public.name} ${loaderData.year}`
    const description = loaderData.description ?? undefined
    const overridden: Record<string, string | undefined> = {
        'og:title': title,
        'twitter:title': title,
        description,
        'og:description': description,
        'twitter:description': description,
    }

    return [
        { title },
        ...inherited.flatMap((tag) => {
            if ('title' in tag) return []
            const key = 'name' in tag ? tag.name : 'property' in tag ? tag.property : undefined
            if (typeof key === 'string' && key in overridden) {
                const content = overridden[key]
                return content ? [{ ...tag, content }] : []
            }
            return [tag]
        }),
    ]
}

export default function Talk() {
    return null
}
