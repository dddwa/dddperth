import '@remix-run/server-runtime'
import { ConferenceState } from './lib/config-types'

declare module '@remix-run/server-runtime' {
    export interface AppLoadContext {
        requestId: string

        conferenceState: ConferenceState
    }

    // This is the module that is exported from apps/portal/app/entry.server.ts
    // server.ts always accesses the latest version of this file, enabling the
    // use of the latest code, without reloading the web server
    export interface ServerEntryModule {
        getLoadContext(): AppLoadContext
    }
}
