import { json, LoaderFunctionArgs } from '@remix-run/server-runtime'
import { YearSponsors } from '~/lib/config-types'

/** This route is used by the app or integrations to understand the state of the conference */
export function loader({ context }: LoaderFunctionArgs) {
    const data: AppConfig = {
        conferenceDate: context.conferenceState.conference.date ?? null,
        sponsors: context.conferenceState.conference.sponsors,
        support: 'https://raw.githubusercontent.com/dddwa/dddperth/refs/heads/main/website-content/pages/support.mdx',
        home: {
            after: 'https://raw.githubusercontent.com/dddwa/dddperth/refs/heads/main/website-content/pages/post-conference.mdx',
        },
    }

    return json(data, {
        headers: {
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
}
