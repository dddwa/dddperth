import '@remix-run/server-runtime'
import { Request } from 'express'
import { ConferenceState } from './lib/config-types'
import { DateTimeProvider } from './lib/dates/date-time-provider.server'

declare module '@remix-run/server-runtime' {
    export interface AppLoadContext {
        conferenceState: ConferenceState
        dateTimeProvider: DateTimeProvider
    }

    // This is the module that is exported from apps/portal/app/entry.server.ts
    // server.ts always accesses the latest version of this file, enabling the
    // use of the latest code, without reloading the web server
    export interface ServerEntryModule {
        getLoadContext({ query }: { query: Request['query'] }): AppLoadContext
    }
}
