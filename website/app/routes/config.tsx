import { LoaderFunctionArgs } from '@remix-run/server-runtime'

/** This route is used by the app or integrations to understand the state of the conference */
export function loader({ context }: LoaderFunctionArgs): AppConfig {
    return {
        conferenceDate: context.conferenceState.conference.date ?? null,
    }
}

interface AppConfig {
    conferenceDate: string | null
}
