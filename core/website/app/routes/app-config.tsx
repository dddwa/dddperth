// JSON endpoint consumed by the conference's mobile app. Only available
// when the fork's manifest declares `mobileApp` — without it, the route
// returns 404 (no app, no need for app config).
//
// The URLs returned point at the fork's GitHub repo (for raw MDX content)
// and the fork's deployed domain (for the V2 app-content endpoints). Both
// are derived from manifest.brand so the route works for any fork.

import { conferenceManifest } from '@conference/manifest'
import type { YearSponsors } from '~/lib/conference-state-client-safe'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getConferenceState } from '~/remix-app-load-context'
import type { Route } from './+types/app-config'

interface AppConfig {
    conferenceDate: string | null
    sponsors: YearSponsors
    support: string
    home: {
        after: string
    }

    v2: {
        support: string
        after: string
    }
}

export function loader({ context }: Route.LoaderArgs) {
    const mobileApp = conferenceManifest.mobileApp
    if (!mobileApp) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    // NOTE: a *retired* app deliberately still gets a config response, and
    // exactly the same one as a maintained app. The copies installed on
    // people's phones poll this endpoint on launch, and 404ing it breaks
    // them rather than retiring them. /app is where the advertising stops.
    // To actually tell those users something, post an announcement in
    // /admin/settings — the installed builds already render those, which a
    // new field here would not.

    const { githubOrg, domain } = conferenceManifest.brand
    // The fork's repo name is conventionally its slug; we approximate with
    // the domain's first label (dddperth.com -> dddperth). A more precise
    // setting would be a manifest.brand.githubRepo field if that ever gets
    // out of sync — none of the existing forks do.
    const repoName = domain.split('.')[0]
    const rawContentBase = `https://raw.githubusercontent.com/${githubOrg}/${repoName}/refs/heads/main/conference/content/pages`
    const appConfig: AppConfig = {
        conferenceDate: getConferenceState(context).conference.date ?? null,
        sponsors: getConferenceState(context).conference.sponsors,
        support: `${rawContentBase}/support.mdx`,
        home: {
            after: `${rawContentBase}/post-conference.mdx`,
        },
        v2: {
            support: `https://${domain}/app-content/conference-day`,
            after: `https://${domain}/app-content/post-conference`,
        },
    }

    return new Response(JSON.stringify(appConfig), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': CACHE_CONTROL.doc,
            'Access-Control-Allow-Origin': '*',
        },
    })
}
