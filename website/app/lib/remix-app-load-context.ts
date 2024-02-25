import '@remix-run/node'

declare module '@remix-run/node' {
    export interface AppLoadContext {}

    // This is the module that is exported from apps/portal/app/entry.server.ts
    // server.ts always accesses the latest version of this file, enabling the
    // use of the latest code, without reloading the web server
    export interface ServerEntryModule {
        getLoadContext(): AppLoadContext
    }
}
