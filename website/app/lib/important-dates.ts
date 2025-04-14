import type { DateTime } from 'luxon'

export interface StartEventImportantDate {
    type: 'start-event'
    dateTime: DateTime
    endDateTime: DateTime
    event: string

    eventActiveMessage: string
    eventActiveHref?: string
    eventClosedMessage: string
}

export interface EndEventImportantDate {
    type: 'end-event'
    startDateTime: DateTime
    dateTime: DateTime
    event: string

    /** End events count down while active, so no active message */
    eventActiveHref?: string
    eventClosedMessage: string
}

export interface StandaloneImportantDate {
    type: 'important-date'

    dateTime: DateTime

    event: string

    eventHref?: string

    eventClosedMessage: string
    eventClosedHref?: string

    onDayMessage?: string
    onDayHref?: string
}

export type ImportantDate = StartEventImportantDate | EndEventImportantDate | StandaloneImportantDate
