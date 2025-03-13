import type { LoaderFunctionArgs } from 'react-router'
import { data } from 'react-router'
import type { YearSponsors } from '~/lib/config-types'
import { CACHE_CONTROL } from '~/lib/http.server'

/** This route is used by the app or integrations to understand the state of the conference */
export function loader({ context }: LoaderFunctionArgs) {
    const appConfig: AppConfig = {
        conferenceDate: context.conferenceState.conference.date ?? null,
        sponsors: context.conferenceState.conference.sponsors,
        support: 'https://raw.githubusercontent.com/dddwa/dddperth/refs/heads/main/website-content/pages/support.mdx',
        home: {
            after: 'https://raw.githubusercontent.com/dddwa/dddperth/refs/heads/main/website-content/pages/post-conference.mdx',
        },
        v2: {
            support: 'https://dddperth.com/app-content/conference-day',
            after: 'https://dddperth.com/app-content/post-conference',
        },
    }

    return data(appConfig, {
        headers: {
            'Cache-Control': CACHE_CONTROL.doc,
            'Access-Control-Allow-Origin': '*',
        },
    })
}

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
