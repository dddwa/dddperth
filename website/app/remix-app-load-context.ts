import type { Request } from 'express'
import 'react-router'
import type { ConferenceState } from './lib/config-types'
import type { DateTimeProvider } from './lib/dates/date-time-provider.server'

declare module 'react-router' {
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
