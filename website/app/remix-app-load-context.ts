import type { TableClient, TableServiceClient } from '@azure/data-tables'
import type { BlobServiceClient } from '@azure/storage-blob'
import type { Request } from 'express'
import 'react-router'
import type { ConferenceState } from './lib/conference-state-client-safe'
import type { DateTimeProvider } from './lib/dates/date-time-provider.server'

declare module 'react-router' {
    export interface AppLoadContext {
        conferenceState: ConferenceState
        dateTimeProvider: DateTimeProvider
        blobServiceClient: BlobServiceClient
        tableServiceClient: TableServiceClient
        getTableClient: (tableName: string) => TableClient
    }

    // This is the module that is exported from apps/portal/app/entry.server.ts
    // server.ts always accesses the latest version of this file, enabling the
    // use of the latest code, without reloading the web server
    export interface ServerEntryModule {
        getLoadContext({
            request,
            blobServiceClient,
            tableServiceClient,
            getTableClient,
        }: {
            request: Request
            blobServiceClient: BlobServiceClient
            tableServiceClient: TableServiceClient
            getTableClient: (tableName: string) => TableClient
        }): Promise<AppLoadContext>
    }
}
